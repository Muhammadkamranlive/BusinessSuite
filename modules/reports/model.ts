export type ReportSnapshot = {
  tenantId: string;
  title: string;
  format: "CSV" | "PDF";
  generatedAt: string;
  generatedBy: string;
};
