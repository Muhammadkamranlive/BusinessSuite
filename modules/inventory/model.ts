export type StockMovementType = "Stock In" | "Stock Out" | "Adjustment";

export type StockMovementRecord = {
  tenantId: string;
  productId: string;
  warehouseId: string;
  movementType: StockMovementType;
  quantity: number;
  referenceNo: string;
};
