/**
 * Product / project brand — name shown in the ERP sidebar, public site, and browser title.
 * Editable from Administration → Access Control. Persisted in config/product.json.
 */

import { loadPersisted, savePersisted } from "@/modules/core/services/local-persist";

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
    savePersisted(CACHE_KEY, brand);
    window.dispatchEvent(new CustomEvent("bs-product-brand", { detail: brand }));
  } catch {
    /* ignore */
  }
}

export function readCachedProductBrand(): ProductBrand {
  if (typeof window === "undefined") return defaultProductBrand;
  try {
    const parsed = loadPersisted<Partial<ProductBrand>>(CACHE_KEY);
    if (!parsed) return defaultProductBrand;
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
