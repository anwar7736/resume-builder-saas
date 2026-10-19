import type { Metadata } from "next";
import { ArrowUpRight, Check, FileText, Sparkles } from "lucide-react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Sign in",
  description: "ResumeCraft AI sign-in page preview. Authentication and account access are not available yet.",
};

const highlights = [
  "Keep your career story organized",
  "Find a resume style that feels like you",
  "Get ready for the opportunities ahead",
];

export default function LoginPage() {
  return (
    <section className="login-page">
      <div className="login-layout">
        <aside className="login-showcase">
          <div className="login-showcase-glow" aria-hidden="true" />
          <Link className="login-showcase-brand" href="/"><span className="brand-mark"><FileText size={18} /></span> ResumeCraft <span>AI</span></Link>
          <div className="login-showcase-copy">
            <span className="login-kicker"><Sparkles size={14} /> YOUR NEXT CHAPTER, WELL TOLD</span>
            <h1>A more thoughtful way to move forward.</h1>
            <p>Bring your experience into focus with a resume that feels clear, confident, and unmistakably yours.</p>
          </div>
          <ul className="login-highlights">{highlights.map((highlight) => <li key={highlight}><Check size={15} />{highlight}</li>)}</ul>
          <div className="login-showcase-footer"><span>Made for the next step.</span><Link href="/about">Our story <ArrowUpRight size={13} /></Link></div>
        </aside>
        <div className="login-form-side">
          <LoginForm />
          <p className="login-preview-note">Sign-in preview · Authentication is not enabled</p>
        </div>
      </div>
    </section>
  );
}
