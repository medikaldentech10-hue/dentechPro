import type { RegistrationUserType } from "@/lib/types/auth";

export const allowedUserTypes = [
  "doctor",
  "lab",
  "vet",
  "other",
] as const satisfies RegistrationUserType[];
