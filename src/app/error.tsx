"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <div className="error-page"><div><CircleAlert size={28} color="var(--purple)" /><h1 className="heading">Something didn’t go as planned.</h1><p className="subheading" style={{ margin: "0 auto 24px", maxWidth: 470 }}>Try again, or return to the homepage. If this keeps happening, please try again later.</p><div style={{ display: "flex", justifyContent: "center", gap: 10 }}><button className="button button-primary" onClick={() => reset()}>Try again</button><Link className="button button-secondary" href="/">Go home</Link></div></div></div>;
}
