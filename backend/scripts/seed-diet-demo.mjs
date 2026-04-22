import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
import { allFoodPreferenceItems } from "../../src/data/foodPreferencesCatalog.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

const targetEmail = "Jonatas.freire.prof@gmail.com";
const blockedMarks = new Set(["nao_gosta", "alergia", "intolerancia", "evito"]);
const preferredMarks = new Set(["gosta", "quero_incluir"]);

const days = [
  { id: "segunda", short: "SEG", name: "Segunda" },
  { id: "terca", short: "TER", name: "Terca" },
  { id: "quarta", short: "QUA", name: "Quarta" },
  { id: "quinta", short: "QUI", name: "Quinta" },
  { id: "sexta", short: "SEX", name: "Sexta" },
  { id: "sabado", short: "SAB", name: "Sabado" },
  { id: "domingo", short: "DOM", name: "Domingo" },
];

const meals = [
  { id: "cafe-manha", name: "Cafe da manha", time: "07:30", calories: 520, protein: 35, carbs: 62, fats: 12 },
  { id: "almoco", name: "Almoco", time: "12:30", calories: 720, protein: 52, carbs: 86, fats: 18 },
  { id: "cafe-tarde", name: "Cafe da tarde", time: "16:30", calories: 360, protein: 28, carbs: 42, fats: 8 },
  { id: "pre-treino", name: "Pre-treino", time: "18:00", calories: 280, protein: 12, carbs: 54, fats: 3 },
  { id: "janta", name: "Janta", time: "20:30", calories: 640, protein: 48, carbs: 72, fats: 16 },
];

const fallbackFoodIds = {
  frango: "proteinas-animais-frango-e-aves-peito-de-frango",
  ovos: "proteinas-animais-ovos-ovo-de-galinha",
  patinho: "proteinas-animais-carnes-bovinas-patinho",
  tilapia: "proteinas-animais-peixes-tilapia",
  arroz: "carboidratos-arroz-e-graos-arroz-branco",
  batataDoce: "carboidratos-tuberculos-e-raizes-batata-doce",
  aveia: "carboidratos-cereais-e-farinhas-aveia",
  banana: "frutas-frutas-comuns-banana",
  maca: "frutas-frutas-comuns-maca",
  mamao: "frutas-frutas-comuns-mamao",
  brocolis: "verduras-legumes-legumes-e-hortalicas-brocolis",
  alface: "verduras-legumes-folhas-alface",
  tomate: "verduras-legumes-legumes-e-hortalicas-tomate",
  azeite: "gorduras-outras-fontes-azeite-de-oliva",
  pastaAmendoim: "gorduras-outras-fontes-pasta-de-amendoim",
  iogurte: "laticinios-iogurtes-iogurte-natural",
  whey: "industrializados-proteicos-fitness-whey-protein",
};

const foodCatalogById = new Map(allFoodPreferenceItems.map((item) => [item.id, item]));

function addDays(date, amount) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function numberValue(value) {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function getPayloadValue(payload, keys) {
  for (const key of keys) {
    const value = payload?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }

  return null;
}

function isFoodAllowed(foodId, preferenceMap) {
  const mark = preferenceMap.get(foodId);
  return !blockedMarks.has(mark);
}

function makeFood(foodId, quantity, macros, preferenceMap, notes = null) {
  const food = foodCatalogById.get(foodId);
  return {
    foodId,
    name: food?.name || foodId,
    quantity,
    mark: preferenceMap.get(foodId) || null,
    kcal: macros.kcal,
    protein: macros.protein,
    carbs: macros.carbs,
    fats: macros.fats,
    notes,
  };
}

function pickFood(primaryId, fallbackIds, preferenceMap) {
  return [primaryId, ...fallbackIds].find((foodId) => isFoodAllowed(foodId, preferenceMap)) || primaryId;
}

function buildMealsForDay(dayIndex, preferenceMap) {
  const proteinRotation = [
    fallbackFoodIds.frango,
    fallbackFoodIds.patinho,
    fallbackFoodIds.tilapia,
    fallbackFoodIds.ovos,
  ];
  const carbRotation = [fallbackFoodIds.arroz, fallbackFoodIds.batataDoce];
  const fruitRotation = [fallbackFoodIds.banana, fallbackFoodIds.maca, fallbackFoodIds.mamao];
  const protein = pickFood(proteinRotation[dayIndex % proteinRotation.length], proteinRotation, preferenceMap);
  const carb = pickFood(carbRotation[dayIndex % carbRotation.length], carbRotation, preferenceMap);
  const fruit = pickFood(fruitRotation[dayIndex % fruitRotation.length], fruitRotation, preferenceMap);
  const green = pickFood(fallbackFoodIds.brocolis, [fallbackFoodIds.alface, fallbackFoodIds.tomate], preferenceMap);

  return [
    {
      ...meals[0],
      foods: [
        makeFood(fallbackFoodIds.aveia, "60 g", { kcal: 230, protein: 8, carbs: 39, fats: 5 }, preferenceMap),
        makeFood(fruit, "1 unidade", { kcal: 95, protein: 1, carbs: 24, fats: 0 }, preferenceMap),
        makeFood(fallbackFoodIds.ovos, "2 unidades", { kcal: 156, protein: 13, carbs: 1, fats: 11 }, preferenceMap),
      ],
    },
    {
      ...meals[1],
      foods: [
        makeFood(protein, "180 g", { kcal: 285, protein: 45, carbs: 0, fats: 8 }, preferenceMap),
        makeFood(carb, "160 g cozido", { kcal: 205, protein: 4, carbs: 45, fats: 1 }, preferenceMap),
        makeFood(green, "120 g", { kcal: 42, protein: 4, carbs: 7, fats: 0 }, preferenceMap),
        makeFood(fallbackFoodIds.azeite, "1 colher de sopa", { kcal: 108, protein: 0, carbs: 0, fats: 12 }, preferenceMap),
      ],
    },
    {
      ...meals[2],
      foods: [
        makeFood(fallbackFoodIds.iogurte, "170 g", { kcal: 105, protein: 9, carbs: 12, fats: 3 }, preferenceMap),
        makeFood(fallbackFoodIds.whey, "30 g", { kcal: 120, protein: 24, carbs: 3, fats: 2 }, preferenceMap),
        makeFood(fruit, "1 unidade", { kcal: 95, protein: 1, carbs: 24, fats: 0 }, preferenceMap),
      ],
    },
    {
      ...meals[3],
      foods: [
        makeFood(fallbackFoodIds.banana, "1 unidade", { kcal: 95, protein: 1, carbs: 24, fats: 0 }, preferenceMap),
        makeFood(fallbackFoodIds.pastaAmendoim, "15 g", { kcal: 88, protein: 4, carbs: 3, fats: 7 }, preferenceMap),
      ],
    },
    {
      ...meals[4],
      foods: [
        makeFood(protein, "170 g", { kcal: 270, protein: 42, carbs: 0, fats: 8 }, preferenceMap),
        makeFood(carb, "130 g cozido", { kcal: 166, protein: 3, carbs: 36, fats: 1 }, preferenceMap),
        makeFood(green, "150 g", { kcal: 52, protein: 5, carbs: 9, fats: 0 }, preferenceMap),
        makeFood(fallbackFoodIds.azeite, "1 colher de cha", { kcal: 45, protein: 0, carbs: 0, fats: 5 }, preferenceMap),
      ],
    },
  ];
}

function buildProtocol({ checkin, preferences, kcalTarget, proteinG, carbsG, fatsG, waterTargetLiters }) {
  const preferenceMap = new Map(preferences.map((item) => [item.item_id, item.mark]));
  const startDate = formatDate(new Date());
  const endDate = formatDate(addDays(new Date(), 30));
  const dayPlans = days.map((day, dayIndex) => ({
    ...day,
    meals: buildMealsForDay(dayIndex, preferenceMap).map((meal) => ({
      id: meal.id,
      name: meal.name,
      enabled: true,
      time: meal.time,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fats: String(meal.fats),
      foods: meal.foods.map((food) => `${food.name} (${food.quantity})`).join(", "),
      description: meal.foods.map((food) => `${food.name} (${food.quantity})`).join(", "),
      notes: "Baseado nas preferencias liberadas no perfil e no ultimo check-in.",
    })),
  }));

  return {
    id: `diet-sql-${Date.now()}`,
    title: "Dieta teste SQL - Jonatas",
    startDate,
    endDate,
    nutritionalGoal: "Recomposicao corporal com alta proteina e controle de gordura.",
    recommendedMeals: "5",
    userAvailableMeals: String(getPayloadValue(checkin?.payload, ["mealAvailability", "availableMeals", "mealsPerDay"]) || 5),
    restrictionNotes: "Itens bloqueados no perfil foram evitados automaticamente.",
    preferenceNotes: "Plano prioriza alimentos marcados como gosto/quero incluir quando informados.",
    guidance: "Plano de teste salvo em tabelas SQL relacionais para consulta da IA por usuario, check-in e preferencias.",
    waterTargetLiters,
    meals: dayPlans[0].meals,
    dayPlans,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "seed-diet-demo",
      checkinId: checkin?.id ? String(checkin.id) : null,
      sqlBacked: true,
    },
    targets: {
      kcal: kcalTarget,
      protein: proteinG,
      carbs: carbsG,
      fats: fatsG,
      waterLiters: waterTargetLiters,
    },
  };
}

async function ensureDietSchema(client) {
  const migrationSql = fs.readFileSync(path.join(rootDir, "database", "diet_protocol_schema.sql"), "utf8");
  await client.query(migrationSql);
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("begin");
    await ensureDietSchema(client);

    const accountResult = await client.query(
      "select id, email from accounts where lower(email) = lower($1) limit 1;",
      [targetEmail]
    );

    const account = accountResult.rows[0];
    if (!account) {
      throw new Error(`Conta nao encontrada: ${targetEmail}`);
    }

    const checkinResult = await client.query(
      `
        select *
        from checkins
        where account_id = $1
          and status = 'completed'
        order by checkin_date desc, created_at desc, id desc
        limit 1;
      `,
      [account.id]
    );
    const checkin = checkinResult.rows[0] || null;
    const preferencesResult = await client.query(
      `
        select item_id, mark
        from food_preferences
        where account_id = $1
        order by item_id;
      `,
      [account.id]
    );
    const preferences = preferencesResult.rows;
    const blockedPreferences = preferences.filter((item) => blockedMarks.has(item.mark));
    const preferredPreferences = preferences.filter((item) => preferredMarks.has(item.mark));
    const weight = numberValue(checkin?.weight_kg || getPayloadValue(checkin?.payload, ["weight", "currentWeight"])) || 88.4;
    const kcalTarget = Math.round(weight * 28);
    const proteinG = Math.round(weight * 2.1);
    const fatsG = Math.round(weight * 0.8);
    const carbsG = Math.round((kcalTarget - proteinG * 4 - fatsG * 9) / 4);
    const waterTargetLiters = Number(Math.max(2.8, weight * 0.04).toFixed(1));
    const protocol = buildProtocol({
      checkin,
      preferences,
      kcalTarget,
      proteinG,
      carbsG,
      fatsG,
      waterTargetLiters,
    });

    await client.query(
      `
        update diet_plans
        set plan_status = 'archived',
            updated_at = current_timestamp
        where account_id = $1
          and plan_status = 'active';
      `,
      [account.id]
    );

    const planResult = await client.query(
      `
        insert into diet_plans (
          account_id,
          checkin_id,
          title,
          objective_summary,
          kcal_target,
          protein_g,
          carbs_g,
          fats_g,
          fiber_g,
          water_target_liters,
          variation_level,
          meal_count_available,
          generated_by,
          plan_status,
          valid_from,
          valid_until,
          source_preferences_snapshot,
          ai_context,
          payload
        )
        values (
          $1, $2, $3, $4, $5, $6, $7, $8, 32, $9, 'media', 5, 'manual_seed', 'active',
          $10::date, $11::date, $12::jsonb, $13::jsonb, $14::jsonb
        )
        returning id;
      `,
      [
        account.id,
        checkin?.id || null,
        protocol.title,
        protocol.nutritionalGoal,
        kcalTarget,
        proteinG,
        carbsG,
        fatsG,
        waterTargetLiters,
        protocol.startDate,
        protocol.endDate,
        JSON.stringify({
          preferredCount: preferredPreferences.length,
          blockedCount: blockedPreferences.length,
          preferred: preferredPreferences.slice(0, 80),
          blocked: blockedPreferences.slice(0, 80),
        }),
        JSON.stringify({
          source: "seed-diet-demo",
          checkinId: checkin?.id || null,
          rule: "Usar somente dados da conta e respeitar preferencias alimentares bloqueadas.",
        }),
        JSON.stringify(protocol),
      ]
    );

    const planId = planResult.rows[0].id;

    for (const [dayIndex, day] of days.entries()) {
      const dayMeals = buildMealsForDay(dayIndex, new Map(preferences.map((item) => [item.item_id, item.mark])));

      for (const [mealIndex, meal] of dayMeals.entries()) {
        const mealResult = await client.query(
          `
            insert into diet_meals (
              diet_plan_id,
              day_id,
              slot_id,
              meal_name,
              meal_time,
              order_index,
              enabled,
              meal_status,
              kcal_target,
              protein_g,
              carbs_g,
              fats_g,
              water_target_liters,
              notes
            )
            values ($1, $2, $3, $4, $5::time, $6, true, 'active', $7, $8, $9, $10, $11, $12)
            returning id;
          `,
          [
            planId,
            day.id,
            meal.id,
            meal.name,
            meal.time,
            mealIndex + 1,
            meal.calories,
            meal.protein,
            meal.carbs,
            meal.fats,
            Number((waterTargetLiters / meals.length).toFixed(2)),
            `${day.name}: refeicao estruturada para teste SQL.`,
          ]
        );

        const mealId = mealResult.rows[0].id;

        for (const [itemIndex, food] of meal.foods.entries()) {
          await client.query(
            `
              insert into diet_meal_items (
                diet_meal_id,
                food_preference_item_id,
                preference_mark,
                food_name,
                quantity_text,
                unit,
                kcal,
                protein_g,
                carbs_g,
                fats_g,
                substitution_group,
                order_index,
                meal_item_status,
                notes
              )
              values ($1, $2, $3, $4, $5, null, $6, $7, $8, $9, $10, $11, 'active', $12);
            `,
            [
              mealId,
              food.foodId,
              food.mark,
              food.name,
              food.quantity,
              food.kcal,
              food.protein,
              food.carbs,
              food.fats,
              meal.id,
              itemIndex + 1,
              food.notes || "Item liberado pelo perfil ou usado como base de teste.",
            ]
          );
        }
      }
    }

    await client.query("commit");

    console.log(`Dieta SQL criada para ${account.email}`);
    console.log(`account_id=${account.id} diet_plan_id=${planId} checkin_id=${checkin?.id || "sem_checkin"}`);
    console.log(`targets=${kcalTarget} kcal, P ${proteinG}g, C ${carbsG}g, G ${fatsG}g, agua ${waterTargetLiters}L`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
