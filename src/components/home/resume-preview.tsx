import { Check, Sparkles } from "lucide-react";

export function ResumePreview({ compact = false, variant = "modern" }: { compact?: boolean; variant?: string }) {
  return <div className={`template-paper ${variant}`} aria-label="Illustrative resume preview">
    <div className="paper-name">Alex Morgan</div>
    <div className="paper-role">Product designer · New York, NY</div>
    <div className="resume-line dark" /><div className="resume-line" />
    <div className="resume-section"><b>Experience</b><div className="resume-line dark" /><div className="resume-line" /><div className="resume-line short" /></div>
    <div className="resume-section"><b>Selected work</b><div className="resume-line dark" /><div className="resume-line" /><div className="resume-line short" /></div>
    {!compact && <div className="resume-section"><b>Education</b><div className="resume-line dark" /><div className="resume-line short" /></div>}
  </div>;
}

export function HeroResume() {
  return <div className="hero-art" aria-label="Illustration of a polished resume">
    <div className="resume-sheet">
      <h3>Alex Morgan</h3><div className="resume-role">Product designer</div>
      <div className="resume-contact">New York, NY&nbsp; · &nbsp;alexmorgan.design&nbsp; · &nbsp;LinkedIn</div>
      <div className="resume-section"><b>Profile</b><div className="resume-line dark" /><div className="resume-line" /><div className="resume-line short" /></div>
      <div className="resume-section"><b>Experience</b><div className="resume-line dark" /><div className="resume-line" /><div className="resume-line" /><div className="resume-line short" /></div>
      <div className="resume-section"><b>Education</b><div className="resume-line dark" /><div className="resume-line short" /></div>
      <div className="resume-section"><b>Skills</b><div className="resume-line" /><div className="resume-line short" /></div>
    </div>
    <div className="resume-tag"><Check size={16} /> Clear, considered, you</div>
    <div className="resume-bubble"><strong><Sparkles size={12} style={{ display: "inline", verticalAlign: "middle" }} /> A little more clarity</strong>Thoughtful prompts, when available</div>
  </div>;
}
