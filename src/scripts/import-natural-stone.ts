import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb, disconnectDb } from "../config/db.js";
import { Category } from "../models/category.model.js";
import {
  Product,
  type NaturalStoneVariantDocument,
  type ProductUnit,
} from "../models/product.model.js";

// Reads src/data/raw/stonearch-price-list.tsv (converted from the STONEarch
// "Dealer+Suggested Trade" sheet — see scratch conversion notes) and
// upserts Natural Stone products directly into MongoDB.
//
// Grouping: one product per Colour + subcategory; each row becomes a variant.
// Images are intentionally left empty — linked separately via Cloudinary.

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawDir = join(__dirname, "../data/raw");

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

const NATURAL_STONE_TYPE_MAP: Record<string, { subcategory: string; label: string }> = {
  "Coping (Pool)": { subcategory: "copings", label: "Pool Coping" },
  "Coping (RF)": { subcategory: "copings", label: "Rock Face Coping" },
  "Coping (SC)": { subcategory: "copings", label: "Saw Cut Coping" },
  "Coping (RF - Reb.)": { subcategory: "copings", label: "Rebated Coping" },
  "Coping (Edge - RF)": { subcategory: "copings", label: "Edge Coping" },
  "Coping (Edge - SC)": { subcategory: "copings", label: "Edge Saw Cut Coping" },
  "Coping (Wall - RF)": { subcategory: "copings", label: "Wall Coping" },
  "Coping (Wall - SC)": { subcategory: "copings", label: "Wall Saw Cut Coping" },
  Curb: { subcategory: "curbs", label: "Curb" },
  "Jumbo Slab": { subcategory: "bbq-slabs", label: "BBQ Top" },
  "BBQ Tops": { subcategory: "bbq-slabs", label: "BBQ Top" },
  Step: { subcategory: "steps", label: "Step" },
  "Step (SC)": { subcategory: "steps", label: "Saw Cut Step" },
  "Pier Cap": { subcategory: "pier-caps", label: "Pier Cap" },
  Riser: { subcategory: "risers", label: "Riser" },
  Tile: { subcategory: "tiles", label: "Tile" },
  Walling: { subcategory: "walling-stone", label: "Walling" },
  "Walling Corner": { subcategory: "walling-stone", label: "Walling Corner" },
  "Walling Stone": { subcategory: "walling-stone", label: "Walling Stone" },
  Cobblestones: { subcategory: "cobbles", label: "Cobblestone" },
  "Cobble On Mat": { subcategory: "cobbles", label: "Cobble on Mat" },
  "Paver/Cobble": { subcategory: "cobbles", label: "Paver/Cobble" },
  Pebbles: { subcategory: "pebbles", label: "Pebbles" },
  Veneer: { subcategory: "veneer", label: "Veneer" },
};

const SUBCATEGORY_DISPLAY_NAME: Record<string, string> = {
  copings: "Coping",
  curbs: "Curb",
  "bbq-slabs": "BBQ Top",
  pavers: "Paver",
  steps: "Step",
  "pier-caps": "Pier Cap",
  risers: "Riser",
  tiles: "Tile",
  "walling-stone": "Walling Stone",
  cobbles: "Cobblestone",
  pebbles: "Pebbles",
  veneer: "Veneer",
};

function naturalStoneMapping(productType: string): { subcategory: string; label: string } {
  if (productType.startsWith("Paver")) {
    const thickness = productType.replace("Paver - ", "").trim();
    return { subcategory: "pavers", label: thickness ? `${thickness} Paver` : "Paver" };
  }

  return NATURAL_STONE_TYPE_MAP[productType] ?? { subcategory: "pavers", label: productType };
}

const FINISH_KEYWORDS = [
  "Flamed & Antique", "SandBlast", "Sandblast", "BushHammer", "Unpolished",
  "Calibrated", "Polished", "Tumbled", "Antique", "Flamed", "Natural", "BH",
];
const EDGE_KEYWORDS = [
  "Three Edges Rockface", "RockCut", "SawCut", "BullNose", "Rockface", "Straight",
];
// "Cal" (short for Calibrated) shows up as its own segment alongside a real
// finish/edge word (e.g. "PoolCoping:Cal:Natural:..."), not in place of one —
// skip it rather than let it get matched as the finish.
const IGNORED_SEGMENTS = new Set(["cal"]);

function parseFinishAndEdge(description: string): { finish?: string; edgeProfile?: string } {
  const segments = description.split(":").map((segment) => segment.trim());
  // Colour and size (first/last segments) never carry finish/edge info.
  const middle = segments.slice(1, -1).filter((segment) => !IGNORED_SEGMENTS.has(segment.toLowerCase()));

  let finish: string | undefined;
  let edgeProfile: string | undefined;

  for (const segment of middle) {
    if (!finish) {
      const match = FINISH_KEYWORDS.find((keyword) =>
        segment.toLowerCase().includes(keyword.toLowerCase())
      );
      if (match) finish = segment;
    }
    if (!edgeProfile) {
      const match = EDGE_KEYWORDS.find((keyword) =>
        segment.toLowerCase().includes(keyword.toLowerCase())
      );
      if (match) edgeProfile = segment;
    }
  }

  return { finish, edgeProfile };
}

function lastDescriptionSegment(description: string): string {
  const parts = description.split(":");
  return parts[parts.length - 1].trim();
}

type ProductOut = {
  slug: string;
  name: string;
  subcategorySlug: string;
  colorName: string;
  tone: "light" | "grey" | "dark";
  variants: NaturalStoneVariantDocument[];
};

function mapUnit(rawUnit: string): ProductUnit {
  const unit = rawUnit.trim();
  if (unit === "Lft") return "lft";
  if (unit === "ea") return "piece";
  if (unit === "ton") return "ton";
  return "sqf";
}

function buildProducts(): { products: ProductOut[]; unparsedFinish: string[]; unparsedEdge: string[] } {
  const rows = readTsv(join(rawDir, "stonearch-price-list.tsv"));
  const grouped = new Map<string, ProductOut>();
  const unparsedFinish: string[] = [];
  const unparsedEdge: string[] = [];

  for (const row of rows) {
    const colour = row.Colour.trim();
    const rawType = row.ProductType.trim();

    // "Artificial Turf" / accessory-style rows live on a different sheet
    // (turf, pebbles, true Accessories category) — handled separately.
    if (colour === "Artificial Turf") continue;

    const { subcategory, label } = naturalStoneMapping(rawType);
    const price = Number.parseFloat(row.SugTrade);
    if (!Number.isFinite(price)) continue;

    const key = `${colour}__${subcategory}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        slug: slugify(`${colour}-${subcategory}`),
        name: `${colour} ${SUBCATEGORY_DISPLAY_NAME[subcategory] ?? label}`,
        subcategorySlug: subcategory,
        colorName: colour,
        tone: inferTone(colour),
        variants: [],
      });
    }

    const product = grouped.get(key)!;
    const size = lastDescriptionSegment(row.Description);
    const { finish, edgeProfile } = parseFinishAndEdge(row.Description);
    if (!finish) unparsedFinish.push(row.Description);
    if (!edgeProfile) unparsedEdge.push(row.Description);

    const sqftPallet = Number.parseFloat(row.SqFtPallet);
    const pcsPallet = Number.parseFloat(row.PcsPallet);
    const palletWeightKg = Number.parseFloat(row.PalletWeightKg);

    const packSize =
      (Number.isFinite(sqftPallet) && sqftPallet > 0) ||
      (Number.isFinite(pcsPallet) && pcsPallet > 0) ||
      (Number.isFinite(palletWeightKg) && palletWeightKg > 0)
        ? {
            ...(Number.isFinite(sqftPallet) && sqftPallet > 0 ? { coveragePerSkid: sqftPallet } : {}),
            ...(Number.isFinite(pcsPallet) && pcsPallet > 0 ? { piecesPerSkid: pcsPallet } : {}),
            ...(Number.isFinite(palletWeightKg) && palletWeightKg > 0 ? { weightKg: palletWeightKg } : {}),
          }
        : undefined;

    product.variants.push({
      kind: "natural-stone",
      label: `${label} ${size}`.trim(),
      size,
      unit: mapUnit(row.Unit),
      price,
      packSize,
      finish,
      edgeProfile,
    });
  }

  return { products: Array.from(grouped.values()), unparsedFinish, unparsedEdge };
}

async function main() {
  const { products, unparsedFinish, unparsedEdge } = buildProducts();

  console.log(`Built ${products.length} Natural Stone products from ${products.reduce((sum, p) => sum + p.variants.length, 0)} variants.`);
  if (unparsedFinish.length) {
    console.log(`\n${unparsedFinish.length} variants had no recognized finish keyword, e.g.:`);
    [...new Set(unparsedFinish)].slice(0, 10).forEach((d) => console.log(`  - ${d}`));
  }
  if (unparsedEdge.length) {
    console.log(`\n${unparsedEdge.length} variants had no recognized edge-profile keyword, e.g.:`);
    [...new Set(unparsedEdge)].slice(0, 10).forEach((d) => console.log(`  - ${d}`));
  }

  await connectDb();

  const naturalStoneCategory = await Category.findOne({ slug: "natural-stone" });
  if (!naturalStoneCategory) {
    throw new Error('Category "natural-stone" not found. Run seed:categories first.');
  }

  const subcategories = await Category.find({ parentId: naturalStoneCategory.id }).select("slug");
  const subSlugToId = new Map(subcategories.map((sub) => [sub.slug, sub.id]));

  const operations = products.map((product) => {
    const subcategoryId = subSlugToId.get(product.subcategorySlug);
    if (!subcategoryId) {
      throw new Error(
        `Unknown Natural Stone subcategory "${product.subcategorySlug}" for product "${product.slug}". Run seed:categories first.`
      );
    }

    return {
      updateOne: {
        filter: { slug: product.slug },
        update: {
          $set: {
            slug: product.slug,
            name: product.name,
            categoryId: naturalStoneCategory.id,
            subcategoryId,
            colorName: product.colorName,
            tone: product.tone,
            images: [],
            isActive: true,
            variants: product.variants,
          },
        },
        upsert: true,
      },
    };
  });

  const result = await Product.bulkWrite(operations);
  console.log(
    `\nImported Natural Stone products: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${result.matchedCount} matched`
  );
}

main()
  .catch((error) => {
    console.error("Failed to import Natural Stone products:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
