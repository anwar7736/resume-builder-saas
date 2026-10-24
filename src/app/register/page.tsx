import type { Metadata } from "next";
import { AccountForm } from "@/components/auth/account-form";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return <section className="account-auth-page"><AccountForm mode="register" /></section>;
}
