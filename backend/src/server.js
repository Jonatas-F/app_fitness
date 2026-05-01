import "dotenv/config";
import cors from "cors";
import express from "express";
import { appConfig } from "./config/app.config.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import { pool, testDatabaseConnection } from "./utils/db.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import {
  handleMe,
  handleGoogleCallback,
  handleGoogleStart,
  handleSignIn,
  handleSignOut,
  handleSignUp,
} from "./modules/auth/auth.controller.js";
import { ensureLocalAuthColumns } from "./modules/auth/auth.service.js";
import {
  handleDeleteCheckins,
  handleListCheckins,
  handleSaveCheckin,
} from "./modules/checkins/checkins.controller.js";
import { ensureLocalCheckinColumns } from "./modules/checkins/checkins.service.js";
import {
  handleCreateStripeCheckoutSession,
  handleCreateStripePaymentMethodSession,
  handleCreateStripePortalSession,
  handleCreateStripeSubscriptionChangeSession,
  handleLoadBillingSummary,
  handleListStripePaymentMethods,
  handleListPlanChangeAcceptances,
  handleSavePlanChangeAcceptance,
  handleSetDefaultStripePaymentMethod,
  handleStripeWebhook,
} from "./modules/billing/billing.controller.js";
import { ensureLocalBillingTables } from "./modules/billing/billing.service.js";
import { handleLoadProfile, handleSaveProfile } from "./modules/users/users.controller.js";
import {
  handleListWorkoutSessions,
  handleLoadWorkoutPlan,
  handleSaveWorkoutPlan,
  handleSaveWorkoutSession,
} from "./modules/workouts/workouts.controller.js";
import { ensureLocalWorkoutTables } from "./modules/workouts/workouts.service.js";
import {
  handleListDietMealLogs,
  handleListDietHistory,
  handleLoadDietPlan,
  handleSaveDietMealLog,
  handleSaveDietPlan,
} from "./modules/diets/diets.controller.js";
import { ensureLocalDietTables } from "./modules/diets/diets.service.js";
import {
  handleLoadFoodPreferences,
  handleLoadGymEquipment,
  handleSaveFoodPreferences,
  handleSaveGymEquipment,
} from "./modules/preferences/preferences.controller.js";
import { ensureLocalPreferenceTables } from "./modules/preferences/preferences.service.js";
import { handleGoogleRiscEvent } from "./modules/security/googleRisc.controller.js";
import { ensureGoogleRiscTables } from "./modules/security/googleRisc.service.js";
import { handleLoadAssistantContext } from "./modules/assistant/assistant.controller.js";
import { handleLoadSettings, handleSaveSettings } from "./modules/settings/settings.controller.js";
import { ensureLocalSettingsTables } from "./modules/settings/settings.service.js";
import {
  handleAiChat,
  handleGenerateAiDiet,
  handleGenerateAiWorkout,
} from "./modules/ai/ai.controller.js";
import { ensureLocalAiTables } from "./modules/ai/ai.service.js";

const app = express();
const allowedOrigins = new Set(appConfig.allowedOrigins);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origem nao permitida pelo CORS."));
    },
  })
);
app.post("/billing/stripe/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
app.post(
  "/security/google-risc/events",
  express.raw({
    type: ["application/secevent+jwt", "text/plain", "application/jwt"],
    limit: "256kb",
  }),
  handleGoogleRiscEvent
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", async (req, res, next) => {
  try {
    const database = await testDatabaseConnection();

    res.json({
      status: "ok",
      api: "shape-certo-backend",
      database,
    });
  } catch (error) {
    next(error);
  }
});

app.get("/db/tables", async (req, res, next) => {
  try {
    const result = await pool.query(`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
      order by table_name;
    `);

    res.json({
      tables: result.rows.map((row) => row.table_name),
    });
  } catch (error) {
    next(error);
  }
});

app.post("/auth/signup", handleSignUp);
app.post("/auth/login", handleSignIn);
app.post("/auth/logout", requireAuth, handleSignOut);
app.get("/auth/me", requireAuth, handleMe);
app.get("/auth/google", handleGoogleStart);
app.get("/auth/google/callback", handleGoogleCallback);
app.get("/profile", requireAuth, handleLoadProfile);
app.put("/profile", requireAuth, handleSaveProfile);
app.get("/settings", requireAuth, handleLoadSettings);
app.put("/settings", requireAuth, handleSaveSettings);
app.get("/checkins", requireAuth, handleListCheckins);
app.post("/checkins", requireAuth, handleSaveCheckin);
app.delete("/checkins", requireAuth, handleDeleteCheckins);
app.get("/billing/plan-change-acceptances", requireAuth, handleListPlanChangeAcceptances);
app.post("/billing/plan-change-acceptances", requireAuth, handleSavePlanChangeAcceptance);
app.get("/billing/subscription", requireAuth, handleLoadBillingSummary);
app.get("/billing/stripe/payment-methods", requireAuth, handleListStripePaymentMethods);
app.put("/billing/stripe/default-payment-method", requireAuth, handleSetDefaultStripePaymentMethod);
app.post("/billing/stripe/checkout-session", requireAuth, handleCreateStripeCheckoutSession);
app.post("/billing/stripe/subscription-change-session", requireAuth, handleCreateStripeSubscriptionChangeSession);
app.post("/billing/stripe/payment-method-session", requireAuth, handleCreateStripePaymentMethodSession);
app.post("/billing/stripe/portal-session", requireAuth, handleCreateStripePortalSession);
app.get("/workouts/active", requireAuth, handleLoadWorkoutPlan);
app.put("/workouts/active", requireAuth, handleSaveWorkoutPlan);
app.get("/workout-sessions", requireAuth, handleListWorkoutSessions);
app.post("/workout-sessions", requireAuth, handleSaveWorkoutSession);
app.get("/diets/active", requireAuth, handleLoadDietPlan);
app.put("/diets/active", requireAuth, handleSaveDietPlan);
app.get("/diets/history", requireAuth, handleListDietHistory);
app.get("/diets/meal-logs", requireAuth, handleListDietMealLogs);
app.post("/diets/meal-logs", requireAuth, handleSaveDietMealLog);
app.get("/preferences/foods", requireAuth, handleLoadFoodPreferences);
app.put("/preferences/foods", requireAuth, handleSaveFoodPreferences);
app.get("/preferences/gym-equipment", requireAuth, handleLoadGymEquipment);
app.put("/preferences/gym-equipment", requireAuth, handleSaveGymEquipment);
app.get("/assistant/context", requireAuth, handleLoadAssistantContext);
app.post("/ai/chat", requireAuth, handleAiChat);
app.post("/ai/diet", requireAuth, handleGenerateAiDiet);
app.post("/ai/workout", requireAuth, handleGenerateAiWorkout);

app.use(notFoundHandler);
app.use(errorHandler);

await ensureLocalAuthColumns();
await ensureLocalCheckinColumns();
await ensureLocalBillingTables();
await ensureLocalWorkoutTables();
await ensureLocalDietTables();
await ensureLocalPreferenceTables();
await ensureGoogleRiscTables();
await ensureLocalSettingsTables();
await ensureLocalAiTables();

app.listen(appConfig.port, () => {
  console.log(`Shape Certo API running on http://localhost:${appConfig.port}`);
});
