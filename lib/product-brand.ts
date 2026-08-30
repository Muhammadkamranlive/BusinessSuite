/**
 * Product / project brand — name shown in the ERP sidebar, public site, and browser title.
 * Editable from Administration → Access Control. Persisted in config/product.json.
 */

export type ProductBrand = {
  productName: string;
  productTagline: string;
  legalName: string;
};

export const defaultProductBrand: ProductBrand = {
  productName: "BusinessSuite",
  productTagline: "ERP Cloud",
  legalName: "BusinessSuite, Inc."
};

const CACHE_KEY = "businesssuite:product-brand:v1";

export function cacheProductBrand(brand: ProductBrand) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(brand));
    window.dispatchEvent(new CustomEvent("bs-product-brand", { detail: brand }));
  } catch {
    /* private mode */
  }
}

export function readCachedProductBrand(): ProductBrand {
  if (typeof window === "undefined") return defaultProductBrand;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return defaultProductBrand;
    const parsed = JSON.parse(raw) as Partial<ProductBrand>;
    return { ...defaultProductBrand, ...parsed };
  } catch {
    return defaultProductBrand;
  }
}

export async function fetchProductBrand(): Promise<ProductBrand> {
  try {
    const res = await fetch("/api/product", { cache: "no-store" });
    if (!res.ok) return readCachedProductBrand();
    const data = (await res.json()) as { brand?: ProductBrand };
    const brand = { ...defaultProductBrand, ...(data.brand ?? {}) };
    cacheProductBrand(brand);
    return brand;
  } catch {
    return readCachedProductBrand();
  }
}

export async function saveProductBrand(brand: ProductBrand): Promise<ProductBrand> {
  const res = await fetch("/api/product", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(brand)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to save product name");
  }
  const data = (await res.json()) as { brand: ProductBrand };
  cacheProductBrand(data.brand);
  return data.brand;
}

export async function resetProductBrand(): Promise<ProductBrand> {
  const res = await fetch("/api/product", { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message ?? "Failed to reset product name");
  }
  const data = (await res.json()) as { brand: ProductBrand };
  cacheProductBrand(data.brand);
  return data.brand;
}
