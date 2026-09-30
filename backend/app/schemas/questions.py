from enum import Enum
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class QuestionType(str, Enum):
    multiple_choice = "multiple_choice"
    true_false = "true_false"
    short_answer = "short_answer"
    essay = "essay"


class QuestionDifficulty(str, Enum):
    easy = "easy"
    medium = "medium"
    hard = "hard"


class QuestionCreate(BaseModel):
    subject_id: UUID
    class_id: UUID | None = None
    chapter: str | None = Field(default=None, max_length=160)
    topic: str | None = Field(default=None, max_length=200)
    difficulty: QuestionDifficulty = QuestionDifficulty.medium
    question_type: QuestionType
    question: str = Field(min_length=2, max_length=12000)
    options: list[str] = Field(default_factory=list, max_length=12)
    correct_answer: Any | None = None
    explanation: str | None = Field(default=None, max_length=12000)
    image_path: str | None = Field(default=None, max_length=500)
    points: float = Field(default=1, gt=0, le=1000)

    @model_validator(mode="after")
    def validate_answer(self) -> "QuestionCreate":
        if self.question_type == QuestionType.multiple_choice:
            if len(self.options) < 2:
                raise ValueError("Soal pilihan ganda memerlukan minimal dua opsi.")
            if not isinstance(self.correct_answer, str) or self.correct_answer not in self.options:
                raise ValueError("Jawaban benar harus cocok dengan salah satu opsi.")
        if self.question_type == QuestionType.true_false:
            if self.correct_answer not in {"true", "false", "benar", "salah"}:
                raise ValueError("Jawaban benar/salah harus berupa true, false, benar, atau salah.")
        return self


class QuestionUpdate(QuestionCreate):
    pass


class QuestionBulkAction(BaseModel):
    ids: list[UUID] = Field(min_length=1, max_length=100)
