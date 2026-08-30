"use client";

import Link from "next/link";
import { useNavigation, useLinkPending } from "@/components/navigation/navigation-provider";
import { cn } from "@/lib/utils";

type NavLinkProps = React.ComponentProps<typeof Link> & {
  pendingClassName?: string;
};

/** Next.js Link with instant pending feedback while the route loads. */
export function NavLink({ className, pendingClassName, onClick, href, ...props }: NavLinkProps) {
  const { startNavigation } = useNavigation();
  const pending = useLinkPending(typeof href === "string" ? href : href.pathname || "/");

  return (
    <Link
      {...props}
      href={href}
      aria-busy={pending || undefined}
      data-nav-pending={pending ? "true" : undefined}
      className={cn(className, pending && (pendingClassName ?? "nav-link-pending"))}
      onClick={(event) => {
        if (typeof href === "string") startNavigation(href);
        onClick?.(event);
      }}
    />
  );
}
