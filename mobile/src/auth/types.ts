export type Role = "STUDENT" | "FACULTY";
export type AuthUser = { id: number; role: Role; name: string };
export type MeResponse = {
  user: AuthUser & {
    login_id: string;
    email: string;
    phone: string;
    department_id: number | null;
    status: string;
  };
  role: Role;
};
