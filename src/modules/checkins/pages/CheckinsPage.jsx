import { Children, createContext, isValidElement, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePlan } from "../../../hooks/usePlan";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import SectionCard from "@/components/ui/SectionCard";
import Skeleton from "@/components/ui/skeleton";
import StatusPill from "@/components/ui/StatusPill";
import {
  checkinCadences,
  checkinFieldLabels,
  defaultCheckinForm,
  getCheckinCadenceSummary,
  getCheckinMetrics,
  getMonthlyReevaluation,
  getWeeklyAiDataset,
  loadCheckins,
  persistCheckins,
  resetCheckins,
  saveCheckin,
  saveMissedCheckin,
  validateCheckinForm,
} from "../../../data/checkinStorage";
import {
  deleteRemoteCheckins,
  loadRemoteCheckins,
  saveRemoteCheckin,
} from "../../../services/checkinService";
import { loadDietProtocol, hydrateDietProtocolFromApi } from "../../../data/dietStorage";
import { hydrateWorkoutExecutionFromApi, loadWorkoutSessionHistory } from "../../../data/workoutExecutionStorage";
import { generateDietWithAi } from "../../../services/ai/diet.service";
import { generateWorkoutWithAi } from "../../../services/ai/workout.service";
import "./CheckinsPage.css";

const goalOptions = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "recomposicao", label: "Recomposicao corporal" },
  { value: "cutting", label: "Cutting" },
  { value: "condicionamento", label: "Condicionamento" },
  { value: "performance", label: "Esporte especifico" },
  { value: "saude", label: "Saude geral" },
];

const experienceOptions = [
  { value: "", label: "Selecione" },
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediario" },
  { value: "avancado", label: "Avancado" },
];

const weeklyTrainingDayOptions = ["1", "2", "3", "4", "5", "6", "7"];

const availableTrainingTimeOptions = [
  { value: "", label: "Selecione" },
  { value: "30", label: "30 min" },
  { value: "45", label: "45 min" },
  { value: "60", label: "60 min" },
  { value: "75", label: "75 min" },
  { value: "90", label: "90 min" },
  { value: "120", label: "120 min ou mais" },
];

const trainingAgeOptions = [
  { value: "", label: "Selecione" },
  { value: "nunca", label: "Nunca treinou" },
  { value: "menos-6-meses", label: "Menos de 6 meses" },
  { value: "6-12-meses", label: "6 a 12 meses" },
  { value: "1-2-anos", label: "1 a 2 anos" },
  { value: "2-5-anos", label: "2 a 5 anos" },
  { value: "mais-5-anos", label: "Mais de 5 anos" },
];

const sleepQualityOptions = [
  { value: "", label: "Selecione" },
  { value: "ruim", label: "Ruim" },
  { value: "regular", label: "Regular" },
  { value: "boa", label: "Boa" },
  { value: "excelente", label: "Excelente" },
];

const requiredCheckinFieldsByCadence = {
  weekly: [
    "height",
    "weight",
    "hunger",
    "stress",
    "digestion",
    "sleepQuality",
    "fatigueLevel",
    "trainingPerformance",
    "notes",
  ],
  monthly: [
    "height",
    "weight",
    "hunger",
    "stress",
    "digestion",
    "sleepQuality",
    "fatigueLevel",
    "trainingPerformance",
    "notes",
  ],
};

const optionalBioimpedanceFields = [
  "totalBodyWeight",
  "bioimpedanceBodyFat",
  "fatMass",
  "muscleMass",
  "skeletalMuscleMass",
  "totalBodyWater",
  "boneMass",
  "basalMetabolicRate",
  "rightArmMuscleMass",
  "leftArmMuscleMass",
  "rightLegMuscleMass",
  "leftLegMuscleMass",
  "trunkMuscleMass",
  "rightArmFat",
  "leftArmFat",
  "rightLegFat",
  "leftLegFat",
  "trunkFat",
  "metabolicAge",
  "visceralFat",
  "bmi",
];

const cadenceVisuals = {
  daily: {
    icon: "☀",
    action: "Preencher sinais de hoje",
  },
  weekly: {
    icon: "▦",
    action: "Fechar resumo da semana",
  },
  monthly: {
    icon: "◉",
    action: "Fazer reavaliacao completa",
  },
};

const photoPoseSlots = [
  {
    id: "front-double-biceps",
    title: "Frente duplo biceps",
    instruction: "Corpo inteiro, camera na altura do peito, bracos flexionados.",
    pose: "double-front",
  },
  {
    id: "side-relaxed",
    title: "Lateral bracos caidos",
    instruction: "Corpo inteiro de lado, postura natural, bracos soltos.",
    pose: "side",
  },
  {
    id: "back-double-biceps",
    title: "Costas duplo biceps",
    instruction: "Corpo inteiro de costas, bracos flexionados, mesma distancia.",
    pose: "double-back",
  },
  {
    id: "front-relaxed",
    title: "Frente normal",
    instruction: "Corpo inteiro de frente, bracos relaxados, pes alinhados.",
    pose: "front",
  },
  {
    id: "back-relaxed",
    title: "Costas normal",
    instruction: "Corpo inteiro de costas, bracos relaxados, postura neutra.",
    pose: "back",
  },
];

const FORM_CONTROL_TAGS = ["input", "select", "textarea"];

/**
 * Coleta os valores válidos (não vazios) das <option> de um <select>.
 */
function collectOptionValues(selectChildren) {
  const values = new Set();
  Children.forEach(selectChildren, (opt) => {
    if (isValidElement(opt) && opt.props.value !== "" && opt.props.value !== undefined) {
      values.add(String(opt.props.value));
    }
  });
  return values;
}

function getChildrenValue(children) {
  let value = "";

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      return;
    }

    // Para form controls, nunca recursamos nos filhos para extrair valor.
    if (typeof child.type === "string" && FORM_CONTROL_TAGS.includes(child.type)) {
      const controlled = child.props.value;

      if (controlled === undefined || controlled === null || controlled === "") {
        // sem valor controlado → campo vazio
        return;
      }

      if (child.type === "select") {
        // Para <select>, só considera preenchido se o valor controlado
        // realmente corresponde a uma das <option> não-vazias.
        const validOptions = collectOptionValues(child.props.children);
        if (validOptions.has(String(controlled))) {
          value = controlled;
        }
        // valor existe mas não bate com nenhuma opção → trata como vazio
        return;
      }

      // input / textarea: qualquer string não-vazia vale
      value = controlled;
      return;
    }

    if (child.props.value !== undefined) {
      value = child.props.value;
      return;
    }

    if (child.props.children) {
      const nestedValue = getChildrenValue(child.props.children);

      if (nestedValue !== "") {
        value = nestedValue;
      }
    }
  });

  return value;
}

/**
 * Extrai o atributo `name` do primeiro input/select/textarea aninhado nos filhos.
 * Usado pelo Field para identificar o campo sem precisar de prop explícita.
 */
function getChildFieldName(children) {
  let name = null;
  Children.forEach(children, (child) => {
    if (name || !isValidElement(child)) return;
    if (typeof child.type === "string" && FORM_CONTROL_TAGS.includes(child.type)) {
      name = child.props.name || null;
      return;
    }
    if (child.props?.children) {
      name = getChildFieldName(child.props.children);
    }
  });
  return name;
}

/**
 * Retorna apenas os dados do último check-in real (excluindo metadados e defaults).
 * Usado como snapshot para destacar campos pré-preenchidos em amarelo.
 */
function makePrefilledSnapshot(checkins, cadence) {
  const latestSameCadence = getLatestCompletedCheckin(checkins, cadence);
  const latestAny = getLatestCompletedCheckin(checkins);
  const latest = latestSameCadence || latestAny;
  if (!latest) return {};
  const { id, createdAt, updatedAt, checkin_date, status, aiContext, ai_context, photos, ...stableData } = latest;
  return stableData;
}

/** Context que fornece `isStale(fieldName)` ao Field automaticamente. */
const FormStaleContext = createContext(null);

const WEEK_DAYS = [
  { id: "monday",    short: "SEG", label: "Segunda" },
  { id: "tuesday",   short: "TER", label: "Terca"   },
  { id: "wednesday", short: "QUA", label: "Quarta"  },
  { id: "thursday",  short: "QUI", label: "Quinta"  },
  { id: "friday",    short: "SEX", label: "Sexta"   },
  { id: "saturday",  short: "SAB", label: "Sabado"  },
  { id: "sunday",    short: "DOM", label: "Domingo" },
];

function DayPicker({ value = "", onChange, stale = false }) {
  const selected = (value || "").split(",").filter(Boolean);

  function toggle(dayId) {
    const next = selected.includes(dayId)
      ? selected.filter((d) => d !== dayId)
      : [...selected, dayId].sort(
          (a, b) =>
            WEEK_DAYS.findIndex((d) => d.id === a) -
            WEEK_DAYS.findIndex((d) => d.id === b)
        );
    onChange(next.join(","));
  }

  const wrapperClass = `checkin-day-picker${stale ? " is-stale" : selected.length > 0 ? " is-filled" : ""}`;

  return (
    <div className={wrapperClass}>
      {WEEK_DAYS.map((day) => (
        <button
          key={day.id}
          type="button"
          title={day.label}
          className={`checkin-day-picker__btn${selected.includes(day.id) ? " is-active" : ""}`}
          onClick={() => toggle(day.id)}
        >
          {day.short}
        </button>
      ))}
    </div>
  );
}

function Field({ label, required = false, hint, children, className = "", invalid = false, stale: staleProp }) {
  const ctx = useContext(FormStaleContext);
  const fieldValue = getChildrenValue(children);
  const isFilled = Array.isArray(fieldValue)
    ? fieldValue.length > 0
    : String(fieldValue ?? "").trim().length > 0;

  // Detecta automaticamente o nome do campo pelo filho; ou usa prop explícita para campos sem name (DayPicker)
  const fieldName = staleProp === undefined ? getChildFieldName(children) : null;
  const isStale = staleProp !== undefined
    ? staleProp
    : (ctx && fieldName ? ctx.isStale(fieldName) : false);

  const stateClass = isFilled ? (isStale ? "is-stale" : "is-filled") : "";

  return (
    <label className={`checkin-field ${className} ${stateClass} ${invalid ? "is-invalid" : ""}`.trim()}>
      <span className="checkin-field__label">
        {label}
        {required ? <strong>Obrigatorio</strong> : <em>Opcional</em>}
      </span>
      <span className="checkin-field__control">
        {children}
        {isFilled ? <span className="checkin-field__check" aria-hidden="true">{"✓"}</span> : null}
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Section({ eyebrow, title, description, children }) {
  return (
    <div className="checkin-section glass-panel">
      <div className="checkin-section__header">
        <small>{eyebrow}</small>
        <strong>{title}</strong>
        {description ? <em>{description}</em> : null}
      </div>
      <div className="checkin-section__body">{children}</div>
    </div>
  );
}

function formatValue(value, suffix = "") {
  return value ? `${value}${suffix}` : "--";
}

function formatCompactDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function formatDateKey(dateKey) {
  return parseDateKey(dateKey).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getCheckinDateKey(checkin) {
  return (checkin?.createdAt || checkin?.date || "").slice(0, 10);
}

function getLatestCompletedCheckin(checkins, cadence) {
  return [...(Array.isArray(checkins) ? checkins : [])]
    .filter((item) => item.status !== "missed" && (!cadence || item.cadence === cadence))
    .sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0))[0];
}

function makePrefilledCheckinForm(checkins, cadence) {
  const latestSameCadence = getLatestCompletedCheckin(checkins, cadence);
  const latestAny = getLatestCompletedCheckin(checkins);
  const latest = latestSameCadence || latestAny;

  if (!latest) {
    return {
      ...defaultCheckinForm,
      cadence,
    };
  }

  const { id, createdAt, updatedAt, checkin_date, status, aiContext, ai_context, photos, ...stableData } = latest;

  return {
    ...defaultCheckinForm,
    ...stableData,
    cadence,
    photos: [],
  };
}

function addDaysToDateKey(dateKey, days) {
  const date = parseDateKey(dateKey);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

function hasValue(value) {
  return String(value ?? "").trim().length > 0;
}

function countCompletedFields(data, fields) {
  return fields.filter((field) => hasValue(data[field])).length;
}

function getRequiredFields(cadence) {
  return requiredCheckinFieldsByCadence[cadence] || requiredCheckinFieldsByCadence.weekly;
}

function clampPercent(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value)));
}

function buildSyncStatus({ successMessage, skippedMessage, localFallback, remote }) {
  if (remote?.error) {
    const normalized = String(remote.error.message || "").toLowerCase();

    if (
      normalized.includes("auth") ||
      normalized.includes("token") ||
      normalized.includes("jwt") ||
      normalized.includes("session")
    ) {
      return `${localFallback} Entre novamente para sincronizar.`;
    }

    if (
      normalized.includes("fetch") ||
      normalized.includes("network") ||
      normalized.includes("timeout") ||
      normalized.includes("failed")
    ) {
      return `${localFallback} Verifique a conexao e tente sincronizar novamente em alguns instantes.`;
    }

    return `${localFallback} Tente sincronizar novamente daqui a pouco.`;
  }

  if (remote?.skipped) {
    return skippedMessage;
  }

  return successMessage;
}

function parseStoredArray(key) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getWeekWindow(dateKey) {
  const selected = parseDateKey(dateKey);
  const day = selected.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(selected);
  start.setDate(selected.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function isWithinRange(value, start, end) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= start && date <= end;
}

function getWeeklyOperationalSummary(dateKey, formData) {
  const { start, end } = getWeekWindow(dateKey);
  const plannedWorkouts = Number(formData.weeklyTrainingDays || 0);
  const sessions = loadWorkoutSessionHistory().filter((session) =>
    isWithinRange(session.createdAt || session.startedAt, start, end)
  );
  const workoutAdherence = plannedWorkouts
    ? clampPercent((sessions.length / plannedWorkouts) * 100)
    : 0;

  const diet = loadDietProtocol();
  const activeMeals = (diet.meals || []).filter((meal) => meal.enabled).length;
  const mealCompletions = parseStoredArray("shapeCertoDietMealCompletions").filter((entry) =>
    isWithinRange(entry.createdAt || entry.date, start, end)
  );
  const plannedMeals = activeMeals ? activeMeals * 7 : 0;
  const dietAdherence = plannedMeals
    ? clampPercent((mealCompletions.length / plannedMeals) * 100)
    : 0;

  return {
    weekLabel: `${start.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} a ${end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}`,
    plannedWorkouts,
    completedWorkouts: sessions.length,
    workoutAdherence,
    activeMeals,
    plannedMeals,
    completedMeals: mealCompletions.length,
    dietAdherence,
    dietTrackingReady: mealCompletions.length > 0,
  };
}

function getMonthlyOperationalSummary(dateKey, formData, checkins) {
  const selected = parseDateKey(dateKey);
  const start = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0, 23, 59, 59, 999);
  const sessions = loadWorkoutSessionHistory().filter((session) =>
    isWithinRange(session.createdAt || session.startedAt, start, end)
  );
  const plannedWorkouts = Number(formData.weeklyTrainingDays || 0) * 4;
  const workoutAdherence = plannedWorkouts
    ? clampPercent((sessions.length / plannedWorkouts) * 100)
    : 0;
  const monthCheckins = (Array.isArray(checkins) ? checkins : []).filter((item) =>
    isWithinRange(item.createdAt, start, end)
  );

  const diet = loadDietProtocol();
  const activeMeals = (diet.meals || []).filter((meal) => meal.enabled).length;
  const mealCompletions = parseStoredArray("shapeCertoDietMealCompletions").filter((entry) =>
    isWithinRange(entry.createdAt || entry.date, start, end)
  );
  const plannedMeals = activeMeals ? activeMeals * end.getDate() : 0;
  const dietAdherence = plannedMeals
    ? clampPercent((mealCompletions.length / plannedMeals) * 100)
    : 0;

  return {
    monthLabel: selected.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    plannedWorkouts,
    completedWorkouts: sessions.length,
    workoutAdherence,
    registeredCheckins: monthCheckins.length,
    completedCheckins: monthCheckins.filter((item) => item.status !== "missed").length,
    plannedMeals,
    completedMeals: mealCompletions.length,
    dietAdherence,
    dietTrackingReady: mealCompletions.length > 0,
  };
}

function getCalendarDays(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function syncSavedCheckin(localCheckins, localCheckin, remoteCheckin) {
  if (!remoteCheckin) {
    return localCheckins;
  }

  const synced = [
    remoteCheckin,
    ...localCheckins.filter((item) => item.id !== localCheckin.id),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return persistCheckins(synced);
}

function StickmanPose({ pose, title }) {
  const isBack = pose === "back" || pose === "double-back";
  const isSide = pose === "side";
  const isDouble = pose === "double-front" || pose === "double-back";

  /* Subtle fills override the CSS fill:none for closed shapes only */
  const fillHead = { fill: "rgba(220, 75, 55, 0.15)" };
  const fillBody = { fill: "rgba(220, 75, 55, 0.09)" };

  const base = {
    className: "photo-pose-card__stickman",
    role: "img",
    "aria-label": `Pose ${title}`,
  };

  /* ── Side profile ─────────────────────────────────────────────── */
  if (isSide) {
    return (
      <svg {...base} viewBox="0 0 56 112">
        {/* Head */}
        <circle cx="28" cy="8" r="7" strokeWidth="1.8" style={fillHead} />
        {/* Neck */}
        <line x1="28" y1="15" x2="28" y2="21" strokeWidth="4" />
        {/* Torso */}
        <path d="M19,22 Q15,39 17,58 L38,58 Q40,38 36,22 Z" strokeWidth="1.6" style={fillBody} />
        {/* Front upper arm */}
        <line x1="19" y1="26" x2="11" y2="46" strokeWidth="6" />
        {/* Front forearm */}
        <line x1="11" y1="46" x2="13" y2="63" strokeWidth="4.5" />
        {/* Rear upper arm — faded for depth */}
        <line x1="34" y1="26" x2="40" y2="43" strokeWidth="5.5" strokeOpacity="0.35" />
        {/* Rear forearm — faded */}
        <line x1="40" y1="43" x2="38" y2="58" strokeWidth="4" strokeOpacity="0.35" />
        {/* Front thigh */}
        <line x1="22" y1="58" x2="20" y2="82" strokeWidth="8.5" />
        {/* Front calf */}
        <line x1="20" y1="82" x2="20" y2="104" strokeWidth="6.5" />
        {/* Rear thigh — faded */}
        <line x1="32" y1="58" x2="34" y2="79" strokeWidth="7.5" strokeOpacity="0.28" />
        {/* Rear calf — faded */}
        <line x1="34" y1="79" x2="34" y2="100" strokeWidth="5.5" strokeOpacity="0.28" />
      </svg>
    );
  }

  /* ── Double biceps (front or back) ───────────────────────────── */
  if (isDouble) {
    return (
      <svg {...base} viewBox="0 0 82 112">
        {/* Head */}
        <circle cx="41" cy="8" r="7" strokeWidth="1.8" style={fillHead} />
        {/* Neck */}
        <line x1="41" y1="15" x2="41" y2="21" strokeWidth="4" />
        {/* Torso */}
        <path d="M28,22 Q24,39 26,58 L56,58 Q58,38 54,22 Z" strokeWidth="1.6" style={fillBody} />
        {/* Spine detail for back pose */}
        {isBack && (
          <line x1="41" y1="24" x2="41" y2="57" strokeWidth="1.2" strokeOpacity="0.40" />
        )}
        {/* Left upper arm: shoulder → elbow (angled up-out) */}
        <line x1="28" y1="26" x2="11" y2="41" strokeWidth="6.5" />
        {/* Left forearm: elbow → fist (flexed upward) */}
        <line x1="11" y1="41" x2="17" y2="26" strokeWidth="5" />
        {/* Right upper arm */}
        <line x1="54" y1="26" x2="71" y2="41" strokeWidth="6.5" />
        {/* Right forearm */}
        <line x1="71" y1="41" x2="65" y2="26" strokeWidth="5" />
        {/* Left thigh */}
        <line x1="32" y1="58" x2="30" y2="82" strokeWidth="8.5" />
        {/* Left calf */}
        <line x1="30" y1="82" x2="30" y2="104" strokeWidth="6.5" />
        {/* Right thigh */}
        <line x1="50" y1="58" x2="52" y2="82" strokeWidth="8.5" />
        {/* Right calf */}
        <line x1="52" y1="82" x2="52" y2="104" strokeWidth="6.5" />
      </svg>
    );
  }

  /* ── Front / Back relaxed ────────────────────────────────────── */
  return (
    <svg {...base} viewBox="0 0 60 112">
      {/* Head */}
      <circle cx="30" cy="8" r="7" strokeWidth="1.8" style={fillHead} />
      {/* Neck */}
      <line x1="30" y1="15" x2="30" y2="21" strokeWidth="4" />
      {/* Torso */}
      <path d="M18,22 Q14,39 16,58 L44,58 Q46,38 42,22 Z" strokeWidth="1.6" style={fillBody} />
      {/* Spine detail for back pose */}
      {isBack && (
        <line x1="30" y1="24" x2="30" y2="57" strokeWidth="1.2" strokeOpacity="0.40" />
      )}
      {/* Left upper arm */}
      <line x1="18" y1="26" x2="9" y2="46" strokeWidth="6" />
      {/* Left forearm */}
      <line x1="9" y1="46" x2="10" y2="63" strokeWidth="4.5" />
      {/* Right upper arm */}
      <line x1="42" y1="26" x2="51" y2="46" strokeWidth="6" />
      {/* Right forearm */}
      <line x1="51" y1="46" x2="50" y2="63" strokeWidth="4.5" />
      {/* Left thigh */}
      <line x1="22" y1="58" x2="20" y2="82" strokeWidth="8.5" />
      {/* Left calf */}
      <line x1="20" y1="82" x2="20" y2="104" strokeWidth="6.5" />
      {/* Right thigh */}
      <line x1="38" y1="58" x2="40" y2="82" strokeWidth="8.5" />
      {/* Right calf */}
      <line x1="40" y1="82" x2="40" y2="104" strokeWidth="6.5" />
    </svg>
  );
}

function CheckinCalendar({
  checkins,
  selectedDateKey,
  calendarMonth,
  onSelectDate,
  onChangeMonth,
  onToday,
}) {
  const entriesByDate = useMemo(() => {
    return checkins.reduce((acc, item) => {
      const key = toDateKey(new Date(item.createdAt));
      acc[key] = [...(acc[key] || []), item];
      return acc;
    }, {});
  }, [checkins]);
  const selectedEntries = entriesByDate[selectedDateKey] || [];
  const days = getCalendarDays(calendarMonth);
  const monthLabel = calendarMonth.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

  return (
    <div className="checkins-calendar glass-panel">
      <div className="checkins-calendar__header">
        <div>
          <small>Calendario</small>
          <strong>Consultar ou lancar data retroativa</strong>
          <em>Selecione um dia para ver registros anteriores ou salvar o proximo check-in nessa data.</em>
        </div>
        <mark>{formatDateKey(selectedDateKey)}</mark>
      </div>

      <div className="checkins-calendar__controls">
        <button type="button" onClick={() => onChangeMonth(-1)}>
          Anterior
        </button>
        <strong>{monthLabel}</strong>
        <button type="button" onClick={() => onChangeMonth(1)}>
          Proximo
        </button>
        <button type="button" onClick={onToday}>
          Hoje
        </button>
      </div>

      <div className="checkins-calendar__body">
        <div className="checkins-calendar__grid">
          {weekDays.map((day) => (
            <span key={day} className="checkins-calendar__weekday">
              {day}
            </span>
          ))}

          {days.map((date) => {
            const dateKey = toDateKey(date);
            const entries = entriesByDate[dateKey] || [];
            const completed = entries.some((item) => item.status !== "missed");
            const missed = entries.some((item) => item.status === "missed");
            const isSelected = dateKey === selectedDateKey;
            const isCurrentMonth = date.getMonth() === calendarMonth.getMonth();
            const isToday = dateKey === toDateKey(new Date());

            return (
              <button
                key={dateKey}
                type="button"
                className={`checkins-calendar__day ${isSelected ? "is-selected" : ""} ${
                  isCurrentMonth ? "" : "is-outside"
                } ${completed ? "has-completed" : ""} ${missed ? "has-missed" : ""} ${
                  isToday ? "is-today" : ""
                }`}
                onClick={() => onSelectDate(dateKey)}
              >
                <span>{date.getDate()}</span>
                {entries.length ? <small>{entries.length}</small> : null}
              </button>
            );
          })}
        </div>

        <aside className="checkins-calendar__details">
          <span>Data selecionada</span>
          <h3>{formatDateKey(selectedDateKey)}</h3>
          {selectedEntries.length ? (
            <div className="checkins-calendar__entries">
              {selectedEntries.map((item) => (
                <article key={item.id}>
                  <strong>{checkinCadences[item.cadence || "monthly"].label}</strong>
                  <small>
                    {item.status === "missed" ? "Nao realizado" : `${item.completeness ?? "--"}% completo`}
                  </small>
                </article>
              ))}
            </div>
          ) : (
            <p>Nenhum check-in nessa data. Voce pode salvar o formulario atual para esse dia.</p>
          )}
        </aside>
      </div>
    </div>
  );
}

function PhotoPoseCard({ slot, fileName, onChange }) {
  return (
    <article className={`photo-pose-card ${fileName ? "is-uploaded" : ""}`}>
      <div className={`photo-pose-card__silhouette photo-pose-card__silhouette--${slot.pose}`}>
        <StickmanPose pose={slot.pose} title={slot.title} />
        {fileName ? <span className="photo-pose-card__check" aria-hidden="true">✓</span> : null}
      </div>

      <div className="photo-pose-card__content">
        <h3>{slot.title}</h3>
        <p>{slot.instruction}</p>
        <label className="photo-pose-card__button">
          {fileName ? "Trocar foto" : "Enviar foto"}
          <input
            type="file"
            accept="image/*"
            onChange={(event) => onChange(slot, event.target.files?.[0])}
          />
        </label>
        <small>{fileName || "Nenhuma foto selecionada"}</small>
      </div>
    </article>
  );
}

function CheckinsLoadingSkeleton() {
  return (
    <section className="checkins-loading-shell glass-panel" aria-label="Carregando check-ins">
      <div className="checkins-loading-grid">
        <Skeleton className="checkins-loading-skeleton checkins-loading-skeleton--hero" />
        <Skeleton className="checkins-loading-skeleton checkins-loading-skeleton--hero" />
        <Skeleton className="checkins-loading-skeleton checkins-loading-skeleton--stat" />
        <Skeleton className="checkins-loading-skeleton checkins-loading-skeleton--stat" />
        <Skeleton className="checkins-loading-skeleton checkins-loading-skeleton--table" />
      </div>
    </section>
  );
}

function getCadenceIntro(cadence) {
  if (cadence === "daily") {
    return {
      title: "Check-in diario",
      description:
        "Registre sinais rapidos. Se faltar um dia, marque como nao realizado; a IA ignora o gap nas medias.",
    };
  }

  if (cadence === "weekly") {
    return {
      title: "Check-in semanal",
      description:
        "Feche a semana com peso, sinais medios e necessidade de ajuste. Isso nao regenera dieta ou treino sozinho.",
    };
  }

  return {
    title: "Check-in mensal",
    description:
      "Reavaliacao completa com objetivo, medidas, bioimpedancia e contexto para um novo ciclo.",
  };
}

export default function CheckinsPage() {
  const { canAccess, getLimit } = usePlan();
  const canDoPhotos = canAccess("photo_upload");
  const maxPhotos = getLimit("photo_limit");
  const canDoMonthly = canAccess("checkin_monthly");
  const canDoDaily   = canAccess("checkin_daily");
  const canDoBodyMeasurements = canAccess("body_measurements");
  const canDoBioimpedance     = canAccess("bioimpedance");

  const todayKey = toDateKey(new Date());
  const [activeTab, setActiveTab] = useState("formulario");
  const [activeCadence, setActiveCadence] = useState("weekly");
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateKey(todayKey));
  const [formData, setFormData] = useState(() => makePrefilledCheckinForm(loadCheckins(), "weekly"));
  const [prefilledSnapshot, setPrefilledSnapshot] = useState(() => makePrefilledSnapshot(loadCheckins(), "weekly"));
  const [photoUploads, setPhotoUploads] = useState({});
  const [checkins, setCheckins] = useState(() => loadCheckins());
  const [feedback, setFeedback] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);
  const confirmButtonRef = useRef(null);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [validationErrorPopup, setValidationErrorPopup] = useState(null);
  const [updateWorkoutWithAi, setUpdateWorkoutWithAi] = useState(true);
  const [updateDietWithAi, setUpdateDietWithAi] = useState(true);
  const [isGeneratingProtocols, setIsGeneratingProtocols] = useState(false);
  const [protocolUpdateResult, setProtocolUpdateResult] = useState(null);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiGoal, setAiGoal] = useState("");
  const [aiTrainingDays, setAiTrainingDays] = useState("");
  const cancelButtonRef = useRef(null);
  const [isHydratingCheckins, setIsHydratingCheckins] = useState(true);

  const checkinSchedule = useMemo(() => {
    const latestAny = getLatestCompletedCheckin(checkins);
    const latestWeekly = getLatestCompletedCheckin(checkins, "weekly");
    const latestMonthly = getLatestCompletedCheckin(checkins, "monthly");
    const weeklyBase = getCheckinDateKey(latestWeekly) || selectedDateKey || todayKey;
    const monthlyBase = getCheckinDateKey(latestMonthly) || selectedDateKey || todayKey;

    return {
      latestLabel: latestAny ? formatDateKey(getCheckinDateKey(latestAny)) : "Sem registro",
      latestDetail: latestAny
        ? checkinCadences[latestAny.cadence || "weekly"]?.label || "Check-in"
        : "Primeiro registro pendente",
      weeklyDateKey: addDaysToDateKey(weeklyBase, 7),
      monthlyDateKey: addDaysToDateKey(monthlyBase, 30),
    };
  }, [checkins, selectedDateKey, todayKey]);
  /** Retorna true se o campo tem valor do último check-in sem ter sido alterado. */
  function isStaleField(name) {
    const snap = prefilledSnapshot[name];
    if (snap === undefined || snap === null) return false;
    if (Array.isArray(snap)) {
      if (snap.length === 0) return false;
      return JSON.stringify(formData[name] ?? []) === JSON.stringify(snap);
    }
    if (String(snap).trim() === "") return false;
    return String(formData[name] ?? "") === String(snap);
  }

  const requiredFields = getRequiredFields(activeCadence);
  const selectedPhotoCount = Object.keys(photoUploads).length;
  const progressFormData = {
    ...formData,
    photos: selectedPhotoCount ? Array.from({ length: selectedPhotoCount }, (_, index) => index) : [],
  };
  const requiredCompleted = countCompletedFields(progressFormData, requiredFields);
  const optionalBioCompleted = countCompletedFields(formData, optionalBioimpedanceFields);
  const requiredPercent = clampPercent((requiredCompleted / requiredFields.length) * 100);
  const optionalBioPercent = clampPercent(
    (optionalBioCompleted / optionalBioimpedanceFields.length) * 100
  );
  const weeklyOperationalSummary = useMemo(
    () => getWeeklyOperationalSummary(selectedDateKey, formData),
    [selectedDateKey, formData.weeklyTrainingDays]
  );

  function showToast(message, type = "success") {
    setToast({ message, type, id: Date.now() });
  }

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    let ignore = false;

    async function hydrateCheckins() {
      const result = await loadRemoteCheckins();

      if (ignore || result.skipped) {
        if (!ignore) {
          setIsHydratingCheckins(false);
        }
        return;
      }

      if (result.error) {
        setSyncStatus(
          buildSyncStatus({
            localFallback: "Nao foi possivel sincronizar o historico agora.",
            skippedMessage: "",
            successMessage: "",
            remote: { error: result.error },
          })
        );
        setIsHydratingCheckins(false);
        return;
      }

      setCheckins(result.checkins);
      setFormData((current) => {
        const cadenceToUse = current.cadence || activeCadence;
        setPrefilledSnapshot(makePrefilledSnapshot(result.checkins, cadenceToUse));
        return {
          ...makePrefilledCheckinForm(result.checkins, cadenceToUse),
          cadence: cadenceToUse,
        };
      });
      setSyncStatus("Historico sincronizado com o servidor. Pode seguir preenchendo normalmente.");
      setIsHydratingCheckins(false);
    }

    hydrateCheckins();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!saveConfirmOpen) {
      return undefined;
    }

    const previousActive = document.activeElement;
    confirmButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSaveConfirmOpen(false);
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusables = [cancelButtonRef.current, confirmButtonRef.current].filter(Boolean);

      if (!focusables.length) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousActive?.focus?.();
    };
  }, [saveConfirmOpen]);

  function handleCadenceChange(cadence) {
    setActiveCadence(cadence);
    setFormData(makePrefilledCheckinForm(checkins, cadence));
    setPrefilledSnapshot(makePrefilledSnapshot(checkins, cadence));
    setPhotoUploads({});
    setFeedback("");
    setSubmitAttempted(false);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function buildCheckinPayload() {
    const selectedPhotos = photoPoseSlots
      .map((slot) => ({
        id: slot.id,
        title: slot.title,
        fileName: photoUploads[slot.id]?.fileName || "",
        pose: slot.pose,
        selected: Boolean(photoUploads[slot.id]?.fileName),
      }))
      .filter((photo) => photo.selected);

    const formDataForValidation = {
      ...formData,
      photos: selectedPhotos,
    };
    const payload = {
      ...formDataForValidation,
      cadence: activeCadence,
      weeklyWorkoutsPlanned: String(weeklyOperationalSummary.plannedWorkouts || ""),
      weeklyWorkoutsCompleted: String(weeklyOperationalSummary.completedWorkouts || ""),
      workoutAdherence: weeklyOperationalSummary.plannedWorkouts
        ? String(weeklyOperationalSummary.workoutAdherence)
        : "",
      dietMealsPlanned: String(weeklyOperationalSummary.plannedMeals || ""),
      dietMealsCompleted: String(weeklyOperationalSummary.completedMeals || ""),
      dietAdherence: weeklyOperationalSummary.dietTrackingReady
        ? String(weeklyOperationalSummary.dietAdherence)
        : "",
    };

    return payload;
  }

  async function savePreparedCheckin(payload) {
    const validation = validateCheckinForm(payload);

    if (!validation.isValid) {
      setFeedback(validation.message);
      return;
    }

    const updated = saveCheckin(payload, { createdAt: `${selectedDateKey}T12:00:00` });
    setCheckins(updated);
    const localCheckin = updated[0];
    const remote = await saveRemoteCheckin(localCheckin, photoUploads);

    if (remote.data) {
      setCheckins(syncSavedCheckin(updated, localCheckin, remote.data));
    }

    // Captura objetivo e dias disponíveis ANTES de resetar o formulário
    setAiGoal(payload.goal || "");
    setAiTrainingDays(payload.trainingAvailableDays || "");

    setFormData(makePrefilledCheckinForm(updated, activeCadence));
    setPrefilledSnapshot(makePrefilledSnapshot(updated, activeCadence));
    setPhotoUploads({});
    setSubmitAttempted(false);
    setFeedback(
      `${checkinCadences[activeCadence].label} salvo em ${formatDateKey(selectedDateKey)}. O historico foi atualizado.`
    );
    showToast(`${checkinCadences[activeCadence].label} salvo com sucesso.`);
    setSyncStatus(
      buildSyncStatus({
        successMessage: "Check-in salvo no servidor.",
        skippedMessage: "Check-in salvo localmente.",
        localFallback: "Check-in salvo nesta maquina.",
        remote,
      })
    );

    // Abrir popup para perguntar se deseja atualizar protocolos com IA
    setProtocolUpdateResult(null);
    setShowAiModal(true);
  }

  async function handleAiUpdate() {
    if (!updateWorkoutWithAi && !updateDietWithAi) {
      setShowAiModal(false);
      return;
    }
    setIsGeneratingProtocols(true);
    setProtocolUpdateResult(null);
    const results = { workout: null, diet: null, errors: [] };

    // Timeout de 90 segundos por chamada
    function withTimeout(promise, ms = 90_000) {
      return Promise.race([
        promise,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Tempo limite excedido (90s). Tente novamente.")), ms)
        ),
      ]);
    }

    try {
      if (updateWorkoutWithAi) {
        try {
          const res = await withTimeout(generateWorkoutWithAi({ persist: true, goal: aiGoal, trainingAvailableDays: aiTrainingDays }));
          if (res?.protocol) {
            await hydrateWorkoutExecutionFromApi();
            results.workout = res.protocol?.title || "Protocolo de treino atualizado";
          }
        } catch (err) {
          results.errors.push("Treino: " + (err.message || "erro desconhecido"));
        }
      }

      if (updateDietWithAi) {
        try {
          const res = await withTimeout(generateDietWithAi({ persist: true, goal: aiGoal }));
          if (res?.protocol) {
            await hydrateDietProtocolFromApi();
            results.diet = res.protocol?.title || "Protocolo de dieta atualizado";
          }
        } catch (err) {
          results.errors.push("Dieta: " + (err.message || "erro desconhecido"));
        }
      }
    } finally {
      setIsGeneratingProtocols(false);
      setProtocolUpdateResult(results);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = buildCheckinPayload();
    const validation = validateCheckinForm(payload);

    if (!validation.isValid) {
      setSubmitAttempted(true);
      setValidationErrorPopup(
        validation.missingFields.map((f) => checkinFieldLabels[f] || f)
      );
      requestAnimationFrame(() => {
        document.querySelector(".checkin-field.is-invalid")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
      return;
    }

    setSubmitAttempted(false);
    setPendingPayload(payload);
    setSaveConfirmOpen(true);
  }

  async function handleConfirmSave() {
    if (!pendingPayload) {
      return;
    }

    setSaveConfirmOpen(false);
    await savePreparedCheckin(pendingPayload);
    setPendingPayload(null);
  }

  async function handleMissedCheckin() {
    const updated = saveMissedCheckin(activeCadence, "", {
      createdAt: `${selectedDateKey}T12:00:00`,
    });
    setCheckins(updated);
    const localCheckin = updated[0];
    const remote = await saveRemoteCheckin(localCheckin);

    if (remote.data) {
      setCheckins(syncSavedCheckin(updated, localCheckin, remote.data));
    }

    setFeedback(
      `${checkinCadences[activeCadence].label} marcado como nao realizado em ${formatDateKey(selectedDateKey)}. A IA vai considerar apenas os check-ins preenchidos.`
    );
    showToast("Ausencia registrada no historico.", "warning");
    setSyncStatus(
      buildSyncStatus({
        successMessage: "Ausencia salva no servidor.",
        skippedMessage: "Ausencia salva localmente.",
        localFallback: "Ausencia salva nesta maquina.",
        remote,
      })
    );
  }

  async function handleReset() {
    const resetData = resetCheckins();
    setCheckins(resetData);
    setFeedback("Historico de check-ins resetado.");
    showToast("Historico de check-ins resetado.", "warning");
    const remote = await deleteRemoteCheckins();
    setSyncStatus(
      buildSyncStatus({
        successMessage: "Historico resetado.",
        skippedMessage: "Historico local resetado.",
        localFallback: "Historico local resetado.",
        remote,
      })
    );
  }

  function handlePhotoChange(slot, file) {
    if (!file) {
      return;
    }

    setPhotoUploads((current) => ({
      ...current,
      [slot.id]: {
        title: slot.title,
        fileName: file.name,
        file,
        type: file.type,
      },
    }));
  }

  function handleCalendarMonthChange(direction) {
    setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  function handleCalendarToday() {
    const nextTodayKey = toDateKey(new Date());
    setSelectedDateKey(nextTodayKey);
    setCalendarMonth(parseDateKey(nextTodayKey));
  }

  const showDaily = activeCadence === "daily";
  const showWeekly = activeCadence === "weekly";
  const showMonthly = activeCadence === "monthly";
  const showProtocolBase = showMonthly;
  const showBodyComposition = showMonthly;
  const metrics = useMemo(() => getCheckinMetrics(checkins), [checkins]);
  const cadenceSummary = useMemo(() => getCheckinCadenceSummary(checkins), [checkins]);
  const weeklyAiDataset = useMemo(() => getWeeklyAiDataset(checkins), [checkins]);
  const monthlyReevaluation = useMemo(() => getMonthlyReevaluation(), []);

  return (
    <section className="checkins-page">
      {toast ? (
        <div className={`checkins-toast checkins-toast--${toast.type}`} role="status">
          <span>{toast.message}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso">
            x
          </button>
        </div>
      ) : null}

      {saveConfirmOpen ? (
        <div
          className="checkins-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkin-save-title"
          aria-describedby="checkin-save-description"
        >
          <div className="checkins-modal__panel glass-panel">
            <div className="checkins-modal__header">
              <div>
                <span>Confirmar data</span>
                <h2 id="checkin-save-title">Salvar {checkinCadences[activeCadence].label.toLowerCase()}</h2>
                <p id="checkin-save-description">
                  Escolha se este check-in entra em hoje ou em uma data retroativa.
                  Data selecionada: <strong>{formatDateKey(selectedDateKey)}</strong>.
                </p>
              </div>
              <button
                type="button"
                className="checkins-modal__close"
                onClick={() => setSaveConfirmOpen(false)}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            <CheckinCalendar
              checkins={checkins}
              selectedDateKey={selectedDateKey}
              calendarMonth={calendarMonth}
              onSelectDate={setSelectedDateKey}
              onChangeMonth={handleCalendarMonthChange}
              onToday={handleCalendarToday}
            />

            <div className="checkins-modal__actions">
              <button
                ref={cancelButtonRef}
                type="button"
                className="ghost-button"
                onClick={() => setSaveConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button ref={confirmButtonRef} type="button" className="primary-button" onClick={handleConfirmSave}>
                Confirmar e salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {validationErrorPopup ? (
        <div
          className="checkins-modal"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="checkin-validation-title"
          onClick={(e) => { if (e.target === e.currentTarget) setValidationErrorPopup(null); }}
        >
          <div className="checkins-modal__panel checkins-modal__panel--error glass-panel">
            <div className="checkins-modal__header">
              <div>
                <span>Campos obrigatorios</span>
                <h2 id="checkin-validation-title">Check-in incompleto</h2>
              </div>
              <button
                type="button"
                className="checkins-modal__close"
                onClick={() => setValidationErrorPopup(null)}
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>

            <p className="checkins-modal__validation-desc">
              Preencha os campos abaixo antes de salvar o check-in:
            </p>

            <ul className="checkins-modal__validation-list">
              {validationErrorPopup.map((label) => (
                <li key={label}>
                  <span className="checkins-modal__validation-bullet" aria-hidden="true">!</span>
                  {label}
                </li>
              ))}
            </ul>

            <div className="checkins-modal__actions">
              <button
                type="button"
                className="primary-button"
                onClick={() => setValidationErrorPopup(null)}
              >
                Entendi, vou preencher
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAiModal && (
        <div className="checkins-modal" role="dialog" aria-modal="true" aria-labelledby="ai-modal-title">
          <div className="checkins-modal__panel glass-panel">
            <div className="checkins-modal__header">
              <div>
                <span>Check-in salvo com sucesso!</span>
                <h2 id="ai-modal-title">Atualizar protocolos com IA?</h2>
                <p>
                  A IA vai analisar todos os dados deste check-in e gerar novos protocolos.
                </p>
              </div>
              <button
                type="button"
                className="checkins-modal__close"
                onClick={() => { setShowAiModal(false); setProtocolUpdateResult(null); setIsGeneratingProtocols(false); }}
                aria-label="Fechar"
              >
                x
              </button>
            </div>

            {!protocolUpdateResult && (
              <div className="checkins-ai-update-panel__checks" style={{ padding: "0 0 16px" }}>
                <label className="checkins-ai-checkbox">
                  <input
                    type="checkbox"
                    checked={updateWorkoutWithAi}
                    onChange={(e) => setUpdateWorkoutWithAi(e.target.checked)}
                    disabled={isGeneratingProtocols}
                  />
                  <span>Atualizar protocolo de treino</span>
                </label>
                <label className="checkins-ai-checkbox">
                  <input
                    type="checkbox"
                    checked={updateDietWithAi}
                    onChange={(e) => setUpdateDietWithAi(e.target.checked)}
                    disabled={isGeneratingProtocols}
                  />
                  <span>Atualizar protocolo de dieta</span>
                </label>
              </div>
            )}

            {isGeneratingProtocols && (
              <p className="checkins-ai-update-panel__status">
                ⏳ Gerando protocolos com IA... isso pode levar alguns segundos.
              </p>
            )}

            {protocolUpdateResult && (
              <div className="checkins-ai-update-panel__result">
                {protocolUpdateResult.workout && (
                  <p className="checkins-ai-update-panel__ok">{"✓"} Treino: {protocolUpdateResult.workout}</p>
                )}
                {protocolUpdateResult.diet && (
                  <p className="checkins-ai-update-panel__ok">{"✓"} Dieta: {protocolUpdateResult.diet}</p>
                )}
                {protocolUpdateResult.errors?.map((err) => (
                  <p key={err} className="checkins-ai-update-panel__err">{"✗"} {err}</p>
                ))}
              </div>
            )}

            <div className="checkins-modal__actions">
              {!protocolUpdateResult ? (
                <>
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => { setShowAiModal(false); }}
                    disabled={isGeneratingProtocols}
                  >
                    Agora não
                  </button>
                  <button
                    type="button"
                    className="primary-button"
                    onClick={handleAiUpdate}
                    disabled={isGeneratingProtocols || (!updateWorkoutWithAi && !updateDietWithAi)}
                  >
                    {isGeneratingProtocols ? "Gerando..." : "Atualizar"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => { setShowAiModal(false); setProtocolUpdateResult(null); }}
                >
                  Fechar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className="checkins-hero glass-panel">
        <div>
          <span className="checkins-hero__eyebrow">Check-in inteligente</span>
          <h1>Check-in semanal com sessoes de treino no dia a dia.</h1>
          <p>
            Use o fechamento semanal para revisar o ciclo. A presenca diaria,
            cargas e series passam a vir da sessao iniciada na tela de treinos.
          </p>
        </div>

        <aside className="checkins-readiness">
          <span>Obrigatorios preenchidos</span>
          <strong>{requiredPercent}%</strong>
          <div className="checkins-progress">
            <span style={{ width: `${requiredPercent}%` }} />
          </div>
          <small>
            {requiredCompleted}/{requiredFields.length} campos obrigatorios.
            {showMonthly
              ? "Antropometria e bioimpedancia ficam editaveis e opcionais."
              : "Semanal foca em aderencia, fotos e decisao sobre o protocolo."}
          </small>
        </aside>
      </header>

      <section className="checkins-selector glass-panel">
        <div className="checkins-selector__header">
          <span>Tipo de check-in</span>
          <h2>
            Voce esta preenchendo:{" "}
            <strong>{checkinCadences[activeCadence].label}</strong>
          </h2>
          <p>
            Escolha semanal para acompanhar aderencia e feedback rapido. Escolha mensal
            para revisar medidas, bioimpedancia, fotos e o acumulado do mes.
          </p>
        </div>
        <div className="checkins-tabs checkins-tabs--compact" role="tablist" aria-label="Tipo de check-in">
          {["weekly", ...(canDoMonthly ? ["monthly"] : []), ...(canDoDaily ? ["daily"] : [])].map((cadence) => (
            <button
              key={cadence}
              type="button"
              className={`checkins-tab checkins-tab--${cadence} ${activeCadence === cadence ? "is-active" : ""}`}
              onClick={() => handleCadenceChange(cadence)}
              role="tab"
              aria-selected={activeCadence === cadence}
              aria-controls={`checkins-panel-${cadence}`}
              id={`checkins-tab-${cadence}`}
              tabIndex={activeCadence === cadence ? 0 : -1}
            >
              <span className="checkins-tab__icon">{cadence === "weekly" ? "S" : "M"}</span>
              <span className="checkins-tab__content">
                <strong>{checkinCadences[cadence].label}</strong>
                <span>{checkinCadences[cadence].description}</span>
                <em>{cadence === "weekly" ? "Aderencia e feedback" : "Dados completos do mes"}</em>
              </span>
              <span className="checkins-tab__state">
                {activeCadence === cadence ? "Selecionado" : "Selecionar"}
              </span>
            </button>
          ))}
        </div>
        <div className="checkins-progress-stack">
          <div className="checkins-progress-row">
            <div>
              <strong>Obrigatorios</strong>
              <span>{requiredCompleted}/{requiredFields.length}</span>
            </div>
            <div className="checkins-progress">
              <span style={{ width: `${requiredPercent}%` }} />
            </div>
          </div>
          {canDoBioimpedance && (
          <div className="checkins-progress-row checkins-progress-row--optional">
            <div>
              <strong>Opcionais de bioimpedancia</strong>
              <span>{optionalBioCompleted}/{optionalBioimpedanceFields.length}</span>
            </div>
            <div className="checkins-progress">
              <span style={{ width: `${optionalBioPercent}%` }} />
            </div>
          </div>
          )}
        </div>
        <div className="checkins-schedule-grid" aria-label="Datas dos check-ins">
          <article>
            <span>Ultimo check-in</span>
            <strong>{checkinSchedule.latestLabel}</strong>
            <small>{checkinSchedule.latestDetail}</small>
          </article>
          <article>
            <span>Reavaliacao semanal</span>
            <strong>{formatDateKey(checkinSchedule.weeklyDateKey)}</strong>
            <small>Proximo fechamento semanal previsto</small>
          </article>
          <article>
            <span>Reavaliacao mensal</span>
            <strong>{formatDateKey(checkinSchedule.monthlyDateKey)}</strong>
            <small>Proxima revisao completa prevista</small>
          </article>
          <article>
            <span>Data selecionada</span>
            <strong>{formatDateKey(selectedDateKey)}</strong>
            <small>Usada para salvar hoje ou retroativo</small>
          </article>
        </div>
      </section>

      {feedback ? (
        <p className="checkins-feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      ) : null}
      {isHydratingCheckins ? (
        <CheckinsLoadingSkeleton />
      ) : syncStatus ? (
        <p className="checkins-sync-status" role="status" aria-live="polite">
          {syncStatus}
        </p>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="checkins-content-tabs">
        <TabsList className="dashboard-tabs checkins-tabs-nav">
          <TabsTrigger value="formulario" className="dashboard-tab-trigger">Formulario</TabsTrigger>
          <TabsTrigger value="calendario" className="dashboard-tab-trigger">Calendario</TabsTrigger>
          <TabsTrigger value="historico" className="dashboard-tab-trigger">Historico</TabsTrigger>
        </TabsList>

        <TabsContent value="calendario">
          <CheckinCalendar
            checkins={checkins}
            selectedDateKey={selectedDateKey}
            calendarMonth={calendarMonth}
            onSelectDate={setSelectedDateKey}
            onChangeMonth={handleCalendarMonthChange}
            onToday={handleCalendarToday}
          />
        </TabsContent>

        <TabsContent value="formulario">
      <form
        className="checkins-form"
        onSubmit={handleSubmit}
        id={`checkins-panel-${activeCadence}`}
        role="tabpanel"
        aria-labelledby={`checkins-tab-${activeCadence}`}
      >
        <FormStaleContext.Provider value={{ isStale: isStaleField }}>
        <div className="checkins-form__main">
          {showProtocolBase ? (
            <Section
              eyebrow="02"
              title={showMonthly ? "Dados gerais do ciclo" : "Dados basicos do check-in semanal"}
              description={
                showMonthly
                  ? "Base editavel para o ciclo mensal. Apenas altura e peso travam o envio."
                  : "Semanal fica enxuto: altura, peso, aderencia e feedback sobre o protocolo."
              }
            >
              <div className="checkins-grid checkins-grid--two">
                {showMonthly ? (
                <Field label="Idade">
                  <input
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    inputMode="numeric"
                    placeholder="Ex.: 29"
                  />
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Sexo biologico">
                  <select name="sex" value={formData.sex} onChange={handleChange}>
                    <option value="">Selecione</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro / prefiro nao informar</option>
                  </select>
                </Field>
                ) : null}

                <Field label="Altura" required>
                  <input
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    inputMode="decimal"
                    placeholder="Ex.: 178 cm"
                  />
                </Field>

                <Field label="Peso atual" required>
                  <input
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    inputMode="decimal"
                    placeholder="Ex.: 84.6 kg"
                  />
                </Field>

                <Field label="Objetivo principal" hint="Usado pela IA para ajustar treino e dieta">
                  <select name="goal" value={formData.goal} onChange={handleChange}>
                    {goalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                {showMonthly ? (
                <Field label="Esporte especifico">
                  <input
                    name="sport"
                    value={formData.sport}
                    onChange={handleChange}
                    placeholder="Ex.: corrida de 10 km"
                  />
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Nivel de energia">
                  <select name="energy" value={formData.energy} onChange={handleChange}>
                    <option value="">Selecione</option>
                    {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                      <option key={value} value={value}>
                        {value}/10
                      </option>
                    ))}
                  </select>
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Sono medio">
                  <input
                    name="sleep"
                    value={formData.sleep}
                    onChange={handleChange}
                    inputMode="decimal"
                    placeholder="Ex.: 7.2 h"
                  />
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Nivel de treino">
                  <select
                    name="trainingExperience"
                    value={formData.trainingExperience}
                    onChange={handleChange}
                  >
                    {experienceOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Frequencia semanal disponivel">
                  <select
                    name="weeklyTrainingDays"
                    value={formData.weeklyTrainingDays}
                    onChange={handleChange}
                  >
                    <option value="">Selecione</option>
                    {weeklyTrainingDayOptions.map((value) => (
                      <option key={value} value={value}>
                        {value} dia{value === "1" ? "" : "s"} por semana
                      </option>
                    ))}
                  </select>
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Tempo disponivel por treino">
                  <select
                    name="availableMinutes"
                    value={formData.availableMinutes}
                    onChange={handleChange}
                  >
                    {availableTrainingTimeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Tempo de treino">
                  <select
                    name="trainingAge"
                    value={formData.trainingAge}
                    onChange={handleChange}
                  >
                    {trainingAgeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Refeicoes por dia">
                  <input
                    name="mealsPerDay"
                    value={formData.mealsPerDay}
                    onChange={handleChange}
                    placeholder="Ex.: 4"
                  />
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Turno usual do treino">
                  <select
                    name="trainingShift"
                    value={formData.trainingShift}
                    onChange={handleChange}
                  >
                    <option value="">Selecione</option>
                    <option value="manha">Manha</option>
                    <option value="tarde">Tarde</option>
                    <option value="noite">Noite</option>
                    <option value="variavel">Variavel</option>
                  </select>
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Restricoes alimentares">
                  <input
                    name="dietaryRestrictions"
                    value={formData.dietaryRestrictions}
                    onChange={handleChange}
                    placeholder="Ex.: lactose, gluten, vegetariano"
                  />
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Lesoes ou limitacoes fisicas" className="checkin-field--full">
                  <textarea
                    name="injuries"
                    value={formData.injuries}
                    onChange={handleChange}
                    placeholder="Ex.: estresse leve no joelho direito ao agachar, dor lombar em terra pesado."
                  />
                </Field>
                ) : null}

                {showMonthly ? (
                <Field label="Experiencia previa com treino" className="checkin-field--full">
                  <textarea
                    name="trainingBackground"
                    value={formData.trainingBackground}
                    onChange={handleChange}
                    placeholder="Ex.: musculacao desde 2020, ja fez crossfit por 1 ano, pouca experiencia com agachamento livre."
                  />
                </Field>
                ) : null}
              </div>
            </Section>
          ) : null}

          {showBodyComposition && canDoBodyMeasurements ? (
            <Section
              eyebrow="03"
              title="Antropometria editavel"
              description="Medidas do mes para comparar evolucao. Todos os campos desta area sao opcionais."
            >
              <div className="checkins-grid checkins-grid--two">
                <Field label="Cintura">
                  <input name="waist" value={formData.waist} onChange={handleChange} placeholder="Ex.: 84 cm" />
                </Field>
                <Field label="Abdomen">
                  <input name="abdomen" value={formData.abdomen} onChange={handleChange} placeholder="Ex.: 87 cm" />
                </Field>
                <Field label="Quadril">
                  <input name="hip" value={formData.hip} onChange={handleChange} placeholder="Ex.: 98 cm" />
                </Field>
                <Field label="Peito">
                  <input name="chestMeasure" value={formData.chestMeasure} onChange={handleChange} placeholder="Ex.: 104 cm" />
                </Field>
                <Field label="Braco relaxado direito">
                  <input name="rightArmMeasure" value={formData.rightArmMeasure} onChange={handleChange} placeholder="Ex.: 37 cm" />
                </Field>
                <Field label="Braco relaxado esquerdo">
                  <input name="leftArmMeasure" value={formData.leftArmMeasure} onChange={handleChange} placeholder="Ex.: 36.5 cm" />
                </Field>
                <Field label="Braco contraido direito">
                  <input name="rightFlexedArmMeasure" value={formData.rightFlexedArmMeasure} onChange={handleChange} placeholder="Ex.: 40 cm" />
                </Field>
                <Field label="Braco contraido esquerdo">
                  <input name="leftFlexedArmMeasure" value={formData.leftFlexedArmMeasure} onChange={handleChange} placeholder="Ex.: 39.5 cm" />
                </Field>
                <Field label="Coxa direita">
                  <input name="rightThighMeasure" value={formData.rightThighMeasure} onChange={handleChange} placeholder="Ex.: 60 cm" />
                </Field>
                <Field label="Coxa esquerda">
                  <input name="leftThighMeasure" value={formData.leftThighMeasure} onChange={handleChange} placeholder="Ex.: 59.5 cm" />
                </Field>
                <Field label="Panturrilha direita">
                  <input name="rightCalfMeasure" value={formData.rightCalfMeasure} onChange={handleChange} placeholder="Ex.: 39 cm" />
                </Field>
                <Field label="Panturrilha esquerda">
                  <input name="leftCalfMeasure" value={formData.leftCalfMeasure} onChange={handleChange} placeholder="Ex.: 38.5 cm" />
                </Field>
                <Field label="% gordura corporal estimada">
                  <input name="bodyFat" value={formData.bodyFat} onChange={handleChange} placeholder="Ex.: 14.2%" />
                </Field>
                <Field label="Massa magra estimada">
                  <input name="leanMass" value={formData.leanMass} onChange={handleChange} placeholder="Ex.: 72.6 kg" />
                </Field>
              </div>
            </Section>
          ) : null}

          {showBodyComposition && canDoBioimpedance ? (
            <Section
              eyebrow="04"
              title="Bioimpedancia opcional"
              description="Dados da balanca InBody, Tanita ou similar. Quanto mais completo, melhor a analise."
            >
              <div className="checkins-grid checkins-grid--three">
                <Field label="Peso corporal total">
                  <input name="totalBodyWeight" value={formData.totalBodyWeight} onChange={handleChange} placeholder="Ex.: 84.6 kg" />
                </Field>
                <Field label="% gordura bioimp.">
                  <input name="bioimpedanceBodyFat" value={formData.bioimpedanceBodyFat} onChange={handleChange} placeholder="Ex.: 14.2%" />
                </Field>
                <Field label="Massa muscular esqueletica">
                  <input name="skeletalMuscleMass" value={formData.skeletalMuscleMass} onChange={handleChange} placeholder="Ex.: 38 kg" />
                </Field>
                <Field label="Agua corporal total">
                  <input name="totalBodyWater" value={formData.totalBodyWater} onChange={handleChange} placeholder="Ex.: 57%" />
                </Field>
                <Field label="Massa ossea">
                  <input name="boneMass" value={formData.boneMass} onChange={handleChange} placeholder="Ex.: 3.4 kg" />
                </Field>
                <Field label="Taxa metabolica basal">
                  <input name="basalMetabolicRate" value={formData.basalMetabolicRate} onChange={handleChange} placeholder="Ex.: 1840 kcal" />
                </Field>
                <Field label="Idade metabolica">
                  <input name="metabolicAge" value={formData.metabolicAge} onChange={handleChange} placeholder="Ex.: 31 anos" />
                </Field>
                <Field label="IMC">
                  <input name="bmi" value={formData.bmi} onChange={handleChange} placeholder="Ex.: 26.7" />
                </Field>
                <Field label="Massa gorda">
                  <input name="fatMass" value={formData.fatMass} onChange={handleChange} placeholder="Ex.: 15 kg" />
                </Field>
                <Field label="Massa muscular">
                  <input name="muscleMass" value={formData.muscleMass} onChange={handleChange} placeholder="Ex.: 38 kg" />
                </Field>
                <Field label="Massa muscular braço direito">
                  <input name="rightArmMuscleMass" value={formData.rightArmMuscleMass} onChange={handleChange} placeholder="Ex.: 3.8 kg" />
                </Field>
                <Field label="Massa muscular braço esquerdo">
                  <input name="leftArmMuscleMass" value={formData.leftArmMuscleMass} onChange={handleChange} placeholder="Ex.: 3.7 kg" />
                </Field>
                <Field label="Massa muscular perna direita">
                  <input name="rightLegMuscleMass" value={formData.rightLegMuscleMass} onChange={handleChange} placeholder="Ex.: 10.8 kg" />
                </Field>
                <Field label="Massa muscular perna esquerda">
                  <input name="leftLegMuscleMass" value={formData.leftLegMuscleMass} onChange={handleChange} placeholder="Ex.: 10.6 kg" />
                </Field>
                <Field label="Massa muscular tronco">
                  <input name="trunkMuscleMass" value={formData.trunkMuscleMass} onChange={handleChange} placeholder="Ex.: 28 kg" />
                </Field>
                <Field label="Gordura braço direito">
                  <input name="rightArmFat" value={formData.rightArmFat} onChange={handleChange} placeholder="Ex.: 18%" />
                </Field>
                <Field label="Gordura braço esquerdo">
                  <input name="leftArmFat" value={formData.leftArmFat} onChange={handleChange} placeholder="Ex.: 18%" />
                </Field>
                <Field label="Gordura perna direita">
                  <input name="rightLegFat" value={formData.rightLegFat} onChange={handleChange} placeholder="Ex.: 20%" />
                </Field>
                <Field label="Gordura perna esquerda">
                  <input name="leftLegFat" value={formData.leftLegFat} onChange={handleChange} placeholder="Ex.: 20%" />
                </Field>
                <Field label="Gordura tronco">
                  <input name="trunkFat" value={formData.trunkFat} onChange={handleChange} placeholder="Ex.: 22%" />
                </Field>
                <Field label="Gordura visceral">
                  <input name="visceralFat" value={formData.visceralFat} onChange={handleChange} placeholder="Ex.: 8" />
                </Field>
                <Field label="Frequencia cardiaca repouso">
                  <input name="restingHeartRate" value={formData.restingHeartRate} onChange={handleChange} placeholder="Ex.: 62 bpm" />
                </Field>
              </div>
            </Section>
          ) : null}

          <Section
            eyebrow="06"
            title={showMonthly ? "Check-in mensal" : "Check-in semanal"}
            description={
              showMonthly
                ? "Preencha altura, peso, sinais, fotos e feedback do mes antes de salvar."
                : "Preencha altura, peso, aderencia percebida, fotos e feedback da semana."
            }
          >
            <div className="checkins-grid checkins-grid--three">
              <Field label="Altura" required invalid={submitAttempted && !hasValue(formData.height)}>
                <input
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  inputMode="decimal"
                  placeholder="Ex.: 178 cm"
                />
              </Field>

              <Field label="Peso atual" required invalid={submitAttempted && !hasValue(formData.weight)}>
                <input
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  inputMode="decimal"
                  placeholder="Ex.: 84.6 kg"
                />
              </Field>

              <Field label="Fome" required invalid={submitAttempted && !hasValue(formData.hunger)}>
                <select name="hunger" value={formData.hunger} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="baixa">Baixa</option>
                  <option value="moderada">Moderada</option>
                  <option value="alta">Alta</option>
                </select>
              </Field>

              <Field label="Estresse" required invalid={submitAttempted && !hasValue(formData.stress)}>
                <select name="stress" value={formData.stress} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="baixo">Baixo</option>
                  <option value="moderado">Moderado</option>
                  <option value="alto">Alto</option>
                </select>
              </Field>

              <Field label="Digestao" required invalid={submitAttempted && !hasValue(formData.digestion)}>
                <select name="digestion" value={formData.digestion} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="boa">Boa</option>
                  <option value="regular">Regular</option>
                  <option value="ruim">Ruim</option>
                </select>
              </Field>

              <Field label="Qualidade do sono" required invalid={submitAttempted && !hasValue(formData.sleepQuality)}>
                <select name="sleepQuality" value={formData.sleepQuality} onChange={handleChange}>
                  {sleepQualityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nivel de fadiga" required invalid={submitAttempted && !hasValue(formData.fatigueLevel)}>
                <select name="fatigueLevel" value={formData.fatigueLevel} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                    <option key={value} value={value}>
                      {value}/10
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Performance no treino" required invalid={submitAttempted && !hasValue(formData.trainingPerformance)}>
                <select
                  name="trainingPerformance"
                  value={formData.trainingPerformance}
                  onChange={handleChange}
                >
                  <option value="">Selecione</option>
                  <option value="abaixo">Abaixo do esperado</option>
                  <option value="normal">Normal</option>
                  <option value="acima">Acima do esperado</option>
                </select>
              </Field>

              <Field
                label="Variacao da dieta"
                hint="Baixa variacao usa menos ingredientes e pratos ao longo da semana. Alta variacao permite mais diversidade entre alimentos e refeicoes."
              >
                <select name="dietVariety" value={formData.dietVariety} onChange={handleChange}>
                  <option value="baixa">Pequena variacao</option>
                  <option value="media">Media variacao</option>
                  <option value="alta">Alta variacao</option>
                </select>
              </Field>

              {showWeekly ? (
              <Field label="Nivel de treino" hint="Usado pela IA para calibrar complexidade e volume dos exercicios">
                <select name="trainingExperience" value={formData.trainingExperience} onChange={handleChange}>
                  {experienceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              ) : null}

              {showWeekly ? (
              <Field label="Objetivo principal" hint="Usado pela IA para ajustar treino e dieta">
                <select name="goal" value={formData.goal} onChange={handleChange}>
                  {goalOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              ) : null}
            </div>

            {(showWeekly || showMonthly) && (
              <div>
                <Field
                  label="Quais dias da semana voce pode treinar"
                  hint="Marque os dias que voce tem disponibilidade real para ir a academia. A IA vai distribuir os treinos nesses dias com folgas bem posicionadas."
                  stale={isStaleField("trainingAvailableDays")}
                >
                  <DayPicker
                    value={formData.trainingAvailableDays}
                    stale={isStaleField("trainingAvailableDays")}
                    onChange={(val) =>
                      setFormData((prev) => ({
                        ...prev,
                        trainingAvailableDays: val,
                        // Deriva weeklyTrainingDays automaticamente pela contagem dos dias selecionados
                        weeklyTrainingDays: val ? String(val.split(",").filter(Boolean).length) : prev.weeklyTrainingDays,
                      }))
                    }
                  />
                </Field>
              </div>
            )}

            <div className="checkins-routine-block">
              <div>
                <h3>{showMonthly ? "Cronograma do mes" : "Cronograma da semana"}</h3>
                <p>
                  Esses horarios orientam dieta, lembretes de refeicao, agua, treino e janelas de
                  notificacao sem precisar configurar isso manualmente depois.
                </p>
              </div>

              <div className="checkins-grid checkins-grid--three">
                <Field label="Horario que acorda">
                  <input
                    type="time"
                    name="wakeTime"
                    value={formData.wakeTime}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Horario que vai dormir">
                  <input
                    type="time"
                    name="sleepTime"
                    value={formData.sleepTime}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Horario previsto do treino">
                  <input
                    type="time"
                    name="plannedTrainingTime"
                    value={formData.plannedTrainingTime}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Primeira refeicao do dia">
                  <input
                    type="time"
                    name="firstMealTime"
                    value={formData.firstMealTime}
                    onChange={handleChange}
                  />
                </Field>

                <Field label="Ultima refeicao do dia">
                  <input
                    type="time"
                    name="lastMealTime"
                    value={formData.lastMealTime}
                    onChange={handleChange}
                  />
                </Field>
              </div>
            </div>

            <Field label="Feedback da semana" required invalid={submitAttempted && !hasValue(formData.notes)}>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ex.: fome a noite, treino rendeu pouco, viagem, dores, refeicoes fora do plano."
              />
            </Field>

            {canDoPhotos && (
              <div className="photo-checkin-panel">
                <div className="photo-checkin-panel__header">
                  <div>
                    <h3>Fotos de progresso</h3>
                    <p>
                      Envie fotos de corpo inteiro seguindo as poses marcadas.
                      Use o mesmo local, luz e distancia sempre que possivel.
                    </p>
                  </div>
                  <span>{selectedPhotoCount}/{photoPoseSlots.length} fotos</span>
                </div>

                <div className="photo-pose-grid">
                  {photoPoseSlots.map((slot) => (
                    <PhotoPoseCard
                      key={slot.id}
                      slot={slot}
                      fileName={photoUploads[slot.id]?.fileName}
                      onChange={handlePhotoChange}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="checkins-inline-actions">
              <div>
                <strong>Salvar em {formatDateKey(selectedDateKey)}</strong>
                <span>Ao salvar, voce pode confirmar hoje ou escolher uma data retroativa.</span>
              </div>
              <button type="submit" className="primary-button" disabled={isGeneratingProtocols}>
                Salvar check-in
              </button>
              <button type="button" className="ghost-button" onClick={handleReset} disabled={isGeneratingProtocols}>
                Reiniciar check-in
              </button>
            </div>
          </Section>
        </div>
        </FormStaleContext.Provider>
      </form>
        </TabsContent>

        <TabsContent value="historico">
          <div className="checkins-history glass-panel">
          <div className="checkins-history__header">
            <small>Historico</small>
            <strong>Check-ins registrados</strong>
            <em>Linha do tempo de realizados, gaps e payloads salvos.</em>
            <mark>{checkins.length}</mark>
          </div>
        {isHydratingCheckins ? (
          <CheckinsLoadingSkeleton />
        ) : (
          <>
            <div className="checkins-history-overview">
              {metrics.map((item) => (
                <SectionCard
                  key={item.label}
                  className="checkins-history-card"
                  eyebrow={item.label}
                  title={item.value}
                  description={item.trend}
                />
              ))}
            </div>

            <div className="checkins-history-insights">
              <SectionCard
                className="checkins-history-insight"
                eyebrow="Leitura semanal para IA"
                title={`${weeklyAiDataset.usableEntries} registro(s) uteis`}
                description={
                  <>
                  {weeklyAiDataset.ignoredGaps} gap(s) ignorado(s) nas medias. Energia {weeklyAiDataset.averages.energy},
                  sono {weeklyAiDataset.averages.sleep}h e aderencia {weeklyAiDataset.averages.adherence}%.
                  </>
                }
                badge={
                  <StatusPill tone={weeklyAiDataset.ignoredGaps ? "warning" : "success"}>
                    {weeklyAiDataset.ignoredGaps ? "Com gaps" : "Dataset limpo"}
                  </StatusPill>
                }
              />

              <SectionCard
                className="checkins-history-insight"
                eyebrow="Reavaliacao do ciclo"
                title={monthlyReevaluation.reevaluationNeeded ? "Atencao necessaria" : "Ciclo em acompanhamento"}
                description={`Treino: ${monthlyReevaluation.training.cycle.label}. Dieta: ${monthlyReevaluation.diet.cycle.label}.`}
                badge={
                  <StatusPill tone={monthlyReevaluation.reevaluationNeeded ? "danger" : "success"}>
                    {monthlyReevaluation.reevaluationNeeded ? "Revisar" : "Em dia"}
                  </StatusPill>
                }
              />
            </div>

            <div className="checkins-cadence-table-shell">
              <Table className="checkins-cadence-table" aria-label="Resumo por cadencia de check-ins">
                <TableHeader>
                  <TableRow>
                    <TableHead>Cadencia</TableHead>
                    <TableHead>Realizados</TableHead>
                    <TableHead>Gaps</TableHead>
                    <TableHead>Energia</TableHead>
                    <TableHead>Sono</TableHead>
                    <TableHead>Aderencia</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cadenceSummary.map((item) => (
                    <TableRow key={item.cadence}>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>{item.completed}</TableCell>
                      <TableCell>{item.missed}</TableCell>
                      <TableCell>{formatValue(item.energyAverage, "/10")}</TableCell>
                      <TableCell>{formatValue(item.sleepAverage, "h")}</TableCell>
                      <TableCell>{formatValue(item.adherenceAverage, "%")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}

        {checkins.length === 0 ? (
          <p className="checkins-empty">
            Crie o primeiro check-in ou registre uma ausencia para iniciar a
            linha do tempo do usuario.
          </p>
        ) : (
          <div className="checkins-history-table-shell">
            <Table className="checkins-history-table" aria-label="Historico completo de check-ins">
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Cadencia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Peso</TableHead>
                  <TableHead>Sono</TableHead>
                  <TableHead>Energia</TableHead>
                  <TableHead>Aderencia</TableHead>
                  <TableHead>Fotos</TableHead>
                  <TableHead className="checkins-history-table__notes-head">Resumo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkins.map((item) => {
                  const cadence = item.cadence || "monthly";
                  const isMissed = item.status === "missed";

                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatCompactDateTime(item.createdAt)}</TableCell>
                      <TableCell>{checkinCadences[cadence].label}</TableCell>
                      <TableCell>
                        <StatusPill
                          tone={isMissed ? "danger" : "success"}
                          className={`checkins-table-pill ${isMissed ? "is-missed" : "is-completed"}`}
                        >
                          {isMissed ? "Gap" : `${item.completeness ?? "--"}%`}
                        </StatusPill>
                      </TableCell>
                      <TableCell>{formatValue(item.weight)}</TableCell>
                      <TableCell>{formatValue(item.sleep, "h")}</TableCell>
                      <TableCell>{formatValue(item.energy, "/10")}</TableCell>
                      <TableCell>{formatValue(item.adherence, "%")}</TableCell>
                      <TableCell>{Array.isArray(item.photos) ? item.photos.length : 0}/5</TableCell>
                      <TableCell className="checkins-history-table__notes-cell">
                        <strong>{isMissed ? "Nao realizado" : item.goal || "Check-in realizado"}</strong>
                        <span>{item.notes || "Sem observacoes registradas."}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
