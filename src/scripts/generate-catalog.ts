import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawDir = join(__dirname, "../data/raw");
const outFile = join(__dirname, "../data/product-catalog.seed.ts");

type Row = Record<string, string>;

function readTsv(path: string): Row[] {
  const text = readFileSync(path, "utf-8").trim();
  const [headerLine, ...lines] = text.split("\n");
  const headers = headerLine.split("\t");
  return lines.map((line) => {
    const cells = line.split("\t");
    const row: Row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return row;
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LIGHT_KEYWORDS = [
  "white", "beige", "ivory", "seashell", "buff", "cream", "sand", "silver antique",
  "dove", "crema", "light", "fossil", "moderno beige", "travertine ivory", "greige",
  "coast", "amalfi", "spring", "oak",
];
const DARK_KEYWORDS = [
  "black", "onyx", "ebony", "charcoal", "carbon", "bronze", "imperial", "nero",
  "graphite", "mahogany", "walnut",
];

function inferTone(colorName: string): "light" | "grey" | "dark" {
  const lower = colorName.toLowerCase();
  if (DARK_KEYWORDS.some((keyword) => lower.includes(keyword))) return "dark";
  if (LIGHT_KEYWORDS.some((keyword) => lower.includes(keyword))) return "light";
  return "grey";
}

type VariantOut = {
  label: string;
  size?: string;
  sizeMM?: string;
  unit: string;
  price: number;
  packSize?: Record<string, number>;
};

type ProductOut = {
  slug: string;
  name: string;
  categorySlug: string;
  subcategorySlug: string;
  colorName: string;
  tone: string;
  images: string[];
  variants: VariantOut[];
};

function lastDescriptionSegment(description: string): string {
  const parts = description.split(":");
  return parts[parts.length - 1].trim();
}

function buildPorcelainTileProducts(): ProductOut[] {
  const rows = readTsv(join(rawDir, "porcea-tiles.tsv"));
  const grouped = new Map<string, ProductOut>();

  for (const row of rows) {
    const collection = row.Collection.trim();
    const key = collection;

    if (!grouped.has(key)) {
      grouped.set(key, {
        slug: slugify(`porcea-${collection}`),
        name: `Porcea ${collection}`,
        categorySlug: "porcelain-tiles",
        subcategorySlug: "standard-pavers-tiles",
        colorName: collection,
        tone: inferTone(collection),
        images: [],
        variants: [],
      });
    }

    const product = grouped.get(key)!;
    product.variants.push({
      label: `${row.Thickness} ${row.Size}`.trim(),
      size: row.Size,
      sizeMM: row.SizeMM,
      unit: "sqf",
      price: Number.parseFloat(row.SugTrade),
      packSize: {
        coveragePerSkid: Number.parseFloat(row.SqftSkid),
        piecesPerSkid: Number.parseFloat(row.PcsSkid),
        coveragePerPiece: Number.parseFloat(row.SqftPc),
      },
    });
  }

  return Array.from(grouped.values());
}

function buildLCopingProducts(): ProductOut[] {
  const rows = readTsv(join(rawDir, "porcea-lcopings.tsv"));
  const grouped = new Map<string, ProductOut>();

  for (const row of rows) {
    const collection = row.Collection.trim();
    const key = collection;

    if (!grouped.has(key)) {
      grouped.set(key, {
        slug: slugify(`porcea-${collection}-l-coping`),
        name: `Porcea ${collection} L-Coping`,
        categorySlug: "porcelain-tiles",
        subcategorySlug: "l-copings",
        colorName: collection,
        tone: inferTone(collection),
        images: [],
        variants: [],
      });
    }

    const product = grouped.get(key)!;
    product.variants.push({
      label: row.Size,
      size: row.Size,
      sizeMM: row.SizeMM,
      unit: "piece",
      price: Number.parseFloat(row.SugTradePerPc),
      packSize: { piecesPerSkid: Number.parseFloat(row.PcsSkid) },
    });
  }

  return Array.from(grouped.values());
}

function buildPedestalProducts(): ProductOut[] {
  const rows = readTsv(join(rawDir, "porcea-pedestals.tsv"));

  return rows.map((row) => ({
    slug: slugify(`porcea-${row.Name}`),
    name: row.Name.startsWith("Porcea") ? row.Name : `Porcea ${row.Name}`,
    categorySlug: "installation-systems",
    subcategorySlug: "pedestals",
    colorName: "",
    tone: "grey",
    images: [],
    variants: [
      {
        label: row.Spec || row.Name,
        unit: row.Name.includes("Adjustment Key") ? "piece" : "box",
        price: Number.parseFloat(row.SugTradePerUnit),
        packSize: { piecesPerBox: Number.parseFloat(row.PcsPerBox) },
      },
    ],
  }));
}

const ACCESSORY_SUBCATEGORY: Record<string, string> = {
  CleanSeal: "cleaners-sealers",
  "Stone Grid": "grid-systems",
  "Gravel Grid": "grid-systems",
};

function buildAccessoryProducts(): ProductOut[] {
  const rows = readTsv(join(rawDir, "stonearch-accessories.tsv"));
  const grouped = new Map<string, ProductOut>();

  for (const row of rows) {
    const colour = row.Colour.trim();
    const subcategory = ACCESSORY_SUBCATEGORY[colour] ?? "grid-systems";
    const price = Number.parseFloat(row.SugTrade);
    if (!Number.isFinite(price)) continue;

    if (!grouped.has(colour)) {
      grouped.set(colour, {
        slug: slugify(colour),
        name: colour,
        categorySlug: "accessories",
        subcategorySlug: subcategory,
        colorName: "",
        tone: "grey",
        images: [],
        variants: [],
      });
    }

    const product = grouped.get(colour)!;
    const size = lastDescriptionSegment(row.Description);

    product.variants.push({
      label: size,
      unit: row.Unit.trim(),
      price,
      packSize:
        row.Unit.trim() === "box" && Number.isFinite(Number.parseInt(row.Packaging, 10))
          ? { piecesPerBox: Number.parseInt(row.Packaging, 10) }
          : undefined,
    });
  }

  return Array.from(grouped.values());
}

const INSTALLATION_EXTRA_SUBCATEGORY: Record<string, string> = {
  Grid: "grid-system",
  Clips: "edge-clips",
};

function buildInstallationExtraProducts(): ProductOut[] {
  const rows = readTsv(join(rawDir, "porcea-installation-extra.tsv"));

  return rows.map((row) => ({
    slug: slugify(`porcea-${row.Name}`),
    name: row.Name.startsWith("Porcea") ? row.Name : `Porcea ${row.Name}`,
    categorySlug: "installation-systems",
    subcategorySlug: INSTALLATION_EXTRA_SUBCATEGORY[row.Group.trim()] ?? "grid-system",
    colorName: "",
    tone: "grey",
    images: [],
    variants: [
      {
        label: row.Spec || row.Name,
        unit: row.Unit.trim(),
        price: Number.parseFloat(row.SugTradePerUnit),
        packSize: { piecesPerBox: Number.parseFloat(row.PcsPerBox) },
      },
    ],
  }));
}

const allProducts = [
  ...buildPorcelainTileProducts(),
  ...buildLCopingProducts(),
  ...buildPedestalProducts(),
  ...buildAccessoryProducts(),
  ...buildInstallationExtraProducts(),
];

function serializeVariant(variant: VariantOut): string {
  const packSizeStr = variant.packSize
    ? `{ ${Object.entries(variant.packSize)
        .filter(([, value]) => Number.isFinite(value))
        .map(([key, value]) => `${key}: ${value}`)
        .join(", ")} }`
    : "undefined";

  return `{ label: ${JSON.stringify(variant.label)}, ${
    variant.size ? `size: ${JSON.stringify(variant.size)}, ` : ""
  }${variant.sizeMM ? `sizeMM: ${JSON.stringify(variant.sizeMM)}, ` : ""}unit: ${JSON.stringify(
    variant.unit
  )}, price: ${variant.price}, packSize: ${packSizeStr} }`;
}

function serializeProduct(product: ProductOut): string {
  return `  {
    slug: ${JSON.stringify(product.slug)},
    name: ${JSON.stringify(product.name)},
    categorySlug: ${JSON.stringify(product.categorySlug)},
    subcategorySlug: ${JSON.stringify(product.subcategorySlug)},
    colorName: ${JSON.stringify(product.colorName)},
    tone: ${JSON.stringify(product.tone)},
    images: [],
    variants: [
${product.variants.map((variant) => `      ${serializeVariant(variant)},`).join("\n")}
    ],
  },`;
}

const fileContents = `import type { ProductTone, ProductUnit } from "../models/product.model.js";

export type ProductVariantSeed = {
  label: string;
  size?: string;
  sizeMM?: string;
  unit: ProductUnit;
  price: number;
  packSize?: {
    piecesPerSkid?: number;
    coveragePerSkid?: number;
    coveragePerPiece?: number;
    piecesPerBox?: number;
  };
};

export type ProductSeed = {
  slug: string;
  name: string;
  categorySlug: string;
  subcategorySlug: string;
  colorName: string;
  tone: ProductTone;
  images: string[];
  variants: ProductVariantSeed[];
};

// Generated by src/scripts/generate-catalog.ts from src/data/raw/*.tsv — do not hand-edit.
// Re-run \`npx tsx src/scripts/generate-catalog.ts\` after updating the raw price-list data.
export const productCatalogSeed: ProductSeed[] = [
${allProducts.map(serializeProduct).join("\n")}
];
`;

writeFileSync(outFile, fileContents);
console.log(`Generated ${allProducts.length} products to ${outFile}`);
