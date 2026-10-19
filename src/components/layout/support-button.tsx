import Image from "next/image";
import Link from "next/link";

export function SupportButton() {
  return (
    <Link className="support-button" href="/contact" aria-label="Contact support">
      <span className="support-ripple support-ripple-one" aria-hidden="true" />
      <span className="support-ripple support-ripple-two" aria-hidden="true" />
      <span className="support-avatar">
        <Image src="/support-avatar.svg" alt="" width={58} height={58} loading="eager" />
      </span>
      <span className="support-tooltip" aria-hidden="true">Contact support</span>
    </Link>
  );
}
