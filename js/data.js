// Local product data. Replace with a database/API call later (see loadProducts in app.js).
// Add real photos by setting images: ["images/name-1.jpg", ...] on a product.
const SIZES = ["S", "M", "L", "XL"];
const CATEGORIES = {
  tees: "Essential tees",
  streetwear: "Elevated streetwear",
  signature: "Signature pieces",
  essentials: "Everyday essentials",
};
const C = {
  ink: ["Ink", "#171717"],
  sand: ["Sand", "#D9D2C7"],
  olive: ["Olive", "#5B5A43"],
  bone: ["Bone", "#EFEBE2"],
  clay: ["Clay", "#8A6F58"],
  slate: ["Slate", "#4A525A"],
  pink: ["Pink", "#E8D9D5"],
};
const c = (...k) => k.map((x) => ({ name: C[x][0], hex: C[x][1] }));
const PRODUCTS = [
  {
    id: "core-tee",
    name: "Core Heavyweight Tee",
    cat: "tees",
    price: 28000,
    colors: c("ink", "bone", "sand"),
    sizes: SIZES,
    date: "2026-09-20",
    pop: 98,
    desc: "A dense 240gsm cotton tee with a structured neck and a relaxed, boxy fit.",
    details: [
      "100% combed cotton",
      "Boxy fit, true to size",
      "Made to hold its shape wash after wash",
    ],

    images: [
      "images/core-heavyweight-tee-ink.png",
      "images/core-heavyweight-tee-bone.png",
      "images/core-heavyweight-tee-sand.png",
    ],
    care: "Machine wash cold, inside out. Dry flat. Warm iron.",
  },

  {
    id: "line-tee",
    name: "Line Pocket Tee",
    cat: "tees",
    price: 31000,
    colors: c("olive", "sand"),
    sizes: SIZES,
    date: "2026-08-02",
    pop: 71,
    desc: "A clean pocket tee in a soft, slightly textured jersey.",
    details: ["100% cotton jersey", "Regular fit", "Reinforced shoulder seam"],

    images: [
      "images/line-pocket-tee-olive.png",
      "images/line-pocket-tee-sand.png",
    ],

    care: "Machine wash cold. Do not tumble dry.",
  },
  {
    id: "drift-hoodie",
    name: "Drift Hoodie",
    cat: "streetwear",
    price: 68000,
    colors: c("bone", "slate", "pink"),
    sizes: SIZES,
    date: "2026-10-05",
    pop: 90,
    desc: "A brushed-back fleece hoodie with a deep hood and an oversized drop shoulder.",
    details: [
      "420gsm cotton fleece",
      "Oversized fit, size down for a closer cut",
      "Ribbed cuffs and hem",
    ],
 
    images: [
      "images/drift-hoodie-bone.png",
      "images/drift-hoodie-slate.png",
      "images/drift-hoodie-pink.png",
    ],
    care: "Machine wash cold with like colours. Dry flat.",
  },
  {
    id: "arc-crew",
    name: "Arc Crewneck",
    cat: "streetwear",
    price: 59000,
    sale: 47000,
    colors: c("clay", "ink"),
    sizes: SIZES,
    date: "2026-07-14",
    pop: 64,
    desc: "A mid-weight crewneck with a clean silhouette and tonal stitching.",
    details: ["Cotton-blend fleece", "Relaxed fit", "Tonal embroidery"],

    images: [
      "images/arc-crewneck-clay.png",
      "images/arc-crewneck-ink.png",
    ],

    care: "Machine wash cold. Dry flat.",
  },
  {
    id: "meridian-coat",
    name: "Meridian Overshirt Jacket",
    cat: "signature",
    price: 124000,
    colors: c("olive", "ink"),
    sizes: SIZES,
    date: "2026-10-12",
    pop: 86,
    desc: "A structured cotton-twill jacket cut long through the body, with a quiet horn-effect button.",
    details: [
      "Cotton twill, partially lined",
      "Regular fit",
      "Two chest pockets, two hand pockets",
    ],

    images: [
      "images/meridian-jacket-olive.png",
      "images/meridian-jacket-ink.png",
    ],

    care: "Dry clean recommended, or cold hand wash.",
  },
  {
    id: "noir-blazer",
    name: "Noir Unlined Blazer",
    cat: "signature",
    price: 148000,
    colors: c("ink", "slate"),
    sizes: SIZES,
    date: "2026-09-01",
    pop: 77,
    desc: "An unlined, soft-shouldered blazer that works over a tee or a shirt.",
    details: ["Wool-blend crepe", "Tailored, easy fit", "Interior pocket"],

    images: [
      "images/noir-unlined-blazer-ink.png",
      "images/noir-blazer-slate.png",
    ],

    care: "Dry clean only.",
    soldOut: true,
  },
  {
    id: "form-trouser",
    name: "Form Wide Trouser",
    cat: "essentials",
    price: 62000,
    colors: c("sand", "ink", "olive"),
    sizes: SIZES,
    date: "2026-08-25",
    pop: 82,
    desc: "A wide-leg trouser with a high rise and a clean drape.",
    details: [
      "Cotton-linen blend",
      "Wide leg, mid-weight",
      "Side pockets, back welt pocket",
    ],

    images: [
      "images/form-wide-trouser-sand.png",
      "images/form-wide-trouser-ink.png",
      "images/form-wide-trouser-olive.png",
    ],
    
    care: "Machine wash cold. Warm iron.",
  },
  {
    id: "base-short",
    name: "Base Everyday Short",
    cat: "essentials",
    price: 36000,
    colors: c("bone", "clay"),
    sizes: SIZES,
    date: "2026-06-30",
    pop: 55,
    desc: "A knee-length short in a crisp cotton poplin with an elastic back waist.",
    details: ["100% cotton poplin", "Relaxed fit", "Two side pockets"],

    images: [
      "images/base-everyday-short-bone.png",
      "images/base-everyday-short-clay.png",
    ],
    care: "Machine wash cold. Warm iron.",
  },
  {
    id: "still-tee",
    name: "Still Long Sleeve",
    cat: "tees",
    price: 34000,
    colors: c("ink", "bone"),
    sizes: SIZES,
    date: "2026-10-02",
    pop: 68,
    desc: "A long-sleeve tee with a close ribbed neck, made for layering.",
    details: ["100% cotton", "Regular fit", "Ribbed cuffs"],
    care: "Machine wash cold. Dry flat.",
  },
  {
    id: "pace-jogger",
    name: "Pace Tapered Jogger",
    cat: "streetwear",
    price: 54000,
    colors: c("slate", "ink"),
    sizes: SIZES,
    date: "2026-09-15",
    pop: 73,
    desc: "A tapered jogger in a smooth, heavy knit with a clean ankle.",
    details: ["Cotton-poly knit", "Tapered fit", "Zip pocket"],

    images: [
      "images/pace-tapered-jogger-slate.png",
      "images/pace-tapered-jogger-ink.png",
    ],
    
    care: "Machine wash cold. Do not bleach.",
  },
  {
    id: "ledger-trouser",
    name: "Ledger Pleated Trouser",
    cat: "signature",
    price: 78000,
    colors: c("clay", "ink"),
    sizes: SIZES,
    date: "2026-10-10",
    pop: 60,
    desc: "A double-pleated trouser with a tapered leg and a half-lined waistband.",
    details: [
      "Wool-blend suiting",
      "Tapered, relaxed fit",
      "Hook and zip closure",
    ],
    care: "Dry clean recommended.",
  },
  {
    id: "daily-tee",
    name: "Daily Crew Tee",
    cat: "essentials",
    price: 22000,
    colors: c("bone", "sand", "ink", "olive"),
    sizes: SIZES,
    date: "2026-05-10",
    pop: 95,
    desc: "The lighter, everyday tee. Soft, easy and made to be worn on repeat.",
    details: ["180gsm cotton", "Regular fit", "Tubular body, no side seams"],

    images: [
    "images/daily-crew-tee-bone.png",
    "images/daily-crew-tee-sand.png",
    "images/daily-crew-tee-ink.png",
    "images/daily-crew-tee-olive.png",
  ],
  care: "Machine wash cold. Tumble dry low.",
  },
];
const DISCOUNT_CODES = { AFLUX10: 0.1 }; // demo code: 10% off

PRODUCTS.find(p => p.id === "core-tee").colors[0].images = ["images/core-heavyweight-tee-ink.png"];
PRODUCTS.find(p => p.id === "core-tee").colors[1].images = ["images/core-heavyweight-tee-bone.png"];
PRODUCTS.find(p => p.id === "core-tee").colors[2].images = ["images/core-heavyweight-tee-sand.png"];

PRODUCTS.find(p => p.id === "meridian-coat").colors[0].images = ["images/meridian-jacket-olive.png"];
PRODUCTS.find(p => p.id === "meridian-coat").colors[1].images = ["images/meridian-jacket-ink.png"];