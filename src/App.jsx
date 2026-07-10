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
  return food;
}

async function searchFdc(query, apiKey) {
  const url = `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(apiKey || "DEMO_KEY")}` +
    `&query=${encodeURIComponent(query)}&pageSize=8&dataType=Foundation,SR%20Legacy,Branded`;
  const res = await fetch(url);
  if (res.status === 429) throw new Error("Rate limit reached — add your own free API key.");
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
  };
}

async function lookupBarcode(code, apiKey) {
  try {
    const foods = await searchFdc(code, apiKey);
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
  kcal: "Energy", protein: "Protein", fiber: "Dietary fiber", calcium: "Calcium",
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

async function loadHistory() {
  try {
    if (typeof window !== "undefined" && window.storage) {
      const r = await window.storage.get(HKEY);
      if (r && r.value) return JSON.parse(r.value);
    }
  } catch (e) { /* key missing or unavailable */ }
  try {
    const v = window.localStorage && window.localStorage.getItem(HKEY);
    if (v) return JSON.parse(v);
  } catch (e) { /* blocked */ }
  return memStore[HKEY] || {};
}

async function saveHistory(hist) {
  const json = JSON.stringify(hist);
  memStore[HKEY] = hist;
  try { if (typeof window !== "undefined" && window.storage) { await window.storage.set(HKEY, json); return "cloud"; } } catch (e) {}
  try { window.localStorage.setItem(HKEY, json); return "local"; } catch (e) {}
  return "memory";
}

/* ------------------------------------------------------------------ */
/*  Design tokens                                                     */
/* ------------------------------------------------------------------ */

const C = {
  ink: "#182430", navy: "#1E3A55", rule: "#D7DEE5", paper: "#F6F8F9",
  panel: "#FFFFFF", faint: "#5B6B79", ok: "#1E7145", low: "#9A6A12",
  high: "#A63A2B", accent: "#0F6E7C",
};

const css = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,600;8..60,700&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap');
* { box-sizing: border-box; }
.na-root { font-family: 'Public Sans', system-ui, sans-serif; color: ${C.ink}; background: ${C.paper}; min-height: 100vh; }
.na-serif { font-family: 'Source Serif 4', Georgia, serif; }
.na-mono { font-family: 'IBM Plex Mono', monospace; font-variant-numeric: tabular-nums; }
.na-eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: ${C.faint}; }
.na-input, .na-select { font: inherit; font-size: 14px; padding: 9px 10px; border: 1px solid ${C.rule}; border-radius: 3px; background: #fff; color: ${C.ink}; width: 100%; }
.na-input:focus, .na-select:focus, .na-btn:focus, .na-tab:focus, .na-acc:focus { outline: 2px solid ${C.accent}; outline-offset: 1px; }
.na-btn { font: inherit; font-size: 13px; font-weight: 600; padding: 9px 16px; cursor: pointer; border: 1px solid ${C.navy}; background: ${C.navy}; color: #fff; border-radius: 3px; }
.na-btn:hover { background: #2A4B6B; }
.na-btn-quiet { background: #fff; color: ${C.navy}; }
.na-btn-quiet:hover { background: ${C.paper}; }
.na-panel { background: ${C.panel}; border: 1px solid ${C.rule}; border-radius: 4px; }
.na-tab { font: inherit; font-size: 13px; font-weight: 600; padding: 12px 4px; background: none; border: none; border-bottom: 3px solid transparent; color: rgba(255,255,255,0.65); cursor: pointer; white-space: nowrap; }
.na-tab[aria-selected="true"] { color: #fff; border-bottom-color: #fff; }
.na-tab:hover { color: #fff; }
.na-acc { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 14px 4px; background: none; border: none; cursor: pointer; font: inherit; font-size: 15px; font-weight: 600; color: ${C.ink}; text-align: left; }
@media (prefers-reduced-motion: reduce) { .na-bar-fill { transition: none !important; } }
`;

/* ------------------------------------------------------------------ */
/*  Shared components                                                 */
/* ------------------------------------------------------------------ */

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
      <div style={{ position: "relative", height: 10, background: "#EDF1F4", borderRadius: 2 }}>
        <div className="na-bar-fill" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(width / 130) * 100}%`, background: color, borderRadius: 2, transition: "width 0.5s ease" }} />
        <div style={{ position: "absolute", left: `${(100 / 130) * 100}%`, top: -3, bottom: -3, width: 2, background: C.navy }} />
      </div>
    </div>
  );
}

function RecipeCard({ recipe, deficits }) {
  const helps = deficits ? recipe.richIn.filter(k => deficits.includes(k)) : recipe.richIn;
  return (
    <div style={{ border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 3, padding: "14px 16px", background: "#fff" }}>
      <div className="na-eyebrow" style={{ color: C.accent, marginBottom: 4 }}>{recipe.meal}</div>
      <h3 className="na-serif" style={{ margin: "0 0 6px", fontSize: 16.5, fontWeight: 700 }}>{recipe.name}</h3>
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
/*  Tab: Nutrient reference                                           */
/* ------------------------------------------------------------------ */

function ReferenceTab({ targets }) {
  const [open, setOpen] = useState(null);
  const targetFor = (k) => k === "sodium" ? `limit ${targets.sodiumLimit.toLocaleString()} mg` :
    k === "protein" ? `${targets.protein} g` : k === "fiber" ? `${targets.fiber} g` :
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

function HistoryTab({ history }) {
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
          No saved days in this window yet. On the Nutrition report tab, log your food and
          press "Save day to history" — trends appear here once you have a few days recorded.
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
                <div style={{ position: "relative", height: 8, background: "#EDF1F4", borderRadius: 2 }}>
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
  const [grams, setGrams] = useState(100);
  const [selected, setSelected] = useState(null);
  const [log, setLog] = useState([]);
  const [source, setSource] = useState("usda");
  const [apiKey, setApiKey] = useState("");
  const [usdaResults, setUsdaResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "", carb: "", fat: "", fiber: "", sodium: "" });
  const [history, setHistory] = useState({});
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => { loadHistory().then(setHistory); }, []);

  const targets = useMemo(() => computeTargets(profile), [profile]);

  const totals = useMemo(() => {
    const t = { ...ZERO };
    for (const item of log) for (const k of KEYS) t[k] += (item.food[k] || 0) * item.qty;
    return t;
  }, [log]);

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

  const addFood = () => {
    if (!selected) return;
    const multiplier = selected.per100g ? (Number(grams) || 100) / 100 : (Number(qty) || 1);
    setLog(l => [...l, { food: selected, qty: multiplier, id: Date.now() }]);
    setSelected(null); setQuery(""); setQty(1); setGrams(100); setUsdaResults([]);
  };

  const runUsdaSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearchError(""); setUsdaResults([]); setSelected(null);
    try {
      const foods = await searchFdc(query.trim(), apiKey.trim());
      setUsdaResults(foods);
      if (foods.length === 0) setSearchError("No matches found in FoodData Central.");
    } catch (err) {
      setSearchError(err.message + " You can switch to the built-in list as a fallback.");
    } finally { setSearching(false); }
  };

  const handleBarcode = async (code) => {
    setShowScanner(false);
    setScanStatus(`Looking up barcode ${code}…`);
    try {
      const food = await lookupBarcode(code, apiKey.trim());
      setSelected(food); setQuery(""); setUsdaResults([]);
      setScanStatus(`Found: ${food.name}. Set the amount in grams, then add to log.`);
    } catch (err) {
      setScanStatus("");
      setSearchError(err.message + " Try the search box or a custom item.");
    }
  };

  const addCustom = () => {
    if (!custom.name) return;
    const food = { ...ZERO, name: custom.name, serving: "1 serving" };
    for (const k of ["kcal", "protein", "carb", "fat", "fiber", "sodium"]) food[k] = Number(custom[k]) || 0;
    setLog(l => [...l, { food, qty: 1, id: Date.now() }]);
    setCustom({ name: "", kcal: "", protein: "", carb: "", fat: "", fiber: "", sodium: "" });
    setShowCustom(false);
  };

  const saveDay = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const pct = {};
    for (const k of [...TRACKED, "sodium"]) pct[k] = Math.round(pctOf(k));
    const next = { ...history, [today]: { totals: { ...totals }, pct } };
    setHistory(next);
    const where = await saveHistory(next);
    setSaveMsg(where === "memory"
      ? `Saved ${today} (this session only — no persistent storage available here).`
      : `Saved ${today} to history.`);
    setTimeout(() => setSaveMsg(""), 4000);
  };

  const fatKcal = totals.fat * 9, carbKcal = totals.carb * 4;
  const fatPct = totals.kcal ? (fatKcal / totals.kcal) * 100 : 0;
  const carbPct = totals.kcal ? (carbKcal / totals.kcal) * 100 : 0;

  const TABS = [
    ["report", "Nutrition report"],
    ["reference", "Nutrient reference"],
    ["history", "History"],
    ["fitness", "Fitness"],
  ];

  return (
    <div className="na-root">
      <style>{css}</style>

      <header style={{ background: C.navy, color: "#fff", padding: "26px 20px 0" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div aria-hidden style={{ width: 44, height: 44, border: "2px solid rgba(255,255,255,0.85)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="na-serif" style={{ fontSize: 19, fontWeight: 700 }}>Rx</span>
            </div>
            <div>
              <div className="na-eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>Dietary Reference Assessment</div>
              <h1 className="na-serif" style={{ margin: "2px 0 0", fontSize: 26, fontWeight: 700, lineHeight: 1.15 }}>
                Daily Nutrient Intake Report
              </h1>
            </div>
          </div>
          <nav role="tablist" style={{ display: "flex", gap: 22, marginTop: 18, overflowX: "auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className="na-tab" onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "26px 20px 40px", display: "grid", gap: 26 }}>

        {tab === "reference" && <ReferenceTab targets={targets} />}
        {tab === "history" && <HistoryTab history={history} />}
        {tab === "fitness" && <FitnessTab profile={profile} />}

        {tab === "report" && (
          <>
            {/* ---------- 01 Profile ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <SectionHead num="01" title="Subject profile" sub="Optional. Unanswered fields fall back to general adult reference values." />
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
                    </select>
                  </Field>
                </div>
                {source === "usda" && (
                  <div style={{ flex: "1 1 200px" }}>
                    <Field label="USDA API key (optional)" note="Defaults to DEMO_KEY (limited). Free keys at api.data.gov/signup">
                      <input className="na-input" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="DEMO_KEY" />
                    </Field>
                  </div>
                )}
              </div>

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
                <div style={{ width: 110 }}>
                  {selected && selected.per100g ? (
                    <Field label="Amount (g)">
                      <input className="na-input" type="number" min="1" step="1" value={grams} onChange={e => setGrams(e.target.value)} />
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
                          {item.food.per100g ? `${Math.round(item.qty * 100)} g` : item.qty}
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
                  <Gauge label="Energy" value={totals.kcal} target={targets.kcal} unit="kcal" />
                  <Gauge label="Protein" value={totals.protein} target={targets.protein} unit="g" dp={1} />
                  <Gauge label="Dietary fiber" value={totals.fiber} target={targets.fiber} unit="g" dp={1} />
                  <div style={{ padding: "12px 0", borderBottom: `1px solid ${C.rule}`, fontSize: 13.5 }}>
                    <span style={{ fontWeight: 600 }}>Energy distribution</span>
                    <span className="na-mono" style={{ color: C.faint, marginLeft: 12, fontSize: 12.5 }}>
                      Carbohydrate {carbPct.toFixed(0)}% (target 45–65%) · Fat {fatPct.toFixed(0)}% (target 20–35%)
                    </span>
                  </div>

                  <div className="na-eyebrow" style={{ margin: "18px 0 2px" }}>Micronutrients</div>
                  <Gauge label="Calcium" value={totals.calcium} target={targets.calcium} unit="mg" />
                  <Gauge label="Iron" value={totals.iron} target={targets.iron} unit="mg" dp={1} />
                  <Gauge label="Potassium" value={totals.potassium} target={targets.potassium} unit="mg" />
                  <Gauge label="Vitamin C" value={totals.vitC} target={targets.vitC} unit="mg" />
                  <Gauge label="Vitamin D" value={totals.vitD} target={targets.vitD} unit="mcg" dp={1} />

                  <div className="na-eyebrow" style={{ margin: "18px 0 2px" }}>Intake limits</div>
                  <Gauge label="Sodium" value={totals.sodium} target={targets.sodiumLimit} unit="mg" isLimit />

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 0" }}>
                    <button className="na-btn" onClick={saveDay}>Save day to history</button>
                    {saveMsg && <span className="na-mono" style={{ fontSize: 12.5, color: C.ok }}>{saveMsg}</span>}
                  </div>

                  <p style={{ fontSize: 12, color: C.faint, paddingBottom: 14, marginTop: 0, lineHeight: 1.55 }}>
                    Note: custom items track only the nutrients entered, so micronutrient
                    totals may understate actual intake when custom foods are used.
                  </p>
                </>
              )}
            </section>

            {/* ---------- 04 Recommendations ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <SectionHead num="04" title="Meal recommendations"
                sub={recommendations.mode === "plan"
                  ? "Nothing logged yet — here is a sample day designed to meet the full nutrient panel."
                  : recommendations.mode === "met"
                    ? "All tracked nutrients are at or near target."
                    : "Meals selected to close today's remaining gaps."} />

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
