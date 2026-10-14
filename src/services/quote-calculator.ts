import type { ProductVariantDocument } from "../models/product.model.js";

const HANDLING_RATE = 0.2;

export type QuoteQuantityMode = "coverage" | "pieces";

export type QuoteItemCalculation = {
  fullSkids: number;
  loosePcs: number;
  totalPcs: number;
  totalCoverage: number;
  materialCost: number;
  handlingFee: number;
  discountAmount: number;
  total: number;
};

export function calculateQuoteItem(
  variant: ProductVariantDocument,
  quantityMode: QuoteQuantityMode,
  quantity: number
): QuoteItemCalculation {
  const coveragePerPiece = variant.packSize?.coveragePerPiece ?? 1;
  const piecesPerSkid = variant.packSize?.piecesPerSkid ?? Infinity;

  const totalPcs =
    quantity <= 0
      ? 0
      : quantityMode === "pieces"
        ? Math.ceil(quantity)
        : Math.ceil(quantity / coveragePerPiece);

  const fullSkids = Math.floor(totalPcs / piecesPerSkid);
  const loosePcs = totalPcs % piecesPerSkid;
  const looseCoverage = loosePcs * coveragePerPiece;
  const totalCoverage = totalPcs * coveragePerPiece;
  const materialCost = totalCoverage * variant.price;
  const looseMaterialCost = looseCoverage * variant.price;
  const handlingFee = loosePcs > 0 ? looseMaterialCost * HANDLING_RATE : 0;
  const discountApplied = Boolean(
    variant.discountPercent && totalCoverage >= (variant.discountThreshold ?? Infinity)
  );
  const discountAmount = discountApplied
    ? materialCost * ((variant.discountPercent ?? 0) / 100)
    : 0;
  const total = materialCost + handlingFee - discountAmount;

  return {
    fullSkids: Number.isFinite(fullSkids) ? fullSkids : 0,
    loosePcs: Number.isFinite(loosePcs) ? loosePcs : totalPcs,
    totalPcs,
    totalCoverage,
    materialCost,
    handlingFee,
    discountAmount,
    total,
  };
}
