import { redirect } from "next/navigation";

/** Legacy HRM documents route → Documents module */
export default function LegacyHrmDocumentsRedirect() {
  redirect("/documents");
}
