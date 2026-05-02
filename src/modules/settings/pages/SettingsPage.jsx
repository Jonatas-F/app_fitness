import { useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import SectionCard from "@/components/ui/SectionCard";
import Skeleton from "@/components/ui/skeleton";
import StatusPill from "@/components/ui/StatusPill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { loadCheckins } from "../../../data/checkinStorage";
import { getPersonalAvatarById, personalAvatarCatalog } from "../../../data/platformImageCatalog";
import { loadRemoteSettings, saveRemoteSettings } from "../../../services/settingsService";
import ProfilePage from "../../profile/pages/ProfilePage";
import "./SettingsPage.css";

const SETTINGS_KEY = "shapeCertoSettings";

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
    name: "Ricardo",
    languageTone: "direto",
    motivationStyle: "equilibrado",
    feedbackDepth: "objetivo",
    avatarId: "default-personal",
  },
  privacy: {
    useOnlyOwnData: true,
    allowMediaAnalysis: true,
    saveChatHistory: false,
  },
};

const languageToneOptions = [
  { value: "leve", label: "Leve", description: "Respostas tranquilas, acolhedoras e sem pressao." },
  { value: "direto", label: "Direto", description: "Objetivo, pratico e com pouco rodeio." },
  { value: "intenso", label: "Mais agressivo", description: "Mais cobranca, energia alta e foco em execucao." },
  { value: "tecnico", label: "Tecnico", description: "Mais explicacoes sobre treino, dieta e dados." },
];

const motivationStyleOptions = [
  { value: "calmo", label: "Calmo", description: "Tom sereno para manter consistencia." },
  { value: "equilibrado", label: "Equilibrado", description: "Mistura incentivo, cobranca e clareza." },
  { value: "animado", label: "Animado", description: "Mais entusiasmo e reforco positivo." },
  { value: "disciplinador", label: "Disciplinador", description: "Mais firmeza quando houver queda de aderencia." },
];

const feedbackDepthOptions = [
  { value: "curto", label: "Curto", description: "Feedback rapido e facil de aplicar." },
  { value: "objetivo", label: "Objetivo", description: "Explica o suficiente e ja indica a acao." },
  { value: "detalhado", label: "Detalhado", description: "Traz contexto, motivos e proximos passos." },
];

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
        name: parsed?.personal?.name ?? defaultSettings.personal.name,
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

function normalizeSettings(settings) {
  return {
    notifications: {
      ...defaultSettings.notifications,
      ...(settings?.notifications || {}),
    },
    personal: {
      ...defaultSettings.personal,
      ...(settings?.personal || {}),
      name: String(settings?.personal?.name ?? defaultSettings.personal.name).slice(0, 60),
    },
    privacy: {
      ...defaultSettings.privacy,
      ...(settings?.privacy || {}),
      useOnlyOwnData: true,
    },
  };
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

function SettingsOptionGroup({ title, options, value, onChange }) {
  return (
    <section className="settings-option-group">
      <h3>{title}</h3>
      <div>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? "is-selected" : ""}
            onClick={() => onChange(option.value)}
          >
            <strong>{option.label}</strong>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [savedSettings, setSavedSettings] = useState(() => loadSettings());
  const [settings, setSettings] = useState(() => loadSettings());
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrating, setIsHydrating] = useState(true);
  const [activeTab, setActiveTab] = useState("account");
  const selectedAvatar = useMemo(
    () => getPersonalAvatarById(settings.personal.avatarId),
    [settings.personal.avatarId]
  );
  const latestRoutineCheckin = useMemo(() => getLatestRoutineCheckin(), []);
  const activeNotificationCount = Object.values(settings.notifications).filter(Boolean).length;
  const enabledPrivacyRules = Object.values(settings.privacy).filter(Boolean).length;
  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(settings) !== JSON.stringify(savedSettings),
    [savedSettings, settings]
  );
  const overviewCards = [
    {
      label: "Conta e perfil",
      value: "Unificado",
      helper: "Dados, pagamento, academia e preferencias",
    },
    {
      label: "Notificacoes ativas",
      value: `${activeNotificationCount}/${notificationItems.length}`,
      helper: latestRoutineCheckin ? "Baseadas na rotina mais recente" : "Falta rotina no check-in",
    },
    {
      label: "Personal atual",
      value: settings.personal.name || "Personal",
      helper: `${settings.personal.languageTone} | ${settings.personal.feedbackDepth}`,
    },
    {
      label: "Privacidade",
      value: `${enabledPrivacyRules}/${Object.keys(settings.privacy).length}`,
      helper: "Regras locais e de IA ativas",
    },
  ];

  useEffect(() => {
    let ignore = false;

    async function hydrateSettings() {
      setIsHydrating(true);
      const result = await loadRemoteSettings();

      if (ignore || result.skipped || result.error || !result.settings) {
        setIsHydrating(false);
        return;
      }

      const remoteSettings = normalizeSettings(result.settings);
      setSavedSettings(remoteSettings);
      setSettings(remoteSettings);
      persistSettings(remoteSettings);
      setIsHydrating(false);
    }

    hydrateSettings();

    return () => {
      ignore = true;
    };
  }, []);

  function updateSettings(updater) {
    setSaveMessage("");
    setSettings((current) => normalizeSettings(updater(current)));
  }

  async function handleSaveSettings() {
    const next = persistSettings(normalizeSettings(settings));
    setSettings(next);
    setIsSaving(true);
    setSaveMessage("Salvando configuracoes...");

    const result = await saveRemoteSettings(next);
    setIsSaving(false);

    if (result.error) {
      setSavedSettings(next);
      window.dispatchEvent(new CustomEvent("shape-certo-settings-updated", { detail: next }));
      setSaveMessage(`Salvo neste dispositivo. Banco SQL: ${result.error.message}`);
      return;
    }

    const storedSettings = normalizeSettings(result.settings || next);
    setSavedSettings(storedSettings);
    setSettings(storedSettings);
    persistSettings(storedSettings);
    window.dispatchEvent(new CustomEvent("shape-certo-settings-updated", { detail: storedSettings }));
    setSaveMessage(result.skipped ? "Salvo neste dispositivo." : "Configuracoes salvas no banco SQL.");
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

  function handlePersonalNameChange(event) {
    updateSettings((current) => ({
      ...current,
      personal: {
        ...current.personal,
        name: event.target.value,
      },
    }));
  }

  function handlePersonalOptionChange(key, value) {
    updateSettings((current) => ({
      ...current,
      personal: {
        ...current.personal,
        [key]: value,
      },
    }));
  }

  return (
    <section className="settings-page">
      <header className="settings-hero">
        <span>Configuracoes</span>
        <h1>Ajustes do Shape Certo.</h1>
        <p>
          Controle conta, pagamento, perfil, notificacoes, comportamento do Personal Virtual e
          permissoes de uso dos seus dados em um unico lugar.
        </p>
        {!latestRoutineCheckin ? (
          <strong className="settings-hero__notice">
            Preencha os horarios de rotina no check-in semanal ou mensal para ativar sugestoes de horario.
          </strong>
        ) : null}
      </header>

      {isHydrating ? (
        <section className="settings-loading-shell glass-panel">
          <div className="settings-loading-grid">
            <Skeleton className="settings-skeleton settings-skeleton--card" />
            <Skeleton className="settings-skeleton settings-skeleton--card" />
            <Skeleton className="settings-skeleton settings-skeleton--card" />
          </div>
          <Skeleton className="settings-skeleton settings-skeleton--tabs" />
          <Skeleton className="settings-skeleton settings-skeleton--panel" />
        </section>
      ) : (
        <>
          <section className="settings-overview-grid">
            {overviewCards.map((item) => (
              <SectionCard
                key={item.label}
                className="settings-overview-card glass-panel"
                eyebrow={item.label}
                title={item.value}
                description={item.helper}
              />
            ))}
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="settings-tabs-root">
            <TabsList className="settings-tabs" variant="line">
              <TabsTrigger value="account" className="settings-tab-trigger">
                <strong>Conta e perfil</strong>
                <StatusPill tone="neutral">Unificado</StatusPill>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="settings-tab-trigger">
                <strong>Notificacoes</strong>
                <StatusPill tone="danger">{activeNotificationCount} ativas</StatusPill>
              </TabsTrigger>
              <TabsTrigger value="personal" className="settings-tab-trigger">
                <strong>Personal</strong>
                <StatusPill tone="neutral">{settings.personal.name || "Personal"}</StatusPill>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="settings-tab-trigger">
                <strong>Privacidade</strong>
                <StatusPill tone="warning">{enabledPrivacyRules} regra(s)</StatusPill>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="settings-tab-panel settings-profile-panel">
              <ProfilePage embedded />
            </TabsContent>

            <TabsContent value="notifications" className="settings-tab-panel">
              <div className="settings-stack">
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
              </div>
            </TabsContent>

            <TabsContent value="personal" className="settings-tab-panel">
              <div className="settings-stack">
                <div className="settings-personal-grid">
                  <label>
                    <span>Nome do Personal Virtual</span>
                    <input
                      type="text"
                      value={settings.personal.name}
                      onChange={handlePersonalNameChange}
                      placeholder="Ex.: Ricardo, Ana, Coach Max"
                      maxLength={60}
                    />
                  </label>

                  <article className="settings-avatar-preview">
                    {selectedAvatar ? <img src={selectedAvatar.url} alt={`Avatar ${selectedAvatar.label}`} /> : null}
                    <div>
                      <strong>{settings.personal.name || "Personal Virtual"}</strong>
                      <p>Avatar selecionado para o chat e pontos-chave da experiencia.</p>
                    </div>
                  </article>
                </div>

                <div className="settings-avatar-grid">
                  {personalAvatarCatalog.map((avatar) => (
                    <button
                      key={avatar.id}
                      type="button"
                      className={settings.personal.avatarId === avatar.id ? "is-selected" : ""}
                      onClick={() => handlePersonalOptionChange("avatarId", avatar.id)}
                    >
                      <img src={avatar.url} alt={avatar.label} />
                    </button>
                  ))}
                </div>

                <div className="settings-option-groups">
                  <SettingsOptionGroup
                    title="Tom de linguagem"
                    options={languageToneOptions}
                    value={settings.personal.languageTone}
                    onChange={(value) => handlePersonalOptionChange("languageTone", value)}
                  />
                  <SettingsOptionGroup
                    title="Nivel de animo"
                    options={motivationStyleOptions}
                    value={settings.personal.motivationStyle}
                    onChange={(value) => handlePersonalOptionChange("motivationStyle", value)}
                  />
                  <SettingsOptionGroup
                    title="Profundidade do feedback"
                    options={feedbackDepthOptions}
                    value={settings.personal.feedbackDepth}
                    onChange={(value) => handlePersonalOptionChange("feedbackDepth", value)}
                  />
                </div>

                {saveMessage ? <small className="settings-save-message">{saveMessage}</small> : null}
              </div>
            </TabsContent>

            <TabsContent value="privacy" className="settings-tab-panel">
              <div className="settings-stack">
                <div className="settings-list">
                  {privacyItems.map((item) => (
                    <ToggleRow
                      key={item.key}
                      title={item.title}
                      description={item.description}
                      checked={settings.privacy[item.key]}
                      disabled={Boolean(item.locked)}
                      onChange={() => togglePrivacy(item.key)}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </>
      )}

      {activeTab !== "account" ? (
        <div className="settings-save-actions">
          <button
            type="button"
            className="primary-button"
            disabled={isSaving || !hasUnsavedChanges}
            onClick={handleSaveSettings}
          >
            {isSaving ? "Salvando..." : "Salvar alteracoes"}
          </button>
        </div>
      ) : null}
    </section>
  );
}
