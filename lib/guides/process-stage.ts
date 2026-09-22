import { listGuidesForModule } from "@/lib/guides/catalog";
import { navGroups, type ModuleKey } from "@/lib/permissions";
import type { GuideFlow, GuideStep } from "@/lib/guides/types";

export type ProcessStageInfo = {
  module: ModuleKey;
  flowTitle: string;
  /** 1-based index in the primary module flow; totalStages+1 = Menus stage */
  stageNumber: number;
  totalStages: number;
  /** Human label e.g. "1st stage", "2nd stage" */
  stageOrdinal: string;
  /** Step title from the flow diagram */
  stageName: string;
  stageDescription: string;
  tag?: string;
  prev?: { title: string; href?: string };
  next?: { title: string; href?: string };
  /** True when this path is the module hub / guide, not a numbered step */
  isOverview?: boolean;
  /** True when this screen lives under the last “Menus” accordion */
  isMenusStage?: boolean;
};

function normalizePath(pathname: string) {
  return (pathname.split("#")[0] || "/").replace(/\/$/, "") || "/";
}

function pathMatchesStep(pathname: string, href?: string) {
  if (!href) return false;
  const path = normalizePath(pathname);
  const base = normalizePath(href);
  if (path === base) return true;
  if (base !== "/" && path.startsWith(`${base}/`)) return true;
  return false;
}

export function stageOrdinalLabel(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th stage`;
  switch (abs % 10) {
    case 1:
      return `${n}st stage`;
    case 2:
      return `${n}nd stage`;
    case 3:
      return `${n}rd stage`;
    default:
      return `${n}th stage`;
  }
}

function moduleKeyForPath(pathname: string): ModuleKey | null {
  const path = normalizePath(pathname);
  let best: { key: ModuleKey; score: number } | null = null;
  for (const g of navGroups) {
    const base = normalizePath(g.href);
    if (path === base || path.startsWith(`${base}/`)) {
      const score = base.length;
      if (!best || score > best.score) best = { key: g.key, score };
    }
  }
  return best?.key ?? null;
}

function pickPrimaryFlow(module: ModuleKey): GuideFlow | null {
  const overview = listGuidesForModule(module).find((g) => g.isModuleOverview);
  return overview?.flows[0] ?? null;
}

function bestStepIndex(pathname: string, steps: GuideStep[]): number {
  let best = -1;
  let bestLen = -1;
  for (let i = 0; i < steps.length; i++) {
    const href = steps[i].href;
    if (!href || !pathMatchesStep(pathname, href)) continue;
    const len = normalizePath(href).length;
    if (len > bestLen || (len === bestLen && (best < 0 || i < best))) {
      best = i;
      bestLen = len;
    }
  }
  return best;
}

/**
 * Resolve which process-flow stage the current menu belongs to,
 * using the module's primary (first) flow diagram.
 * Screens not in the flow are the final “Menus” stage (after all numbered stages).
 */
export function resolveProcessStage(pathname: string): ProcessStageInfo | null {
  const module = moduleKeyForPath(pathname);
  if (!module) return null;

  const flow = pickPrimaryFlow(module);
  if (!flow?.steps.length) return null;

  const path = normalizePath(pathname);
  const moduleHref = normalizePath(navGroups.find((g) => g.key === module)?.href || `/${module}`);
  const isGuidePage = path.endsWith("/guide");
  const isHub = path === moduleHref;
  const flowStageCount = flow.steps.filter((s) => {
    if (!s.href) return false;
    const stepPath = normalizePath(s.href);
    return stepPath === moduleHref || stepPath.startsWith(`${moduleHref}/`);
  }).length;
  const menusStageNumber = Math.max(flowStageCount, flow.steps.length) + 1;

  if (isGuidePage || isHub) {
    return {
      module,
      flowTitle: flow.title,
      stageNumber: 0,
      totalStages: menusStageNumber,
      stageOrdinal: "Overview",
      stageName: isGuidePage ? "Flow diagram" : "Module home",
      stageDescription: flow.summary,
      isOverview: true,
      next: flow.steps[0] ? { title: flow.steps[0].title, href: flow.steps[0].href } : undefined
    };
  }

  const idx = bestStepIndex(pathname, flow.steps);
  if (idx < 0) {
    const lastFlowStep = flow.steps[flow.steps.length - 1];
    return {
      module,
      flowTitle: flow.title,
      stageNumber: menusStageNumber,
      totalStages: menusStageNumber,
      stageOrdinal: stageOrdinalLabel(menusStageNumber),
      stageName: "Menus",
      stageDescription:
        "All other screens for this module live here after the process stages — analytics, masters, recycle bin, and supporting tools.",
      tag: "Last stage",
      isMenusStage: true,
      prev: lastFlowStep ? { title: lastFlowStep.title, href: lastFlowStep.href } : undefined
    };
  }

  const step = flow.steps[idx];
  const prev = idx > 0 ? flow.steps[idx - 1] : undefined;
  const next = idx < flow.steps.length - 1 ? flow.steps[idx + 1] : undefined;
  const isLastFlowStep = idx === flow.steps.length - 1;

  return {
    module,
    flowTitle: flow.title,
    stageNumber: idx + 1,
    totalStages: menusStageNumber,
    stageOrdinal: stageOrdinalLabel(idx + 1),
    stageName: step.title,
    stageDescription: step.description,
    tag: step.tag,
    prev: prev ? { title: prev.title, href: prev.href } : undefined,
    next: next
      ? { title: next.title, href: next.href }
      : isLastFlowStep
        ? { title: "Menus", href: undefined }
        : undefined
  };
}

export type NavChildLike = {
  label: string;
  href: string;
  permission?: string;
  group?: string;
};

export type StagedNavChild<T extends NavChildLike = NavChildLike> = T & {
  /** 1-based process stage when this menu is in the primary flow */
  processStage?: number;
};

/**
 * Reorder module sidebar children:
 * Guide → Process flow stages → Menus (last stage, all remaining screens) → Email → Rule Engine
 */
export function sortNavChildrenByProcessStage<T extends NavChildLike>(
  module: ModuleKey,
  moduleHref: string,
  children: T[]
): StagedNavChild<T>[] {
  const flow = pickPrimaryFlow(module);
  const modBase = normalizePath(moduleHref);
  const hrefToStage = new Map<string, number>();

  if (flow) {
    flow.steps.forEach((step, index) => {
      if (!step.href) return;
      const stepPath = normalizePath(step.href);
      const inModule = stepPath === modBase || stepPath.startsWith(`${modBase}/`);
      if (!inModule) return;
      if (!hrefToStage.has(stepPath)) hrefToStage.set(stepPath, index + 1);
    });
  }

  const flowStageCount = hrefToStage.size;
  const menusStageNumber = flowStageCount + 1;

  function stageFor(child: T): number | undefined {
    const path = normalizePath(child.href);
    if (hrefToStage.has(path)) return hrefToStage.get(path);
    let best: number | undefined;
    let bestLen = -1;
    for (const [href, stage] of hrefToStage) {
      if (path === href || path.startsWith(`${href}/`) || href.startsWith(`${path}/`)) {
        if (href.length > bestLen) {
          bestLen = href.length;
          best = stage;
        }
      }
    }
    return best;
  }

  function bucketRank(child: T, stage: number | undefined): number {
    if (child.label === "Flow diagram" || normalizePath(child.href).endsWith("/guide")) return -200;
    if (stage != null) return stage;
    if (child.label === "Compose email" || normalizePath(child.href).endsWith("/compose")) return 9000;
    if (
      child.label === "Rule engine" ||
      child.label === "Automations" ||
      normalizePath(child.href).endsWith("/automations")
    ) {
      return 9100;
    }
    const path = normalizePath(child.href);
    if (path === modBase && (child.label === "Overview" || child.label === module)) return -100;
    // Menus = last process stage (after numbered stages, before Email/Rule)
    return 8000 + menusStageNumber;
  }

  const decorated: StagedNavChild<T>[] = children.map((child) => {
    const processStage = stageFor(child);
    const path = normalizePath(child.href);
    const isFlowGuide = child.label === "Flow diagram" || path.endsWith("/guide");
    const isCompose = child.label === "Compose email" || path.endsWith("/compose");
    const isRuleEngine =
      child.label === "Rule engine" ||
      child.label === "Automations" ||
      path.endsWith("/automations");

    let group = child.group;
    if (isFlowGuide) group = "Guide";
    else if (isCompose) group = "Email Engine";
    else if (isRuleEngine) group = "Rule Engine";
    else if (processStage != null) group = "Process flow";
    else group = "Menus";

    return {
      ...child,
      processStage: processStage ?? (isFlowGuide || isCompose || isRuleEngine ? undefined : menusStageNumber),
      group
    };
  });

  return decorated.sort((a, b) => {
    const ra = bucketRank(a, a.processStage != null && a.group === "Process flow" ? a.processStage : undefined);
    const rb = bucketRank(b, b.processStage != null && b.group === "Process flow" ? b.processStage : undefined);
    if (ra !== rb) return ra - rb;
    return a.label.localeCompare(b.label);
  });
}
