import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <div className="error-page"><div><span className="eyebrow">404 · Page not found</span><h1 className="heading">This page took a different turn.</h1><p className="subheading" style={{ margin: "0 auto 24px", maxWidth: 470 }}>The page you’re looking for may have moved, or it might not exist just yet.</p><Link className="button button-primary" href="/"><ArrowLeft size={16} /> Back to home</Link></div></div>;
}
