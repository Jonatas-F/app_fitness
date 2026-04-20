import { Children, isValidElement, useEffect, useMemo, useState } from "react";
import {
  checkinCadences,
  defaultCheckinForm,
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
import { loadDietProtocol } from "../../../data/dietStorage";
import { loadWorkoutSessionHistory } from "../../../data/workoutExecutionStorage";
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
    "protocolAction",
    "notes",
    "photos",
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
    "protocolAction",
    "notes",
    "photos",
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

function getChildrenValue(children) {
  let value = "";

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
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

function Field({ label, required = false, hint, children, className = "" }) {
  const fieldValue = getChildrenValue(children);
  const isFilled = Array.isArray(fieldValue)
    ? fieldValue.length > 0
    : String(fieldValue ?? "").trim().length > 0;

  return (
    <label className={`checkin-field ${className} ${isFilled ? "is-filled" : ""}`.trim()}>
      <span className="checkin-field__label">
        {label}
        {required ? <strong>Obrigatorio</strong> : <em>Opcional</em>}
      </span>
      <span className="checkin-field__control">
        {children}
        {isFilled ? <span className="checkin-field__check" aria-hidden="true">✓</span> : null}
      </span>
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Section({ eyebrow, title, description, children }) {
  return (
    <details className="checkin-section checkins-collapsible glass-panel">
      <summary className="checkins-collapsible__summary">
        <span className="checkins-collapsible__icon">+</span>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          {description ? <em>{description}</em> : null}
        </span>
      </summary>
      <div className="checkins-collapsible__body">{children}</div>
    </details>
  );
}

function formatValue(value, suffix = "") {
  return value ? `${value}${suffix}` : "--";
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
  const isDoubleBiceps = pose === "double-front" || pose === "double-back";
  const isSide = pose === "side";

  if (isSide) {
    return (
      <svg
        className="photo-pose-card__stickman"
        viewBox="0 0 120 112"
        role="img"
        aria-label={`Pose ${title}`}
      >
        <circle cx="60" cy="19" r="5" />
        <path d="M60 25 L60 70" />
        <path d="M58 31 L54 58" />
        <path d="M62 31 L66 58" />
        <path d="M60 70 L55 98" />
        <path d="M60 70 L65 98" />
        <path d="M52 98 H58" />
        <path d="M62 98 H68" />
      </svg>
    );
  }

  return (
    <svg
      className="photo-pose-card__stickman"
      viewBox="0 0 120 112"
      role="img"
      aria-label={`Pose ${title}`}
    >
      <circle cx="60" cy="18" r="5" />
      <path d="M54 27 L66 27" />
      <path d="M55 27 L53 55" />
      <path d="M65 27 L67 55" />
      <path d="M53 55 H67" />
      {isBack ? <path className="stickman-backline" d="M60 28 V55" /> : null}

      {isDoubleBiceps ? (
        <>
          <path d="M54 28 L42 19" />
          <path d="M42 19 L37 30" />
          <path d="M66 28 L78 19" />
          <path d="M78 19 L83 30" />
          <circle className="stickman-joint" cx="37" cy="30" r="2" />
          <circle className="stickman-joint" cx="83" cy="30" r="2" />
        </>
      ) : (
        <>
          <path d="M54 29 L50 61" />
          <path d="M66 29 L70 61" />
        </>
      )}

      <path d="M56 55 L51 98" />
      <path d="M64 55 L69 98" />
      <path d="M48 98 H54" />
      <path d="M66 98 H72" />
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
    <details className="checkins-calendar checkins-collapsible glass-panel" open>
      <summary className="checkins-collapsible__summary">
        <span className="checkins-collapsible__icon">+</span>
        <span>
          <small>Calendario</small>
          <strong>Consultar ou lancar data retroativa</strong>
          <em>Selecione um dia para ver registros anteriores ou salvar o proximo check-in nessa data.</em>
        </span>
        <mark>{formatDateKey(selectedDateKey)}</mark>
      </summary>

      <div className="checkins-collapsible__body">
      <div className="checkins-calendar__header">

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
    </details>
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
  const todayKey = toDateKey(new Date());
  const [activeCadence, setActiveCadence] = useState("weekly");
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateKey(todayKey));
  const [formData, setFormData] = useState({
    ...defaultCheckinForm,
    cadence: "weekly",
  });
  const [photoUploads, setPhotoUploads] = useState({});
  const [checkins, setCheckins] = useState(() => loadCheckins());
  const [feedback, setFeedback] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [toast, setToast] = useState(null);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [pendingPayload, setPendingPayload] = useState(null);

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
        return;
      }

      if (result.error) {
        setSyncStatus(`Supabase: ${result.error.message}`);
        return;
      }

      setCheckins(result.checkins);
      setSyncStatus("Historico sincronizado com Supabase.");
    }

    hydrateCheckins();

    return () => {
      ignore = true;
    };
  }, []);

  function handleCadenceChange(cadence) {
    setActiveCadence(cadence);
    setFormData((current) => ({
      ...defaultCheckinForm,
      ...current,
      cadence,
    }));
    setFeedback("");
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

    setFormData({ ...defaultCheckinForm, cadence: activeCadence });
    setPhotoUploads({});
    setFeedback(
      `${checkinCadences[activeCadence].label} salvo em ${formatDateKey(selectedDateKey)}. O historico foi atualizado sem regenerar treino ou dieta automaticamente.`
    );
    showToast(`${checkinCadences[activeCadence].label} salvo com sucesso.`);
    setSyncStatus(
      remote.error
        ? `Salvo localmente. Supabase: ${remote.error.message}`
        : remote.skipped
          ? "Salvo localmente. Entre com Supabase para sincronizar."
          : "Check-in salvo no Supabase."
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const payload = buildCheckinPayload();
    const validation = validateCheckinForm(payload);

    if (!validation.isValid) {
      setFeedback(validation.message);
      return;
    }

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
      remote.error
        ? `Ausencia salva localmente. Supabase: ${remote.error.message}`
        : remote.skipped
          ? "Ausencia salva localmente. Entre com Supabase para sincronizar."
          : "Ausencia salva no Supabase."
    );
  }

  async function handleReset() {
    const resetData = resetCheckins();
    setCheckins(resetData);
    setFeedback("Historico de check-ins resetado.");
    showToast("Historico de check-ins resetado.", "warning");
    const remote = await deleteRemoteCheckins();
    setSyncStatus(
      remote.error
        ? `Historico local resetado. Supabase: ${remote.error.message}`
        : remote.skipped
          ? "Historico local resetado."
          : "Historico local e Supabase resetados."
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
        <div className="checkins-modal" role="dialog" aria-modal="true" aria-labelledby="checkin-save-title">
          <div className="checkins-modal__panel glass-panel">
            <div className="checkins-modal__header">
              <div>
                <span>Confirmar data</span>
                <h2 id="checkin-save-title">Salvar {checkinCadences[activeCadence].label.toLowerCase()}</h2>
                <p>
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
              <button type="button" className="ghost-button" onClick={() => setSaveConfirmOpen(false)}>
                Cancelar
              </button>
              <button type="button" className="primary-button" onClick={handleConfirmSave}>
                Confirmar e salvar
              </button>
            </div>
          </div>
        </div>
      ) : null}

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
          {["weekly", "monthly"].map((cadence) => (
            <button
              key={cadence}
              type="button"
              className={`checkins-tab checkins-tab--${cadence} ${activeCadence === cadence ? "is-active" : ""}`}
              onClick={() => handleCadenceChange(cadence)}
              aria-pressed={activeCadence === cadence}
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
          <div className="checkins-progress-row checkins-progress-row--optional">
            <div>
              <strong>Opcionais de bioimpedancia</strong>
              <span>{optionalBioCompleted}/{optionalBioimpedanceFields.length}</span>
            </div>
            <div className="checkins-progress">
              <span style={{ width: `${optionalBioPercent}%` }} />
            </div>
          </div>
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

      {feedback ? <p className="checkins-feedback">{feedback}</p> : null}
      {syncStatus ? <p className="checkins-sync-status">{syncStatus}</p> : null}

      <form className="checkins-form" onSubmit={handleSubmit}>
        <div className="checkins-form__main">
          <CheckinCalendar
            checkins={checkins}
            selectedDateKey={selectedDateKey}
            calendarMonth={calendarMonth}
            onSelectDate={setSelectedDateKey}
            onChangeMonth={handleCalendarMonthChange}
            onToday={handleCalendarToday}
          />

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

                {showMonthly ? (
                <Field label="Objetivo principal">
                  <select name="goal" value={formData.goal} onChange={handleChange}>
                    {goalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                ) : null}

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

          {showBodyComposition ? (
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

          {showBodyComposition ? (
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

              <Field label="Fome" required>
                <select name="hunger" value={formData.hunger} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="baixa">Baixa</option>
                  <option value="moderada">Moderada</option>
                  <option value="alta">Alta</option>
                </select>
              </Field>

              <Field label="Estresse" required>
                <select name="stress" value={formData.stress} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="baixo">Baixo</option>
                  <option value="moderado">Moderado</option>
                  <option value="alto">Alto</option>
                </select>
              </Field>

              <Field label="Digestao" required>
                <select name="digestion" value={formData.digestion} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="boa">Boa</option>
                  <option value="regular">Regular</option>
                  <option value="ruim">Ruim</option>
                </select>
              </Field>

              <Field label="Qualidade do sono" required>
                <select name="sleepQuality" value={formData.sleepQuality} onChange={handleChange}>
                  {sleepQualityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Nivel de fadiga" required>
                <select name="fatigueLevel" value={formData.fatigueLevel} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                    <option key={value} value={value}>
                      {value}/10
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Performance no treino" required>
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
            </div>

            {(showWeekly || showMonthly) ? (
              <div className="checkins-grid checkins-grid--two">
                <Field
                  label="Acao sobre protocolo"
                  required
                  hint="Sinaliza necessidade, mas nao gera dieta ou treino automaticamente."
                >
                  <select
                    name="protocolAction"
                    value={formData.protocolAction}
                    onChange={handleChange}
                  >
                    <option value="none">Manter protocolo atual</option>
                    <option value="monitor">Acompanhar sem alterar</option>
                    <option value="request-adjustment">Sinalizar ajuste manual/IA</option>
                  </select>
                </Field>
              </div>
            ) : null}

            <Field label="Feedback da semana" required>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ex.: fome a noite, treino rendeu pouco, viagem, dores, refeicoes fora do plano."
              />
            </Field>

            <div className="photo-checkin-panel">
              <div className="photo-checkin-panel__header">
                <div>
                  <h3>Fotos de progresso obrigatorias</h3>
                  <p>
                    Envie ate cinco fotos de corpo inteiro seguindo as poses
                    marcadas. Use o mesmo local, luz e distancia sempre que
                    possivel.
                  </p>
                </div>
                <span>{selectedPhotoCount}/5 fotos</span>
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

            <div className="checkins-inline-actions">
              <div>
                <strong>Salvar em {formatDateKey(selectedDateKey)}</strong>
                <span>Ao salvar, voce pode confirmar hoje ou escolher uma data retroativa.</span>
              </div>
              <button type="submit" className="primary-button">
                Salvar check-in
              </button>
              <button type="button" className="ghost-button" onClick={handleReset}>
                Reiniciar check-in
              </button>
            </div>
          </Section>
        </div>
      </form>

      <details className="checkins-history checkins-collapsible glass-panel">
        <summary className="checkins-collapsible__summary">
          <span className="checkins-collapsible__icon">+</span>
          <span>
            <small>Historico</small>
            <strong>Check-ins registrados</strong>
            <em>Linha do tempo de realizados, gaps e payloads salvos.</em>
          </span>
          <mark>{checkins.length}</mark>
        </summary>

        <div className="checkins-collapsible__body">

        {checkins.length === 0 ? (
          <p className="checkins-empty">
            Crie o primeiro check-in ou registre uma ausencia para iniciar a
            linha do tempo do usuario.
          </p>
        ) : (
          <div className="checkins-history__list">
            {checkins.map((item) => {
              const cadence = item.cadence || "monthly";
              const isMissed = item.status === "missed";

              return (
                <article
                  key={item.id}
                  className={`checkins-history-card ${isMissed ? "is-missed" : ""}`}
                >
                  <div className="checkins-history-card__top">
                    <div>
                      <h3>{new Date(item.createdAt).toLocaleString("pt-BR")}</h3>
                      <p>
                        {checkinCadences[cadence].label} -{" "}
                        {isMissed ? "nao realizado" : item.goal || "realizado"}
                      </p>
                    </div>
                    <span>{isMissed ? "Gap registrado" : `${item.completeness ?? "--"}% para IA`}</span>
                  </div>

                  <div className="checkins-history-card__grid">
                    <div>
                      <small>Peso</small>
                      <strong>{formatValue(item.weight)}</strong>
                    </div>
                    <div>
                      <small>Sono</small>
                      <strong>{formatValue(item.sleep, "h")}</strong>
                    </div>
                    <div>
                      <small>Energia</small>
                      <strong>{formatValue(item.energy, "/10")}</strong>
                    </div>
                    <div>
                      <small>Aderencia</small>
                      <strong>{formatValue(item.adherence, "%")}</strong>
                    </div>
                    <div>
                      <small>Fome</small>
                      <strong>{formatValue(item.hunger)}</strong>
                    </div>
                    <div>
                      <small>Acao</small>
                      <strong>{item.protocolAction || "none"}</strong>
                    </div>
                    <div>
                      <small>Fotos</small>
                      <strong>{Array.isArray(item.photos) ? item.photos.length : 0}/5</strong>
                    </div>
                  </div>

                  <p className="checkins-history-card__notes">
                    {item.notes || "Sem observacoes registradas."}
                  </p>
                </article>
              );
            })}
          </div>
        )}
        </div>
      </details>
    </section>
  );
}
