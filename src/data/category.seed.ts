export type CategorySeed = {
  name: string;
  slug: string;
  parentSlug: string | null;
  order: number;
};

export const categorySeed: CategorySeed[] = [
  { name: "Natural Stone", slug: "natural-stone", parentSlug: null, order: 1 },
  { name: "Porcelain Tiles", slug: "porcelain-tiles", parentSlug: null, order: 2 },
  { name: "Installation Systems", slug: "installation-systems", parentSlug: null, order: 3 },
  { name: "Accessories", slug: "accessories", parentSlug: null, order: 4 },

  { name: "Pavers", slug: "pavers", parentSlug: "natural-stone", order: 1 },
  { name: "Copings", slug: "copings", parentSlug: "natural-stone", order: 2 },
  { name: "Steps", slug: "steps", parentSlug: "natural-stone", order: 3 },
  { name: "Curbs", slug: "curbs", parentSlug: "natural-stone", order: 4 },
  { name: "Pier Caps", slug: "pier-caps", parentSlug: "natural-stone", order: 5 },
  { name: "Cobbles", slug: "cobbles", parentSlug: "natural-stone", order: 6 },
  { name: "Walling Stone", slug: "walling-stone", parentSlug: "natural-stone", order: 7 },
  { name: "BBQ Slabs", slug: "bbq-slabs", parentSlug: "natural-stone", order: 8 },
  { name: "Turf", slug: "turf", parentSlug: "natural-stone", order: 9 },
  { name: "Pebbles", slug: "pebbles", parentSlug: "natural-stone", order: 10 },
  { name: "Risers", slug: "risers", parentSlug: "natural-stone", order: 11 },
  { name: "Tiles", slug: "tiles", parentSlug: "natural-stone", order: 12 },
  { name: "Veneer", slug: "veneer", parentSlug: "natural-stone", order: 13 },

  {
    name: "Standard Pavers/Tiles",
    slug: "standard-pavers-tiles",
    parentSlug: "porcelain-tiles",
    order: 1,
  },
  { name: "L-Copings", slug: "l-copings", parentSlug: "porcelain-tiles", order: 2 },

  { name: "Pedestals", slug: "pedestals", parentSlug: "installation-systems", order: 1 },
  {
    name: "Paver Support Grid",
    slug: "grid-system",
    parentSlug: "installation-systems",
    order: 2,
  },
  { name: "Edge Clips", slug: "edge-clips", parentSlug: "installation-systems", order: 3 },

  {
    name: "Cleaners & Sealers",
    slug: "cleaners-sealers",
    parentSlug: "accessories",
    order: 1,
  },
  {
    name: "Stone & Gravel Grids",
    slug: "grid-systems",
    parentSlug: "accessories",
    order: 2,
  },
];
