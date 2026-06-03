/**
 * Active brand configuration.
 *
 * Only DJHQ is supported in this version. To add a new brand:
 *   1. Create lib/brands/<brand>.ts matching the BrandConfig shape.
 *   2. Add it to BRAND_MAP below.
 *   3. Set NEXT_PUBLIC_BRAND=<brand> in the deployment environment.
 */
import { djhqBrand } from "./brands/djhq"

export type { BrandConfig } from "./brands/djhq"

const BRAND_MAP = {
  djhq: djhqBrand,
} as const

const brandId =
  (process.env.NEXT_PUBLIC_BRAND as keyof typeof BRAND_MAP | undefined) ??
  "djhq"

export const brand = BRAND_MAP[brandId] ?? djhqBrand
