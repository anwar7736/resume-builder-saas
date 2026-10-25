import type { Metadata } from "next";
import { AccountForm } from "@/components/auth/account-form";
import { getCurrentUser } from "@/lib/user-auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) redirect("/account");
  return <section className="account-auth-page"><AccountForm mode="register" /></section>;
}
