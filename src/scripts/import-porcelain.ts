import { connectDb, disconnectDb } from "../config/db.js";
import { Category } from "../models/category.model.js";
import { Product, type ProductTone, type ProductUnit } from "../models/product.model.js";

// Transcribed from the Porcea Dealer Price List screenshots (no CSV/xlsx
// available for this one). Price = Suggested Trade throughout, per the raw
// data on each table. Images are intentionally left empty (linked via
// Cloudinary separately).

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const LIGHT_KEYWORDS = [
  "white", "ivory", "seashell", "cream", "light", "greige", "aura", "almond",
  "coast", "amalfi", "silver", "tundra", "iceberg", "moongrey",
];
const DARK_KEYWORDS = [
  "black", "opal", "nero", "nickel", "rio black", "thundercloud", "carbon",
];

function inferTone(colorName: string): ProductTone {
  const lower = colorName.toLowerCase();
  if (DARK_KEYWORDS.some((keyword) => lower.includes(keyword))) return "dark";
  if (LIGHT_KEYWORDS.some((keyword) => lower.includes(keyword))) return "light";
  return "grey";
}

type TileVariantRow = {
  thickness: string;
  size: string;
  coveragePerSkid: number;
  piecesPerSkid: number;
  coveragePerPiece: number;
  weightKg: number;
  discountPercent?: number;
  price: number;
};

type TileCollection = {
  collection: string;
  rows: TileVariantRow[];
};

const DISC_2500 = 2500;

function t(
  thickness: string,
  size: string,
  coveragePerSkid: number,
  piecesPerSkid: number,
  coveragePerPiece: number,
  weightKg: number,
  price: number,
  hasDiscount: boolean
): TileVariantRow {
  return {
    thickness,
    size,
    coveragePerSkid,
    piecesPerSkid,
    coveragePerPiece,
    weightKg,
    price,
    discountPercent: hasDiscount ? 5 : undefined,
  };
}

const TILE_COLLECTIONS: TileCollection[] = [
  { collection: "Ice Grey", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1040, 5.25, true),
    t("2cm", "30x60 cm (12x24\")", 240, 120, 2, 1000, 5.75, true),
    t("2cm", "60x90 cm (24x36\")", 240, 40, 6, 1000, 5.25, true),
  ]},
  { collection: "Ice Grey-N", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1040, 5.45, false),
    t("2cm", "30x60 cm (12x24\")", 240, 120, 2, 1000, 6.45, false),
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.45, false),
  ]},
  { collection: "Imperial", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1040, 5.25, true),
    t("2cm", "30x60 cm (12x24\")", 240, 120, 2, 1000, 5.75, true),
    t("2cm", "60x90 cm (24x36\")", 240, 40, 6, 1000, 5.25, true),
  ]},
  { collection: "Slate Grey", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1040, 5.25, true),
    t("2cm", "30x60 cm (12x24\")", 240, 120, 2, 1000, 5.75, true),
    t("2cm", "60x90 cm (24x36\")", 240, 40, 6, 1000, 5.25, true),
  ]},
  { collection: "Gray Tusk", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1050, 5.45, false),
  ]},
  { collection: "Creek Light", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1050, 5.45, false),
    t("2cm", "40x80 cm (16x32\")", 192, 54, 3.56, 800, 5.95, false),
  ]},
  { collection: "Aura White", rows: [
    t("2cm", "60x60 cm (24x24\")", 240, 60, 4, 1000, 6.75, true),
    t("2cm", "60x120 cm (24x48\")", 280, 35, 8, 1150, 7.95, true),
    t("2cm", "120x120 cm (48x48\")", 320, 20, 16, 1354, 8.95, true),
  ]},
  { collection: "Black Opal", rows: [
    t("2cm", "60x60 cm (24x24\")", 240, 60, 4, 1000, 6.75, true),
  ]},
  { collection: "Seashell", rows: [
    t("2cm", "60x60 cm (24x24\")", 240, 60, 4, 1000, 6.75, true),
    t("3cm", "40x80 cm (16x32\")", 192, 54, 3.56, 1200, 9.85, false),
  ]},
  { collection: "Iceberg", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1050, 5.45, false),
  ]},
  { collection: "Tundra", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1050, 5.45, false),
    t("2cm", "60x120 cm (24x48\")", 256, 32, 8, 1050, 8.05, true),
  ]},
  { collection: "Gris", rows: [
    t("2cm", "45x90 cm (18x36\")", 243, 54, 4.5, 1000, 8.05, true),
  ]},
  { collection: "Thundercloud", rows: [
    t("2cm", "60x120 cm (24x48\")", 288, 36, 8, 1150, 7.75, true),
  ]},
  { collection: "Greige", rows: [
    t("2cm", "40x120 cm (16x48\")", 256, 48, 5.33, 1050, 6.95, true),
  ]},
  { collection: "Rio Black", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1050, 5.45, false),
    t("2cm", "40x120 cm (16x48\")", 256, 48, 5.33, 1050, 6.95, true),
  ]},
  { collection: "Light Timber", rows: [
    t("2cm", "40x120 cm (16x48\")", 256, 48, 5.33, 1050, 6.95, true),
  ]},
  { collection: "Birch Timber", rows: [
    t("2cm", "40x120 cm (16x48\")", 256, 48, 5.33, 1050, 6.95, true),
  ]},
  { collection: "Ash Timber", rows: [
    t("2cm", "40x120 cm (16x48\")", 256, 48, 5.33, 1050, 6.95, true),
  ]},
  { collection: "Amalfi", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
  ]},
  { collection: "Moongrey", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
  ]},
  { collection: "Coast", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
  ]},
  { collection: "Coast-N", rows: [
    t("2cm", "60x60 cm (24x24\")", 256, 64, 4, 1050, 5.45, false),
    t("2cm", "120x120 cm (48x48\")", 320, 20, 16, 1354, 8.95, true),
  ]},
  { collection: "Indus", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
  ]},
  { collection: "Indus White", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
  ]},
  { collection: "Algonquin", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
    t("2cm", "60x120 cm (24x48\")", 288, 36, 8, 1150, 7.75, true),
  ]},
  { collection: "Silver Valley", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 6.95, true),
  ]},
  { collection: "Eramosa", rows: [
    t("2cm", "30x60 cm (12x24\")", 240, 120, 2, 1000, 7.25, false),
    t("2cm", "60x60 cm (24x24\")", 240, 60, 4, 1000, 7.25, false),
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 7.25, true),
  ]},
  { collection: "Travertino", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 7.75, true),
  ]},
  { collection: "Cashmere", rows: [
    t("2cm", "60x120 cm (24x48\")", 288, 36, 8, 1150, 8.45, true),
  ]},
  { collection: "Crema Antico", rows: [
    t("2cm", "90x90 cm (36x36\")", 288, 32, 9, 1200, 7.75, true),
  ]},
  { collection: "Terrazzo", rows: [
    t("2cm", "60x120 cm (24x48\")", 288, 36, 8, 1150, 8.45, true),
  ]},
  { collection: "Casablanca", rows: [
    t("2cm", "60x90 cm (24x36\")", 288, 48, 6, 1200, 8.45, true),
    t("2cm", "60x120 cm (24x48\")", 288, 36, 8, 1150, 8.45, true),
  ]},
  { collection: "Silver", rows: [
    t("3cm", "40x80 cm (16x32\")", 192, 54, 3.56, 1200, 9.85, false),
  ]},
  { collection: "Nero", rows: [
    t("3cm", "40x80 cm (16x32\")", 192, 54, 3.56, 1200, 9.85, false),
  ]},
  { collection: "Almond", rows: [
    t("3cm", "40x80 cm (16x32\")", 192, 54, 3.56, 1200, 9.85, false),
  ]},
  { collection: "Almond-N", rows: [
    t("3cm", "40x80 cm (16x32\")", 185, 52, 3.56, 1180, 9.85, false),
  ]},
  { collection: "Nickel Black", rows: [
    t("3cm", "40x80 cm (16x32\")", 185, 52, 3.56, 1180, 9.85, false),
  ]},
];

type LCopingRow = { size: string; piecesPerSkid: number; weightKg: number; price: number };
type LCopingCollection = { collection: string; rows: LCopingRow[] };

function lc(size: string, piecesPerSkid: number, weightKg: number, price: number): LCopingRow {
  return { size, piecesPerSkid, weightKg, price };
}

const L_COPING_COLLECTIONS: LCopingCollection[] = [
  { collection: "Algonquin", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 140.0),
    lc("30x120xH5 cm (12x48x2\")", 30, 600, 175.0),
  ]},
  { collection: "Aura White", rows: [
    lc("30x60xH5 cm (12x24x2\")", 60, 600, 90.0),
    lc("30x120xH5 cm (12x48x2\")", 30, 600, 175.0),
  ]},
  { collection: "Black Opal", rows: [
    lc("30x60xH5 cm (12x24x2\")", 60, 600, 90.0),
  ]},
  { collection: "Coast", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 135.0),
  ]},
  { collection: "Casablanca", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 150.0),
    lc("30x120xH5 cm (12x48x2\")", 30, 600, 200.0),
  ]},
  { collection: "Cashmere", rows: [
    lc("30x120xH5 cm (12x48x2\")", 30, 600, 200.0),
  ]},
  { collection: "Eramosa", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 150.0),
  ]},
  { collection: "Greige", rows: [
    lc("34x120xH5 cm (14x48x2\")", 30, 650, 175.0),
  ]},
  { collection: "Indus", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 140.0),
  ]},
  { collection: "Indus White", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 140.0),
  ]},
  { collection: "Moongrey", rows: [
    lc("30x90xH5 cm (12x36x2\")", 40, 600, 135.0),
  ]},
  { collection: "Rio Black", rows: [
    lc("34x120xH5 cm (14x48x2\")", 30, 650, 175.0),
  ]},
];

type AccessoryItem = {
  name: string;
  spec: string;
  unit: ProductUnit;
  piecesPerBox?: number;
  price: number;
  subcategorySlug: "pedestals" | "edge-clips" | "grid-system";
};

const ACCESSORY_ITEMS: AccessoryItem[] = [
  { name: "Stone Fixed Plastic Spacers", spec: "Plastic 4mm Spacers", unit: "box", piecesPerBox: 100, price: 50.0, subcategorySlug: "pedestals" },
  { name: "Stone Low Height Pedestal", spec: "10-15mm (0.4-0.6\")", unit: "box", piecesPerBox: 100, price: 1.55, subcategorySlug: "pedestals" },
  { name: "Fixed Head & Adjustable Pedestal Style A", spec: "25-40mm (1-1.6\")", unit: "box", piecesPerBox: 20, price: 5.5, subcategorySlug: "pedestals" },
  { name: "Fixed Head & Adjustable Pedestal Style B", spec: "40-70mm (1.6-2.7\")", unit: "box", piecesPerBox: 20, price: 6.5, subcategorySlug: "pedestals" },
  { name: "Fixed Head & Adjustable Pedestal Style C", spec: "60-100mm (2.4-3.9\")", unit: "box", piecesPerBox: 20, price: 7.5, subcategorySlug: "pedestals" },
  { name: "Fixed Head & Adjustable Pedestal Style D", spec: "90-160mm (3.6-6.3\")", unit: "box", piecesPerBox: 20, price: 8.5, subcategorySlug: "pedestals" },
  { name: "Fixed Head & Adjustable Pedestal Style E", spec: "150-270mm (5.9-10.6\")", unit: "box", piecesPerBox: 20, price: 9.5, subcategorySlug: "pedestals" },
  { name: "Pedestal Extension", spec: "Fixed Ext: 165mm (6.5\")", unit: "box", piecesPerBox: 20, price: 7.5, subcategorySlug: "pedestals" },
  { name: "Self-Leveling & Telescopic Pedestal Style T-A", spec: "30-65mm (1.2-2.6\")", unit: "box", piecesPerBox: 25, price: 8.0, subcategorySlug: "pedestals" },
  { name: "Self-Leveling & Telescopic Pedestal Style T-B", spec: "65-155mm (2.6-6.1\")", unit: "box", piecesPerBox: 25, price: 9.5, subcategorySlug: "pedestals" },
  { name: "Self-Leveling & Telescopic Pedestal Style T-C", spec: "155-420mm (6.1-16.5\")", unit: "box", piecesPerBox: 12, price: 14.0, subcategorySlug: "pedestals" },
  { name: "Stone Pedestal Red Adjustment Key", spec: "Adjustment Key", unit: "piece", price: 150.0, subcategorySlug: "pedestals" },
  { name: "Stone Rubber Pedestal Shims 3mm", spec: "Diameter: 150mm, Th: 3mm", unit: "box", piecesPerBox: 250, price: 175.0, subcategorySlug: "pedestals" },
  { name: "Side Edge Clips", spec: "100 pcs/box", unit: "box", piecesPerBox: 100, price: 445.0, subcategorySlug: "edge-clips" },
  { name: "Upper Edge Clip", spec: "100 pcs/box", unit: "box", piecesPerBox: 100, price: 650.0, subcategorySlug: "edge-clips" },
  { name: "Lower Edge Clip", spec: "100 pcs/box", unit: "box", piecesPerBox: 100, price: 650.0, subcategorySlug: "edge-clips" },
  { name: "Stone Safety Grid", spec: "500x500x40mm", unit: "piece", price: 23.0, subcategorySlug: "grid-system" },
  { name: "Stone Safety Grid Spacers", spec: "Joint: 4mm, Th: 1.5mm - 100pcs/box", unit: "box", piecesPerBox: 100, price: 100.0, subcategorySlug: "grid-system" },
];

async function main() {
  await connectDb();

  const porcelainCategory = await Category.findOne({ slug: "porcelain-tiles" });
  const installationCategory = await Category.findOne({ slug: "installation-systems" });
  if (!porcelainCategory || !installationCategory) {
    throw new Error('Categories "porcelain-tiles" / "installation-systems" not found. Run seed:categories first.');
  }

  const porcelainSubs = await Category.find({ parentId: porcelainCategory.id }).select("slug");
  const installationSubs = await Category.find({ parentId: installationCategory.id }).select("slug");
  const porcelainSubSlugToId = new Map(porcelainSubs.map((s) => [s.slug, s.id]));
  const installationSubSlugToId = new Map(installationSubs.map((s) => [s.slug, s.id]));

  const standardTilesSubId = porcelainSubSlugToId.get("standard-pavers-tiles");
  const lCopingsSubId = porcelainSubSlugToId.get("l-copings");
  if (!standardTilesSubId || !lCopingsSubId) {
    throw new Error('Porcelain subcategories "standard-pavers-tiles" / "l-copings" not found.');
  }

  const operations: object[] = [];

  for (const { collection, rows } of TILE_COLLECTIONS) {
    const slug = slugify(`porcea-${collection}`);
    const variants = rows.map((row) => ({
      kind: "porcelain",
      label: `${row.thickness} ${row.size}`.trim(),
      size: row.size,
      thickness: row.thickness,
      unit: "sqf" as ProductUnit,
      price: row.price,
      packSize: {
        coveragePerSkid: row.coveragePerSkid,
        piecesPerSkid: row.piecesPerSkid,
        coveragePerPiece: row.coveragePerPiece,
        weightKg: row.weightKg,
      },
      discountPercent: row.discountPercent,
      discountThreshold: row.discountPercent ? DISC_2500 : undefined,
    }));

    operations.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: {
            slug,
            name: `Porcea ${collection}`,
            categoryId: porcelainCategory.id,
            subcategoryId: standardTilesSubId,
            colorName: collection,
            tone: inferTone(collection),
            images: [],
            isActive: true,
            variants,
          },
        },
        upsert: true,
      },
    });
  }

  for (const { collection, rows } of L_COPING_COLLECTIONS) {
    const slug = slugify(`porcea-${collection}-l-coping`);
    const variants = rows.map((row) => ({
      kind: "porcelain",
      label: row.size,
      size: row.size,
      unit: "piece" as ProductUnit,
      price: row.price,
      packSize: {
        piecesPerSkid: row.piecesPerSkid,
        weightKg: row.weightKg,
      },
    }));

    operations.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: {
            slug,
            name: `Porcea ${collection} L-Coping`,
            categoryId: porcelainCategory.id,
            subcategoryId: lCopingsSubId,
            colorName: collection,
            tone: inferTone(collection),
            images: [],
            isActive: true,
            variants,
          },
        },
        upsert: true,
      },
    });
  }

  for (const item of ACCESSORY_ITEMS) {
    const subcategoryId = installationSubSlugToId.get(item.subcategorySlug);
    if (!subcategoryId) {
      throw new Error(`Installation subcategory "${item.subcategorySlug}" not found.`);
    }

    const slug = slugify(item.name);
    const variant = {
      kind: "porcelain",
      label: item.spec,
      unit: item.unit,
      price: item.price,
      packSize: item.piecesPerBox ? { piecesPerBox: item.piecesPerBox } : undefined,
    };

    operations.push({
      updateOne: {
        filter: { slug },
        update: {
          $set: {
            slug,
            name: item.name,
            categoryId: installationCategory.id,
            subcategoryId,
            colorName: "",
            tone: "grey",
            images: [],
            isActive: true,
            variants: [variant],
          },
        },
        upsert: true,
      },
    });
  }

  const result = await Product.bulkWrite(operations as never[]);
  console.log(
    `Imported Porcelain/Installation products: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${result.matchedCount} matched`
  );
}

main()
  .catch((error) => {
    console.error("Failed to import Porcelain/Installation products:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
