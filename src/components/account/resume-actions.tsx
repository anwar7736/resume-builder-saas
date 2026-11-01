"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { confirmWithSweetAlert } from "@/lib/confirmation-alert";
import { useToast } from "@/components/ui/toast-provider";

export function ResumeActions({
  id,
  requestId,
  contentType,
}: {
  id: string;
  requestId: string;
  contentType: string;
}) {
  const router = useRouter();
  const toast = useToast();

  async function removeResume() {
    let confirmed: boolean;
    try {
      confirmed = await confirmWithSweetAlert({
        title: "Delete this resume?",
        text: "This permanently deletes the generated file. Your original request will remain available.",
        confirmButtonText: "Delete resume",
      });
    } catch (error) {
      console.error("Could not display the resume deletion confirmation.", error);
      toast.error("Could not open the confirmation dialog. No changes were made.");
      return;
    }
    if (!confirmed) return;
    try {
      const response = await fetch(`/api/resumes?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const result: unknown = await response.json();
      if (!response.ok) {
        const message = typeof result === "object" && result !== null && "error" in result && typeof result.error === "string"
          ? result.error
          : "Unable to delete this resume.";
        throw new Error(message);
      }
      toast.success("Resume deleted.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete this resume.");
    }
  }

  return <div className="account-resume-actions">
    <a className="button button-secondary button-small" href={`/api/resumes?id=${encodeURIComponent(id)}`} target="_blank" rel="noreferrer">
      {contentType === "application/pdf" ? "Preview" : "Download"}
    </a>
    <Link className="button button-secondary button-small" href={`/build?requestId=${encodeURIComponent(requestId)}`}>Create new from this</Link>
    <button className="button button-secondary button-small" type="button" onClick={() => void removeResume()}>Delete</button>
  </div>;
}
