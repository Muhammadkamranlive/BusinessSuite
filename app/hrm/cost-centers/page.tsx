"use client";

import { NamedMasterPage } from "@/components/hrm/named-master-page";
import { createCostCenter, listCostCenters, trashCostCenter, updateCostCenter } from "@/modules/hrm/services/workday.store";

export default function CostCentersPage() {
  return (
    <NamedMasterPage
      title="Cost Centers"
      description="Charge salary and headcount to a cost center (Workday costing)."
      entityLabel="cost center"
      formKey="hrm.cost_center"
      filename="cost-centers"
      extraFields={[{ key: "description", label: "Description" }]}
      list={listCostCenters}
      create={createCostCenter}
      update={updateCostCenter}
      trash={trashCostCenter}
    />
  );
}
