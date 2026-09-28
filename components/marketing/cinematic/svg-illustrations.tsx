import { readFileSync } from "node:fs";
import path from "node:path";
import { cn } from "@/lib/utils";

/**
 * Cinematic ERP landing illustrations.
 *
 * SVGs live in `public/marketing/cinematic/*.svg` (hand-authored, CSS/SMIL
 * animated). We inline their markup at render time instead of using an
 * `<img src>` so that `currentColor` and the `--bs-illus-*` CSS custom
 * properties keep cascading in from the host page — that's what lets the
 * same file look right on both dark (hero/commercial) and light (docs)
 * sections. Reading happens once per request on the server; the resulting
 * markup is static (no user input), so `dangerouslySetInnerHTML` is safe here.
 */

const CINEMATIC_DIR = path.join(process.cwd(), "public", "marketing", "cinematic");

const svgCache = new Map<string, string>();

function loadSvg(file: string): string {
  const cached = svgCache.get(file);
  if (cached) return cached;
  const raw = readFileSync(path.join(CINEMATIC_DIR, file), "utf-8");
  svgCache.set(file, raw);
  return raw;
}

type IllustrationProps = {
  className?: string;
  /** Overrides `--bs-illus-teal` for this instance (defaults to the ERP teal). */
  teal?: string;
  /** Overrides `--bs-illus-coral` for this instance (defaults to the ERP coral). */
  coral?: string;
  /** Overrides `--bs-illus-surface` (the node/card fill) for this instance. */
  surface?: string;
};

function InlineSvg({
  file,
  className,
  teal,
  coral,
  surface
}: IllustrationProps & { file: string }) {
  const html = loadSvg(file);
  return (
    <span
      aria-hidden="true"
      className={cn("bs-cinematic-illus", className)}
      style={
        {
          "--bs-illus-teal": teal,
          "--bs-illus-coral": coral,
          "--bs-illus-surface": surface
        } as React.CSSProperties
      }
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** 6–8 app nodes orbiting a "BusinessSuite" core. Loops forever, subtle. */
export function OrbitAppsIllustration(props: IllustrationProps) {
  return <InlineSvg file="orbit-apps.svg" {...props} className={cn("bs-cinematic-illus--orbit", props.className)} />;
}

/** Animated dashed data packets flowing CRM → Sales → Finance. */
export function DataFlowIllustration(props: IllustrationProps) {
  return <InlineSvg file="data-flow.svg" {...props} className={cn("bs-cinematic-illus--flow", props.className)} />;
}

/** Pulsing shield for HIPAA / compliance messaging (Healthcare). */
export function HipaaShieldIllustration(props: IllustrationProps) {
  return <InlineSvg file="hipaa-shield.svg" {...props} className={cn("bs-cinematic-illus--shield", props.className)} />;
}

/** Abstract shelves + FEFO (first-expiry-first-out) box movement. */
export function WarehouseFlowIllustration(props: IllustrationProps) {
  return (
    <InlineSvg file="warehouse-flow.svg" {...props} className={cn("bs-cinematic-illus--warehouse", props.className)} />
  );
}

/** People + rising pay-cycle coins, orbiting cadence dot. */
export function PayrollPulseIllustration(props: IllustrationProps) {
  return <InlineSvg file="payroll-pulse.svg" {...props} className={cn("bs-cinematic-illus--payroll", props.className)} />;
}

const CINEMATIC_RASTERS = {
  hero: "erp-commercial-hero.png",
  orbitModules: "erp-orbit-modules.png",
  flowCommercial: "erp-flow-commercial.png"
} as const;

type CinematicRasterKey = keyof typeof CINEMATIC_RASTERS;

/** Generated hero / orbit / flow commercial stills from `public/marketing/cinematic/`. */
export function CinematicRaster({
  asset,
  alt = "",
  className,
  priority = false
}: {
  asset: CinematicRasterKey;
  alt?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- plain <img> keeps this pack framework-agnostic (no next/image config needed)
    <img
      src={`/marketing/cinematic/${CINEMATIC_RASTERS[asset]}`}
      alt={alt}
      aria-hidden={alt === "" ? "true" : undefined}
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      className={cn("bs-cinematic-raster", className)}
    />
  );
}

/** All animated SVG illustrations, keyed by name — handy for a showcase grid. */
export const CINEMATIC_ILLUSTRATIONS = {
  orbitApps: OrbitAppsIllustration,
  dataFlow: DataFlowIllustration,
  hipaaShield: HipaaShieldIllustration,
  warehouseFlow: WarehouseFlowIllustration,
  payrollPulse: PayrollPulseIllustration
} as const;

export type CinematicIllustrationKey = keyof typeof CINEMATIC_ILLUSTRATIONS;
