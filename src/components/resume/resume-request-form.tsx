"use client";

import { FileText, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent, type FormEvent } from "react";
import { useToast } from "@/components/ui/toast-provider";
import { confirmWithSweetAlert } from "@/lib/confirmation-alert";

const fields = [
  { name: "name", label: "Full name", required: true, maxLength: 100 },
  { name: "email", label: "Email address", type: "email", required: true, maxLength: 254 },
  { name: "phone", label: "Phone number", maxLength: 40 },
  { name: "targetRole", label: "Target role", required: true, maxLength: 120 },
  { name: "education", label: "Education", maxLength: 3000, multiline: true },
  { name: "skills", label: "Skills", maxLength: 2000, multiline: true },
  { name: "experience", label: "Work experience", required: true, maxLength: 5000, multiline: true, hint: "Include job titles, organizations, dates, and what you worked on." },
  { name: "summary", label: "Professional summary or objective", maxLength: 3000, multiline: true },
  { name: "links", label: "Portfolio or LinkedIn links", maxLength: 1000 },
  { name: "additionalInfo", label: "Anything else to include?", maxLength: 3000, multiline: true },
] as const;

const acceptedExtensions = [".pdf", ".doc", ".docx", ".txt"];
const maximumFileSize = 10 * 1024 * 1024;

function isAcceptedFile(file: File) {
  const extension = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  return acceptedExtensions.includes(extension);
}

export function ResumeRequestForm({ name = "", email = "" }: { name?: string; email?: string }) {
  const [busy, setBusy] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function selectFile(file: File | undefined) {
    if (!file) return;
    if (!isAcceptedFile(file)) {
      toast.error("Choose a PDF, DOC, DOCX, or TXT file.");
      return;
    }
    if (file.size > maximumFileSize) {
      toast.error("The file must be 10 MB or smaller.");
      return;
    }
    setAttachment(file);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) {
      toast.error("You can attach one file at a time.");
      return;
    }
    selectFile(event.dataTransfer.files[0]);
  }

  async function removeAttachment() {
    try {
      const confirmed = await confirmWithSweetAlert({
        title: "Remove attached file?",
        text: "This only removes the file from this form. Your resume information will stay.",
        confirmButtonText: "Remove file",
      });
      if (!confirmed) return;
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("Could not display the attachment removal confirmation.", error);
      toast.error("Could not open the confirmation dialog. The file was not removed.");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (attachment) formData.append("attachment", attachment, attachment.name);
    try {
      const response = await fetch("/api/resume-requests", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const limitReached = typeof result === "object" && result !== null && "code" in result && result.code === "plan_limit_reached";
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "We couldn't submit your information. Please try again.";
        toast.error(limitReached ? `${message} View plans or contact support for help.` : message);
        return;
      }
      form.reset();
      setAttachment(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      toast.success("Thanks! Your information has been submitted successfully. Our team will take it from here.");
    } catch {
      toast.error("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form-card resume-request-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        {fields.map((field) => (
          <div className={`form-group${"multiline" in field && field.multiline ? " full" : ""}`} key={field.name}>
            <label htmlFor={`resume-${field.name}`}>{field.label}{"required" in field && field.required && <span aria-hidden="true"> *</span>}</label>
            {"multiline" in field && field.multiline
              ? <textarea className="form-field" id={`resume-${field.name}`} name={field.name} required={"required" in field && field.required} maxLength={field.maxLength} rows={field.name === "experience" ? 6 : 4} />
              : <input className="form-field" id={`resume-${field.name}`} name={field.name} type={"type" in field ? field.type : "text"} required={"required" in field && field.required} maxLength={field.maxLength} defaultValue={field.name === "name" ? name : field.name === "email" ? email : undefined} readOnly={field.name === "name" || field.name === "email"} />}
            {"hint" in field && <small className="field-hint">{field.hint}</small>}
          </div>
        ))}
        <div className="form-group full">
          <span className="upload-field-label">Attach a file <small>(optional)</small></span>
          <div
            className={`resume-file-dropzone${dragging ? " is-dragging" : ""}`}
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
            }}
            onDrop={handleDrop}
          >
            <label className="resume-file-dropzone-label" htmlFor="resume-attachment">
              <Upload size={21} aria-hidden="true" />
              <span><strong>Choose a file</strong> or drag it here</span>
              <small>PDF, DOC, DOCX, or TXT · up to 10 MB</small>
            </label>
            <input
              ref={fileInputRef}
              className="resume-file-input"
              id="resume-attachment"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={(event) => selectFile(event.currentTarget.files?.[0])}
            />
          </div>
          {attachment && (
            <div className="resume-file-selected">
              <FileText size={18} aria-hidden="true" />
              <span>{attachment.name}<small>{(attachment.size / (1024 * 1024)).toFixed(2)} MB</small></span>
              <button
                className="resume-file-remove"
                type="button"
                aria-label={`Remove ${attachment.name}`}
                onClick={() => void removeAttachment()}
              >
                <X size={16} />
              </button>
            </div>
          )}
        </div>
        <div className="form-group full">
          <label className="consent-label"><input type="checkbox" required /> I agree that my information and any attached file can be used to prepare my resume request.</label>
        </div>
        <div className="form-group full">
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit my information"}</button>
        </div>
      </div>
      <p className="form-privacy-note">Your details are stored on the service for the team to process your request. Do not include passwords or other sensitive account information.</p>
    </form>
  );
}
