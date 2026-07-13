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

  return { kcal, kcalBasis, protein, fiber, iron, calcium, potassium, vitC, vitD, sodiumLimit: 2300, sex };
}

/* ------------------------------------------------------------------ */
/*  Built-in quick list (per serving, approximate — USDA-derived)     */
/* ------------------------------------------------------------------ */

const FOODS = [
  // [name, serving, grams, kcal, protein, carb, fat, fiber, Ca, Fe, K, Na, vitC, vitD]
  // --- Breakfast & grains ---
  ["Oatmeal, cooked", "1 cup", 234, 166, 6, 28, 3.6, 4, 21, 2.1, 164, 9, 0, 0],
  ["Breakfast cereal, fortified", "1 cup", 28, 110, 2, 23, 1.5, 2, 130, 8, 95, 160, 6, 1],
  ["Granola", "1/2 cup", 61, 240, 6, 40, 7, 4, 40, 2, 210, 15, 0, 0],
  ["Whole-wheat bread", "1 slice", 32, 81, 4, 14, 1.1, 1.9, 52, 0.9, 81, 146, 0, 0],
  ["White bread", "1 slice", 29, 75, 2.6, 14, 1, 0.8, 73, 1, 33, 147, 0, 0],
  ["Bagel", "1 medium", 105, 289, 11, 56, 1.7, 2.4, 19, 3.8, 107, 561, 0, 0],
  ["English muffin", "1 whole", 57, 134, 4.4, 26, 1, 2, 93, 1.4, 75, 264, 0, 0],
  ["Croissant", "1 medium", 57, 231, 4.7, 26, 12, 1.5, 21, 1.2, 67, 266, 0, 0],
  ["Pancakes", "2 (4-inch)", 76, 175, 4.7, 22, 7.4, 0.9, 96, 1.3, 100, 440, 0, 0.2],
  ["Waffle, frozen", "1 waffle", 35, 95, 2.2, 15, 2.9, 0.8, 100, 1.8, 42, 212, 0, 0.9],
  ["Flour tortilla", "1 (8-inch)", 49, 146, 3.9, 24, 3.8, 1.4, 97, 1.6, 62, 364, 0, 0],
  ["Corn tortilla", "1 (6-inch)", 26, 52, 1.4, 10.7, 0.7, 1.5, 20, 0.3, 42, 11, 0, 0],
  ["Brown rice, cooked", "1 cup", 195, 218, 4.5, 46, 1.6, 3.5, 20, 0.8, 154, 2, 0, 0],
  ["White rice, cooked", "1 cup", 186, 205, 4.3, 45, 0.4, 0.6, 16, 1.9, 55, 2, 0, 0],
  ["Quinoa, cooked", "1 cup", 185, 222, 8.1, 39, 3.6, 5.2, 31, 2.8, 318, 13, 0, 0],
  ["Couscous, cooked", "1 cup", 157, 176, 6, 36, 0.3, 2.2, 13, 0.6, 91, 8, 0, 0],
  ["Pasta, cooked", "1 cup", 140, 221, 8, 43, 1.3, 2.5, 10, 1.8, 63, 1, 0, 0],
  // --- Fruits ---
  ["Banana", "1 medium", 118, 105, 1.3, 27, 0.4, 3.1, 6, 0.3, 422, 1, 10, 0],
  ["Apple", "1 medium", 182, 95, 0.5, 25, 0.3, 4.4, 11, 0.2, 195, 2, 8, 0],
  ["Orange", "1 medium", 131, 62, 1.2, 15, 0.2, 3.1, 52, 0.1, 237, 0, 70, 0],
  ["Strawberries", "1 cup", 152, 49, 1, 11.7, 0.5, 3, 24, 0.6, 233, 2, 89, 0],
  ["Blueberries", "1 cup", 148, 84, 1.1, 21, 0.5, 3.6, 9, 0.4, 114, 1, 14, 0],
  ["Grapes", "1 cup", 151, 104, 1.1, 27, 0.2, 1.4, 15, 0.5, 288, 3, 5, 0],
  ["Watermelon", "1 cup", 152, 46, 0.9, 11.5, 0.2, 0.6, 11, 0.4, 170, 2, 12, 0],
  ["Pineapple", "1 cup", 165, 82, 0.9, 22, 0.2, 2.3, 21, 0.5, 180, 2, 79, 0],
  ["Mango", "1 cup", 165, 99, 1.4, 25, 0.6, 2.6, 18, 0.3, 277, 2, 60, 0],
  ["Peach", "1 medium", 150, 59, 1.4, 14, 0.4, 2.3, 9, 0.4, 285, 0, 10, 0],
  ["Pear", "1 medium", 178, 101, 0.6, 27, 0.2, 5.5, 16, 0.3, 206, 2, 8, 0],
  ["Cherries", "1 cup", 154, 97, 1.6, 25, 0.3, 3.2, 20, 0.6, 342, 0, 11, 0],
  ["Grapefruit", "1/2 fruit", 123, 52, 0.9, 13, 0.2, 2, 27, 0.1, 166, 0, 38, 0],
  ["Kiwi", "1 fruit", 69, 42, 0.8, 10, 0.4, 2.1, 23, 0.2, 215, 2, 64, 0],
  ["Raisins", "small box", 43, 129, 1.3, 34, 0.2, 1.6, 27, 0.8, 322, 5, 1, 0],
  ["Avocado", "1/2 fruit", 100, 161, 2, 8.5, 14.7, 6.7, 12, 0.6, 487, 7, 10, 0],
  // --- Vegetables ---
  ["Broccoli, cooked", "1 cup", 156, 55, 3.7, 11, 0.6, 5.1, 62, 1, 457, 64, 101, 0],
  ["Spinach, raw", "2 cups", 60, 14, 1.7, 2.2, 0.2, 1.3, 60, 1.6, 334, 47, 17, 0],
  ["Kale, raw", "2 cups", 42, 15, 1.4, 3, 0.3, 1.7, 63, 0.6, 143, 15, 25, 0],
  ["Carrot", "1 medium", 61, 25, 0.6, 6, 0.1, 1.7, 20, 0.2, 195, 42, 4, 0],
  ["Bell pepper", "1 medium", 119, 31, 1.2, 7.2, 0.4, 2.5, 8, 0.5, 251, 5, 152, 0],
  ["Cucumber", "1/2 cup", 52, 8, 0.3, 1.9, 0.1, 0.3, 8, 0.1, 76, 1, 1.5, 0],
  ["Zucchini, cooked", "1 cup", 180, 27, 2.1, 5, 0.6, 1.8, 32, 0.7, 475, 5, 15, 0],
  ["Cauliflower, cooked", "1 cup", 124, 29, 2.3, 5.1, 0.6, 2.9, 20, 0.4, 176, 19, 55, 0],
  ["Green beans, cooked", "1 cup", 125, 44, 2.4, 9.9, 0.4, 4, 55, 0.8, 182, 1, 12, 0],
  ["Peas, cooked", "1 cup", 160, 134, 8.6, 25, 0.4, 8.8, 43, 2.5, 434, 5, 23, 0],
  ["Corn on the cob", "1 ear", 90, 88, 3.3, 19, 1.4, 2, 2, 0.5, 250, 15, 6.8, 0],
  ["Mushrooms, cooked", "1 cup", 156, 44, 3.4, 8.3, 0.7, 3.4, 9, 2.7, 555, 3, 6, 0.4],
  ["Onion", "1/2 cup", 80, 32, 0.9, 7.5, 0.1, 1.4, 18, 0.2, 117, 3, 5.9, 0],
  ["Celery", "2 stalks", 80, 11, 0.6, 2.4, 0.1, 1.3, 32, 0.2, 208, 64, 2.5, 0],
  ["Asparagus, cooked", "1 cup", 180, 40, 4.3, 7.4, 0.4, 3.6, 41, 1.6, 403, 25, 14, 0],
  ["Cabbage, cooked", "1 cup", 150, 34, 1.9, 8.3, 0.1, 2.9, 72, 0.3, 294, 12, 56, 0],
  ["Kimchi", "1/2 cup", 75, 11, 0.8, 1.6, 0.4, 1.2, 24, 0.9, 130, 373, 2, 0],
  ["Beets, cooked", "1 cup", 170, 74, 2.9, 17, 0.3, 3.4, 27, 1.3, 518, 131, 6, 0],
  ["Tomato", "1 medium", 123, 22, 1.1, 4.8, 0.2, 1.5, 12, 0.3, 292, 6, 17, 0],
  ["Sweet potato, baked", "1 medium", 114, 103, 2.3, 24, 0.2, 3.8, 43, 0.8, 542, 41, 22, 0],
  ["Potato, baked w/ skin", "1 medium", 173, 161, 4.3, 37, 0.2, 3.8, 26, 1.9, 926, 17, 17, 0],
  ["Mixed green salad", "2 cups", 72, 18, 1.4, 3.4, 0.2, 1.8, 52, 1, 280, 20, 12, 0],
  // --- Proteins ---
  ["Egg, large", "1 egg", 50, 72, 6.3, 0.4, 4.8, 0, 28, 0.9, 69, 71, 0, 1.1],
  ["Chicken breast, cooked", "3 oz", 85, 140, 26, 0, 3, 0, 13, 0.9, 220, 63, 0, 0.1],
  ["Rotisserie chicken", "3 oz", 85, 152, 21, 0, 7.6, 0, 12, 0.8, 197, 320, 0, 0.1],
  ["Ground turkey, cooked", "3 oz", 85, 173, 23, 0, 8.5, 0, 21, 1.2, 221, 66, 0, 0.3],
  ["Turkey breast, roasted", "3 oz", 85, 125, 26, 0, 1.8, 0, 8, 0.7, 249, 49, 0, 0.1],
  ["Ground beef 90%, cooked", "3 oz", 85, 184, 22, 0, 10, 0, 15, 2.4, 305, 66, 0, 0.1],
  ["Sirloin steak, cooked", "3 oz", 85, 180, 25, 0, 8.2, 0, 15, 1.5, 285, 52, 0, 0.1],
  ["Pork chop, cooked", "3 oz", 85, 197, 26, 0, 9.7, 0, 24, 0.8, 318, 51, 0, 0.7],
  ["Bacon", "2 slices", 16, 87, 6, 0.2, 6.8, 0, 2, 0.2, 92, 370, 0, 0.1],
  ["Deli ham", "2 slices", 56, 61, 9.4, 1.5, 1.7, 0, 4, 0.5, 176, 590, 0, 0.4],
  ["Hot dog, beef", "1 frank", 57, 186, 7, 2, 17, 0, 9, 0.8, 90, 572, 0, 0.3],
  ["Pork sausage", "2 links", 54, 165, 9, 0.7, 14, 0, 9, 0.6, 152, 380, 0, 0.7],
  ["Salmon, cooked", "3 oz", 85, 175, 19, 0, 10.5, 0, 13, 0.3, 326, 52, 0, 11.1],
  ["Canned salmon", "3 oz", 85, 118, 17, 0, 5.1, 0, 181, 0.7, 277, 64, 0, 13.7],
  ["Tuna, canned in water", "3 oz", 85, 99, 22, 0, 0.7, 0, 9, 1.3, 201, 287, 0, 1.7],
  ["Sardines, canned", "1 can", 92, 191, 22.6, 0, 10.5, 0, 351, 2.7, 365, 465, 0, 4.4],
  ["Tilapia, cooked", "3 oz", 85, 109, 22, 0, 2.3, 0, 12, 0.6, 323, 48, 0, 3.7],
  ["Cod, cooked", "3 oz", 85, 89, 19, 0, 0.7, 0, 12, 0.4, 207, 66, 0, 1],
  ["Shrimp, cooked", "3 oz", 85, 84, 20, 0.2, 0.2, 0, 77, 0.3, 145, 94, 0, 0.1],
  ["Tofu, firm", "1/2 cup", 126, 98, 11, 2.4, 5.3, 1.5, 253, 2, 150, 9, 0, 0],
  ["Tempeh", "1/2 cup", 83, 160, 17, 6.4, 9, 3.5, 92, 2.2, 342, 7, 0, 0],
  ["Edamame, cooked", "1 cup", 155, 188, 18.5, 13.8, 8.1, 8.1, 98, 3.5, 676, 9, 9.5, 0],
  ["Black beans, cooked", "1/2 cup", 86, 114, 7.6, 20, 0.5, 7.5, 23, 1.8, 305, 1, 0, 0],
  ["Kidney beans, cooked", "1/2 cup", 89, 112, 7.7, 20, 0.4, 5.7, 31, 2, 358, 1, 1, 0],
  ["Chickpeas, cooked", "1/2 cup", 82, 134, 7.3, 22, 2.1, 6.2, 40, 2.4, 239, 6, 1, 0],
  ["Lentils, cooked", "1/2 cup", 99, 115, 9, 20, 0.4, 7.8, 19, 3.3, 365, 2, 1.5, 0],
  ["Hummus", "2 tbsp", 30, 78, 2.2, 4, 5.5, 1.5, 11, 0.7, 64, 114, 0, 0],
  ["Protein powder, whey", "1 scoop", 30, 120, 24, 3, 1, 1, 50, 0.5, 150, 60, 0, 0],
  // --- Dairy & alternatives ---
  ["Milk, 2%", "1 cup", 244, 122, 8, 12, 4.8, 0, 293, 0.1, 342, 95, 0, 2.9],
  ["Whole milk", "1 cup", 244, 149, 7.7, 11.7, 7.9, 0, 276, 0, 322, 105, 0, 2.7],
  ["Skim milk", "1 cup", 245, 83, 8.3, 12, 0.2, 0, 299, 0.1, 382, 103, 0, 2.9],
  ["Almond milk, unsweetened", "1 cup", 240, 37, 1, 1.4, 2.7, 0.5, 449, 0.7, 160, 176, 0, 2.4],
  ["Soy milk", "1 cup", 243, 105, 6.3, 12, 3.6, 0.5, 300, 1, 298, 115, 0, 2.9],
  ["Oat milk", "1 cup", 240, 120, 3, 16, 5, 2, 350, 0.3, 390, 100, 0, 3.6],
  ["Greek yogurt, plain", "1 cup", 245, 146, 20, 8, 3.8, 0, 230, 0.1, 282, 68, 0, 0],
  ["Cottage cheese", "1/2 cup", 113, 92, 12, 4.9, 2.6, 0, 94, 0.2, 118, 348, 0, 0],
  ["Cheddar cheese", "1 oz", 28, 114, 6.4, 0.9, 9.4, 0, 201, 0.1, 21, 180, 0, 0.2],
  ["Mozzarella", "1 oz", 28, 85, 6.3, 0.6, 6.3, 0, 143, 0.1, 21, 138, 0, 0.1],
  ["String cheese", "1 stick", 28, 80, 6, 1, 6, 0, 200, 0, 20, 200, 0, 0],
  ["Butter", "1 tbsp", 14, 102, 0.1, 0, 11.5, 0, 3, 0, 3, 91, 0, 0],
  ["Ice cream, vanilla", "1/2 cup", 66, 137, 2.3, 16, 7.3, 0.5, 84, 0.1, 131, 53, 0.4, 0.1],
  // --- Nuts, snacks & prepared ---
  ["Almonds", "1 oz (23 nuts)", 28, 164, 6, 6.1, 14.2, 3.5, 76, 1.1, 208, 0, 0, 0],
  ["Walnuts", "1 oz", 28, 185, 4.3, 3.9, 18.5, 1.9, 28, 0.8, 125, 1, 0, 0],
  ["Cashews", "1 oz", 28, 157, 5.2, 8.6, 12.4, 0.9, 10, 1.9, 187, 3, 0, 0],
  ["Peanut butter", "2 tbsp", 32, 188, 8, 6.3, 16.1, 1.9, 17, 0.6, 208, 152, 0, 0],
  ["Popcorn, air-popped", "3 cups", 24, 93, 3, 19, 1.1, 3.5, 2, 0.8, 79, 2, 0, 0],
  ["Potato chips", "1 oz", 28, 152, 1.8, 15, 9.8, 1.2, 7, 0.4, 361, 148, 5, 0],
  ["Pretzels", "1 oz", 28, 108, 2.9, 22, 0.8, 0.9, 10, 1.2, 41, 352, 0, 0],
  ["Saltine crackers", "5 crackers", 15, 62, 1.3, 11, 1.3, 0.4, 18, 0.8, 19, 140, 0, 0],
  ["Granola bar", "1 bar", 40, 190, 3, 28, 7, 2, 40, 1, 105, 105, 0, 0],
  ["Dark chocolate 70%", "1 oz", 28, 170, 2.2, 13, 12, 3.1, 20, 3.4, 200, 6, 0, 0],
  ["Instant ramen", "1 package", 85, 380, 8, 54, 14, 2, 20, 3.4, 180, 1560, 0, 0],
  ["Mac and cheese, boxed", "1 cup prepared", 230, 350, 10, 48, 12, 1.5, 110, 2, 180, 720, 0, 0],
  ["Cheese pizza", "1 slice", 107, 285, 12, 36, 10, 2.5, 220, 2.5, 184, 640, 2, 0],
  // --- Drinks & condiments ---
  ["Orange juice", "1 cup", 248, 112, 1.7, 26, 0.5, 0.5, 27, 0.5, 496, 2, 124, 0],
  ["Cola", "12 oz can", 355, 140, 0, 39, 0, 0, 7, 0, 4, 45, 0, 0],
  ["Coffee, black", "1 cup", 240, 2, 0.3, 0, 0, 0, 5, 0, 116, 5, 0, 0],
  ["Green tea", "1 cup", 245, 2, 0.5, 0, 0, 0, 0, 0, 20, 2, 0, 0],
  ["Beer", "12 oz", 356, 153, 1.6, 12.6, 0, 0, 14, 0, 96, 14, 0, 0],
  ["Red wine", "5 oz", 148, 125, 0.1, 3.8, 0, 0, 12, 0.7, 187, 6, 0, 0],
  ["Olive oil", "1 tbsp", 13.5, 119, 0, 0, 13.5, 0, 0, 0.1, 0, 0, 0, 0],
  ["Ketchup", "1 tbsp", 17, 17, 0.2, 4.5, 0, 0, 3, 0.1, 48, 154, 0.7, 0],
  ["Mayonnaise", "1 tbsp", 13, 94, 0.1, 0, 10, 0, 1, 0, 3, 88, 0, 0],
  ["Soy sauce", "1 tbsp", 16, 8, 1.3, 0.8, 0, 0.1, 3, 0.4, 38, 879, 0, 0],
  ["Salsa", "2 tbsp", 32, 9, 0.5, 2, 0, 0.5, 9, 0.2, 95, 192, 1, 0],
  ["Ranch dressing", "2 tbsp", 30, 129, 0.4, 1.8, 13.4, 0, 8, 0, 21, 270, 0, 0],
  ["Honey", "1 tbsp", 21, 64, 0, 17, 0, 0, 1, 0.1, 11, 1, 0, 0],
  ["Jam / jelly", "1 tbsp", 20, 56, 0, 14, 0, 0.2, 4, 0.1, 15, 6, 2, 0],
  ["Maple syrup", "1 tbsp", 20, 52, 0, 13, 0, 0, 20, 0, 42, 2, 0, 0],
].map(([name, serving, grams, ...n]) => ({
  name, serving, grams,
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

// Both sites live on the same origin (tkb789.github.io), so the recipe
// site's IndexedDB is directly readable here — no transfer needed.
// Read-only; gracefully returns [] if the database doesn't exist in this
// browser (e.g. the person hasn't opened the recipe site on this device).
function readCitrusRecipes() {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open("spicycitrus_db");
      let aborted = false;
      req.onupgradeneeded = (e) => { aborted = true; try { e.target.transaction.abort(); } catch (err) {} resolve([]); };
      req.onerror = () => resolve([]);
      req.onsuccess = () => {
        if (aborted) return;
        const db = req.result;
        if (!db.objectStoreNames.contains("recipes")) { db.close(); resolve([]); return; }
        try {
          const all = db.transaction("recipes", "readonly").objectStore("recipes").getAll();
          all.onsuccess = () => { resolve(all.result || []); db.close(); };
          all.onerror = () => { resolve([]); db.close(); };
        } catch (e) { db.close(); resolve([]); }
      };
    } catch (e) { resolve([]); }
  });
}

// Which recipe-book ingredients plausibly help each tracked nutrient —
// keyword heuristics, marked as approximate in the UI.
const DEFICIT_KEYWORDS = {
  protein: ["chicken", "beef", "pork", "turkey", "fish", "salmon", "tuna", "shrimp", "egg", "tofu", "tempeh", "bean", "lentil", "chickpea", "yogurt", "cheese"],
  fiber: ["bean", "lentil", "chickpea", "whole wheat", "whole-wheat", "oat", "quinoa", "brown rice", "broccoli", "berr", "pea", "cabbage", "barley"],
  calcium: ["milk", "cheese", "yogurt", "tofu", "sardine", "kale", "collard", "fortified", "almond"],
  iron: ["beef", "lentil", "spinach", "bean", "tofu", "chickpea", "sardine", "clam", "pork", "turkey"],
  potassium: ["potato", "sweet potato", "banana", "bean", "avocado", "spinach", "tomato", "salmon", "squash", "beet"],
  vitC: ["pepper", "orange", "lemon", "lime", "citrus", "broccoli", "strawberr", "tomato", "kiwi", "cabbage", "cauliflower"],
  vitD: ["salmon", "sardine", "mackerel", "trout", "tuna", "egg", "fortified", "mushroom"],
};

// Google-search recipe ideas per nutrient — a wider pool than the built-in
// cards. Pages draw from here without repeating phrases the user has skipped.
const GOOGLE_IDEAS = {
  protein: [
    "high protein chicken meal prep", "baked salmon recipe easy", "slow cooker pulled pork",
    "tofu stir fry high protein", "greek yogurt protein bowl", "turkey chili recipe",
    "sheet pan chicken and vegetables", "shrimp scampi recipe", "cottage cheese breakfast ideas",
    "egg white frittata recipe", "lean beef stir fry", "protein pasta bake",
    "grilled chicken marinade recipes", "salmon rice bowl", "high protein vegetarian dinner",
  ],
  fiber: [
    "high fiber lentil soup", "overnight oats with chia", "black bean tacos recipe",
    "roasted vegetable grain bowl", "barley mushroom soup", "chickpea salad sandwich",
    "split pea soup recipe", "three bean chili", "whole wheat pasta primavera",
    "quinoa tabbouleh recipe", "roasted brussels sprouts recipe", "bran muffin recipe healthy",
    "farro salad recipe", "edamame snack ideas", "artichoke dip healthy",
  ],
  calcium: [
    "yogurt smoothie recipes", "baked tofu with sesame", "sardine toast recipe",
    "kale caesar salad recipe", "cheesy broccoli bake", "chia pudding recipe",
    "spinach ricotta stuffed shells", "bok choy stir fry recipe", "cheese and white bean gratin",
    "collard greens recipe", "almond milk oatmeal", "salmon patties with bones",
    "paneer curry recipe", "greek yogurt tzatziki", "fortified cereal parfait",
  ],
  iron: [
    "beef and broccoli stir fry", "lentil curry dal recipe", "spinach and chickpea stew",
    "steak fajitas recipe", "clam pasta recipe", "tofu spinach scramble",
    "beef and barley soup", "liver and onions recipe", "mussels in white wine",
    "black bean burger recipe", "pumpkin seed pesto", "moroccan lamb tagine",
    "iron rich smoothie spinach", "beef stew with vegetables", "oyster stew recipe",
  ],
  potassium: [
    "loaded baked potato healthy", "white bean soup recipe", "banana oat pancakes",
    "avocado toast variations", "butternut squash soup", "salmon sweet potato bowl",
    "roasted root vegetables", "coconut water smoothie", "spinach and potato curry",
    "tomato basil soup recipe", "beet salad recipe", "swiss chard sauté",
    "lima bean succotash", "baked cod with tomatoes", "prune energy bites",
  ],
  vitC: [
    "stuffed bell peppers recipe", "citrus salad with fennel", "strawberry spinach salad",
    "garlic broccoli stir fry", "tomato gazpacho recipe", "kiwi smoothie recipes",
    "roasted cauliflower recipe", "mango salsa recipe", "brussels sprouts slaw",
    "papaya breakfast bowl", "cabbage stir fry recipe", "pineapple chicken skewers",
    "guava smoothie recipe", "snap pea salad", "orange fennel salad",
  ],
  vitD: [
    "sheet pan salmon dinner", "tuna poke bowl recipe", "mushroom omelette recipe",
    "sardine pasta puttanesca", "baked trout with lemon", "egg breakfast burrito",
    "herring salad recipe", "portobello mushroom burger", "salmon chowder recipe",
    "shakshuka recipe", "fortified milk latte recipe", "mackerel rice bowl",
    "quiche lorraine recipe", "cod fish tacos", "uv mushroom soup recipe",
  ],
};

// Pick up to 4 unused search ideas, round-robin across nutrients for variety.
function genSearchPage(keys, used) {
  // up to 6 unused ideas per page, round-robin across the nutrients in play
  const byK = {};
  for (const k of keys) {
    const arr = (GOOGLE_IDEAS[k] || []).filter(q => !used.has(q));
    if (arr.length) byK[k] = [...arr];
  }
  const ks = Object.keys(byK);
  const picks = [];
  let i = 0;
  while (picks.length < 6 && ks.length > 0) {
    const k = ks[i % ks.length];
    picks.push({ k, q: byK[k].shift() });
    if (byK[k].length === 0) ks.splice(i % ks.length, 1);
    else i++;
  }
  return picks;
}

function citrusRecipeHelps(recipe, deficits) {
  const text = (((recipe.ingredients || []).join(" ")) + " " + (recipe.title || "")).toLowerCase();
  return deficits.filter(k => (DEFICIT_KEYWORDS[k] || []).some(w => text.includes(w)));
}

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
  if (item.ingredients) food.ingredients = String(item.ingredients);
  if (typeof item.servingSize === "number" && item.servingSize > 0 &&
      /^(g|grm|gram|ml|mlt)/i.test(String(item.servingSizeUnit || ""))) {
    food.servingG = item.servingSize;
    food.servingText = item.householdServingFullText || `${item.servingSize} ${item.servingSizeUnit}`;
  }
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
  return {
    ...ZERO,
    name: p.product_name || "Unnamed product",
    serving: "100 g", per100g: true,
    kcal: Number(n["energy-kcal_100g"]) || 0,
    protein: g("proteins"), carb: g("carbohydrates"), fat: g("fat"), fiber: g("fiber"),
    calcium: g("calcium") * 1000, iron: g("iron") * 1000,
    potassium: g("potassium") * 1000, sodium: g("sodium") * 1000,
    vitC: g("vitamin-c") * 1000, vitD: g("vitamin-d") * 1e6,
    ingredients: p.ingredients_text ? String(p.ingredients_text) : undefined,
    servingG: Number(p.serving_quantity) > 0 ? Number(p.serving_quantity) : undefined,
    servingText: p.serving_size ? String(p.serving_size) : undefined,
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

const PRESET_INFO = {
  omega3: { role: "Long-chain omega-3 fats (EPA and DHA) support heart rhythm, triglyceride levels, and brain and eye function.", deficiency: "Low intake is linked to poorer cardiovascular markers; there's no classic deficiency syndrome for most people.", sources: "Salmon, sardines, mackerel, herring, anchovies; walnuts and flax provide the plant form (ALA)." },
  magnesium: { role: "Involved in 300+ enzyme reactions — muscle and nerve function, blood sugar, blood pressure, and bone.", deficiency: "Muscle cramps, fatigue, irritability; low levels are common with low vegetable and whole-grain intake.", sources: "Pumpkin seeds, almonds, cashews, dark chocolate, spinach, beans, whole grains, dates." },
  zinc: { role: "Supports immune function, wound healing, taste, and DNA synthesis.", deficiency: "Impaired immunity, slow healing, hair loss, reduced taste.", sources: "Oysters, beef, pumpkin seeds, cashews, chickpeas, cheese." },
  b12: { role: "Needed for red blood cell formation, nerve function, and DNA synthesis.", deficiency: "Fatigue, tingling, memory issues, anemia; a common gap in vegan diets and older adults.", sources: "Clams, sardines, salmon, beef, eggs, dairy, fortified foods." },
  folate: { role: "Supports cell division and is critical before and during early pregnancy to prevent neural-tube defects.", deficiency: "Anemia, fatigue; low intake in pregnancy raises birth-defect risk.", sources: "Edamame, spinach, lentils, chickpeas, asparagus, fortified grains." },
  vitE: { role: "A fat-soluble antioxidant protecting cell membranes.", deficiency: "Rare; can cause nerve and muscle problems in severe cases.", sources: "Sunflower seeds, almonds, hazelnuts, olive oil, avocado." },
  vitK: { role: "Essential for blood clotting and bone metabolism.", deficiency: "Easy bruising or bleeding; interacts with blood-thinning medication.", sources: "Parsley, spinach, collards, kale, broccoli, Brussels sprouts." },
  vitA: { role: "Supports vision, immune function, and skin; from retinol and beta-carotene.", deficiency: "Night blindness, dry eyes, frequent infections.", sources: "Liver, sweet potato, carrots, spinach, kale, cantaloupe." },
  selenium: { role: "An antioxidant mineral supporting thyroid function.", deficiency: "Rare; can affect thyroid and immunity.", sources: "Brazil nuts (very high — 1-2 daily is plenty), tuna, sardines, eggs." },
  choline: { role: "Supports liver function, brain development, and muscle movement.", deficiency: "Muscle and liver problems; needs rise in pregnancy.", sources: "Eggs, liver, salmon, beef, chicken, soybeans." },
  water: { role: "Regulates temperature, transports nutrients, and cushions joints. Counts all fluids and water-rich foods.", deficiency: "Thirst, dark urine, fatigue, headache; needs rise with heat and exercise.", sources: "Water, tea, coffee, milk, soups, and produce like watermelon, cucumber, and citrus." },
  caffeine: { role: "A stimulant that increases alertness. Tracked here as an upper limit, not a target.", deficiency: "Not a nutrient — no deficiency. Up to ~400 mg/day is generally safe for most adults; less in pregnancy.", sources: "Coffee, espresso, tea, energy drinks, cola, dark chocolate." },
};

const PRESET_NUTRIENTS = [
  { key: "omega3", name: "Omega-3", unit: "g", m: 0.5, f: 0.5, src: "AHA/EFSA ~0.25–0.5 g" },
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
  magnesium: [["pumpkin seed", 592], ["chia", 335], ["cashew", 292], ["almond", 270], ["dark chocolate", 228], ["peanut", 168], ["walnut", 158], ["oat", 138], ["whole-wheat", 76], ["whole wheat", 76], ["spinach", 79], ["black bean", 70], ["edamame", 64], ["quinoa", 64], ["date", 54], ["tofu", 53], ["salmon", 30], ["brown rice", 43], ["fig", 68], ["lentil", 36], ["potato", 23], ["avocado", 29], ["banana", 27], ["yogurt", 11], ["milk", 11]],
  zinc: [["oyster", 39], ["pumpkin seed", 7.8], ["crab", 6.5], ["beef", 6.3], ["cashew", 5.8], ["cheddar", 3.1], ["pork", 2.9], ["chickpea", 1.5], ["lentil", 1.3]],
  b12: [["clam", 99], ["sardine", 8.9], ["trout", 4.5], ["salmon", 3.2], ["beef", 2.6], ["tuna", 2.5], ["egg", 1.1], ["cheddar", 1.1], ["yogurt", 0.6], ["milk", 0.5]],
  folate: [["edamame", 311], ["spinach", 194], ["lentil", 181], ["chickpea", 172], ["black bean", 149], ["asparagus", 149], ["beet", 109], ["broccoli", 108], ["avocado", 81], ["orange", 30]],
  vitE: [["sunflower seed", 35], ["almond", 25.6], ["hazelnut", 15], ["olive oil", 14.4], ["peanut", 9.1], ["avocado", 2.1], ["spinach", 2.0]],
  vitK: [["parsley", 1640], ["spinach", 483], ["collard", 407], ["kale", 390], ["broccoli", 141], ["brussels", 140], ["romaine", 102], ["kiwi", 40]],
  vitA: [["beef liver", 9440], ["sweet potato", 961], ["carrot", 835], ["spinach", 469], ["kale", 241], ["cantaloupe", 169], ["red pepper", 157], ["egg", 160]],
  selenium: [["brazil nut", 1917], ["tuna", 90], ["sunflower seed", 53], ["sardine", 52], ["shrimp", 49], ["salmon", 41], ["egg", 30], ["chicken", 27], ["beef", 26], ["brown rice", 10]],
  choline: [["beef liver", 418], ["egg", 294], ["salmon", 91], ["beef", 85], ["cod", 84], ["chicken", 79], ["peanut", 63], ["brussels", 63], ["broccoli", 40], ["tofu", 27], ["milk", 17]],
  caffeine: [["espresso", 212], ["coffee", 40], ["energy drink", 32], ["black tea", 20], ["green tea", 12], ["dark chocolate", 80], ["cola", 8]],
  // water content in liters per 100 g (typical moisture of the food/drink)
  water: [["water", 0.1], ["sparkling", 0.099], ["coffee", 0.099], ["tea", 0.099], ["broth", 0.096], ["soup", 0.092], ["milk", 0.089], ["juice", 0.088], ["lemonade", 0.089], ["soda", 0.09], ["cola", 0.09], ["beer", 0.092], ["smoothie", 0.085], ["yogurt", 0.085], ["watermelon", 0.091], ["cucumber", 0.095], ["celery", 0.095], ["lettuce", 0.096], ["orange", 0.087], ["apple", 0.086], ["grape", 0.081], ["soup", 0.092]],
};

// Gram weights of each quick-list serving, derived from the food data,
// so per-100 g research-library values scale correctly.
const SERVING_GRAMS = Object.fromEntries(FOODS.map(f => [f.name, f.grams]));

/* ------------------------------------------------------------------ */
/*  Fast-food quick list. Figures are from chains' published nutrition */
/*  disclosures and are approximate: recipes, portions and regional    */
/*  variants change, so users are shown a verify-with-the-chain note   */
/*  and can edit any item to match what they actually received.        */
/*  "Standard" rows are cross-chain averages for when the exact chain  */
/*  is unknown — clearly labeled as estimates.                        */
/*  [chain, item, serving, grams, kcal, protein, carb, fat, fiber,     */
/*   calcium, iron, potassium, sodium, vitC, vitD]                     */
/* ------------------------------------------------------------------ */

const FAST_FOODS = [
  // McDonald's
  ["McDonald's", "Hamburger", "1 burger", 100, 250, 12, 31, 9, 1, 110, 2.5, 200, 510, 1, 0],
  ["McDonald's", "Cheeseburger", "1 burger", 114, 300, 15, 32, 13, 1, 200, 2.5, 210, 720, 1, 0.1],
  ["McDonald's", "Double Cheeseburger", "1 burger", 165, 450, 25, 34, 24, 2, 300, 3.5, 320, 1120, 1, 0.2],
  ["McDonald's", "Big Mac", "1 burger", 219, 590, 25, 46, 34, 3, 260, 4.5, 400, 1050, 1, 0.2],
  ["McDonald's", "Quarter Pounder with Cheese", "1 burger", 202, 520, 30, 42, 26, 2, 300, 4.5, 430, 1140, 2, 0.2],
  ["McDonald's", "McChicken", "1 sandwich", 143, 400, 14, 39, 21, 2, 90, 2.5, 220, 560, 1, 0],
  ["McDonald's", "Filet-O-Fish", "1 sandwich", 142, 390, 16, 39, 19, 2, 150, 2, 250, 580, 0, 0.3],
  ["McDonald's", "10 pc Chicken McNuggets", "10 pieces", 162, 410, 23, 25, 24, 1, 20, 1.5, 380, 800, 1, 0],
  ["McDonald's", "French Fries (medium)", "1 medium", 111, 320, 4, 43, 15, 4, 20, 1, 640, 260, 6, 0],
  ["McDonald's", "Egg McMuffin", "1 sandwich", 135, 310, 17, 30, 13, 2, 300, 2.5, 230, 770, 0, 1.5],
  ["McDonald's", "Sausage McMuffin with Egg", "1 sandwich", 163, 480, 20, 30, 31, 2, 300, 3, 260, 830, 0, 1.8],
  ["McDonald's", "Hash Browns", "1 piece", 53, 140, 1, 18, 8, 2, 0, 0.3, 240, 310, 2, 0],
  // Taco Bell
  ["Taco Bell", "Crunchy Taco", "1 taco", 78, 170, 8, 13, 9, 3, 80, 1, 140, 300, 1, 0],
  ["Taco Bell", "Soft Taco (beef)", "1 taco", 99, 180, 9, 18, 9, 3, 100, 1.5, 170, 500, 1, 0],
  ["Taco Bell", "Bean Burrito", "1 burrito", 198, 350, 13, 54, 9, 9, 200, 3, 400, 1000, 2, 0],
  ["Taco Bell", "Burrito Supreme (beef)", "1 burrito", 248, 390, 16, 51, 14, 7, 200, 3, 450, 1090, 3, 0],
  ["Taco Bell", "Crunchwrap Supreme", "1 wrap", 254, 530, 16, 71, 21, 6, 200, 3.5, 400, 1210, 3, 0],
  ["Taco Bell", "Quesadilla (chicken)", "1 quesadilla", 184, 510, 26, 40, 27, 3, 600, 2.5, 350, 1250, 1, 0.3],
  ["Taco Bell", "Nachos BellGrande", "1 order", 322, 740, 16, 82, 38, 12, 200, 3, 600, 1080, 3, 0],
  ["Taco Bell", "Cinnamon Twists", "1 order", 35, 170, 1, 27, 6, 1, 0, 0.5, 30, 210, 0, 0],
  // Panda Express (entrée portions)
  ["Panda Express", "Orange Chicken", "1 entrée", 156, 490, 25, 51, 23, 2, 20, 1.5, 300, 820, 2, 0],
  ["Panda Express", "Beijing Beef", "1 entrée", 179, 480, 14, 46, 27, 2, 40, 2, 380, 660, 6, 0],
  ["Panda Express", "Broccoli Beef", "1 entrée", 176, 150, 9, 13, 7, 2, 40, 1.5, 350, 520, 30, 0],
  ["Panda Express", "Kung Pao Chicken", "1 entrée", 176, 290, 16, 14, 19, 2, 40, 1.5, 380, 970, 15, 0],
  ["Panda Express", "Honey Walnut Shrimp", "1 entrée", 110, 360, 13, 27, 23, 2, 60, 1, 200, 440, 2, 0],
  ["Panda Express", "Grilled Teriyaki Chicken", "1 entrée", 168, 300, 33, 8, 13, 0, 20, 1.5, 380, 630, 2, 0],
  ["Panda Express", "Chow Mein", "1 side", 269, 510, 13, 80, 20, 6, 60, 4, 400, 860, 9, 0],
  ["Panda Express", "Fried Rice", "1 side", 265, 520, 11, 85, 16, 4, 40, 3, 250, 850, 4, 0.2],
  ["Panda Express", "Super Greens", "1 side", 156, 90, 6, 10, 3, 5, 100, 1.5, 500, 260, 90, 0],
  // Popeyes
  ["Popeyes", "Chicken Sandwich (classic)", "1 sandwich", 219, 700, 28, 50, 42, 2, 100, 3, 300, 1443, 1, 0],
  ["Popeyes", "Spicy Chicken Sandwich", "1 sandwich", 219, 700, 28, 50, 42, 2, 100, 3, 300, 1470, 1, 0],
  ["Popeyes", "Chicken Breast (bone-in, mild)", "1 piece", 200, 530, 35, 16, 35, 1, 40, 2, 350, 1220, 0, 0.2],
  ["Popeyes", "Chicken Thigh (bone-in, mild)", "1 piece", 108, 280, 14, 7, 22, 1, 20, 1, 190, 630, 0, 0.1],
  ["Popeyes", "Cajun Fries (regular)", "1 regular", 129, 380, 5, 47, 19, 4, 20, 1, 700, 1120, 6, 0],
  ["Popeyes", "Red Beans & Rice (regular)", "1 regular", 152, 230, 6, 30, 10, 6, 40, 1.5, 300, 680, 1, 0],
  ["Popeyes", "Biscuit", "1 biscuit", 60, 260, 4, 26, 15, 1, 40, 1.5, 60, 580, 0, 0],
  // In-N-Out
  ["In-N-Out", "Hamburger (with onion)", "1 burger", 243, 390, 16, 39, 19, 3, 40, 3, 350, 650, 6, 0],
  ["In-N-Out", "Cheeseburger (with onion)", "1 burger", 268, 480, 22, 39, 27, 3, 200, 3, 370, 1000, 6, 0.1],
  ["In-N-Out", "Double-Double", "1 burger", 330, 670, 37, 39, 41, 3, 350, 4, 500, 1440, 6, 0.2],
  ["In-N-Out", "Protein Style Cheeseburger", "1 burger", 246, 330, 18, 11, 25, 3, 200, 1.5, 350, 720, 6, 0.1],
  ["In-N-Out", "French Fries", "1 order", 125, 370, 5, 52, 15, 2, 20, 1, 800, 245, 9, 0],
  // Chick-fil-A
  ["Chick-fil-A", "Chicken Sandwich", "1 sandwich", 183, 440, 29, 41, 17, 2, 80, 3, 320, 1400, 2, 0],
  ["Chick-fil-A", "Spicy Chicken Sandwich", "1 sandwich", 185, 450, 29, 42, 19, 2, 80, 3, 320, 1650, 2, 0],
  ["Chick-fil-A", "8 pc Nuggets", "8 pieces", 113, 250, 27, 11, 11, 0, 20, 1, 300, 1210, 0, 0],
  ["Chick-fil-A", "Waffle Fries (medium)", "1 medium", 125, 420, 5, 45, 24, 5, 20, 1, 700, 240, 6, 0],
  ["Chick-fil-A", "Grilled Chicken Sandwich", "1 sandwich", 210, 390, 28, 44, 12, 4, 100, 3, 400, 770, 3, 0],
  // Wendy's
  ["Wendy's", "Dave's Single", "1 burger", 228, 590, 29, 39, 34, 2, 200, 4, 400, 1210, 2, 0.2],
  ["Wendy's", "Jr. Cheeseburger", "1 burger", 129, 290, 15, 26, 14, 1, 150, 2.5, 220, 610, 1, 0.1],
  ["Wendy's", "Spicy Chicken Sandwich", "1 sandwich", 225, 500, 29, 48, 21, 3, 80, 3, 350, 1120, 3, 0],
  ["Wendy's", "Chili (small)", "1 small", 227, 240, 19, 23, 7, 6, 80, 3, 600, 880, 3, 0],
  ["Wendy's", "Fries (medium)", "1 medium", 142, 350, 5, 47, 16, 5, 20, 1, 800, 400, 9, 0],
  // Burger King
  ["Burger King", "Whopper", "1 burger", 270, 660, 28, 49, 40, 2, 100, 4.5, 450, 980, 6, 0.1],
  ["Burger King", "Cheeseburger", "1 burger", 133, 300, 15, 27, 14, 1, 150, 2.5, 220, 690, 1, 0.1],
  ["Burger King", "Chicken Fries (9 pc)", "9 pieces", 138, 430, 20, 30, 25, 2, 20, 1.5, 300, 1090, 0, 0],
  ["Burger King", "Fries (medium)", "1 medium", 116, 380, 4, 53, 17, 4, 20, 1, 640, 570, 6, 0],
  // Subway (6-inch)
  ["Subway", "6\" Turkey Breast", "6-inch", 219, 280, 18, 46, 3.5, 5, 100, 3, 350, 810, 9, 0],
  ["Subway", "6\" Italian B.M.T.", "6-inch", 245, 410, 20, 46, 16, 5, 150, 3, 350, 1260, 9, 0],
  ["Subway", "6\" Meatball Marinara", "6-inch", 337, 480, 21, 62, 17, 8, 200, 5, 600, 1120, 6, 0],
  ["Subway", "6\" Oven Roasted Chicken", "6-inch", 232, 320, 24, 45, 5, 5, 100, 3, 400, 630, 9, 0],
  // KFC
  ["KFC", "Original Recipe Chicken Breast", "1 piece", 161, 390, 39, 11, 21, 0, 40, 1.5, 400, 1190, 0, 0.2],
  ["KFC", "Original Recipe Drumstick", "1 piece", 59, 130, 12, 4, 8, 0, 20, 0.5, 130, 350, 0, 0.1],
  ["KFC", "Chicken Sandwich", "1 sandwich", 218, 650, 29, 49, 35, 3, 80, 3, 350, 1300, 1, 0],
  ["KFC", "Mashed Potatoes with Gravy", "1 side", 151, 130, 2, 20, 4.5, 1, 20, 0.5, 300, 530, 0, 0],
  ["KFC", "Coleslaw", "1 side", 130, 170, 1, 22, 9, 3, 40, 0.3, 200, 180, 24, 0],
  // Chipotle (common build components)
  ["Chipotle", "Chicken Burrito Bowl (typical)", "1 bowl", 500, 625, 45, 60, 22, 10, 200, 4, 900, 1500, 12, 0],
  ["Chipotle", "Chicken (4 oz)", "1 serving", 113, 180, 32, 0, 7, 0, 20, 1, 350, 310, 0, 0],
  ["Chipotle", "White Rice", "1 serving", 113, 210, 4, 40, 4, 1, 20, 1.5, 40, 350, 1, 0],
  ["Chipotle", "Black Beans", "1 serving", 130, 130, 8, 22, 1.5, 7, 80, 2, 350, 210, 1, 0],
  ["Chipotle", "Guacamole", "1 serving", 114, 230, 2, 8, 22, 6, 20, 0.8, 500, 370, 8, 0],
  // Starbucks (food)
  ["Starbucks", "Bacon & Gouda Sandwich", "1 sandwich", 128, 360, 18, 31, 18, 1, 200, 2, 200, 800, 0, 0.5],
  ["Starbucks", "Spinach Feta Wrap", "1 wrap", 128, 290, 20, 34, 8, 3, 200, 3, 350, 830, 3, 0.4],
  ["Starbucks", "Grande Latte (2% milk)", "16 fl oz", 473, 190, 13, 19, 7, 0, 450, 0.1, 600, 170, 0, 3.5],
  ["Starbucks", "Grande Caffè Americano", "16 fl oz", 473, 15, 1, 2, 0, 0, 20, 0.1, 240, 10, 0, 0],
  // Averaged "standard" items — used when the chain isn't specified
  ["Standard (avg)", "Cheeseburger (fast-food average)", "1 burger", 150, 350, 18, 33, 17, 2, 190, 3, 280, 800, 2, 0.1],
  ["Standard (avg)", "Hamburger (fast-food average)", "1 burger", 130, 290, 15, 32, 12, 2, 90, 2.7, 250, 570, 2, 0],
  ["Standard (avg)", "Double cheeseburger (average)", "1 burger", 220, 560, 30, 38, 33, 2, 280, 4, 400, 1200, 2, 0.2],
  ["Standard (avg)", "Fried chicken sandwich (average)", "1 sandwich", 210, 600, 28, 47, 33, 2, 90, 3, 320, 1350, 1, 0],
  ["Standard (avg)", "Grilled chicken sandwich (average)", "1 sandwich", 200, 380, 29, 42, 11, 3, 90, 3, 380, 900, 2, 0],
  ["Standard (avg)", "French fries, medium (average)", "1 medium", 120, 365, 4.5, 48, 17, 4, 20, 1, 700, 350, 7, 0],
  ["Standard (avg)", "Chicken nuggets, 10 pc (average)", "10 pieces", 150, 400, 24, 22, 24, 1, 20, 1.3, 350, 900, 0.5, 0],
  ["Standard (avg)", "Beef taco (average)", "1 taco", 90, 175, 8.5, 15, 9, 3, 90, 1.2, 155, 400, 1, 0],
  ["Standard (avg)", "Burrito, beef & bean (average)", "1 burrito", 230, 380, 15, 52, 12, 8, 200, 3, 430, 1050, 2, 0],
  ["Standard (avg)", "Cheese pizza slice (average)", "1 slice", 107, 285, 12, 36, 10, 2, 220, 2.5, 184, 640, 2, 0],
  ["Standard (avg)", "Milkshake, medium (average)", "1 medium", 350, 530, 12, 86, 15, 1, 450, 0.5, 700, 300, 2, 1],
  ["Standard (avg)", "Cola, medium fountain (average)", "1 medium", 620, 210, 0, 58, 0, 0, 10, 0, 5, 60, 0, 0],
].map(([chain, item, serving, grams, ...n]) => ({
  name: `${item} — ${chain}`,
  chain, fastFood: true, serving, grams,
  kcal: n[0], protein: n[1], carb: n[2], fat: n[3], fiber: n[4],
  calcium: n[5], iron: n[6], potassium: n[7], sodium: n[8], vitC: n[9], vitD: n[10],
}));


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

// Rotate through a ranked list so "show different ideas" cycles instead of repeats.
function rotatePick(list, seed, n = 3) {
  if (list.length === 0) return [];
  const off = (seed * n) % list.length;
  return Array.from({ length: Math.min(n, list.length) }, (_, i) => list[(off + i) % list.length]);
}

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
const VKEY = "nutrition-ui-v1";
const XKEY = "nutrition-custom-foods-v1";
const RFKEY = "nutrition-recent-foods-v1";

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
.na-root { font-family: 'Inter', system-ui, sans-serif; color: ${C.ink}; background: ${C.paper}; min-height: 100vh; overflow-x: hidden; }
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


/* ------------------------------------------------------------------ */
/*  Meal-pattern tips — foods whose main concern is the overall       */
/*  pattern (sodium, refined carbs, few vegetables) rather than any   */
/*  single watchlist additive. Matched by product name. Tone:         */
/*  crave-friendly boosts and swaps, never guilt.                     */
/* ------------------------------------------------------------------ */

const MEAL_PATTERNS = [
  { match: ["instant ramen", "ramen", "instant noodle", "cup noodle", "cup of noodle", "udon bowl"],
    title: "Craving a brothy, carby bowl?",
    text: "Instant noodles' real watch-outs are sodium (often 1,500+ mg per packet, mostly in the seasoning) and the missing vegetables — not a scary additive.",
    tips: ["Use half (or less) of the seasoning packet", "Drop in an egg, frozen veggies, spinach, or leftover chicken while it cooks", "Add fruit or a side salad for the nutrient boost"],
    searches: ["easy homemade ramen broth", "miso soup with noodles recipe", "15 minute pho recipe"] },
  { match: ["hot dog", "frankfurter", "bologna", "deli ham", "lunch meat", "luncheon"],
    title: "Craving cured or deli meats?",
    text: "Traditional dry-cured versions (Spanish jamón, Prosciutto di Parma) often skip curing additives, though they cost more — if that's not practical, keeping portions and frequency modest matters most.",
    tips: ["Pile the sandwich with vegetables to shift the ratio", "Roast a chicken or turkey breast on the weekend for the week's sandwiches"],
    searches: ["homemade beef jerky oven", "roast turkey breast for sandwiches"] },
  { match: ["soda", "cola", "energy drink", "sports drink"],
    title: "Craving something cold and sweet?",
    text: "The concern here is simply added sugar (and caffeine in energy drinks), which adds up fast in liquid form.",
    tips: ["Try sparkling water with fruit or a splash of juice", "A smaller can of the real thing beats forcing a swap you hate"],
    searches: ["homemade soda syrup recipe", "agua fresca recipes"] },
  { match: ["potato chips", "crisps", "tortilla chips", "cheese puff"],
    title: "Craving salty and crunchy?",
    text: "Chips are mostly a sodium-and-portion story — the bag decides the serving unless you do.",
    tips: ["Portion into a bowl instead of eating from the bag", "Nuts, popcorn, or roasted chickpeas scratch the same itch with more nutrients"],
    searches: ["air fryer potato chips recipe", "crispy roasted chickpeas recipe"] },
  { match: ["frozen pizza", "pizza rolls"],
    title: "Craving pizza night?",
    text: "Frozen pizza's gaps are vegetables and fiber more than anything sinister on the label.",
    tips: ["Top it with spinach, peppers, or mushrooms before baking — they roast right on it", "A side salad turns it into a rounded meal"],
    searches: ["2 ingredient pizza dough recipe", "sheet pan pizza homemade"] },
  { match: ["frosted", "sugary cereal", "cocoa cereal", "fruit loops", "froot"],
    title: "Craving a sweet breakfast?",
    text: "Sweetened cereals front-load added sugar with little protein to steady you.",
    tips: ["Mix half-and-half with a plain cereal or oats", "Pair with Greek yogurt or milk and fruit so it holds you until lunch"],
    searches: ["overnight oats recipes", "homemade granola low sugar"] },
  { match: ["mac and cheese", "macaroni and cheese", "instant mac"],
    title: "Craving creamy comfort carbs?",
    text: "Boxed mac's main gaps are protein and vegetables — easy to patch without losing the comfort.",
    tips: ["Stir in frozen peas or broccoli in the last minutes of boiling", "Add tuna, rotisserie chicken, or white beans for protein"],
    searches: ["stovetop mac and cheese one pot", "butternut squash mac and cheese"] },
];

function matchMealPattern(name) {
  const n = (name || "").toLowerCase();
  return MEAL_PATTERNS.find(mp => mp.match.some(k => n.includes(k))) || null;
}

function MealPatternTips({ food }) {
  const mp = matchMealPattern(food.name);
  const salty = food.per100g && food.sodium > 500;
  if (!mp && !salty) return null;
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: "#eef0e4", border: `1px solid ${C.rule}`, borderRadius: 10 }}>
      {mp && (
        <>
          <p style={{ margin: "0 0 6px", fontSize: 13, lineHeight: 1.55 }}>
            <strong>{mp.title}</strong> {mp.text}
          </p>
          <ul style={{ margin: "0 0 6px", paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55 }}>
            {mp.tips.map(t => <li key={t}>{t}</li>)}
          </ul>
          <p style={{ margin: 0, fontSize: 12, color: C.faint }}>
            Make-it-yourself searches:{" "}
            {mp.searches.map((q, i) => (
              <React.Fragment key={q}>
                <a href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener"
                  style={{ color: C.accent, textDecoration: "none", borderBottom: `1px solid ${C.accent}` }}>{q}</a>
                {i < mp.searches.length - 1 ? " · " : ""}
              </React.Fragment>
            ))}
          </p>
        </>
      )}
      {salty && (
        <p style={{ margin: mp ? "8px 0 0" : 0, fontSize: 12, color: "#7a5210" }}>
          High in sodium: {Math.round(food.sodium)} mg per 100 g — the gauge below tracks it against the 2,300 mg daily limit.
        </p>
      )}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Macro-distribution styles. "standard" is the official USDA/DRI    */
/*  AMDR; the rest are popular dietary patterns without an official   */
/*  government recommendation behind them.                            */
/* ------------------------------------------------------------------ */

const MACRO_STYLES = {
  standard: { name: "Standard (USDA/DRI AMDR)", carb: [45, 65], protein: [10, 35], fat: [20, 35] },
  med: { name: "Mediterranean-style", carb: [40, 55], protein: [15, 20], fat: [30, 40] },
  highprotein: { name: "High-protein", carb: [30, 45], protein: [25, 35], fat: [25, 35] },
  lowcarb: { name: "Low-carb", carb: [10, 25], protein: [25, 35], fat: [40, 60] },
  keto: { name: "Ketogenic", carb: [5, 10], protein: [15, 30], fat: [60, 80] },
  zone: { name: "Zone (40/30/30)", carb: [37, 43], protein: [27, 33], fat: [27, 33] },
  endurance: { name: "Carb-loading / endurance", carb: [60, 70], protein: [10, 20], fat: [15, 25] },
  custom: { name: "Custom…", carb: [45, 65], protein: [10, 35], fat: [20, 35] },
};

/* ------------------------------------------------------------------ */
/*  Allergy & restriction library — keyword matching over product     */
/*  names and ingredient labels. A helper, NOT a medical safeguard:   */
/*  labels in the databases can be incomplete and trace/"may contain" */
/*  warnings are usually absent.                                      */
/* ------------------------------------------------------------------ */

const RESTRICTIONS = {
  gluten: { name: "Gluten / wheat", kw: ["wheat", "barley", "rye", "malt", "semolina", "spelt", "farro", "seitan", "couscous", "flour", "bread", "pasta", "cracker"] },
  milk: { name: "Milk / dairy", kw: ["milk", "butter", "cream", "cheese", "whey", "casein", "yogurt", "lactose", "ghee"] },
  egg: { name: "Egg", kw: ["egg", "albumin", "mayonnaise", "meringue"] },
  peanut: { name: "Peanut", kw: ["peanut"] },
  treenut: { name: "Tree nuts", kw: ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "macadamia", "brazil nut"] },
  soy: { name: "Soy", kw: ["soy", "soya", "edamame", "tofu", "tempeh", "miso"] },
  fish: { name: "Fish", kw: ["fish", "salmon", "tuna", "cod", "anchov", "sardine", "trout", "tilapia", "mackerel"] },
  shellfish: { name: "Shellfish", kw: ["shrimp", "crab", "lobster", "prawn", "oyster", "clam", "mussel", "scallop", "crawfish"] },
  sesame: { name: "Sesame", kw: ["sesame", "tahini"] },
  sugar: { name: "Refined / added sugar", kw: ["sugar", "corn syrup", "dextrose", "maltose", "fructose", "cane juice"] },
  pork: { name: "Pork", kw: ["pork", "bacon", "ham", "lard", "prosciutto", "gelatin"] },
};

function checkRestrictions(food, activeKeys) {
  const hay = ((food.name || "") + " " + (food.ingredients || "")).toLowerCase();
  const hits = [];
  for (const key of activeKeys || []) {
    const r = RESTRICTIONS[key];
    if (!r) continue;
    const hit = r.kw.find(k => hay.includes(k));
    if (hit) hits.push({ name: r.name, matched: hit });
  }
  return hits;
}

function RestrictionCheck({ food, active }) {
  const hits = checkRestrictions(food, active);
  if (hits.length === 0) return null;
  return (
    <div role="alert" style={{ marginTop: 12, padding: "12px 14px", background: "#f7e3dc", border: `1px solid ${C.accent}`, borderRadius: 10 }}>
      <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 700, color: C.high }}>
        ⚠ May conflict with your listed restrictions
      </p>
      <ul style={{ margin: "0 0 6px", padding: 0, listStyle: "none", fontSize: 12.5, lineHeight: 1.55 }}>
        {hits.map(h => <li key={h.name}><strong>{h.name}</strong> — matched “{h.matched}”</li>)}
      </ul>
      <p style={{ margin: 0, fontSize: 10.5, color: C.faint, lineHeight: 1.5 }}>
        Keyword check against the product name and database ingredient label. Database
        labels can be incomplete and rarely include “may contain” trace warnings —
        for medical allergies, always verify the physical package.
      </p>
    </div>
  );
}

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


// Display title without the "— Brand" suffix (kept in the data and shown
// in Details, just not needed once an item is in the log).
function shortName(name) {
  const i = String(name || "").indexOf(" — ");
  return i > 0 ? name.slice(0, i) : name;
}

function LabelInfo({ food, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const hasServing = food.per100g && food.servingG > 0;
  const factor = hasServing ? food.servingG / 100 : 1;
  const basis = food.per100g ? (hasServing ? `per serving (${Math.round(food.servingG)} g${food.servingText ? ` — ${food.servingText}` : ""})` : "per 100 g") : `per serving${food.serving ? ` (${food.serving}${food.grams ? `, ${food.grams} g` : ""})` : ""}`;
  const fields = [
    ["kcal", "Energy", "kcal", 0], ["protein", "Protein", "g", 1], ["carb", "Carbohydrate", "g", 1],
    ["fat", "Fat", "g", 1], ["fiber", "Fiber", "g", 1], ["sodium", "Sodium", "mg", 0],
    ["calcium", "Calcium", "mg", 0], ["iron", "Iron", "mg", 1], ["potassium", "Potassium", "mg", 0],
    ["vitC", "Vitamin C", "mg", 0], ["vitD", "Vitamin D", "mcg", 1],
  ];
  const [draft, setDraft] = useState(null);
  const startEdit = () => {
    const d = { servingG: hasServing ? Math.round(food.servingG) : 100 };
    for (const [k] of fields) d[k] = +((food[k] || 0) * (hasServing ? factor : 1)).toFixed(1);
    setDraft(d); setEditing(true);
  };
  const saveEdit = () => {
    const g = Number(draft.servingG) > 0 ? Number(draft.servingG) : 100;
    const next = { ...food, servingG: g, manualLabel: true };
    for (const [k] of fields) next[k] = (Number(draft[k]) || 0) / g * 100; // store per 100 g
    setEditing(false); setDraft(null);
    onUpdate && onUpdate(next);
  };
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
        <div className="na-eyebrow">
          Label info — verify against your package
          {food.manualLabel && <span style={{ color: C.accent, marginLeft: 8 }}>✎ manually updated</span>}
        </div>
        {onUpdate && !editing && (
          <button className="na-btn na-btn-quiet" style={{ padding: "4px 11px", fontSize: 12 }} onClick={startEdit}>
            Edit to match package
          </button>
        )}
      </div>

      {!editing ? (
        <>
          <div className="na-mono" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: "4px 12px", fontSize: 12 }}>
            {fields.map(([k, n, u, dp]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between", borderBottom: `1px solid ${C.rule}`, padding: "3px 0" }}>
                <span style={{ color: C.faint }}>{n}</span>
                <span>{((food[k] || 0) * (food.per100g && hasServing ? factor : 1)).toFixed(dp)} {u}</span>
              </div>
            ))}
          </div>
          <p style={{ margin: "6px 0 0", fontSize: 10.5, color: C.faint }}>
            Values {basis}{food.per100g && hasServing ? " to match the package panel; stored internally per 100 g." : "."}
          </p>
        </>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 10 }}>
            <Field label="Serving size (g)">
              <input className="na-input" type="number" min="1" step="any" value={draft.servingG}
                onChange={e => setDraft(d => ({ ...d, servingG: e.target.value }))} style={{ padding: "6px 8px", fontSize: 13 }} />
            </Field>
            {fields.map(([k, n, u]) => (
              <Field key={k} label={`${n} (${u}/serving)`}>
                <input className="na-input" type="number" min="0" step="any" value={draft[k]}
                  onChange={e => setDraft(d => ({ ...d, [k]: e.target.value }))} style={{ padding: "6px 8px", fontSize: 13 }} />
              </Field>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="na-btn" style={{ padding: "7px 16px", fontSize: 13 }} onClick={saveEdit}>Save label</button>
            <button className="na-btn na-btn-quiet" style={{ padding: "7px 16px", fontSize: 13 }} onClick={() => { setEditing(false); setDraft(null); }}>Cancel</button>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 10.5, color: C.faint }}>
            Enter the numbers exactly as printed per serving — they'll be converted and
            marked as manually updated.
          </p>
        </>
      )}

      {food.ingredients && (
        <>
          <div className="na-eyebrow" style={{ margin: "10px 0 4px" }}>Ingredients on file</div>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: "#33414D", overflowWrap: "break-word" }}>{food.ingredients}</p>
        </>
      )}
      <p style={{ margin: "10px 0 0", fontSize: 10.5, color: C.faint, lineHeight: 1.5 }}>
        Numbers can differ from your package (reformulations, regional variants,
        rounding, community-submitted data) — the package is authoritative.
      </p>
    </div>
  );
}

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
            <div className="na-eyebrow" style={{ marginBottom: 6, color: C.ok }}>Alternatives to consider</div>
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


function MacroSummary({ totals, targets, styleKey, customBands, onStyle, onCustomBands }) {
  const kcal = totals.kcal;
  const remaining = Math.round(targets.kcal - kcal);
  const pctE = (g, kcalPerG) => kcal > 0 ? ((g * kcalPerG) / kcal) * 100 : 0;
  const bands = styleKey === "custom" ? customBands : MACRO_STYLES[styleKey] || MACRO_STYLES.standard;
  const gramRange = (band, perG) => `${Math.round(targets.kcal * band[0] / 100 / perG)}–${Math.round(targets.kcal * band[1] / 100 / perG)} g`;
  const tiles = [
    { key: "carb", label: "Carbs", grams: totals.carb, p: pctE(totals.carb, 4), band: bands.carb, targetText: gramRange(bands.carb, 4) },
    { key: "protein", label: "Protein", grams: totals.protein, p: pctE(totals.protein, 4), band: bands.protein, targetText: `${gramRange(bands.protein, 4)} · RDA ≥ ${targets.protein} g` },
    { key: "fat", label: "Fat", grams: totals.fat, p: pctE(totals.fat, 9), band: bands.fat, targetText: gramRange(bands.fat, 9) },
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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
        <div style={{ width: 240 }}>
          <Field label="Dietary style (sets the macro bands)">
            <select className="na-select" value={styleKey} onChange={e => onStyle(e.target.value)}>
              {Object.entries(MACRO_STYLES).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
            </select>
          </Field>
        </div>
        {styleKey === "custom" && ["carb", "protein", "fat"].map(m => (
          <div key={m} style={{ width: 118 }}>
            <Field label={`${m} % min–max`}>
              <div style={{ display: "flex", gap: 4 }}>
                {[0, 1].map(i => (
                  <input key={i} className="na-input" type="number" min="0" max="100" style={{ padding: "6px 8px", fontSize: 13 }}
                    value={customBands[m][i]}
                    onChange={e => {
                      const nb = { ...customBands, [m]: [...customBands[m]] };
                      nb[m][i] = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                      onCustomBands(nb);
                    }} />
                ))}
              </div>
            </Field>
          </div>
        ))}
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
        {styleKey === "standard"
          ? "Shaded bands are the Acceptable Macronutrient Distribution Ranges (AMDR) from the Dietary Reference Intakes — the framework dietitians use to assess macro balance."
          : `Shaded bands reflect the ${(MACRO_STYLES[styleKey] || MACRO_STYLES.custom).name.replace("…", "")} pattern — a popular dietary style, not an official recommendation (the USDA/DRI standard is 45–65% carbs, 10–35% protein, 20–35% fat). For therapeutic diets like keto, work with a clinician.`}
        {" "}The marker shows where today's intake falls.
      </p>
    </div>
  );
}

function BarcodeScanner({ onDetect, onClose }) {
  const videoRef = useRef(null);
  const panelRef = useRef(null);
  const [camError, setCamError] = useState("");
  const [manual, setManual] = useState("");

  // Bring the camera into view — on phones it otherwise opens below the fold.
  useEffect(() => {
    if (panelRef.current) panelRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

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
    <div ref={panelRef} style={{ marginTop: 16, padding: 14, background: C.paper, border: `1px dashed ${C.rule}`, borderRadius: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span className="na-eyebrow">Scan a product barcode</span>
        <button className="na-btn na-btn-quiet" onClick={onClose} style={{ padding: "5px 10px" }}>Close</button>
      </div>
      {!camError ? (
        <>
          <video ref={videoRef} muted playsInline
            style={{ width: "100%", maxHeight: 260, background: "#000", borderRadius: 8, objectFit: "cover" }} />
          <p className="na-mono" style={{ margin: "8px 0 0", fontSize: 12, color: C.accent, fontWeight: 500 }}>
            ● Point at the barcode — scans automatically.
          </p>
        </>
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


/* ------------------------------------------------------------------ */
/*  Recipe-ingredient library — common pantry items (oils, sugars,    */
/*  flours, aromatics, sauces, spices) with per-100 g values and      */
/*  realistic cup/piece weights, so imported recipes auto-match       */
/*  instead of requiring line-by-line lookups. The 120-item quick     */
/*  list serves as a second tier for whole foods.                     */
/*  Fields: kw (match keywords), n (per-100g: kcal,prot,carb,fat,     */
/*  fiber,Ca,Fe,K,Na,vitC,vitD), cupG (g per cup), pieceG, defG.      */
/* ------------------------------------------------------------------ */

const ING_DB = [
  { kw: ["canola oil", "vegetable oil", "peanut oil", "sunflower oil", "avocado oil", "cooking oil"], n: [884, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0], cupG: 218 },
  { kw: ["olive oil"], n: [884, 0, 0, 100, 0, 1, 0.1, 1, 2, 0, 0], cupG: 216 },
  { kw: ["sesame oil"], n: [884, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0], cupG: 218 },
  { kw: ["coconut oil"], n: [862, 0, 0, 100, 0, 0, 0, 0, 0, 0, 0], cupG: 218 },
  { kw: ["butter"], n: [717, 0.9, 0.1, 81, 0, 24, 0, 24, 640, 0, 1.5], cupG: 227, pieceG: 14 },
  { kw: ["sugar", "granulated"], n: [387, 0, 100, 0, 0, 1, 0.1, 2, 1, 0, 0], cupG: 200 },
  { kw: ["brown sugar"], n: [380, 0, 98, 0, 0, 83, 0.7, 133, 28, 0, 0], cupG: 220 },
  { kw: ["powdered sugar", "confectioner"], n: [389, 0, 100, 0, 0, 1, 0.1, 2, 2, 0, 0], cupG: 120 },
  { kw: ["honey"], n: [304, 0.3, 82, 0, 0.2, 6, 0.4, 52, 4, 0.5, 0], cupG: 340 },
  { kw: ["maple syrup"], n: [260, 0, 67, 0, 0, 102, 0.1, 212, 12, 0, 0], cupG: 322 },
  { kw: ["all-purpose flour", "all purpose flour", "flour"], n: [364, 10.3, 76, 1, 2.7, 15, 4.6, 107, 2, 0, 0], cupG: 120 },
  { kw: ["whole wheat flour"], n: [340, 13.2, 72, 2.5, 10.7, 34, 3.6, 363, 2, 0, 0], cupG: 120 },
  { kw: ["cornstarch", "corn starch"], n: [381, 0.3, 91, 0, 0.9, 2, 0.5, 3, 9, 0, 0], cupG: 128 },
  { kw: ["breadcrumb", "panko"], n: [395, 13.4, 72, 5.3, 4.5, 183, 4.8, 196, 732, 0, 0], cupG: 108 },
  { kw: ["rolled oats", "old-fashioned oats", "quick oats"], n: [379, 13.2, 68, 6.5, 10.1, 52, 4.3, 362, 6, 0, 0], cupG: 81 },
  { kw: ["garlic"], n: [149, 6.4, 33, 0.5, 2.1, 181, 1.7, 401, 17, 31, 0], pieceG: 3, cupG: 136 },
  { kw: ["onion", "yellow onion", "red onion", "white onion"], n: [40, 1.1, 9.3, 0.1, 1.7, 23, 0.2, 146, 4, 7.4, 0], pieceG: 110, cupG: 160 },
  { kw: ["shallot"], n: [72, 2.5, 17, 0.1, 3.2, 37, 1.2, 334, 12, 8, 0], pieceG: 30 },
  { kw: ["scallion", "green onion"], n: [32, 1.8, 7.3, 0.2, 2.6, 72, 1.5, 276, 16, 18.8, 0], pieceG: 15 },
  { kw: ["ginger"], n: [80, 1.8, 18, 0.8, 2, 16, 0.6, 415, 13, 5, 0], cupG: 96, defG: 8 },
  { kw: ["salt", "kosher salt", "sea salt"], n: [0, 0, 0, 0, 0, 24, 0.3, 8, 38758, 0, 0], cupG: 288, defG: 3 },
  { kw: ["black pepper", "pepper"], n: [251, 10.4, 64, 3.3, 25, 443, 9.7, 1329, 20, 0, 0], cupG: 110, defG: 1 },
  { kw: ["soy sauce"], n: [53, 8.1, 4.9, 0.6, 0.8, 33, 1.5, 435, 5493, 0, 0], cupG: 255 },
  { kw: ["fish sauce"], n: [35, 5.1, 3.6, 0, 0, 43, 0.8, 288, 7850, 0.5, 0], cupG: 288 },
  { kw: ["oyster sauce"], n: [51, 1.4, 11, 0.3, 0.3, 32, 0.2, 54, 2733, 0, 0], cupG: 288 },
  { kw: ["worcestershire"], n: [78, 0, 19, 0, 0, 107, 5.3, 800, 980, 13, 0], cupG: 275 },
  { kw: ["hot sauce", "sriracha"], n: [93, 1.9, 19, 0.9, 2.2, 18, 1.6, 321, 2124, 27, 0], cupG: 260, defG: 10 },
  { kw: ["vinegar", "rice vinegar", "white vinegar", "apple cider vinegar", "balsamic"], n: [21, 0, 0.9, 0, 0, 6, 0.2, 73, 2, 0, 0], cupG: 240 },
  { kw: ["lemon juice"], n: [22, 0.4, 6.9, 0.2, 0.3, 6, 0.1, 103, 1, 38.7, 0], cupG: 244 },
  { kw: ["lime juice"], n: [25, 0.4, 8.4, 0.1, 0.4, 14, 0.1, 117, 2, 30, 0], cupG: 242 },
  { kw: ["tomato paste"], n: [82, 4.3, 19, 0.5, 4.1, 36, 3, 1014, 59, 21.9, 0], cupG: 262 },
  { kw: ["tomato sauce", "marinara", "crushed tomato", "diced tomato", "canned tomato"], n: [32, 1.6, 7, 0.2, 1.8, 33, 1, 297, 186, 7, 0], cupG: 245 },
  { kw: ["chicken broth", "chicken stock", "vegetable broth", "vegetable stock", "beef broth", "beef stock", "bone broth"], n: [7, 1, 0.4, 0.2, 0, 4, 0.2, 25, 372, 0, 0], cupG: 240 },
  { kw: ["coconut milk"], n: [197, 2, 2.8, 21, 0, 18, 3.3, 220, 13, 1, 0], cupG: 226 },
  { kw: ["heavy cream", "whipping cream"], n: [340, 2.8, 2.8, 36, 0, 66, 0.1, 95, 27, 0.6, 1.1], cupG: 238 },
  { kw: ["half and half", "half-and-half"], n: [131, 3.1, 4.3, 11.5, 0, 105, 0.1, 130, 41, 0.9, 0.8], cupG: 242 },
  { kw: ["sour cream"], n: [198, 2.4, 4.6, 19, 0, 101, 0.1, 125, 31, 0.9, 0.3], cupG: 230 },
  { kw: ["cream cheese"], n: [342, 6.2, 4.1, 34, 0, 97, 0.4, 132, 314, 0, 0.6], cupG: 232, pieceG: 14 },
  { kw: ["parmesan", "parmigiano", "pecorino"], n: [431, 38, 4.1, 29, 0, 1109, 0.9, 125, 1529, 0, 0.5], cupG: 100, defG: 10 },
  { kw: ["mustard", "dijon"], n: [66, 4.4, 5.8, 4, 4, 63, 1.6, 152, 1135, 0.3, 0], cupG: 250, defG: 10 },
  { kw: ["mirin"], n: [226, 0.2, 43, 0, 0, 3, 0.1, 14, 570, 0, 0], cupG: 290 },
  { kw: ["cooking wine", "white wine", "dry sherry"], n: [83, 0.1, 2.6, 0, 0, 9, 0.3, 71, 5, 0, 0], cupG: 235 },
  { kw: ["baking powder"], n: [53, 0, 28, 0, 0.2, 5876, 11, 20, 10600, 0, 0], cupG: 221, defG: 4 },
  { kw: ["baking soda"], n: [0, 0, 0, 0, 0, 0, 0, 0, 27360, 0, 0], cupG: 221, defG: 3 },
  { kw: ["vanilla extract", "vanilla"], n: [288, 0.1, 12.7, 0.1, 0, 11, 0.1, 148, 9, 0, 0], cupG: 208, defG: 4 },
  { kw: ["cocoa powder"], n: [228, 19.6, 58, 13.7, 33, 128, 13.9, 1524, 21, 0, 0], cupG: 86 },
  { kw: ["chocolate chip"], n: [479, 4.2, 63, 30, 5.9, 32, 3.1, 365, 11, 0, 0], cupG: 170 },
  { kw: ["yeast"], n: [325, 40, 41, 7.6, 27, 30, 2.2, 955, 51, 0, 0], defG: 7 },
  { kw: ["sesame seed"], n: [573, 17.7, 23, 50, 11.8, 975, 14.6, 468, 11, 0, 0], cupG: 144, defG: 8 },
  { kw: ["chicken thigh"], n: [232, 23.3, 0, 15, 0, 11, 1.3, 230, 84, 0, 0.1], pieceG: 90 },
  { kw: ["chicken wing"], n: [266, 24.8, 0, 18, 0, 14, 1.2, 178, 82, 0, 0.2], pieceG: 45 },
  { kw: ["ground pork"], n: [263, 22.2, 0, 18.9, 0, 20, 1, 314, 62, 0, 0.6], },
  { kw: ["ground chicken"], n: [189, 23.3, 0, 10.2, 0, 9, 0.9, 246, 77, 0, 0.1], },
  { kw: ["ground lamb"], n: [283, 24.5, 0, 19.7, 0, 17, 1.8, 310, 71, 0, 0.1], },
  { kw: ["cumin", "paprika", "oregano", "basil", "thyme", "rosemary", "chili powder", "curry powder", "turmeric", "cinnamon", "coriander", "garam masala", "italian seasoning", "bay lea", "red pepper flake", "nutmeg", "allspice", "dill", "cayenne", "smoked paprika", "five spice", "za'atar", "herbes"], n: [300, 12, 55, 10, 30, 500, 20, 1200, 30, 2, 0], cupG: 96, defG: 2 },
  { kw: ["bacon"], n: [541, 37, 1.4, 42, 0, 11, 1.4, 565, 1717, 0, 0.3], pieceG: 8 },
  { kw: ["pancetta", "prosciutto"], n: [280, 26, 0.5, 19, 0, 12, 1, 400, 2100, 0, 0.4], defG: 20 },
  { kw: ["chorizo", "sausage", "italian sausage", "kielbasa"], n: [301, 17, 2.5, 25, 0, 15, 1.2, 280, 900, 0, 0.5], pieceG: 75 },
  { kw: ["ground beef", "ground chuck", "hamburger meat"], n: [254, 17.2, 0, 20, 0, 18, 1.9, 270, 66, 0, 0.1] },
  { kw: ["beef chuck", "stew meat", "brisket", "beef roast"], n: [217, 20, 0, 15, 0, 15, 2.2, 290, 60, 0, 0.1] },
  { kw: ["steak", "sirloin", "ribeye", "flank steak", "skirt steak"], n: [201, 22, 0, 12, 0, 14, 1.7, 320, 55, 0, 0.1] },
  { kw: ["pork chop", "pork loin", "pork shoulder", "pork butt"], n: [211, 21, 0, 13, 0, 18, 0.8, 350, 55, 0.6, 0.6] },
  { kw: ["pork belly"], n: [518, 9.3, 0, 53, 0, 5, 0.4, 185, 32, 0, 0.2] },
  { kw: ["chicken breast", "chicken cutlet"], n: [165, 31, 0, 3.6, 0, 15, 1, 256, 74, 0, 0.1], pieceG: 174 },
  { kw: ["chicken drumstick", "chicken leg"], n: [216, 27, 0, 11, 0, 12, 1.1, 240, 90, 0, 0.1], pieceG: 100 },
  { kw: ["whole chicken", "chicken carcass"], n: [215, 25, 0, 12, 0, 13, 1.1, 230, 82, 0, 0.1], pieceG: 1400 },
  { kw: ["turkey breast", "ground turkey"], n: [189, 24, 0, 10, 0, 21, 1.2, 245, 70, 0, 0.3] },
  { kw: ["shrimp", "prawn"], n: [99, 24, 0.2, 0.3, 0, 70, 0.5, 259, 111, 0, 0.1], pieceG: 12 },
  { kw: ["salmon", "salmon fillet"], n: [208, 20, 0, 13, 0, 12, 0.3, 363, 59, 0, 11], pieceG: 170 },
  { kw: ["cod", "halibut", "tilapia", "white fish", "haddock", "snapper"], n: [96, 20, 0, 1.3, 0, 16, 0.4, 400, 60, 0, 2] },
  { kw: ["tuna", "canned tuna"], n: [116, 26, 0, 0.8, 0, 11, 1.5, 237, 337, 0, 2], defG: 142 },
  { kw: ["scallop", "mussel", "clam", "crab", "lobster", "calamari", "squid"], n: [92, 17, 3, 1, 0, 45, 2.5, 320, 350, 3, 0.2] },
  { kw: ["anchov"], n: [210, 29, 0, 9.7, 0, 232, 4.6, 544, 3668, 0, 1.7], defG: 4 },
  { kw: ["spaghetti", "penne", "linguine", "fettuccine", "macaroni", "pasta", "rigatoni", "orzo", "lasagna noodle"], n: [371, 13, 75, 1.5, 3.2, 21, 3.3, 223, 6, 0, 0], cupG: 100 },
  { kw: ["egg noodle", "ramen noodle", "rice noodle", "udon", "soba"], n: [364, 12, 73, 3, 3, 20, 3, 180, 20, 0, 0], cupG: 100 },
  { kw: ["white rice", "jasmine rice", "basmati", "long grain rice", "rice"], n: [365, 7.1, 80, 0.7, 1.3, 28, 0.8, 115, 5, 0, 0], cupG: 185 },
  { kw: ["brown rice"], n: [370, 7.9, 77, 2.9, 3.5, 23, 1.5, 223, 7, 0, 0], cupG: 190 },
  { kw: ["quinoa"], n: [368, 14, 64, 6.1, 7, 47, 4.6, 563, 5, 0, 0], cupG: 170 },
  { kw: ["couscous", "bulgur", "farro", "barley"], n: [350, 12, 72, 1.5, 5, 25, 2.5, 250, 8, 0, 0], cupG: 175 },
  { kw: ["potato", "russet", "yukon"], n: [77, 2, 17, 0.1, 2.2, 12, 0.8, 425, 6, 19.7, 0], pieceG: 173, cupG: 150 },
  { kw: ["sweet potato", "yam"], n: [86, 1.6, 20, 0.1, 3, 30, 0.6, 337, 55, 2.4, 0], pieceG: 130 },
  { kw: ["carrot"], n: [41, 0.9, 9.6, 0.2, 2.8, 33, 0.3, 320, 69, 5.9, 0], pieceG: 61, cupG: 128 },
  { kw: ["celery"], n: [14, 0.7, 3, 0.2, 1.6, 40, 0.2, 260, 80, 3.1, 0], pieceG: 40, cupG: 101 },
  { kw: ["bell pepper", "red pepper", "green pepper", "capsicum"], n: [31, 1, 6, 0.3, 2.1, 7, 0.4, 211, 4, 128, 0], pieceG: 119, cupG: 149 },
  { kw: ["jalapeno", "serrano", "chili pepper", "poblano", "habanero"], n: [29, 0.9, 6.5, 0.4, 2.8, 12, 0.3, 248, 3, 118, 0], pieceG: 14 },
  { kw: ["broccoli"], n: [34, 2.8, 6.6, 0.4, 2.6, 47, 0.7, 316, 33, 89, 0], cupG: 91 },
  { kw: ["cauliflower"], n: [25, 1.9, 5, 0.3, 2, 22, 0.4, 299, 30, 48, 0], cupG: 107 },
  { kw: ["spinach", "baby spinach"], n: [23, 2.9, 3.6, 0.4, 2.2, 99, 2.7, 558, 79, 28, 0], cupG: 30 },
  { kw: ["kale", "collard", "swiss chard", "arugula"], n: [35, 2.9, 4.4, 1.5, 4.1, 254, 1.6, 348, 53, 93, 0], cupG: 67 },
  { kw: ["lettuce", "romaine", "mixed green", "salad green"], n: [17, 1.2, 3.3, 0.3, 2.1, 33, 1, 247, 8, 4, 0], cupG: 47 },
  { kw: ["cabbage", "napa", "bok choy"], n: [25, 1.3, 5.8, 0.1, 2.5, 40, 0.5, 170, 18, 36, 0], cupG: 89 },
  { kw: ["zucchini", "squash", "summer squash"], n: [17, 1.2, 3.1, 0.3, 1, 16, 0.4, 261, 8, 17.9, 0], pieceG: 196, cupG: 124 },
  { kw: ["butternut", "acorn squash", "pumpkin"], n: [45, 1, 12, 0.1, 2, 48, 0.7, 352, 4, 21, 0], cupG: 140 },
  { kw: ["eggplant", "aubergine"], n: [25, 1, 5.9, 0.2, 3, 9, 0.2, 229, 2, 2.2, 0], pieceG: 458, cupG: 82 },
  { kw: ["cucumber"], n: [15, 0.7, 3.6, 0.1, 0.5, 16, 0.3, 147, 2, 2.8, 0], pieceG: 301, cupG: 119 },
  { kw: ["tomato", "cherry tomato", "roma"], n: [18, 0.9, 3.9, 0.2, 1.2, 10, 0.3, 237, 5, 13.7, 0], pieceG: 123, cupG: 149 },
  { kw: ["corn", "sweet corn"], n: [86, 3.3, 19, 1.4, 2, 2, 0.5, 270, 15, 6.8, 0], cupG: 154, pieceG: 90 },
  { kw: ["pea", "green pea", "snap pea", "snow pea"], n: [81, 5.4, 14, 0.4, 5.7, 25, 1.5, 244, 5, 40, 0], cupG: 145 },
  { kw: ["green bean", "asparagus"], n: [31, 1.8, 7, 0.2, 3.4, 37, 1, 211, 6, 12.2, 0], cupG: 125 },
  { kw: ["mushroom", "cremini", "portobello", "shiitake", "button mushroom"], n: [22, 3.1, 3.3, 0.3, 1, 3, 0.5, 318, 5, 2.1, 0.2], cupG: 70, pieceG: 18 },
  { kw: ["avocado"], n: [160, 2, 8.5, 14.7, 6.7, 12, 0.6, 485, 7, 10, 0], pieceG: 201 },
  { kw: ["apple"], n: [52, 0.3, 14, 0.2, 2.4, 6, 0.1, 107, 1, 4.6, 0], pieceG: 182, cupG: 125 },
  { kw: ["banana"], n: [89, 1.1, 23, 0.3, 2.6, 5, 0.3, 358, 1, 8.7, 0], pieceG: 118, cupG: 150 },
  { kw: ["lemon", "lime"], n: [29, 1.1, 9.3, 0.3, 2.8, 26, 0.6, 138, 2, 53, 0], pieceG: 58 },
  { kw: ["orange", "mandarin"], n: [47, 0.9, 12, 0.1, 2.4, 40, 0.1, 181, 0, 53, 0], pieceG: 131 },
  { kw: ["strawberr", "blueberr", "raspberr", "blackberr", "berries"], n: [50, 0.9, 12, 0.4, 2.7, 18, 0.5, 130, 1, 40, 0], cupG: 148 },
  { kw: ["pineapple", "mango", "peach", "pear", "plum"], n: [56, 0.6, 14, 0.2, 1.7, 14, 0.2, 170, 1, 30, 0], cupG: 165, pieceG: 165 },
  { kw: ["raisin", "dried cranberr", "dried apricot", "date", "medjool"], n: [290, 2.5, 76, 0.5, 5, 45, 1.5, 700, 10, 1, 0], cupG: 145, pieceG: 24 },
  { kw: ["cheddar", "monterey jack", "colby", "gouda", "swiss cheese", "provolone"], n: [403, 23, 3.1, 33, 0, 710, 0.7, 98, 653, 0, 0.6], cupG: 113 },
  { kw: ["mozzarella"], n: [300, 22, 2.2, 22, 0, 505, 0.4, 76, 627, 0, 0.4], cupG: 112 },
  { kw: ["feta", "goat cheese", "blue cheese", "ricotta", "cotija"], n: [265, 14, 4, 21, 0, 493, 0.7, 62, 917, 0, 0.4], cupG: 150 },
  { kw: ["milk", "whole milk", "buttermilk", "evaporated milk"], n: [61, 3.2, 4.8, 3.3, 0, 113, 0, 132, 43, 0, 1.3], cupG: 244 },
  { kw: ["yogurt", "greek yogurt"], n: [97, 9, 3.9, 5, 0, 100, 0.1, 141, 35, 0.8, 0], cupG: 245 },
  { kw: ["egg"], n: [143, 12.6, 0.7, 9.5, 0, 56, 1.8, 138, 142, 0, 2], pieceG: 50 },
  { kw: ["mayonnaise", "mayo", "aioli"], n: [680, 1, 0.6, 75, 0, 8, 0.2, 20, 635, 0, 0], cupG: 220 },
  { kw: ["ketchup", "bbq sauce", "barbecue sauce"], n: [110, 1.2, 26, 0.2, 0.5, 18, 0.4, 300, 900, 4, 0], cupG: 240 },
  { kw: ["ranch", "salad dressing", "italian dressing", "vinaigrette"], n: [430, 1.3, 6, 45, 0, 27, 0.1, 70, 900, 0, 0], cupG: 240 },
  { kw: ["salsa", "pico de gallo", "enchilada sauce"], n: [29, 1.5, 6, 0.2, 1.5, 27, 0.6, 275, 600, 3, 0], cupG: 240 },
  { kw: ["peanut butter", "almond butter", "tahini"], n: [590, 22, 22, 50, 6, 45, 2, 650, 350, 0, 0], cupG: 258 },
  { kw: ["almond", "walnut", "pecan", "cashew", "pistachio", "peanut", "hazelnut", "pine nut"], n: [600, 20, 20, 52, 8, 120, 3.5, 650, 5, 0, 0], cupG: 130 },
  { kw: ["black bean", "kidney bean", "pinto bean", "cannellini", "white bean", "navy bean", "refried bean"], n: [130, 8.5, 23, 0.5, 8, 40, 2.2, 400, 250, 0, 0], cupG: 172 },
  { kw: ["chickpea", "garbanzo"], n: [164, 8.9, 27, 2.6, 7.6, 49, 2.9, 291, 240, 1.3, 0], cupG: 164 },
  { kw: ["lentil"], n: [116, 9, 20, 0.4, 7.9, 19, 3.3, 369, 2, 1.5, 0], cupG: 198 },
  { kw: ["tofu", "tempeh"], n: [144, 15, 3.5, 8.7, 2, 350, 2.7, 237, 12, 0, 0], cupG: 252 },
  { kw: ["olive", "caper"], n: [115, 0.8, 6, 11, 3.2, 88, 3.3, 8, 1556, 0, 0], cupG: 135 },
  { kw: ["pickle", "relish"], n: [12, 0.3, 2.3, 0.2, 1.2, 54, 0.4, 23, 1208, 1, 0], cupG: 143 },
  { kw: ["tortilla", "taco shell"], n: [310, 8, 51, 8, 3, 150, 3, 130, 500, 0, 0], pieceG: 45 },
  { kw: ["bread", "baguette", "sandwich bread", "bun", "roll", "pita", "naan"], n: [265, 9, 49, 3.2, 2.7, 150, 3.6, 115, 490, 0, 0], pieceG: 32 },
  { kw: ["puff pastry", "pie crust", "phyllo", "pizza dough"], n: [380, 6, 40, 22, 1.5, 20, 2, 60, 400, 0, 0], pieceG: 200 },
  { kw: ["coconut", "shredded coconut"], n: [354, 3.3, 15, 33, 9, 14, 2.4, 356, 20, 3.3, 0], cupG: 80 },
  { kw: ["chia", "flax", "hemp seed", "sunflower seed", "pumpkin seed"], n: [520, 20, 30, 35, 25, 400, 6, 700, 10, 0, 0], cupG: 140, defG: 10 },
  { kw: ["parsley", "cilantro", "mint", "fresh basil", "chives", "fresh dill"], n: [36, 3, 6.3, 0.8, 3.3, 138, 6.2, 554, 56, 133, 0], cupG: 60, defG: 5 },
];

const FRACTION_RE = /(\d+\s+\d\/\d|\d+\/\d|\d+(?:\.\d+)?|[\u00bd\u2153\u2154\u00bc\u00be\u215b])/;

function parseCount(line) {
  const m = line.trim().match(new RegExp("^" + FRACTION_RE.source));
  if (!m) return null;
  const tok = m[1];
  if (FRACTIONS[tok]) return FRACTIONS[tok];
  if (tok.includes("/")) {
    let v = 0;
    for (const part of tok.split(/\s+/)) {
      if (part.includes("/")) { const [a, b] = part.split("/"); v += Number(a) / Number(b); }
      else v += Number(part);
    }
    return v;
  }
  return Number(tok);
}

// Try to resolve one ingredient line entirely offline.
// Returns { food (per-100g), grams, label } or null when no confident match.
function autoMatchLine(line) {
  const low = line.toLowerCase();
  // Tier 1: pantry library (longest keyword wins to prefer "brown sugar" over "sugar")
  let best = null, bestLen = 0;
  for (const e of ING_DB) {
    for (const kw of e.kw) {
      if (low.includes(kw) && kw.length > bestLen) { best = { entry: e, kw }; bestLen = kw.length; }
    }
  }
  let per100 = null, name = null, pieceG = null, cupG = null, defG = null;
  if (best) {
    const [kcal, protein, carb, fat, fiber, calcium, iron, potassium, sodium, vitC, vitD] = best.entry.n;
    per100 = { kcal, protein, carb, fat, fiber, calcium, iron, potassium, sodium, vitC, vitD };
    name = best.kw.replace(/\b\w/g, c => c.toUpperCase());
    pieceG = best.entry.pieceG; cupG = best.entry.cupG; defG = best.entry.defG;
  } else {
    // Tier 2: quick-list whole foods, converted to per-100 g
    let hit = null, hitLen = 0;
    for (const f of FOODS) {
      const key = f.name.split(",")[0].toLowerCase().replace(/\s*\d+%?/g, "").trim();
      if (key.length >= 3 && low.includes(key) && key.length > hitLen) { hit = f; hitLen = key.length; }
    }
    if (!hit) return null;
    per100 = {};
    for (const k of KEYS) per100[k] = ((hit[k] || 0) / hit.grams) * 100;
    name = hit.name; pieceG = hit.grams;
  }
  // Amount -> grams
  let grams = null;
  const gm = guessAmount(line);
  if (gm) {
    const per = { g: 1, ml: 1, oz: 28.35, lb: 453.6, tsp: cupG ? cupG / 48 : 5, tbsp: cupG ? cupG / 16 : 15, cup: cupG || 240 };
    grams = gm.amt * (per[gm.unit] || 1);
  } else {
    const count = parseCount(line);
    if (count && pieceG) grams = count * pieceG;
    else grams = defG || pieceG || 30;
  }
  grams = Math.max(0.5, Math.round(grams * 10) / 10);
  const food = { ...ZERO, ...per100, name, serving: "100 g", per100g: true };
  return { food, grams, label: `~${Math.round(grams)} g (auto)` };
}

function RecipeImport({ req, onCancel, onComplete }) {
  const lines = (req.ingredients || []).map(l => String(l).trim()).filter(Boolean);

  // Auto-match every line once, up front.
  const [matched, setMatched] = useState(() => {
    const out = [];
    for (const line of lines) {
      const hit = autoMatchLine(line);
      if (hit) out.push({ line, food: hit.food, mult: hit.grams / 100, grams: hit.grams, label: hit.label, auto: true });
    }
    return out;
  });
  const [pending, setPending] = useState(() => lines.filter(l => !autoMatchLine(l)));
  const autoCount = useState(() => matched.length)[0];

  // manual matcher (only for pending lines)
  const [q, setQ] = useState(pending[0] ? cleanIngredient(pending[0]) : "");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState(null);
  const g0 = pending[0] ? guessAmount(pending[0]) : null;
  const [amt, setAmt] = useState(g0 ? g0.amt : 100);
  const [unit, setUnit] = useState(g0 ? g0.unit : "g");
  const [qty, setQty] = useState(1);
  const [servingsMade, setServingsMade] = useState(() => {
    const m = String(req.yield || "").match(/\d+/);
    return m ? Number(m[0]) : 4;
  });
  const [servingsEaten, setServingsEaten] = useState(1);

  const line = pending[0];
  const done = pending.length === 0;
  const localMatches = q ? FOODS.filter(f => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : [];

  const advancePending = (entry) => {
    if (entry) setMatched(m => [...m, entry]);
    const rest = pending.slice(1);
    setPending(rest);
    setSel(null); setResults([]); setErr("");
    if (rest[0]) {
      setQ(cleanIngredient(rest[0]));
      const g = guessAmount(rest[0]);
      setAmt(g ? g.amt : 100); setUnit(g ? g.unit : "g"); setQty(1);
    }
  };

  const confirm = () => {
    if (!sel) return;
    let mult, label, grams = null;
    if (sel.per100g) {
      const u = UNITS[unit];
      grams = (Number(amt) || 100) * u.grams;
      mult = grams / 100;
      label = `${Math.round(grams)} g`;
    } else {
      mult = Number(qty) || 1;
      label = `${mult} \u00d7 ${sel.serving}`;
    }
    advancePending({ line, food: sel, mult, grams, label, auto: false });
  };

  const runSearch = async () => {
    if (!q.trim()) return;
    setBusy(true); setErr(""); setResults([]); setSel(null);
    try {
      const foods = await searchFdc(q.trim());
      setResults(foods);
      if (foods.length === 0) setErr("No matches — reword or skip.");
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };

  const editGrams = (i, raw) => {
    const g = Number(raw);
    setMatched(m => m.map((e, j) => {
      if (j !== i || !(g >= 0) || e.grams == null) return e;
      return { ...e, grams: g, mult: g / 100, label: `${Math.round(g)} g` };
    }));
  };

  const rematch = (i) => {
    const e = matched[i];
    setMatched(m => m.filter((_, j) => j !== i));
    setPending(pd => {
      const next = [e.line, ...pd];
      setQ(cleanIngredient(e.line));
      const g = guessAmount(e.line);
      setAmt(g ? g.amt : 100); setUnit(g ? g.unit : "g"); setQty(1);
      setSel(null); setResults([]);
      return next;
    });
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
          Import: {req.title}
        </h2>
        <button className="na-btn na-btn-quiet" onClick={onCancel} style={{ padding: "5px 12px" }}>Cancel</button>
      </div>

      <p className="na-mono" style={{ margin: "0 0 10px", fontSize: 12, color: C.ok }}>
        ✓ Auto-matched {autoCount} of {lines.length} ingredients from the pantry library
        {pending.length > 0 ? ` — ${pending.length} to review below` : ""}.
      </p>

      {matched.length > 0 && (
        <div style={{ marginBottom: 12, maxHeight: 250, overflowY: "auto", border: `1px solid ${C.rule}`, borderRadius: 10, padding: "4px 10px" }}>
          {matched.map((e, i) => (
            <div key={e.line + i} style={{ display: "flex", alignItems: "center", gap: 8, borderTop: i ? `1px dashed ${C.rule}` : "none", padding: "6px 0", fontSize: 12.5 }}>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ color: C.faint }}>{e.line}</span>
                <span style={{ display: "block" }}>→ {e.food.name}</span>
              </span>
              {e.grams != null ? (
                <span style={{ whiteSpace: "nowrap" }}>
                  <input className="na-input" type="number" min="0" step="any" value={e.grams}
                    onChange={ev => editGrams(i, ev.target.value)}
                    style={{ width: 62, padding: "3px 6px", fontSize: 12, textAlign: "right" }} /> g
                </span>
              ) : (
                <span className="na-mono" style={{ fontSize: 11.5, color: C.faint }}>{e.label}</span>
              )}
              <button onClick={() => rematch(i)} aria-label={`Re-match ${e.line}`}
                style={{ border: "none", background: "none", color: C.accent, cursor: "pointer", fontSize: 12 }}>
                re-match
              </button>
            </div>
          ))}
        </div>
      )}

      {!done ? (
        <>
          <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>Match: “{line}”</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div style={{ flex: "1 1 200px" }}>
              <Field label="Search">
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
            <button className="na-btn" onClick={confirm} disabled={!sel} style={{ opacity: sel ? 1 : 0.45 }}>Confirm</button>
            <button className="na-btn na-btn-quiet" onClick={() => advancePending(null)}>Skip</button>
          </div>
          {err && <p role="alert" style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: C.high }}>{err}</p>}
          {(results.length > 0 || localMatches.length > 0) && !sel && (
            <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0, border: `1px solid ${C.rule}`, borderRadius: 10, maxHeight: 200, overflowY: "auto" }}>
              {(results.length > 0 ? results : localMatches).map((f, i) => (
                <li key={i} style={{ borderTop: i ? `1px solid ${C.rule}` : "none" }}>
                  <button onClick={() => setSel(f)}
                    style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "9px 12px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                    <span>{f.name}</span>
                    <span className="na-mono" style={{ color: C.faint, fontSize: 12, whiteSpace: "nowrap" }}>
                      {f.per100g ? `${Math.round(f.kcal)} kcal / 100 g` : `${f.serving} \u00b7 built-in`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 13.5 }}>
            Recipe total ≈ {Math.round(totals.kcal)} kcal from {matched.length} ingredient{matched.length !== 1 ? "s" : ""}.
            Auto-matched amounts are estimates — adjust grams above if needed.
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
                title: req.title, link: req.link || null, matched,
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
      {[...NUTRIENT_INFO, ...PRESET_NUTRIENTS.filter(pn => PRESET_INFO[pn.key]).map(pn => ({
        key: pn.key, ext: true, name: pn.name,
        role: PRESET_INFO[pn.key].role, deficiency: PRESET_INFO[pn.key].deficiency, sources: PRESET_INFO[pn.key].sources,
        refText: `${pn.limit ? "Limit" : "Reference"} ${targets && targets.sex === "male" ? pn.m : targets && targets.sex === "female" ? pn.f : `${pn.f}–${pn.m}`} ${pn.unit} · ${pn.src}`,
      }))].map((n, i) => {
        const isOpen = open === i;
        return (
          <div key={n.key} style={{ borderBottom: `1px solid ${C.rule}` }}>
            <button className="na-acc" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)}>
              <span>
                {n.ext ? n.name : LABELS[n.key]}
                <span className="na-mono" style={{ fontSize: 12, color: C.faint, fontWeight: 400, marginLeft: 10 }}>
                  {n.ext ? n.refText : targetFor(n.key) + "/day"}
                </span>
              </span>
              <span className="na-mono" aria-hidden style={{ color: C.accent, fontSize: 15 }}>{isOpen ? "−" : "+"}</span>
            </button>
            {isOpen && (
              <div style={{ padding: "0 4px 16px", fontSize: 13.5, lineHeight: 1.6, display: "grid", gap: 10 }}>
                <div><span className="na-eyebrow" style={{ display: "block", marginBottom: 3 }}>Why it matters</span>{n.role}</div>
                <div><span className="na-eyebrow" style={{ display: "block", marginBottom: 3 }}>{n.key === "sodium" || n.key === "caffeine" ? "Notes" : "Signs of deficiency"}</span>{n.deficiency}</div>
                <div><span className="na-eyebrow" style={{ display: "block", marginBottom: 3 }}>{n.key === "sodium" ? "How to cut back" : "Best food sources"}</span>{n.sources}</div>
                {n.ext && <p style={{ margin: "2px 0 0", fontSize: 10.5, color: C.faint }}>Add this to your tracked nutrients on the Daily Log to monitor it against the reference amount.</p>}
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
  const [openDay, setOpenDay] = useState(null);
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

          <h3 className="na-eyebrow" style={{ margin: "22px 0 8px" }}>Logged days — tap a date for its detail</h3>
          <div>
            {inWindow.map(d => {
              const day = history[d];
              const isOpen = openDay === d;
              const lows = TRACKED.filter(k => (day.pct[k] ?? 0) < 80);
              return (
                <div key={d} style={{ borderTop: `1px solid ${C.rule}` }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <button onClick={() => setOpenDay(isOpen ? null : d)} aria-expanded={isOpen}
                      style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 8, padding: "9px 4px", border: "none", background: "none", cursor: "pointer", fontSize: 13, textAlign: "left" }}>
                      <span className="na-mono">{isOpen ? "−" : "+"} {d}</span>
                      <span className="na-mono" style={{ color: C.faint }}>
                        {Math.round(day.totals.kcal)} kcal · {lows.length} low
                      </span>
                    </button>
                    <button onClick={() => onDeleteDay(d)} aria-label={`Delete ${d} from history`}
                      style={{ border: "none", background: "none", color: C.high, cursor: "pointer", fontSize: 12.5, padding: "9px 4px" }}>
                      Delete
                    </button>
                  </div>
                  {isOpen && (
                    <div style={{ padding: "4px 4px 12px", fontSize: 12.5 }}>
                      {lows.length > 0 && (
                        <p style={{ margin: "0 0 8px", color: C.low }}>
                          Below 80% of target: {lows.map(k => LABELS[k]).join(", ")}
                        </p>
                      )}
                      {Array.isArray(day.items) && day.items.length > 0 ? (
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <tbody>
                            {day.items.map((it, i) => (
                              <tr key={i} style={{ borderTop: `1px dashed ${C.rule}` }}>
                                <td style={{ padding: "5px 2px" }}>
                                  {it.food.name}
                                  {it.label && <span style={{ color: C.faint }}> — {it.label}</span>}
                                </td>
                                <td className="na-mono" style={{ padding: "5px 2px", textAlign: "right", color: C.faint }}>
                                  {Math.round((it.food.kcal || 0) * it.qty)} kcal
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p style={{ margin: 0, color: C.faint }}>Item detail wasn't stored for this day (logged before day-detail tracking).</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Tab: Past items — full browser of scans, custom items & recipes   */
/* ------------------------------------------------------------------ */

function PastItemsTab({ barcodes, customFoods, recentFoods, recipes, onSelect, onDeleteScan, onDeleteCustom, onDeleteRecent, onDeleteRecipe }) {
  const [filter, setFilter] = useState("");
  const [openKey, setOpenKey] = useState(null);
  const q = filter.trim().toLowerCase();
  const fits = (name) => !q || name.toLowerCase().includes(q);
  const groups = [
    { label: "Scanned products", rows: Object.values(barcodes).filter(e => fits(e.food.name)).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).map(e => ({ key: e.code, food: e.food, meta: e.code, del: () => onDeleteScan(e.code) })) },
    { label: "Custom items", rows: Object.values(customFoods).filter(e => fits(e.food.name)).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).map(e => ({ key: e.food.name, food: e.food, meta: `${Math.round(e.food.kcal)} kcal/serving`, del: () => onDeleteCustom(e.food.name) })) },
    { label: "Searched & quick-list foods", rows: Object.values(recentFoods).filter(e => fits(e.food.name)).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).map(e => ({ key: e.food.name, food: e.food, meta: e.food.serving || "", del: () => onDeleteRecent(e.food.name) })) },
    { label: "Recipes", rows: Object.values(recipes).filter(r => fits(r.name)).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).map(r => ({ key: r.name, food: r.food, meta: `${Math.round(r.food.kcal)} kcal/serving`, del: () => onDeleteRecipe(r.name), link: r.link })) },
  ];
  const total = groups.reduce((n, g) => n + g.rows.length, 0);
  return (
    <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
      <SectionHead title="Past items" sub="Everything you've scanned, entered, or imported. Tap an item to select it on the Daily Log." />
      <input className="na-input" type="search" value={filter} onChange={e => setFilter(e.target.value)}
        placeholder="Filter by name…" style={{ marginBottom: 12, maxWidth: 380 }} />
      {total === 0 && <p style={{ margin: 0, fontSize: 13.5, color: C.faint }}>No past items{q ? " match that filter" : " yet"}.</p>}
      {groups.map(g => g.rows.length > 0 && (
        <div key={g.label} style={{ marginBottom: 14 }}>
          <div className="na-eyebrow" style={{ margin: "8px 0 2px" }}>{g.label} ({g.rows.length})</div>
          {g.rows.map(row => (
            <React.Fragment key={row.key}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, borderTop: `1px solid ${C.rule}` }}>
              <button onClick={() => onSelect(row.food)}
                style={{ flex: 1, display: "flex", justifyContent: "space-between", gap: 8, padding: "10px 4px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                <span>
                  {row.food.name}
                  {(() => { const n = analyzeIngredients(row.food.ingredients).filter(f => f.level !== "note").length;
                    return n > 0 ? <span style={{ color: C.low, fontWeight: 600, marginLeft: 8, fontSize: 12 }}>⚠ {n} flagged</span> : null; })()}
                </span>
                <span className="na-mono" style={{ color: C.faint, fontSize: 11.5, whiteSpace: "nowrap" }}>{row.meta}</span>
              </button>
              {row.link && (
                <a href={row.link} target="_top" rel="noopener" style={{ fontSize: 12, color: C.accent, textDecoration: "none", padding: "10px 4px", whiteSpace: "nowrap" }}>
                  Recipe ↗
                </a>
              )}
              <button onClick={() => setOpenKey(openKey === g.label + row.key ? null : g.label + row.key)}
                aria-expanded={openKey === g.label + row.key}
                style={{ border: "none", background: "none", color: C.accent, cursor: "pointer", fontSize: 12.5, padding: "10px 4px", whiteSpace: "nowrap" }}>
                {openKey === g.label + row.key ? "Hide" : "Details"}
              </button>
              <button onClick={row.del} aria-label={`Delete ${row.food.name}`}
                style={{ border: "none", background: "none", color: C.high, cursor: "pointer", fontSize: 12.5, padding: "10px 6px" }}>
                Delete
              </button>
            </div>
            {openKey === g.label + row.key && <div style={{ paddingBottom: 12 }}><LabelInfo food={row.food} /></div>}
            </React.Fragment>
          ))}
        </div>
      ))}
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
  const [profileOpen, setProfileOpen] = useState(true);
  const [usdaResults, setUsdaResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [openLogId, setOpenLogId] = useState(null);
  const [hideSuggest, setHideSuggest] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [bonusMsg, setBonusMsg] = useState("");
  const [recPage, setRecPage] = useState(0);
  const [ideaPages, setIdeaPages] = useState([]);
  const [macroStyle, setMacroStyle] = useState("standard");
  const [customBands, setCustomBands] = useState({ carb: [45, 65], protein: [10, 35], fat: [20, 35] });
  const [custom, setCustom] = useState({ name: "", kcal: "", protein: "", carb: "", fat: "", fiber: "", sodium: "" });
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrMsg, setOcrMsg] = useState("");
  const photoInputRef = useRef(null);

  // Photo-of-label OCR (beta): reads a nutrition panel photo with Tesseract
  // (loaded on demand from CDN), prefills the custom-item fields for the user
  // to verify. The photo is processed in the browser and never stored or uploaded.
  const handleLabelPhoto = async (file) => {
    if (!file) return;
    setOcrBusy(true); setOcrMsg("Reading label photo… this can take ~10 seconds.");
    try {
      const T = await import(/* @vite-ignore */ "https://esm.run/tesseract.js@5");
      const worker = await T.createWorker("eng");
      const { data } = await worker.recognize(file);
      await worker.terminate();
      const t = (data.text || "").toLowerCase().replace(/,/g, "");
      const grab = (re) => { const m = t.match(re); return m ? m[1] : ""; };
      const found = {
        kcal: grab(/calories[^0-9]{0,12}(\d{1,4})/),
        fat: grab(/total fat[^0-9]{0,8}(\d{1,3}(?:\.\d)?)\s*g/),
        sodium: grab(/sodium[^0-9]{0,8}(\d{1,5})\s*mg/),
        carb: grab(/carbohydrate[^0-9]{0,8}(\d{1,3}(?:\.\d)?)\s*g/),
        fiber: grab(/fiber[^0-9]{0,8}(\d{1,3}(?:\.\d)?)\s*g/),
        protein: grab(/protein[^0-9]{0,8}(\d{1,3}(?:\.\d)?)\s*g/),
      };
      const count = Object.values(found).filter(Boolean).length;
      if (count === 0) {
        setOcrMsg("Couldn't read numbers from that photo — try a straight-on, well-lit shot, or type the values.");
      } else {
        setCustom(c => ({ ...c, ...Object.fromEntries(Object.entries(found).filter(([, v]) => v)) }));
        setOcrMsg(`✓ Read ${count} value${count > 1 ? "s" : ""} from the photo — verify each against the package before adding.`);
      }
    } catch (e) {
      setOcrMsg("Photo reading isn't available in this browser — type the values instead.");
    } finally {
      setOcrBusy(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };
  const [history, setHistory] = useState({});
  const [recipes, setRecipes] = useState({});
  const [barcodes, setBarcodes] = useState({});
  const [customNutrients, setCustomNutrients] = useState({});
  const [customFoods, setCustomFoods] = useState({});
  const [recentFoods, setRecentFoods] = useState({});
  const [citrusRecipes, setCitrusRecipes] = useState([]);
  const [newNutrient, setNewNutrient] = useState({ name: "", unit: "g", target: "" });
  const [saveMsg, setSaveMsg] = useState("");
  const [users, setUsers] = useState(["Me"]);
  const [currentUser, setCurrentUser] = useState("Me");
  const [newUser, setNewUser] = useState("");
  const [addingUser, setAddingUser] = useState(false);
  const hydrated = useRef(false);

  // Local-timezone day key (toISOString would use UTC and roll the day
  // over early or late depending on where the user is).
  const todayKey = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  // Read the Citrus&Spice recipe book (same-origin IndexedDB) once.
  useEffect(() => { readCitrusRecipes().then(setCitrusRecipes); }, []);

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
      const [h, r, p, b, c, v, x, rf] = await Promise.all([
        loadStore(userKey(HKEY, currentUser)),
        loadStore(userKey(RKEY, currentUser)),
        loadStore(userKey(PKEY, currentUser)),
        loadStore(userKey(BKEY, currentUser)),
        loadStore(userKey(CKEY, currentUser)),
        loadStore(userKey(VKEY, currentUser)),
        loadStore(userKey(XKEY, currentUser)),
        loadStore(userKey(RFKEY, currentUser)),
      ]);
      setCustomFoods(x || {});
      setRecentFoods(rf || {});
      setProfileOpen(!(v && v.profileOpen === false));
      setMacroStyle((v && v.macroStyle) || "standard");
      setCustomBands((v && v.customBands) || { carb: [45, 65], protein: [10, 35], fat: [20, 35] });
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

  const persistUi = (patch) => {
    saveStore(userKey(VKEY, currentUser), { profileOpen, macroStyle, customBands, ...patch });
  };

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

  // Contribution of one logged item to a custom nutrient: stored value first,
  // then a live research-library lookup — so credit applies retroactively to
  // foods logged before the nutrient was added, and library updates flow through.
  const customValueFor = (food, cn) => {
    if (food[cn.id]) return food[cn.id];
    if (!cn.presetKey) return 0;
    const per100 = libraryLookup(cn.presetKey, food.name);
    if (per100 == null) return 0;
    return food.per100g ? per100 : per100 * ((SERVING_GRAMS[food.name] || 100) / 100);
  };

  const totals = useMemo(() => {
    const t = { ...ZERO };
    const cns = Object.values(customNutrients);
    for (const cn of cns) t[cn.id] = 0;
    for (const item of log) {
      for (const k of KEYS) t[k] += (item.food[k] || 0) * item.qty;
      for (const cn of cns) t[cn.id] += customValueFor(item.food, cn) * item.qty;
    }
    return t;
  }, [log, customNutrients]);

  const pctOf = (k) => {
    const target = k === "sodium" ? targets.sodiumLimit : targets[k];
    return target ? (totals[k] / target) * 100 : 0;
  };

  const deficits = useMemo(() => TRACKED.filter(k => pctOf(k) < 80), [totals, targets]); // eslint-disable-line

  // Recommendations now draw entirely from the user's own recipe book plus
  // live search ideas — no fixed built-in recipe set.
  const recommendations = useMemo(() => {
    if (log.length === 0) return { mode: "plan" };
    if (deficits.length === 0) return { mode: "met" };
    return { mode: "catchup" };
  }, [log.length, deficits]);

  // Search-idea paging: reset when the gap set changes; Next never repeats a
  // phrase the user has already been shown (i.e. skipped), until the pool runs
  // out and a fresh cycle starts.
  const ideaKeys = log.length === 0 ? TRACKED : deficits;
  const ideaSig = ideaKeys.join(",") + (log.length === 0 ? ":plan" : ":catchup");
  useEffect(() => {
    setIdeaPages([genSearchPage(ideaKeys, new Set())]);
    setRecPage(0);
  }, [ideaSig]); // eslint-disable-line

  const nextIdeas = () => {
    setRecPage(pg => {
      const next = pg + 1;
      if (next < ideaPages.length) return next;
      const used = new Set(ideaPages.flat().map(x => x.q));
      let picks = genSearchPage(ideaKeys, used);
      if (picks.length === 0) picks = genSearchPage(ideaKeys, new Set()); // pool exhausted — fresh cycle
      setIdeaPages(ps => [...ps, picks]);
      return next;
    });
  };
  const prevIdeas = () => setRecPage(pg => Math.max(0, pg - 1));

  // Built-in matches: whole foods first, then fast-food items (chain-specific
  // matches rank above the cross-chain "Standard (avg)" rows, which act as the
  // fallback when someone just types "cheeseburger").
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const foods = FOODS.filter(f => f.name.toLowerCase().includes(q));
    const ff = FAST_FOODS.filter(f => f.name.toLowerCase().includes(q) || f.chain.toLowerCase().includes(q));
    ff.sort((a, b) => (a.chain === "Standard (avg)" ? 1 : 0) - (b.chain === "Standard (avg)" ? 1 : 0));
    return [...foods, ...ff].slice(0, 10);
  }, [query]);

  const set = (k) => (e) => setProfile(p => ({ ...p, [k]: e.target.value }));

  // Central selection helper: defaults per-100g products to their labeled serving.
  const chooseFood = (food) => {
    setSelected(food); setQuery(""); setUsdaResults([]);
    if (food.per100g && food.servingG) { setAmount(1); setAmountUnit("serving"); }
    else { setAmount(100); setAmountUnit("g"); }
  };

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
      let g;
      if (amountUnit === "serving" && selected.servingG) {
        const n = Number(amount) || 1;
        g = n * selected.servingG;
        label = `${n} serving${n !== 1 ? "s" : ""} (${Math.round(g)} g)`;
      } else {
        const u = UNITS[amountUnit] || UNITS.g;
        g = (Number(amount) || 100) * u.grams;
        label = amountUnit === "g" ? `${Math.round(g)} g` : `${amount} ${u.label}${u.approx ? ` (~${Math.round(g)} g)` : ` (${Math.round(g)} g)`}`;
      }
      multiplier = g / 100;
    } else {
      multiplier = Number(qty) || 1;
    }
    setLog(l => [...l, { food: enrichFood(selected), qty: multiplier, label, id: Date.now() }]);
    if (!selected.barcode && !selected.isRecipe) {
      const next = { ...recentFoods, [selected.name]: { food: selected, lastUsed: Date.now() } };
      const keys = Object.keys(next);
      if (keys.length > 60) {
        for (const k of keys.sort((a, b) => (next[a].lastUsed || 0) - (next[b].lastUsed || 0)).slice(0, keys.length - 60)) delete next[k];
      }
      setRecentFoods(next);
      saveStore(userKey(RFKEY, currentUser), next);
    }
    const bonuses = detectBonuses(selected.name);
    if (bonuses.length > 0) {
      const b = bonuses[0];
      setBonusMsg(`✦ Good choice — beyond the standard panel, this food also provides ${b.extra.toLowerCase()} (${b.blurb}).`);
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
    try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {}
    const known = barcodes[code];
    if (known) {
      chooseFood(known.food);
      setScanStatus(`✓ ${known.food.name} (saved item) — verify label, set amount, add to log.`);
      const next = { ...barcodes, [code]: { ...known, lastUsed: Date.now() } };
      setBarcodes(next);
      saveStore(userKey(BKEY, currentUser), next);
      return;
    }
    setScanStatus(`✓ Scan successful (${code}) — looking up the product…`);
    try {
      const food = await lookupBarcode(code);
      food.barcode = code;
      chooseFood(food);
      setScanStatus(`✓ ${food.name} — verify label below, then add. Saved for next time.`);
      const next = { ...barcodes, [code]: { code, food, lastUsed: Date.now() } };
      setBarcodes(next);
      await saveStore(userKey(BKEY, currentUser), next);
    } catch (err) {
      setScanStatus("");
      setSearchError(err.message + " Try the search box or a custom item.");
    }
  };

  const [editingCN, setEditingCN] = useState(null);
  const [cnDraft, setCnDraft] = useState({ name: "", unit: "", target: "" });
  const saveCnEdit = async (id) => {
    const cn = customNutrients[id];
    if (!cn) return;
    const next = { ...customNutrients, [id]: { ...cn, name: cnDraft.name.trim() || cn.name, unit: cnDraft.unit.trim() || cn.unit, target: Number(cnDraft.target) > 0 ? Number(cnDraft.target) : cn.target } };
    setCustomNutrients(next);
    await saveStore(userKey(CKEY, currentUser), next);
    setEditingCN(null);
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

  // Save a manually corrected label back onto the selected food and its saved scan
  const updateSelectedLabel = async (next) => {
    setSelected(next);
    if (next.barcode && barcodes[next.barcode]) {
      const nb = { ...barcodes, [next.barcode]: { ...barcodes[next.barcode], food: next } };
      setBarcodes(nb);
      await saveStore(userKey(BKEY, currentUser), nb);
    }
  };

  const deleteRecentFood = async (name) => {
    const next = { ...recentFoods };
    delete next[name];
    setRecentFoods(next);
    await saveStore(userKey(RFKEY, currentUser), next);
  };

  const deleteCustomFood = async (name) => {
    const next = { ...customFoods };
    delete next[name];
    setCustomFoods(next);
    await saveStore(userKey(XKEY, currentUser), next);
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
    const nextCF = { ...customFoods, [food.name]: { food, lastUsed: Date.now() } };
    setCustomFoods(nextCF);
    saveStore(userKey(XKEY, currentUser), nextCF);
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
    ["report", "Daily Log"],
    ["history", "History"],
    ["past", "Past Items"],
    ["reference", "Nutrient Info"],
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
            <div className="na-eyebrow" style={{ marginTop: 2 }}>Daily intake, history & food insights</div>
          </div>
          <nav role="tablist" style={{ display: "flex", gap: 4, marginTop: 10, overflowX: "auto" }}>
            {TABS.map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} className="na-tab" onClick={() => setTab(id)}>
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div style={{ background: "#ece4d4", borderBottom: `1px solid ${C.rule}` }}>
        <p style={{ maxWidth: 860, margin: "0 auto", padding: "8px 20px", fontSize: 11.5, lineHeight: 1.5, color: "#4a4137" }}>
          Quick reference only — not medical advice. Follow your healthcare provider's
          recommendations and verify product packaging.
        </p>
      </div>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "26px 20px 40px", display: "grid", gap: 26 }}>

        {tab === "reference" && <ReferenceTab targets={targets} />}
        {tab === "history" && <HistoryTab history={history} onDeleteDay={deleteHistoryDay} />}
        {tab === "past" && (
          <PastItemsTab barcodes={barcodes} customFoods={customFoods} recentFoods={recentFoods} recipes={recipes}
            onSelect={(f) => { chooseFood(f); setTab("report"); }}
            onDeleteScan={deleteBarcode} onDeleteCustom={deleteCustomFood} onDeleteRecent={deleteRecentFood} onDeleteRecipe={deleteSavedRecipe} />
        )}

        {tab === "report" && (
          <>
            {importReq && <RecipeImport req={importReq} onCancel={() => setImportReq(null)} onComplete={completeImport} />}
            {/* ---------- 01 Profile ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: `2px solid ${C.navy}`, paddingBottom: 10, marginBottom: profileOpen ? 18 : 0, flexWrap: "wrap" }}>
                <span className="na-mono" style={{ fontSize: 13, color: C.accent, fontWeight: 500 }}>01</span>
                <h2 className="na-serif" style={{ margin: 0, fontSize: 21, fontWeight: 700, color: C.navy, flex: "0 0 auto" }}>Profile</h2>
                <select className="na-select" value={currentUser} aria-label="Logging for"
                  style={{ width: 130, padding: "6px 10px", fontSize: 13 }}
                  onChange={e => e.target.value === "__add" ? setAddingUser(true) : setCurrentUser(e.target.value)}>
                  {users.map(u => <option key={u} value={u}>{u}</option>)}
                  <option value="__add">+ Add person…</option>
                </select>
                {addingUser && (
                  <>
                    <input className="na-input" style={{ width: 110, padding: "6px 10px", fontSize: 13 }} value={newUser}
                      onChange={e => setNewUser(e.target.value)} onKeyDown={e => { if (e.key === "Enter") addUser(); }} placeholder="Nickname" />
                    <button className="na-btn" style={{ padding: "6px 12px", fontSize: 12.5 }} onClick={addUser}>Add</button>
                  </>
                )}
                <span style={{ flex: 1 }} />
                <button className="na-btn na-btn-quiet" aria-expanded={profileOpen}
                  onClick={() => setProfileOpen(o => {
                    const nv = !o;
                    persistUi({ profileOpen: nv });
                    return nv;
                  })} style={{ padding: "5px 12px", flexShrink: 0 }}>
                  {profileOpen ? "Hide" : "Show"}
                </button>
              </div>
              {profileOpen ? (
                <>
                  <p style={{ margin: "0 0 14px", fontSize: 12, color: C.faint, lineHeight: 1.5 }}>
                    All fields optional. Data stays on this device, separate per person.
                  </p>
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
              <div style={{ marginTop: 16 }}>
                <span className="na-eyebrow" style={{ display: "block", marginBottom: 6 }}>Allergies & restrictions (optional)</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6 }}>
                  {Object.entries(RESTRICTIONS).map(([key, r]) => {
                    const active = (profile.restrictions || []).includes(key);
                    return (
                      <label key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, cursor: "pointer" }}>
                        <input type="checkbox" checked={active}
                          onChange={() => setProfile(pr => {
                            const cur = pr.restrictions || [];
                            return { ...pr, restrictions: active ? cur.filter(k => k !== key) : [...cur, key] };
                          })} />
                        {r.name}
                      </label>
                    );
                  })}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 11, color: C.faint, lineHeight: 1.5 }}>
                  Selected foods are checked against these. Database labels can be incomplete
                  — verify the package for medical allergies.
                </p>
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
              <SectionHead num="02" title="Intake log" sub="Type to search, scan a barcode, or reuse past items." />

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 220px", position: "relative" }}>
                  <Field label="Food">
                    <input
                      className="na-input" value={selected ? selected.name : query}
                      placeholder="e.g. oatmeal, salmon, spinach…"
                      onChange={(e) => { setSelected(null); setQuery(e.target.value); setHideSuggest(false); }}
                      onFocus={() => setHideSuggest(false)}
                      onBlur={() => setTimeout(() => setHideSuggest(true), 150)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { setHideSuggest(true); runUsdaSearch(); }
                        if (e.key === "Escape") setHideSuggest(true);
                      }}
                    />
                  </Field>
                  {matches.length > 0 && !selected && usdaResults.length === 0 && !hideSuggest && (
                    <ul style={{ position: "absolute", zIndex: 5, left: 0, right: 0, top: "100%", margin: 0, padding: 0, listStyle: "none", background: "#fff", border: `1px solid ${C.rule}`, borderTop: "none", boxShadow: "0 6px 16px rgba(24,36,48,0.12)" }}>
                      {matches.map(f => (
                        <li key={f.name}>
                          <button onMouseDown={(e) => { e.preventDefault(); chooseFood(f); }}
                            style={{ display: "flex", justifyContent: "space-between", width: "100%", gap: 8, padding: "9px 10px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, textAlign: "left" }}>
                            <span>{f.name}</span>
                            <span className="na-mono" style={{ color: C.faint, fontSize: 12 }}>
                              {f.serving} · {f.kcal} kcal · {f.fastFood ? (f.chain === "Standard (avg)" ? "avg." : f.chain) : "built-in"}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button className="na-btn na-btn-quiet" onClick={runUsdaSearch} disabled={searching || !query.trim()}
                  style={{ opacity: searching || !query.trim() ? 0.5 : 1 }}>
                  {searching ? "Searching…" : "Search USDA"}
                </button>
                <div style={{ width: 190 }}>
                  {selected && selected.per100g ? (
                    <Field label="Amount" note={amountUnit !== "serving" && UNITS[amountUnit] && UNITS[amountUnit].approx ? "Volume units are approximate — density varies by food." : null}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <input className="na-input" type="number" min="0" step="any" value={amount} onChange={e => setAmount(e.target.value)} />
                        <select className="na-select" style={{ width: 118 }} value={amountUnit} onChange={e => setAmountUnit(e.target.value)}>
                          {selected.servingG && <option value="serving">serving ({Math.round(selected.servingG)} g)</option>}
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
                <button className="na-btn na-btn-quiet" onClick={() => { setShowScanner(s => !s); setScanStatus(""); }}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                  {!showScanner && (
                    <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                      <circle cx="12" cy="13" r="3" />
                    </svg>
                  )}
                  {showScanner ? "Cancel scan" : "Scan barcode"}
                </button>
                <button className="na-btn na-btn-quiet" onClick={() => setShowCustom(s => !s)}>
                  {showCustom ? "Cancel custom item" : "Custom item"}
                </button>
                <div style={{ width: 160 }}>
                  <select className="na-select" value="" aria-label="Past items"
                    style={{ borderRadius: 999, padding: "10px 14px", fontSize: 13, fontWeight: 500, color: "#4a4137" }}
                    onChange={e => {
                      const v = e.target.value;
                      if (!v) return;
                      if (v === "all") { setTab("past"); return; }
                      const [kind, key] = [v.slice(0, 1), v.slice(2)];
                      let food = null;
                      if (kind === "s" && barcodes[key]) food = barcodes[key].food;
                      if (kind === "c" && customFoods[key]) food = customFoods[key].food;
                      if (kind === "f" && recentFoods[key]) food = recentFoods[key].food;
                      if (kind === "r" && recipes[key]) food = recipes[key].food;
                      if (food) { chooseFood(food); setScanStatus(""); }
                    }}>
                    <option value="">Past items…</option>
                    <option value="all">View all past items ({Object.keys(barcodes).length + Object.keys(customFoods).length + Object.keys(recentFoods).length + Object.keys(recipes).length})…</option>
                    {Object.values(barcodes).length > 0 && (
                      <optgroup label="Scanned products">
                        {Object.values(barcodes).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).slice(0, 12).map(e => (
                          <option key={"s:" + e.code} value={"s:" + e.code}>{e.food.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {Object.values(customFoods).length > 0 && (
                      <optgroup label="Custom items">
                        {Object.values(customFoods).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).slice(0, 12).map(e => (
                          <option key={"c:" + e.food.name} value={"c:" + e.food.name}>{e.food.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {Object.values(recentFoods).length > 0 && (
                      <optgroup label="Recent foods">
                        {Object.values(recentFoods).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).slice(0, 12).map(e => (
                          <option key={"f:" + e.food.name} value={"f:" + e.food.name}>{e.food.name}</option>
                        ))}
                      </optgroup>
                    )}
                    {Object.values(recipes).length > 0 && (
                      <optgroup label="Recipes">
                        {Object.values(recipes).sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0)).slice(0, 12).map(r => (
                          <option key={"r:" + r.name} value={"r:" + r.name}>{r.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              {/* Primary action — sized and placed last to signal it records the entry */}
              <button className="na-btn" onClick={addFood} disabled={!selected}
                style={{ opacity: selected ? 1 : 0.45, display: "block", width: "100%", maxWidth: 400,
                  marginTop: 12, padding: "14px 18px", fontSize: 15.5, fontWeight: 600 }}>
                Add to log
              </button>


              {showScanner && <BarcodeScanner onDetect={handleBarcode} onClose={() => setShowScanner(false)} />}
              {scanStatus && <p className="na-mono" style={{ marginTop: 12, marginBottom: 0, fontSize: 12.5, color: C.ok }}>{scanStatus}</p>}
              {bonusMsg && <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: C.ok, fontWeight: 600 }}>{bonusMsg}</p>}
              {selected && selected.fastFood && (
                <p style={{ margin: "10px 0 0", fontSize: 11.5, color: C.faint, lineHeight: 1.5, padding: "9px 12px", background: C.paper, border: `1px solid ${C.rule}`, borderRadius: 8 }}>
                  {selected.chain === "Standard (avg)"
                    ? "Cross-chain average — an estimate for when the exact restaurant is unknown. Pick the specific chain above for closer figures."
                    : `From ${selected.chain}'s published nutrition information — approximate. Recipes, portions, and regional menus change; check the chain's current nutrition page, and note that customizations (sauces, extra cheese, size) shift these numbers.`}
                </p>
              )}
              {selected && selected.per100g && <LabelInfo food={selected} onUpdate={updateSelectedLabel} />}
              {selected && selected.ingredients && <IngredientCheck text={selected.ingredients} />}
              {selected && <MealPatternTips food={selected} />}
              {selected && <RestrictionCheck food={selected} active={profile.restrictions} />}

              {searchError && <p role="alert" style={{ marginTop: 12, marginBottom: 0, fontSize: 13, color: C.high }}>{searchError}</p>}

              {usdaResults.length > 0 && !selected && (
                <ul style={{ listStyle: "none", margin: "12px 0 0", padding: 0, border: `1px solid ${C.rule}`, borderRadius: 3, maxHeight: 260, overflowY: "auto" }}>
                  {usdaResults.map((f, i) => (
                    <li key={i} style={{ borderTop: i ? `1px solid ${C.rule}` : "none" }}>
                      <button onClick={() => chooseFood(f)}
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
                  <div style={{ gridColumn: "1 / -1" }}>
                    <input ref={photoInputRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }}
                      onChange={e => handleLabelPhoto(e.target.files && e.target.files[0])} />
                    <button className="na-btn na-btn-quiet" disabled={ocrBusy} style={{ opacity: ocrBusy ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: 7 }}
                      onClick={() => photoInputRef.current && photoInputRef.current.click()}>
                      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                        <circle cx="12" cy="13" r="3" />
                      </svg>
                      {ocrBusy ? "Reading photo…" : "Fill from label photo (beta)"}
                    </button>
                    {ocrMsg && <p className="na-mono" style={{ margin: "8px 0 0", fontSize: 12, color: ocrMsg.startsWith("✓") ? C.ok : C.low }}>{ocrMsg}</p>}
                    <p style={{ margin: "6px 0 0", fontSize: 10.5, color: C.faint }}>
                      Beta: on-device text recognition — verify the values. The photo is
                      never stored or uploaded.
                    </p>
                  </div>
                </div>
              )}

              {log.length === 0 ? (
                <p style={{ marginTop: 20, marginBottom: 0, fontSize: 13.5, color: C.faint }}>
                  Nothing logged yet.
                </p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, fontSize: 13.5 }}>
                  <thead>
                    <tr className="na-eyebrow" style={{ textAlign: "left" }}>
                      <th style={{ padding: "6px 4px", fontWeight: 600 }}>Item</th>
                      <th style={{ padding: "6px 4px", fontWeight: 600, width: 108 }}>Qty</th>
                      <th className="na-mono" style={{ padding: "6px 4px", fontWeight: 600, textAlign: "right", width: 54 }}>kcal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.map(item => (
                      <React.Fragment key={item.id}>
                      <tr style={{ borderTop: `1px solid ${C.rule}` }}>
                        <td style={{ padding: "8px 4px", wordBreak: "break-word" }}>
                          {shortName(item.food.name)}
                          {!item.food.per100g && item.food.serving && (
                            <span style={{ color: C.faint, fontSize: 12, whiteSpace: "nowrap" }}> ({item.food.serving})</span>
                          )}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 3 }}>
                            <button onClick={() => setOpenLogId(openLogId === item.id ? null : item.id)}
                              aria-expanded={openLogId === item.id}
                              style={{ border: "none", background: "none", color: C.accent, cursor: "pointer", fontSize: 12.5, padding: 0 }}>
                              {openLogId === item.id ? "Hide details" : "Details"}
                            </button>
                            <button onClick={() => setLog(l => l.filter(x => x.id !== item.id))}
                              aria-label={`Remove ${shortName(item.food.name)}`}
                              style={{ border: "none", background: "none", color: C.high, cursor: "pointer", fontSize: 12.5, padding: 0 }}>
                              Remove
                            </button>
                          </div>
                        </td>
                        <td className="na-mono" style={{ padding: "8px 4px", verticalAlign: "top" }}>
                          <input className="na-input" type="number" min="0" step="any"
                            value={item.food.per100g ? Math.round(item.qty * 100) : item.qty}
                            onChange={e => updateItemQty(item.id, e.target.value)}
                            aria-label={`Amount of ${shortName(item.food.name)}`}
                            style={{ width: 58, padding: "4px 6px", fontSize: 12.5, textAlign: "right" }} />
                          <span style={{ marginLeft: 5, fontSize: 11, color: C.faint }}>
                            {item.food.per100g ? "g" : item.food.isRecipe ? "serv." : "× serv."}
                          </span>
                          {item.label && !/^\d+ g$/.test(item.label) && (
                            <span style={{ display: "block", fontSize: 10.5, color: C.faint, marginTop: 2, whiteSpace: "normal" }}>{item.label}</span>
                          )}
                        </td>
                        <td className="na-mono" style={{ padding: "8px 4px", textAlign: "right", verticalAlign: "top" }}>{Math.round(item.food.kcal * item.qty)}</td>
                      </tr>
                      {openLogId === item.id && (
                        <tr>
                          <td colSpan={3} style={{ padding: "0 0 10px" }}><LabelInfo food={item.food} /></td>
                        </tr>
                      )}
                      </React.Fragment>
                    ))}
                    <tr style={{ borderTop: `2px solid ${C.navy}`, fontWeight: 600 }}>
                      <td style={{ padding: "8px 4px" }}>Total</td>
                      <td />
                      <td className="na-mono" style={{ padding: "8px 4px", textAlign: "right" }}>{Math.round(totals.kcal)}</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>

            {/* ---------- 03 Assessment ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 10px" }}>
              <SectionHead num="03" title="Assessment" sub="Intake vs. targets — the mark on each bar is 100%." />
              {log.length === 0 ? (
                <p style={{ fontSize: 13.5, color: C.faint, paddingBottom: 14 }}>The report populates once foods are logged above.</p>
              ) : (
                <>
                  <div className="na-eyebrow" style={{ margin: "4px 0 2px" }}>Energy & macronutrients</div>
                  <MacroSummary totals={totals} targets={targets} styleKey={macroStyle} customBands={customBands}
                    onStyle={(k) => { setMacroStyle(k); persistUi({ macroStyle: k }); }}
                    onCustomBands={(b) => { setCustomBands(b); persistUi({ customBands: b }); }} />
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
                            ✦ Well done — today's foods also provide {found.length} beneficial compound{found.length > 1 ? "s" : ""} beyond the standard panel:
                          </p>
                          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: 6 }}>
                            {found.map(b => (
                              <li key={b.extra} style={{ fontSize: 12.5, lineHeight: 1.5 }}>
                                <strong>{b.extra}</strong> <span style={{ color: C.faint }}>({b.foods.slice(0, 2).join(", ")})</span> — {b.blurb}
                              </li>
                            ))}
                          </ul>
                          <p style={{ margin: "8px 0 0", fontSize: 11, color: C.faint }}>
                            No official daily targets — shown for information, not scored.
                          </p>
                        </div>
                      </>
                    );
                  })()}

                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", padding: "16px 0" }}>
                    <span style={{ fontSize: 12.5, color: C.faint }}>Auto-saves to History.</span>
                    {saveMsg && <span className="na-mono" style={{ fontSize: 12.5, color: C.ok }}>{saveMsg}</span>}
                  </div>

                  <p style={{ fontSize: 12, color: C.faint, paddingBottom: 14, marginTop: 0, lineHeight: 1.55 }}>
                    Custom items count only the nutrients entered.
                  </p>
                </>
              )}

              {/* ---------- Custom tracked nutrients ---------- */}
              <div className="na-eyebrow" style={{ margin: "14px 0 2px" }}>Your custom nutrients</div>
              {Object.keys(customNutrients).length === 0 && (
                <p style={{ fontSize: 13, color: C.faint, margin: "8px 0 10px" }}>
                  Track extras like omega-3, magnesium, or water.
                </p>
              )}
              {Object.values(customNutrients).map(cn => (
                <div key={cn.id}>
                  <Gauge label={cn.name} value={totals[cn.id] || 0} target={cn.target} unit={cn.unit} dp={1} isLimit={!!cn.limit} />
                  {editingCN === cn.id && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-end", padding: "8px 0" }}>
                      <div style={{ width: 150 }}><Field label="Name"><input className="na-input" value={cnDraft.name} onChange={e => setCnDraft(d => ({ ...d, name: e.target.value }))} style={{ padding: "6px 8px", fontSize: 13 }} /></Field></div>
                      <div style={{ width: 80 }}><Field label="Unit"><input className="na-input" value={cnDraft.unit} onChange={e => setCnDraft(d => ({ ...d, unit: e.target.value }))} style={{ padding: "6px 8px", fontSize: 13 }} /></Field></div>
                      <div style={{ width: 110 }}><Field label={cn.limit ? "Daily limit" : "Daily target"}><input className="na-input" type="number" min="0" step="any" value={cnDraft.target} onChange={e => setCnDraft(d => ({ ...d, target: e.target.value }))} style={{ padding: "6px 8px", fontSize: 13 }} /></Field></div>
                      <button className="na-btn" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => saveCnEdit(cn.id)}>Save</button>
                      <button className="na-btn na-btn-quiet" style={{ padding: "7px 14px", fontSize: 12.5 }} onClick={() => setEditingCN(null)}>Cancel</button>
                    </div>
                  )}
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
                    <button className="na-btn na-btn-quiet" style={{ padding: "7px 14px", fontSize: 12.5 }}
                      onClick={() => { setEditingCN(cn.id); setCnDraft({ name: cn.name, unit: cn.unit, target: String(cn.target) }); }}>
                      Edit
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
                Known foods are auto-credited from a research library (approximate).
                Quick-log supplements or label amounts to fill gaps.
              </p>
            </section>

            {/* ---------- 04 Recommendations ---------- */}
            <section className="na-panel" style={{ padding: "22px 22px 24px" }}>
              <a href={RECIPE_SITE_URL} target="_top" rel="noopener"
                style={{ float: "right", fontSize: 13, fontWeight: 500, color: C.accent, textDecoration: "none", borderBottom: `1px solid ${C.accent}`, marginTop: 4 }}>
                Open recipe book ↗
              </a>
              <SectionHead num="04" title="Meal recommendations"
                sub={recommendations.mode === "plan"
                  ? "Nothing logged yet — recipes from your book, plus searches to explore."
                  : recommendations.mode === "met"
                    ? "All tracked nutrients are at or near target."
                    : "Recipes from your book that fit today's gaps, plus searches to explore."} />

              {recommendations.mode === "catchup" && (
                <>
                  <p style={{ marginTop: 0, fontSize: 13.5 }}>
                    Currently below 80% of target:{" "}
                    {deficits.map((k, i) => (
                      <strong key={k} style={{ color: C.low }}>{LABELS[k]}{i < deficits.length - 1 ? ", " : ""}</strong>
                    ))}
                  </p>
                  {(() => {
                    const hits = rotatePick(citrusRecipes
                      .map(r => ({ r, helps: citrusRecipeHelps(r, deficits) }))
                      .filter(x => x.helps.length > 0)
                      .sort((a, b) => b.helps.length - a.helps.length), recPage);
                    if (hits.length === 0) return null;
                    return (
                      <>
                        <div className="na-eyebrow" style={{ margin: "4px 0 8px", color: C.accent }}>From your Citrus&Spice recipe book</div>
                        <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                          {hits.map(({ r, helps }) => (
                            <div key={r.id} style={{ border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 3, padding: "14px 16px", background: "#fff" }}>
                              <h3 className="na-serif" style={{ margin: "0 0 6px", fontSize: 16.5, fontWeight: 700 }}>
                                <a href={`${RECIPE_SITE_URL}#recipe-${encodeURIComponent(r.id)}`} target="_top" rel="noopener"
                                  style={{ color: "inherit", textDecoration: "none", borderBottom: `1.5px solid ${C.accent}` }}>
                                  {r.title} <span aria-hidden style={{ color: C.accent, fontSize: 13 }}>↗</span>
                                </a>
                              </h3>
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                {helps.map(k => (
                                  <span key={k} className="na-mono" style={{ fontSize: 11, padding: "3px 8px", background: "#EAF3F4", color: C.accent, borderRadius: 2, fontWeight: 500 }}>
                                    {LABELS[k]}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                        <p style={{ margin: "0 0 14px", fontSize: 11, color: C.faint }}>
                          Keyword-matched — approximate.
                        </p>
                      </>
                    );
                  })()}
                </>
              )}
              {recommendations.mode === "plan" && (() => {
                const hits = rotatePick(citrusRecipes
                  .map(r => ({ r, helps: citrusRecipeHelps(r, TRACKED) }))
                  .filter(x => x.helps.length > 0)
                  .sort((a, b) => b.helps.length - a.helps.length), recPage);
                if (hits.length === 0) return null;
                return (
                  <>
                    <div className="na-eyebrow" style={{ margin: "4px 0 8px", color: C.accent }}>From your Citrus&Spice recipe book — broadest nutrient coverage</div>
                    <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
                      {hits.map(({ r, helps }) => (
                        <div key={r.id} style={{ border: `1px solid ${C.rule}`, borderLeft: `3px solid ${C.accent}`, borderRadius: 3, padding: "14px 16px", background: "#fff" }}>
                          <h3 className="na-serif" style={{ margin: "0 0 6px", fontSize: 16.5, fontWeight: 700 }}>
                            <a href={`${RECIPE_SITE_URL}#recipe-${encodeURIComponent(r.id)}`} target="_top" rel="noopener"
                              style={{ color: "inherit", textDecoration: "none", borderBottom: `1.5px solid ${C.accent}` }}>
                              {r.title} <span aria-hidden style={{ color: C.accent, fontSize: 13 }}>↗</span>
                            </a>
                          </h3>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {helps.slice(0, 5).map(k => (
                              <span key={k} className="na-mono" style={{ fontSize: 11, padding: "3px 8px", background: "#EAF3F4", color: C.accent, borderRadius: 2, fontWeight: 500 }}>
                                {LABELS[k]}
                              </span>
                            ))}
                            {helps.length > 5 && <span className="na-mono" style={{ fontSize: 11, padding: "3px 4px", color: C.faint }}>+{helps.length - 5} more</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: "0 0 14px", fontSize: 11, color: C.faint }}>
                      Keyword-matched — approximate.
                    </p>
                  </>
                );
              })()}

              {recommendations.mode === "met" && (
                <p style={{ marginTop: 0, fontSize: 13.5, color: C.ok, fontWeight: 600 }}>
                  Nice work — today's log meets every tracked target. No catch-up meals needed.
                </p>
              )}
              {recommendations.mode !== "met" && (ideaPages[recPage] || []).length > 0 && (
                <>
                  <div className="na-eyebrow" style={{ margin: "4px 0 8px" }}>Recipe searches to explore</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {(ideaPages[recPage] || []).map(({ q, k }) => (
                      <a key={q} href={`https://www.google.com/search?q=${encodeURIComponent(q)}`} target="_blank" rel="noopener"
                        style={{ display: "inline-flex", alignItems: "baseline", gap: 6, padding: "8px 13px", background: "#fff", border: `1px solid ${C.rule}`, borderRadius: 999, fontSize: 12.5, color: C.ink, textDecoration: "none" }}>
                        {q}
                        <span className="na-mono" style={{ fontSize: 10.5, color: C.accent }}>{LABELS[k]}</span>
                      </a>
                    ))}
                  </div>
                </>
              )}
              {recommendations.mode !== "met" && (
                <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
                  <button className="na-btn na-btn-quiet" onClick={prevIdeas} disabled={recPage === 0}
                    style={{ opacity: recPage === 0 ? 0.45 : 1 }}>
                    ← Previous
                  </button>
                  <button className="na-btn na-btn-quiet" onClick={nextIdeas}>
                    More ideas →
                  </button>
                  <span className="na-mono" style={{ fontSize: 11.5, color: C.faint }}>page {recPage + 1}</span>
                </div>
              )}
            </section>
          </>
        )}

        <footer style={{ fontSize: 12, color: C.faint, lineHeight: 1.6, borderTop: `1px solid ${C.rule}`, paddingTop: 14 }}>
          <strong>Disclaimer:</strong> This site is provided for general informational and
          educational purposes only, as a quick reference. It is not medical, nutritional,
          or dietetic advice and is not a substitute for professional care. Always follow
          the recommendations of your physician or a registered dietitian, and verify all
          ingredient and allergen information on the physical product packaging before
          consuming. Individual needs vary; consult a qualified professional before making
          significant dietary or exercise changes.
          <br /><br />
          Sources: reference values adapted from the U.S. Dietary Reference Intakes
          (National Academies) and the Dietary Guidelines for Americans; food composition
          data from USDA FoodData Central (fdc.nal.usda.gov) and Open Food Facts; built-in
          quick-list figures are approximate.
        </footer>
      </main>
    </div>
  );
}
