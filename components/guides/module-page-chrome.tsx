"use client";

import { GuideButton } from "@/components/guides/guide-button";
import { ModuleBreadcrumbs } from "@/components/common/module-breadcrumbs";
import type { Crumb } from "@/components/common/breadcrumbs";

/**
 * Breadcrumbs + Guide button on every module page.
 * Guide opens view mode with web flow diagrams for this menu / module.
 */
export function ModulePageChrome({ trail }: { trail?: Crumb[] }) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 flex-1 [&_.bs-breadcrumbs]:mb-0">
        <ModuleBreadcrumbs trail={trail} />
      </div>
      <GuideButton className="w-full sm:w-auto" />
    </div>
  );
}
