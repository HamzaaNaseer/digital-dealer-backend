import { Router } from "express";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { Product, type ProductDocument } from "../models/product.model.js";

type PopulatedCategory = { id: string; name: string; slug: string } | null;

function serializeCategory(category: PopulatedCategory) {
  if (!category) return null;

  return { id: category.id, name: category.name, slug: category.slug };
}

function serializeProduct(
  product: ProductDocument & { id?: string },
  isAuthenticated: boolean
) {
  return {
    id: product.slug,
    productId: product.id,
    name: product.name,
    colorName: product.colorName,
    tone: product.tone,
    images: product.images,
    category: serializeCategory(product.categoryId as unknown as PopulatedCategory),
    subcategory: serializeCategory(product.subcategoryId as unknown as PopulatedCategory),
    addOns: (
      product.addOnProductIds as unknown as Array<{
        id: string;
        name: string;
        slug: string;
        images: string[];
      }>
    ).map((addOn) => ({
      id: addOn.id,
      slug: addOn.slug,
      name: addOn.name,
      images: addOn.images,
    })),
    variants: product.variants.map((variant) => ({
      label: variant.label,
      size: variant.size,
      sizeMM: variant.sizeMM,
      unit: variant.unit,
      packSize: variant.packSize,
      isNewArrival: variant.isNewArrival,
      price: isAuthenticated ? variant.price : null,
      discountPercent: isAuthenticated ? variant.discountPercent : undefined,
      discountThreshold: isAuthenticated ? variant.discountThreshold : undefined,
    })),
  };
}

export const productsRouter = Router();

productsRouter.use(optionalAuth);

productsRouter.get("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const categoryId =
      typeof req.query.categoryId === "string" ? req.query.categoryId : undefined;
    const subcategoryId =
      typeof req.query.subcategoryId === "string" ? req.query.subcategoryId : undefined;
    const tone = typeof req.query.tone === "string" ? req.query.tone : undefined;
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const filter: Record<string, unknown> = { isActive: true };

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (subcategoryId) {
      filter.subcategoryId = subcategoryId;
    }

    if (tone && tone !== "all") {
      filter.tone = tone;
    }

    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, "i");
      filter.$or = [{ name: regex }, { colorName: regex }];
    }

    const isAuthenticated = Boolean(req.user);
    const products = await Product.find(filter)
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug")
      .populate("addOnProductIds", "name slug images")
      .sort({ name: 1 });

    res.json({
      products: products.map((product) => serializeProduct(product, isAuthenticated)),
    });
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:slug", async (req: AuthenticatedRequest, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate("categoryId", "name slug")
      .populate("subcategoryId", "name slug")
      .populate("addOnProductIds", "name slug images");

    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ product: serializeProduct(product, Boolean(req.user)) });
  } catch (error) {
    next(error);
  }
});
