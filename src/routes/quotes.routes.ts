import { Router } from "express";
import { optionalAuth, type AuthenticatedRequest } from "../middleware/auth.middleware.js";
import { Quote, type QuoteItemDocument } from "../models/quote.model.js";
import { Product } from "../models/product.model.js";
import { calculateQuoteItem, type QuoteQuantityMode } from "../services/quote-calculator.js";
import { notifyAdminsOfQuote } from "../services/quote-email.service.js";

export const quotesRouter = Router();

quotesRouter.use(optionalAuth);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RawQuoteItem = {
  productId: string;
  variantLabel: string;
  quantityMode: QuoteQuantityMode;
  quantity: number;
};

function parseRawItem(input: unknown): RawQuoteItem | null {
  if (typeof input !== "object" || input === null) return null;

  const raw = input as Record<string, unknown>;

  if (typeof raw.productId !== "string" || !raw.productId.trim()) return null;
  if (typeof raw.variantLabel !== "string" || !raw.variantLabel.trim()) return null;
  if (typeof raw.quantity !== "number" || !Number.isFinite(raw.quantity) || raw.quantity <= 0) {
    return null;
  }

  return {
    productId: raw.productId,
    variantLabel: raw.variantLabel,
    quantityMode: raw.quantityMode === "pieces" ? "pieces" : "coverage",
    quantity: raw.quantity,
  };
}

quotesRouter.post("/", async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawItems: unknown[] | null = Array.isArray(req.body?.items)
      ? req.body.items
      : null;

    if (!rawItems || rawItems.length === 0) {
      res.status(400).json({ error: "At least one quote item is required" });
      return;
    }

    const parsedItems = rawItems.map(parseRawItem);

    if (parsedItems.some((item) => item === null)) {
      res.status(400).json({ error: "One or more quote items are invalid" });
      return;
    }

    let email: string;
    let userId: string | null = null;

    if (req.user) {
      email = req.user.email;
      userId = req.user.id;
    } else {
      const bodyEmail =
        typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";

      if (!bodyEmail || !EMAIL_PATTERN.test(bodyEmail)) {
        res.status(400).json({ error: "A valid email is required" });
        return;
      }

      email = bodyEmail;
    }

    const company =
      typeof req.body?.company === "string" && req.body.company.trim()
        ? req.body.company.trim()
        : undefined;
    const notes =
      typeof req.body?.notes === "string" && req.body.notes.trim()
        ? req.body.notes.trim()
        : undefined;

    const items: QuoteItemDocument[] = [];

    for (const raw of parsedItems as RawQuoteItem[]) {
      const product = await Product.findById(raw.productId);

      if (!product) {
        res.status(400).json({ error: "One or more products in this quote no longer exist" });
        return;
      }

      const variant = product.variants.find((item) => item.label === raw.variantLabel);

      if (!variant) {
        res.status(400).json({ error: `Size "${raw.variantLabel}" is no longer available for ${product.name}` });
        return;
      }

      const calculation = calculateQuoteItem(variant, raw.quantityMode, raw.quantity);

      if (calculation.totalPcs <= 0) {
        res.status(400).json({ error: "Enter a valid quantity for each item" });
        return;
      }

      items.push({
        productId: product._id,
        collectionId: product.slug,
        name: product.name,
        size: variant.size ?? variant.label,
        sizeMM: variant.sizeMM ?? "",
        unit: variant.unit,
        pricePerUnit: variant.price,
        ...calculation,
      });
    }

    const quote = await Quote.create({
      submittedBy: { userId, email, company },
      notes,
      items,
      materialTotal: items.reduce((sum, item) => sum + item.materialCost, 0),
      handlingTotal: items.reduce((sum, item) => sum + item.handlingFee, 0),
      discountTotal: items.reduce((sum, item) => sum + item.discountAmount, 0),
      grandTotal: items.reduce((sum, item) => sum + item.total, 0),
    });

    try {
      await notifyAdminsOfQuote(quote);
    } catch (error) {
      console.error("Failed to send quote notification email:", error);
    }

    res.status(201).json({ quote: { id: quote.id } });
  } catch (error) {
    next(error);
  }
});
