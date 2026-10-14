import { Router } from "express";
import { requireAdmin, requireAuth } from "../middleware/auth.middleware.js";
import { Quote, type QuoteDocument } from "../models/quote.model.js";

export const adminQuotesRouter = Router();

adminQuotesRouter.use(requireAuth, requireAdmin);

function serializeQuoteSummary(quote: QuoteDocument & { id?: string }) {
  return {
    id: quote.id,
    email: quote.submittedBy.email,
    company: quote.submittedBy.company ?? null,
    isGuest: !quote.submittedBy.userId,
    itemCount: quote.items.length,
    grandTotal: quote.grandTotal,
    createdAt: quote.createdAt,
  };
}

function serializeQuoteDetail(quote: QuoteDocument & { id?: string }) {
  return {
    id: quote.id,
    email: quote.submittedBy.email,
    company: quote.submittedBy.company ?? null,
    isGuest: !quote.submittedBy.userId,
    notes: quote.notes ?? null,
    items: quote.items.map((item) => ({
      name: item.name,
      size: item.size,
      unit: item.unit,
      totalPcs: item.totalPcs,
      totalCoverage: item.totalCoverage,
      fullSkids: item.fullSkids,
      loosePcs: item.loosePcs,
      pricePerUnit: item.pricePerUnit,
      materialCost: item.materialCost,
      handlingFee: item.handlingFee,
      discountAmount: item.discountAmount,
      total: item.total,
    })),
    materialTotal: quote.materialTotal,
    handlingTotal: quote.handlingTotal,
    discountTotal: quote.discountTotal,
    grandTotal: quote.grandTotal,
    createdAt: quote.createdAt,
  };
}

adminQuotesRouter.get("/", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : undefined;
    const filter: Record<string, unknown> = {};

    if (search) {
      const pattern = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(pattern, "i");
      filter.$or = [{ "submittedBy.email": regex }, { "submittedBy.company": regex }];
    }

    const quotes = await Quote.find(filter).sort({ createdAt: -1 }).limit(200);

    res.json({ quotes: quotes.map((quote) => serializeQuoteSummary(quote)) });
  } catch (error) {
    next(error);
  }
});

adminQuotesRouter.get("/:id", async (req, res, next) => {
  try {
    const quote = await Quote.findById(req.params.id);

    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    res.json({ quote: serializeQuoteDetail(quote) });
  } catch {
    res.status(404).json({ error: "Quote not found" });
  }
});
