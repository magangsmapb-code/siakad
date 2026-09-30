import csv
import json
from io import StringIO
from math import ceil
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from app.api.deps import require_roles
from app.repositories.academic import delete_row, get_by_id, insert_row, list_page, update_row
from app.repositories.questions import get_answer_key, upsert_answer_key
from app.schemas.common import ApiResponse
from app.schemas.questions import QuestionBulkAction, QuestionCreate, QuestionType
from app.schemas.users import UserRole
from app.services.supabase import select_rows

router = APIRouter(prefix="/api")
TEACHER_OR_DEVELOPER = require_roles(UserRole.GURU, UserRole.DEVELOPER)
TEACHER_ONLY = require_roles(UserRole.GURU)


class QuestionImport(BaseModel):
    questions: list[QuestionCreate] = Field(min_length=1, max_length=100)


async def _teacher_id(profile: dict[str, Any]) -> str:
    rows = await select_rows(
        "teachers",
        profile["access_token"],
        {"select": "id", "profile_id": f"eq.{profile['id']}", "employment_status": "eq.active", "limit": "1"},
    )
    if not rows:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Profil guru aktif tidak ditemukan.")
    return rows[0]["id"]


async def _ensure_class_access(profile: dict[str, Any], class_id: UUID | None) -> None:
    if class_id is None:
        return
    rows = await select_rows("classes", profile["access_token"], {"select": "id", "id": f"eq.{class_id}", "limit": "1"})
    if not rows:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Guru tidak memiliki akses ke kelas tersebut.")


async def _detail(question_id: UUID, profile: dict[str, Any]) -> dict[str, Any]:
    question = await get_by_id("questions", profile["access_token"], str(question_id))
    answer_key = await get_answer_key(profile["access_token"], str(question_id))
    return {
        **question,
        "correct_answer": answer_key.get("answer_key") if answer_key else None,
        "explanation": answer_key.get("explanation") if answer_key else None,
    }


async def _create_question(payload: QuestionCreate, profile: dict[str, Any], owner_teacher_id: str) -> dict[str, Any]:
    await _ensure_class_access(profile, payload.class_id)
    if payload.image_path and not payload.image_path.startswith(f"{profile['id']}/"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gambar soal tidak dimiliki akun ini.")
    values = {
        "owner_teacher_id": owner_teacher_id,
        "subject_id": str(payload.subject_id),
        "class_id": str(payload.class_id) if payload.class_id else None,
        "chapter": payload.chapter,
        "topic": payload.topic,
        "difficulty": payload.difficulty.value,
        "question_type": payload.question_type.value,
        "prompt": payload.question,
        "options": payload.options,
        "image_path": payload.image_path,
        "default_points": payload.points,
        "status": "draft",
    }
    row = await insert_row("questions", profile["access_token"], values)
    question_id = row["id"]
    try:
        await upsert_answer_key(profile["access_token"], question_id, payload.correct_answer, payload.explanation)
        await insert_row("question_bank", profile["access_token"], {
            "owner_teacher_id": owner_teacher_id,
            "question_id": question_id,
            "visibility": "private",
        })
    except Exception:
        try:
            await delete_row("questions", profile["access_token"], question_id)
        finally:
            raise
    return {**row, "correct_answer": payload.correct_answer, "explanation": payload.explanation}


@router.get("/questions", response_model=ApiResponse[list[dict[str, Any]]])
async def list_questions(
    profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    subject_id: UUID | None = None,
    class_id: UUID | None = None,
    difficulty: Literal["easy", "medium", "hard"] | None = None,
    question_type: QuestionType | None = None,
    question_status: Literal["draft", "published", "archived"] | None = Query(default=None, alias="status"),
    sort_by: str = "created_at",
    sort_direction: Literal["asc", "desc"] = "desc",
) -> ApiResponse[list[dict[str, Any]]]:
    rows, total = await list_page(
        "questions",
        profile["access_token"],
        page=page,
        page_size=page_size,
        search=search,
        filters={
            "subject_id": str(subject_id) if subject_id else None,
            "class_id": str(class_id) if class_id else None,
            "difficulty": difficulty,
            "question_type": question_type.value if question_type else None,
            "status": question_status,
        },
        sort_by=sort_by,
        descending=sort_direction == "desc",
    )
    keys = await select_rows(
        "question_keys",
        profile["access_token"],
        {"select": "question_id,answer_key,explanation", "question_id": f"in.({','.join(row['id'] for row in rows)})"},
    ) if rows else []
    key_by_id = {item["question_id"]: item for item in keys}
    data = [{
        **row,
        "correct_answer": key_by_id.get(row["id"], {}).get("answer_key"),
        "explanation": key_by_id.get(row["id"], {}).get("explanation"),
    } for row in rows]
    return ApiResponse(data=data, meta={"page": page, "page_size": page_size, "total": total, "pages": ceil(total / page_size) if total else 0})


@router.get("/questions/export")
async def export_questions(profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)]) -> Response:
    buffer = StringIO()
    writer = csv.DictWriter(buffer, fieldnames=["subject_id", "class_id", "chapter", "topic", "difficulty", "question_type", "question", "options", "correct_answer", "explanation", "points"])
    writer.writeheader()
    for page in range(1, 11):
        rows, total = await list_page("questions", profile["access_token"], page=page, page_size=100, search=None, filters={}, sort_by="created_at", descending=False)
        keys = await select_rows("question_keys", profile["access_token"], {"select": "question_id,answer_key,explanation", "question_id": f"in.({','.join(row['id'] for row in rows)})"}) if rows else []
        key_by_id = {item["question_id"]: item for item in keys}
        for row in rows:
            key = key_by_id.get(row["id"], {})
            writer.writerow({
                "subject_id": row["subject_id"],
                "class_id": row.get("class_id") or "",
                "chapter": row.get("chapter") or "",
                "topic": row.get("topic") or "",
                "difficulty": row["difficulty"],
                "question_type": row["question_type"],
                "question": row["prompt"],
                "options": json.dumps(row["options"], ensure_ascii=False),
                "correct_answer": json.dumps(key.get("answer_key"), ensure_ascii=False),
                "explanation": key.get("explanation") or "",
                "points": row["default_points"],
            })
        if total is None or page * 100 >= total or len(rows) < 100:
            break
    return Response(content=buffer.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": "attachment; filename=question-bank.csv"})


@router.get("/questions/{question_id}", response_model=ApiResponse[dict[str, Any]])
async def get_question(question_id: UUID, profile: Annotated[dict[str, Any], Depends(TEACHER_OR_DEVELOPER)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await _detail(question_id, profile))


@router.post("/questions", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_question(payload: QuestionCreate, profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await _create_question(payload, profile, await _teacher_id(profile)))


@router.post("/questions/import", response_model=ApiResponse[list[dict[str, Any]]], status_code=status.HTTP_201_CREATED)
async def import_questions(payload: QuestionImport, profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)]) -> ApiResponse[list[dict[str, Any]]]:
    owner_teacher_id = await _teacher_id(profile)
    created: list[dict[str, Any]] = []
    try:
        for question in payload.questions:
            created.append(await _create_question(question, profile, owner_teacher_id))
    except Exception:
        for question in created:
            try:
                await delete_row("questions", profile["access_token"], question["id"])
            except Exception:
                pass
        raise
    return ApiResponse(data=created, meta={"created": len(created)})


@router.put("/questions/{question_id}", response_model=ApiResponse[dict[str, Any]])
async def update_question(question_id: UUID, payload: QuestionCreate, profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    current = await get_by_id("questions", profile["access_token"], str(question_id))
    await _ensure_class_access(profile, payload.class_id)
    if payload.image_path and not payload.image_path.startswith(f"{profile['id']}/"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Gambar soal tidak dimiliki akun ini.")
    row = await update_row("questions", profile["access_token"], str(question_id), {
        "subject_id": str(payload.subject_id),
        "class_id": str(payload.class_id) if payload.class_id else None,
        "chapter": payload.chapter,
        "topic": payload.topic,
        "difficulty": payload.difficulty.value,
        "question_type": payload.question_type.value,
        "prompt": payload.question,
        "options": payload.options,
        "image_path": payload.image_path,
        "default_points": payload.points,
    })
    await upsert_answer_key(profile["access_token"], str(question_id), payload.correct_answer, payload.explanation)
    return ApiResponse(data={**row, "correct_answer": payload.correct_answer, "explanation": payload.explanation, "status": current["status"]})


@router.delete("/questions/{question_id}", response_model=ApiResponse[dict[str, Any]])
async def archive_question(question_id: UUID, profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("questions", profile["access_token"], str(question_id), {"status": "archived"}))


@router.post("/questions/{question_id}/duplicate", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def duplicate_question(question_id: UUID, profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    current = await _detail(question_id, profile)
    payload = QuestionCreate(
        subject_id=current["subject_id"],
        class_id=current.get("class_id"),
        chapter=current.get("chapter"),
        topic=current.get("topic"),
        difficulty=current["difficulty"],
        question_type=current["question_type"],
        question=f"{current['prompt']} (salinan)",
        options=current["options"],
        correct_answer=current.get("correct_answer"),
        explanation=current.get("explanation"),
        image_path=current.get("image_path"),
        points=current["default_points"],
    )
    return ApiResponse(data=await _create_question(payload, profile, await _teacher_id(profile)))


@router.post("/questions/bulk/archive", response_model=ApiResponse[dict[str, int]])
async def archive_questions(payload: QuestionBulkAction, profile: Annotated[dict[str, Any], Depends(TEACHER_ONLY)]) -> ApiResponse[dict[str, int]]:
    archived = 0
    for question_id in payload.ids:
        await update_row("questions", profile["access_token"], str(question_id), {"status": "archived"})
        archived += 1
    return ApiResponse(data={"archived": archived})