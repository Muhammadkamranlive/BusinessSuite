/**
 * Country-aware phone + national ID formats for POS / checkout.
 * ERP is multi-country — pick rules from ISO country (see resolve-tenant-country).
 */

export type CountryCode = "PK" | "AE" | "SA" | "US" | "GB" | "IN" | "INTL";

export type ContactFormat = {
  country: CountryCode;
  currencyCode: string;
  moneyLocale: string;
  phone: {
    label: string;
    placeholder: string;
    hint: string;
    minDigits: number;
    maxDigits: number;
  };
  nationalId: {
    /** CNIC, Emirates ID, SSN, National ID, … */
    label: string;
    placeholder: string;
    hint: string;
    minDigits: number;
    maxDigits: number;
  };
};

const FORMATS: Record<CountryCode, ContactFormat> = {
  PK: {
    country: "PK",
    currencyCode: "PKR",
    moneyLocale: "en-PK",
    phone: {
      label: "Phone",
      placeholder: "03XXXXXXXXX",
      hint: "Pakistani mobile — 03 + 9 digits",
      minDigits: 11,
      maxDigits: 11
    },
    nationalId: {
      label: "CNIC",
      placeholder: "XXXXX-XXXXXXX-X",
      hint: "13-digit CNIC",
      minDigits: 13,
      maxDigits: 13
    }
  },
  AE: {
    country: "AE",
    currencyCode: "AED",
    moneyLocale: "en-AE",
    phone: {
      label: "Phone",
      placeholder: "05XXXXXXXX",
      hint: "UAE mobile — 05 + 8 digits",
      minDigits: 10,
      maxDigits: 10
    },
    nationalId: {
      label: "Emirates ID",
      placeholder: "784-YYYY-XXXXXXX-X",
      hint: "15-digit Emirates ID",
      minDigits: 15,
      maxDigits: 15
    }
  },
  SA: {
    country: "SA",
    currencyCode: "SAR",
    moneyLocale: "en-SA",
    phone: {
      label: "Phone",
      placeholder: "05XXXXXXXX",
      hint: "Saudi mobile — 05 + 8 digits",
      minDigits: 10,
      maxDigits: 10
    },
    nationalId: {
      label: "National ID",
      placeholder: "1XXXXXXXXX",
      hint: "10-digit national / iqama ID",
      minDigits: 10,
      maxDigits: 10
    }
  },
  US: {
    country: "US",
    currencyCode: "USD",
    moneyLocale: "en-US",
    phone: {
      label: "Phone",
      placeholder: "(XXX) XXX-XXXX",
      hint: "US 10-digit number",
      minDigits: 10,
      maxDigits: 10
    },
    nationalId: {
      label: "SSN / ID",
      placeholder: "XXX-XX-XXXX",
      hint: "9-digit SSN or ID (optional)",
      minDigits: 9,
      maxDigits: 9
    }
  },
  GB: {
    country: "GB",
    currencyCode: "GBP",
    moneyLocale: "en-GB",
    phone: {
      label: "Phone",
      placeholder: "07XXX XXXXXX",
      hint: "UK mobile — 11 digits starting 07",
      minDigits: 11,
      maxDigits: 11
    },
    nationalId: {
      label: "National ID",
      placeholder: "Digits only",
      hint: "Optional numeric ID (digits only)",
      minDigits: 5,
      maxDigits: 12
    }
  },
  IN: {
    country: "IN",
    currencyCode: "INR",
    moneyLocale: "en-IN",
    phone: {
      label: "Phone",
      placeholder: "9XXXXXXXXX",
      hint: "Indian mobile — 10 digits",
      minDigits: 10,
      maxDigits: 10
    },
    nationalId: {
      label: "Aadhaar / ID",
      placeholder: "XXXX XXXX XXXX",
      hint: "12-digit Aadhaar (optional)",
      minDigits: 12,
      maxDigits: 12
    }
  },
  INTL: {
    country: "INTL",
    currencyCode: "USD",
    moneyLocale: "en-US",
    phone: {
      label: "Phone",
      placeholder: "Phone number",
      hint: "Digits only — 7 to 15 digits",
      minDigits: 7,
      maxDigits: 15
    },
    nationalId: {
      label: "ID number",
      placeholder: "National / tax ID",
      hint: "Optional — digits only",
      minDigits: 5,
      maxDigits: 20
    }
  }
};

export function getContactFormat(country: string | null | undefined): ContactFormat {
  const code = (country || "INTL").toUpperCase() as CountryCode;
  return FORMATS[code] ?? FORMATS.INTL;
}

/** Strip everything except digits. */
export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

/**
 * Normalize phone to a comparable digit string for the country.
 * Handles common country codes (+92, 0092, +971, +1, …).
 */
export function normalizePhoneDigits(country: string | null | undefined, raw: string): string {
  let d = digitsOnly(raw);
  if (!d) return "";
  const c = (country || "INTL").toUpperCase();

  if (c === "PK") {
    if (d.startsWith("0092")) d = d.slice(4);
    else if (d.startsWith("92") && d.length >= 12) d = d.slice(2);
    if (d.length === 10 && d.startsWith("3")) d = `0${d}`;
    return d.slice(0, 11);
  }
  if (c === "AE") {
    if (d.startsWith("00971")) d = d.slice(5);
    else if (d.startsWith("971") && d.length >= 12) d = d.slice(3);
    if (d.length === 9 && d.startsWith("5")) d = `0${d}`;
    return d.slice(0, 10);
  }
  if (c === "SA") {
    if (d.startsWith("00966")) d = d.slice(5);
    else if (d.startsWith("966") && d.length >= 12) d = d.slice(3);
    if (d.length === 9 && d.startsWith("5")) d = `0${d}`;
    return d.slice(0, 10);
  }
  if (c === "US") {
    if (d.startsWith("1") && d.length === 11) d = d.slice(1);
    return d.slice(0, 10);
  }
  if (c === "GB") {
    if (d.startsWith("0044")) d = d.slice(4);
    else if (d.startsWith("44") && d.length >= 12) d = d.slice(2);
    if (d.length === 10 && d.startsWith("7")) d = `0${d}`;
    return d.slice(0, 11);
  }
  if (c === "IN") {
    if (d.startsWith("0091")) d = d.slice(4);
    else if (d.startsWith("91") && d.length >= 12) d = d.slice(2);
    return d.slice(0, 10);
  }
  return d.slice(0, 15);
}

export function normalizeNationalIdDigits(country: string | null | undefined, raw: string): string {
  const fmt = getContactFormat(country);
  return digitsOnly(raw).slice(0, fmt.nationalId.maxDigits);
}

/** Live display formatting (still digits-only input under the hood). */
export function formatPhoneDisplay(country: string | null | undefined, raw: string): string {
  const d = normalizePhoneDigits(country, raw);
  if (!d) return "";
  const c = (country || "INTL").toUpperCase();

  if (c === "PK") {
    if (d.length <= 4) return d;
    return `${d.slice(0, 4)}-${d.slice(4)}`;
  }
  if (c === "AE" || c === "SA") {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (c === "US") {
    if (d.length <= 3) return d;
    if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (c === "GB") {
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  }
  if (c === "IN") {
    if (d.length <= 5) return d;
    return `${d.slice(0, 5)} ${d.slice(5)}`;
  }
  return d;
}

export function formatNationalIdDisplay(country: string | null | undefined, raw: string): string {
  const d = normalizeNationalIdDigits(country, raw);
  if (!d) return "";
  const c = (country || "INTL").toUpperCase();

  if (c === "PK") {
    if (d.length <= 5) return d;
    if (d.length <= 12) return `${d.slice(0, 5)}-${d.slice(5)}`;
    return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
  }
  if (c === "AE") {
    // 784-YYYY-XXXXXXX-X
    if (d.length <= 3) return d;
    if (d.length <= 7) return `${d.slice(0, 3)}-${d.slice(3)}`;
    if (d.length <= 14) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 14)}-${d.slice(14)}`;
  }
  if (c === "US") {
    if (d.length <= 3) return d;
    if (d.length <= 5) return `${d.slice(0, 3)}-${d.slice(3)}`;
    return `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}`;
  }
  if (c === "IN") {
    if (d.length <= 4) return d;
    if (d.length <= 8) return `${d.slice(0, 4)} ${d.slice(4)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8)}`;
  }
  return d;
}

export function isPhoneComplete(country: string | null | undefined, raw: string): boolean {
  const fmt = getContactFormat(country);
  const d = normalizePhoneDigits(country, raw);
  if (!d) return false;
  if (d.length < fmt.phone.minDigits || d.length > fmt.phone.maxDigits) return false;
  const c = (country || "INTL").toUpperCase();
  if (c === "PK") return /^03\d{9}$/.test(d);
  if (c === "AE" || c === "SA") return /^05\d{8}$/.test(d);
  if (c === "US") return /^\d{10}$/.test(d);
  if (c === "GB") return /^07\d{9}$/.test(d);
  if (c === "IN") return /^[6-9]\d{9}$/.test(d);
  return true;
}

/** Empty is OK (walk-in). Partial / wrong length → error message or null if valid. */
export function validatePhoneOptional(
  country: string | null | undefined,
  raw: string
): string | null {
  const d = normalizePhoneDigits(country, raw);
  if (!d) return null;
  if (isPhoneComplete(country, raw)) return null;
  const fmt = getContactFormat(country);
  return `Enter a valid ${fmt.phone.label.toLowerCase()} (${fmt.phone.hint})`;
}

/** Empty is OK. If any digits entered, must match country length/pattern. */
export function validateNationalIdOptional(
  country: string | null | undefined,
  raw: string
): string | null {
  const d = normalizeNationalIdDigits(country, raw);
  if (!d) return null;
  const fmt = getContactFormat(country);
  if (d.length < fmt.nationalId.minDigits || d.length > fmt.nationalId.maxDigits) {
    return `Enter a valid ${fmt.nationalId.label} (${fmt.nationalId.hint})`;
  }
  const c = (country || "INTL").toUpperCase();
  if (c === "PK" && !/^\d{13}$/.test(d)) {
    return "CNIC must be 13 digits";
  }
  if (c === "AE" && !/^784\d{12}$/.test(d)) {
    return "Emirates ID should start with 784 (15 digits)";
  }
  return null;
}

export function formatMoneyAmount(
  amount: number,
  country: string | null | undefined,
  currencyOverride?: string
) {
  const fmt = getContactFormat(country);
  const currency = currencyOverride || fmt.currencyCode;
  try {
    return new Intl.NumberFormat(fmt.moneyLocale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString(fmt.moneyLocale)}`;
  }
}
