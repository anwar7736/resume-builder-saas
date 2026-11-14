import { backendApiRequest } from "@/lib/backend-api.server";
import type { UserAccount } from "@/lib/resume-store";

export async function getCurrentUser(): Promise<UserAccount | null> {
  const result = await backendApiRequest<{ user: UserAccount | null }>("/auth/me", {
    forwardCookies: true,
  });
  return result.user;
}
