export type InvoiceLineInput = {
  item: string;
  qty: number;
  price: number;
};

export function validateInvoiceLines(lines: InvoiceLineInput[]) {
  return lines.every((line) => line.item.trim().length > 1 && line.qty > 0 && line.price >= 0);
}
