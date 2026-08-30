import { menuRegistry } from "@/lib/menu-registry";
import { navGroups, type ModuleKey } from "@/lib/permissions";
import { resolveGuideForPath, listGuidesForModule, getGuideById } from "@/lib/guides/catalog";
import type { GuideDefinition, GuideFlow, GuideStep } from "@/lib/guides/types";

function step(id: string, title: string, description: string, href?: string, tag?: string): GuideStep {
  return { id, title, description, href, tag };
}

function flow(id: string, title: string, summary: string, steps: GuideStep[]): GuideFlow {
  return { id, title, summary, steps };
}

/** Build a sensible default guide when a menu has no authored content yet. */
export function buildFallbackGuide(pathname: string): GuideDefinition | null {
  const path = (pathname.split("#")[0] || "/").replace(/\/$/, "") || "/";
  const menu =
    menuRegistry
      .filter((m) => {
        const href = (m.href.split("#")[0] || "/").replace(/\/$/, "") || "/";
        return path === href || path.startsWith(`${href}/`);
      })
      .sort((a, b) => (b.href.split("#")[0] || "").length - (a.href.split("#")[0] || "").length)[0] ?? null;

  if (!menu) return null;

  const group = navGroups.find((g) => g.key === menu.module);
  const overview = listGuidesForModule(menu.module).find((g) => g.isModuleOverview);
  const siblingHrefs = (group?.children ?? []).slice(0, 4).map((c) => c.href);

  const steps: GuideStep[] = [
    step("1", `Open ${menu.label}`, `You are on this screen — use search, filters, and Add to manage ${menu.label.toLowerCase()} records.`, menu.href, "Here"),
    step(
      "2",
      "Create or update a record",
      "Use Add / Edit. Confirm dialogs save to the company database and write an audit event.",
      menu.href,
      "Work"
    ),
    step(
      "3",
      "Follow the module sequence",
      overview
        ? `See “${overview.title}” for the full first→second→third process across ${group?.label ?? menu.module}.`
        : `Return to ${group?.label ?? "the module"} hub and complete upstream master data first.`,
      overview?.hrefs[0] ?? group?.href,
      "Flow"
    )
  ];

  if (siblingHrefs[1]) {
    steps.push(
      step("4", "Related menus", `Continue with other ${group?.label ?? ""} menus such as the next items in the sidebar.`, siblingHrefs[1], "Next")
    );
  }

  return {
    id: `fallback.${menu.id}`,
    module: menu.module as ModuleKey,
    title: `${menu.label} — quick guide`,
    purpose: `${menu.label} is part of ${group?.label ?? menu.module}. Use it after any required setup steps in this module.`,
    dataFlow: overview?.dataFlow ?? `Records on this page are stored for the current company (tenant) and appear in lists, exports, and related documents.`,
    hrefs: [menu.href.split("#")[0] || menu.href],
    flows: [
      flow(
        "fallback.main",
        "How to use this menu",
        "Generic steps for this screen. Open the module overview guide for the full business flow diagram.",
        steps
      )
    ],
    tips: overview ? [`Module overview: ${overview.title}`] : undefined
  };
}

/** Resolve authored guide or fallback for any authenticated path. */
export function guideForPath(pathname: string): GuideDefinition | null {
  return resolveGuideForPath(pathname) ?? buildFallbackGuide(pathname);
}

export function guideForIdOrPath(idOrPath: string) {
  if (idOrPath.startsWith("/")) return guideForPath(idOrPath);
  return getGuideById(idOrPath) ?? guideForPath(idOrPath);
}
