import type { ModuleKey } from "@/lib/permissions";

export type GuideStep = {
  id: string;
  title: string;
  description: string;
  /** Optional deep link into the app for this step */
  href?: string;
  /** Short badge e.g. "Setup", "Daily", "Approve" */
  tag?: string;
};

export type GuideFlow = {
  id: string;
  title: string;
  summary: string;
  steps: GuideStep[];
};

export type GuideDefinition = {
  /** Stable id — often matches menu registry id (e.g. crm.leads) */
  id: string;
  module: ModuleKey;
  title: string;
  /** One-line purpose of this screen / module */
  purpose: string;
  /** How data typically moves in / out of this area */
  dataFlow: string;
  /** Path prefixes this guide applies to (longest match wins) */
  hrefs: string[];
  /** Full module / process flows shown as diagrams */
  flows: GuideFlow[];
  /** Quick tips shown under the diagram */
  tips?: string[];
  /** Mark as primary module overview (shown first on Guides hub) */
  isModuleOverview?: boolean;
};
