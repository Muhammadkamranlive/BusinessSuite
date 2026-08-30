import Link from "next/link";
import { cn } from "@/lib/utils";

export function LaptopFrame({
  src,
  alt,
  className,
  hero = false,
  label,
  href
}: {
  src: string;
  alt: string;
  className?: string;
  hero?: boolean;
  label?: string;
  href?: string;
}) {
  const frame = (
    <figure className={cn("mkt-laptop", hero && "mkt-hero-shot", className)}>
      <div className="mkt-laptop-lid">
        <span className="mkt-laptop-camera" aria-hidden />
        <div className="mkt-laptop-screen">
          <img src={src} alt={alt} />
        </div>
      </div>
      <div className="mkt-laptop-base">
        <span className="mkt-laptop-notch" aria-hidden />
      </div>
      {label ? (
        <figcaption className="mt-4 text-center text-[13px] font-semibold tracking-tight text-[color:var(--bs-ink)]">
          {label}
        </figcaption>
      ) : null}
    </figure>
  );

  if (href) {
    return (
      <Link href={href} className="block outline-none transition hover:-translate-y-1">
        {frame}
      </Link>
    );
  }

  return frame;
}

/** @deprecated Use LaptopFrame — kept so older imports keep working. */
export function ScreenshotFrame(props: {
  src: string;
  alt: string;
  className?: string;
  hero?: boolean;
}) {
  return <LaptopFrame {...props} />;
}
