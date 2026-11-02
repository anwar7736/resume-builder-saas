"use client";

import { useState, type FormEvent } from "react";
import type { ResumeRequest } from "@/lib/resume-store";
import { FieldError, useFieldValidation } from "@/components/ui/field-validation";
import { useToast } from "@/components/ui/toast-provider";

const fields = [
  { name: "fullName", label: "Full name", required: true, maxLength: 100 },
  { name: "email", label: "Email address", type: "email", required: true, maxLength: 254 },
  { name: "phone", label: "Phone number", required: true, maxLength: 40 },
  { name: "targetJobTitle", label: "Target job title", required: true, maxLength: 120 },
  { name: "workExperienceEducation", label: "Work experience and education", required: true, maxLength: 8000, multiline: true },
  { name: "skillsProjects", label: "Skills and projects", maxLength: 4000, multiline: true },
  { name: "jobDescription", label: "Target job description", maxLength: 5000, multiline: true },
  { name: "professionalSummary", label: "Professional summary", maxLength: 3000, multiline: true },
] as const;

const maximumImageSize = 5 * 1024 * 1024;
const maximumSummaryFileSize = 10 * 1024 * 1024;

type ResumeFormValues = {
  fullName: string;
  email: string;
  phone: string;
  targetJobTitle: string;
  workExperienceEducation: string;
  skillsProjects: string;
  jobDescription: string;
  resumeLanguage: "English" | "Bangla";
  resumeTemplate: "Minimal" | "Modern" | "Professional";
  professionalSummary: string;
};

function getInitialValues(name: string, email: string, request?: ResumeRequest): ResumeFormValues {
  return {
    fullName: request?.name ?? name,
    email: request?.email ?? email,
    phone: request?.phone ?? "",
    targetJobTitle: request?.targetRole ?? "",
    workExperienceEducation: request?.experience ?? "",
    skillsProjects: request?.skills ?? "",
    jobDescription: request?.jobDescription ?? "",
    resumeLanguage: request?.resumeLanguage ?? "English",
    resumeTemplate: request?.resumeTemplate ?? "Professional",
    professionalSummary: request?.summary ?? "",
  };
}

export function ResumeRequestForm({
  name = "",
  email = "",
  initialRequest,
}: {
  name?: string;
  email?: string;
  initialRequest?: ResumeRequest;
}) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const { errors, handleInvalid, handleInput, setFieldError, clearErrors } = useFieldValidation();
  const initialValues = getInitialValues(name, email, initialRequest);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const profilePhoto = formData.get("profilePhoto");
    const profileSummary = formData.get("profileSummary");
    if (profilePhoto instanceof File && profilePhoto.size > 0) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(profilePhoto.type)) {
        setFieldError("profilePhoto", "Choose a JPG, PNG, or WebP profile photo.");
        return;
      }
      if (profilePhoto.size > maximumImageSize) {
        setFieldError("profilePhoto", "The profile photo must be 5 MB or smaller.");
        return;
      }
      setFieldError("profilePhoto", "");
    }
    if (profileSummary instanceof File && profileSummary.size > 0) {
      const extension = profileSummary.name.slice(profileSummary.name.lastIndexOf(".")).toLowerCase();
      if (![".pdf", ".doc", ".docx", ".txt"].includes(extension)) {
        setFieldError("profileSummary", "Choose a PDF, DOC, DOCX, or TXT profile summary file.");
        return;
      }
      if (profileSummary.size > maximumSummaryFileSize) {
        setFieldError("profileSummary", "The profile summary file must be 10 MB or smaller.");
        return;
      }
    }
    setFieldError("profileSummary", "");
    setBusy(true);
    try {
      const response = await fetch("/api/resume-requests", {
        method: "POST",
        body: formData,
      });
      const result: unknown = await response.json();
      if (!response.ok) {
        const limitReached = typeof result === "object" && result !== null && "code" in result && result.code === "plan_limit_reached";
        const profileSummaryExtractionFailed = typeof result === "object" && result !== null &&
          "code" in result && result.code === "profile_summary_extraction_failed";
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "We couldn't submit your information. Please try again.";
        if (profileSummaryExtractionFailed) {
          setFieldError("profileSummary", message);
          return;
        }
        toast.error(limitReached ? `${message} View plans or contact support for help.` : message);
        return;
      }
      form.reset();
      clearErrors();
      toast.success("Your resume information has been sent to our resume workflow.");
    } catch (error) {
  console.error("Resume Request Error:", error);

  if (error instanceof Error) {
    toast.error(error.message);
  } else {
    toast.error("An unexpected error occurred.");
  }

  // Keep the previous static error message
  toast.error(
    "We couldn't reach the server. Please check your connection and try again."
  );
} finally {
      setBusy(false);
    }
  }

  return (
    <form className="card form-card resume-request-form" onSubmit={handleSubmit} onInvalidCapture={handleInvalid} onInputCapture={handleInput} onChangeCapture={handleInput}>
      <div className="form-grid">
        {fields.map((field) => (
          <div className={`form-group${"multiline" in field && field.multiline ? " full" : ""}`} key={field.name}>
            <label htmlFor={`resume-${field.name}`}>{field.label}{"required" in field && field.required && <span aria-hidden="true"> *</span>}</label>
            {"multiline" in field && field.multiline
              ? <textarea className="form-field" id={`resume-${field.name}`} name={field.name} required={"required" in field && field.required} maxLength={field.maxLength} rows={field.name === "workExperienceEducation" ? 6 : 4} defaultValue={initialValues[field.name]} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `resume-${field.name}-error` : undefined} />
              : <input className="form-field" id={`resume-${field.name}`} name={field.name} type={"type" in field ? field.type : "text"} required={"required" in field && field.required} maxLength={field.maxLength} defaultValue={initialValues[field.name]} readOnly={field.name === "fullName" || field.name === "email"} aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `resume-${field.name}-error` : undefined} />}
            <FieldError id={`resume-${field.name}-error`} error={errors[field.name]} />
          </div>
        ))}
        <div className="form-group">
          <label htmlFor="resume-resumeLanguage">Resume language</label>
          <select className="form-field" id="resume-resumeLanguage" name="resumeLanguage" required defaultValue={initialValues.resumeLanguage} aria-invalid={Boolean(errors.resumeLanguage)} aria-describedby={errors.resumeLanguage ? "resume-resumeLanguage-error" : undefined}>
            <option value="English">English</option>
            <option value="Bangla">Bangla</option>
          </select>
          <FieldError id="resume-resumeLanguage-error" error={errors.resumeLanguage} />
        </div>
        <div className="form-group">
          <label htmlFor="resume-resumeTemplate">Resume template</label>
          <select className="form-field" id="resume-resumeTemplate" name="resumeTemplate" required defaultValue={initialValues.resumeTemplate} aria-invalid={Boolean(errors.resumeTemplate)} aria-describedby={errors.resumeTemplate ? "resume-resumeTemplate-error" : undefined}>
            <option value="Minimal">Minimal</option>
            <option value="Modern">Modern</option>
            <option value="Professional">Professional</option>
          </select>
          <FieldError id="resume-resumeTemplate-error" error={errors.resumeTemplate} />
        </div>
        <div className="form-group">
          <label htmlFor="resume-profilePhoto">Profile photo <small>(optional)</small></label>
          <input className="form-field" id="resume-profilePhoto" name="profilePhoto" type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" aria-invalid={Boolean(errors.profilePhoto)} aria-describedby={errors.profilePhoto ? "resume-profilePhoto-error" : undefined} onChange={(event) => {
            if (event.currentTarget.files?.[0]) setFieldError("profilePhoto", "");
          }} />
          <small className="field-hint">JPG, PNG, or WebP · up to 5 MB</small>
          <FieldError id="resume-profilePhoto-error" error={errors.profilePhoto} />
        </div>
        <div className="form-group">
          <label htmlFor="resume-profileSummary">Profile summary file <small>(optional)</small></label>
          <input className="form-field" id="resume-profileSummary" name="profileSummary" type="file" accept=".pdf,.doc,.docx,.txt" aria-invalid={Boolean(errors.profileSummary)} aria-describedby={errors.profileSummary ? "resume-profileSummary-error" : undefined} onChange={(event) => {
            if (event.currentTarget.files?.[0]) setFieldError("profileSummary", "");
          }} />
          <small className="field-hint">PDF, DOC, DOCX, or TXT · up to 10 MB</small>
          <FieldError id="resume-profileSummary-error" error={errors.profileSummary} />
        </div>
        <div className="form-group full">
          <label className="consent-label"><input type="checkbox" name="consent" required aria-invalid={Boolean(errors.consent)} aria-describedby={errors.consent ? "resume-consent-error" : undefined} /> I agree that my information and uploaded files can be used to prepare my resume.</label>
          <FieldError id="resume-consent-error" error={errors.consent} />
        </div>
        <div className="form-group full">
          <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit my information"}</button>
        </div>
      </div>
      <p className="form-privacy-note">Your details and selected files are sent securely to the configured resume workflow to prepare your resume.</p>
    </form>
  );
}
