"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  cacheProductBrand,
  defaultProductBrand,
  type ProductBrand
} from "@/lib/product-brand";

const EVENT = "bs-product-brand";

const ProductBrandContext = createContext<ProductBrand>(defaultProductBrand);

/** Server-provided brand so SSR and the first client paint match. */
export function ProductBrandProvider({
  initial,
  children
}: {
  initial: ProductBrand;
  children: React.ReactNode;
}) {
  const [brand, setBrand] = useState<ProductBrand>(initial);

  useEffect(() => {
    setBrand(initial);
    cacheProductBrand(initial);
  }, [initial.productName, initial.productTagline, initial.legalName]);

  useEffect(() => {
    function onUpdate(event: Event) {
      const next = (event as CustomEvent<ProductBrand>).detail;
      if (!next?.productName) return;
      setBrand({ ...defaultProductBrand, ...next });
    }
    window.addEventListener(EVENT, onUpdate);
    return () => window.removeEventListener(EVENT, onUpdate);
  }, []);

  const value = useMemo(() => brand, [brand.productName, brand.productTagline, brand.legalName]);

  return <ProductBrandContext.Provider value={value}>{children}</ProductBrandContext.Provider>;
}

/** Live product name for ERP chrome and the public site. Hydration-safe. */
export function useProductBrand(): ProductBrand {
  return useContext(ProductBrandContext);
}
