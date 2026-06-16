import { useMemo, useState } from "react";
import { saveCheckin, defaultCheckinForm, loadCheckins } from "../../data/checkinStorage";
import { saveRemoteCheckin } from "../../services/checkinService";
import { loadWorkoutExecution } from "../../data/workoutExecutionStorage";
import { loadDietProtocol } from "../../data/dietStorage";
import { generateWorkoutWithAi } from "../../services/ai/workout.service";
import { generateDietWithAi } from "../../services/ai/diet.service";
import AiGeneratingScreen from "../shared/AiGeneratingScreen";
import "../onboarding/FirstCheckinModal.css";
import "./CheckinReviewModal.css";

// ── Constantes ────────────────────────────────────────────────────────────────

const WEEK_DAYS = [
  { id: "monday",    short: "SEG" }, { id: "tuesday",   short: "TER" },
  { id: "wednesday", short: "QUA" }, { id: "thursday",  short: "QUI" },
  { id: "friday",    short: "SEX" }, { id: "saturday",  short: "SAB" },
  { id: "sunday",    short: "DOM" },
];

const GOAL_OPTIONS = [
  ["hipertrofia", "Hipertrofia — ganho de massa muscular"],
  ["powerlifting", "Powerlifting / Força máxima"],
  ["emagrecimento", "Emagrecimento"],
  ["recomposicao", "Recomposição corporal"],
  ["cutting", "Cutting (definição muscular)"],
  ["condicionamento", "Condicionamento físico"],
  ["saude", "Saúde geral"],
];

const GOAL_LABELS = Object.fromEntries(GOAL_OPTIONS);

// Notas de avaliação por exercício
const EXERCISE_RATINGS = [
  { id: "like",    badge: "👍", label: "Gostei" },
  { id: "neutral", badge: "😐", label: "Indiferente" },
  { id: "dislike", badge: "👎", label: "Não curti" },
];

// ── Helpers de leitura do protocolo ativo ────────────────────────────────────

function collectActiveExercises(workoutPlan) {
  const workouts = workoutPlan?.workouts || [];
  const list = [];
  workouts.filter(w => w.enabled).forEach(w => {
    (w.exercises || []).forEach(ex => {
      if (ex?.name) {
        list.push({
          dayTitle: w.title || "Treino",
          dayFocus: w.focus || "",
          name: ex.name,
          key: `${w.id}::${ex.id || ex.name}`,
        });
      }
    });
  });
  return list;
}

function collectActiveMeals(dietPlan) {
  const meals = dietPlan?.meals || [];
  return meals
    .filter(m => m.enabled)
    .map(m => ({
      key: m.id,
      name: m.name || m.id,
      description: m.description || "",
    }));
}

function getLastCheckin() {
  const list = loadCheckins();
  return Array.isArray(list) ? list.find(c => c.status !== "missed") || {} : {};
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CheckinReviewModal({ onClose }) {
  const workoutPlan = useMemo(() => loadWorkoutExecution(), []);
  const dietPlan    = useMemo(() => loadDietProtocol(), []);
  const lastCheckin = useMemo(() => getLastCheckin(), []);

  const exercises = useMemo(() => collectActiveExercises(workoutPlan), [workoutPlan]);
  const meals     = useMemo(() => collectActiveMeals(dietPlan), [dietPlan]);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Estado do formulário de revisão
  const [form, setForm] = useState(() => ({
    // Aderência ao treino
    trainedAll: "",            // sim | parcial | nao
    daysTrainedReal: "",       // quantos dias realmente treinou (se parcial)
    // Disponibilidade para o próximo ciclo
    trainingAvailableDays: lastCheckin.trainingAvailableDays || "",
    // Objetivo
    keepGoal: "",              // manter | mudar
    goal: lastCheckin.goal || "hipertrofia",
    // Protocolo
    keepWorkoutProtocol: "",   // manter | nao
    keepDietProtocol: "",      // manter | nao
    // Bioimpedância (opcional)
    weight: "",
    bodyFat: "",
    leanMass: "",
    basalMetabolicRate: "",
    // Subjetivo
    sleepQuality: "",
    fatigueLevel: "",
    trainingPerformance: "",
    energy: "",
    // Aberto
    requestedWorkoutChanges: "",
    requestedDietChanges: "",
    notes: "",
    // Decisão final
    adjustNow: "",             // sim | nao
  }));

  // Avaliações por exercício e refeição (mapas separados para clareza)
  const [exerciseRatings, setExerciseRatings] = useState({});
  const [mealFeedback, setMealFeedback] = useState({}); // key → "manter" | "trocar"

  // Tela de geração (quando regenera)
  const [showGen, setShowGen] = useState(false);
  const [workoutStatus, setWorkoutStatus] = useState("generating");
  const [dietStatus, setDietStatus]       = useState("generating");
  const [workoutError, setWorkoutError]   = useState(null);
  const [dietError, setDietError]         = useState(null);
  const [regenWorkout, setRegenWorkout]   = useState(false);
  const [regenDiet, setRegenDiet]         = useState(false);

  function setField(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  // ── Definição dos passos (alguns são condicionais) ──────────────────────────
  const steps = useMemo(() => {
    const list = [
      { id: "training-adherence", title: "Como foi o seu treino?" },
    ];
    if (exercises.length > 0) list.push({ id: "exercise-review", title: "Avalie os exercícios" });
    if (meals.length > 0)     list.push({ id: "meal-review", title: "E a sua dieta?" });
    list.push({ id: "availability", title: "Disponibilidade da semana" });
    list.push({ id: "goal", title: "Seu objetivo mudou?" });
    list.push({ id: "body", title: "Composição corporal", optional: true });
    list.push({ id: "subjective", title: "Como você está?" });
    list.push({ id: "open", title: "Quer ajustar algo?" });
    list.push({ id: "decision", title: "Tudo pronto" });
    return list;
  }, [exercises.length, meals.length]);

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  // ── Construção do payload + persistência ────────────────────────────────────
  function buildRequestedWorkoutChanges() {
    const disliked = exercises
      .filter(ex => exerciseRatings[ex.key] === "dislike")
      .map(ex => ex.name);
    const parts = [];
    if (disliked.length) {
      parts.push(`Trocar/substituir estes exercícios que o usuário não gostou: ${disliked.join(", ")}.`);
    }
    if (form.requestedWorkoutChanges.trim()) {
      parts.push(form.requestedWorkoutChanges.trim());
    }
    return parts.join(" ");
  }

  function buildRequestedDietChanges() {
    const toChange = meals
      .filter(m => mealFeedback[m.key] === "trocar")
      .map(m => m.name);
    const parts = [];
    if (toChange.length) {
      parts.push(`Revisar/trocar estas refeições: ${toChange.join(", ")}.`);
    }
    if (form.requestedDietChanges.trim()) {
      parts.push(form.requestedDietChanges.trim());
    }
    return parts.join(" ");
  }

  async function persistCheckin() {
    const requestedWorkoutChanges = buildRequestedWorkoutChanges();
    const requestedDietChanges    = buildRequestedDietChanges();
    const wantsWorkoutChange = form.keepWorkoutProtocol === "nao" || requestedWorkoutChanges.length > 0;
    const wantsDietChange    = form.keepDietProtocol === "nao" || requestedDietChanges.length > 0;
    const protocolAction = (wantsWorkoutChange || wantsDietChange) ? "request-adjustment" : "none";

    const payload = {
      ...defaultCheckinForm,
      cadence: "weekly",
      goal: form.keepGoal === "mudar" ? form.goal : (lastCheckin.goal || form.goal),
      trainingAvailableDays: form.trainingAvailableDays,
      weeklyTrainingDays: form.trainingAvailableDays
        ? String(form.trainingAvailableDays.split(",").filter(Boolean).length)
        : (lastCheckin.weeklyTrainingDays || ""),
      weeklyWorkoutsCompleted: form.daysTrainedReal || "",
      weight: form.weight,
      bodyFat: form.bodyFat,
      leanMass: form.leanMass,
      basalMetabolicRate: form.basalMetabolicRate,
      sleepQuality: form.sleepQuality,
      fatigueLevel: form.fatigueLevel,
      trainingPerformance: form.trainingPerformance,
      energy: form.energy || "8",
      notes: form.notes,
      protocolAction,
      // Campos de revisão consumidos pela IA na regeneração
      keepWorkoutProtocol: wantsWorkoutChange ? "nao" : (form.keepWorkoutProtocol || ""),
      keepDietProtocol: wantsDietChange ? "nao" : (form.keepDietProtocol || ""),
      requestedWorkoutChanges,
      requestedDietChanges,
      // Avaliações detalhadas (registro para histórico + contexto da IA)
      exerciseRatings: exercises.map(ex => ({
        name: ex.name,
        day: ex.dayTitle,
        rating: exerciseRatings[ex.key] || "neutral",
      })),
      mealFeedback: meals.map(m => ({
        name: m.name,
        action: mealFeedback[m.key] || "manter",
      })),
    };

    const updated = saveCheckin(payload, { createdAt: new Date().toISOString() });
    await saveRemoteCheckin(updated[0]).catch(() => {});
    return { requestedWorkoutChanges, requestedDietChanges, wantsWorkoutChange, wantsDietChange, payload };
  }

  async function handleFinish() {
    setSaving(true);
    try {
      const { requestedWorkoutChanges, requestedDietChanges, wantsWorkoutChange, wantsDietChange, payload } =
        await persistCheckin();

      // Se o usuário não quer ajustar agora, encerra
      if (form.adjustNow !== "sim") {
        setSaving(false);
        onClose?.({ regenerated: false });
        return;
      }

      const doWorkout = wantsWorkoutChange;
      const doDiet    = wantsDietChange;
      setRegenWorkout(doWorkout);
      setRegenDiet(doDiet);

      // Nada para regenerar → encerra
      if (!doWorkout && !doDiet) {
        setSaving(false);
        onClose?.({ regenerated: false });
        return;
      }

      setWorkoutStatus(doWorkout ? "generating" : "ok");
      setDietStatus(doDiet ? "generating" : "ok");
      setWorkoutError(null);
      setDietError(null);
      setShowGen(true);
      setSaving(false);

      function withTimeout(promise, ms = 90_000) {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error("Tempo limite excedido.")), ms)),
        ]);
      }

      const tasks = [];
      if (doWorkout) {
        tasks.push(
          withTimeout(generateWorkoutWithAi({
            persist: true,
            goal: payload.goal,
            trainingAvailableDays: payload.trainingAvailableDays,
            trainingExperience: lastCheckin.trainingExperience || "",
            trainingAge: lastCheckin.trainingAge || "",
            availableMinutes: lastCheckin.availableMinutes || "",
            keepWorkoutProtocol: "nao",
            requestedWorkoutChanges,
            lastProtocolFeeling: form.trainingPerformance || "",
            generalDisposition: form.energy && Number(form.energy) <= 4 ? "baixa" : "",
          }))
            .then(() => setWorkoutStatus("ok"))
            .catch(err => { setWorkoutStatus("error"); setWorkoutError(err?.message || "Erro desconhecido."); })
        );
      }
      if (doDiet) {
        tasks.push(
          withTimeout(generateDietWithAi({
            persist: true,
            goal: payload.goal,
            keepDietProtocol: "nao",
            requestedDietChanges,
          }))
            .then(() => setDietStatus("ok"))
            .catch(err => { setDietStatus("error"); setDietError(err?.message || "Erro desconhecido."); })
        );
      }

      await Promise.allSettled(tasks);
    } catch {
      setSaving(false);
      onClose?.({ regenerated: false, error: true });
    }
  }

  async function handleRetryWorkout() {
    setWorkoutStatus("generating");
    setWorkoutError(null);
    try {
      await generateWorkoutWithAi({
        persist: true,
        goal: form.keepGoal === "mudar" ? form.goal : (lastCheckin.goal || form.goal),
        trainingAvailableDays: form.trainingAvailableDays,
        trainingExperience: lastCheckin.trainingExperience || "",
        trainingAge: lastCheckin.trainingAge || "",
        availableMinutes: lastCheckin.availableMinutes || "",
        keepWorkoutProtocol: "nao",
        requestedWorkoutChanges: buildRequestedWorkoutChanges(),
      });
      setWorkoutStatus("ok");
    } catch (err) {
      setWorkoutStatus("error");
      setWorkoutError(err?.message || "Erro desconhecido.");
    }
  }

  async function handleRetryDiet() {
    setDietStatus("generating");
    setDietError(null);
    try {
      await generateDietWithAi({
        persist: true,
        goal: form.keepGoal === "mudar" ? form.goal : (lastCheckin.goal || form.goal),
        keepDietProtocol: "nao",
        requestedDietChanges: buildRequestedDietChanges(),
      });
      setDietStatus("ok");
    } catch (err) {
      setDietStatus("error");
      setDietError(err?.message || "Erro desconhecido.");
    }
  }

  // ── Render: tela de geração ─────────────────────────────────────────────────
  if (showGen) {
    return (
      <AiGeneratingScreen
        workoutStatus={regenWorkout ? workoutStatus : "ok"}
        dietStatus={regenDiet ? dietStatus : "ok"}
        workoutError={workoutError}
        dietError={dietError}
        onRetryWorkout={handleRetryWorkout}
        onRetryDiet={handleRetryDiet}
        onComplete={() => onClose?.({ regenerated: true })}
        completeLabel="Ver protocolo atualizado →"
      />
    );
  }

  // ── Renderers de campo ──────────────────────────────────────────────────────
  function SegmentField({ value, onChange, options }) {
    return (
      <div className="ck-segment">
        {options.map(opt => (
          <button
            key={opt.id}
            type="button"
            className={`ck-segment__btn${value === opt.id ? " is-active" : ""}`}
            onClick={() => onChange(opt.id)}
          >
            {opt.badge && <span className="ck-segment__badge">{opt.badge}</span>}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    );
  }

  function renderStep() {
    switch (currentStep.id) {
      case "training-adherence":
        return (
          <>
            <div className="ob-field">
              <label className="ob-field__label">Você conseguiu treinar todos os dias planejados?</label>
              <SegmentField
                value={form.trainedAll}
                onChange={v => setField("trainedAll", v)}
                options={[
                  { id: "sim",     badge: "✅", label: "Sim, todos" },
                  { id: "parcial", badge: "➗", label: "Em parte" },
                  { id: "nao",     badge: "❌", label: "Quase não treinei" },
                ]}
              />
            </div>
            {form.trainedAll === "parcial" && (
              <div className="ob-field">
                <label className="ob-field__label">Quantos dias por semana você realmente conseguiu treinar?</label>
                <p className="ob-field__hint">Isso ajuda a IA a montar um protocolo realista para a sua rotina.</p>
                <div className="ob-daypicker ck-daycount">
                  {[1, 2, 3, 4, 5, 6].map(n => (
                    <button
                      key={n}
                      type="button"
                      className={`ob-daypicker__btn${form.daysTrainedReal === String(n) ? " is-active" : ""}`}
                      onClick={() => setField("daysTrainedReal", String(n))}
                    >
                      {n}x
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        );

      case "exercise-review":
        return (
          <div className="ob-field">
            <label className="ob-field__label">O que achou dos exercícios do seu treino?</label>
            <p className="ob-field__hint">
              Marque os que você não curtiu — a IA troca esses por alternativas equivalentes no próximo protocolo.
            </p>
            <div className="ck-exercise-list">
              {exercises.map(ex => (
                <div key={ex.key} className="ck-exercise">
                  <div className="ck-exercise__info">
                    <span className="ck-exercise__name">{ex.name}</span>
                    <span className="ck-exercise__day">{ex.dayTitle}</span>
                  </div>
                  <div className="ck-rating">
                    {EXERCISE_RATINGS.map(r => (
                      <button
                        key={r.id}
                        type="button"
                        title={r.label}
                        className={`ck-rating__btn ck-rating__btn--${r.id}${exerciseRatings[ex.key] === r.id ? " is-active" : ""}`}
                        onClick={() => setExerciseRatings(prev => ({ ...prev, [ex.key]: r.id }))}
                      >
                        {r.badge}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "meal-review":
        return (
          <div className="ob-field">
            <label className="ob-field__label">Tem alguma refeição que você gostaria de mudar?</label>
            <p className="ob-field__hint">
              Marque "Trocar" nas refeições que não funcionaram — a IA revisa essas mantendo seus macros.
            </p>
            <div className="ck-meal-list">
              {meals.map(m => (
                <div key={m.key} className="ck-meal">
                  <div className="ck-meal__info">
                    <span className="ck-meal__name">{m.name}</span>
                    {m.description && <span className="ck-meal__desc">{m.description}</span>}
                  </div>
                  <div className="ck-segment ck-segment--compact">
                    <button
                      type="button"
                      className={`ck-segment__btn${(mealFeedback[m.key] || "manter") === "manter" ? " is-active" : ""}`}
                      onClick={() => setMealFeedback(prev => ({ ...prev, [m.key]: "manter" }))}
                    >Manter</button>
                    <button
                      type="button"
                      className={`ck-segment__btn ck-segment__btn--warn${mealFeedback[m.key] === "trocar" ? " is-active" : ""}`}
                      onClick={() => setMealFeedback(prev => ({ ...prev, [m.key]: "trocar" }))}
                    >Trocar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case "availability":
        return (
          <div className="ob-field">
            <label className="ob-field__label">Quais dias você pode treinar neste próximo ciclo?</label>
            <p className="ob-field__hint">Marque os dias com disponibilidade real. A IA distribui os treinos com folgas bem posicionadas.</p>
            <div className="ob-daypicker">
              {WEEK_DAYS.map(d => {
                const selected = (form.trainingAvailableDays || "").split(",").filter(Boolean);
                const isActive = selected.includes(d.id);
                return (
                  <button
                    key={d.id}
                    type="button"
                    className={`ob-daypicker__btn${isActive ? " is-active" : ""}`}
                    onClick={() => {
                      const next = isActive
                        ? selected.filter(x => x !== d.id)
                        : [...selected, d.id].sort((a, b) =>
                            WEEK_DAYS.findIndex(w => w.id === a) - WEEK_DAYS.findIndex(w => w.id === b));
                      setField("trainingAvailableDays", next.join(","));
                    }}
                  >
                    {d.short}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "goal":
        return (
          <>
            <div className="ob-field">
              <label className="ob-field__label">
                Seu objetivo continua o mesmo?
                {lastCheckin.goal && (
                  <span className="ck-current-goal"> Atual: {GOAL_LABELS[lastCheckin.goal] || lastCheckin.goal}</span>
                )}
              </label>
              <SegmentField
                value={form.keepGoal}
                onChange={v => setField("keepGoal", v)}
                options={[
                  { id: "manter", badge: "🎯", label: "Continua o mesmo" },
                  { id: "mudar",  badge: "🔄", label: "Quero mudar" },
                ]}
              />
            </div>
            {form.keepGoal === "mudar" && (
              <div className="ob-field">
                <label className="ob-field__label">Novo objetivo</label>
                <select className="ob-field__control" value={form.goal} onChange={e => setField("goal", e.target.value)}>
                  {GOAL_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            )}
          </>
        );

      case "body":
        return (
          <>
            <div className="ob-step-note">
              <span className="ob-step-note__icon">💡</span>
              <p className="ob-step-note__text">
                Tem dados novos de bioimpedância ou balança? Preencha o que tiver — a IA recalibra calorias e volume.
                Pode pular se não tiver agora.
              </p>
            </div>
            <div className="ck-body-grid">
              {[
                ["weight", "Peso atual (kg)", "Ex: 83.5"],
                ["bodyFat", "Gordura corporal (%)", "Ex: 18"],
                ["leanMass", "Massa magra (kg)", "Ex: 68"],
                ["basalMetabolicRate", "Taxa metabólica basal (kcal)", "Ex: 1840"],
              ].map(([key, label, ph]) => (
                <div key={key} className="ob-field">
                  <label className="ob-field__label">{label}</label>
                  <input
                    className="ob-field__control"
                    type="text"
                    placeholder={ph}
                    value={form[key]}
                    onChange={e => setField(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        );

      case "subjective":
        return (
          <div className="ck-body-grid">
            <div className="ob-field">
              <label className="ob-field__label">Qualidade do sono</label>
              <select className="ob-field__control" value={form.sleepQuality} onChange={e => setField("sleepQuality", e.target.value)}>
                <option value="">Selecione</option>
                <option value="1">Muito ruim</option>
                <option value="2">Ruim</option>
                <option value="3">Regular</option>
                <option value="4">Boa</option>
                <option value="5">Ótima</option>
              </select>
            </div>
            <div className="ob-field">
              <label className="ob-field__label">Nível de fadiga</label>
              <select className="ob-field__control" value={form.fatigueLevel} onChange={e => setField("fatigueLevel", e.target.value)}>
                <option value="">Selecione</option>
                <option value="1">Muito baixa</option>
                <option value="2">Baixa</option>
                <option value="3">Moderada</option>
                <option value="4">Alta</option>
                <option value="5">Muito alta</option>
              </select>
            </div>
            <div className="ob-field">
              <label className="ob-field__label">Performance no treino</label>
              <select className="ob-field__control" value={form.trainingPerformance} onChange={e => setField("trainingPerformance", e.target.value)}>
                <option value="">Selecione</option>
                <option value="abaixo-media">Abaixo da média</option>
                <option value="media">Na média</option>
                <option value="acima-media">Acima da média</option>
                <option value="excelente">Excelente</option>
              </select>
            </div>
            <div className="ob-field">
              <label className="ob-field__label">Energia geral (1–10)</label>
              <select className="ob-field__control" value={form.energy} onChange={e => setField("energy", e.target.value)}>
                <option value="">Selecione</option>
                {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
              </select>
            </div>
          </div>
        );

      case "open":
        return (
          <>
            <div className="ob-field">
              <label className="ob-field__label">
                Quer pedir algum ajuste no treino?
                <span className="ob-field__optional">Opcional</span>
              </label>
              <textarea
                className="ob-field__control"
                rows={2}
                placeholder="Ex: quero focar mais em pernas, menos volume de braço, incluir mais alongamento..."
                value={form.requestedWorkoutChanges}
                onChange={e => setField("requestedWorkoutChanges", e.target.value)}
              />
            </div>
            <div className="ob-field">
              <label className="ob-field__label">
                E na dieta?
                <span className="ob-field__optional">Opcional</span>
              </label>
              <textarea
                className="ob-field__control"
                rows={2}
                placeholder="Ex: trocar frango por peixe, refeições mais práticas, mais variedade no café..."
                value={form.requestedDietChanges}
                onChange={e => setField("requestedDietChanges", e.target.value)}
              />
            </div>
            <div className="ob-field">
              <label className="ob-field__label">
                Como foi a sua semana no geral?
                <span className="ob-field__optional">Opcional</span>
              </label>
              <textarea
                className="ob-field__control"
                rows={2}
                placeholder="Conte qualquer coisa relevante — rotina, dificuldades, vitórias..."
                value={form.notes}
                onChange={e => setField("notes", e.target.value)}
              />
            </div>
          </>
        );

      case "decision": {
        const disliked = exercises.filter(ex => exerciseRatings[ex.key] === "dislike").length;
        const mealsToChange = meals.filter(m => mealFeedback[m.key] === "trocar").length;
        const hasWorkoutSignal = disliked > 0 || form.requestedWorkoutChanges.trim() || form.keepWorkoutProtocol === "nao";
        const hasDietSignal = mealsToChange > 0 || form.requestedDietChanges.trim() || form.keepDietProtocol === "nao";
        const hasAnySignal = hasWorkoutSignal || hasDietSignal;
        return (
          <div className="ck-summary">
            <div className="ck-summary__list">
              <div className="ck-summary__item">
                <span>🏋️</span>
                <span>
                  {disliked > 0
                    ? `${disliked} exercício(s) marcado(s) para trocar`
                    : "Nenhum exercício marcado para trocar"}
                </span>
              </div>
              {meals.length > 0 && (
                <div className="ck-summary__item">
                  <span>🥗</span>
                  <span>
                    {mealsToChange > 0
                      ? `${mealsToChange} refeição(ões) para revisar`
                      : "Dieta mantida como está"}
                  </span>
                </div>
              )}
              <div className="ck-summary__item">
                <span>🎯</span>
                <span>
                  Objetivo: {form.keepGoal === "mudar" ? (GOAL_LABELS[form.goal] || form.goal) : (GOAL_LABELS[lastCheckin.goal] || lastCheckin.goal || "—")}
                </span>
              </div>
            </div>

            {hasAnySignal ? (
              <div className="ob-field">
                <label className="ob-field__label">Quer que eu ajuste seu protocolo agora?</label>
                <p className="ob-field__hint">
                  A IA vai gerar {hasWorkoutSignal && hasDietSignal ? "um novo treino e uma nova dieta" : hasWorkoutSignal ? "um novo treino" : "uma nova dieta"} com base no seu feedback. Isso consome tokens.
                </p>
                <SegmentField
                  value={form.adjustNow}
                  onChange={v => setField("adjustNow", v)}
                  options={[
                    { id: "sim", badge: "✨", label: "Sim, ajustar agora" },
                    { id: "nao", badge: "💾", label: "Só salvar o check-in" },
                  ]}
                />
              </div>
            ) : (
              <div className="ck-summary__note">
                <span className="ob-profile-summary__ai-icon">✅</span>
                <p>
                  Tudo certo! Seu check-in será registrado e o Personal Virtual usa esses dados
                  para acompanhar sua evolução e calibrar o próximo protocolo.
                </p>
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  }

  // Validação mínima por passo
  const canAdvance = (() => {
    if (currentStep.id === "training-adherence") return Boolean(form.trainedAll);
    if (currentStep.id === "decision") {
      const disliked = exercises.filter(ex => exerciseRatings[ex.key] === "dislike").length;
      const mealsToChange = meals.filter(m => mealFeedback[m.key] === "trocar").length;
      const hasAnySignal = disliked > 0 || mealsToChange > 0 ||
        form.requestedWorkoutChanges.trim() || form.requestedDietChanges.trim() ||
        form.keepWorkoutProtocol === "nao" || form.keepDietProtocol === "nao";
      return !hasAnySignal || Boolean(form.adjustNow);
    }
    return true;
  })();

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true" aria-labelledby="ck-modal-title">
      <div className="ob-modal glass-panel">
        <div className="ob-modal__header">
          <div className="ob-modal__eyebrow">Check-in · Passo {step + 1} de {steps.length}</div>
          <h2 id="ck-modal-title" className="ob-modal__title">{currentStep.title}</h2>
          <div className="ob-progress">
            <div className="ob-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="ob-modal__body">
          {renderStep()}
        </div>

        <div className="ob-modal__footer">
          {step > 0 ? (
            <button type="button" className="ghost-button" onClick={() => setStep(s => s - 1)}>← Voltar</button>
          ) : (
            <button type="button" className="ghost-button" onClick={() => onClose?.({ regenerated: false })}>Cancelar</button>
          )}
          {currentStep.optional && !isLast && (
            <button type="button" className="ghost-button ob-modal__skip" onClick={() => setStep(s => s + 1)}>Pular etapa</button>
          )}
          {isLast ? (
            <button type="button" className="primary-button" onClick={handleFinish} disabled={saving || !canAdvance}>
              {saving ? "Salvando..." : form.adjustNow === "sim" ? "Salvar e ajustar →" : "Concluir check-in →"}
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => setStep(s => s + 1)} disabled={!canAdvance}>
              Próximo →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
