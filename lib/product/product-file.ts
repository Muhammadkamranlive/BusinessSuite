import { promises as fs } from "fs";
import path from "path";
import { defaultProductBrand, type ProductBrand } from "@/lib/product-brand";

const productPath = path.join(process.cwd(), "config", "product.json");
const defaultProductPath = path.join(process.cwd(), "config", "product.default.json");

async function readJsonFile(filePath: string): Promise<Partial<ProductBrand>> {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw) as Partial<ProductBrand>;
}

export async function readProductBrandFile(): Promise<ProductBrand> {
  try {
    const data = await readJsonFile(productPath);
    return { ...defaultProductBrand, ...data };
  } catch {
    try {
      const data = await readJsonFile(defaultProductPath);
      return { ...defaultProductBrand, ...data };
    } catch {
      return defaultProductBrand;
    }
  }
}

export async function writeProductBrandFile(brand: ProductBrand): Promise<ProductBrand> {
  const merged = {
    productName: brand.productName.trim() || defaultProductBrand.productName,
    productTagline: brand.productTagline.trim() || defaultProductBrand.productTagline,
    legalName: brand.legalName.trim() || defaultProductBrand.legalName
  };
  await fs.writeFile(productPath, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  return merged;
}

export async function resetProductBrandFile(): Promise<ProductBrand> {
  let defaults = defaultProductBrand;
  try {
    defaults = { ...defaultProductBrand, ...(await readJsonFile(defaultProductPath)) };
  } catch {
    /* keep code defaults */
  }
  await fs.writeFile(productPath, `${JSON.stringify(defaults, null, 2)}\n`, "utf8");
  return defaults;
}
