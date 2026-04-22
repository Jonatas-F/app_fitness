import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const TARGET_EMAIL = "jonatas.freire.prof@gmail.com";
const SEED_SOURCE = "dashboard-demo-3m";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL nao configurada em backend/.env.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_SSL === "true"
      ? {
          rejectUnauthorized: false,
        }
      : false,
});

const workouts = [
  {
    id: "monday",
    title: "Segunda-feira",
    shortTitle: "Segunda",
    enabled: true,
    focus: "Peito, ombro e triceps",
    exercises: [
      ["supino-maquina", "Supino maquina", 3, "8-12", 90],
      ["chest-press", "Chest press", 3, "8-12", 90],
      ["desenvolvimento-maquina", "Desenvolvimento maquina", 4, "8-10", 105],
      ["triceps-extension", "Triceps extension machine", 3, "10-12", 75],
    ],
  },
  {
    id: "tuesday",
    title: "Terca-feira",
    shortTitle: "Terca",
    enabled: true,
    focus: "Costas e biceps",
    exercises: [
      ["puxada-alta", "Puxada alta", 4, "8-12", 90],
      ["remada-baixa", "Remada baixa", 3, "8-12", 90],
      ["pullover-machine", "Pullover machine", 3, "10-12", 75],
      ["biceps-curl", "Biceps curl machine", 3, "10-12", 75],
    ],
  },
  {
    id: "wednesday",
    title: "Quarta-feira",
    shortTitle: "Quarta",
    enabled: true,
    focus: "Pernas",
    exercises: [
      ["leg-press-45", "Leg press 45", 4, "8-10", 120],
      ["cadeira-extensora", "Cadeira extensora", 4, "10-12", 90],
      ["mesa-flexora", "Mesa flexora", 3, "10-12", 90],
      ["panturrilha-sentada", "Panturrilha sentada", 4, "12-15", 60],
    ],
  },
  {
    id: "thursday",
    title: "Quinta-feira",
    shortTitle: "Quinta",
    enabled: true,
    focus: "Gluteos, posterior e complementares",
    exercises: [
      ["hip-thrust", "Hip thrust machine", 4, "8-10", 120],
      ["abdutora", "Abdutora", 3, "12-15", 60],
      ["reverse-fly", "Reverse fly machine", 3, "12-15", 60],
      ["abdominal-crunch", "Abdominal crunch machine", 3, "12-15", 60],
    ],
  },
  {
    id: "friday",
    title: "Sexta-feira",
    shortTitle: "Sexta",
    enabled: false,
    focus: "Acessorios e condicionamento",
    exercises: [
      ["lateral-raise", "Lateral raise machine", 3, "12-15", 60],
      ["rotary-torso", "Rotary torso", 3, "12-15", 60],
    ],
  },
  {
    id: "saturday",
    title: "Sabado",
    shortTitle: "Sabado",
    enabled: false,
    focus: "Full body tecnico",
    exercises: [
      ["seated-row", "Seated row", 3, "10-12", 75],
      ["abdominal-crunch", "Abdominal crunch machine", 3, "12-15", 60],
    ],
  },
  {
    id: "sunday",
    title: "Domingo",
    shortTitle: "Domingo",
    enabled: false,
    focus: "Mobilidade e recuperacao ativa",
    exercises: [
      ["roman-chair", "Roman chair", 3, "12-15", 60],
      ["back-extension", "Back extension machine", 3, "12-15", 60],
    ],
  },
];

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function atLocalNoon(date) {
  const next = new Date(date);
  next.setHours(12, 0, 0, 0);
  return next.toISOString();
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function makeWorkoutPlan() {
  return {
    seedSource: SEED_SOURCE,
    weeklyTrainingDays: "4",
    trainingShift: "noite",
    split: "4 dias por semana",
    workouts: workouts.map((workout) => ({
      ...workout,
      exercises: workout.exercises.map(([id, name, suggestedSets, suggestedReps, restSeconds]) => ({
        id: `${workout.id}-${id}`,
        name,
        suggestedSets: String(suggestedSets),
        suggestedReps,
        restSeconds,
        executionVideoUrl: "",
        userVideoFileName: "",
        aiFeedback: "",
        notes: "",
        sets: Array.from({ length: 5 }, (_, index) => ({
          set: index + 1,
          enabled: index < suggestedSets,
          weight: "",
          reps: "",
        })),
      })),
    })),
    updatedAt: new Date().toISOString(),
  };
}

function makeCheckinPayload({ cadence, date, weekIndex, monthly = false, status = "completed" }) {
  const declineWeeks = new Set([3, 8, 11]);
  const recoveryWeeks = new Set([4, 9, 12]);
  const decline = declineWeeks.has(weekIndex);
  const recovery = recoveryWeeks.has(weekIndex);
  const progress = Math.max(0, weekIndex);
  const weight = 92.4 - progress * 0.32 + (decline ? 0.8 : 0) - (recovery ? 0.2 : 0);
  const bodyFat = 26.1 - progress * 0.23 + (decline ? 0.55 : 0);
  const muscleMass = 66.1 + progress * 0.15 - (decline ? 0.45 : 0) + (recovery ? 0.2 : 0);
  const adherence = decline ? 58 : recovery ? 91 : 78 + (progress % 4) * 4;
  const sleep = decline ? 5.8 : recovery ? 7.6 : 6.6 + (progress % 3) * 0.25;
  const energy = decline ? 5 : recovery ? 9 : 7 + (progress % 2);
  const waist = 101.5 - progress * 0.48 + (decline ? 0.7 : 0);
  const abdomen = 106.4 - progress * 0.52 + (decline ? 0.9 : 0);
  const hip = 108.8 - progress * 0.16;
  const leanMass = weight - (weight * bodyFat) / 100;
  const fatMass = weight - leanMass;

  return {
    seedSource: SEED_SOURCE,
    cadence,
    status,
    goal: "recomposicao",
    sport: "",
    sex: "masculino",
    age: "29",
    weight: weight.toFixed(1),
    height: "178",
    energy: String(energy),
    sleep: sleep.toFixed(1),
    adherence: String(Math.round(adherence)),
    workoutAdherence: String(Math.round(adherence)),
    dietAdherence: String(Math.max(52, Math.round(adherence - (decline ? 8 : 3)))),
    hunger: decline ? "8" : "5",
    stress: decline ? "8" : recovery ? "3" : "5",
    digestion: decline ? "regular" : "boa",
    sleepQuality: decline ? "baixa" : recovery ? "alta" : "media",
    fatigueLevel: decline ? "alta" : recovery ? "baixa" : "media",
    trainingPerformance: decline ? "queda de rendimento" : recovery ? "melhor semana do ciclo" : "estavel",
    weeklyWorkoutsPlanned: "4",
    weeklyWorkoutsCompleted: decline ? "2" : recovery ? "4" : progress % 5 === 0 ? "3" : "4",
    dietMealsPlanned: "35",
    dietMealsCompleted: String(decline ? 23 : recovery ? 33 : 28 + (progress % 4)),
    protocolAction: decline ? "request-adjustment" : "monitor",
    notes: decline
      ? "Semana com queda de sono, mais estresse e menor aderencia. Reduzir volume se a proxima semana repetir o padrao."
      : recovery
        ? "Boa recuperacao, cargas subindo e aderencia alta. Pode manter progressao controlada."
        : "Semana consistente, fome controlada e boa resposta ao protocolo.",
    photoNote: "",
    photos: [
      { id: "front-double-biceps", title: "Frente - duplo biceps", pose: "double-front", fileName: `fake-${isoDate(date)}-front.svg`, selected: true },
      { id: "back-double-biceps", title: "Costas - duplo biceps", pose: "double-back", fileName: `fake-${isoDate(date)}-back.svg`, selected: true },
      { id: "front-normal", title: "Frente - bracos baixo", pose: "front", fileName: `fake-${isoDate(date)}-normal.svg`, selected: true },
      { id: "back-normal", title: "Costas - bracos baixo", pose: "back", fileName: `fake-${isoDate(date)}-back-normal.svg`, selected: true },
      { id: "side-normal", title: "Lateral - bracos baixo", pose: "side", fileName: `fake-${isoDate(date)}-side.svg`, selected: true },
    ],
    wakeTime: "06:30",
    sleepTime: "23:00",
    firstMealTime: "07:20",
    lastMealTime: "21:15",
    plannedTrainingTime: "19:00",
    mealsPerDay: "5",
    dietVariety: progress < 5 ? "baixa" : progress < 10 ? "media" : "alta",
    weeklyTrainingDays: "4",
    trainingShift: "noite",
    availableMinutes: "60",
    trainingExperience: "intermediario",
    trainingAge: "2-5 anos",
    trainingBackground: "Musculacao desde 2021, boa tecnica em maquinas e dificuldade em consistencia quando o trabalho aperta.",
    trainingBackgroundTags: ["musculacao"],
    injuries: decline ? "Desconforto leve no joelho direito em agachamentos profundos." : "Sem dor relevante na semana.",
    injuryTags: decline ? ["joelho"] : [],
    ...(monthly
      ? {
          totalBodyWeight: weight.toFixed(1),
          bodyFat: bodyFat.toFixed(1),
          bioimpedanceBodyFat: bodyFat.toFixed(1),
          leanMass: leanMass.toFixed(1),
          fatMass: fatMass.toFixed(1),
          muscleMass: muscleMass.toFixed(1),
          skeletalMuscleMass: (muscleMass - 3.8).toFixed(1),
          totalBodyWater: (49.2 + progress * 0.1 - (decline ? 0.4 : 0)).toFixed(1),
          boneMass: "3.4",
          basalMetabolicRate: String(Math.round(1900 + progress * 8)),
          rightArmMuscleMass: (3.8 + progress * 0.025 - (decline ? 0.05 : 0)).toFixed(2),
          leftArmMuscleMass: (3.7 + progress * 0.024 - (decline ? 0.05 : 0)).toFixed(2),
          rightLegMuscleMass: (10.9 + progress * 0.045 - (decline ? 0.08 : 0)).toFixed(2),
          leftLegMuscleMass: (10.7 + progress * 0.044 - (decline ? 0.08 : 0)).toFixed(2),
          trunkMuscleMass: (31.8 + progress * 0.06 - (decline ? 0.12 : 0)).toFixed(2),
          rightArmFat: (2.4 - progress * 0.025 + (decline ? 0.06 : 0)).toFixed(2),
          leftArmFat: (2.5 - progress * 0.024 + (decline ? 0.06 : 0)).toFixed(2),
          rightLegFat: (4.5 - progress * 0.045 + (decline ? 0.08 : 0)).toFixed(2),
          leftLegFat: (4.6 - progress * 0.044 + (decline ? 0.08 : 0)).toFixed(2),
          trunkFat: (10.2 - progress * 0.08 + (decline ? 0.14 : 0)).toFixed(2),
          waist: waist.toFixed(1),
          abdomen: abdomen.toFixed(1),
          hip: hip.toFixed(1),
          chestMeasure: (107.2 - progress * 0.06 + (recovery ? 0.2 : 0)).toFixed(1),
          rightArmMeasure: (37.2 + progress * 0.04 - (decline ? 0.1 : 0)).toFixed(1),
          leftArmMeasure: (36.8 + progress * 0.04 - (decline ? 0.1 : 0)).toFixed(1),
          rightFlexedArmMeasure: (39.6 + progress * 0.05 - (decline ? 0.1 : 0)).toFixed(1),
          leftFlexedArmMeasure: (39.1 + progress * 0.05 - (decline ? 0.1 : 0)).toFixed(1),
          rightThighMeasure: (62.1 + progress * 0.03 - (decline ? 0.2 : 0)).toFixed(1),
          leftThighMeasure: (61.8 + progress * 0.03 - (decline ? 0.2 : 0)).toFixed(1),
          rightCalfMeasure: (40.1 + progress * 0.02).toFixed(1),
          leftCalfMeasure: (39.8 + progress * 0.02).toFixed(1),
          metabolicAge: String(Math.round(33 - progress * 0.2 + (decline ? 1 : 0))),
          visceralFat: (11.2 - progress * 0.12 + (decline ? 0.2 : 0)).toFixed(1),
          bmi: (weight / 1.78 / 1.78).toFixed(1),
          restingHeartRate: String(Math.round(72 - progress * 0.35 + (decline ? 3 : 0))),
          averageTrainingHeartRate: String(Math.round(132 + progress * 0.3)),
          estimatedVo2: (37.2 + progress * 0.35 - (decline ? 0.8 : 0)).toFixed(1),
        }
      : {}),
    completeness: monthly ? 96 : 82,
    aiContext: {
      cadence,
      status,
      readiness: decline ? "media" : "alta",
      inferencePolicy: "Dados fake de demonstracao para validar dashboard. Usar apenas para este usuario.",
      regenerationPolicy: decline ? "Avaliar ajuste por baixa aderencia." : "Manter protocolo e monitorar.",
      goal: "recomposicao",
    },
    createdAt: atLocalNoon(date),
  };
}

function makeSessionPayload(workout, date, weekIndex, workoutIndex) {
  const decline = [3, 8, 11].includes(weekIndex);
  const recovery = [4, 9, 12].includes(weekIndex);
  const progression = weekIndex * 1.8 + workoutIndex * 0.7 - (decline ? 5 : 0) + (recovery ? 2 : 0);
  const startedAt = atLocalNoon(date);

  return {
    seedSource: SEED_SOURCE,
    id: `seed-${workout.id}-${isoDate(date)}`,
    workoutId: workout.id,
    workoutTitle: workout.title,
    startedAt,
    createdAt: startedAt,
    exercises: workout.exercises.map((exercise, exerciseIndex) => {
      const base = workout.id === "wednesday" ? 70 : workout.id === "thursday" ? 55 : 28;
      const weight = Math.max(8, base + exerciseIndex * 7 + progression);

      return {
        id: exercise.id,
        name: exercise.name,
        sets: Array.from({ length: Number(exercise.suggestedSets || 3) }, (_, setIndex) => ({
          set: setIndex + 1,
          enabled: true,
          weight: String(Math.round(weight + setIndex * 2.5)),
          reps: String(decline ? 7 + (setIndex % 2) : recovery ? 11 : 9 + (setIndex % 3)),
        })),
      };
    }),
  };
}

async function upsertCheckin(client, accountId, checkin) {
  const dateKey = isoDate(new Date(checkin.createdAt));
  const payload = { ...checkin };
  const aiContext = payload.aiContext || {};

  await client.query(
    `
      insert into checkins (
        account_id,
        checkin_date,
        weight_kg,
        energy_score,
        sleep_score,
        workout_adherence_pct,
        observations,
        cadence,
        status,
        payload,
        ai_context,
        created_at,
        updated_at
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, 'completed', $9::jsonb, $10::jsonb, $11, current_timestamp)
      on conflict (account_id, cadence, checkin_date)
      do update set weight_kg = excluded.weight_kg,
                    energy_score = excluded.energy_score,
                    sleep_score = excluded.sleep_score,
                    workout_adherence_pct = excluded.workout_adherence_pct,
                    observations = excluded.observations,
                    status = excluded.status,
                    payload = excluded.payload,
                    ai_context = excluded.ai_context,
                    created_at = excluded.created_at,
                    updated_at = current_timestamp;
    `,
    [
      accountId,
      dateKey,
      Number(checkin.weight),
      Number(checkin.energy),
      Math.round(Number(checkin.sleep)),
      Number(checkin.workoutAdherence || checkin.adherence),
      checkin.notes,
      checkin.cadence,
      JSON.stringify(payload),
      JSON.stringify(aiContext),
      checkin.createdAt,
    ]
  );
}

async function main() {
  const client = await pool.connect();

  try {
    await client.query("begin");

    await client.query(`
      alter table checkins
        add column if not exists cadence varchar(20) not null default 'monthly',
        add column if not exists status varchar(20) not null default 'completed',
        add column if not exists payload jsonb not null default '{}'::jsonb,
        add column if not exists ai_context jsonb not null default '{}'::jsonb;

      create unique index if not exists idx_checkins_account_cadence_date
        on checkins (account_id, cadence, checkin_date);
    `);

    await client.query(`
      alter table training_plans
        add column if not exists payload jsonb not null default '{}'::jsonb;

      create table if not exists workout_sessions (
        id bigint generated always as identity primary key,
        account_id bigint not null references accounts(id) on delete cascade,
        training_plan_id bigint references training_plans(id) on delete set null,
        workout_id text not null,
        workout_title text not null,
        payload jsonb not null default '{}'::jsonb,
        started_at timestamptz,
        performed_at timestamptz not null default now(),
        created_at timestamptz not null default now()
      );
    `);

    const accountResult = await client.query(
      `
        insert into accounts (email, auth_provider, account_status, plan_type, last_login_at)
        values ($1, 'google', 'active', 'avancado', current_timestamp)
        on conflict (email)
        do update set account_status = 'active',
                      plan_type = 'avancado',
                      updated_at = current_timestamp
        returning id;
      `,
      [TARGET_EMAIL]
    );
    const accountId = accountResult.rows[0].id;

    await client.query(
      `
        insert into user_profiles (
          account_id,
          full_name,
          sex,
          height_cm,
          current_weight_kg,
          activity_level,
          training_level,
          timezone
        )
        values ($1, 'Jonatas Freire', 'masculino', 178, 88.8, 'moderado', 'intermediario', 'America/Sao_Paulo')
        on conflict (account_id)
        do update set full_name = coalesce(nullif(user_profiles.full_name, ''), excluded.full_name),
                      sex = excluded.sex,
                      height_cm = excluded.height_cm,
                      current_weight_kg = excluded.current_weight_kg,
                      activity_level = excluded.activity_level,
                      training_level = excluded.training_level,
                      timezone = excluded.timezone,
                      updated_at = current_timestamp;
      `,
      [accountId]
    );

    const planPayload = makeWorkoutPlan();
    const planResult = await client.query(
      `
        insert into training_plans (
          account_id,
          title,
          objective_summary,
          difficulty_level,
          weekly_frequency,
          duration_weeks,
          generated_by,
          plan_status,
          valid_from,
          valid_until,
          payload
        )
        values ($1, 'Protocolo recomposicao 3 meses', 'Simulacao com evolucao e declinios para dashboard.', 'intermediario', 4, 12, 'seed', 'active', '2026-01-26', '2026-04-26', $2::jsonb)
        on conflict do nothing
        returning id;
      `,
      [accountId, JSON.stringify(planPayload)]
    );

    let trainingPlanId = planResult.rows[0]?.id;

    if (!trainingPlanId) {
      const updatedPlan = await client.query(
        `
          update training_plans
          set title = 'Protocolo recomposicao 3 meses',
              objective_summary = 'Simulacao com evolucao e declinios para dashboard.',
              difficulty_level = 'intermediario',
              weekly_frequency = 4,
              duration_weeks = 12,
              generated_by = 'seed',
              plan_status = 'active',
              valid_from = '2026-01-26',
              valid_until = '2026-04-26',
              payload = $2::jsonb,
              updated_at = current_timestamp
          where id = (
            select id
            from training_plans
            where account_id = $1
            order by case when plan_status = 'active' then 0 else 1 end, updated_at desc, id desc
            limit 1
          )
          returning id;
        `,
        [accountId, JSON.stringify(planPayload)]
      );
      trainingPlanId = updatedPlan.rows[0].id;
    }

    const weekStart = new Date("2026-01-26T12:00:00-03:00");
    const enabledWorkouts = planPayload.workouts.filter((workout) => workout.enabled);

    await client.query(
      `
        delete from workout_sessions
        where account_id = $1
          and payload->>'seedSource' = $2;
      `,
      [accountId, SEED_SOURCE]
    );

    for (let weekIndex = 0; weekIndex < 13; weekIndex += 1) {
      const weekDate = addDays(weekStart, weekIndex * 7);
      const weeklyCheckinDate = addDays(weekDate, 6);
      const weeklyPayload = makeCheckinPayload({
        cadence: "weekly",
        date: weeklyCheckinDate,
        weekIndex,
      });

      await upsertCheckin(client, accountId, weeklyPayload);

      const missedWorkoutIndexes = weekIndex === 3 ? [2, 3] : weekIndex === 8 ? [1] : weekIndex === 11 ? [0, 3] : [];

      for (let workoutIndex = 0; workoutIndex < enabledWorkouts.length; workoutIndex += 1) {
        if (missedWorkoutIndexes.includes(workoutIndex)) {
          continue;
        }

        const workout = enabledWorkouts[workoutIndex];
        const sessionDate = addDays(weekDate, workoutIndex);
        const sessionPayload = makeSessionPayload(workout, sessionDate, weekIndex, workoutIndex);

        await client.query(
          `
            insert into workout_sessions (
              account_id,
              training_plan_id,
              workout_id,
              workout_title,
              payload,
              started_at,
              performed_at,
              created_at
            )
            values ($1, $2, $3, $4, $5::jsonb, $6, $7, $7);
          `,
          [
            accountId,
            trainingPlanId,
            sessionPayload.workoutId,
            sessionPayload.workoutTitle,
            JSON.stringify(sessionPayload),
            sessionPayload.startedAt,
            sessionPayload.createdAt,
          ]
        );
      }
    }

    const monthlySeeds = [
      { date: new Date("2026-02-01T12:00:00-03:00"), weekIndex: 1 },
      { date: new Date("2026-03-01T12:00:00-03:00"), weekIndex: 5 },
      { date: new Date("2026-04-01T12:00:00-03:00"), weekIndex: 10 },
    ];

    for (const item of monthlySeeds) {
      await upsertCheckin(
        client,
        accountId,
        makeCheckinPayload({
          cadence: "monthly",
          date: item.date,
          weekIndex: item.weekIndex,
          monthly: true,
        })
      );
    }

    const dietPayload = {
      seedSource: SEED_SOURCE,
      title: "Plano alimentar recomposicao",
      nutritionalGoal: "Deficit leve com alta proteina e variacao media.",
      startDate: "2026-01-26",
      endDate: "2026-04-26",
      userAvailableMeals: "5",
      recommendedMeals: "5",
      meals: [
        { id: "breakfast", name: "Cafe da manha", enabled: true, calories: "520", protein: "38", carbs: "58", fats: "14", foods: "Ovos, aveia, banana e cafe.", notes: "Base fixa para aderencia." },
        { id: "lunch", name: "Almoco", enabled: true, calories: "720", protein: "52", carbs: "82", fats: "18", foods: "Arroz, feijao, patinho e salada.", notes: "Ajustar carbo nos dias de perna." },
        { id: "afternoon", name: "Cafe da tarde", enabled: true, calories: "360", protein: "32", carbs: "38", fats: "8", foods: "Iogurte, whey e fruta.", notes: "Opcao rapida." },
        { id: "pre-workout", name: "Pre-treino", enabled: false, calories: "", protein: "", carbs: "", fats: "", foods: "", notes: "Desabilitado neste protocolo." },
        { id: "dinner", name: "Janta", enabled: true, calories: "650", protein: "48", carbs: "62", fats: "20", foods: "Frango, batata-doce e legumes.", notes: "Manter refeicao simples." },
      ],
      dayPlans: [],
    };

    await client.query(
      `
        insert into diet_plans (
          account_id,
          title,
          objective_summary,
          kcal_target,
          protein_g,
          carbs_g,
          fats_g,
          water_target_liters,
          generated_by,
          plan_status,
          valid_from,
          valid_until,
          payload
        )
        values ($1, 'Plano alimentar recomposicao', 'Deficit leve com alta proteina e variacao media.', 2550, 190, 270, 72, 3.2, 'seed', 'active', '2026-01-26', '2026-04-26', $2::jsonb)
        on conflict do nothing;
      `,
      [accountId, JSON.stringify(dietPayload)]
    );

    await client.query("commit");

    console.log(JSON.stringify({
      ok: true,
      email: TARGET_EMAIL,
      accountId: String(accountId),
      weeklyCheckins: 13,
      monthlyCheckins: 3,
      workoutSessions: "simuladas por semana com gaps em semanas de declinio",
      seedSource: SEED_SOURCE,
    }, null, 2));
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
  process.exitCode = 1;
});
