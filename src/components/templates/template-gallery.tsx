"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { TemplateCard } from "@/components/home/template-card";
import { ResumePreview } from "@/components/home/resume-preview";
import { templates } from "@/lib/site-data";

const categories = ["All styles", "Modern", "Professional", "Creative", "Minimal"];
type Template = (typeof templates)[number];

export function TemplateGallery() {
  const [category, setCategory] = useState("All styles");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Template | null>(null);
  const [message, setMessage] = useState(false);
  const filtered = useMemo(() => templates.filter((template) =>
    (category === "All styles" || template.style === category) &&
    `${template.name} ${template.description} ${template.style}`.toLowerCase().includes(query.toLowerCase())
  ), [category, query]);

  return <>
    <div className="filter-row" aria-label="Filter templates by style">{categories.map((item) => <button type="button" key={item} className={`filter-chip${item === category ? " active" : ""}`} aria-pressed={item === category} onClick={() => setCategory(item)}>{item}</button>)}</div>
    <label className="sr-only" htmlFor="template-search">Search templates</label>
    <div style={{ position: "relative", width: "min(380px, 100%)", margin: "0 auto 30px" }}><Search size={16} style={{ position: "absolute", left: 14, top: 14, color: "#89867f" }} /><input id="template-search" className="search-input" style={{ marginBottom: 0, paddingLeft: 40 }} placeholder="Search styles or templates" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    {filtered.length ? <div className="grid-3">{filtered.map((template) => <TemplateCard key={template.name} template={template} onPreview={setSelected} />)}</div> : <p className="muted" style={{ textAlign: "center", padding: 35 }}>No templates match that search. Try another style.</p>}
    {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelected(null); setMessage(false); } }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button type="button" className="modal-close" aria-label="Close preview" onClick={() => { setSelected(null); setMessage(false); }}><X size={17} /></button>
        <span className="eyebrow">{selected.style} style</span><h2 id="modal-title" className="heading" style={{ fontSize: 27 }}>{selected.name}</h2><p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>{selected.description}</p>
        <div className="template-preview"><ResumePreview variant={selected.variant} /></div>
        {message ? <div className="form-feedback" role="status">Resume creation is coming soon. This preview does not save or submit any information.</div> : <button type="button" className="button button-primary" onClick={() => setMessage(true)}>Use this template</button>}
      </section>
    </div>}
  </>;
}
