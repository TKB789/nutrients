import React, { useEffect, useMemo, useRef, useState } from "react";

/* ------------------------------------------------------------------ */
/*  Reference intake logic — based on U.S. Dietary Reference Intakes  */
/* ------------------------------------------------------------------ */

const ACTIVITY = {
  sedentary: { label: "Sedentary", factor: 1.2 },
  light: { label: "Lightly active", factor: 1.375 },
  moderate: { label: "Moderately active", factor: 1.55 },
  very: { label: "Very active", factor: 1.725 },
};

function computeTargets(p) {
  const age = p.age ? Number(p.age) : null;
  const kg = p.weight ? (p.weightUnit === "lb" ? Number(p.weight) * 0.4536 : Number(p.weight)) : null;
  const cm = p.height ? (p.heightUnit === "in" ? Number(p.height) * 2.54 : Number(p.height)) : null;
  const sex = p.sex;

  let kcal = 2000;
  let kcalBasis = "general 2,000 kcal reference";
  if (kg && cm && age && (sex === "male" || sex === "female")) {
    const bmr = 10 * kg + 6.25 * cm - 5 * age + (sex === "male" ? 5 : -161);
    kcal = Math.round(bmr * ACTIVITY[p.activity].factor);
    kcalBasis = "Mifflin–St Jeor × activity factor";
  }

  const protein = kg ? Math.round(kg * 0.8) : 50;
  const fiber = Math.round((kcal / 1000) * 14);
  const female = sex === "female";
  const iron = female && age && age >= 19 && age <= 50 ? 18 : 8;
  const calcium = (female && age && age >= 51) || (age && age >= 71) ? 1200 : 1000;
  const potassium = female ? 2600 : sex === "male" ? 3400 : 3000;
  const vitC = female ? 75 : sex === "male" ? 90 : 82;
  const vitD = age && age >= 70 ? 20 : 15;

  return { kcal, kcalBasis, protein, fiber, iron, calcium, potassium, vitC, vitD, sodiumLimit: 2300 };
}

/* ------------------------------------------------------------------ */
/*  Built-in quick list (per serving, approximate — USDA-derived)     */
/* ------------------------------------------------------------------ */

const FOODS = [
  ["Oatmeal, cooked", "1 cup", 166, 6, 28, 3.6, 4, 21, 2.1, 164, 9, 0, 0],
  ["Egg, large", "1 egg", 72, 6.3, 0.4, 4.8, 0, 28, 0.9, 69, 71, 0, 1.1],
  ["Whole-wheat bread", "1 slice", 81, 4, 14, 1.1, 1.9, 52, 0.9, 81, 146, 0, 0],
  ["White bread", "1 slice", 75, 2.6, 14, 1, 0.8, 73, 1, 33, 147, 0, 0],
  ["Banana", "1 medium", 105, 1.3, 27, 0.4, 3.1, 6, 0.3, 422, 1, 10, 0],
  ["Apple", "1 medium", 95, 0.5, 25, 0.3, 4.4, 11, 0.2, 195, 2, 8, 0],
  ["Orange", "1 medium", 62, 1.2, 15, 0.2, 3.1, 52, 0.1, 237, 0, 70, 0],
  ["Milk, 2%", "1 cup", 122, 8, 12, 4.8, 0, 293, 0.1, 342, 95, 0, 2.9],
  ["Greek yogurt, plain", "1 cup", 146, 20, 8, 3.8, 0, 230, 0.1, 282, 68, 0, 0],
  ["Cheddar cheese", "1 oz", 114, 6.4, 0.9, 9.4, 0, 201, 0.1, 21, 180, 0, 0.2],
  ["Chicken breast, cooked", "3 oz", 140, 26, 0, 3, 0, 13, 0.9, 220, 63, 0, 0.1],
  ["Salmon, cooked", "3 oz", 175, 19, 0, 10.5, 0, 13, 0.3, 326, 52, 0, 11.1],
  ["Ground beef 90%, cooked", "3 oz", 184, 22, 0, 10, 0, 15, 2.4, 305, 66, 0, 0.1],
  ["Tofu, firm", "1/2 cup", 98, 11, 2.4, 5.3, 1.5, 253, 2, 150, 9, 0, 0],
  ["Black beans, cooked", "1/2 cup", 114, 7.6, 20, 0.5, 7.5, 23, 1.8, 305, 1, 0, 0],
  ["Lentils, cooked", "1/2 cup", 115, 9, 20, 0.4, 7.8, 19, 3.3, 365, 2, 1.5, 0],
  ["Brown rice, cooked", "1 cup", 218, 4.5, 46, 1.6, 3.5, 20, 0.8, 154, 2, 0, 0],
  ["White rice, cooked", "1 cup", 205, 4.3, 45, 0.4, 0.6, 16, 1.9, 55, 2, 0, 0],
  ["Pasta, cooked", "1 cup", 221, 8, 43, 1.3, 2.5, 10, 1.8, 63, 1, 0, 0],
  ["Broccoli, cooked", "1 cup", 55, 3.7, 11, 0.6, 5.1, 62, 1, 457, 64, 101, 0],
  ["Spinach, raw", "2 cups", 14, 1.7, 2.2, 0.2, 1.3, 60, 1.6, 334, 47, 17, 0],
  ["Carrot", "1 medium", 25, 0.6, 6, 0.1, 1.7, 20, 0.2, 195, 42, 4, 0],
  ["Sweet potato, baked", "1 medium", 103, 2.3, 24, 0.2, 3.8, 43, 0.8, 542, 41, 22, 0],
  ["Potato, baked w/ skin", "1 medium", 161, 4.3, 37, 0.2, 3.8, 26, 1.9, 926, 17, 17, 0],
  ["Avocado", "1/2 fruit", 161, 2, 8.5, 14.7, 6.7, 12, 0.6, 487, 7, 10, 0],
  ["Almonds", "1 oz (23 nuts)", 164, 6, 6.1, 14.2, 3.5, 76, 1.1, 208, 0, 0, 0],
  ["Peanut butter", "2 tbsp", 188, 8, 6.3, 16.1, 1.9, 17, 0.6, 208, 152, 0, 0],
  ["Olive oil", "1 tbsp", 119, 0, 0, 13.5, 0, 0, 0.1, 0, 0, 0, 0],
  ["Orange juice", "1 cup", 112, 1.7, 26, 0.5, 0.5, 27, 0.5, 496, 2, 124, 0],
  ["Tomato", "1 medium", 22, 1.1, 4.8, 0.2, 1.5, 12, 0.3, 292, 6, 17, 0],
  ["Tuna, canned in water", "3 oz", 99, 22, 0, 0.7, 0, 9, 1.3, 201, 287, 0, 1.7],
  ["Mixed green salad", "2 cups", 18, 1.4, 3.4, 0.2, 1.8, 52, 1, 280, 20, 12, 0],
].map(([name, serving, ...n]) => ({
  name, serving,
  kcal: n[0], protein: n[1], carb: n[2], fat: n[3], fiber: n[4],
  calcium: n[5], iron: n[6], potassium: n[7], sodium: n[8], vitC: n[9], vitD: n[10],
}));

const ZERO = { kcal: 0, protein: 0, carb: 0, fat: 0, fiber: 0, calcium: 0, iron: 0, potassium: 0, sodium: 0, vitC: 0, vitD: 0 };
const KEYS = Object.keys(ZERO);

/* ------------------------------------------------------------------ */
/*  USDA FoodData Central integration (values per 100 g)              */
/* ------------------------------------------------------------------ */

// Site owner: replace with your own free key from https://api.data.gov/signup
// DEMO_KEY works but is rate-limited (~30 lookups/hour per visitor IP).
const USDA_API_KEY = "DEMO_KEY";

// The companion Citrus&Spice recipe site (the Recipes ↗ tab links here).
const RECIPE_SITE_URL = "https://tkb789.github.io/Recipes/";

// Approximate gram equivalents for household measures. Weight units are
// exact; volume units assume a typical density and are marked approximate.
const UNITS = {
  g: { grams: 1, label: "g" },
  oz: { grams: 28.35, label: "oz" },
  lb: { grams: 453.6, label: "lb" },
  tsp: { grams: 5, label: "tsp", approx: true },
  tbsp: { grams: 15, label: "tbsp", approx: true },
  cup: { grams: 240, label: "cup", approx: true },
  ml: { grams: 1, label: "ml", approx: true },
};

const FDC_NUTRIENTS = {
  1008: "kcal", 1003: "protein", 1005: "carb", 1004: "fat", 1079: "fiber",
  1087: "calcium", 1089: "iron", 1092: "potassium", 1093: "sodium",
  1162: "vitC", 1114: "vitD",
};

function fdcToFood(item) {
  const food = { ...ZERO, name: item.description, serving: "100 g", per100g: true };
  for (const n of item.foodNutrients || []) {
    const key = FDC_NUTRIENTS[n.nutrientId];
    if (key && typeof n.value === "number") food[key] = n.value;
  }
  if (item.brandOwner) food.name += ` — ${item.brandOwner}`;
  if (item.ingredients) food.ingredients = String(item.ingredients);
  return food;
}

async function searchFdc(query) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(USDA_API_KEY)}` +
    `&query=${encodeURIComponent(query)}&pageSize=8&dataType=Foundation,SR%20Legacy,Branded`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error("USDA rate limit reached — try again in a few minutes.");
  if (!res.ok) throw new Error(`USDA API error (${res.status}).`);
  const data = await res.json();
  return (data.foods || []).map(fdcToFood);
}

/* ------------------------------------------------------------------ */
/*  Barcode lookup — tries USDA Branded Foods (matches UPC/GTIN),     */
/*  then falls back to Open Food Facts (free, no key, wide coverage). */
/* ------------------------------------------------------------------ */

function offToFood(p) {
  const n = p.nutriments || {};
  const g = (k) => Number(n[k + "_100g"]) || 0; // OFF stores per-100g values in grams
  const brand = p.brands ? ` — ${p.brands.split(",")[0]}` : "";
  return {
    ...ZERO,
    name: (p.product_name || "Unnamed product") + brand,
    serving: "100 g", per100g: true,
    kcal: Number(n["energy-kcal_100g"]) || 0,
    protein: g("proteins"), carb: g("carbohydrates"), fat: g("fat"), fiber: g("fiber"),
    calcium: g("calcium") * 1000, iron: g("iron") * 1000,
    potassium: g("potassium") * 1000, sodium: g("sodium") * 1000,
    vitC: g("vitamin-c") * 1000, vitD: g("vitamin-d") * 1e6,
    ingredients: p.ingredients_text ? String(p.ingredients_text) : undefined,
  };
}

async function lookupBarcode(code) {
  try {
    const foods = await searchFdc(code);
    if (foods.length > 0) return foods[0];
  } catch (e) { /* fall through to Open Food Facts */ }
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
  if (!res.ok) throw new Error("Barcode lookup failed.");
  const data = await res.json();
  if (data.status !== 1 || !data.product) throw new Error("Barcode not found in USDA or Open Food Facts.");
  return offToFood(data.product);
}

/* ------------------------------------------------------------------ */
/*  Nutrient reference — importance, deficiency signs, food sources   */
/* ------------------------------------------------------------------ */

const LABELS = {
  kcal: "Energy", protein: "Protein", carb: "Carbohydrate", fat: "Fat", fiber: "Dietary fiber", calcium: "Calcium",
  iron: "Iron", potassium: "Potassium", vitC: "Vitamin C", vitD: "Vitamin D", sodium: "Sodium",
};

const TRACKED = ["protein", "fiber", "calcium", "iron", "potassium", "vitC", "vitD"];

const NUTRIENT_INFO = [
  {
    key: "protein",
    role: "Builds and repairs muscle and tissue, forms enzymes and hormones, and supports immune function. Needs rise with activity, illness, and age.",
    deficiency: "Muscle loss, slow wound healing, frequent infections, brittle hair and nails, swelling (edema) in severe cases.",
    sources: "Poultry, fish, eggs, dairy, Greek yogurt, tofu, lentils, beans, and nuts.",
  },
  {
    key: "carb",
    role: "The body's primary fuel, especially for the brain and for muscles during exercise. Quality matters as much as quantity — whole grains, fruit, and legumes digest slowly, while refined starches and sugars spike blood sugar.",
    deficiency: "Very low intake causes low energy, poor exercise performance, irritability, and constipation when fiber drops with it. Chronically high refined-carb intake is the more common problem.",
    sources: "Whole grains (oats, brown rice, whole-wheat bread), fruit, starchy vegetables, beans, lentils, and dairy.",
  },
  {
    key: "fat",
    role: "Required for hormone production, absorbing vitamins A, D, E, and K, building cell membranes, and satiety. Unsaturated fats should make up most of it.",
    deficiency: "Dry skin and hair, constant hunger, poor absorption of fat-soluble vitamins, and disrupted hormones with prolonged very-low-fat eating.",
    sources: "Olive oil, avocado, nuts, seeds, and fatty fish. Keep saturated fat (butter, fatty meat, cream) to a modest share.",
  },
  {
    key: "fiber",
    role: "Supports digestion and regularity, feeds beneficial gut bacteria, helps manage blood cholesterol and blood sugar, and promotes fullness.",
    deficiency: "Constipation, blood-sugar swings, elevated LDL cholesterol over time, feeling hungry soon after meals.",
    sources: "Whole grains (oats, brown rice, whole-wheat bread), beans, lentils, fruits with skin, and vegetables.",
  },
  {
    key: "calcium",
    role: "The structural mineral of bone and teeth; also required for muscle contraction, nerve signaling, and blood clotting.",
    deficiency: "Few short-term symptoms — the body pulls calcium from bone, so chronic shortfall leads to low bone density and fracture risk. Severe deficiency can cause muscle cramps and numbness.",
    sources: "Milk, yogurt, cheese, fortified plant milks, calcium-set tofu, canned salmon or sardines with bones, and leafy greens.",
  },
  {
    key: "iron",
    role: "Carries oxygen in red blood cells (hemoglobin) and supports energy metabolism. Needs are higher for menstruating women.",
    deficiency: "Fatigue, weakness, pale skin, shortness of breath on exertion, cold hands and feet, brittle nails, poor concentration.",
    sources: "Red meat, poultry, tuna, lentils, beans, tofu, and spinach. Pair plant sources with vitamin C (citrus, peppers) to boost absorption.",
  },
  {
    key: "potassium",
    role: "Balances fluids, counteracts sodium's effect on blood pressure, and drives muscle and nerve function. Most adults fall short.",
    deficiency: "Muscle weakness and cramps, fatigue, constipation, and higher blood pressure over time.",
    sources: "Potatoes and sweet potatoes, beans, bananas, avocado, orange juice, yogurt, and leafy greens.",
  },
  {
    key: "vitC",
    role: "Builds collagen for skin, blood vessels, and joints; acts as an antioxidant; and improves absorption of plant-based iron.",
    deficiency: "Slow wound healing, easy bruising, bleeding or swollen gums, fatigue, and rough dry skin.",
    sources: "Citrus fruit, bell peppers, broccoli, strawberries, kiwi, tomatoes, and potatoes.",
  },
  {
    key: "vitD",
    role: "Enables calcium absorption for bone health and supports immune and muscle function. Made in skin with sun exposure, but food and fortification matter, especially in winter.",
    deficiency: "Bone and muscle aches, muscle weakness, frequent illness, low mood; long-term shortfall softens bone.",
    sources: "Fatty fish (salmon, tuna, sardines), fortified milk and plant milks, fortified cereal, egg yolks, and mushrooms exposed to UV light.",
  },
  {
    key: "sodium",
    role: "Needed in small amounts for fluid balance and nerve function — but most people consume far more than the 2,300 mg daily limit, mostly from packaged and restaurant food.",
    deficiency: "Deficiency is rare. The common problem is excess: elevated blood pressure, fluid retention, and increased cardiovascular strain.",
    sources: "To reduce: cook at home, choose low-sodium versions, rinse canned beans, and flavor with herbs, citrus, and spices instead of salt.",
  },
];



/* ------------------------------------------------------------------ */
/*  Extended-nutrient research library                                */
/*  Presets: nutrients outside the USDA panel we map, with reference  */
/*  amounts from the NIH Dietary Reference Intakes (RDA/AI), AHA/EFSA */
/*  guidance for EPA+DHA, and the FDA limit for caffeine. m/f values  */
/*  are adult male/female references.                                 */
/*  Food values: approximate content per 100 g, USDA/NIH-derived,     */
/*  matched by name keyword so searched & scanned foods auto-credit.  */
/* ------------------------------------------------------------------ */

const PRESET_NUTRIENTS = [
  { key: "omega3", name: "Omega-3 (EPA+DHA)", unit: "g", m: 0.5, f: 0.5, src: "AHA/EFSA ~0.25–0.5 g" },
  { key: "magnesium", name: "Magnesium", unit: "mg", m: 420, f: 320, src: "NIH RDA" },
  { key: "zinc", name: "Zinc", unit: "mg", m: 11, f: 8, src: "NIH RDA" },
  { key: "b12", name: "Vitamin B12", unit: "mcg", m: 2.4, f: 2.4, src: "NIH RDA" },
  { key: "folate", name: "Folate", unit: "mcg DFE", m: 400, f: 400, src: "NIH RDA" },
  { key: "vitE", name: "Vitamin E", unit: "mg", m: 15, f: 15, src: "NIH RDA" },
  { key: "vitK", name: "Vitamin K", unit: "mcg", m: 120, f: 90, src: "NIH AI" },
  { key: "vitA", name: "Vitamin A", unit: "mcg RAE", m: 900, f: 700, src: "NIH RDA" },
  { key: "selenium", name: "Selenium", unit: "mcg", m: 55, f: 55, src: "NIH RDA" },
  { key: "choline", name: "Choline", unit: "mg", m: 550, f: 425, src: "NIH AI" },
  { key: "water", name: "Water", unit: "L", m: 3.7, f: 2.7, src: "NIH AI, total fluids" },
  { key: "caffeine", name: "Caffeine", unit: "mg", m: 400, f: 400, limit: true, src: "FDA daily limit" },
];

const NUTRIENT_LIBRARY = {
  omega3: [["salmon", 2.1], ["sardine", 1.5], ["mackerel", 1.8], ["herring", 2.0], ["anchov", 2.0], ["trout", 0.9], ["albacore", 0.86], ["tuna", 0.3], ["oyster", 0.6], ["mussel", 0.7], ["shrimp", 0.27], ["sea bass", 0.8], ["cod", 0.2]],
  magnesium: [["pumpkin seed", 592], ["chia", 335], ["cashew", 292], ["almond", 270], ["dark chocolate", 228], ["peanut", 168], ["spinach", 79], ["black bean", 70], ["edamame", 64], ["quinoa", 64], ["tofu", 53], ["brown rice", 43], ["lentil", 36], ["avocado", 29], ["banana", 27]],
  zinc: [["oyster", 39], ["pumpkin seed", 7.8], ["crab", 6.5], ["beef", 6.3], ["cashew", 5.8], ["cheddar", 3.1], ["pork", 2.9], ["chickpea", 1.5], ["lentil", 1.3]],
  b12: [["clam", 99], ["sardine", 8.9], ["trout", 4.5], ["salmon", 3.2], ["beef", 2.6], ["tuna", 2.5], ["egg", 1.1], ["cheddar", 1.1], ["yogurt", 0.6], ["milk", 0.5]],
  folate: [["edamame", 311], ["spinach", 194], ["lentil", 181], ["chickpea", 172], ["black bean", 149], ["asparagus", 149], ["beet", 109], ["broccoli", 108], ["avocado", 81], ["orange", 30]],
  vitE: [["sunflower seed", 35], ["almond", 25.6], ["hazelnut", 15], ["olive oil", 14.4], ["peanut", 9.1], ["avocado", 2.1], ["spinach", 2.0]],
  vitK: [["parsley", 1640], ["spinach", 483], ["collard", 407], ["kale", 390], ["broccoli", 141], ["brussels", 140], ["romaine", 102], ["kiwi", 40]],
  vitA: [["beef liver", 9440], ["sweet potato", 961], ["carrot", 835], ["spinach", 469], ["kale", 241], ["cantaloupe", 169], ["red pepper", 157], ["egg", 160]],
  selenium: [["brazil nut", 1917], ["tuna", 90], ["sunflower seed", 53], ["sardine", 52], ["shrimp", 49], ["salmon", 41], ["egg", 30], ["chicken", 27], ["beef", 26], ["brown rice", 10]],
  choline: [["beef liver", 418], ["egg", 294], ["salmon", 91], ["beef", 85], ["cod", 84], ["chicken", 79], ["peanut", 63], ["brussels", 63], ["broccoli", 40], ["tofu", 27], ["milk", 17]],
  caffeine: [["espresso", 212], ["coffee", 40], ["energy drink", 32], ["black tea", 20], ["green tea", 12], ["dark chocolate", 80], ["cola", 8]],
};

// Approximate gram weights of the built-in quick list's servings, so
// per-100 g library values can be scaled for those items too.
const SERVING_GRAMS = {
  "Oatmeal, cooked": 234, "Egg, large": 50, "Whole-wheat bread": 32, "White bread": 29,
  "Banana": 118, "Apple": 182, "Orange": 131, "Milk, 2%": 244, "Greek yogurt, plain": 245,
  "Cheddar cheese": 28, "Chicken breast, cooked": 85, "Salmon, cooked": 85,
  "Ground beef 90%, cooked": 85, "Tofu, firm": 126, "Black beans, cooked": 86,
  "Lentils, cooked": 99, "Brown rice, cooked": 195, "White rice, cooked": 186,
  "Pasta, cooked": 140, "Broccoli, cooked": 156, "Spinach, raw": 60, "Carrot": 61,
  "Sweet potato, baked": 114, "Potato, baked w/ skin": 173, "Avocado": 100,
  "Almonds": 28, "Peanut butter": 32, "Olive oil": 13.5, "Orange juice": 248,
  "Tomato": 123, "Tuna, canned in water": 85, "Mixed green salad": 72,
};

function libraryLookup(presetKey, foodName) {
  const list = NUTRIENT_LIBRARY[presetKey];
  if (!list) return null;
  const n = (foodName || "").toLowerCase();
  for (const [kw, val] of list) if (n.includes(kw)) return val;
  return null;
}

/* ------------------------------------------------------------------ */
/*  Bonus compounds — phytochemicals, antioxidants, and other extras  */
/*  that don't appear in the standard nutrient panel. Matched by      */
/*  food-name keywords; used to celebrate good picks.                 */
/* ------------------------------------------------------------------ */

const BONUS_FOODS = [
  { match: ["blueberr", "blackberr", "raspberr", "strawberr", "berr"], extra: "Anthocyanins", blurb: "antioxidant pigments studied for heart and brain health" },
  { match: ["spinach", "kale", "chard", "collard"], extra: "Lutein & zeaxanthin", blurb: "carotenoids that support eye health" },
  { match: ["tomato"], extra: "Lycopene", blurb: "an antioxidant carotenoid, more available when cooked" },
  { match: ["broccoli", "cauliflower", "brussels", "cabbage"], extra: "Sulforaphane", blurb: "a compound from cruciferous vegetables studied for cellular protection" },
  { match: ["salmon", "sardine", "mackerel", "trout", "tuna"], extra: "Omega-3s (EPA/DHA)", blurb: "fatty acids that support heart and brain function" },
  { match: ["walnut"], extra: "Omega-3 ALA & polyphenols", blurb: "plant omega-3s plus antioxidant compounds" },
  { match: ["almond", "hazelnut", "pistachio", "cashew", "pecan", "nut"], extra: "Vitamin E & polyphenols", blurb: "antioxidants concentrated in nuts" },
  { match: ["garlic"], extra: "Allicin", blurb: "the sulfur compound behind garlic's studied cardiovascular benefits" },
  { match: ["onion", "shallot", "leek"], extra: "Quercetin", blurb: "an anti-inflammatory flavonoid" },
  { match: ["sweet potato", "carrot", "pumpkin", "butternut"], extra: "Beta-carotene", blurb: "a vitamin A precursor and antioxidant" },
  { match: ["avocado"], extra: "Monounsaturated fat & lutein", blurb: "heart-friendly fats plus an eye-supporting carotenoid" },
  { match: ["oat"], extra: "Beta-glucan", blurb: "a soluble fiber shown to lower LDL cholesterol" },
  { match: ["bean", "lentil", "chickpea"], extra: "Polyphenols & resistant starch", blurb: "compounds that feed beneficial gut bacteria" },
  { match: ["olive oil", "olive"], extra: "Oleocanthal & polyphenols", blurb: "anti-inflammatory compounds in extra-virgin olive oil" },
  { match: ["orange", "grapefruit", "lemon", "lime", "citrus"], extra: "Flavonoids (hesperidin)", blurb: "citrus compounds studied for vascular health" },
  { match: ["grape"], extra: "Resveratrol", blurb: "a polyphenol concentrated in grape skins" },
  { match: ["dark chocolate", "cocoa", "cacao"], extra: "Cocoa flavanols", blurb: "compounds linked to blood-flow benefits" },
  { match: ["yogurt", "kefir", "kimchi", "sauerkraut", "miso", "tempeh"], extra: "Probiotics", blurb: "live cultures that support the gut microbiome" },
  { match: ["beet"], extra: "Nitrates & betalains", blurb: "compounds studied for blood pressure and exercise performance" },
  { match: ["pomegranate"], extra: "Punicalagins", blurb: "potent antioxidant polyphenols" },
  { match: ["egg"], extra: "Choline & lutein", blurb: "a brain-essential nutrient plus an eye-supporting carotenoid" },
  { match: ["mushroom"], extra: "Ergothioneine", blurb: "an amino-acid antioxidant unique to mushrooms" },
  { match: ["green tea", "matcha"], extra: "Catechins (EGCG)", blurb: "antioxidant compounds concentrated in green tea" },
  { match: ["turmeric"], extra: "Curcumin", blurb: "the anti-inflammatory compound in turmeric" },
  { match: ["tofu", "edamame", "soy"], extra: "Isoflavones", blurb: "soy compounds studied for heart and bone health" },
];

function detectBonuses(name) {
  const n = (name || "").toLowerCase();
  return BONUS_FOODS.filter(b => b.match.some(k => n.includes(k)));
}

/* ------------------------------------------------------------------ */
/*  Recipe recommendations                                            */
/* ------------------------------------------------------------------ */

const RECIPES = [
  { name: "Sheet-pan salmon with sweet potato & broccoli", meal: "Dinner",
    desc: "Roast salmon fillets, cubed sweet potato, and broccoli at 425°F with olive oil, lemon, and pepper (~25 min).",
    richIn: ["vitD", "potassium", "protein", "vitC", "fiber"] },
  { name: "Lentil & spinach stew with tomatoes", meal: "Lunch or dinner",
    desc: "Simmer lentils with canned tomatoes, onion, garlic, and cumin; stir in spinach at the end. Finish with lemon juice to aid iron absorption.",
    richIn: ["iron", "fiber", "potassium", "vitC", "protein"] },
  { name: "Greek yogurt bowl with berries & almonds", meal: "Breakfast or snack",
    desc: "Plain Greek yogurt topped with strawberries, sliced almonds, and a drizzle of honey.",
    richIn: ["calcium", "protein", "vitC"] },
  { name: "Tofu & broccoli stir-fry over brown rice", meal: "Dinner",
    desc: "Pan-sear calcium-set tofu, stir-fry with broccoli, bell pepper, garlic, and ginger; serve over brown rice with low-sodium soy sauce.",
    richIn: ["calcium", "vitC", "fiber", "iron", "protein"] },
  { name: "Citrus spinach salad with chickpeas", meal: "Lunch",
    desc: "Baby spinach, orange segments, chickpeas, and red onion with an olive-oil vinaigrette.",
    richIn: ["vitC", "iron", "fiber", "potassium"] },
  { name: "Black bean & avocado burrito bowl", meal: "Lunch or dinner",
    desc: "Black beans, brown rice, avocado, tomato salsa, and shredded lettuce; season with lime and cilantro.",
    richIn: ["fiber", "potassium", "iron", "protein"] },
  { name: "Fortified-milk oatmeal with banana", meal: "Breakfast",
    desc: "Oats cooked in vitamin-D-fortified milk, topped with sliced banana and a spoon of peanut butter.",
    richIn: ["calcium", "vitD", "potassium", "fiber"] },
  { name: "Veggie egg scramble with whole-grain toast", meal: "Breakfast",
    desc: "Eggs scrambled with tomato, spinach, and a little cheddar; serve with whole-wheat toast and orange slices.",
    richIn: ["vitD", "protein", "vitC", "calcium"] },
  { name: "Baked potato with turkey-bean chili", meal: "Dinner",
    desc: "A baked potato (skin on) loaded with a lean turkey and kidney-bean chili; top with plain yogurt instead of sour cream.",
    richIn: ["potassium", "fiber", "protein", "iron"] },
];

const SAMPLE_DAY = [RECIPES[6], RECIPES[4], RECIPES[0]]; // breakfast, lunch, dinner

/* ------------------------------------------------------------------ */
/*  Fitness assessment norms                                          */
/*  Push-ups adapted from ACSM/CSEP normative tables (men: standard;  */
/*  women: modified). Chair stand from CDC STEADI (ages 60+). Plank   */
/*  and sit-and-reach categories are general guidance — no single     */
/*  authoritative normative database exists for them.                 */
/* ------------------------------------------------------------------ */

const PUSHUP_NORMS = {
  male: { "20-29": [17, 22, 29, 36], "30-39": [12, 17, 22, 30], "40-49": [10, 13, 17, 25], "50-59": [7, 10, 13, 21], "60-69": [5, 8, 11, 18] },
  female: { "20-29": [10, 15, 21, 30], "30-39": [8, 13, 20, 27], "40-49": [5, 11, 15, 24], "50-59": [2, 7, 11, 21], "60-69": [2, 5, 12, 17] },
};

const CHAIR_STAND_MIN = { // CDC STEADI: "below average" if under this many stands in 30s
  male: { "60-64": 14, "65-69": 12, "70-74": 12, "75-79": 11, "80-84": 10, "85-89": 8, "90-94": 7 },
  female: { "60-64": 12, "65-69": 11, "70-74": 10, "75-79": 10, "80-84": 9, "85-89": 8, "90-94": 4 },
};

const RATING_NAMES = ["Needs improvement", "Fair", "Good", "Very good", "Excellent"];

function ageBand(age, bands) {
  for (const b of bands) {
    const [lo, hi] = b.split("-").map(Number);
    if (age >= lo && age <= hi) return b;
  }
  return null;
}

function ratePushups(age, sex, reps) {
  const table = PUSHUP_NORMS[sex];
  if (!table) return { rating: null, note: "Select male or female to use the ACSM reference table." };
  const band = ageBand(age, Object.keys(table));
  if (!band) return { rating: null, note: "Reference data covers ages 20–69." };
  const [fair, good, vgood, exc] = table[band];
  let i = 0;
  if (reps >= exc) i = 4; else if (reps >= vgood) i = 3; else if (reps >= good) i = 2; else if (reps >= fair) i = 1;
  return { rating: RATING_NAMES[i], band, thresholds: table[band] };
}

function ratePlank(sec) {
  if (sec >= 120) return "Excellent";
  if (sec >= 60) return "Good";
  if (sec >= 30) return "Average";
  if (sec >= 15) return "Below average";
  return "Needs improvement";
}

const REACH_OPTIONS = [
  { v: "knees", label: "Mid-shin or above", rating: "Needs improvement" },
  { v: "ankles", label: "Ankles", rating: "Fair" },
  { v: "toes", label: "Toes", rating: "Good" },
  { v: "past", label: "Past toes / palms flat", rating: "Excellent" },
];

/* ------------------------------------------------------------------ */
/*  History storage — persists via window.storage (Claude artifacts), */
/*  falls back to localStorage (deployed site), then in-memory.       */
/* ------------------------------------------------------------------ */

const memStore = {};
const HKEY = "nutrition-history-v1";
const RKEY = "nutrition-recipes-v1";
const PKEY = "nutrition-profile-v1";
const UKEY = "nutrition-users-v1";
const BKEY = "nutrition-barcodes-v1";
const CKEY = "nutrition-custom-nutrients-v1";

// Namespace stored data per person so several people can log on one device.
// "Me" is the default, unnamed profile. Keys must not contain whitespace.
function userKey(base, user) {
  return !user || user === "Me" ? base : `${base}:${user.replace(/[^\w-]/g, "_")}`;
}

async function loadStore(key) {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(key);
      if (r && r.value) return JSON.parse(r.value);
    }
  } catch (e) { /* key missing or unavailable */ }
  try {
    const v = window.localStorage && window.localStorage.getItem(key);
    if (v) return JSON.parse(v);
  } catch (e) { /* blocked */ }
  return memStore[key] || {};
}

async function saveStore(key, obj) {
  const json = JSON.stringify(obj);
  memStore[key] = obj;
  try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(key, json); return "cloud"; } } catch (e) {}
  try { window.localStorage.setItem(key, json); return "local"; } catch (e) {}
  return "memory";
}


/* ------------------------------------------------------------------ */
/*  Design tokens — matched to the Citrus&Spice recipe site           */
/* ------------------------------------------------------------------ */

const C = {
  ink: "#1c1814", navy: "#1c1814", rule: "#d9cfbe", paper: "#f5efe6",
  panel: "#fbf7f0", faint: "#8a7e6e", ok: "#6b7148", low: "#9a6a12",
  high: "#9d3f29", accent: "#c5573b",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; }
.na-root { font-family: 'Inter', system-ui, sans-serif; color: ${C.ink}; background: ${C.paper}; min-height: 100vh; }
.na-serif { font-family: 'Fraunces', Georgia, serif; letter-spacing: -0.01em; }
.na-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.na-eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: ${C.faint}; }
.na-input, .na-select { font: inherit; font-size: 14px; padding: 9px 12px; border: 1px solid ${C.rule}; border-radius: 10px; background: #fff; color: ${C.ink}; width: 100%; }
.na-input:focus, .na-select:focus, .na-btn:focus, .na-tab:focus, .na-acc:focus { outline: 2px solid ${C.accent}; outline-offset: 1px; }
.na-btn { font: inherit; font-size: 13px; font-weight: 500; padding: 10px 18px; cursor: pointer; border: 1px solid ${C.ink}; background: ${C.ink}; color: ${C.panel}; border-radius: 999px; }
.na-btn:hover { background: #4a4137; border-color: #4a4137; }
.na-btn-quiet { background: transparent; color: #4a4137; border-color: ${C.rule}; }
.na-btn-quiet:hover { background: #ece4d4; }
.na-panel { background: ${C.panel}; border: 1px solid ${C.rule}; border-radius: 14px; box-shadow: 0 1px 2px rgba(28,24,20,.06), 0 8px 24px rgba(28,24,20,.08); }
.na-tab { font: inherit; font-size: 14px; font-weight: 500; padding: 13px 12px; background: none; border: none; position: relative; color: ${C.faint}; cursor: pointer; white-space: nowrap; }
.na-tab[aria-selected="true"] { color: ${C.ink}; font-weight: 600; }
.na-tab[aria-selected="true"]::after { content: ''; position: absolute; bottom: -1px; left: 12px; right: 12px; height: 2px; background: ${C.accent}; }
.na-tab:hover { color: ${C.ink}; }
.na-acc { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 4px; background: none; border: none; cursor: pointer; font: inherit; font-size: 15px; font-weight: 600; color: ${C.ink}; text-align: left; }
@media (prefers-reduced-motion: reduce) { .na-bar-fill { transition: none !important; } }
`;

/* ------------------------------------------------------------------ */
/*  Shared components                                                 */
/* ------------------------------------------------------------------ */


/* ------------------------------------------------------------------ */
/*  Ingredient watchlist — flags based on regulatory actions and      */
/*  IARC/WHO/EFSA assessments, not internet folklore. Levels:         */
/*  avoid = banned/withdrawn somewhere major; caution = classified    */
/*  or restricted; note = informational (e.g. added-sugar aliases).   */
/* ------------------------------------------------------------------ */

const INGREDIENT_WATCHLIST = [
  { match: ["partially hydrogenated"], name: "Partially hydrogenated oil (artificial trans fat)", level: "avoid", why: "removed from the FDA safe list; strongly linked to heart disease" },
  { match: ["potassium bromate"], name: "Potassium bromate", level: "avoid", why: "possible carcinogen (IARC 2B); banned in the EU, UK, Canada, and elsewhere" },
  { match: ["brominated vegetable oil"], name: "Brominated vegetable oil (BVO)", level: "avoid", why: "FDA revoked its authorization in 2024 over thyroid concerns" },
  { match: ["red 3", "red no. 3", "red no 3", "erythrosine"], name: "Red dye No. 3", level: "avoid", why: "banned by the FDA in food (2025) after cancer findings in animal studies" },
  { match: ["sodium nitrite", "sodium nitrate", "potassium nitrite", "potassium nitrate"], name: "Curing nitrites/nitrates", level: "caution", why: "processed meat cured with these is classified carcinogenic to humans (IARC Group 1)" },
  { match: ["titanium dioxide"], name: "Titanium dioxide", level: "caution", why: "EFSA no longer considers it safe as a food additive; banned in the EU, still allowed in the US" },
  { match: ["butylated hydroxyanisole", "bha"], name: "BHA", level: "caution", why: "possible carcinogen (IARC 2B)" },
  { match: ["butylated hydroxytoluene", "bht"], name: "BHT", level: "note", why: "preservative with mixed evidence, often paired with BHA" },
  { match: ["propylparaben"], name: "Propylparaben", level: "caution", why: "endocrine-disruption concerns; banned in the EU and under California's 2023 food act" },
  { match: ["aspartame"], name: "Aspartame", level: "caution", why: "classified possibly carcinogenic (IARC 2B, 2023); WHO/JECFA kept the daily limit unchanged" },
  { match: ["red 40", "allura red"], name: "Red dye No. 40", level: "caution", why: "linked to hyperactivity in some children; carries a mandatory warning label in the EU" },
  { match: ["yellow 5", "tartrazine"], name: "Yellow dye No. 5", level: "caution", why: "linked to hyperactivity in some children; EU warning-label requirement" },
  { match: ["yellow 6", "sunset yellow"], name: "Yellow dye No. 6", level: "caution", why: "linked to hyperactivity in some children; EU warning-label requirement" },
  { match: ["high fructose corn syrup", "high-fructose corn syrup"], name: "High-fructose corn syrup", level: "note", why: "an added sugar; Dietary Guidelines cap added sugars at 10% of daily calories" },
  { match: ["corn syrup", "invert sugar", "dextrose", "maltose", "fruit juice concentrate", "cane sugar"], name: "Added-sugar ingredients", level: "note", why: "count toward the 10%-of-calories added-sugar limit" },
  { match: ["sodium benzoate"], name: "Sodium benzoate", level: "note", why: "can form traces of benzene alongside vitamin C; otherwise recognized as safe" },
  { match: ["sucralose", "acesulfame"], name: "Non-sugar sweeteners", level: "note", why: "WHO (2023) advises against relying on them for weight control; safe within daily limits" },
];


/* ------------------------------------------------------------------ */
/*  Gentler swaps — category-level alternatives shown alongside       */
/*  ingredient flags. Tone: inform, never guilt; acknowledge cost     */
/*  and access; moderation beats perfection.                          */
/* ------------------------------------------------------------------ */

const ALT_CURED_MEAT = {
  id: "cured",
  title: "Craving cured or dried meats?",
  text: "Traditional dry-cured options — Spanish jamón, Prosciutto di Parma (salt-and-time only by consortium rule), or salami from small producers — often use few or no curing additives; check the label. They can be pricier or harder to find, so if they're not practical where you live, portion size and frequency matter far more than perfection. Heads-up: US products labeled “uncured / no nitrites added” that use celery powder contain the same nitrites naturally.",
  searches: ["homemade beef jerky oven", "biltong recipe", "turkey jerky dehydrator recipe"],
  safety: "Homemade jerky & curing safety (USDA guidance): heat meat to 160°F (165°F for poultry) before or during drying, follow tested recipes, and measure curing salts exactly for any fermented or cured project. Toss it if it smells sour or off, feels slimy or sticky, or grows fuzzy mold. Critical: botulism has no smell, taste, or visible sign — never trust your senses with improperly cured or sealed products. When in doubt, throw it out.",
};

const ALT_TRANS_FAT = {
  id: "trans",
  title: "Trans-fat swap",
  text: "Partially hydrogenated oils are largely phased out; if a product still lists them, a butter- or olive-oil-based version of the same food is the straightforward swap.",
  searches: [],
};

const ALT_DYES = {
  id: "dyes",
  title: "Craving something colorful?",
  text: "Many brands sell naturally colored versions of the same candy or drink (beet, paprika, annatto, spirulina) — or fruit itself often scratches the itch. Same treat, different pigment.",
  searches: ["naturally colored candy brands", "homemade fruit gummies recipe"],
};

const ALT_SUGAR = {
  id: "sugar",
  title: "Sweet-drink and snack swaps",
  text: "Sparkling water with fruit, or simply a smaller portion of the real thing, keeps it enjoyable — the 10%-of-calories added-sugar guideline is a budget to spend, not a ban.",
  searches: ["homemade soda syrup recipe", "infused sparkling water ideas"],
};

const ALT_SWEETENERS = {
  id: "sweet",
  title: "If artificial sweeteners bother you",
  text: "A modest amount of regular sugar inside your added-sugar budget is a reasonable trade — neither option needs to be feared in sensible amounts.",
  searches: [],
};

const FLAG_ALTERNATIVES = {
  "Curing nitrites/nitrates": ALT_CURED_MEAT,
  "Partially hydrogenated oil (artificial trans fat)": ALT_TRANS_FAT,
  "Red dye No. 3": ALT_DYES,
  "Red dye No. 40": ALT_DYES,
  "Yellow dye No. 5": ALT_DYES,
  "Yellow dye No. 6": ALT_DYES,
  "High-fructose corn syrup": ALT_SUGAR,
  "Added-sugar ingredients": ALT_SUGAR,
  "Non-sugar sweeteners": ALT_SWEETENERS,
};

function analyzeIngredients(text) {
  if (!text) return [];
  const t = text.toLowerCase();
  const found = new Map();
  for (const w of INGREDIENT_WATCHLIST) {
    for (const kw of w.match) {
      const re = new RegExp("\\b" + kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "i");
      if (re.test(t)) { if (!found.has(w.name)) found.set(w.name, w); break; }
    }
  }
  return [...found.values()];
}

const FLAG_COLOR = { avoid: C.high, caution: C.low, note: C.faint };

function IngredientCheck({ text }) {
  const flags = analyzeIngredients(text);
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 10 }}>
      <div className="na-eyebrow" style={{ marginBottom: 6 }}>Ingredient check</div>
      {flags.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: C.ok, fontWeight: 600 }}>
          ✓ No watchlist ingredients found in this product's label.
        </p>
      ) : (
        <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
          {flags.map(f => (
            <li key={f.name} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
              <span aria-hidden style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: FLAG_COLOR[f.level], marginRight: 7 }} />
              <strong>{f.name}</strong> — {f.why}.
            </li>
          ))}
        </ul>
      )}
      {(() => {
        const seen = new Set();
        const alts = [];
        for (const f of flags) {
          const a = FLAG_ALTERNATIVES[f.name];
          if (a && !seen.has(a.id)) { seen.add(a.id); alts.push(a); }
        }
        if (alts.length === 0) return null;
        return (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.rule}` }}>
            <div className="na-eyebrow" style={{ marginBottom: 6, color: C.ok }}>Gentler swaps — no guilt required</div>
            {alts.map(a => (
              <div key={a.id} style={{ marginBottom: 10 }}>
                <p style={{ margin: "0 0 4px", fontSize: 12.5, lineHeight: 1.55 }}>
                  <strong>{a.title}</strong> {a.text}
                </p>
                {a.searches.length > 0 && (
                  <p style={{ margin: "0 0 4px", fontSize: 12, color: C.faint }}>
                    Make it yourself — recipe searches:{" "}
                    {a.searches.map((q, i) => (
                      <React.Fragment key={q}>
                        <a href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener"
                          style={{ color: C.accent, textDecoration: "none", borderBottom: `1px solid ${C.accent}` }}>
                          {q}
                        </a>{i < a.searches.length - 1 ? " · " : ""}
                      </React.Fragment>
                    ))}
                  </p>
                )}
                {a.safety && (
                  <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: "#7a5210", background: "#f7ecd6", border: `1px solid ${C.rule}`, borderRadius: 8, padding: "8px 10px" }}>
                    ⚠ {a.safety}
                  </p>
                )}
              </div>
            ))}
          </div>
        );
      })()}
      <p style={{ margin: "8px 0 0", fontSize: 10.5, color: C.faint, lineHeight: 1.5 }}>
        Flags reflect regulatory actions and IARC/WHO/EFSA assessments; dose and frequency
        matter, and occasional amounts differ from daily habits. Informational only, not
        medical advice.
      </p>
    </div>
  );
}

function Field({ label, children, note }) {
  return (
    <label style={{ display: "block" }}>
      <span className="na-eyebrow" style={{ display: "block", marginBottom: 5 }}>{label}</span>
      {children}
      {note && <span style={{ fontSize: 11, color: C.faint, display: "block", marginTop: 4 }}>{note}</span>}
    </label>
  );
}

function SectionHead({ num, title, sub }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 14, borderBottom: `2px solid ${C.navy}`, paddingBottom: 10, marginBottom: 18 }}>
      {num && <span className="na-mono" style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>{num}</span>}
      <div>
        <h2 className="na-serif" style={{ margin: 0, fontSize: 21, fontWeight: 700, color: C.navy }}>{title}</h2>
        {sub && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.faint }}>{sub}</p>}
      </div>
    </div>
  );
}

function Gauge({ label, value, target, unit, isLimit, dp = 0 }) {
  const pct = target > 0 ? (value / target) * 100 : 0;
  const width = Math.min(pct, 130);
  let status, color;
  if (isLimit) {
    if (pct <= 100) { status = "Within limit"; color = C.ok; }
    else { status = "Exceeds limit"; color = C.high; }
  } else if (pct < 80) { status = "Below target"; color = C.low; }
  else if (pct <= 120) { status = "Meets target"; color = C.ok; }
  else { status = "Above target"; color = C.faint; }

  return (
    <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.rule}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>{label}</span>
        <span className="na-mono" style={{ fontSize: 12.5, color: C.faint }}>
          {value.toFixed(dp)} / {target.toLocaleString()} {unit}
          <span style={{ color, fontWeight: 500, marginLeft: 10 }}>{status}</span>
        </span>
      </div>
      <div style={{ position: "relative", height: 10, background: "#ece4d4", borderRadius: 2 }}>
        <div className="na-bar-fill" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(width / 130) * 100}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
        <div style={{ position: "absolute", left: `${(100 / 130) * 100}%`, top: -3, bottom: -3, width: 2, background: C.navy }} />
      </div>
    </div>
  );
}


function MacroSummary({ totals, targets }) {
  const kcal = totals.kcal;
  const remaining = Math.round(targets.kcal - kcal);
  const pctE = (g, kcalPerG) => kcal > 0 ? ((g * kcalPerG) / kcal) * 100 : 0;
  const tiles = [
    { label: "Carbs", grams: totals.carb, p: pctE(totals.carb, 4), band: [45, 65],
      targetText: `${Math.round(targets.kcal * 0.45 / 4)}–${Math.round(targets.kcal * 0.65 / 4)} g` },
    { label: "Protein", grams: totals.protein, p: pctE(totals.protein, 4), band: [10, 35],
      targetText: `RDA ≥ ${targets.protein} g` },
    { label: "Fat", grams: totals.fat, p: pctE(totals.fat, 9), band: [20, 35],
      targetText: `${Math.round(targets.kcal * 0.20 / 9)}–${Math.round(targets.kcal * 0.35 / 9)} g` },
  ];
  return (
    <div style={{ background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 12, padding: "16px 18px", margin: "10px 0 8px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div className="na-eyebrow">Energy</div>
          <div className="na-mono" style={{ fontSize: 27, fontWeight: 500, lineHeight: 1.2 }}>
            {Math.round(kcal).toLocaleString()}
            <span style={{ fontSize: 14, color: C.faint }}> / {targets.kcal.toLocaleString()} kcal</span>
          </div>
        </div>
        <div className="na-mono" style={{ fontSize: 13, color: remaining >= 0 ? C.faint : C.high }}>
          {remaining >= 0 ? `${remaining.toLocaleString()} kcal remaining` : `${Math.abs(remaining).toLocaleString()} kcal over target`}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 16, marginTop: 16 }}>
        {tiles.map(t => {
          const inBand = t.p >= t.band[0] && t.p <= t.band[1];
          const color = kcal === 0 ? C.faint : inBand ? C.ok : C.low;
          return (
            <div key={t.label}>
              <div className="na-eyebrow">{t.label}</div>
              <div className="na-mono" style={{ fontSize: 21, fontWeight: 500 }}>{t.grams.toFixed(0)} g</div>
              <div style={{ position: "relative", height: 8, background: "#ece4d4", borderRadius: 4, margin: "7px 0 5px" }}>
                <div style={{ position: "absolute", left: `${t.band[0]}%`, width: `${t.band[1] - t.band[0]}%`, top: 0, bottom: 0, background: C.rule, borderRadius: 4 }} />
                <div style={{ position: "absolute", left: `calc(${Math.min(Math.max(t.p, 1), 99)}% - 2px)`, top: -2, bottom: -2, width: 4, background: color, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 11.5, color: C.faint, lineHeight: 1.5 }}>
                <span style={{ color, fontWeight: 600 }}>{t.p.toFixed(0)}% of energy</span> · band {t.band[0]}–{t.band[1]}% · {t.targetText}
              </div>
            </div>
          );
        })}
      </div>
      <p style={{ margin: "14px 0 0", fontSize: 11, color: C.faint, lineHeight: 1.5 }}>
        Shaded bands are the Acceptable Macronutrient Distribution Ranges (AMDR) from the
        Dietary Reference Intakes — the framework dietitians use to assess macro balance.
        The marker shows where today's intake falls.
      </p>
    </div>
  );
}

function RecipeCard({ recipe, deficits }) {
  const helps = deficits ? recipe.richIn.filter(k => deficits.includes(k)) : recipe.richIn;
  return (
    <div style={{ border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 3, padding: "14px 16px", background: "#fff" }}>
      <div className="na-eyebrow" style={{ color: C.accent, marginBottom: 4 }}>{recipe.meal}</div>
      <h3 className="na-serif" style={{ margin: "0 0 6px", fontSize: 16.5, fontWeight: 700 }}>
        <a href={`https://www.google.com/search?q=${encodeURIComponent(recipe.name + " recipe")}`}
          target="_blank" rel="noopener"
          style={{ color: "inherit", textDecoration: "none", borderBottom: `1.5px solid ${C.accent}` }}>
          {recipe.name} <span aria-hidden style={{ color: C.accent, fontSize: 13 }}>↗</span>
        </a>
      </h3>
      <p style={{ margin: "0 0 10px", fontSize: 13.5, lineHeight: 1.55, color: "#33414D" }}>{recipe.desc}</p>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {helps.map(k => (
          <span key={k} className="na-mono" style={{ fontSize: 11, padding: "3px 8px", background: "#EAF3F4", color: C.accent, borderRadius: 2, fontWeight: 500 }}>
            {LABELS[k]}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Barcode scanner — native BarcodeDetector where supported (Chrome, */
/*  Android), ZXing via CDN elsewhere (iOS Safari), manual entry as   */
/*  the universal fallback.                                           */
/* ------------------------------------------------------------------ */

function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const [camError, setCamError] = useState("");
  const [manual, setManual] = useState("");

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};
    (async () => {
      try {
        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({ formats: ["ean_13", "ean_8", "upc_a", "upc_e"] });
          const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
          if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
          stop = () => stream.getTracks().forEach(t => t.stop());
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          const tick = async () => {
            if (cancelled || !videoRef.current) return;
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) { onDetect(codes[0].rawValue); return; }
            } catch (e) { /* frame not ready */ }
            requestAnimationFrame(tick);
          };
          tick();
        } else {
          const zxing = await import(/* @vite-ignore */ "https://esm.run/@zxing/browser@0.1.5");
          if (cancelled) return;
          const reader = new zxing.BrowserMultiFormatReader();
          const controls = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
            if (result) onDetect(result.getText());
          });
          stop = () => controls.stop();
        }
      } catch (e) {
        setCamError("Camera unavailable in this browser or permission denied — type the barcode number instead.");
      }
    })();
    return () => { cancelled = true; stop(); };
  }, [onDetect]);

  return (
    <div style={{ marginTop: 16, padding: 14, background: C.paper, border: `1px dashed ${C.rule}`, borderRadius: 3 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="na-eyebrow">Scan a product barcode</span>
        <button className="na-btn na-btn-quiet" onClick={onClose} style={{ padding: "5px 10px" }}>Close</button>
      </div>
      {!camError ? (
        <video ref={videoRef} muted playsInline
          style={{ width: "100%", maxHeight: 260, background: "#000", borderRadius: 3, objectFit: "cover" }} />
      ) : (
        <p style={{ fontSize: 13, color: C.low, margin: "0 0 10px" }}>{camError}</p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 180px" }}>
          <Field label="Or enter barcode digits">
            <input className="na-input" inputMode="numeric" value={manual}
              onChange={e => setManual(e.target.value.replace(/\D/g, ""))} placeholder="e.g. 038000138416" />
          </Field>
        </div>
        <button className="na-btn" onClick={() => manual && onDetect(manual)} disabled={!manual}
          style={{ opacity: manual ? 1 : 0.45 }}>
          Look up
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recipe import — receives a recipe from the Citrus&Spice site,     */
/*  walks through matching each ingredient to a food, then saves it   */
/*  and logs the macros.                                              */
/* ------------------------------------------------------------------ */

const FRACTIONS = { "\u00bd": 0.5, "\u2153": 0.333, "\u2154": 0.667, "\u00bc": 0.25, "\u00be": 0.75, "\u215b": 0.125 };

function cleanIngredient(line) {
  return line.toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[\u00bd\u2153\u2154\u00bc\u00be\u215b]/g, " ")
    .replace(/\b\d+[\d/.\-]*\b/g, " ")
    .replace(/\b(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|kg|ml|l|liters?|pinch(es)?|dash(es)?|cloves?|cans?|slices?|pieces?|large|medium|small|fresh|chopped|minced|diced|sliced|ground|shredded|grated|of|to|taste|optional|and|or|about|plus|for|serving)\b/g, " ")
    .replace(/[,.;:*]/g, " ")
    .replace(/\s+/g, " ").trim();
}

function guessAmount(line) {
  const t = line.toLowerCase();
  const m = t.match(/(\d+\s+\d\/\d|\d+\/\d|\d+(?:\.\d+)?|[\u00bd\u2153\u2154\u00bc\u00be\u215b])\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|ounces?|oz|pounds?|lbs?|lb|grams?|g|ml)\b/);
  if (!m) return null;
  let n;
  if (FRACTIONS[m[1]]) n = FRACTIONS[m[1]];
  else if (m[1].includes("/")) {
    n = 0;
    for (const part of m[1].split(/\s+/)) {
      if (part.includes("/")) { const [a, b] = part.split("/"); n += Number(a) / Number(b); }
      else n += Number(part);
    }
  } else n = Number(m[1]);
  const map = { cup: "cup", cups: "cup", tablespoon: "tbsp", tablespoons: "tbsp", tbsp: "tbsp", teaspoon: "tsp", teaspoons: "tsp", tsp: "tsp", ounce: "oz", ounces: "oz", oz: "oz", pound: "lb", pounds: "lb", lbs: "lb", lb: "lb", gram: "g", grams: "g", g: "g", ml: "ml" };
  return { amt: Math.round(n * 100) / 100, unit: map[m[2]] || "g" };
}

function RecipeImport({ req, onCancel, onComplete }) {
  const lines = (req.ingredients || []).map(l => String(l).trim()).filter(Boolean);
  const [idx, setIdx] = useState(0);
  const [matched, setMatched] = useState([]);
  const [q, setQ] = useState(lines[0] ? cleanIngredient(lines[0]) : "");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const g0 = lines[0] ? guessAmount(lines[0]) : null;
  const [amt, setAmt] = useState(g0 ? g0.amt : 100);
  const [unit, setUnit] = useState(g0 ? g0.unit : "g");
  const [qty, setQty] = useState(1);
  const [servingsMade, setServingsMade] = useState(() => {
    const m = String(req.yield || "").match(/\d+/);
    return m ? Number(m[0]) : 4;
  });
  const [servingsEaten, setServingsEaten] = useState(1);

  const done = idx >= lines.length;
  const line = lines[idx];
  const localMatches = q ? FOODS.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : [];

  const advance = (entry) => {
    if (entry) setMatched(m => [...m, entry]);
    const ni = idx + 1;
    setIdx(ni);
    setSel(null); setResults([]); setErr("");
    if (ni < lines.length) {
      setQ(cleanIngredient(lines[ni]));
      const g = guessAmount(lines[ni]);
      setAmt(g ? g.amt : 100); setUnit(g ? g.unit : "g"); setQty(1);
    }
  };

  const confirm = () => {
    if (!sel) return;
    let mult, label;
    if (sel.per100g) {
      const u = UNITS[unit];
      const grams = (Number(amt) || 100) * u.grams;
      mult = grams / 100;
      label = unit === "g" ? `${Math.round(grams)} g` : `${amt} ${u.label} (~${Math.round(grams)} g)`;
    } else {
      mult = Number(qty) || 1;
      label = `${mult} × ${sel.serving}`;
    }
    advance({ line, food: sel, mult, label });
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(""); setResults([]); setSel(null);
    try {
      const foods = await searchFdc(q.trim());
      setResults(foods);
      if (foods.length === 0) setErr("No matches — reword the search or skip this line.");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const totals = useMemo(() => {
    const t = { ...ZERO };
    for (const m of matched) for (const k of KEYS) t[k] += (m.food[k] || 0) * m.mult;
    return t;
  }, [matched]);

  return (
    <section className="na-panel" style={{ padding: "18px 20px 20px", borderLeft: `3px solid ${C.accent}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <h2 className="na-serif" style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
          Import from Citrus&Spice: {req.title}
        </h2>
        <button className="na-btn na-btn-quiet" onClick={onCancel} style={{ padding: "5px 12px" }}>Cancel</button>
      </div>

      {!done ? (
        <>
          <p className="na-mono" style={{ margin: "0 0 4px", fontSize: 12, color: C.faint }}>
            Ingredient {idx + 1} of {lines.length} · {matched.length} matched
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 14.5, fontWeight: 600 }}>“{line}”</p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <Field label="Match to food">
                <input className="na-input" value={sel ? sel.name : q}
                  onChange={e => { setSel(null); setQ(e.target.value); }}
                  onKeyDown={e => { if (e.key === "Enter") runSearch(); }} />
              </Field>
            </div>
            <button className="na-btn na-btn-quiet" onClick={runSearch} disabled={busy || !q.trim()} style={{ opacity: busy || !q.trim() ? 0.5 : 1 }}>
              {busy ? "Searching…" : "Search USDA"}
            </button>
            <div style={{ width: 180 }}>
              {sel && !sel.per100g ? (
                <Field label="Servings of item">
                  <input className="na-input" type="number" min="0.25" step="0.25" value={qty} onChange={e => setQty(e.target.value)} />
                </Field>
              ) : (
                <Field label="Amount">
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="na-input" type="number" min="0" step="any" value={amt} onChange={e => setAmt(e.target.value)} />
                    <select className="na-select" style={{ width: 80 }} value={unit} onChange={e => setUnit(e.target.value)}>
                      {Object.entries(UNITS).map(([k, u]) => <option key={k} value={k}>{u.label}</option>)}
                    </select>
                  </div>
                </Field>
              )}
            </div>
            <button className="na-btn" onClick={confirm} disabled={!sel} style={{ opacity: sel ? 1 : 0.45 }}>Confirm match</button>
            <button className="na-btn na-btn-quiet" onClick={() => advance(null)}>Skip line</button>
          </div>

          {err && <p role="alert" style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: C.high }}>{err}</p>}

          {(results.length > 0 || localMatches.length > 0) && !sel && (
            <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, border: `1px solid ${C.rule}`, borderRadius: 10, maxHeight: 200, overflowY: "auto" }}>
              {results.map((f, i) => (
                <li key={"u" + i} style={{ borderTop: i ? `1px solid ${C.rule}` : "none" }}>
                  <button onClick={() => setSel(f)}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                    <span>{f.name}</span>
                    <span className="na-mono" style={{ color: C.faint, fontSize: 12, whiteSpace: "nowrap" }}>{Math.round(f.kcal)} kcal / 100 g</span>
                  </button>
                </li>
              ))}
              {results.length === 0 && localMatches.map((f, i) => (
                <li key={"l" + i} style={{ borderTop: i ? `1px solid ${C.rule}` : "none" }}>
                  <button onClick={() => setSel(f)}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                    <span>{f.name}</span>
                    <span className="na-mono" style={{ color: C.faint, fontSize: 12 }}>{f.serving} · quick list</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>
            Matched {matched.length} of {lines.length} ingredients · recipe total ≈ {Math.round(totals.kcal)} kcal.
            {matched.length < lines.length && " Skipped lines are not counted, so totals may run low."}
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ width: 150 }}>
              <Field label="Servings recipe makes">
                <input className="na-input" type="number" min="1" value={servingsMade} onChange={e => setServingsMade(e.target.value)} />
              </Field>
            </div>
            <div style={{ width: 150 }}>
              <Field label="Servings I ate">
                <input className="na-input" type="number" min="0.5" step="0.5" value={servingsEaten} onChange={e => setServingsEaten(e.target.value)} />
              </Field>
            </div>
            <button className="na-btn" disabled={matched.length === 0} style={{ opacity: matched.length ? 1 : 0.45 }}
              onClick={() => onComplete({
                title: req.title, link: req.link || null, matched, totals,
                servingsMade: Math.max(1, Number(servingsMade) || 1),
                servingsEaten: Number(servingsEaten) || 1,
              })}>
              Save recipe & log
            </button>
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Nutrient reference                                           */
/* ------------------------------------------------------------------ */

function ReferenceTab({ targets }) {
  const [open, setOpen] = useState(null);
  const targetFor = (k) => k === "sodium" ? `limit ${targets.sodiumLimit.toLocaleString()} mg` :
    k === "protein" ? `${targets.protein} g` : k === "fiber" ? `${targets.fiber} g` :
    k === "carb" ? `${Math.round(targets.kcal * 0.45 / 4)}–${Math.round(targets.kcal * 0.65 / 4)} g` :
    k === "fat" ? `${Math.round(targets.kcal * 0.20 / 9)}–${Math.round(targets.kcal * 0.35 / 9)} g` :
    k === "calcium" ? `${targets.calcium} mg` : k === "iron" ? `${targets.iron} mg` :
    k === "potassium" ? `${targets.potassium.toLocaleString()} mg` : k === "vitC" ? `${targets.vitC} mg` :
    k === "vitD" ? `${targets.vitD} mcg` : "";

  return (
    <section className="na-panel" style={{ padding: "22px 22px 10px" }}>
      <SectionHead title="Nutrient reference" sub="What each tracked nutrient does, signs of shortfall, and how to get more. Targets shown reflect your profile." />
      {NUTRIENT_INFO.map((n, i) => {
        const isOpen = open === i;
        return (
          <div key={n.key} style={{ borderBottom: `1px solid ${C.rule}` }}>
            <button className="na-acc" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <span>
                {LABELS[n.key]}
                <span className="na-mono" style={{ fontSize: 12, color: C.faint, fontWeight: 400, marginLeft: 10 }}>
                  {targetFor(n.key)}/day
                </span>
              </span>
              <span className="na-mono" aria-hidden style={{ color: C.accent, fontSize: 15 }}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 4px 16px", fontSize: 13.5, lineHeight: 1.6, display: "grid", gap: 10 }}>
                <div><span className="na-eyebrow" style={{ display: "block", marginBottom: 3 }}>Why it matters</span>{n.role}</div>
                <div><span className="na-eyebrow" style={{ display: "block", marginBottom: 3 }}>{n.key === "sodium" ? "Signs of excess" : "Signs of deficiency"}</span>{n.deficiency}</div>
                <div><span className="na-eyebrow" style={{ display: "block", marginBottom: 3 }}>{n.key === "sodium" ? "How to cut back" : "Best food sources"}</span>{n.sources}</div>
              </div>
            )}
          </div>
        );
      })}
      <p style={{ fontSize: 12, color: C.faint, padding: "14px 0", lineHeight: 1.55 }}>
        Persistent or severe symptoms warrant a conversation with a physician — blood work,
        not a food log, is how deficiencies are actually diagnosed.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: History                                                      */
/* ------------------------------------------------------------------ */

function HistoryTab({ history, onDeleteDay }) {
  const [windowDays, setWindowDays] = useState(7);
  const dates = Object.keys(history).sort().reverse();
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - windowDays);
  const inWindow = dates.filter(d => new Date(d + "T12:00:00") >= cutoff);

  const summary = useMemo(() => {
    if (inWindow.length === 0) return null;
    const out = {};
    for (const k of TRACKED) {
      let sum = 0, lowDays = 0;
      for (const d of inWindow) {
        const pct = history[d].pct[k] ?? 0;
        sum += pct;
        if (pct < 80) lowDays++;
      }
      out[k] = { avg: sum / inWindow.length, lowDays };
    }
    let sodiumOver = 0;
    for (const d of inWindow) if ((history[d].pct.sodium ?? 0) > 100) sodiumOver++;
    return { out, sodiumOver };
  }, [history, windowDays]); // eslint-disable-line

  return (
    <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
      <SectionHead title="History" sub="Saved daily reports, and which nutrients you ran low on over time." />
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[7, 30].map(w => (
          <button key={w} className={`na-btn ${windowDays === w ? "" : "na-btn-quiet"}`} onClick={() => setWindowDays(w)}>
            Last {w} days
          </button>
        ))}
      </div>

      {inWindow.length === 0 ? (
        <p style={{ fontSize: 13.5, color: C.faint }}>
          No days in this window yet. Days save automatically as you log food on the
          Nutrition report tab — trends appear here once you have a few days recorded.
        </p>
      ) : (
        <>
          <p className="na-mono" style={{ fontSize: 12.5, color: C.faint, marginTop: 0 }}>
            {inWindow.length} day{inWindow.length > 1 ? "s" : ""} logged in the last {windowDays} days
          </p>
          {TRACKED.map(k => {
            const s = summary.out[k];
            const color = s.avg < 80 ? C.low : s.avg <= 120 ? C.ok : C.faint;
            return (
              <div key={k} style={{ padding: "11px 0", borderBottom: `1px solid ${C.rule}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{LABELS[k]}</span>
                  <span className="na-mono" style={{ fontSize: 12.5, color: C.faint }}>
                    avg {Math.round(s.avg)}% of target
                    {s.lowDays > 0 && <span style={{ color: C.low, marginLeft: 10 }}>low on {s.lowDays} of {inWindow.length} days</span>}
                  </span>
                </div>
                <div style={{ position: "relative", height: 8, background: "#ece4d4", borderRadius: 2 }}>
                  <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.min(s.avg, 130) / 1.3}%`, background: color, borderRadius: 2 }} />
                  <div style={{ position: "absolute", left: `${100 / 1.3}%`, top: -2, bottom: -2, width: 2, background: C.navy }} />
                </div>
              </div>
            );
          })}
          {summary.sodiumOver > 0 && (
            <p style={{ fontSize: 13, color: C.high, marginTop: 12 }}>
              Sodium exceeded the 2,300 mg limit on {summary.sodiumOver} of {inWindow.length} logged days.
            </p>
          )}

          <h3 className="na-eyebrow" style={{ margin: "22px 0 8px" }}>Logged days</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {inWindow.map(d => (
                <tr key={d} style={{ borderTop: `1px solid ${C.rule}` }}>
                  <td className="na-mono" style={{ padding: "7px 4px" }}>{d}</td>
                  <td className="na-mono" style={{ padding: "7px 4px", textAlign: "right", color: C.faint }}>
                    {Math.round(history[d].totals.kcal)} kcal · {TRACKED.filter(k => (history[d].pct[k] ?? 0) < 80).length} nutrient(s) low
                  </td>
                  <td style={{ padding: "7px 4px", textAlign: "right", width: 60 }}>
                    <button onClick={() => onDeleteDay(d)} aria-label={`Delete ${d} from history`}
                      style={{ border: "none", background: "none", color: C.high, cursor: "pointer", fontSize: 12.5 }}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Fitness assessment                                           */
/* ------------------------------------------------------------------ */

function FitnessTab({ profile }) {
  const [f, setF] = useState({ pushups: "", plank: "", reach: "", chair: "" });
  const age = Number(profile.age) || null;
  const sex = profile.sex;
  const set = (k) => (e) => setF(s => ({ ...s, [k]: e.target.value }));

  const pushupResult = f.pushups !== "" && age ? ratePushups(age, sex, Number(f.pushups)) : null;
  const plankResult = f.plank !== "" ? ratePlank(Number(f.plank)) : null;
  const reachResult = f.reach ? REACH_OPTIONS.find(o => o.v === f.reach) : null;
  const chairBand = age && age >= 60 && (sex === "male" || sex === "female")
    ? ageBand(age, Object.keys(CHAIR_STAND_MIN[sex])) : null;
  const chairResult = f.chair !== "" && chairBand
    ? (Number(f.chair) >= CHAIR_STAND_MIN[sex][chairBand] ? "At or above average" : "Below average — worth discussing with a physician")
    : null;

  const ratingColor = (r) => /excellent|very good|good|above/i.test(r) ? C.ok : /fair|average/i.test(r) && !/below/i.test(r) ? C.low : C.high;

  return (
    <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
      <SectionHead title="Fitness & flexibility assessment" sub="Field tests scored against published normative data where it exists. Age and sex are taken from your profile." />

      {!age && (
        <p style={{ fontSize: 13, color: C.low, marginTop: 0 }}>
          Enter your age (and sex, if willing) on the Nutrition report tab's profile to score against age-matched norms.
        </p>
      )}

      <div style={{ display: "grid", gap: 22 }}>
        {/* Push-ups */}
        <div>
          <h3 className="na-serif" style={{ margin: "0 0 4px", fontSize: 16.5, color: C.navy }}>Push-ups (max consecutive)</h3>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: C.faint, lineHeight: 1.55 }}>
            Men: standard push-ups. Women: modified (knee) push-ups, per the reference protocol.
            Scored against ACSM/CSEP normative tables, ages 20–69.
          </p>
          <div style={{ maxWidth: 180 }}>
            <Field label="Reps completed"><input className="na-input" type="number" min="0" value={f.pushups} onChange={set("pushups")} /></Field>
          </div>
          {pushupResult && (pushupResult.rating ? (
            <p style={{ fontSize: 14, marginBottom: 0 }}>
              Rating for {sex}, {pushupResult.band}: <strong style={{ color: ratingColor(pushupResult.rating) }}>{pushupResult.rating}</strong>
              <span className="na-mono" style={{ fontSize: 12, color: C.faint, marginLeft: 10 }}>
                (fair ≥{pushupResult.thresholds[0]} · good ≥{pushupResult.thresholds[1]} · very good ≥{pushupResult.thresholds[2]} · excellent ≥{pushupResult.thresholds[3]})
              </span>
            </p>
          ) : <p style={{ fontSize: 13, color: C.low, marginBottom: 0 }}>{pushupResult.note}</p>)}
        </div>

        {/* Plank */}
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 18 }}>
          <h3 className="na-serif" style={{ margin: "0 0 4px", fontSize: 16.5, color: C.navy }}>Plank hold</h3>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: C.faint, lineHeight: 1.55 }}>
            Forearm plank, straight line from head to heels. No standardized age-normed database
            exists for the plank; categories below reflect common fitness-industry guidance.
          </p>
          <div style={{ maxWidth: 180 }}>
            <Field label="Seconds held"><input className="na-input" type="number" min="0" value={f.plank} onChange={set("plank")} /></Field>
          </div>
          {plankResult && (
            <p style={{ fontSize: 14, marginBottom: 0 }}>Rating: <strong style={{ color: ratingColor(plankResult) }}>{plankResult}</strong></p>
          )}
        </div>

        {/* Sit and reach */}
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 18 }}>
          <h3 className="na-serif" style={{ margin: "0 0 4px", fontSize: 16.5, color: C.navy }}>Hamstring & lower-back flexibility</h3>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: C.faint, lineHeight: 1.55 }}>
            Simplified toe-touch version of the sit-and-reach test. Sit with legs straight,
            reach slowly toward your toes without bouncing. (The formal ACSM test uses a
            measuring box; this is a practical approximation.)
          </p>
          <div style={{ maxWidth: 260 }}>
            <Field label="Farthest point reached">
              <select className="na-select" value={f.reach} onChange={set("reach")}>
                <option value="">Select…</option>
                {REACH_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
              </select>
            </Field>
          </div>
          {reachResult && (
            <p style={{ fontSize: 14, marginBottom: 0 }}>Rating: <strong style={{ color: ratingColor(reachResult.rating) }}>{reachResult.rating}</strong></p>
          )}
        </div>

        {/* Chair stand */}
        <div style={{ borderTop: `1px solid ${C.rule}`, paddingTop: 18 }}>
          <h3 className="na-serif" style={{ margin: "0 0 4px", fontSize: 16.5, color: C.navy }}>30-second chair stand (ages 60+)</h3>
          <p style={{ margin: "0 0 10px", fontSize: 13, color: C.faint, lineHeight: 1.55 }}>
            Stand fully and sit back down as many times as possible in 30 seconds, arms crossed.
            Scored against CDC STEADI norms for ages 60–94. Under 60, most healthy adults manage 20 or more.
          </p>
          <div style={{ maxWidth: 180 }}>
            <Field label="Stands in 30 s"><input className="na-input" type="number" min="0" value={f.chair} onChange={set("chair")} /></Field>
          </div>
          {f.chair !== "" && (chairResult ? (
            <p style={{ fontSize: 14, marginBottom: 0 }}>
              Result for {sex}, {chairBand}: <strong style={{ color: ratingColor(chairResult) }}>{chairResult}</strong>
              <span className="na-mono" style={{ fontSize: 12, color: C.faint, marginLeft: 10 }}>(average threshold: {CHAIR_STAND_MIN[sex][chairBand]})</span>
            </p>
          ) : (
            <p style={{ fontSize: 13, color: C.faint, marginBottom: 0 }}>
              CDC norms apply to ages 60–94 with sex specified. {Number(f.chair) >= 20 ? "20+ stands is a strong result for a younger adult." : ""}
            </p>
          ))}
        </div>
      </div>

      <p style={{ fontSize: 12, color: C.faint, lineHeight: 1.6, marginTop: 22, marginBottom: 0, borderTop: `1px solid ${C.rule}`, paddingTop: 14 }}>
        Sources: push-up and sit-and-reach protocols adapted from the ACSM Guidelines for Exercise
        Testing and Prescription and CSEP normative tables; chair-stand thresholds from the CDC
        STEADI program. Stop any test that causes pain, and check with a physician before fitness
        testing if you have cardiovascular or joint conditions.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main app                                                          */
/* ------------------------------------------------------------------ */

export default function NutritionAssessment() {
  const [tab, setTab] = useState("report");
  const [profile, setProfile] = useState({
    age: "", sex: "", weight: "", weightUnit: "lb",
    height: "", heightUnit: "in", activity: "light",
  });
  const [query, setQuery] = useState("");
  const [qty, setQty] = useState(1);
  const [amount, setAmount] = useState(100);
  const [amountUnit, setAmountUnit] = useState("g");
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState([]);
  const [source, setSource] = useState("usda");
  const [profileOpen, setProfileOpen] = useState(true);
  const [usdaResults, setUsdaResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [bonusMsg, setBonusMsg] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "", carb: "", fat: "", fiber: "", sodium: "" });
  const [history, setHistory] = useState({});
  const [recipes, setRecipes] = useState({});
  const [barcodes, setBarcodes] = useState({});
  const [customNutrients, setCustomNutrients] = useState({});
  const [newNutrient, setNewNutrient] = useState({ name: "", unit: "g", target: "" });
  const [saveMsg, setSaveMsg] = useState("");
  const [users, setUsers] = useState(["Me"]);
  const [currentUser, setCurrentUser] = useState("Me");
  const [newUser, setNewUser] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const hydrated = useRef(false);

  const todayKey = () => new Date().toISOString().slice(0, 10);

  // Load the person list once.
  useEffect(() => {
    loadStore(UKEY).then(u => {
      if (u && Array.isArray(u.list) && u.list.length) {
        setUsers(u.list);
        setCurrentUser(u.list[0]);
      }
    });
  }, []);

  // Load everything for the selected person; restore today's log so
  // items logged earlier in the day accumulate instead of starting over.
  useEffect(() => {
    hydrated.current = false;
    (async () => {
      const [h, r, p, b, c] = await Promise.all([
        loadStore(userKey(HKEY, currentUser)),
        loadStore(userKey(RKEY, currentUser)),
        loadStore(userKey(PKEY, currentUser)),
        loadStore(userKey(BKEY, currentUser)),
        loadStore(userKey(CKEY, currentUser)),
      ]);
      setHistory(h || {});
      setRecipes(r || {});
      setBarcodes(b || {});
      setCustomNutrients(c || {});
      setProfile(p && p.activity ? p : { age: "", sex: "", weight: "", weightUnit: "lb", height: "", heightUnit: "in", activity: "light" });
      const today = (h || {})[todayKey()];
      setLog(today && Array.isArray(today.items)
        ? today.items.map((it, i) => ({ ...it, id: it.id || Date.now() + i }))
        : []);
      hydrated.current = true;
    })();
  }, [currentUser]);

  // Auto-save the profile per person (biometrics never leave the device).
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(() => saveStore(userKey(PKEY, currentUser), profile), 600);
    return () => clearTimeout(t);
  }, [profile, currentUser]);

  const addUser = async () => {
    const name = newUser.trim();
    if (!name || users.includes(name)) { setAddingUser(false); setNewUser(""); return; }
    const list = [...users, name];
    setUsers(list);
    await saveStore(UKEY, { list });
    setNewUser(""); setAddingUser(false);
    setCurrentUser(name);
  };

  const [importReq, setImportReq] = useState(null);

  useEffect(() => {
    const check = () => {
      try {
        const v = window.localStorage.getItem("cs-nutrition-import");
        if (v) {
          setImportReq(JSON.parse(v));
          window.localStorage.removeItem("cs-nutrition-import");
          setTab("report");
        }
      } catch (e) { /* storage unavailable */ }
    };
    check();
    const onMsg = (e) => {
      if (e.data && e.data.type === "cs-recipe-import" && Array.isArray(e.data.ingredients)) {
        setImportReq(e.data);
        setTab("report");
      }
    };
    window.addEventListener("message", onMsg);
    window.addEventListener("focus", check);
    return () => { window.removeEventListener("message", onMsg); window.removeEventListener("focus", check); };
  }, []);

  const logRecipeServings = (food, count) => {
    setLog(l => [...l, { food: enrichFood(food), qty: count, label: `${count} serving${count !== 1 ? "s" : ""}`, id: Date.now() }]);
    if (recipes[food.name]) {
      const next = { ...recipes, [food.name]: { ...recipes[food.name], lastUsed: Date.now() } };
      setRecipes(next);
      saveStore(userKey(RKEY, currentUser), next);
    }
    setTab("report");
  };

  const completeImport = async ({ title, link, matched, servingsMade, servingsEaten }) => {
    const cids = Object.keys(customNutrients);
    const enriched = matched.map(m => ({ ...m, food: enrichFood(m.food) }));
    const rTotals = { ...ZERO };
    for (const id of cids) rTotals[id] = 0;
    for (const m of enriched) {
      for (const k of KEYS) rTotals[k] += (m.food[k] || 0) * m.mult;
      for (const id of cids) rTotals[id] += (m.food[id] || 0) * m.mult;
    }
    const per = {};
    for (const k of [...KEYS, ...cids]) per[k] = rTotals[k] / servingsMade;
    const food = { ...per, name: title, serving: "1 serving", isRecipe: true };
    const next = { ...recipes, [title]: { name: title, servings: servingsMade, food, link, lastUsed: Date.now(), ingredients: matched.map(m => `${m.food.name} — ${m.label}`) } };
    setRecipes(next);
    await saveStore(userKey(RKEY, currentUser), next);
    setLog(l => [...l, { food, qty: servingsEaten, label: `${servingsEaten} serving${servingsEaten !== 1 ? "s" : ""}`, id: Date.now() }]);
    setImportReq(null);
  };

  const deleteSavedRecipe = async (rname) => {
    const next = { ...recipes };
    delete next[rname];
    setRecipes(next);
    await saveStore(userKey(RKEY, currentUser), next);
  };

  const targets = useMemo(() => computeTargets(profile), [profile]);

  const totals = useMemo(() => {
    const t = { ...ZERO };
    const cids = Object.keys(customNutrients);
    for (const id of cids) t[id] = 0;
    for (const item of log) {
      for (const k of KEYS) t[k] += (item.food[k] || 0) * item.qty;
      for (const id of cids) t[id] += (item.food[id] || 0) * item.qty;
    }
    return t;
  }, [log, customNutrients]);

  const pctOf = (k) => {
    const target = k === "sodium" ? targets.sodiumLimit : targets[k];
    return target ? (totals[k] / target) * 100 : 0;
  };

  const deficits = useMemo(() => TRACKED.filter(k => pctOf(k) < 80), [totals, targets]); // eslint-disable-line

  const recommendations = useMemo(() => {
    if (log.length === 0) return { mode: "plan", recipes: SAMPLE_DAY };
    if (deficits.length === 0) return { mode: "met", recipes: [] };
    const ranked = [...RECIPES]
      .map(r => ({ r, score: r.richIn.filter(k => deficits.includes(k)).length }))
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(x => x.r);
    return { mode: "catchup", recipes: ranked };
  }, [log.length, deficits]);

  const matches = query.length > 0
    ? FOODS.filter(f => f.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  const set = (k) => (e) => setProfile(p => ({ ...p, [k]: e.target.value }));

  // Auto-credit custom nutrients from the research library (e.g. salmon -> omega-3)
  const enrichFood = (food) => {
    const cns = Object.values(customNutrients).filter(cn => cn.presetKey);
    if (cns.length === 0) return food;
    const out = { ...food };
    for (const cn of cns) {
      if (out[cn.id]) continue;
      const per100 = libraryLookup(cn.presetKey, out.name);
      if (per100 == null) continue;
      out[cn.id] = out.per100g ? per100 : Math.round(per100 * ((SERVING_GRAMS[out.name] || 100) / 100) * 100) / 100;
    }
    return out;
  };

  const addFood = () => {
    if (!selected) return;
    let multiplier, label = null;
    if (selected.per100g) {
      const u = UNITS[amountUnit];
      const g = (Number(amount) || 100) * u.grams;
      multiplier = g / 100;
      label = amountUnit === "g" ? `${Math.round(g)} g` : `${amount} ${u.label}${u.approx ? ` (~${Math.round(g)} g)` : ` (${Math.round(g)} g)`}`;
    } else {
      multiplier = Number(qty) || 1;
    }
    setLog(l => [...l, { food: enrichFood(selected), qty: multiplier, label, id: Date.now() }]);
    const bonuses = detectBonuses(selected.name);
    if (bonuses.length > 0) {
      const b = bonuses[0];
      setBonusMsg(`✦ Nice pick! Beyond the standard panel, this also brings ${b.extra.toLowerCase()} — ${b.blurb}.`);
      setTimeout(() => setBonusMsg(""), 8000);
    }
    setSelected(null); setQuery(""); setQty(1); setAmount(100); setAmountUnit("g"); setUsdaResults([]);
  };

  const runUsdaSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearchError(""); setUsdaResults([]); setSelected(null);
    try {
      const foods = await searchFdc(query.trim());
      setUsdaResults(foods);
      if (foods.length === 0) setSearchError("No matches found in FoodData Central.");
    } catch (err) {
      setSearchError(err.message + " You can switch to the built-in list as a fallback.");
    } finally { setSearching(false); }
  };

  const handleBarcode = async (code) => {
    setShowScanner(false);
    const known = barcodes[code];
    if (known) {
      setSelected(known.food); setQuery(""); setUsdaResults([]);
      setScanStatus(`From your scanned items: ${known.food.name}. Set the amount, then add to log.`);
      const next = { ...barcodes, [code]: { ...known, lastUsed: Date.now() } };
      setBarcodes(next);
      saveStore(userKey(BKEY, currentUser), next);
      return;
    }
    setScanStatus(`Looking up barcode ${code}…`);
    try {
      const food = await lookupBarcode(code);
      setSelected(food); setQuery(""); setUsdaResults([]);
      setScanStatus(`Found: ${food.name}. Set the amount, then add to log. Saved to your scanned items for next time.`);
      const next = { ...barcodes, [code]: { code, food, lastUsed: Date.now() } };
      setBarcodes(next);
      await saveStore(userKey(BKEY, currentUser), next);
    } catch (err) {
      setScanStatus("");
      setSearchError(err.message + " Try the search box or a custom item.");
    }
  };

  const addCustomNutrient = async () => {
    const name = newNutrient.name.trim();
    const target = Number(newNutrient.target);
    if (!name || !(target > 0)) return;
    const id = newNutrient.presetKey ? "cn_" + newNutrient.presetKey : "cn_" + name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
    const next = { ...customNutrients, [id]: { id, name, unit: newNutrient.unit.trim() || "g", target, presetKey: newNutrient.presetKey || null, limit: !!newNutrient.limit } };
    setCustomNutrients(next);
    await saveStore(userKey(CKEY, currentUser), next);
    setNewNutrient({ name: "", unit: "g", target: "", presetKey: null, limit: false, custom: false });
  };

  const deleteCustomNutrient = async (id) => {
    const next = { ...customNutrients };
    delete next[id];
    setCustomNutrients(next);
    await saveStore(userKey(CKEY, currentUser), next);
  };

  const quickLogCustom = (cn, amount) => {
    const v = Number(amount);
    if (!(v > 0)) return;
    const food = { ...ZERO, name: `${cn.name} (manual entry)`, serving: `1 ${cn.unit}`, [cn.id]: 1 };
    setLog(l => [...l, { food, qty: v, label: `${v} ${cn.unit}`, id: Date.now() }]);
  };

  const deleteBarcode = async (code) => {
    const next = { ...barcodes };
    delete next[code];
    setBarcodes(next);
    await saveStore(userKey(BKEY, currentUser), next);
  };

  const addCustom = () => {
    if (!custom.name) return;
    const food = { ...ZERO, name: custom.name, serving: "1 serving" };
    for (const k of ["kcal", "protein", "carb", "fat", "fiber", "sodium"]) food[k] = Number(custom[k]) || 0;
    for (const id of Object.keys(customNutrients)) { const v = Number(custom[id]); if (v > 0) food[id] = v; }
    setLog(l => [...l, { food, qty: 1, id: Date.now() }]);
    setCustom({ name: "", kcal: "", protein: "", carb: "", fat: "", fiber: "", sodium: "" });
    setShowCustom(false);
  };

  // Auto-save today's log (with its items) whenever it changes. Because the
  // log is restored on load, same-day sessions accumulate rather than overwrite.
  useEffect(() => {
    if (!hydrated.current) return;
    const t = setTimeout(async () => {
      const today = todayKey();
      const next = { ...history };
      if (log.length === 0) {
        if (!next[today]) return;
        delete next[today];
      } else {
        const pct = {};
        for (const k of [...TRACKED, "sodium"]) pct[k] = Math.round(pctOf(k));
        next[today] = {
          totals: { ...totals },
          pct,
          items: log.map(({ food, qty, label }) => ({ food, qty, label: label || null })),
        };
      }
      setHistory(next);
      const where = await saveStore(userKey(HKEY, currentUser), next);
      setSaveMsg(where === "memory" ? "Saved (this session only)" : "Auto-saved to today's history");
      setTimeout(() => setSaveMsg(""), 2500);
    }, 800);
    return () => clearTimeout(t);
  }, [log, targets]); // eslint-disable-line

  const updateItemQty = (id, raw) => {
    const v = Number(raw);
    if (!(v >= 0)) return;
    setLog(l => l.map(item => {
      if (item.id !== id) return item;
      if (item.food.per100g) return { ...item, qty: v / 100, label: `${Math.round(v)} g` };
      if (item.food.isRecipe) return { ...item, qty: v, label: `${v} serving${v !== 1 ? "s" : ""}` };
      return { ...item, qty: v, label: null };
    }));
  };

  const deleteHistoryDay = async (date) => {
    const next = { ...history };
    delete next[date];
    setHistory(next);
    await saveStore(userKey(HKEY, currentUser), next);
    if (date === todayKey()) setLog([]);
  };

  const TABS = [
    ["report", "Report"],
    ["reference", "Nutrients"],
    ["history", "History"],
    ["fitness", "Fitness"],
  ];

  return (
    <div className="na-root">
      <style>{css}</style>

      <header style={{ background: C.paper, borderBottom: `1px solid ${C.rule}`, padding: "18px 20px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div>
            <h1 className="na-serif" style={{ margin: 0, fontSize: 24, fontWeight: 600, lineHeight: 1.15 }}>
              Nutrient Tracker
            </h1>
            <div className="na-eyebrow" style={{ marginTop: 2 }}>Daily intake, history & fitness</div>
          </div>
          <nav role="tablist" style={{ display: "flex", gap: 4, marginTop: 10, overflowX: "auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className="na-tab" onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
            <a href={RECIPE_SITE_URL} className="na-tab" style={{ textDecoration: "none", color: C.accent, fontWeight: 500 }}>
              Recipes ↗
            </a>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "26px 20px 40px", display: "grid", gap: 26 }}>

        {tab === "reference" && <ReferenceTab targets={targets} />}
        {tab === "history" && <HistoryTab history={history} onDeleteDay={deleteHistoryDay} />}
        {tab === "fitness" && <FitnessTab profile={profile} />}

        {tab === "report" && (
          <>
            {importReq && <RecipeImport req={importReq} onCancel={() => setImportReq(null)} onComplete={completeImport} />}
            {/* ---------- Person switcher ---------- */}
            <section className="na-panel" style={{ padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ width: 180 }}>
                <Field label="Logging for">
                  <select className="na-select" value={currentUser}
                    onChange={e => e.target.value === "__add" ? setAddingUser(true) : setCurrentUser(e.target.value)}>
                    {users.map(u => <option key={u} value={u}>{u}</option>)}
                    <option value="__add">+ Add person…</option>
                  </select>
                </Field>
              </div>
              {addingUser && (
                <>
                  <div style={{ width: 170 }}>
                    <Field label="Nickname">
                      <input className="na-input" value={newUser} onChange={e => setNewUser(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") addUser(); }} placeholder="e.g. Sam" />
                    </Field>
                  </div>
                  <button className="na-btn" onClick={addUser}>Add</button>
                  <button className="na-btn na-btn-quiet" onClick={() => { setAddingUser(false); setNewUser(""); }}>Cancel</button>
                </>
              )}
              <p style={{ margin: 0, flex: "1 1 220px", fontSize: 11.5, color: C.faint, lineHeight: 1.5 }}>
                Each person's log, history, recipes, and profile are kept separate and stay
                on this device. Nicknames are optional — "Me" works fine, and all profile
                fields remain optional.
              </p>
            </section>
            {/* ---------- 01 Profile ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, borderBottom: `2px solid ${C.navy}`, paddingBottom: 10, marginBottom: profileOpen ? 18 : 0 }}>
                <span className="na-mono" style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>01</span>
                <div style={{ flex: 1 }}>
                  <h2 className="na-serif" style={{ margin: 0, fontSize: 21, fontWeight: 700, color: C.navy }}>Subject profile</h2>
                  {profileOpen && <p style={{ margin: "3px 0 0", fontSize: 13, color: C.faint }}>Optional. Unanswered fields fall back to general adult reference values.</p>}
                </div>
                <button className="na-btn na-btn-quiet" aria-expanded={profileOpen}
                  onClick={() => setProfileOpen(o => !o)} style={{ padding: "5px 12px", flexShrink: 0 }}>
                  {profileOpen ? "Hide" : "Show"}
                </button>
              </div>
              {profileOpen ? (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
                <Field label="Age (years)">
                  <input className="na-input" type="number" min="18" max="120" value={profile.age} onChange={set("age")} placeholder="—" />
                </Field>
                <Field label="Sex (for reference values)">
                  <select className="na-select" value={profile.sex} onChange={set("sex")}>
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </Field>
                <Field label="Weight">
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="na-input" type="number" min="0" value={profile.weight} onChange={set("weight")} placeholder="—" />
                    <select className="na-select" style={{ width: 74 }} value={profile.weightUnit} onChange={set("weightUnit")}>
                      <option value="lb">lb</option><option value="kg">kg</option>
                    </select>
                  </div>
                </Field>
                <Field label="Height">
                  <div style={{ display: "flex", gap: 6 }}>
                    <input className="na-input" type="number" min="0" value={profile.height} onChange={set("height")} placeholder="—" />
                    <select className="na-select" style={{ width: 74 }} value={profile.heightUnit} onChange={set("heightUnit")}>
                      <option value="in">in</option><option value="cm">cm</option>
                    </select>
                  </div>
                </Field>
                <Field label="Activity level">
                  <select className="na-select" value={profile.activity} onChange={set("activity")}>
                    {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </Field>
              </div>
                  <p className="na-mono" style={{ fontSize: 12, color: C.faint, marginTop: 16, marginBottom: 0 }}>
                    Energy target basis: {targets.kcalBasis} → {targets.kcal.toLocaleString()} kcal/day
                  </p>
                </>
              ) : (
                <p className="na-mono" style={{ fontSize: 12, color: C.faint, margin: "10px 0 0" }}>
                  Targets in effect: {targets.kcal.toLocaleString()} kcal · protein {targets.protein} g · fiber {targets.fiber} g
                </p>
              )}
            </section>

            {/* ---------- 02 Intake log ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <SectionHead num="02" title="Intake log" sub="Search the USDA FoodData Central database, use the built-in quick list, or enter an item from a nutrition label." />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 12 }}>
                <div style={{ width: 210 }}>
                  <Field label="Data source">
                    <select className="na-select" value={source}
                      onChange={e => { setSource(e.target.value); setSelected(null); setUsdaResults([]); setSearchError(""); }}>
                      <option value="usda">USDA FoodData Central</option>
                      <option value="local">Built-in quick list</option>
                      <option value="recipes">My saved recipes</option>
                      <option value="scans">Scanned items</option>
                    </select>
                  </Field>
                </div>
              </div>

              {source === "scans" && (
                Object.keys(barcodes).length === 0 ? (
                  <p style={{ margin: "4px 0 12px", fontSize: 13, color: C.faint }}>
                    No scanned items yet. Products you scan are remembered here so
                    repeat purchases are one tap — no camera or lookup needed.
                  </p>
                ) : (
                  <ul style={{ listStyle: "none", margin: "4px 0 14px", padding: 0, border: `1px solid ${C.rule}`, borderRadius: 10, maxHeight: 280, overflowY: "auto" }}>
                    {Object.values(barcodes).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).map((entry, i) => (
                      <li key={entry.code} style={{ display: "flex", alignItems: "center", gap: 6, borderTop: i ? `1px solid ${C.rule}` : "none" }}>
                        <button onClick={() => { setSelected(entry.food); setQuery(""); setUsdaResults([]); }}
                          style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 8, padding: "10px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                          <span>{entry.food.name}</span>
                          <span className="na-mono" style={{ color: C.faint, fontSize: 11.5, whiteSpace: "nowrap" }}>
                            {(() => { const n = analyzeIngredients(entry.food.ingredients).filter(f => f.level !== "note").length;
                              return n > 0 ? <span style={{ color: C.low, fontWeight: 600 }}>⚠ {n} flagged · </span> : null; })()}
                            {Math.round(entry.food.kcal)} kcal / 100 g · {entry.code}
                          </span>
                        </button>
                        <button onClick={() => deleteBarcode(entry.code)} aria-label={`Delete ${entry.food.name} from scanned items`}
                          style={{ border: "none", background: "none", color: C.high, cursor: "pointer", fontSize: 12.5, padding: "10px 12px" }}>
                          Delete
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              )}

              {source === "recipes" && (
                Object.keys(recipes).length === 0 ? (
                  <p style={{ margin: "4px 0 12px", fontSize: 13, color: C.faint }}>
                    No saved recipes yet. Open a recipe on the Citrus&Spice tabs and tap
                    "Log to Nutrition" to bring it over with its macros.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: 10, margin: "4px 0 14px" }}>
                    {Object.values(recipes).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).map(r => (
                      <div key={r.name} style={{ border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 10, padding: "10px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "baseline" }}>
                          <span className="na-serif" style={{ fontSize: 15.5, fontWeight: 700 }}>
                            {r.name}
                            {r.link && (
                              <a href={r.link} target="_top" rel="noopener"
                                style={{ marginLeft: 10, fontSize: 12, fontFamily: "'Inter', sans-serif", fontWeight: 500, color: C.accent, textDecoration: "none", borderBottom: `1px solid ${C.accent}` }}>
                                View recipe ↗
                              </a>
                            )}
                          </span>
                          <span className="na-mono" style={{ fontSize: 12, color: C.faint }}>
                            {Math.round(r.food.kcal)} kcal · {r.food.protein.toFixed(0)} g protein / serving
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
                          <input className="na-input" type="number" min="0.5" step="0.5" defaultValue={1} style={{ width: 74 }}
                            id={`rq-${r.name.replace(/\W/g, "_")}`} aria-label={`Servings of ${r.name}`} />
                          <button className="na-btn" style={{ padding: "7px 14px" }}
                            onClick={() => {
                              const el = document.getElementById(`rq-${r.name.replace(/\W/g, "_")}`);
                              logRecipeServings(r.food, Number(el && el.value) || 1);
                            }}>
                            Log serving(s)
                          </button>
                          <button className="na-btn na-btn-quiet" style={{ padding: "7px 14px", color: C.high }} onClick={() => deleteSavedRecipe(r.name)}>
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 220px", position: "relative" }}>
                  <Field label="Food">
                    <input
                      className="na-input" value={selected ? selected.name : query}
                      placeholder="e.g. oatmeal, salmon, spinach…"
                      onChange={(e) => { setSelected(null); setQuery(e.target.value); }}
                      onKeyDown={(e) => { if (e.key === "Enter" && source === "usda") runUsdaSearch(); }}
                    />
                  </Field>
                  {source === "local" && matches.length > 0 && !selected && (
                    <ul style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "100%", margin: 0, padding: 0, listStyle: "none", background: "#fff", border: `1px solid ${C.rule}`, borderTop: "none", boxShadow: "0 6px 16px rgba(24,36,48,0.12)" }}>
                      {matches.map(f => (
                        <li key={f.name}>
                          <button onClick={() => { setSelected(f); setQuery(""); }}
                            style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "9px 10px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                            <span>{f.name}</span>
                            <span className="na-mono" style={{ color: C.faint, fontSize: 12 }}>{f.serving} · {f.kcal} kcal</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {source === "usda" && (
                  <button className="na-btn na-btn-quiet" onClick={runUsdaSearch} disabled={searching || !query.trim()}
                    style={{ opacity: searching || !query.trim() ? 0.5 : 1 }}>
                    {searching ? "Searching…" : "Search USDA"}
                  </button>
                )}
                <div style={{ width: 190 }}>
                  {selected && selected.per100g ? (
                    <Field label="Amount" note={UNITS[amountUnit].approx ? "Volume units are approximate — density varies by food." : null}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="na-input" type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} />
                        <select className="na-select" style={{ width: 82 }} value={amountUnit} onChange={e => setAmountUnit(e.target.value)}>
                          {Object.entries(UNITS).map(([k, u]) => <option key={k} value={k}>{u.label}</option>)}
                        </select>
                      </div>
                    </Field>
                  ) : (
                    <Field label="Servings">
                      <input className="na-input" type="number" min="0.25" step="0.25" value={qty} onChange={e => setQty(e.target.value)} />
                    </Field>
                  )}
                </div>
                <button className="na-btn" onClick={addFood} disabled={!selected} style={{ opacity: selected ? 1 : 0.45 }}>
                  Add to log
                </button>
                <button className="na-btn na-btn-quiet" onClick={() => { setShowScanner(s => !s); setScanStatus(""); }}>
                  {showScanner ? "Cancel scan" : "Scan barcode"}
                </button>
                <button className="na-btn na-btn-quiet" onClick={() => setShowCustom(s => !s)}>
                  {showCustom ? "Cancel custom item" : "Custom item"}
                </button>
              </div>

              {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={() => setShowScanner(false)} />}
              {scanStatus && <p className="na-mono" style={{ marginTop: 12, marginBottom: 0, fontSize: 12.5, color: C.ok }}>{scanStatus}</p>}
              {bonusMsg && <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: C.ok, fontWeight: 600 }}>{bonusMsg}</p>}
              {selected && selected.ingredients && <IngredientCheck text={selected.ingredients} />}

              {searchError && <p role="alert" style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: C.high }}>{searchError}</p>}

              {source === "usda" && usdaResults.length > 0 && !selected && (
                <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, border: `1px solid ${C.rule}`, borderRadius: 3, maxHeight: 260, overflowY: "auto" }}>
                  {usdaResults.map((f, i) => (
                    <li key={i} style={{ borderTop: i ? `1px solid ${C.rule}` : "none" }}>
                      <button onClick={() => { setSelected(f); setUsdaResults([]); }}
                        style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "10px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                        <span>{f.name}</span>
                        <span className="na-mono" style={{ color: C.faint, fontSize: 12, whiteSpace: "nowrap" }}>{Math.round(f.kcal)} kcal / 100 g</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {showCustom && (
                <div style={{ marginTop: 16, padding: 14, background: C.paper, border: `1px dashed ${C.rule}`, borderRadius: 3, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
                  <Field label="Name"><input className="na-input" value={custom.name} onChange={e => setCustom(c => ({ ...c, name: e.target.value }))} /></Field>
                  {[["kcal", "Calories"], ["protein", "Protein g"], ["carb", "Carbs g"], ["fat", "Fat g"], ["fiber", "Fiber g"], ["sodium", "Sodium mg"]].map(([k, l]) => (
                    <Field key={k} label={l}>
                      <input className="na-input" type="number" min="0" value={custom[k]} onChange={e => setCustom(c => ({ ...c, [k]: e.target.value }))} />
                    </Field>
                  ))}
                  {Object.values(customNutrients).map(cn => (
                    <Field key={cn.id} label={`${cn.name} ${cn.unit}`}>
                      <input className="na-input" type="number" min="0" step="any" value={custom[cn.id] || ""}
                        onChange={e => setCustom(c => ({ ...c, [cn.id]: e.target.value }))} />
                    </Field>
                  ))}
                  <div style={{ alignSelf: "end" }}><button className="na-btn" onClick={addCustom}>Add item</button></div>
                </div>
              )}

              {log.length === 0 ? (
                <p style={{ marginTop: 20, marginBottom: 0, fontSize: 13.5, color: C.faint }}>
                  No items logged yet. Add the foods you've eaten today to generate an assessment.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, fontSize: 13.5 }}>
                  <thead>
                    <tr className="na-eyebrow" style={{ textAlign: "left" }}>
                      <th style={{ padding: "6px 4px", fontWeight: 600 }}>Item</th>
                      <th style={{ padding: "6px 4px", fontWeight: 600 }}>Qty</th>
                      <th className="na-mono" style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right" }}>kcal</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {log.map(item => (
                      <tr key={item.id} style={{ borderTop: `1px solid ${C.rule}` }}>
                        <td style={{ padding: "8px 4px" }}>{item.food.name} <span style={{ color: C.faint, fontSize: 12 }}>({item.food.serving})</span></td>
                        <td className="na-mono" style={{ padding: "8px 4px", whiteSpace: "nowrap" }}>
                          <input className="na-input" type="number" min="0" step="any"
                            value={item.food.per100g ? Math.round(item.qty * 100) : item.qty}
                            onChange={e => updateItemQty(item.id, e.target.value)}
                            aria-label={`Amount of ${item.food.name}`}
                            style={{ width: 66, padding: "4px 6px", fontSize: 12.5, textAlign: "right" }} />
                          <span style={{ marginLeft: 6, fontSize: 11.5, color: C.faint }}>
                            {item.food.per100g ? "g" : item.food.isRecipe ? "serv." : "× serving"}
                          </span>
                        </td>
                        <td className="na-mono" style={{ padding: "8px 4px", textAlign: "right" }}>{Math.round(item.food.kcal * item.qty)}</td>
                        <td style={{ padding: "8px 4px", textAlign: "right" }}>
                          <button onClick={() => setLog(l => l.filter(x => x.id !== item.id))}
                            aria-label={`Remove ${item.food.name}`}
                            style={{ border: "none", background: "none", color: C.high, cursor: "pointer", fontSize: 13 }}>
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr style={{ borderTop: `2px solid ${C.navy}`, fontWeight: 600 }}>
                      <td style={{ padding: "8px 4px" }}>Total</td>
                      <td />
                      <td className="na-mono" style={{ padding: "8px 4px", textAlign: "right" }}>{Math.round(totals.kcal)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              )}
            </section>

            {/* ---------- 03 Assessment ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 10px" }}>
              <SectionHead num="03" title="Assessment" sub="Intake versus reference targets. The vertical mark on each scale indicates 100% of target." />
              {log.length === 0 ? (
                <p style={{ fontSize: 13.5, color: C.faint, paddingBottom: 14 }}>The report populates once foods are logged above.</p>
              ) : (
                <>
                  <div className="na-eyebrow" style={{ margin: "4px 0 2px" }}>Energy & macronutrients</div>
                  <MacroSummary totals={totals} targets={targets} />
                  <Gauge label="Protein (vs RDA)" value={totals.protein} target={targets.protein} unit="g" dp={1} />
                  <Gauge label="Dietary fiber" value={totals.fiber} target={targets.fiber} unit="g" dp={1} />

                  <div className="na-eyebrow" style={{ margin: "18px 0 2px" }}>Micronutrients</div>
                  <Gauge label="Calcium" value={totals.calcium} target={targets.calcium} unit="mg" />
                  <Gauge label="Iron" value={totals.iron} target={targets.iron} unit="mg" dp={1} />
                  <Gauge label="Potassium" value={totals.potassium} target={targets.potassium} unit="mg" />
                  <Gauge label="Vitamin C" value={totals.vitC} target={targets.vitC} unit="mg" />
                  <Gauge label="Vitamin D" value={totals.vitD} target={targets.vitD} unit="mcg" dp={1} />

                  <div className="na-eyebrow" style={{ margin: "18px 0 2px" }}>Intake limits</div>
                  <Gauge label="Sodium" value={totals.sodium} target={targets.sodiumLimit} unit="mg" isLimit />

                  {(() => {
                    const seen = new Map();
                    for (const item of log) {
                      for (const b of detectBonuses(item.food.name)) {
                        if (!seen.has(b.extra)) seen.set(b.extra, { ...b, foods: [item.food.name] });
                        else if (!seen.get(b.extra).foods.includes(item.food.name)) seen.get(b.extra).foods.push(item.food.name);
                      }
                    }
                    const found = [...seen.values()];
                    if (found.length === 0) return null;
                    return (
                      <>
                        <div className="na-eyebrow" style={{ margin: "18px 0 2px" }}>Bonus nutrients today</div>
                        <div style={{ padding: "12px 14px", margin: "8px 0 4px", background: "#eef0e4", border: `1px solid ${C.rule}`, borderRadius: 10 }}>
                          <p style={{ margin: "0 0 8px", fontSize: 13.5, fontWeight: 600, color: C.ok }}>
                            ✦ Great choices — today's foods also deliver {found.length} extra{found.length > 1 ? "s" : ""} beyond the standard panel:
                          </p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                            {found.map(b => (
                              <li key={b.extra} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                                <strong>{b.extra}</strong> <span style={{ color: C.faint }}>({b.foods.slice(0, 2).join(", ")})</span> — {b.blurb}
                              </li>
                            ))}
                          </ul>
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.faint }}>
                            These plant compounds and extras have no official daily targets, so they aren't scored — just celebrated.
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 0" }}>
                    <span style={{ fontSize: 12.5, color: C.faint }}>Days save automatically as you log — see the History tab.</span>
                    {saveMsg && <span className="na-mono" style={{ fontSize: 12.5, color: C.ok }}>{saveMsg}</span>}
                  </div>

                  <p style={{ fontSize: 12, color: C.faint, paddingBottom: 14, marginTop: 0, lineHeight: 1.55 }}>
                    Note: custom items track only the nutrients entered, so micronutrient
                    totals may understate actual intake when custom foods are used.
                  </p>
                </>
              )}

              {/* ---------- Custom tracked nutrients ---------- */}
              <div className="na-eyebrow" style={{ margin: "14px 0 2px" }}>Your custom nutrients</div>
              {Object.keys(customNutrients).length === 0 && (
                <p style={{ fontSize: 13, color: C.faint, margin: "8px 0 10px" }}>
                  Track anything the standard panel doesn't cover — omega-3s, magnesium,
                  zinc, caffeine, water. Add one below.
                </p>
              )}
              {Object.values(customNutrients).map(cn => (
                <div key={cn.id}>
                  <Gauge label={cn.name} value={totals[cn.id] || 0} target={cn.target} unit={cn.unit} dp={1} isLimit={!!cn.limit} />
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", padding: "8px 0 4px" }}>
                    <input className="na-input" type="number" min="0" step="any" defaultValue=""
                      placeholder={`Amount (${cn.unit})`} style={{ width: 130, padding: "6px 10px", fontSize: 13 }}
                      id={`cnq-${cn.id}`} aria-label={`Amount of ${cn.name} to log`} />
                    <button className="na-btn" style={{ padding: "7px 14px", fontSize: 12.5 }}
                      onClick={() => {
                        const el = document.getElementById(`cnq-${cn.id}`);
                        quickLogCustom(cn, el && el.value);
                        if (el) el.value = "";
                      }}>
                      Log amount
                    </button>
                    <button className="na-btn na-btn-quiet" style={{ padding: "7px 14px", fontSize: 12.5, color: C.high }}
                      onClick={() => deleteCustomNutrient(cn.id)}>
                      Stop tracking
                    </button>
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", padding: "10px 0 14px" }}>
                <div style={{ flex: "1 1 230px", maxWidth: 340 }}>
                  <Field label="Add a nutrient" note="Reference amounts: NIH Dietary Reference Intakes; AHA/EFSA for omega-3; FDA limit for caffeine.">
                    <select className="na-select" value={newNutrient.presetKey || (newNutrient.custom ? "custom" : "")}
                      onChange={e => {
                        const v = e.target.value;
                        if (v === "custom") { setNewNutrient({ name: "", unit: "g", target: "", presetKey: null, limit: false, custom: true }); return; }
                        if (!v) { setNewNutrient({ name: "", unit: "g", target: "", presetKey: null, limit: false, custom: false }); return; }
                        const pn = PRESET_NUTRIENTS.find(x => x.key === v);
                        const t = profile.sex === "male" ? pn.m : profile.sex === "female" ? pn.f : Math.round(((pn.m + pn.f) / 2) * 100) / 100;
                        setNewNutrient({ name: pn.name, unit: pn.unit, target: String(t), presetKey: pn.key, limit: !!pn.limit, custom: false });
                      }}>
                      <option value="">Choose a researched nutrient…</option>
                      {PRESET_NUTRIENTS.map(pn => (
                        <option key={pn.key} value={pn.key}>
                          {pn.name} — {pn.limit ? "limit" : "ref."} {profile.sex === "male" ? pn.m : profile.sex === "female" ? pn.f : `${pn.f}–${pn.m}`} {pn.unit} · {pn.src}
                        </option>
                      ))}
                      <option value="custom">Custom — not listed…</option>
                    </select>
                  </Field>
                </div>
                {newNutrient.custom && (
                  <div style={{ flex: "1 1 140px", maxWidth: 200 }}>
                    <Field label="Nutrient name">
                      <input className="na-input" value={newNutrient.name}
                        onChange={e => setNewNutrient(n => ({ ...n, name: e.target.value }))}
                        placeholder="e.g. Lutein" />
                    </Field>
                  </div>
                )}
                {(newNutrient.custom || newNutrient.presetKey) && (
                  <>
                    <div style={{ width: 84 }}>
                      <Field label="Unit">
                        <input className="na-input" value={newNutrient.unit}
                          onChange={e => setNewNutrient(n => ({ ...n, unit: e.target.value }))} placeholder="g" />
                      </Field>
                    </div>
                    <div style={{ width: 130 }}>
                      <Field label={newNutrient.limit ? "Daily limit" : "Daily target"}>
                        <input className="na-input" type="number" min="0" step="any" value={newNutrient.target}
                          onChange={e => setNewNutrient(n => ({ ...n, target: e.target.value }))} placeholder="1.5" />
                      </Field>
                    </div>
                  </>
                )}
                <button className="na-btn" onClick={addCustomNutrient}
                  disabled={!newNutrient.name.trim() || !(Number(newNutrient.target) > 0)}
                  style={{ opacity: newNutrient.name.trim() && Number(newNutrient.target) > 0 ? 1 : 0.45 }}>
                  Track it
                </button>
              </div>
              <p style={{ fontSize: 11.5, color: C.faint, margin: "0 0 8px", lineHeight: 1.5 }}>
                Foods you search, scan, or import are auto-credited for these nutrients when
                they match the built-in research library (e.g. salmon → omega-3, almonds →
                magnesium & vitamin E). Coverage is approximate and not exhaustive, so quick-log
                supplements or label amounts to fill gaps. Reference amounts are general adult
                values — adjust per your clinician's advice.
              </p>
            </section>

            {/* ---------- 04 Recommendations ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <SectionHead num="04" title="Meal recommendations"
                sub={recommendations.mode === "plan"
                  ? "Nothing logged yet — here is a sample day designed to meet the full nutrient panel. Tap a title to find full recipes on Google."
                  : recommendations.mode === "met"
                    ? "All tracked nutrients are at or near target."
                    : "Meals selected to close today's remaining gaps. Tap a title to find full recipes on Google."} />

              {recommendations.mode === "catchup" && (
                <p style={{ marginTop: 0, fontSize: 13.5 }}>
                  Currently below 80% of target:{" "}
                  {deficits.map((k, i) => (
                    <strong key={k} style={{ color: C.low }}>{LABELS[k]}{i < deficits.length - 1 ? ", " : ""}</strong>
                  ))}
                </p>
              )}
              {recommendations.mode === "met" && (
                <p style={{ marginTop: 0, fontSize: 13.5, color: C.ok, fontWeight: 600 }}>
                  Nice work — today's log meets every tracked target. No catch-up meals needed.
                </p>
              )}
              {recommendations.recipes.length > 0 && (
                <div style={{ display: "grid", gap: 12 }}>
                  {recommendations.recipes.map(r => (
                    <RecipeCard key={r.name} recipe={r} deficits={recommendations.mode === "catchup" ? deficits : null} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <footer style={{ fontSize: 12, color: C.faint, lineHeight: 1.6, borderTop: `1px solid ${C.rule}`, paddingTop: 14 }}>
          Reference values are general guidance adapted from the U.S. Dietary Reference
          Intakes (National Academies) and Dietary Guidelines for Americans. Food
          composition data provided by USDA FoodData Central (fdc.nal.usda.gov);
          built-in quick-list figures are approximate. This tool is for informational purposes
          only and is not medical or dietetic advice; consult a registered dietitian or
          physician for individualized guidance.
        </footer>
      </main>
    </div>
  );
}
