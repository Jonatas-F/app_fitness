import { useEffect, useMemo, useState } from "react";
import costasNormalSilhouette from "../../../assets/costasnormal.svg";
import duploBicepsSilhouette from "../../../assets/duplobiceps.svg";
import duploBicepsCostasSilhouette from "../../../assets/duplobicepscostas.svg";
import frenteNormalSilhouette from "../../../assets/frentenormal.svg";
import ladoSilhouette from "../../../assets/lado.svg";
import {
  calculateCheckinCompleteness,
  checkinCadences,
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
import "./CheckinsPage.css";

const goalOptions = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "recomposicao", label: "Recomposicao corporal" },
  { value: "performance", label: "Performance esportiva" },
  { value: "saude", label: "Saude e condicionamento" },
];

const experienceOptions = [
  { value: "", label: "Selecione" },
  { value: "iniciante", label: "Iniciante" },
  { value: "intermediario", label: "Intermediario" },
  { value: "avancado", label: "Avancado" },
];

const weeklyTrainingDayOptions = ["1", "2", "3", "4", "5", "6", "7"];

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
    silhouette: duploBicepsSilhouette,
  },
  {
    id: "side-relaxed",
    title: "Lateral bracos caidos",
    instruction: "Corpo inteiro de lado, postura natural, bracos soltos.",
    pose: "side",
    silhouette: ladoSilhouette,
  },
  {
    id: "back-double-biceps",
    title: "Costas duplo biceps",
    instruction: "Corpo inteiro de costas, bracos flexionados, mesma distancia.",
    pose: "double-back",
    silhouette: duploBicepsCostasSilhouette,
  },
  {
    id: "front-relaxed",
    title: "Frente normal",
    instruction: "Corpo inteiro de frente, bracos relaxados, pes alinhados.",
    pose: "front",
    silhouette: frenteNormalSilhouette,
  },
  {
    id: "back-relaxed",
    title: "Costas normal",
    instruction: "Corpo inteiro de costas, bracos relaxados, postura neutra.",
    pose: "back",
    silhouette: costasNormalSilhouette,
  },
];

function Field({ label, required = false, hint, children }) {
  return (
    <label className="checkin-field">
      <span className="checkin-field__label">
        {label}
        {required ? <strong>Obrigatorio</strong> : <em>Opcional</em>}
      </span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

function Section({ eyebrow, title, description, children }) {
  return (
    <section className="checkin-section glass-panel">
      <div className="checkin-section__header">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {children}
    </section>
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
    <section className="checkins-calendar glass-panel">
      <div className="checkins-calendar__header">
        <div>
          <span>Calendario</span>
          <h2>Consultar ou lancar data retroativa</h2>
          <p>
            Selecione um dia para ver registros anteriores ou salvar o proximo
            check-in nessa data.
          </p>
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
    </section>
  );
}

function PhotoPoseCard({ slot, fileName, onChange }) {
  return (
    <article className="photo-pose-card">
      <div className={`photo-pose-card__silhouette photo-pose-card__silhouette--${slot.pose}`}>
        <img src={slot.silhouette} alt={`Silhueta para ${slot.title}`} />
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
  const [activeCadence, setActiveCadence] = useState("monthly");
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);
  const [calendarMonth, setCalendarMonth] = useState(() => parseDateKey(todayKey));
  const [formData, setFormData] = useState({
    ...defaultCheckinForm,
    cadence: "monthly",
  });
  const [photoUploads, setPhotoUploads] = useState({});
  const [checkins, setCheckins] = useState(() => loadCheckins());
  const [feedback, setFeedback] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [toast, setToast] = useState(null);

  const metrics = useMemo(() => getCheckinMetrics(checkins), [checkins]);
  const cadenceSummary = useMemo(
    () => getCheckinCadenceSummary(checkins),
    [checkins]
  );
  const weeklyDataset = useMemo(() => getWeeklyAiDataset(checkins), [checkins]);
  const reevaluation = useMemo(() => getMonthlyReevaluation(), [checkins]);
  const completeness = useMemo(
    () => calculateCheckinCompleteness(formData),
    [formData]
  );
  const latestCheckin = checkins.find((item) => item.status !== "missed");
  const intro = getCadenceIntro(activeCadence);

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

  async function handleSubmit(event) {
    event.preventDefault();

    const selectedPhotos = photoPoseSlots
      .map((slot) => ({
        id: slot.id,
        title: slot.title,
        fileName: photoUploads[slot.id]?.fileName || "",
        pose: slot.pose,
        selected: Boolean(photoUploads[slot.id]?.fileName),
      }))
      .filter((photo) => photo.selected);

    const payload = { ...formData, cadence: activeCadence, photos: selectedPhotos };
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

    setFormData((current) => ({
      ...current,
      photoNote: "Fotos de progresso selecionadas",
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

      <header className="checkins-hero glass-panel">
        <div>
          <span className="checkins-hero__eyebrow">Check-in inteligente</span>
          <h1>Diario, semanal e mensal trabalhando juntos.</h1>
          <p>
            Registre o que aconteceu, marque ausencias quando elas ocorrerem e
            mantenha uma linha do tempo limpa para dashboard, treino, dieta e IA.
          </p>
        </div>

        <aside className="checkins-readiness">
          <span>Qualidade do check-in atual</span>
          <strong>{completeness}%</strong>
          <div className="checkins-progress">
            <span style={{ width: `${completeness}%` }} />
          </div>
          <small>
            Ausencias ficam registradas como gap. Elas explicam o historico, mas
            nao entram como zero nas medias.
          </small>
        </aside>
      </header>

      <section className="checkins-selector glass-panel">
        <div className="checkins-selector__header">
          <span>Escolha o tipo de registro</span>
          <h2>
            Agora voce esta preenchendo:{" "}
            <strong>{checkinCadences[activeCadence].label}</strong>
          </h2>
          <p>
            Clique em Diario, Semanal ou Mensal para trocar o formulario antes
            de salvar. Cada tipo fica salvo separadamente no historico.
          </p>
        </div>

      <nav className="checkins-tabs" aria-label="Tipo de check-in">
        {Object.entries(checkinCadences).map(([cadence, config]) => (
          <button
            key={cadence}
            type="button"
            className={`checkins-tab checkins-tab--${cadence} ${
              activeCadence === cadence ? "is-active" : ""
            }`}
            onClick={() => handleCadenceChange(cadence)}
            aria-pressed={activeCadence === cadence}
          >
            <span className="checkins-tab__icon" aria-hidden="true">
              {cadenceVisuals[cadence].icon}
            </span>
            <span className="checkins-tab__content">
              <strong>{config.label}</strong>
              <span>{config.description}</span>
              <em>{cadenceVisuals[cadence].action}</em>
            </span>
            <span className="checkins-tab__state">
              {activeCadence === cadence ? "Selecionado" : "Clique para usar"}
            </span>
          </button>
        ))}
      </nav>
      </section>

      {feedback ? <p className="checkins-feedback">{feedback}</p> : null}
      {syncStatus ? <p className="checkins-sync-status">{syncStatus}</p> : null}

      <section className="checkins-metrics">
        {metrics.map((item) => (
          <article key={item.label} className="module-stat glass-panel">
            <span className="module-stat__label">{item.label}</span>
            <strong className="module-stat__value">{item.value}</strong>
            <span className="module-stat__helper">{item.trend}</span>
          </article>
        ))}
      </section>

      <section className="checkins-cadence-summary">
        {cadenceSummary.map((item) => (
          <article key={item.cadence} className="glass-panel">
            <div>
              <span>{item.label}</span>
              <strong>
                {item.completed}/{item.total}
              </strong>
            </div>
            <p>{item.missed} ausencia(s) registradas</p>
            <small>
              Energia {item.energyAverage} | Sono {item.sleepAverage}h |
              Aderencia {item.adherenceAverage}%
            </small>
          </article>
        ))}
      </section>

      <CheckinCalendar
        checkins={checkins}
        selectedDateKey={selectedDateKey}
        calendarMonth={calendarMonth}
        onSelectDate={setSelectedDateKey}
        onChangeMonth={handleCalendarMonthChange}
        onToday={handleCalendarToday}
      />

      <form className="checkins-form" onSubmit={handleSubmit}>
        <div className="checkins-form__main">
          <Section eyebrow="01" title={intro.title} description={intro.description}>
            <div className="checkins-mode-note">
              <strong>Regra da IA</strong>
              <p>
                Usar somente dados informados. Check-ins nao realizados ficam no
                historico, mas sao ignorados nas medias e tendencias.
              </p>
            </div>
          </Section>

          {showMonthly ? (
            <Section
              eyebrow="02"
              title="Objetivo e base mensal"
              description="Esses dados definem o ciclo principal do usuario."
            >
              <div className="checkins-grid checkins-grid--two">
                <Field label="Objetivo principal" required>
                  <select name="goal" value={formData.goal} onChange={handleChange}>
                    {goalOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Esporte especifico">
                  <input
                    name="sport"
                    value={formData.sport}
                    onChange={handleChange}
                    placeholder="Ex.: corrida de 10 km"
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

                <Field label="Altura" required>
                  <input
                    name="height"
                    value={formData.height}
                    onChange={handleChange}
                    inputMode="decimal"
                    placeholder="Ex.: 1.78 m"
                  />
                </Field>

                <Field label="Sexo biologico">
                  <select name="sex" value={formData.sex} onChange={handleChange}>
                    <option value="">Selecione</option>
                    <option value="feminino">Feminino</option>
                    <option value="masculino">Masculino</option>
                    <option value="outro">Outro / prefiro nao informar</option>
                  </select>
                </Field>

                <Field label="Idade">
                  <input
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    inputMode="numeric"
                    placeholder="Ex.: 32"
                  />
                </Field>
              </div>
            </Section>
          ) : null}

          {showMonthly ? (
            <Section
              eyebrow="03"
              title="Bioimpedancia e medidas"
              description="Quanto mais dados corporais, melhor a leitura de calorias, macros e volume de treino."
            >
              <div className="checkins-grid checkins-grid--three">
                <Field label="Gordura corporal">
                  <input name="bodyFat" value={formData.bodyFat} onChange={handleChange} placeholder="Ex.: 18%" />
                </Field>
                <Field label="Massa magra">
                  <input name="leanMass" value={formData.leanMass} onChange={handleChange} placeholder="Ex.: 62 kg" />
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
                <Field label="Braço direito">
                  <input name="rightArmMeasure" value={formData.rightArmMeasure} onChange={handleChange} placeholder="Ex.: 38 cm" />
                </Field>
                <Field label="Braço esquerdo">
                  <input name="leftArmMeasure" value={formData.leftArmMeasure} onChange={handleChange} placeholder="Ex.: 37.5 cm" />
                </Field>
                <Field label="Coxa direita">
                  <input name="rightThighMeasure" value={formData.rightThighMeasure} onChange={handleChange} placeholder="Ex.: 61 cm" />
                </Field>
                <Field label="Coxa esquerda">
                  <input name="leftThighMeasure" value={formData.leftThighMeasure} onChange={handleChange} placeholder="Ex.: 60 cm" />
                </Field>
                <Field label="Gordura visceral">
                  <input name="visceralFat" value={formData.visceralFat} onChange={handleChange} placeholder="Ex.: 8" />
                </Field>
                <Field label="Cintura">
                  <input name="waist" value={formData.waist} onChange={handleChange} placeholder="Ex.: 86 cm" />
                </Field>
                <Field label="Abdomen">
                  <input name="abdomen" value={formData.abdomen} onChange={handleChange} placeholder="Ex.: 92 cm" />
                </Field>
                <Field label="Quadril">
                  <input name="hip" value={formData.hip} onChange={handleChange} placeholder="Ex.: 101 cm" />
                </Field>
                <Field label="Frequencia cardiaca repouso">
                  <input name="restingHeartRate" value={formData.restingHeartRate} onChange={handleChange} placeholder="Ex.: 62 bpm" />
                </Field>
              </div>
            </Section>
          ) : null}

          {showMonthly ? (
            <Section
              eyebrow="04"
              title="Disponibilidade para treino"
              description="Esses dados orientam se a IA deve montar ABC, ABCD ou outra divisao."
            >
              <div className="checkins-grid checkins-grid--two">
                <Field label="Experiencia de treino">
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

                <Field label="Dias treinados / disponiveis">
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

                <Field label="Tempo por treino">
                  <input
                    name="availableMinutes"
                    value={formData.availableMinutes}
                    onChange={handleChange}
                    placeholder="Ex.: 60 min"
                  />
                </Field>

                <Field label="Refeicoes por dia">
                  <input
                    name="mealsPerDay"
                    value={formData.mealsPerDay}
                    onChange={handleChange}
                    placeholder="Ex.: 4"
                  />
                </Field>

                <Field label="Restricoes alimentares">
                  <input
                    name="dietaryRestrictions"
                    value={formData.dietaryRestrictions}
                    onChange={handleChange}
                    placeholder="Ex.: lactose, gluten, vegetariano"
                  />
                </Field>

                <Field label="Preferencias alimentares">
                  <input
                    name="foodPreferences"
                    value={formData.foodPreferences}
                    onChange={handleChange}
                    placeholder="Ex.: arroz, ovos, frango, frutas"
                  />
                </Field>

                <Field label="Lesoes ou limitacoes">
                  <input
                    name="injuries"
                    value={formData.injuries}
                    onChange={handleChange}
                    placeholder="Ex.: lombar, joelho, ombro"
                  />
                </Field>
              </div>
            </Section>
          ) : null}

          {showWeekly ? (
            <Section
              eyebrow="02"
              title="Resumo semanal do treino"
              description="Feche a semana sem alterar os dados fixos do ciclo mensal."
            >
              <div className="checkins-grid checkins-grid--two">
                <Field label="Dias treinados nesta semana">
                  <select
                    name="weeklyTrainingDays"
                    value={formData.weeklyTrainingDays}
                    onChange={handleChange}
                  >
                    <option value="">Selecione</option>
                    {weeklyTrainingDayOptions.map((value) => (
                      <option key={value} value={value}>
                        {value} dia{value === "1" ? "" : "s"}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Performance geral">
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
              </div>
            </Section>
          ) : null}

          <Section
            eyebrow={showDaily ? "02" : showWeekly ? "03" : "05"}
            title={showDaily ? "Sinais do dia" : "Sinais da semana"}
            description={
              showDaily
                ? "Sono, energia e aderencia de hoje alimentam a tendencia semanal."
                : "Fechamento semanal para analisar ajustes sem regenerar plano automaticamente."
            }
          >
            <div className="checkins-grid checkins-grid--three">
              {showWeekly ? (
                <Field label="Peso da semana">
                  <input
                    name="weight"
                    value={formData.weight}
                    onChange={handleChange}
                    inputMode="decimal"
                    placeholder="Ex.: 84.1 kg"
                  />
                </Field>
              ) : null}

              <Field label="Energia" required={showMonthly}>
                <select name="energy" value={formData.energy} onChange={handleChange}>
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                    <option key={value} value={value}>
                      {value}/10
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={showDaily ? "Sono de hoje" : "Sono medio"} required={showMonthly}>
                <input
                  name="sleep"
                  value={formData.sleep}
                  onChange={handleChange}
                  inputMode="decimal"
                  placeholder="Ex.: 7.5 h"
                />
              </Field>

              <Field label="Aderencia ao plano" required={showMonthly}>
                <select name="adherence" value={formData.adherence} onChange={handleChange}>
                  {["50", "60", "70", "80", "85", "90", "95", "100"].map((value) => (
                    <option key={value} value={value}>
                      {value}%
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fome">
                <select name="hunger" value={formData.hunger} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="baixa">Baixa</option>
                  <option value="moderada">Moderada</option>
                  <option value="alta">Alta</option>
                </select>
              </Field>

              <Field label="Estresse">
                <select name="stress" value={formData.stress} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="baixo">Baixo</option>
                  <option value="moderado">Moderado</option>
                  <option value="alto">Alto</option>
                </select>
              </Field>

              <Field label="Digestao">
                <select name="digestion" value={formData.digestion} onChange={handleChange}>
                  <option value="">Selecione</option>
                  <option value="boa">Boa</option>
                  <option value="regular">Regular</option>
                  <option value="ruim">Ruim</option>
                </select>
              </Field>

              <Field label="Performance no treino">
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

              <Field label="Fotos">
                <input
                  name="photoNote"
                  value={formData.photoNote}
                  onChange={handleChange}
                  placeholder="Ex.: frontal e lateral enviadas"
                />
              </Field>
            </div>

            {(showWeekly || showMonthly) ? (
              <div className="checkins-grid checkins-grid--two">
                <Field
                  label="Acao sobre protocolo"
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

            <Field label="Observacoes gerais">
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
                  <h3>Fotos de progresso</h3>
                  <p>
                    Envie ate cinco fotos de corpo inteiro seguindo as poses
                    marcadas. Use o mesmo local, luz e distancia sempre que
                    possivel.
                  </p>
                </div>
                <span>{Object.keys(photoUploads).length}/5 fotos</span>
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
          </Section>
        </div>

        <aside className="checkins-sidebar">
          <article className="checkins-actions glass-panel">
            <h2>Registrar {checkinCadences[activeCadence].label.toLowerCase()}</h2>
            <p>
              Salvar registra dados reais em {formatDateKey(selectedDateKey)}.
              Marcar como nao realizado preserva o gap sem distorcer medias.
            </p>
            <button type="submit" className="primary-button">
              Salvar check-in
            </button>
            <button type="button" className="secondary-button" onClick={handleMissedCheckin}>
              Marcar como nao realizado
            </button>
            <button type="button" className="ghost-button" onClick={handleReset}>
              Resetar historico
            </button>
          </article>

          <article className="checkins-actions glass-panel">
            <h2>Base semanal da IA</h2>
            <div className="checkins-payload">
              <span>Entradas usadas: {weeklyDataset.usableEntries}</span>
              <span>Gaps ignorados: {weeklyDataset.ignoredGaps}</span>
              <span>Energia media: {weeklyDataset.averages.energy}</span>
              <span>Sono medio: {weeklyDataset.averages.sleep}h</span>
              <span>Aderencia media: {weeklyDataset.averages.adherence}%</span>
            </div>
          </article>

          <article className="checkins-actions glass-panel">
            <h2>Reavaliacao mensal</h2>
            <span
              className={`checkins-status checkins-status--${
                reevaluation.reevaluationNeeded ? "warning" : "success"
              }`}
            >
              {reevaluation.reevaluationNeeded ? "Atencao" : "Em dia"}
            </span>
            <p>{reevaluation.training.cycle.detail}</p>
            <p>{reevaluation.diet.cycle.detail}</p>
          </article>

          <article className="checkins-actions glass-panel">
            <h2>Ultimo payload valido</h2>
            {latestCheckin ? (
              <div className="checkins-payload">
                <span>Tipo: {checkinCadences[latestCheckin.cadence || "monthly"].label}</span>
                <span>Objetivo: {latestCheckin.goal || "--"}</span>
                <span>Prontidao IA: {latestCheckin.aiContext?.readiness || "basica"}</span>
                <span>Completude: {latestCheckin.completeness ?? "--"}%</span>
              </div>
            ) : (
              <p>Nenhum check-in realizado ainda.</p>
            )}
          </article>
        </aside>
      </form>

      <section className="checkins-history glass-panel">
        <div className="checkins-history__header">
          <div>
            <span>Historico</span>
            <h2>Check-ins registrados</h2>
          </div>
          <strong>{checkins.length}</strong>
        </div>

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
      </section>
    </section>
  );
}
