import { tenants as seedTenants } from "@/lib/demo-data";
import { getSystemSettings, listAdminTenants } from "@/modules/admin/services/admin.store";
import { getContactFormat, type CountryCode } from "@/lib/locale/contact-formats";

const REGION_MAP: Record<string, CountryCode> = {
  pakistan: "PK",
  pk: "PK",
  uae: "AE",
  "united arab emirates": "AE",
  dubai: "AE",
  ae: "AE",
  "saudi arabia": "SA",
  ksa: "SA",
  sa: "SA",
  "united states": "US",
  usa: "US",
  us: "US",
  "united kingdom": "GB",
  uk: "GB",
  gb: "GB",
  india: "IN",
  in: "IN"
};

const CURRENCY_MAP: Record<string, CountryCode> = {
  PKR: "PK",
  AED: "AE",
  SAR: "SA",
  USD: "US",
  GBP: "GB",
  INR: "IN"
};

const TIMEZONE_MAP: Record<string, CountryCode> = {
  "Asia/Karachi": "PK",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Los_Angeles": "US",
  "Europe/London": "GB",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN"
};

function regionToCountry(region?: string | null): CountryCode | null {
  if (!region?.trim()) return null;
  return REGION_MAP[region.trim().toLowerCase()] ?? null;
}

/**
 * Resolve ISO-ish country for contact formats.
 * Preference: explicit System Settings country → tenant region → currency → timezone → INTL.
 * (ERP is not country-locked; company locale drives phone / national ID rules.)
 */
export function resolveTenantCountry(tenantId: string): CountryCode {
  const settings = getSystemSettings();
  const explicit = (settings.country || "").trim().toUpperCase();
  if (explicit && getContactFormat(explicit).country === explicit) {
    return explicit as CountryCode;
  }
  if (explicit && ["PK", "AE", "SA", "US", "GB", "IN", "INTL"].includes(explicit)) {
    return explicit as CountryCode;
  }

  const admin = listAdminTenants().find((t) => t.id === tenantId);
  const seed = seedTenants.find((t) => t.id === tenantId);
  const fromRegion = regionToCountry(admin?.region) || regionToCountry(seed?.region);
  if (fromRegion) return fromRegion;

  const fromCurrency = CURRENCY_MAP[(settings.currency || "").toUpperCase()];
  if (fromCurrency) return fromCurrency;

  const fromTz = TIMEZONE_MAP[settings.timezone];
  if (fromTz) return fromTz;

  return "INTL";
}

export function resolveTenantContactFormat(tenantId: string) {
  return getContactFormat(resolveTenantCountry(tenantId));
}
