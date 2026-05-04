import { z } from "zod";

const VALID_PLANS = ["basico", "intermediario", "pro", "avancado"];
const VALID_CYCLES = ["monthly", "annual"];

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signUpSchema = z.object({
  email: z
    .string({ required_error: "Email obrigatorio." })
    .email("Email invalido.")
    .max(255)
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string({ required_error: "Senha obrigatoria." })
    .min(8, "A senha deve ter pelo menos 8 caracteres.")
    .max(128, "Senha muito longa."),
  fullName: z.string().max(200).optional().default(""),
  plan: z.enum(VALID_PLANS, { message: "Plano invalido." }).optional().default("intermediario"),
});

export const signInSchema = z.object({
  email: z
    .string({ required_error: "Email obrigatorio." })
    .email("Email invalido.")
    .max(255)
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string({ required_error: "Senha obrigatoria." })
    .min(1, "Senha obrigatoria.")
    .max(128),
});

// ── AI ────────────────────────────────────────────────────────────────────────

export const aiChatSchema = z.object({
  message: z
    .string({ required_error: "Mensagem obrigatoria." })
    .min(1, "Mensagem nao pode ser vazia.")
    .max(4000, "Mensagem muito longa (maximo 4000 caracteres)."),
  personalName: z.string().max(100).optional(),
});

// Geração de dieta / treino: payload complexo — apenas limita tamanho total
// (a serialização garante no máximo 2 MB pelo express.json)
export const aiGenerateSchema = z.object({}).passthrough();

// ── Billing ───────────────────────────────────────────────────────────────────

export const checkoutSessionSchema = z.object({
  planId: z.enum(VALID_PLANS, { message: "Plano invalido." }),
  billingCycle: z.enum(VALID_CYCLES, { message: "Ciclo de cobranca invalido." }),
  installments: z
    .union([z.string(), z.number()])
    .transform((v) => String(v))
    .optional(),
  returnMode: z.string().max(20).optional(),
});

export const subscriptionChangeSessionSchema = z.object({
  planId: z.enum(VALID_PLANS, { message: "Plano invalido." }),
  billingCycle: z.enum(VALID_CYCLES, { message: "Ciclo invalido." }),
});

export const setDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z
    .string({ required_error: "paymentMethodId obrigatorio." })
    .min(1)
    .max(100),
});

export const planChangeAcceptanceSchema = z.object({
  nextPlan: z.enum(VALID_PLANS, { message: "nextPlan invalido." }),
  previousPlan: z.enum(VALID_PLANS).optional(),
  billingCycle: z.enum(VALID_CYCLES).optional(),
  previousBillingCycle: z.enum(VALID_CYCLES).optional(),
  note: z.string().max(500).optional(),
});

// ── Profile ───────────────────────────────────────────────────────────────────

export const saveProfileSchema = z
  .object({
    fullName: z.string().max(200).optional(),
    phone: z.string().max(30).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "birthDate deve estar no formato AAAA-MM-DD.")
      .optional()
      .nullable(),
    gymName: z.string().max(200).optional().nullable(),
    avatarUrl: z.string().url("avatarUrl invalido.").max(500).optional().nullable(),
  })
  .passthrough(); // permite campos extras sem rejeitar

// ── Settings ──────────────────────────────────────────────────────────────────

// Body pode ser grande e variado; validamos apenas o que pode causar dano
export const saveSettingsSchema = z
  .object({
    activePlan: z.enum(VALID_PLANS).optional(),
    billingCycle: z.enum(VALID_CYCLES).optional(),
  })
  .passthrough();
