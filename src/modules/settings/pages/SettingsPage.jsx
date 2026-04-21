import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import { loadCheckins } from "../../../data/checkinStorage";
import "./SettingsPage.css";

const SETTINGS_KEY = "shapeCertoSettings";

const personalNames = [
  { value: "ricardo", label: "Ricardo", gender: "masculino" },
  { value: "marcos", label: "Marcos", gender: "masculino" },
  { value: "rafael", label: "Rafael", gender: "masculino" },
  { value: "bruno", label: "Bruno", gender: "masculino" },
  { value: "gabriel", label: "Gabriel", gender: "masculino" },
  { value: "ana", label: "Ana", gender: "feminino" },
  { value: "mariana", label: "Mariana", gender: "feminino" },
  { value: "camila", label: "Camila", gender: "feminino" },
  { value: "julia", label: "Julia", gender: "feminino" },
  { value: "lara", label: "Lara", gender: "feminino" },
];

const defaultSettings = {
  notifications: {
    workoutReminder: true,
    mealReminder: true,
    waterReminder: true,
    progressReminder: true,
    weeklyCheckin: true,
    monthlyReevaluation: true,
  },
  personal: {
    name: "ricardo",
  },
  privacy: {
    useOnlyOwnData: true,
    allowMediaAnalysis: true,
    saveChatHistory: false,
  },
};

const notificationItems = [
  {
    key: "workoutReminder",
    title: "Hora do treino",
    description: "Lembretes baseados no horario previsto do treino informado no check-in.",
    icon: "solar:dumbbell-large-bold",
    scheduleKey: "plannedTrainingTime",
  },
  {
    key: "mealReminder",
    title: "Hora da refeicao",
    description: "Avisos entre a primeira e a ultima refeicao cadastradas no check-in.",
    icon: "solar:chef-hat-bold",
    scheduleKey: "mealWindow",
  },
  {
    key: "waterReminder",
    title: "Beber agua",
    description: "Lembretes distribuidos entre acordar e dormir, respeitando a rotina informada.",
    icon: "solar:waterdrops-bold",
    scheduleKey: "wakeWindow",
  },
  {
    key: "progressReminder",
    title: "Evolucao e progresso",
    description: "Avisos sobre comparativos, carga, peso, medidas e bioimpedancia.",
    icon: "solar:chart-2-bold",
    scheduleKey: "progress",
  },
  {
    key: "weeklyCheckin",
    title: "Check-in semanal",
    description: "Lembrete para fechar a semana e ajustar sinais, fotos e feedback.",
    icon: "solar:calendar-mark-bold",
    scheduleKey: "weekly",
  },
  {
    key: "monthlyReevaluation",
    title: "Reavaliacao mensal",
    description: "Lembrete para atualizar antropometria, bioimpedancia e fotos do ciclo.",
    icon: "solar:clipboard-check-bold",
    scheduleKey: "monthly",
  },
];

const privacyItems = [
  {
    key: "allowMediaAnalysis",
    title: "Permitir analise de imagens e videos",
    description: "Autoriza usar anexos enviados no chat para feedback tecnico e progresso visual.",
  },
  {
    key: "saveChatHistory",
    title: "Salvar historico do chat",
    description: "Quando ativado, conversas futuras poderao ser consultadas pelo usuario.",
  },
];

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      notifications: {
        ...defaultSettings.notifications,
        ...(parsed?.notifications || {}),
      },
      personal: {
        ...defaultSettings.personal,
        ...(parsed?.personal || {}),
      },
      privacy: {
        ...defaultSettings.privacy,
        ...(parsed?.privacy || {}),
        useOnlyOwnData: true,
      },
    };
  } catch (error) {
    return defaultSettings;
  }
}

function persistSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  return settings;
}

function getLatestRoutineCheckin() {
  return loadCheckins().find(
    (checkin) =>
      checkin.status !== "missed" &&
      (checkin.wakeTime ||
        checkin.sleepTime ||
        checkin.firstMealTime ||
        checkin.lastMealTime ||
        checkin.plannedTrainingTime)
  );
}

function formatTime(value) {
  return value || "";
}

function getSuggestedSchedule(item, routineCheckin) {
  if (!routineCheckin) {
    return "Falta preencher a rotina no check-in.";
  }

  if (item.scheduleKey === "plannedTrainingTime") {
    return routineCheckin.plannedTrainingTime
      ? `Sugerido: ${formatTime(routineCheckin.plannedTrainingTime)}`
      : "Falta informar o horario do treino no check-in.";
  }

  if (item.scheduleKey === "mealWindow") {
    return routineCheckin.firstMealTime && routineCheckin.lastMealTime
      ? `Entre ${formatTime(routineCheckin.firstMealTime)} e ${formatTime(routineCheckin.lastMealTime)}`
      : "Falta informar primeira e ultima refeicao no check-in.";
  }

  if (item.scheduleKey === "wakeWindow") {
    return routineCheckin.wakeTime && routineCheckin.sleepTime
      ? `Entre ${formatTime(routineCheckin.wakeTime)} e ${formatTime(routineCheckin.sleepTime)}`
      : "Falta informar horario de acordar e dormir no check-in.";
  }

  if (item.scheduleKey === "progress") {
    return routineCheckin.sleepTime ? `Sugerido: ${formatTime(routineCheckin.sleepTime)}` : "Sugerido apos o fim do dia.";
  }

  if (item.scheduleKey === "weekly") {
    return "Sugerido: fim da semana.";
  }

  if (item.scheduleKey === "monthly") {
    return "Sugerido: fim do ciclo mensal.";
  }

  return "";
}

function SettingsSection({ eyebrow, title, description, status, children }) {
  return (
    <details className="settings-section">
      <summary>
        <span className="settings-section__icon">+</span>
        <span>
          <small>{eyebrow}</small>
          <strong>{title}</strong>
          <em>{description}</em>
        </span>
        <mark>{status}</mark>
      </summary>
      <div className="settings-section__body">{children}</div>
    </details>
  );
}

function ToggleRow({ icon, title, description, schedule, checked, disabled = false, onChange }) {
  return (
    <article className={`settings-toggle-row ${checked ? "is-enabled" : ""} ${disabled ? "is-locked" : ""}`}>
      <div className="settings-toggle-row__icon">
        {icon ? <Icon icon={icon} aria-hidden="true" /> : <Icon icon="solar:shield-check-bold" aria-hidden="true" />}
      </div>
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
        {schedule ? <small>{schedule}</small> : null}
      </div>
      <button
        type="button"
        className="settings-switch"
        aria-pressed={checked}
        disabled={disabled}
        onClick={onChange}
      >
        <span />
      </button>
    </article>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState(() => loadSettings());
  const selectedPersonal = useMemo(
    () => personalNames.find((item) => item.value === settings.personal.name) || personalNames[0],
    [settings.personal.name]
  );
  const latestRoutineCheckin = useMemo(() => getLatestRoutineCheckin(), []);
  const activeNotificationCount = Object.values(settings.notifications).filter(Boolean).length;

  function updateSettings(updater) {
    setSettings((current) => persistSettings(updater(current)));
  }

  function toggleNotification(key) {
    updateSettings((current) => ({
      ...current,
      notifications: {
        ...current.notifications,
        [key]: !current.notifications[key],
      },
    }));
  }

  function togglePrivacy(key) {
    if (key === "useOnlyOwnData") {
      return;
    }

    updateSettings((current) => ({
      ...current,
      privacy: {
        ...current.privacy,
        [key]: !current.privacy[key],
        useOnlyOwnData: true,
      },
    }));
  }

  function handlePersonalChange(event) {
    updateSettings((current) => ({
      ...current,
      personal: {
        ...current.personal,
        name: event.target.value,
      },
    }));
  }

  return (
    <section className="settings-page">
      <header className="settings-hero">
        <span>Configuracoes</span>
        <h1>Ajustes do Shape Certo.</h1>
        <p>
          Controle notificacoes, comportamento do Personal Virtual e permissoes de uso dos seus
          dados. Todas as secoes ficam recolhidas para manter a tela leve no celular.
        </p>
        {!latestRoutineCheckin ? (
          <strong className="settings-hero__notice">
            Preencha os horarios de rotina no check-in semanal ou mensal para ativar sugestoes de horario.
          </strong>
        ) : null}
      </header>

      <div className="settings-stack">
        <SettingsSection
          eyebrow="01"
          title="Notificacoes"
          description="Treino, refeicoes, agua, progresso e check-ins."
          status={`${activeNotificationCount}/${notificationItems.length} ativas`}
        >
          <div className="settings-list">
            {notificationItems.map((item) => (
              <ToggleRow
                key={item.key}
                icon={item.icon}
                title={item.title}
                description={item.description}
                schedule={getSuggestedSchedule(item, latestRoutineCheckin)}
                checked={settings.notifications[item.key]}
                onChange={() => toggleNotification(item.key)}
              />
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="02"
          title="Personal Virtual"
          description="Escolha o nome do agente que acompanha seu treino e dieta."
          status={selectedPersonal.label}
        >
          <div className="settings-personal-grid settings-personal-grid--single">
            <label>
              <span>Nome do Personal Virtual</span>
              <select value={settings.personal.name} onChange={handlePersonalChange}>
                {personalNames.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </SettingsSection>

        <SettingsSection
          eyebrow="03"
          title="Privacidade e IA"
          description="Regras de uso dos dados pelo Personal Virtual."
          status="Protegido"
        >
          <div className="settings-list">
            {privacyItems.map((item) => (
              <ToggleRow
                key={item.key}
                title={item.title}
                description={item.description}
                checked={settings.privacy[item.key]}
                disabled={item.locked}
                onChange={() => togglePrivacy(item.key)}
              />
            ))}
          </div>
        </SettingsSection>
      </div>
    </section>
  );
}
