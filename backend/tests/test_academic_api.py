import os
import unittest
from unittest.mock import AsyncMock, patch

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-public-key")

from fastapi.testclient import TestClient

from app.api.deps import current_profile
from app.main import app


DEVELOPER_PROFILE = {
    "id": "00000000-0000-0000-0000-000000000001",
    "email": "developer@example.com",
    "role": "DEVELOPER",
    "status": "active",
    "access_token": "test-access-token",
}


class AcademicApiTests(unittest.TestCase):
    def setUp(self) -> None:
        app.dependency_overrides[current_profile] = lambda: dict(DEVELOPER_PROFILE)
        self.client = TestClient(app)

    def tearDown(self) -> None:
        self.client.close()
        app.dependency_overrides.clear()

    def test_class_list_passes_pagination_filters_and_sort(self) -> None:
        academic_year_id = "00000000-0000-0000-0000-000000000002"
        expected_data = [{"id": "00000000-0000-0000-0000-000000000003", "name": "XI IPA 1"}]
        with patch("app.api.routes.academic.list_page", new_callable=AsyncMock) as list_page:
            list_page.return_value = expected_data, 21
            response = self.client.get(
                "/api/classes?page=2&page_size=10&search=IPA&status=active"
                f"&academic_year_id={academic_year_id}&sort_by=name&sort_direction=asc"
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"], expected_data)
        self.assertEqual(response.json()["meta"], {"page": 2, "page_size": 10, "total": 21, "pages": 3})
        
        # Assert `await_args` is not None to resolve Pylance warning
        self.assertIsNotNone(list_page.await_args)
        assert list_page.await_args is not None
        self.assertEqual(list_page.await_args.kwargs["filters"]["academic_year_id"], academic_year_id)

    def test_page_size_is_bounded(self) -> None:
        response = self.client.get("/api/classes?page_size=101")
        self.assertEqual(response.status_code, 422)

    def test_teacher_cannot_create_academic_records(self) -> None:
        teacher = {**DEVELOPER_PROFILE, "role": "GURU"}
        app.dependency_overrides[current_profile] = lambda: teacher
        with patch("app.api.routes.academic.insert_row", new_callable=AsyncMock) as insert_row:
            response = self.client.post(
                "/api/classes",
                json={
                    "academic_year_id": "00000000-0000-0000-0000-000000000002",
                    "name": "X IPA 1",
                    "grade_level": 10,
                },
            )
        self.assertEqual(response.status_code, 403)
        insert_row.assert_not_awaited()

    def test_teacher_profile_role_is_validated_before_creation(self) -> None:
        with patch("app.api.routes.academic.get_profile_role", new_callable=AsyncMock, return_value="MURID"), patch(
            "app.api.routes.academic.insert_row", new_callable=AsyncMock
        ) as insert_row:
            response = self.client.post(
                "/api/teachers",
                json={"profile_id": "00000000-0000-0000-0000-000000000002"},
            )
        self.assertEqual(response.status_code, 409)
        insert_row.assert_not_awaited()

    def test_delete_class_deactivates_instead_of_deleting_history(self) -> None:
        class_id = "00000000-0000-0000-0000-000000000004"
        inactive_class = {"id": class_id, "status": "inactive"}
        with patch("app.api.routes.academic.update_row", new_callable=AsyncMock, return_value=inactive_class) as update_row:
            response = self.client.delete(f"/api/classes/{class_id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["status"], "inactive")
        
        # Assert `await_args` is not None to resolve Pylance warning
        self.assertIsNotNone(update_row.await_args)
        assert update_row.await_args is not None
        self.assertEqual(update_row.await_args.args[3], {"status": "inactive"})


if __name__ == "__main__":
    unittest.main()