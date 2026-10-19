import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary";
  small?: boolean;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
};

export function ButtonLink({ href, children, variant = "primary", small = false, className = "", onClick }: ButtonLinkProps) {
  return <Link href={href} onClick={onClick} className={`button button-${variant}${small ? " button-small" : ""} ${className}`}>{children}</Link>;
}
