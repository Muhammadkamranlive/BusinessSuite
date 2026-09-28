import { redirect } from "next/navigation";

/** Customers are captured inline at POS checkout — no separate CRM page. */
export default function PharmacyCustomersPage() {
  redirect("/pharmacy/pos");
}
