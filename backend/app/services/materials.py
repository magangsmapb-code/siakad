from dataclasses import dataclass
from io import BytesIO
from pathlib import PurePath
from zipfile import BadZipFile, ZipFile

from fastapi import HTTPException, status


@dataclass(frozen=True)
class ValidatedMaterialFile:
    file_name: str
    extension: str
    mime_type: str
    size_bytes: int


ALLOWED_MIME_TYPES = {
    ".pdf": "application/pdf",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".txt": "text/plain",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
}


def validate_material_file(file_name: str | None, content_type: str | None, content: bytes, max_size: int) -> ValidatedMaterialFile:
    if not file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nama file wajib disertakan.")
    clean_name = PurePath(file_name.replace("\\", "/")).name.strip()
    if not clean_name or len(clean_name) > 255:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Nama file tidak valid.")
    if not content or len(content) > max_size:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Ukuran file kosong atau melebihi batas.")

    extension = PurePath(clean_name).suffix.lower()
    expected_mime = ALLOWED_MIME_TYPES.get(extension)
    if not expected_mime:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Format file tidak didukung.")
    received_mime = (content_type or "").split(";", maxsplit=1)[0].strip().lower()
    if received_mime != expected_mime:
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="MIME type tidak sesuai dengan ekstensi file.")

    if extension == ".pdf" and b"%PDF-" not in content[:1024]:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Signature file PDF tidak valid.")
    if extension in {".jpg", ".jpeg"} and not content.startswith(b"\xff\xd8\xff"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Signature file JPEG tidak valid.")
    if extension == ".png" and not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Signature file PNG tidak valid.")
    if extension == ".txt":
        try:
            if b"\x00" in content:
                raise UnicodeDecodeError("utf-8", content, 0, 1, "NUL byte")
            content.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File TXT harus berisi teks UTF-8.") from error
    if extension == ".docx":
        try:
            with ZipFile(BytesIO(content)) as archive:
                names = set(archive.namelist())
                if "[Content_Types].xml" not in names or "word/document.xml" not in names:
                    raise BadZipFile("Dokumen Word tidak lengkap.")
        except BadZipFile as error:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Dokumen DOCX tidak valid.") from error

    return ValidatedMaterialFile(clean_name, extension, expected_mime, len(content))