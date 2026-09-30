export const roles = ["DEVELOPER", "GURU", "MURID"] as const;

export type UserRole = (typeof roles)[number];

export const dashboardForRole: Record<UserRole, string> = {
  DEVELOPER: "/developer/dashboard",
  GURU: "/teacher/dashboard",
  MURID: "/student/dashboard",
};

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && roles.includes(value as UserRole);
}