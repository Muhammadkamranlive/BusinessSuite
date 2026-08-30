"use client";

import { ModuleReportsView } from "@/components/reporting/module-reports-view";

export default function PurchaseReportsPage() {
  return <ModuleReportsView module="purchases" title="Purchase Reports" domain="purchases" dwAnchor="#inventory" />;
}
