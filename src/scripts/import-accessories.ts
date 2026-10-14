import { connectDb, disconnectDb } from "../config/db.js";
import { Category } from "../models/category.model.js";
import { Product, type ProductUnit } from "../models/product.model.js";

// From the STONEarch workbook's "Accessories" sheet (the actual xlsx, not
// the Porcea screenshots, per instruction to use the CSV/xlsx source when
// the same products appear in both). Price = Sug.Trade throughout, SKU
// dropped (same convention as Natural Stone). Images left empty.

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type AccessoryProduct = {
  slug: string;
  name: string;
  subcategorySlug: "cleaners-sealers" | "grid-systems";
  variants: {
    kind: "accessory";
    label: string;
    unit: ProductUnit;
    price: number;
    packSize?: { piecesPerBox: number };
  }[];
};

const ACCESSORY_PRODUCTS: AccessoryProduct[] = [
  {
    slug: "cleanseal",
    name: "CleanSeal",
    subcategorySlug: "cleaners-sealers",
    variants: [
      {
        kind: "accessory",
        label: "2-in-1 Color Enhancer & Sealer - 1QT",
        unit: "box",
        price: 562.5,
        packSize: { piecesPerBox: 6 },
      },
      {
        kind: "accessory",
        label: "Rust & Haze Remover - 1QT",
        unit: "box",
        price: 150,
        packSize: { piecesPerBox: 6 },
      },
      {
        kind: "accessory",
        label: "Organic Stain Remover - 1QT",
        unit: "box",
        price: 212.5,
        packSize: { piecesPerBox: 6 },
      },
      {
        kind: "accessory",
        label: "All Surface Sealer - 1GAL",
        unit: "box",
        price: 350,
        packSize: { piecesPerBox: 4 },
      },
    ],
  },
  {
    slug: "stone-grid",
    name: "Stone Grid",
    subcategorySlug: "grid-systems",
    variants: [
      { kind: "accessory", label: "A: 40x20xH20 - PRO", unit: "piece", price: 200 },
      { kind: "accessory", label: "B: 40x20xH40 - PRO", unit: "piece", price: 281.25 },
      { kind: "accessory", label: "C: 40x10xH20 - PRO", unit: "piece", price: 175 },
      { kind: "accessory", label: "D: 40x10xH40 - PRO", unit: "piece", price: 237.5 },
    ],
  },
  {
    slug: "gravel-grid",
    name: "Gravel Grid",
    subcategorySlug: "grid-systems",
    variants: [
      {
        kind: "accessory",
        label: "120x80x3.2 cm (70 Sheet/pallet)",
        unit: "piece",
        price: 25,
      },
    ],
  },
];

async function main() {
  await connectDb();

  const accessoriesCategory = await Category.findOne({ slug: "accessories" });
  if (!accessoriesCategory) {
    throw new Error('Category "accessories" not found. Run seed:categories first.');
  }

  const subs = await Category.find({ parentId: accessoriesCategory.id }).select("slug");
  const subSlugToId = new Map(subs.map((s) => [s.slug, s.id]));

  const operations = ACCESSORY_PRODUCTS.map((product) => {
    const subcategoryId = subSlugToId.get(product.subcategorySlug);
    if (!subcategoryId) {
      throw new Error(`Accessories subcategory "${product.subcategorySlug}" not found.`);
    }

    return {
      updateOne: {
        filter: { slug: product.slug },
        update: {
          $set: {
            slug: product.slug,
            name: product.name,
            categoryId: accessoriesCategory.id,
            subcategoryId,
            colorName: "",
            tone: "grey",
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
    `Imported Accessories products: ${result.upsertedCount} created, ${result.modifiedCount} updated, ${result.matchedCount} matched`
  );
}

main()
  .catch((error) => {
    console.error("Failed to import Accessories products:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDb();
  });
