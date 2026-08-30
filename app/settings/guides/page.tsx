import { redirect } from "next/navigation";

/** Alias under Administration — canonical hub is /guides */
export default function SettingsGuidesRedirect() {
  redirect("/guides");
}
