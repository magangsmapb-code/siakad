from enum import Enum


class UserRole(str, Enum):
    DEVELOPER = "DEVELOPER"
    GURU = "GURU"
    MURID = "MURID"