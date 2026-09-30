import os
import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-public-key")

from app.api.deps import current_profile
from app.main import app


TEACHER_PROFILE = {
    "id": "00000000-0000-0000-0000-000000000001",
    "role": "GURU",
    "status": "active",
    "access_token": "test-access-token",
}


class QuestionApiTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[current_profile] = lambda: dict(TEACHER_PROFILE)
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()

    def test_create_question_derives_teacher_owner_and_saves_answer_key_separately(self) -> None:
        teacher_id = "00000000-0000-0000-0000-000000000002"
        question_id = "00000000-0000-0000-0000-000000000003"
        created_question = {"id": question_id, "owner_teacher_id": teacher_id, "status": "draft"}
        with patch("app.api.routes.questions.select_rows", new_callable=AsyncMock, return_value=[{"id": teacher_id}]), patch(
            "app.api.routes.questions.insert_row", new_callable=AsyncMock, side_effect=[created_question, {"id": "bank-row"}]
        ) as insert_row, patch("app.api.routes.questions.upsert_answer_key", new_callable=AsyncMock) as upsert_key:
            response = self.client.post("/api/questions", json={
                "subject_id": "00000000-0000-0000-0000-000000000004",
                "chapter": "Persamaan",
                "topic": "Linear",
                "difficulty": "medium",
                "question_type": "multiple_choice",
                "question": "Berapakah 2 + 2?",
                "options": ["3", "4", "5"],
                "correct_answer": "4",
                "explanation": "Jumlahnya empat.",
            })

        self.assertEqual(response.status_code, 201)
        self.assertEqual(insert_row.await_args_list[0].args[2]["owner_teacher_id"], teacher_id)
        self.assertEqual(insert_row.await_args_list[1].args[2]["visibility"], "private")
        upsert_key.assert_awaited_once_with("test-access-token", question_id, "4", "Jumlahnya empat.")

    def test_multiple_choice_requires_a_valid_option_answer(self) -> None:
        response = self.client.post("/api/questions", json={
            "subject_id": "00000000-0000-0000-0000-000000000004",
            "question_type": "multiple_choice",
            "question": "Pilih jawaban",
            "options": ["A", "B"],
            "correct_answer": "C",
        })
        self.assertEqual(response.status_code, 422)

    def test_student_cannot_read_or_create_question_bank_records(self) -> None:
        app.dependency_overrides[current_profile] = lambda: {**TEACHER_PROFILE, "role": "MURID"}
        read_response = self.client.get("/api/questions")
        write_response = self.client.post("/api/questions", json={
            "subject_id": "00000000-0000-0000-0000-000000000004",
            "question_type": "essay",
            "question": "Jelaskan jawabannya.",
        })
        self.assertEqual(read_response.status_code, 403)
        self.assertEqual(write_response.status_code, 403)

    def test_private_image_upload_uses_profile_owned_storage_path(self) -> None:
        image_path = f"{TEACHER_PROFILE['id']}/image.png"
        with patch("app.api.routes.question_images.upload_storage_object", new_callable=AsyncMock) as upload_storage:
            response = self.client.post(
                "/api/question-images",
                files={"file": ("diagram.png", b"\x89PNG\r\n\x1a\nimage-data", "image/png")},
            )
        self.assertEqual(response.status_code, 201)
        saved_path = response.json()["data"]["image_path"]
        self.assertTrue(saved_path.startswith(f"{TEACHER_PROFILE['id']}/"))
        self.assertEqual(upload_storage.await_args.args[1], "question-images")


if __name__ == "__main__":
    unittest.main()