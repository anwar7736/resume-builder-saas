"use client";

import Image from "next/image";
import { Plus, Save, Trash2, Upload } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { SiteContent } from "@/lib/site-content";
import { useToast } from "@/components/ui/toast-provider";
import { confirmWithSweetAlert } from "@/lib/confirmation-alert";

type PathPart = string | number;
type ContentPath = PathPart[];

const sections: { key: keyof SiteContent; title: string; description: string }[] = [
  { key: "home", title: "Homepage", description: "Hero, process steps, calls to action, and homepage plan headings." },
  { key: "features", title: "Features", description: "Homepage feature cards and their descriptions." },
  { key: "plans", title: "Plans", description: "Plan names, prices, limits, descriptions, and feature lists. Plan IDs stay fixed." },
  { key: "about", title: "About page", description: "About page headings, story, and quote." },
  { key: "contact", title: "Contact & support", description: "Contact page copy, support phone and links, and support avatar." },
  { key: "faqs", title: "FAQs", description: "Add, edit, or remove frequently asked questions." },
  { key: "navigation", title: "Navigation", description: "Labels shown in the header and footer links." },
  { key: "footer", title: "Footer", description: "Footer description, copyright, and link group names." },
  { key: "legal", title: "Privacy & terms", description: "Legal page titles, copy, and individual sections." },
];

function labelFor(key: string) {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (letter) => letter.toUpperCase());
}

function setAtPath(source: unknown, path: ContentPath, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...tail] = path;
  if (head === undefined) return source;
  const clone = Array.isArray(source) ? [...source] : { ...(source as Record<string, unknown>) };
  const record = clone as Record<string | number, unknown>;
  record[head] = setAtPath(record[head], tail, value);
  return clone;
}

function newArrayItem(path: ContentPath): unknown {
  const key = path[path.length - 1];
  if (key === "steps") return { title: "", description: "" };
  if (key === "faqs") return { question: "", answer: "" };
  if (key === "items") return { icon: "FileText", title: "", description: "" };
  if (key === "privacySections" || key === "termsSections") return { title: "", text: "" };
  return "";
}

function isLongText(value: string, key: string) {
  return value.includes("\n") || value.length > 100 || ["description", "story", "quote", "text", "answer", "inquiriesText", "responseText", "locationText", "plansDisclaimer", "heroNote"].includes(key);
}

export function SiteContentEditor({
  initialContent,
  onSave,
}: {
  initialContent: SiteContent;
  onSave: (content: SiteContent) => Promise<void>;
}) {
  const [draft, setDraft] = useState<SiteContent>(initialContent);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(initialContent.contact.supportAvatar || "/support-avatar.jpg");
  const toast = useToast();

  const update = (path: ContentPath, value: unknown) => {
    setDraft((current) => setAtPath(current, path, value) as SiteContent);
    if (path[0] === "contact" && path[1] === "supportAvatar" && typeof value === "string") setAvatarPreview(value);
  };

  async function removeArrayItem(key: string, path: ContentPath, value: unknown[], index: number) {
    try {
      const confirmed = await confirmWithSweetAlert({
        title: `Remove ${labelFor(key).replace(/s$/, "")} item?`,
        text: "This removes the item from the form. Save changes to apply it.",
        confirmButtonText: "Remove item",
      });
      if (confirmed) update(path, value.filter((_, itemIndex) => itemIndex !== index));
    } catch (error) {
      console.error("Could not display the content removal confirmation.", error);
      toast.error("Could not open the confirmation dialog. No changes were made.");
    }
  }

  const uploadAvatar = (file: File | undefined) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("The support avatar must be 1 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        toast.error("Unable to read this image. Please try another file.");
        return;
      }
      update(["contact", "supportAvatar"], reader.result);
      toast.info("Avatar selected. Save site content to publish it.");
    };
    reader.onerror = () => toast.error("Unable to read this image. Please try another file.");
    reader.readAsDataURL(file);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      await onSave(draft);
    } finally {
      setSaving(false);
    }
  };

  const renderValue = (key: string, value: unknown, path: ContentPath): ReactNode => {
    if (Array.isArray(value)) {
      return (
        <div className="content-array" key={path.join(".")}>
          <div className="content-array-heading">
            <span>{labelFor(key)}</span>
            <button className="button button-secondary button-small" type="button" onClick={() => update(path, [...value, newArrayItem(path)])}>
              <Plus size={14} /> Add {labelFor(key).replace(/s$/, "")}
            </button>
          </div>
          {value.map((item, index) => (
            <div className="content-array-item" key={`${path.join(".")}-${index}`}>
              <div className="content-array-item-fields">
                {typeof item === "object" && item !== null
                  ? Object.entries(item).map(([childKey, childValue]) => renderValue(childKey, childValue, [...path, index, childKey]))
                  : renderValue(`${labelFor(key)} ${index + 1}`, item, [...path, index])}
              </div>
              <button className="content-remove-button" type="button" aria-label={`Remove ${labelFor(key)} ${index + 1}`} onClick={() => void removeArrayItem(key, path, value, index)}>
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      );
    }

    if (typeof value === "object" && value !== null) {
      return (
        <fieldset className="content-object" key={path.join(".")}>
          <legend>{labelFor(key)}</legend>
          <div className="content-field-grid">
            {Object.entries(value).map(([childKey, childValue]) => renderValue(childKey, childValue, [...path, childKey]))}
          </div>
        </fieldset>
      );
    }

    if (key === "supportAvatar") {
      const avatarValue = typeof value === "string" ? value : "";
      return (
        <div className="content-avatar-field" key={path.join(".")}>
          <div>
            <span className="content-field-label">Support avatar</span>
            <p className="field-hint">Upload a JPG, PNG, or WebP image up to 1 MB, or enter an image URL.</p>
            <input className="form-field" aria-label="Support avatar image URL" value={avatarValue.startsWith("data:") ? "" : avatarValue} onChange={(event) => update(path, event.target.value)} placeholder={avatarValue.startsWith("data:") ? "Uploaded image selected" : "/support-avatar.jpg or https://..."} />
            <label className="button button-secondary button-small content-upload-button">
              <Upload size={14} /> Upload avatar
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { uploadAvatar(event.currentTarget.files?.[0]); event.currentTarget.value = ""; }} />
            </label>
          </div>
          <Image className="content-avatar-preview" src={avatarPreview || "/support-avatar.jpg"} alt="Support avatar preview" width={80} height={80} unoptimized />
        </div>
      );
    }

    if (key === "id" && path[0] === "plans") {
      return (
        <label className="content-field" key={path.join(".")}>
          <span className="content-field-label">Plan ID (fixed)</span>
          <input className="form-field" value={typeof value === "string" ? value : ""} readOnly />
        </label>
      );
    }

    if (typeof value === "boolean") {
      return (
        <label className="content-checkbox" key={path.join(".")}>
          <input type="checkbox" checked={value} onChange={(event) => update(path, event.target.checked)} />
          <span>{labelFor(key)}</span>
        </label>
      );
    }

    const isNumericLimit = key === "resumeLimit";
    if (typeof value === "number" || (isNumericLimit && value === null)) {
      return (
        <label className="content-field" key={path.join(".")}>
          <span className="content-field-label">{labelFor(key)}</span>
          <input className="form-field" type="number" min={0} step={1} value={typeof value === "number" ? value : ""} placeholder={isNumericLimit ? "Unlimited" : ""} onChange={(event) => update(path, event.target.value === "" ? (isNumericLimit ? null : 0) : Number(event.target.value))} />
          {isNumericLimit && <small className="field-hint">Leave empty for unlimited requests.</small>}
        </label>
      );
    }

    const text = typeof value === "string" ? value : "";
    return (
      <label className={`content-field${isLongText(text, key) ? " content-field-wide" : ""}`} key={path.join(".")}>
        <span className="content-field-label">{labelFor(key)}</span>
        {isLongText(text, key)
          ? <textarea className="form-field" rows={text.length > 220 ? 5 : 3} value={text} onChange={(event) => update(path, event.target.value)} />
          : <input className="form-field" value={text} onChange={(event) => update(path, event.target.value)} />}
      </label>
    );
  };

  return (
    <form className="site-content-editor" onSubmit={save}>
      <div className="site-content-editor-heading">
        <div><h3>Manage site content</h3><p>Update each section using simple fields. Changes go live after saving.</p></div>
        <button className="button button-primary" type="submit" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
      {sections.map(({ key, title, description }, index) => (
        <details className="site-content-section" key={key} open={index === 0 || undefined}>
          <summary><span><strong>{title}</strong><small>{description}</small></span><span className="content-section-chevron" aria-hidden="true">⌄</span></summary>
          <div className="content-field-grid">
            {renderValue(title, draft[key], [key])}
          </div>
        </details>
      ))}
      <div className="site-content-editor-footer">
        <span className="field-hint">Plan IDs remain fixed so existing user plan assignments stay valid.</span>
        <button className="button button-primary" type="submit" disabled={saving}>
          <Save size={16} /> {saving ? "Saving..." : "Save changes"}
        </button>
      </div>
    </form>
  );
}
