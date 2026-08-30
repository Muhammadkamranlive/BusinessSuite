export type DealStage = "Qualified" | "Proposal" | "Negotiation" | "Won" | "Lost";

export type DealRecord = {
  tenantId: string;
  customerId: string;
  name: string;
  stage: DealStage;
  amount: number;
  probability: number;
};
