import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { appConfig } from "./config/app.config.js";
import { requireAuth } from "./middlewares/auth.middleware.js";
import { pool, testDatabaseConnection } from "./utils/db.js";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware.js";
import { validate } from "./middlewares/validate.middleware.js";
import {
  signUpSchema,
  signInSchema,
  aiChatSchema,
  aiGenerateSchema,
  checkoutSessionSchema,
  subscriptionChangeSessionSchema,
  setDefaultPaymentMethodSchema,
  planChangeAcceptanceSchema,
  saveProfileSchema,
  saveSettingsSchema,
} from "./schemas/index.js";
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
import { ensureLocalBillingTables, provisionPartnerSubscriptions } from "./modules/billing/billing.service.js";
import { handleLoadProfile, handleSaveProfile } from "./modules/users/users.controller.js";
import {
  handleListWorkoutHistory,
  handleListWorkoutSessions,
  handleLoadWorkoutPlan,
  handleRestoreWorkoutPlan,
  handleSaveWorkoutPlan,
  handleSaveWorkoutSession,
} from "./modules/workouts/workouts.controller.js";
import { ensureLocalWorkoutTables } from "./modules/workouts/workouts.service.js";
import {
  handleListDietHistory,
  handleListDietMealLogs,
  handleLoadDietPlan,
  handleRestoreDietPlan,
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
import { ensureLocalAssistantTables } from "./modules/assistant/assistant.service.js";
import { handleLoadSettings, handleSaveSettings } from "./modules/settings/settings.controller.js";
import { ensureLocalSettingsTables } from "./modules/settings/settings.service.js";
import {
  handleAiChat,
  handleGenerateAiDiet,
  handleGenerateAiWorkout,
} from "./modules/ai/ai.controller.js";
import { ensureLocalAiTables } from "./modules/ai/ai.service.js";
import { handleLoadChatHistory } from "./modules/chat/chat.controller.js";
import { ensureLocalChatTables } from "./modules/chat/chat.service.js";
import {
  handleListTables,
  handleGetTableData,
  handleRunQuery,
} from "./modules/admin/admin.controller.js";
import { requireAdmin } from "./modules/admin/admin.service.js";

// ── Startup validation ────────────────────────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const missingSecrets = [];
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === "shape_certo_dev_secret") {
    missingSecrets.push("JWT_SECRET");
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    missingSecrets.push("STRIPE_WEBHOOK_SECRET");
  }
  if (missingSecrets.length) {
    console.error(`[FATAL] Variaveis de ambiente obrigatorias ausentes em producao: ${missingSecrets.join(", ")}`);
    process.exit(1);
  }
}

const app = express();
const allowedOrigins = new Set(appConfig.allowedOrigins);

// Confia no primeiro proxy reverso (Nginx) para que o express-rate-limit
// leia corretamente o IP real do cliente via X-Forwarded-For
app.set("trust proxy", 1);

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // inline scripts necessários para SPA
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.stripe.com", "https://api.openai.com"],
        frameSrc: ["'self'", "https://js.stripe.com"],
        fontSrc: ["'self'", "data:"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // evita quebrar Stripe.js
  })
);

// ── CORS ──────────────────────────────────────────────────────────────────────
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

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20,                   // máx 20 tentativas por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas tentativas. Aguarde 15 minutos e tente novamente." },
  skip: (req) => process.env.NODE_ENV !== "production", // ativo apenas em prod
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisicoes. Tente novamente em instantes." },
  skip: (req) => process.env.NODE_ENV !== "production",
});

// Endpoints de IA consomem tokens OpenAI — limite bem mais conservador
const aiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 6,                   // máx 6 chamadas de IA por minuto por IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Limite de requisicoes de IA atingido. Aguarde 1 minuto." },
  skip: (req) => process.env.NODE_ENV !== "production",
});
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

app.use(generalLimiter);

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

// REMOVIDO: /db/tables — rota de debug, não deve existir em produção.
// Para inspecionar tabelas, use o cliente de banco diretamente.

// ── Auth ──────────────────────────────────────────────────────────────────────
app.post("/auth/signup",          authLimiter, validate(signUpSchema), handleSignUp);
app.post("/auth/login",           authLimiter, validate(signInSchema), handleSignIn);
app.post("/auth/logout",          requireAuth, handleSignOut);
app.get( "/auth/me",              requireAuth, handleMe);
app.get( "/auth/google",          handleGoogleStart);
app.get( "/auth/google/callback", handleGoogleCallback);

// ── Perfil e configurações ────────────────────────────────────────────────────
app.get("/profile",   requireAuth, handleLoadProfile);
app.put("/profile",   requireAuth, validate(saveProfileSchema), handleSaveProfile);
app.get("/settings",  requireAuth, handleLoadSettings);
app.put("/settings",  requireAuth, validate(saveSettingsSchema), handleSaveSettings);

// ── Check-ins ─────────────────────────────────────────────────────────────────
app.get(   "/checkins", requireAuth, handleListCheckins);
app.post(  "/checkins", requireAuth, handleSaveCheckin);
app.delete("/checkins", requireAuth, handleDeleteCheckins);

// ── Billing ───────────────────────────────────────────────────────────────────
app.get("/billing/plan-change-acceptances",              requireAuth, handleListPlanChangeAcceptances);
app.post("/billing/plan-change-acceptances",             requireAuth, validate(planChangeAcceptanceSchema), handleSavePlanChangeAcceptance);
app.get("/billing/subscription",                         requireAuth, handleLoadBillingSummary);
app.get("/billing/stripe/payment-methods",               requireAuth, handleListStripePaymentMethods);
app.put("/billing/stripe/default-payment-method",        requireAuth, validate(setDefaultPaymentMethodSchema), handleSetDefaultStripePaymentMethod);
app.post("/billing/stripe/checkout-session",             requireAuth, validate(checkoutSessionSchema), handleCreateStripeCheckoutSession);
app.post("/billing/stripe/subscription-change-session",  requireAuth, validate(subscriptionChangeSessionSchema), handleCreateStripeSubscriptionChangeSession);
app.post("/billing/stripe/payment-method-session",       requireAuth, handleCreateStripePaymentMethodSession);
app.post("/billing/stripe/portal-session",               requireAuth, handleCreateStripePortalSession);

// ── Treinos ───────────────────────────────────────────────────────────────────
app.get( "/workouts/active",       requireAuth, handleLoadWorkoutPlan);
app.put( "/workouts/active",       requireAuth, handleSaveWorkoutPlan);
app.get( "/workouts/history",      requireAuth, handleListWorkoutHistory);
app.post("/workouts/restore/:id",  requireAuth, handleRestoreWorkoutPlan);
app.get( "/workout-sessions",      requireAuth, handleListWorkoutSessions);
app.post("/workout-sessions",      requireAuth, handleSaveWorkoutSession);

// ── Dietas ────────────────────────────────────────────────────────────────────
app.get( "/diets/active",          requireAuth, handleLoadDietPlan);
app.put( "/diets/active",          requireAuth, handleSaveDietPlan);
app.get( "/diets/history",         requireAuth, handleListDietHistory);
app.post("/diets/restore/:id",     requireAuth, handleRestoreDietPlan);
app.get( "/diets/meal-logs",       requireAuth, handleListDietMealLogs);
app.post("/diets/meal-logs",       requireAuth, handleSaveDietMealLog);

// ── Preferências ──────────────────────────────────────────────────────────────
app.get("/preferences/foods",         requireAuth, handleLoadFoodPreferences);
app.put("/preferences/foods",         requireAuth, handleSaveFoodPreferences);
app.get("/preferences/gym-equipment", requireAuth, handleLoadGymEquipment);
app.put("/preferences/gym-equipment", requireAuth, handleSaveGymEquipment);

// ── Assistente e IA ───────────────────────────────────────────────────────────
app.get( "/assistant/context", requireAuth, handleLoadAssistantContext);
app.post("/ai/chat",    requireAuth, aiLimiter, validate(aiChatSchema),    handleAiChat);
app.post("/ai/diet",    requireAuth, aiLimiter, validate(aiGenerateSchema), handleGenerateAiDiet);
app.post("/ai/workout", requireAuth, aiLimiter, validate(aiGenerateSchema), handleGenerateAiWorkout);
app.get( "/chat/history", requireAuth, handleLoadChatHistory);

// ── Admin (acesso restrito ao admin) ─────────────────────────────────────────
app.get( "/admin/tables",             requireAuth, requireAdmin, handleListTables);
app.get( "/admin/tables/:tableName",  requireAuth, requireAdmin, handleGetTableData);
app.post("/admin/query",              requireAuth, requireAdmin, handleRunQuery);

app.use(notFoundHandler);
app.use(errorHandler);

await ensureLocalAuthColumns();
await ensureLocalCheckinColumns();
await ensureLocalBillingTables();
await provisionPartnerSubscriptions();
await ensureLocalWorkoutTables();
await ensureLocalDietTables();
await ensureLocalPreferenceTables();
await ensureGoogleRiscTables();
await ensureLocalSettingsTables();
await ensureLocalAiTables();
await ensureLocalChatTables();
await ensureLocalAssistantTables();

app.listen(appConfig.port, () => {
  console.log(`Shape Certo API running on http://localhost:${appConfig.port}`);
});
