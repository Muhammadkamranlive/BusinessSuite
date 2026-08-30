import Link from "next/link";
import { cn } from "@/lib/utils";

const variants = {
  primary: "mkt-btn-primary",
  secondary: "mkt-btn-secondary",
  ghost: "mkt-btn-ghost",
  light: "mkt-btn-light"
} as const;

type MktVariant = keyof typeof variants;

export function MktButton({
  children,
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: MktVariant }) {
  return (
    <button className={cn("mkt-btn", variants[variant], className)} {...props}>
      {children}
    </button>
  );
}

export function MktCta({
  href,
  children,
  className,
  variant = "primary"
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  variant?: MktVariant;
}) {
  return (
    <Link href={href} className={cn("mkt-btn", variants[variant], className)}>
      {children}
    </Link>
  );
}
