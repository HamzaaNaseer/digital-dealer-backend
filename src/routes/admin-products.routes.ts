import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import {
  Product,
  type ProductDocument,
  type ProductUnit,
  type ProductVariantDocument,
  type ProductVariantPackSize,
} from "../models/product.model.js";

export const adminProductsRouter = Router();

adminProductsRouter.use(requireAuth, requireAdmin);

const UNITS: ProductUnit[] = ["sqf", "lft", "piece", "box", "ton", "bottle"];
const TONES = ["light", "grey", "dark"];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type PopulatedCategory = { id: string; name: string; slug: string } | null;

function serializeCategory(category: PopulatedCategory) {
  if (!category) return null;
  return { id: category.id, name: category.name, slug: category.slug };
}

function serializeAdminProduct(product: ProductDocument & { id?: string }) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    category: serializeCategory(product.categoryId as unknown as PopulatedCategory),
    subcategory: serializeCategory(product.subcategoryId as unknown as PopulatedCategory),
    colorName: product.colorName ?? "",
    tone: product.tone ?? "",
    images: product.images,
    isActive: product.isActive,
    variants: product.variants,
    addOnProductIds: (product.addOnProductIds as unknown as Array<unknown>).map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof (item as { toHexString?: () => string }).toHexString === "function") {
        return (item as { toHexString: () => string }).toHexString();
      }
      if (item && typeof item === "object" && "id" in item) {
        return (item as { id: string }).id;
      }
      return String(item);
    }),
    addOns: (
      product.addOnProductIds as unknown as Array<{
        id: string;
        name: string;
        slug: string;
      }>
    )
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => ({ id: item.id, name: item.name, slug: item.slug })),
  };
}

function parsePackSize(input: unknown): ProductVariantPackSize | undefined {
  if (typeof input !== "object" || input === null) return undefined;

  const raw = input as Record<string, unknown>;
  const packSize: ProductVariantPackSize = {};
  let hasValue = false;

  for (const key of [
    "piecesPerSkid",
    "coveragePerSkid",
    "coveragePerPiece",
    "piecesPerBox",
  ] as const) {
    const value = raw[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      packSize[key] = value;
      hasValue = true;
    }
  }

  return hasValue ? packSize : undefined;
}

function parseVariant(input: unknown): ProductVariantDocument | null {
  if (typeof input !== "object" || input === null) return null;

  const raw = input as Record<string, unknown>;

  if (typeof raw.label !== "string" || !raw.label.trim()) return null;
  if (typeof raw.unit !== "string" || !UNITS.includes(raw.unit as ProductUnit)) return null;
  if (typeof raw.price !== "number" || !Number.isFinite(raw.price) || raw.price < 0) {
    return null;
  }

  return {
    label: raw.label.trim(),
    size: typeof raw.size === "string" && raw.size.trim() ? raw.size.trim() : undefined,
    sizeMM:
      typeof raw.sizeMM === "string" && raw.sizeMM.trim() ? raw.sizeMM.trim() : undefined,
    unit: raw.unit as ProductUnit,
    price: raw.price,
    packSize: parsePackSize(raw.packSize),
    discountPercent:
      typeof raw.discountPercent === "number" && Number.isFinite(raw.discountPercent)
        ? raw.discountPercent
        : undefined,
    discountThreshold:
      typeof raw.discountThreshold === "number" && Number.isFinite(raw.discountThreshold)
        ? raw.discountThreshold
        : undefined,
    isNewArrival: Boolean(raw.isNewArrival),
  };
}

type ProductPayload = {
  name: string;
  slug?: string;
  categoryId: string;
  subcategoryId: string | null;
  colorName?: string;
  tone?: "light" | "grey" | "dark";
  images: string[];
  isActive: boolean;
  variants: ProductVariantDocument[];
  addOnProductIds: string[];
};

function parseProductPayload(body: unknown): ProductPayload | null {
  if (typeof body !== "object" || body === null) return null;

  const raw = body as Record<string, unknown>;

  if (typeof raw.name !== "string" || !raw.name.trim()) return null;
  if (typeof raw.categoryId !== "string" || !raw.categoryId.trim()) return null;

  const rawVariants = Array.isArray(raw.variants) ? raw.variants : null;
  if (!rawVariants || rawVariants.length === 0) return null;

  const variants = rawVariants.map(parseVariant);
  if (variants.some((variant) => variant === null)) return null;

  const images = Array.isArray(raw.images)
    ? raw.images.filter((item): item is string => typeof item === "string" && item.trim() !== "")
    : [];

  const addOnProductIds = Array.isArray(raw.addOnProductIds)
    ? raw.addOnProductIds.filter((item): item is string => typeof item === "string")
    : [];

  return {
    name: raw.name.trim(),
    slug: typeof raw.slug === "string" && raw.slug.trim() ? slugify(raw.slug) : undefined,
    categoryId: raw.categoryId,
    subcategoryId:
      typeof raw.subcategoryId === "string" && raw.subcategoryId.trim()
        ? raw.subcategoryId
        : null,
    colorName: typeof raw.colorName === "string" ? raw.colorName.trim() : undefined,
    tone: TONES.includes(raw.tone as string) ? (raw.tone as "light" | "grey" | "dark") : undefined,
    images,
    isActive: raw.isActive !== false,
    variants: variants as ProductVariantDocument[],
    addOnProductIds,
  };
}

adminProductsRouter.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const filter: Record<string, unknown> = {};

    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, "i");
      filter.$or = [{ name: regex }, { colorName: regex }];
    }

    const products = await Product.find(filter)
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug")
      .sort({ name: 1 })
      .limit(200);

    res.json({ products: products.map((product) => serializeAdminProduct(product)) });
  } catch (error) {
    next(error);
  }
});

adminProductsRouter.get("/:id", async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug")
      .populate("addOnProductIds", "name slug");

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ product: serializeAdminProduct(product) });
  } catch {
    res.status(404).json({ error: "Product not found" });
  }
});

adminProductsRouter.post("/", async (req, res, next) => {
  try {
    const payload = parseProductPayload(req.body);

    if (!payload) {
      res.status(400).json({ error: "Invalid product payload" });
      return;
    }

    const slug = payload.slug || slugify(`${payload.colorName ?? ""} ${payload.name}`);
    const existing = await Product.findOne({ slug });

    if (existing) {
      res.status(409).json({ error: "A product with that slug already exists" });
      return;
    }

    const product = await Product.create({ ...payload, slug });
    await product.populate([
      { path: "categoryId", select: "name slug" },
      { path: "subcategoryId", select: "name slug" },
      { path: "addOnProductIds", select: "name slug" },
    ]);

    res.status(201).json({ product: serializeAdminProduct(product) });
  } catch (error) {
    next(error);
  }
});

adminProductsRouter.put("/:id", async (req, res, next) => {
  try {
    const payload = parseProductPayload(req.body);

    if (!payload) {
      res.status(400).json({ error: "Invalid product payload" });
      return;
    }

    if (payload.slug) {
      const existing = await Product.findOne({
        slug: payload.slug,
        _id: { $ne: req.params.id },
      });

      if (existing) {
        res.status(409).json({ error: "A product with that slug already exists" });
        return;
      }
    }

    const update: Record<string, unknown> = { ...payload };
    if (!payload.slug) {
      delete update.slug;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug")
      .populate("addOnProductIds", "name slug");

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ product: serializeAdminProduct(product) });
  } catch (error) {
    next(error);
  }
});

adminProductsRouter.delete("/:id", async (req, res, next) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});
