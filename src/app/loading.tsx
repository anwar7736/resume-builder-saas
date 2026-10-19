import { FileText, Sparkles } from "lucide-react";

export default function Loading() {
  return <div className="error-page" role="status" aria-live="polite">
    <div><span className="brand-mark" style={{ margin: "0 auto 18px" }}><FileText size={18} /></span><span className="eyebrow"><Sparkles size={13} style={{ display: "inline", verticalAlign: "middle" }} /> One moment</span><p className="muted">Getting your next step ready…</p></div>
  </div>;
}
