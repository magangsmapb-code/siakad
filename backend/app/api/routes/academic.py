from math import ceil
from typing import Annotated, Any, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status

from app.api.deps import require_roles
from app.repositories.academic import get_by_id, get_profile_role, insert_row, list_page, update_row
from app.schemas.academic import (
    AcademicYearCreate,
    AcademicYearUpdate,
    ClassCreate,
    ClassUpdate,
    ScheduleCreate,
    ScheduleUpdate,
    StudentCreate,
    StudentUpdate,
    SubjectCreate,
    SubjectUpdate,
    TeacherCreate,
    TeacherUpdate,
)
from app.schemas.common import ApiResponse
from app.schemas.users import UserRole

router = APIRouter(prefix="/api")
DEVELOPER_ONLY = require_roles(UserRole.DEVELOPER)
STAFF_ROLES = require_roles(UserRole.DEVELOPER, UserRole.GURU)
ANY_ROLE = require_roles(*UserRole)


async def _list(
    resource: str,
    profile: dict[str, Any],
    *,
    page: int,
    page_size: int,
    search: str | None,
    filters: dict[str, str | None],
    sort_by: str,
    sort_direction: Literal["asc", "desc"],
) -> ApiResponse[list[dict[str, Any]]]:
    rows, total = await list_page(
        resource,
        profile["access_token"],
        page=page,
        page_size=page_size,
        search=search,
        filters=filters,
        sort_by=sort_by,
        descending=sort_direction == "desc",
    )
    return ApiResponse(
        data=rows,
        meta={
            "page": page,
            "page_size": page_size,
            "total": total,
            "pages": ceil(total / page_size) if total is not None and total else 0,
        },
    )


async def _create(
    resource: str,
    values: dict[str, Any],
    profile: dict[str, Any],
    *,
    expected_profile_role: str | None = None,
) -> ApiResponse[dict[str, Any]]:
    if expected_profile_role:
        linked_role = await get_profile_role(profile["access_token"], values["profile_id"])
        if linked_role != expected_profile_role:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Profil harus memiliki role {expected_profile_role}.")
    row = await insert_row(resource, profile["access_token"], values)
    return ApiResponse(data=row)


async def _update(
    resource: str,
    resource_id: UUID,
    values: dict[str, Any],
    profile: dict[str, Any],
) -> ApiResponse[dict[str, Any]]:
    if not values:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Tidak ada perubahan yang dikirim.")
    return ApiResponse(data=await update_row(resource, profile["access_token"], str(resource_id), values))


async def _get(resource: str, resource_id: UUID, profile: dict[str, Any]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await get_by_id(resource, profile["access_token"], str(resource_id)))


@router.get("/academic-years", response_model=ApiResponse[list[dict[str, Any]]])
async def list_academic_years(
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    year_status: str | None = Query(default=None, alias="status", pattern="^(planned|active|completed|archived)$"),
    sort_by: str = "starts_on",
    sort_direction: Literal["asc", "desc"] = "desc",
) -> ApiResponse[list[dict[str, Any]]]:
    return await _list("academic_years", profile, page=page, page_size=page_size, search=search, filters={"status": year_status}, sort_by=sort_by, sort_direction=sort_direction)


@router.get("/academic-years/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def get_academic_year(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(ANY_ROLE)]) -> ApiResponse[dict[str, Any]]:
    return await _get("academic_years", resource_id, profile)


@router.post("/academic-years", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_academic_year(payload: AcademicYearCreate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _create("academic_years", payload.model_dump(mode="json"), profile)


@router.put("/academic-years/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def update_academic_year(resource_id: UUID, payload: AcademicYearUpdate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _update("academic_years", resource_id, payload.model_dump(exclude_unset=True, mode="json"), profile)


@router.delete("/academic-years/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def deactivate_academic_year(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("academic_years", profile["access_token"], str(resource_id), {"status": "archived"}))


@router.get("/teachers", response_model=ApiResponse[list[dict[str, Any]]])
async def list_teachers(
    profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    teacher_status: str | None = Query(default=None, alias="status", pattern="^(active|inactive|leave)$"),
    sort_by: str = "created_at",
    sort_direction: Literal["asc", "desc"] = "desc",
) -> ApiResponse[list[dict[str, Any]]]:
    return await _list("teachers", profile, page=page, page_size=page_size, search=search, filters={"status": teacher_status}, sort_by=sort_by, sort_direction=sort_direction)


@router.get("/teachers/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def get_teacher(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _get("teachers", resource_id, profile)


@router.post("/teachers", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_teacher(payload: TeacherCreate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _create("teachers", payload.model_dump(mode="json"), profile, expected_profile_role="GURU")


@router.put("/teachers/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def update_teacher(resource_id: UUID, payload: TeacherUpdate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _update("teachers", resource_id, payload.model_dump(exclude_unset=True, mode="json"), profile)


@router.delete("/teachers/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def deactivate_teacher(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("teachers", profile["access_token"], str(resource_id), {"employment_status": "inactive"}))


@router.get("/students", response_model=ApiResponse[list[dict[str, Any]]])
async def list_students(
    profile: Annotated[dict[str, Any], Depends(STAFF_ROLES)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    student_status: str | None = Query(default=None, alias="status", pattern="^(active|graduated|transferred|inactive)$"),
    class_id: UUID | None = None,
    sort_by: str = "created_at",
    sort_direction: Literal["asc", "desc"] = "desc",
) -> ApiResponse[list[dict[str, Any]]]:
    return await _list("students", profile, page=page, page_size=page_size, search=search, filters={"status": student_status, "class_id": str(class_id) if class_id else None}, sort_by=sort_by, sort_direction=sort_direction)


@router.get("/students/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def get_student(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(STAFF_ROLES)]) -> ApiResponse[dict[str, Any]]:
    return await _get("students", resource_id, profile)


@router.post("/students", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_student(payload: StudentCreate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _create("students", payload.model_dump(mode="json"), profile, expected_profile_role="MURID")


@router.put("/students/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def update_student(resource_id: UUID, payload: StudentUpdate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _update("students", resource_id, payload.model_dump(exclude_unset=True, mode="json"), profile)


@router.delete("/students/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def deactivate_student(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("students", profile["access_token"], str(resource_id), {"enrollment_status": "inactive"}))


@router.get("/classes", response_model=ApiResponse[list[dict[str, Any]]])
async def list_classes(
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    class_status: str | None = Query(default=None, alias="status", pattern="^(active|inactive|archived)$"),
    academic_year_id: UUID | None = None,
    grade_level: int | None = Query(default=None, ge=10, le=12),
    sort_by: str = "name",
    sort_direction: Literal["asc", "desc"] = "asc",
) -> ApiResponse[list[dict[str, Any]]]:
    filters = {"status": class_status, "academic_year_id": str(academic_year_id) if academic_year_id else None, "grade_level": str(grade_level) if grade_level else None}
    return await _list("classes", profile, page=page, page_size=page_size, search=search, filters=filters, sort_by=sort_by, sort_direction=sort_direction)


@router.get("/classes/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def get_class(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(ANY_ROLE)]) -> ApiResponse[dict[str, Any]]:
    return await _get("classes", resource_id, profile)


@router.post("/classes", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_class(payload: ClassCreate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _create("classes", payload.model_dump(mode="json"), profile)


@router.put("/classes/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def update_class(resource_id: UUID, payload: ClassUpdate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _update("classes", resource_id, payload.model_dump(exclude_unset=True, mode="json"), profile)


@router.delete("/classes/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def deactivate_class(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("classes", profile["access_token"], str(resource_id), {"status": "inactive"}))


@router.get("/subjects", response_model=ApiResponse[list[dict[str, Any]]])
async def list_subjects(
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    subject_status: str | None = Query(default=None, alias="status", pattern="^(active|inactive|archived)$"),
    sort_by: str = "name",
    sort_direction: Literal["asc", "desc"] = "asc",
) -> ApiResponse[list[dict[str, Any]]]:
    return await _list("subjects", profile, page=page, page_size=page_size, search=search, filters={"status": subject_status}, sort_by=sort_by, sort_direction=sort_direction)


@router.get("/subjects/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def get_subject(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(ANY_ROLE)]) -> ApiResponse[dict[str, Any]]:
    return await _get("subjects", resource_id, profile)


@router.post("/subjects", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_subject(payload: SubjectCreate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _create("subjects", payload.model_dump(mode="json"), profile)


@router.put("/subjects/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def update_subject(resource_id: UUID, payload: SubjectUpdate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _update("subjects", resource_id, payload.model_dump(exclude_unset=True, mode="json"), profile)


@router.delete("/subjects/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def deactivate_subject(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("subjects", profile["access_token"], str(resource_id), {"status": "inactive"}))


@router.get("/schedules", response_model=ApiResponse[list[dict[str, Any]]])
async def list_schedules(
    profile: Annotated[dict[str, Any], Depends(ANY_ROLE)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    search: str | None = Query(default=None, max_length=100),
    schedule_status: str | None = Query(default=None, alias="status", pattern="^(scheduled|cancelled|completed)$"),
    class_id: UUID | None = None,
    teacher_id: UUID | None = None,
    subject_id: UUID | None = None,
    sort_by: str = "starts_at",
    sort_direction: Literal["asc", "desc"] = "asc",
) -> ApiResponse[list[dict[str, Any]]]:
    filters = {"status": schedule_status, "class_id": str(class_id) if class_id else None, "teacher_id": str(teacher_id) if teacher_id else None, "subject_id": str(subject_id) if subject_id else None}
    return await _list("schedules", profile, page=page, page_size=page_size, search=search, filters=filters, sort_by=sort_by, sort_direction=sort_direction)


@router.get("/schedules/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def get_schedule(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(ANY_ROLE)]) -> ApiResponse[dict[str, Any]]:
    return await _get("schedules", resource_id, profile)


@router.post("/schedules", response_model=ApiResponse[dict[str, Any]], status_code=status.HTTP_201_CREATED)
async def create_schedule(payload: ScheduleCreate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _create("schedules", payload.model_dump(mode="json"), profile)


@router.put("/schedules/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def update_schedule(resource_id: UUID, payload: ScheduleUpdate, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return await _update("schedules", resource_id, payload.model_dump(exclude_unset=True, mode="json"), profile)


@router.delete("/schedules/{resource_id}", response_model=ApiResponse[dict[str, Any]])
async def cancel_schedule(resource_id: UUID, profile: Annotated[dict[str, Any], Depends(DEVELOPER_ONLY)]) -> ApiResponse[dict[str, Any]]:
    return ApiResponse(data=await update_row("schedules", profile["access_token"], str(resource_id), {"status": "cancelled"}))