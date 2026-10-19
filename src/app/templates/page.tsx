import type { Metadata } from "next";
import { TemplateGallery } from "@/components/templates/template-gallery";

export const metadata: Metadata = {
  title: "Resume Templates",
  description: "Explore six professional resume template styles, preview each design, and find a layout that fits your next move.",
};

export default function TemplatesPage() {
  return <>
    <header className="page-hero container"><span className="eyebrow">Thoughtfully designed</span><h1 className="heading">Find the right frame for your story.</h1><p className="subheading">Explore distinct resume styles designed to bring your experience forward. Previewing is available; resume creation is coming soon.</p></header>
    <section className="template-gallery container"><TemplateGallery /></section>
  </>;
}
