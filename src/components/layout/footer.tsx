import Link from "next/link";
import { FileText } from "lucide-react";

const groups = [
  { title: "Product", links: [["Templates", "/templates"], ["Pricing", "/pricing"]] },
  { title: "Company", links: [["About", "/about"], ["Contact", "/contact"]] },
  { title: "Resources", links: [["Privacy draft", "/privacy"], ["Terms draft", "/terms"]] },
];

export function Footer() {
  return <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand-column">
          <Link className="brand" href="/"><span className="brand-mark"><FileText size={17} /></span><span>ResumeCraft <span style={{ color: "var(--purple)" }}>AI</span></span></Link>
          <p className="footer-about">A more thoughtful way to turn your experience into a resume that feels like you.</p>
        </div>
        {groups.map((group) => <div key={group.title}>
          <h3>{group.title}</h3>
          <ul>{group.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul>
        </div>)}
      </div>
      <div className="footer-bottom">
        <span>© ResumeCraft AI. A product in development.</span>
        <span>Draft legal pages are placeholders and require review before use.</span>
      </div>
    </div>
  </footer>;
}
