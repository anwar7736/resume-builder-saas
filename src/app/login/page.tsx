import type { Metadata } from "next";
import { AccountForm } from "@/components/auth/account-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return <section className="account-auth-page"><AccountForm mode="login" /></section>;
}
