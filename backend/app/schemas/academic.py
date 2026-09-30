from datetime import date, datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class AcademicYearStatus(str, Enum):
    planned = "planned"
    active = "active"
    completed = "completed"
    archived = "archived"


class RecordStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    archived = "archived"


class EnrollmentStatus(str, Enum):
    active = "active"
    graduated = "graduated"
    transferred = "transferred"
    inactive = "inactive"


class EmploymentStatus(str, Enum):
    active = "active"
    inactive = "inactive"
    leave = "leave"


class ScheduleStatus(str, Enum):
    scheduled = "scheduled"
    cancelled = "cancelled"
    completed = "completed"


class AcademicYearCreate(BaseModel):
    name: str = Field(min_length=3, max_length=80)
    starts_on: date
    ends_on: date
    status: AcademicYearStatus = AcademicYearStatus.planned

    @model_validator(mode="after")
    def validate_period(self) -> "AcademicYearCreate":
        if self.ends_on <= self.starts_on:
            raise ValueError("Tanggal akhir harus sesudah tanggal mulai.")
        return self


class AcademicYearUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=3, max_length=80)
    starts_on: date | None = None
    ends_on: date | None = None
    status: AcademicYearStatus | None = None


class TeacherCreate(BaseModel):
    profile_id: UUID
    employee_number: str | None = Field(default=None, max_length=40)
    department: str | None = Field(default=None, max_length=120)
    employment_status: EmploymentStatus = EmploymentStatus.active


class TeacherUpdate(BaseModel):
    employee_number: str | None = Field(default=None, max_length=40)
    department: str | None = Field(default=None, max_length=120)
    employment_status: EmploymentStatus | None = None


class StudentCreate(BaseModel):
    profile_id: UUID
    class_id: UUID | None = None
    student_number: str | None = Field(default=None, max_length=40)
    enrollment_status: EnrollmentStatus = EnrollmentStatus.active
    enrolled_at: date | None = None


class StudentUpdate(BaseModel):
    class_id: UUID | None = None
    student_number: str | None = Field(default=None, max_length=40)
    enrollment_status: EnrollmentStatus | None = None
    enrolled_at: date | None = None


class ClassCreate(BaseModel):
    academic_year_id: UUID
    name: str = Field(min_length=1, max_length=80)
    grade_level: int = Field(ge=10, le=12)
    homeroom_teacher_id: UUID | None = None
    status: RecordStatus = RecordStatus.active


class ClassUpdate(BaseModel):
    academic_year_id: UUID | None = None
    name: str | None = Field(default=None, min_length=1, max_length=80)
    grade_level: int | None = Field(default=None, ge=10, le=12)
    homeroom_teacher_id: UUID | None = None
    status: RecordStatus | None = None


class SubjectCreate(BaseModel):
    code: str = Field(min_length=2, max_length=20, pattern="^[A-Za-z0-9_-]+$")
    name: str = Field(min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    status: RecordStatus = RecordStatus.active


class SubjectUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=20, pattern="^[A-Za-z0-9_-]+$")
    name: str | None = Field(default=None, min_length=2, max_length=120)
    description: str | None = Field(default=None, max_length=2000)
    status: RecordStatus | None = None


class ScheduleCreate(BaseModel):
    class_id: UUID
    subject_id: UUID
    teacher_id: UUID
    starts_at: datetime
    ends_at: datetime
    room: str | None = Field(default=None, max_length=80)
    status: ScheduleStatus = ScheduleStatus.scheduled

    @model_validator(mode="after")
    def validate_period(self) -> "ScheduleCreate":
        if self.ends_at <= self.starts_at:
            raise ValueError("Waktu selesai harus sesudah waktu mulai.")
        return self


class ScheduleUpdate(BaseModel):
    class_id: UUID | None = None
    subject_id: UUID | None = None
    teacher_id: UUID | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    room: str | None = Field(default=None, max_length=80)
    status: ScheduleStatus | None = None
