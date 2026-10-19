import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { templates } from "@/lib/site-data";
import { ResumePreview } from "@/components/home/resume-preview";

type Template = (typeof templates)[number];

export function TemplateCard({ template, onPreview }: { template: Template; onPreview?: (template: Template) => void }) {
  return <article className="card" style={{ overflow: "hidden" }}>
    <div className="template-preview"><ResumePreview compact variant={template.variant} /></div>
    <div className="template-info">
      <h3>{template.name}</h3><p>{template.description}</p>
      <div className="template-footer">
        {onPreview ? <button type="button" onClick={() => onPreview(template)} style={{ border: 0, padding: 0, background: "none", color: "var(--purple)", fontSize: 12, fontWeight: 650, cursor: "pointer" }}>Preview template <ArrowUpRight size={13} style={{ verticalAlign: "middle" }} /></button> : <Link href="/templates">Preview template <ArrowUpRight size={13} /></Link>}
        <Link href="/templates" aria-label={`See ${template.name} template options`}>Explore</Link>
      </div>
    </div>
  </article>;
}
