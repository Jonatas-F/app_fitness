/**
 * nutritionDatabase.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Base de alimentos com macros consultada pelo backend para construir prompts
 * de dieta com menos tokens. Inclui calculadora de TDEE e templates de refeição
 * por objetivo.
 *
 * Valores nutricionais por 100g (ou por unidade quando indicado).
 * Fonte: TACO (Tabela Brasileira de Composição de Alimentos) + IBGE + rótulos.
 */

// ── Tabela de alimentos ───────────────────────────────────────────────────────
// { id, name, category, per100g: { kcal, protein, carbs, fat }, unit, portion, tags }

export const FOOD_DATABASE = [

  // ── Proteínas animais ────────────────────────────────────────────────────────
  { id: "frango-file", name: "Frango (filé grelhado)", category: "proteinas", per100g: { kcal: 165, protein: 31, carbs: 0,   fat: 3.6 }, tags: ["carne", "sem-lactose", "sem-gluten"] },
  { id: "frango-coxinha", name: "Frango (coxa sem pele)", category: "proteinas", per100g: { kcal: 185, protein: 28, carbs: 0,   fat: 7   }, tags: ["carne", "sem-lactose"] },
  { id: "carne-patinho", name: "Carne Bovina (patinho moído)", category: "proteinas", per100g: { kcal: 219, protein: 28, carbs: 0,   fat: 12  }, tags: ["carne", "sem-lactose"] },
  { id: "alcatra-grelhada", name: "Alcatra Grelhada", category: "proteinas", per100g: { kcal: 210, protein: 29, carbs: 0,   fat: 10  }, tags: ["carne", "sem-lactose"] },
  { id: "tilapia-grelhada", name: "Tilápia Grelhada", category: "proteinas", per100g: { kcal: 128, protein: 26, carbs: 0,   fat: 2.7 }, tags: ["peixe", "sem-lactose"] },
  { id: "atum-lata-agua", name: "Atum em Lata (água)", category: "proteinas", per100g: { kcal: 116, protein: 26, carbs: 0,   fat: 1   }, tags: ["peixe", "sem-lactose"] },
  { id: "sardinha-lata", name: "Sardinha em Lata (óleo)", category: "proteinas", per100g: { kcal: 190, protein: 25, carbs: 0,   fat: 10  }, tags: ["peixe"] },
  { id: "ovo-inteiro", name: "Ovo Inteiro Cozido", category: "proteinas", per100g: { kcal: 155, protein: 13, carbs: 1.1, fat: 11  }, unit: "unidade", portion: 60, tags: ["ovo", "sem-gluten"] },
  { id: "clara-ovo", name: "Clara de Ovo", category: "proteinas", per100g: { kcal: 52,  protein: 11, carbs: 0.7, fat: 0.2 }, unit: "unidade", portion: 33, tags: ["ovo", "sem-gluten", "sem-gordura"] },
  { id: "presunto-peru", name: "Peito de Peru (fatiado)", category: "proteinas", per100g: { kcal: 109, protein: 17, carbs: 1.5, fat: 3.5 }, tags: ["frios"] },

  // ── Suplementos proteicos ────────────────────────────────────────────────────
  { id: "whey-concentrado", name: "Whey Protein Concentrado", category: "suplementos", per100g: { kcal: 380, protein: 75, carbs: 8,   fat: 5   }, unit: "dose", portion: 35, tags: ["suplemento", "proteina", "sem-gluten"] },
  { id: "whey-isolado", name: "Whey Protein Isolado", category: "suplementos", per100g: { kcal: 360, protein: 82, carbs: 3,   fat: 2   }, unit: "dose", portion: 30, tags: ["suplemento", "proteina", "sem-lactose-aprox"] },
  { id: "proteina-carne", name: "Proteína de Carne (Beef Protein)", category: "suplementos", per100g: { kcal: 366, protein: 86, carbs: 1.7, fat: 1.2 }, unit: "dose", portion: 35, tags: ["suplemento", "proteina", "sem-lactose"] },
  { id: "caseina", name: "Caseína (Slow Protein)", category: "suplementos", per100g: { kcal: 370, protein: 80, carbs: 5,   fat: 2   }, unit: "dose", portion: 35, tags: ["suplemento", "proteina", "liberacao-lenta"] },

  // ── Hipercalóricos ───────────────────────────────────────────────────────────
  { id: "hipercalorico-mastodon", name: "Hipercalórico Mastodon", category: "suplementos", per100g: { kcal: 386, protein: 7.5, carbs: 86, fat: 1.3 }, unit: "dose", portion: 160, tags: ["suplemento", "hipercalorico", "sem-lactose"] },
  { id: "hipercalorico-generico", name: "Hipercalórico Genérico", category: "suplementos", per100g: { kcal: 380, protein: 10, carbs: 80, fat: 2   }, unit: "dose", portion: 150, tags: ["suplemento", "hipercalorico"] },

  // ── Laticínios / sem lactose ─────────────────────────────────────────────────
  { id: "leite-zero-lactose", name: "Leite Zero Lactose (integral)", category: "laticinios", per100g: { kcal: 61,  protein: 3.2, carbs: 4.8, fat: 3.3 }, unit: "copo", portion: 200, tags: ["laticinios", "sem-lactose"] },
  { id: "leite-zero-desnatado", name: "Leite Zero Lactose (desnatado)", category: "laticinios", per100g: { kcal: 36,  protein: 3.4, carbs: 4.9, fat: 0.1 }, unit: "copo", portion: 200, tags: ["laticinios", "sem-lactose", "baixa-gordura"] },
  { id: "iogurte-grego", name: "Iogurte Grego Natural", category: "laticinios", per100g: { kcal: 97,  protein: 9,   carbs: 4,   fat: 5   }, unit: "pote", portion: 170, tags: ["laticinios"] },
  { id: "queijo-cottage", name: "Queijo Cottage", category: "laticinios", per100g: { kcal: 98,  protein: 11,  carbs: 3.4, fat: 4.3 }, tags: ["laticinios"] },
  { id: "requeijao-zero", name: "Requeijão Zero Lactose", category: "laticinios", per100g: { kcal: 252, protein: 7,   carbs: 3,   fat: 23  }, tags: ["laticinios", "sem-lactose"] },

  // ── Carboidratos ─────────────────────────────────────────────────────────────
  { id: "aveia-flocos", name: "Aveia em Flocos", category: "carboidratos", per100g: { kcal: 394, protein: 14,  carbs: 66,  fat: 8.5 }, unit: "xícara", portion: 80, tags: ["cereal", "fibra", "sem-lactose"] },
  { id: "nescau-cereal", name: "Nescau Cereal (achocolatado cereais)", category: "carboidratos", per100g: { kcal: 380, protein: 5,   carbs: 82,  fat: 2   }, unit: "g", portion: 30, tags: ["cereal", "carboidrato-simples"] },
  { id: "arroz-branco-cozido", name: "Arroz Branco Cozido", category: "carboidratos", per100g: { kcal: 128, protein: 2.5, carbs: 28,  fat: 0.2 }, unit: "concha", portion: 120, tags: ["cereal", "sem-gluten"] },
  { id: "arroz-integral-cozido", name: "Arroz Integral Cozido", category: "carboidratos", per100g: { kcal: 124, protein: 2.6, carbs: 25,  fat: 1   }, tags: ["cereal", "fibra", "sem-gluten"] },
  { id: "batata-doce-cozida", name: "Batata Doce Cozida", category: "carboidratos", per100g: { kcal: 86,  protein: 1.3, carbs: 20,  fat: 0.1 }, unit: "unidade-media", portion: 150, tags: ["tuberculo", "fibra", "sem-gluten"] },
  { id: "macarrao-cozido", name: "Macarrão Cozido", category: "carboidratos", per100g: { kcal: 131, protein: 4.5, carbs: 26,  fat: 0.7 }, tags: ["cereal"] },
  { id: "pao-integral", name: "Pão Integral", category: "carboidratos", per100g: { kcal: 253, protein: 9,   carbs: 46,  fat: 3.5 }, unit: "fatia", portion: 40, tags: ["pao", "fibra"] },
  { id: "tapioca", name: "Tapioca (goma pronta)", category: "carboidratos", per100g: { kcal: 187, protein: 0.3, carbs: 46,  fat: 0   }, unit: "unidade", portion: 60, tags: ["sem-gluten", "baixa-proteina"] },
  { id: "feijao-carioca-cozido", name: "Feijão Carioca Cozido", category: "carboidratos", per100g: { kcal: 76,  protein: 4.8, carbs: 14,  fat: 0.3 }, unit: "concha", portion: 130, tags: ["leguminosa", "fibra", "sem-gluten"] },
  { id: "lentilha-cozida", name: "Lentilha Cozida", category: "carboidratos", per100g: { kcal: 116, protein: 9,   carbs: 20,  fat: 0.4 }, tags: ["leguminosa", "proteina-vegetal", "fibra"] },

  // ── Frutas ───────────────────────────────────────────────────────────────────
  { id: "banana-nanica", name: "Banana Nanica", category: "frutas", per100g: { kcal: 89,  protein: 1.1, carbs: 23,  fat: 0.2 }, unit: "unidade-media", portion: 100, tags: ["fruta", "carboidrato-rapido"] },
  { id: "maca", name: "Maçã", category: "frutas", per100g: { kcal: 56,  protein: 0.3, carbs: 15,  fat: 0.2 }, unit: "unidade-media", portion: 150, tags: ["fruta"] },
  { id: "laranja", name: "Laranja", category: "frutas", per100g: { kcal: 47,  protein: 0.9, carbs: 12,  fat: 0.1 }, unit: "unidade-media", portion: 150, tags: ["fruta", "vitamina-c"] },
  { id: "manga", name: "Manga", category: "frutas", per100g: { kcal: 64,  protein: 0.8, carbs: 17,  fat: 0.3 }, tags: ["fruta"] },
  { id: "morango", name: "Morango", category: "frutas", per100g: { kcal: 32,  protein: 0.7, carbs: 7.7, fat: 0.3 }, tags: ["fruta", "baixa-caloria"] },

  // ── Gorduras saudáveis ───────────────────────────────────────────────────────
  { id: "azeite-oliva", name: "Azeite de Oliva Extra Virgem", category: "gorduras", per100g: { kcal: 884, protein: 0,   carbs: 0,   fat: 100 }, unit: "colher-sopa", portion: 10, tags: ["gordura-boa", "sem-lactose"] },
  { id: "abacate", name: "Abacate", category: "gorduras", per100g: { kcal: 160, protein: 2,   carbs: 9,   fat: 15  }, unit: "metade", portion: 100, tags: ["gordura-boa", "fruta"] },
  { id: "amendoim", name: "Amendoim Cru/Torrado", category: "gorduras", per100g: { kcal: 567, protein: 26,  carbs: 16,  fat: 49  }, unit: "colher-sopa", portion: 20, tags: ["oleaginosa", "proteina"] },
  { id: "castanha-caju", name: "Castanha de Caju", category: "gorduras", per100g: { kcal: 553, protein: 18,  carbs: 30,  fat: 44  }, unit: "punhado", portion: 30, tags: ["oleaginosa"] },

  // ── Vegetais / Saladas ───────────────────────────────────────────────────────
  { id: "brocolos-cozido", name: "Brócolis Cozido", category: "vegetais", per100g: { kcal: 35,  protein: 2.4, carbs: 7.2, fat: 0.4 }, tags: ["vegetal", "fibra"] },
  { id: "espinafre", name: "Espinafre Cru", category: "vegetais", per100g: { kcal: 23,  protein: 2.9, carbs: 3.6, fat: 0.4 }, tags: ["vegetal", "ferro"] },
  { id: "alface", name: "Alface", category: "vegetais", per100g: { kcal: 14,  protein: 1.3, carbs: 2.2, fat: 0.2 }, tags: ["vegetal", "baixa-caloria"] },
  { id: "tomate", name: "Tomate", category: "vegetais", per100g: { kcal: 19,  protein: 0.9, carbs: 4,   fat: 0.2 }, tags: ["vegetal"] },

];

// ── Calculadora de necessidades calóricas ────────────────────────────────────

/** Fórmula de Harris-Benedict revisada (Mifflin-St Jeor) */
export function calculateBMR({ weight, height, age, sex }) {
  if (sex === "masculino") {
    return 10 * weight + 6.25 * height - 5 * age + 5;
  }
  return 10 * weight + 6.25 * height - 5 * age - 161;
}

const ACTIVITY_MULTIPLIERS = {
  sedentario:         1.2,   // sem atividade
  levemente_ativo:    1.375, // 1-2x/semana
  moderado:           1.55,  // 3-4x/semana
  muito_ativo:        1.725, // 5-6x/semana
  extremamente_ativo: 1.9,   // 2x/dia
};

export function calculateTDEE({ weight, height, age, sex, activityLevel = "moderado" }) {
  const bmr = calculateBMR({ weight, height, age, sex });
  return Math.round(bmr * (ACTIVITY_MULTIPLIERS[activityLevel] || 1.55));
}

/** Retorna meta calórica e macros por objetivo */
export function calculateGoalMacros({ tdee, goal, weight }) {
  const macros = {};

  if (goal === "hipertrofia" || goal === "bulk") {
    macros.kcal    = tdee + 300;
    macros.protein = Math.round(weight * 2.2);        // 2.2g/kg
    macros.fat     = Math.round((macros.kcal * 0.22) / 9);
    macros.carbs   = Math.round((macros.kcal - macros.protein * 4 - macros.fat * 9) / 4);
  } else if (goal === "emagrecimento" || goal === "cutting") {
    macros.kcal    = tdee - 400;
    macros.protein = Math.round(weight * 2.4);        // 2.4g/kg em déficit
    macros.fat     = Math.round((macros.kcal * 0.25) / 9);
    macros.carbs   = Math.round((macros.kcal - macros.protein * 4 - macros.fat * 9) / 4);
  } else if (goal === "recomposicao") {
    macros.kcal    = tdee - 100;
    macros.protein = Math.round(weight * 2.3);
    macros.fat     = Math.round((macros.kcal * 0.25) / 9);
    macros.carbs   = Math.round((macros.kcal - macros.protein * 4 - macros.fat * 9) / 4);
  } else {
    // manutenção / condicionamento
    macros.kcal    = tdee;
    macros.protein = Math.round(weight * 2.0);
    macros.fat     = Math.round((macros.kcal * 0.28) / 9);
    macros.carbs   = Math.round((macros.kcal - macros.protein * 4 - macros.fat * 9) / 4);
  }

  // Garante valores não negativos
  macros.carbs = Math.max(macros.carbs, 50);
  return macros;
}

// ── Templates de refeições por objetivo ────────────────────────────────────────
// Usado pelo backend para sugerir distribuição de refeições sem tokens extras

export const MEAL_DISTRIBUTION_TEMPLATES = {
  hipertrofia: {
    description: "Superávit calórico controlado — comer de 4-6x por dia, priorizando proteína em todas as refeições",
    meals: [
      { slot: "cafe-manha",  pct_kcal: 25, priority: ["proteinas", "carboidratos"], note: "Primeira janela anabólica do dia" },
      { slot: "almoco",      pct_kcal: 30, priority: ["proteinas", "carboidratos", "vegetais"], note: "Maior refeição do dia" },
      { slot: "cafe-tarde",  pct_kcal: 20, priority: ["suplementos", "carboidratos"], note: "Hipercalórico ou snack calórico" },
      { slot: "pre-treino",  pct_kcal: 12, priority: ["carboidratos", "proteinas"], note: "2h antes do treino — sem gordura" },
      { slot: "pos-treino",  pct_kcal: 13, priority: ["proteinas", "carboidratos"], note: "Janela anabólica — até 40min após treino" },
    ],
  },
  emagrecimento: {
    description: "Déficit calórico — priorizar proteína para preservar massa muscular",
    meals: [
      { slot: "cafe-manha",  pct_kcal: 25, priority: ["proteinas", "vegetais"], note: "Proteína alta para saciedade" },
      { slot: "almoco",      pct_kcal: 35, priority: ["proteinas", "vegetais", "carboidratos"], note: "Maior refeição" },
      { slot: "cafe-tarde",  pct_kcal: 15, priority: ["proteinas"], note: "Snack proteico — evitar carboidrato" },
      { slot: "janta",       pct_kcal: 25, priority: ["proteinas", "vegetais"], note: "Refeição leve — sem carboidrato pesado" },
    ],
  },
  recomposicao: {
    description: "Manutenção calórica com proteína alta — reorganização corporal",
    meals: [
      { slot: "cafe-manha",  pct_kcal: 25, priority: ["proteinas", "carboidratos"] },
      { slot: "almoco",      pct_kcal: 30, priority: ["proteinas", "carboidratos", "vegetais"] },
      { slot: "pre-treino",  pct_kcal: 20, priority: ["carboidratos", "proteinas"] },
      { slot: "pos-treino",  pct_kcal: 25, priority: ["proteinas"] },
    ],
  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

export function getFoodById(id) {
  return FOOD_DATABASE.find(f => f.id === id);
}

export function getFoodsByCategory(category) {
  return FOOD_DATABASE.filter(f => f.category === category);
}

export function getFoodsWithoutLactose() {
  return FOOD_DATABASE.filter(f => f.tags.includes("sem-lactose"));
}

/** Gera descrição compacta dos alimentos para contexto de IA */
export function formatFoodsForPrompt(foods) {
  return foods
    .map(f => `• ${f.name}: ${f.per100g.kcal}kcal / P${f.per100g.protein}g / C${f.per100g.carbs}g / G${f.per100g.fat}g (por 100g)`)
    .join("\n");
}

export default FOOD_DATABASE;
