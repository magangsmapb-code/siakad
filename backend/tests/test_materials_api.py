import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi import HTTPException
from fastapi.testclient import TestClient

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-public-key")

from app.api.deps import current_profile
from app.api.routes.materials import router
from app.main import app
from app.services.materials import validate_material_file


TEACHER_PROFILE = {
    "id": "00000000-0000-0000-0000-000000000001",
    "role": "GURU",
    "status": "active",
    "access_token": "test-access-token",
}


class MaterialFileValidationTests(unittest.TestCase):
    def test_valid_pdf_normalizes_windows_filename(self) -> None:
        result = validate_material_file(r"C:\fakepath\modul.pdf", "application/pdf", b"%PDF-1.7 sample", 100)
        self.assertEqual(result.file_name, "modul.pdf")
        self.assertEqual(result.mime_type, "application/pdf")
        self.assertEqual(result.size_bytes, 15)

    def test_rejects_mime_mismatch_and_invalid_signature(self) -> None:
        with self.assertRaises(HTTPException) as mismatch:
            validate_material_file("photo.jpg", "image/png", b"\xff\xd8\xffimage", 100)
        self.assertEqual(mismatch.exception.status_code, 415)

        with self.assertRaises(HTTPException) as invalid_image:
            validate_material_file("photo.jpg", "image/jpeg", b"not an image", 100)
        self.assertEqual(invalid_image.exception.status_code, 422)

    def test_rejects_oversized_file(self) -> None:
        with self.assertRaises(HTTPException) as oversized:
            validate_material_file("file.txt", "text/plain", b"12345", 4)
        self.assertEqual(oversized.exception.status_code, 413)


class MaterialApiTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[current_profile] = lambda: dict(TEACHER_PROFILE)
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()

    def test_teacher_upload_validates_access_and_records_private_path(self) -> None:
        teacher_id = "00000000-0000-0000-0000-000000000002"
        class_id = "00000000-0000-0000-0000-000000000003"
        expected_row = {"id": "00000000-0000-0000-0000-000000000004", "class_id": class_id, "status": "draft"}
        with patch("app.api.routes.materials.select_rows", new_callable=AsyncMock) as select_rows, patch(
            "app.api.routes.materials.upload_storage_object", new_callable=AsyncMock
        ) as upload_storage, patch("app.api.routes.materials.insert_row", new_callable=AsyncMock, return_value=expected_row) as insert_row:
            select_rows.side_effect = [[{"id": teacher_id}], [{"id": class_id}]]
            response = self.client.post(
                "/api/materials",
                data={"class_id": class_id, "title": "Modul aljabar"},
                files={"file": (r"C:\fakepath\aljabar.pdf", b"%PDF-1.7 sample", "application/pdf")},
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.json()["data"], expected_row)
        storage_path = upload_storage.await_args.args[2]
        self.assertTrue(storage_path.startswith(f"{class_id}/{teacher_id}/"))
        self.assertEqual(insert_row.await_args.args[2]["status"], "draft")
        self.assertEqual(insert_row.await_args.args[2]["file_name"], "aljabar.pdf")

    def test_student_cannot_upload_material(self) -> None:
        app.dependency_overrides[current_profile] = lambda: {**TEACHER_PROFILE, "role": "MURID"}
        with patch("app.api.routes.materials.upload_storage_object", new_callable=AsyncMock) as upload_storage:
            response = self.client.post(
                "/api/materials",
                data={"class_id": "00000000-0000-0000-0000-000000000003", "title": "Modul"},
                files={"file": ("modul.pdf", b"%PDF-1.7 sample", "application/pdf")},
            )
        self.assertEqual(response.status_code, 403)
        upload_storage.assert_not_awaited()


if __name__ == "__main__":
    unittest.main()