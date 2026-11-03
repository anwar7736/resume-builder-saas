import type { Metadata, Viewport } from "next";
import { Geist_Mono, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { PwaRegistration } from "@/components/layout/pwa-registration";
import { RouteTransition } from "@/components/layout/route-transition";
import { ScrollToTop } from "@/components/layout/scroll-to-top";
import { SupportButton } from "@/components/layout/support-button";
import { ToastProvider } from "@/components/ui/toast-provider";
import "sweetalert2/dist/sweetalert2.min.css";
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
  applicationName: "ResumeCraft AI",
  title: {
    default: "ResumeCraft AI — Build a Resume That Gets You Hired",
    template: "%s | ResumeCraft AI",
  },
  description:
    "Share your career details and submit a request for your next resume.",
  openGraph: {
    title: "ResumeCraft AI — Build a Resume That Gets You Hired",
    description:
      "Submit your career information for your next resume request.",
    type: "website",
    siteName: "ResumeCraft AI",
  },
  appleWebApp: {
    capable: true,
    title: "ResumeCraft",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#17191f",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <PwaRegistration />
          <RouteTransition />
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <SupportButton />
          <ScrollToTop />
        </ToastProvider>
      </body>
    </html>
  );
}
