import type { Metadata } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { RouteTransition } from "@/components/layout/route-transition";
import { SupportButton } from "@/components/layout/support-button";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ResumeCraft AI — Build a Resume That Gets You Hired",
    template: "%s | ResumeCraft AI",
  },
  description:
    "Create a polished, ATS-friendly resume with professional templates and thoughtful writing guidance.",
  openGraph: {
    title: "ResumeCraft AI — Build a Resume That Gets You Hired",
    description:
      "A simpler way to shape your experience into a professional resume.",
    type: "website",
    siteName: "ResumeCraft AI",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <RouteTransition />
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <SupportButton />
      </body>
    </html>
  );
}
