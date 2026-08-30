"use client";

import { NamedMasterPage } from "@/components/hrm/named-master-page";
import { createPayGrade, listPayGrades, trashPayGrade, updatePayGrade } from "@/modules/hrm/services/workday.store";

export default function PayGradesPage() {
  return (
    <NamedMasterPage
      title="Pay Grades"
      description="Salary ranges (min / mid / max) used on job profiles and worker compensation."
      entityLabel="pay grade"
      formKey="hrm.pay_grade"
      filename="pay-grades"
      extraFields={[
        { key: "min_salary", label: "Min", type: "number" },
        { key: "mid_salary", label: "Mid", type: "number" },
        { key: "max_salary", label: "Max", type: "number" }
      ]}
      list={listPayGrades}
      create={createPayGrade}
      update={updatePayGrade}
      trash={trashPayGrade}
    />
  );
}
