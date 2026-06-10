export type UserRole =
  | "admin"
  | "sales_rep"
  | "pending_user"
  | "approved_doctor"
  | "approved_lab"
  | "approved_vet"
  | "suspended_user";

export type UserType = "doctor" | "lab" | "vet" | "sales" | "admin" | "other";

export type RegistrationUserType = Extract<
  UserType,
  "doctor" | "lab" | "vet" | "other"
>;

export type VerificationStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  user_type: UserType | null;
  verification_status: VerificationStatus;
  can_view_prices: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PublicRole = UserRole | "public";
