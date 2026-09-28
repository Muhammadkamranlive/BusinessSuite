import type { ModuleKey } from "@/lib/permissions";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Archive,
  BadgePercent,
  Banknote,
  BarChart3,
  Bell,
  Boxes,
  Briefcase,
  Building2,
  CalendarDays,
  CircleDot,
  ClipboardCheck,
  ClipboardList,
  Contact,
  CreditCard,
  Factory,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gift,
  Handshake,
  HeartPulse,
  Landmark,
  Layers,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Megaphone,
  Package,
  Pill,
  Receipt,
  RefreshCw,
  Settings2,
  Shield,
  ShoppingBag,
  Stethoscope,
  Target,
  Ticket,
  Trash2,
  Truck,
  UserCircle,
  UserPlus,
  Users,
  Wallet,
  Warehouse,
  Workflow,
  Wrench
} from "lucide-react";

export type ModuleTone = {
  hex: string;
  well: string;
  icon: string;
  ring: string;
  hoverBorder: string;
  soft: string;
  softText: string;
  glow: string;
};

const FALLBACK: ModuleTone = {
  hex: "#1877f2",
  well: "bg-[#1877f2]",
  icon: "text-white",
  ring: "ring-[#1877f2]/25",
  hoverBorder: "hover:border-[#1877f2]/40",
  soft: "bg-[#1877f2]/15",
  softText: "text-[#93c5fd]",
  glow: "shadow-[0_0_24px_rgba(24,119,242,0.35)]"
};

/** Distinct per-module accents — shared by apps launcher + sidebar. */
export const MODULE_TONES: Record<string, ModuleTone> = {
  dashboard: {
    hex: "#0f2452",
    well: "bg-[#0f2452]",
    icon: "text-white",
    ring: "ring-[#0f2452]/25",
    hoverBorder: "hover:border-[#0f2452]/35",
    soft: "bg-[#3b82f6]/20",
    softText: "text-[#93c5fd]",
    glow: "shadow-[0_0_28px_rgba(59,130,246,0.4)]"
  },
  crm: {
    hex: "#0e7490",
    well: "bg-[#0e7490]",
    icon: "text-white",
    ring: "ring-[#0e7490]/25",
    hoverBorder: "hover:border-[#0e7490]/40",
    soft: "bg-[#06b6d4]/18",
    softText: "text-[#67e8f9]",
    glow: "shadow-[0_0_28px_rgba(14,116,144,0.45)]"
  },
  sales: {
    hex: "#1d4ed8",
    well: "bg-[#1d4ed8]",
    icon: "text-white",
    ring: "ring-[#1d4ed8]/25",
    hoverBorder: "hover:border-[#1d4ed8]/35",
    soft: "bg-[#3b82f6]/18",
    softText: "text-[#93c5fd]",
    glow: "shadow-[0_0_28px_rgba(29,78,216,0.4)]"
  },
  purchases: {
    hex: "#0f766e",
    well: "bg-[#0f766e]",
    icon: "text-white",
    ring: "ring-[#0f766e]/25",
    hoverBorder: "hover:border-[#0f766e]/40",
    soft: "bg-[#14b8a6]/18",
    softText: "text-[#5eead4]",
    glow: "shadow-[0_0_28px_rgba(15,118,110,0.4)]"
  },
  inventory: {
    hex: "#047857",
    well: "bg-[#047857]",
    icon: "text-white",
    ring: "ring-[#047857]/25",
    hoverBorder: "hover:border-[#047857]/40",
    soft: "bg-[#10b981]/18",
    softText: "text-[#6ee7b7]",
    glow: "shadow-[0_0_28px_rgba(4,120,87,0.4)]"
  },
  operations: {
    hex: "#0e7490",
    well: "bg-[#0e7490]",
    icon: "text-white",
    ring: "ring-[#0e7490]/25",
    hoverBorder: "hover:border-[#0e7490]/40",
    soft: "bg-[#06b6d4]/18",
    softText: "text-[#67e8f9]",
    glow: "shadow-[0_0_28px_rgba(14,116,144,0.4)]"
  },
  hrm: {
    hex: "#4338ca",
    well: "bg-[#4338ca]",
    icon: "text-white",
    ring: "ring-[#4338ca]/25",
    hoverBorder: "hover:border-[#4338ca]/35",
    soft: "bg-[#6366f1]/18",
    softText: "text-[#a5b4fc]",
    glow: "shadow-[0_0_28px_rgba(67,56,202,0.4)]"
  },
  healthcare: {
    hex: "#0f766e",
    well: "bg-[#0f766e]",
    icon: "text-white",
    ring: "ring-[#0f766e]/25",
    hoverBorder: "hover:border-[#0f766e]/40",
    soft: "bg-[#14b8a6]/18",
    softText: "text-[#5eead4]",
    glow: "shadow-[0_0_28px_rgba(15,118,110,0.45)]"
  },
  pharmacy: {
    hex: "#0d9488",
    well: "bg-[#0d9488]",
    icon: "text-white",
    ring: "ring-[#0d9488]/25",
    hoverBorder: "hover:border-[#0d9488]/40",
    soft: "bg-[#2dd4bf]/18",
    softText: "text-[#5eead4]",
    glow: "shadow-[0_0_28px_rgba(13,148,136,0.45)]"
  },
  documents: {
    hex: "#1d4ed8",
    well: "bg-[#1d4ed8]",
    icon: "text-white",
    ring: "ring-[#1d4ed8]/25",
    hoverBorder: "hover:border-[#1d4ed8]/35",
    soft: "bg-[#3b82f6]/18",
    softText: "text-[#93c5fd]",
    glow: "shadow-[0_0_28px_rgba(29,78,216,0.4)]"
  },
  finance: {
    hex: "#1e3a8a",
    well: "bg-[#1e3a8a]",
    icon: "text-white",
    ring: "ring-[#1e3a8a]/25",
    hoverBorder: "hover:border-[#1e3a8a]/40",
    soft: "bg-[#2563eb]/18",
    softText: "text-[#93c5fd]",
    glow: "shadow-[0_0_28px_rgba(30,58,138,0.45)]"
  },
  projects: {
    hex: "#0369a1",
    well: "bg-[#0369a1]",
    icon: "text-white",
    ring: "ring-[#0369a1]/25",
    hoverBorder: "hover:border-[#0369a1]/35",
    soft: "bg-[#0ea5e9]/18",
    softText: "text-[#7dd3fc]",
    glow: "shadow-[0_0_28px_rgba(3,105,161,0.4)]"
  },
  reports: {
    hex: "#4338ca",
    well: "bg-[#4338ca]",
    icon: "text-white",
    ring: "ring-[#4338ca]/25",
    hoverBorder: "hover:border-[#4338ca]/35",
    soft: "bg-[#6366f1]/18",
    softText: "text-[#a5b4fc]",
    glow: "shadow-[0_0_28px_rgba(67,56,202,0.45)]"
  },
  settings: {
    hex: "#334155",
    well: "bg-[#334155]",
    icon: "text-white",
    ring: "ring-[#334155]/25",
    hoverBorder: "hover:border-[#334155]/40",
    soft: "bg-[#64748b]/20",
    softText: "text-[#cbd5e1]",
    glow: "shadow-[0_0_28px_rgba(51,65,85,0.4)]"
  },
  email_engine: {
    hex: "#0284c7",
    well: "bg-[#0284c7]",
    icon: "text-white",
    ring: "ring-[#0284c7]/25",
    hoverBorder: "hover:border-[#0284c7]/40",
    soft: "bg-[#0ea5e9]/18",
    softText: "text-[#7dd3fc]",
    glow: "shadow-[0_0_28px_rgba(2,132,199,0.4)]"
  },
  rule_engine: {
    hex: "#334155",
    well: "bg-[#334155]",
    icon: "text-white",
    ring: "ring-[#334155]/25",
    hoverBorder: "hover:border-[#334155]/40",
    soft: "bg-[#64748b]/20",
    softText: "text-[#cbd5e1]",
    glow: "shadow-[0_0_28px_rgba(51,65,85,0.4)]"
  }
};

export function getModuleTone(key: string | ModuleKey | undefined): ModuleTone {
  if (!key) return FALLBACK;
  return MODULE_TONES[key] ?? FALLBACK;
}

export type SidebarIconTone = {
  well: string;
  glyph: string;
  activeWell: string;
  activeGlyph: string;
};

/** Restrained sidebar icon wells — navy / sky / teal / slate only (no reds). */
const SIDEBAR_JEWELS: SidebarIconTone[] = [
  {
    well: "bg-sky-400/15",
    glyph: "text-sky-300",
    activeWell: "bg-sky-500",
    activeGlyph: "text-white"
  },
  {
    well: "bg-cyan-400/15",
    glyph: "text-cyan-300",
    activeWell: "bg-cyan-500",
    activeGlyph: "text-white"
  },
  {
    well: "bg-teal-400/15",
    glyph: "text-teal-300",
    activeWell: "bg-teal-500",
    activeGlyph: "text-white"
  },
  {
    well: "bg-indigo-400/15",
    glyph: "text-indigo-300",
    activeWell: "bg-indigo-500",
    activeGlyph: "text-white"
  },
  {
    well: "bg-blue-400/15",
    glyph: "text-blue-300",
    activeWell: "bg-blue-500",
    activeGlyph: "text-white"
  },
  {
    well: "bg-slate-400/15",
    glyph: "text-slate-300",
    activeWell: "bg-slate-500",
    activeGlyph: "text-white"
  },
  {
    well: "bg-emerald-400/15",
    glyph: "text-emerald-300",
    activeWell: "bg-emerald-600",
    activeGlyph: "text-white"
  }
];

export function sidebarIconToneAt(index: number): SidebarIconTone {
  return SIDEBAR_JEWELS[index % SIDEBAR_JEWELS.length]!;
}

type IconRule = { match: RegExp; icon: LucideIcon };

const MENU_ICON_RULES: IconRule[] = [
  { match: /overview|home|dashboard/i, icon: LayoutDashboard },
  { match: /profile|my profile/i, icon: UserCircle },
  { match: /lead/i, icon: Target },
  { match: /customer(?! segment)|client/i, icon: Handshake },
  { match: /contact/i, icon: Contact },
  { match: /opportunit|deal/i, icon: Briefcase },
  { match: /activit|follow/i, icon: Activity },
  { match: /campaign/i, icon: Megaphone },
  { match: /ticket/i, icon: Ticket },
  { match: /segment|group/i, icon: Layers },
  { match: /analytic|report|bi|warehouse \/ bi/i, icon: BarChart3 },
  { match: /recycle|bin|trash/i, icon: Trash2 },
  { match: /quotation|quote|rfq/i, icon: FileText },
  { match: /order(?! change)/i, icon: ClipboardList },
  { match: /deliver|dispatch|shipment/i, icon: Truck },
  { match: /invoice|bill(?! of)|credit note|debit note/i, icon: Receipt },
  { match: /payment|receipt|disbursement/i, icon: Wallet },
  { match: /return|rma|warranty/i, icon: RefreshCw },
  { match: /price list/i, icon: BadgePercent },
  { match: /team|sales representative/i, icon: Users },
  { match: /supplier|vendor/i, icon: Building2 },
  { match: /requisition/i, icon: ClipboardCheck },
  { match: /product|sku/i, icon: Package },
  { match: /categor/i, icon: Layers },
  { match: /warehouse|stock|transfer|adjustment|low stock|bins|batch|serial|uom|brand/i, icon: Warehouse },
  { match: /bom|bill of material/i, icon: Factory },
  { match: /work order|maintenance|fleet|vehicle|inspection|quality/i, icon: Wrench },
  { match: /contract/i, icon: FileSpreadsheet },
  { match: /employee|people|talent/i, icon: Users },
  { match: /organization|department|designation|position|job|location|cost center|company/i, icon: Building2 },
  { match: /recruit|inbox/i, icon: UserPlus },
  { match: /attendance|timesheet|shift|holiday|leave/i, icon: CalendarDays },
  { match: /payroll|compensation|pay grade|my pay|provident|eobi|loan/i, icon: Banknote },
  { match: /benefit/i, icon: Gift },
  { match: /asset/i, icon: Boxes },
  { match: /notification/i, icon: Bell },
  { match: /form|workflow|automat/i, icon: Workflow },
  { match: /security|access|sso/i, icon: Shield },
  { match: /patient/i, icon: HeartPulse },
  { match: /appoint|opd|clinic|doctor|roster/i, icon: Stethoscope },
  { match: /pharma|medicin|drug|consumable/i, icon: Pill },
  { match: /lab|radiology|imaging/i, icon: Activity },
  { match: /document|file|folder/i, icon: FolderOpen },
  { match: /bank|journal|ledger|gl |chart of/i, icon: Landmark },
  { match: /project|task|time/i, icon: ListChecks },
  { match: /setting|admin|billing|user/i, icon: Settings2 },
  { match: /map|geo/i, icon: MapPin },
  { match: /shop|store|pos/i, icon: ShoppingBag },
  { match: /archive/i, icon: Archive },
  { match: /credit|card/i, icon: CreditCard }
];

export function resolveMenuIcon(label: string, href?: string): LucideIcon {
  const hay = `${label} ${href ?? ""}`;
  for (const rule of MENU_ICON_RULES) {
    if (rule.match.test(hay)) return rule.icon;
  }
  return CircleDot;
}
