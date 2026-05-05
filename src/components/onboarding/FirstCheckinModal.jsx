import { useState, useRef, useEffect } from "react";
import { saveCheckin, defaultCheckinForm } from "../../data/checkinStorage";
import { saveRemoteCheckin } from "../../services/checkinService";
import { generateWorkoutWithAi } from "../../services/ai/workout.service";
import { generateDietWithAi } from "../../services/ai/diet.service";
import { personalAvatarCatalog } from "../../data/platformImageCatalog";
import "./FirstCheckinModal.css";

// ── Etapas por plano ────────────────────────────────────────────────────────

const PERSONAL_STEP = {
  id: "personal",
  title: "Seu Personal Virtual",
  subtitle: "Escolha o nome e o visual do seu Personal — ele aparece no chat e em cada protocolo.",
  fields: ["personalName", "personalAvatar"],
};

const NUTRITION_STEP = {
  id: "nutrition",
  title: "Alimentação",
  subtitle: "A IA usa essas informações para montar um plano alimentar que funciona pra você.",
  fields: ["mealsPerDay", "dietaryRestrictions", "foodPreferences"],
  optional: true,
};

const STEPS = {
  basico: [
    { id: "basics",   title: "Seus dados básicos",    subtitle: "Informações essenciais para o Personal Virtual montar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "training", title: "Sua disponibilidade",   subtitle: "Marque os dias que você pode ir à academia.", fields: ["trainingAvailableDays"] },
    NUTRITION_STEP,
    { id: "goals",    title: "Suas expectativas",      subtitle: "Conte o que espera alcançar — quanto mais detalhes, melhor.", fields: ["notes"] },
    PERSONAL_STEP,
  ],
  intermediario: [
    { id: "basics",   title: "Seus dados básicos",     subtitle: "Informações essenciais para personalizar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "profile",  title: "Perfil de treino",        subtitle: "Experiência, tempo disponível e limitações físicas.", fields: ["trainingExperience","trainingAge","availableMinutes","injuries"] },
    { id: "state",    title: "Seu estado atual",         subtitle: "Como você está hoje e quais dias pode treinar.", fields: ["energy","sleepQuality","trainingAvailableDays"] },
    NUTRITION_STEP,
    { id: "goals",    title: "Suas expectativas",        subtitle: "Conte o que espera alcançar com o Shape Certo.", fields: ["notes"] },
    PERSONAL_STEP,
  ],
  pro: [
    { id: "basics",    title: "Seus dados básicos",      subtitle: "Informações essenciais para personalizar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "profile",   title: "Perfil de treino",         subtitle: "Experiência, tempo disponível e limitações físicas.", fields: ["trainingExperience","trainingAge","availableMinutes","injuries"] },
    { id: "state",     title: "Seu estado atual",          subtitle: "Sinais de recuperação e disponibilidade semanal.", fields: ["energy","sleepQuality","fatigueLevel","trainingPerformance","trainingAvailableDays"] },
    { id: "nutrition", title: "Alimentação",               subtitle: "A IA usa essas informações para criar um plano alimentar preciso.", fields: ["mealsPerDay","dietaryRestrictions","foodPreferences"], optional: true },
    { id: "body",      title: "Dados corporais",           subtitle: "Bioimpedância e composição corporal (opcional).", fields: ["bodyFat","leanMass"], optional: true },
    PERSONAL_STEP,
  ],
};

const WEEK_DAYS = [
  { id: "monday",    short: "SEG" }, { id: "tuesday",   short: "TER" },
  { id: "wednesday", short: "QUA" }, { id: "thursday",  short: "QUI" },
  { id: "friday",    short: "SEX" }, { id: "saturday",  short: "SAB" },
  { id: "sunday",    short: "DOM" },
];

const FIELD_DEFS = {
  goal:               { label: "Objetivo principal", type: "select", required: true,
                        options: [["hipertrofia","Hipertrofia"],["emagrecimento","Emagrecimento"],["recomposicao","Recomposição corporal"],["cutting","Cutting"],["condicionamento","Condicionamento"],["saude","Saúde geral"]] },
  sex:                { label: "Sexo biológico",     type: "select", required: true,
                        options: [["","Selecione"],["masculino","Masculino"],["feminino","Feminino"]] },
  age:                { label: "Idade",              type: "text",   required: true, placeholder: "Ex: 28" },
  height:             { label: "Altura (cm)",        type: "text",   required: true, placeholder: "Ex: 178" },
  weight:             { label: "Peso atual (kg)",    type: "text",   required: true, placeholder: "Ex: 85.4" },
  trainingAvailableDays: { label: "Quais dias pode treinar", type: "daypicker", required: false,
                            hint: "Marque os dias com disponibilidade real. A IA distribui os treinos com folgas bem posicionadas." },
  trainingExperience: { label: "Nível de experiência", type: "select", required: false,
                        options: [["","Selecione"],["iniciante","Iniciante"],["intermediario","Intermediário"],["avancado","Avançado"]] },
  trainingAge:        { label: "Tempo de treinamento", type: "select", required: false,
                        options: [["","Selecione"],["nunca","Nunca treinou"],["menos-6-meses","Menos de 6 meses"],["6-12-meses","6 a 12 meses"],["1-2-anos","1 a 2 anos"],["2-5-anos","2 a 5 anos"],["mais-5-anos","Mais de 5 anos"]] },
  availableMinutes:   { label: "Tempo por sessão", type: "select", required: false,
                        options: [["","Selecione"],["30","30 min"],["45","45 min"],["60","60 min"],["75","75 min"],["90","90 min"],["120","120 min ou mais"]] },
  injuries:           { label: "Lesões ou limitações", type: "textarea", required: false,
                        placeholder: "Ex: dor no joelho, hérnia L4-L5", hint: "Deixe em branco se não tiver" },
  energy:             { label: "Energia hoje (1–10)", type: "select", required: false,
                        options: [["","Selecione"],...Array.from({length:10},(_,i)=>[String(i+1),String(i+1)])] },
  sleepQuality:       { label: "Qualidade do sono", type: "select", required: false,
                        options: [["","Selecione"],["1","Muito ruim"],["2","Ruim"],["3","Regular"],["4","Boa"],["5","Ótima"]] },
  fatigueLevel:       { label: "Nível de fadiga (1–10)", type: "select", required: false,
                        options: [["","Selecione"],...Array.from({length:10},(_,i)=>[String(i+1),String(i+1)])] },
  trainingPerformance:{ label: "Performance no treino", type: "select", required: false,
                        options: [["","Selecione"],["abaixo-media","Abaixo da média"],["media","Na média"],["acima-media","Acima da média"],["excelente","Excelente"]] },
  mealsPerDay:        { label: "Quantas refeições por dia?", type: "select", required: false,
                        options: [["","Selecione"],["3","3 refeições"],["4","4 refeições"],["5","5 refeições"],["6","6 refeições"],["7","7 ou mais"]],
                        hint: "A IA monta o plano com o número de refeições que você consegue fazer" },
  dietaryRestrictions:{ label: "Restrições alimentares", type: "textarea", required: false,
                        placeholder: "Ex: intolerância à lactose, sem glúten, vegano, alergia a amendoim", hint: "Deixe em branco se não tiver" },
  foodPreferences:    { label: "Preferências alimentares", type: "textarea", required: false,
                        placeholder: "Ex: gosto de frango e ovos, não gosto de peixe, como muito arroz e feijão", hint: "Opcional — mas ajuda muito a IA a montar algo que você vai comer" },
  bodyFat:            { label: "Gordura corporal (%)", type: "text", required: false,
                        placeholder: "Ex: 18.5", hint: "Da bioimpedância — opcional" },
  leanMass:           { label: "Massa magra (kg)", type: "text", required: false,
                        placeholder: "Ex: 68.2", hint: "Da bioimpedância — opcional" },
  notes:              { label: "Expectativas e contexto", type: "textarea", required: false,
                        placeholder: "Conte o que espera alcançar, sua rotina atual, qualquer informação relevante...",
                        hint: "Quanto mais você descrever, mais preciso o protocolo inicial" },
  personalName:       { label: "Nome do Personal Virtual", type: "text", required: false,
                        placeholder: "Ex: Alex, Marina, Coach, Lucas...",
                        hint: "Deixe em branco para usar 'Personal Virtual'" },
  personalAvatar:     { label: "Avatar", type: "avatarpicker", required: false },
};

function buildInitialForm() {
  const defaults = { cadence: "weekly" };
  for (const [key, def] of Object.entries(FIELD_DEFS)) {
    if (def.type === "select" && def.options?.[0]?.[0] !== "") {
      defaults[key] = def.options[0][0];
    }
  }
  return defaults;
}

// ── Tela de Geração ─────────────────────────────────────────────────────────

const WORKOUT_STEPS = [
  { text: "Lendo seu perfil, histórico e dias disponíveis", delay: 0 },
  { text: "Definindo o split ideal para sua frequência",    delay: 5500 },
  { text: "Selecionando exercícios por grupo muscular",     delay: 13000 },
  { text: "Calculando volume, séries e intervalos",         delay: 24000 },
  { text: "Personalizando dicas e revisando protocolo",     delay: 42000 },
];

const DIET_STEPS = [
  { text: "Calculando sua necessidade calórica (TDEE)",     delay: 1000 },
  { text: "Definindo macronutrientes por objetivo",         delay: 8500 },
  { text: "Montando refeições com suas preferências",       delay: 18000 },
  { text: "Criando variações para todos os 7 dias",         delay: 31000 },
  { text: "Ajustando substituições e finalizando",          delay: 49000 },
];

function useSimulatedSteps(status, steps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const timersRef = useRef([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (status !== "generating") {
      if (status === "ok") setActiveIdx(steps.length - 1);
      return;
    }

    setActiveIdx(0);
    steps.slice(1).forEach((step, i) => {
      const t = setTimeout(() => setActiveIdx(prev => Math.max(prev, i + 1)), step.delay);
      timersRef.current.push(t);
    });

    return () => timersRef.current.forEach(clearTimeout);
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  return status === "ok" ? steps.length - 1 : activeIdx;
}

function GenItemExpanded({ emoji, label, steps, status, errorMsg, onRetry }) {
  const activeIdx = useSimulatedSteps(status, steps);

  const subText =
    status === "generating"
      ? (steps[activeIdx]?.text ?? steps[steps.length - 1].text)
      : status === "ok"
      ? "Concluído com sucesso"
      : "Falhou — tente novamente";

  return (
    <div className={`ob-gen-card ob-gen-card--${status}`}>
      {/* Cabeçalho do card */}
      <div className="ob-gen-card__header">
        <span className="ob-gen-card__emoji">{emoji}</span>
        <div className="ob-gen-card__info">
          <span className="ob-gen-card__title">{label}</span>
          <span className={`ob-gen-card__sub ob-gen-card__sub--${status}`}>{subText}</span>
        </div>
        <div className="ob-gen-card__badge">
          {status === "generating" && <span className="ob-gen-spinner" />}
          {status === "ok"         && <span className="ob-gen-check">✓</span>}
          {status === "error"      && <span className="ob-gen-fail">✗</span>}
        </div>
      </div>

      {/* Etapas detalhadas */}
      <ol className="ob-gen-steps">
        {steps.map((step, i) => {
          const s =
            status === "ok"
              ? "done"
              : i < activeIdx
              ? "done"
              : i === activeIdx && status === "generating"
              ? "active"
              : "wait";
          return (
            <li key={i} className={`ob-gen-step ob-gen-step--${s}`}>
              <span className="ob-gen-step__dot" aria-hidden="true">
                {s === "done" ? "✓" : s === "active" ? "" : "·"}
              </span>
              {s === "active" && <span className="ob-gen-step__spin" />}
              <span className="ob-gen-step__text">{step.text}</span>
            </li>
          );
        })}
      </ol>

      {/* Erro + retry */}
      {status === "error" && (
        <div className="ob-gen-card__error">
          {errorMsg && <p className="ob-gen-card__errmsg">{errorMsg}</p>}
          {onRetry && (
            <button type="button" className="ob-gen-retry" onClick={onRetry}>
              ↺ Tentar novamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function GeneratingScreen({ workoutStatus, dietStatus, workoutError, dietError, onRetryWorkout, onRetryDiet, onEnter }) {
  const allDone  = workoutStatus !== "generating" && dietStatus !== "generating";
  const hasError = workoutStatus === "error" || dietStatus === "error";

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true">
      <div className="ob-modal ob-modal--generating glass-panel">

        {/* Cabeçalho */}
        <div className="ob-gen-header">
          {!allDone ? (
            <>
              <div className="ob-gen-pulse" />
              <h2 className="ob-gen-title">Criando seus protocolos...</h2>
              <p className="ob-gen-subtitle">
                A IA está analisando todos os seus dados. Acompanhe cada etapa abaixo.
              </p>
            </>
          ) : hasError ? (
            <>
              <span className="ob-gen-done-icon">⚠️</span>
              <h2 className="ob-gen-title">Atenção — um item falhou</h2>
              <p className="ob-gen-subtitle">Clique em ↺ Tentar para regenerar o item que falhou.</p>
            </>
          ) : (
            <>
              <span className="ob-gen-done-icon">🎉</span>
              <h2 className="ob-gen-title">Tudo pronto!</h2>
              <p className="ob-gen-subtitle">Seus protocolos personalizados estão prontos. Bem-vindo ao Shape Certo!</p>
            </>
          )}
        </div>

        {/* Barra de progresso indeterminada enquanto gera */}
        {!allDone && (
          <div className="ob-gen-bar-wrap">
            <div className="ob-gen-bar-track">
              <div className="ob-gen-bar-fill" />
            </div>
            <p className="ob-gen-note">Isso pode levar até 90 segundos. Não feche o app.</p>
          </div>
        )}

        {/* Cards expandidos */}
        <div className="ob-gen-list">
          <GenItemExpanded
            emoji="🏋️" label="Protocolo de treino"
            steps={WORKOUT_STEPS}
            status={workoutStatus}
            errorMsg={workoutError}
            onRetry={workoutStatus === "error" ? onRetryWorkout : null}
          />
          <GenItemExpanded
            emoji="🥗" label="Plano alimentar"
            steps={DIET_STEPS}
            status={dietStatus}
            errorMsg={dietError}
            onRetry={dietStatus === "error" ? onRetryDiet : null}
          />
        </div>

        {/* Botão de entrada */}
        {allDone && (
          <div className="ob-modal__footer" style={{ justifyContent: "center", flexDirection: "column", gap: "8px" }}>
            <button type="button" className="primary-button ob-gen-enter-btn" onClick={onEnter}>
              {hasError ? "Entrar mesmo assim →" : "Entrar no Shape Certo →"}
            </button>
            {hasError && (
              <p className="ob-gen-note" style={{ textAlign: "center" }}>
                Você pode gerar os protocolos nas páginas de Treinos e Dietas.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal principal ──────────────────────────────────────────────────────────

export default function FirstCheckinModal({ planId, onComplete }) {
  const steps = STEPS[planId] ?? STEPS.intermediario;
  const [step, setStep]   = useState(0);
  const [form, setForm]   = useState(buildInitialForm);
  const [saving, setSaving] = useState(false);

  // Estados da tela de geração
  const [showGen, setShowGen]             = useState(false);
  const [workoutStatus, setWorkoutStatus] = useState("generating"); // generating | ok | error
  const [dietStatus, setDietStatus]       = useState("generating");
  const [workoutError, setWorkoutError]   = useState(null);
  const [dietError, setDietError]         = useState(null);

  // form snapshot para uso nos retries
  const [savedGoal, setSavedGoal]                           = useState("");
  const [savedTrainingDays, setSavedTrainingDays]           = useState("");
  const [savedTrainingExp, setSavedTrainingExp]             = useState("");
  const [savedTrainingAge, setSavedTrainingAge]             = useState("");
  const [savedAvailableMinutes, setSavedAvailableMinutes]   = useState("");

  const currentStep = steps[step];
  const isLast  = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  const required  = currentStep.fields.filter(f => FIELD_DEFS[f]?.required);
  const canAdvance = required.every(f => {
    const v = form[f];
    return v !== undefined && v !== "" && v !== null;
  });

  function handleChange(field, value) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      if (field === "trainingAvailableDays") {
        next.weeklyTrainingDays = value ? String(value.split(",").filter(Boolean).length) : "";
      }
      return next;
    });
  }

  async function handleFinish() {
    setSaving(true);
    try {
      // 1 — Salva check-in local e remoto
      const payload = { ...defaultCheckinForm, ...form, cadence: "weekly" };
      const updated = saveCheckin(payload, { createdAt: new Date().toISOString() });
      await saveRemoteCheckin(updated[0]).catch(() => {});

      // 2 — Salva avatar e nome do Personal nas configurações
      const SETTINGS_KEY = "shapeCertoSettings";
      const existing = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        ...existing,
        personal: {
          ...(existing.personal || {}),
          name: (form.personalName || "").trim() || "Personal Virtual",
          avatarId: form.personalAvatar || "default-personal",
        },
      }));

      // 3 — Salva snapshot dos dados para usar nos retries
      const goal                = form.goal || "";
      const trainingAvailableDays = form.trainingAvailableDays || "";
      const trainingExperience  = form.trainingExperience || "";
      const trainingAge         = form.trainingAge || "";
      const availableMinutes    = form.availableMinutes || "";
      setSavedGoal(goal);
      setSavedTrainingDays(trainingAvailableDays);
      setSavedTrainingExp(trainingExperience);
      setSavedTrainingAge(trainingAge);
      setSavedAvailableMinutes(availableMinutes);

      // 4 — Exibe tela de geração imediatamente
      setWorkoutStatus("generating");
      setDietStatus("generating");
      setWorkoutError(null);
      setDietError(null);
      setShowGen(true);
      setSaving(false);

      // 5 — Gera treino e dieta em paralelo
      function withTimeout(promise, ms = 90_000) {
        return Promise.race([
          promise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Tempo limite excedido.")), ms)
          ),
        ]);
      }

      await Promise.allSettled([
        withTimeout(generateWorkoutWithAi({ persist: true, goal, trainingAvailableDays, trainingExperience, trainingAge, availableMinutes }))
          .then(() => setWorkoutStatus("ok"))
          .catch(err => { setWorkoutStatus("error"); setWorkoutError(err?.message || "Erro desconhecido."); }),

        withTimeout(generateDietWithAi({ persist: true, goal }))
          .then(() => setDietStatus("ok"))
          .catch(err => { setDietStatus("error"); setDietError(err?.message || "Erro desconhecido."); }),
      ]);

    } catch {
      // Erro inesperado no save — mostra tela de geração com erros
      setWorkoutStatus("error");
      setDietStatus("error");
      setShowGen(true);
      setSaving(false);
    }
  }

  // ── Retry handlers ────────────────────────────────────────────────────────
  async function handleRetryWorkout() {
    setWorkoutStatus("generating");
    setWorkoutError(null);
    try {
      await generateWorkoutWithAi({
        persist: true,
        goal: savedGoal,
        trainingAvailableDays: savedTrainingDays,
        trainingExperience: savedTrainingExp,
        trainingAge: savedTrainingAge,
        availableMinutes: savedAvailableMinutes,
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
      await generateDietWithAi({ persist: true, goal: savedGoal });
      setDietStatus("ok");
    } catch (err) {
      setDietStatus("error");
      setDietError(err?.message || "Erro desconhecido.");
    }
  }

  // ── Render: Tela de geração ───────────────────────────────────────────────
  if (showGen) {
    return (
      <GeneratingScreen
        workoutStatus={workoutStatus}
        dietStatus={dietStatus}
        workoutError={workoutError}
        dietError={dietError}
        onRetryWorkout={handleRetryWorkout}
        onRetryDiet={handleRetryDiet}
        onEnter={onComplete}
      />
    );
  }

  // ── Render: campos ───────────────────────────────────────────────────────
  function renderField(key) {
    const def = FIELD_DEFS[key];
    if (!def) return null;

    if (key === "trainingAvailableDays") {
      const selected = (form[key] || "").split(",").filter(Boolean);
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <div className="ob-daypicker">
            {WEEK_DAYS.map(d => (
              <button key={d.id} type="button"
                className={`ob-daypicker__btn${selected.includes(d.id) ? " is-active" : ""}`}
                onClick={() => {
                  const next = selected.includes(d.id)
                    ? selected.filter(x => x !== d.id)
                    : [...selected, d.id].sort((a,b) =>
                        WEEK_DAYS.findIndex(w=>w.id===a) - WEEK_DAYS.findIndex(w=>w.id===b));
                  handleChange(key, next.join(","));
                }}>
                {d.short}
              </button>
            ))}
          </div>
        </div>
      );
    }
    if (def.type === "select") {
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}{def.required && <span className="ob-field__req">*</span>}
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <select className="ob-field__control" value={form[key] ?? ""} onChange={e => handleChange(key, e.target.value)}>
            {def.options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
      );
    }
    if (def.type === "textarea") {
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <textarea className="ob-field__control" rows={3} placeholder={def.placeholder ?? ""}
            value={form[key] ?? ""} onChange={e => handleChange(key, e.target.value)} />
        </div>
      );
    }
    if (def.type === "avatarpicker") {
      const selected = form[key] || "default-personal";
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">{def.label}</label>
          <div className="ob-avatar-picker">
            {personalAvatarCatalog.map(avatar => (
              <button key={avatar.id} type="button"
                className={`ob-avatar-picker__item${selected === avatar.id ? " is-active" : ""}`}
                onClick={() => handleChange(key, avatar.id)}
                title={avatar.label}
                aria-label={`Selecionar avatar ${avatar.label}`}
                aria-pressed={selected === avatar.id}
              >
                <img src={avatar.url} alt={avatar.label} className="ob-avatar-picker__img" />
              </button>
            ))}
          </div>
        </div>
      );
    }
    // text
    return (
      <div key={key} className="ob-field">
        <label className="ob-field__label">
          {def.label}{def.required && <span className="ob-field__req">*</span>}
        </label>
        {def.hint && <p className="ob-field__hint">{def.hint}</p>}
        <input className="ob-field__control" type="text"
          placeholder={def.placeholder ?? ""} value={form[key] ?? ""}
          onChange={e => handleChange(key, e.target.value)} />
      </div>
    );
  }

  return (
    <div className="ob-overlay" role="dialog" aria-modal="true" aria-labelledby="ob-modal-title">
      <div className="ob-modal glass-panel">
        {/* Header */}
        <div className="ob-modal__header">
          <div className="ob-modal__eyebrow">Check-in inicial · Passo {step + 1} de {steps.length}</div>
          <h2 id="ob-modal-title" className="ob-modal__title">{currentStep.title}</h2>
          <p className="ob-modal__subtitle">{currentStep.subtitle}</p>
          <div className="ob-progress">
            <div className="ob-progress__fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Fields */}
        <div className="ob-modal__body">
          {currentStep.fields.map(f => renderField(f))}
        </div>

        {/* Footer */}
        <div className="ob-modal__footer">
          {step > 0 && (
            <button type="button" className="ghost-button" onClick={() => setStep(s => s - 1)}>
              ← Voltar
            </button>
          )}
          {currentStep.optional && !isLast && (
            <button type="button" className="ghost-button ob-modal__skip" onClick={() => setStep(s => s + 1)}>
              Pular etapa
            </button>
          )}
          {currentStep.optional && isLast && (
            <button type="button" className="ghost-button ob-modal__skip" onClick={handleFinish} disabled={saving}>
              Pular etapa
            </button>
          )}
          {isLast ? (
            <button type="button" className="primary-button" onClick={handleFinish} disabled={saving}>
              {saving ? "Salvando..." : "Concluir e entrar →"}
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
