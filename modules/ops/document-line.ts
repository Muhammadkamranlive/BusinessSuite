import type { UUID } from "@/modules/core/types";

export type DocumentLine = {
  product_id?: UUID | null;
  sku?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
};

export function emptyDocumentLine(): DocumentLine {
  return { product_id: null, sku: null, description: "", quantity: 1, unit_price: 0 };
}

export function lineAmount(line: DocumentLine) {
  return (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
}

export function linesSubtotal(lines?: DocumentLine[] | null) {
  return (lines ?? []).reduce((sum, line) => sum + lineAmount(line), 0);
}

export function normalizeLines(lines?: DocumentLine[] | null): DocumentLine[] {
  return (lines ?? [])
    .map((line) => ({
      product_id: line.product_id || null,
      sku: line.sku || null,
      description: (line.description || "").trim(),
      quantity: Number(line.quantity) || 0,
      unit_price: Number(line.unit_price) || 0
    }))
    .filter((line) => line.description.length > 0 && line.quantity > 0);
}
