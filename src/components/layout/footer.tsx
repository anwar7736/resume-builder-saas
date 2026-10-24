import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { FileText } from "lucide-react";
import { getSiteContent } from "@/lib/resume-store";

export function Footer() {
  return <Suspense fallback={<footer className="footer" />}>
    <DynamicFooter />
  </Suspense>;
}

async function DynamicFooter() {
  await connection();
  const { footer, navigation } = await getSiteContent();
  const groups = [
    { title: footer.productTitle, links: [[navigation.build, "/build"], [navigation.plans, "/pricing"]] },
    { title: footer.companyTitle, links: [[navigation.about, "/about"], [navigation.contact, "/contact"]] },
    { title: footer.resourcesTitle, links: [[navigation.privacy, "/privacy"], [navigation.terms, "/terms"]] },
  ];
  return <footer className="footer">
    <div className="container">
      <div className="footer-grid">
        <div className="footer-brand-column">
          <Link className="brand" href="/"><span className="brand-mark"><FileText size={17} /></span><span>ResumeCraft <span style={{ color: "var(--purple)" }}>AI</span></span></Link>
          <p className="footer-about">{footer.description}</p>
        </div>
        {groups.map((group) => <div key={group.title}><h3>{group.title}</h3><ul>{group.links.map(([label, href]) => <li key={href}><Link href={href}>{label}</Link></li>)}</ul></div>)}
      </div>
      <div className="footer-bottom"><span>{footer.copyright}</span></div>
    </div>
  </footer>;
}
