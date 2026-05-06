import { useState, useRef, useEffect } from "react";
import { saveCheckin, defaultCheckinForm } from "../../data/checkinStorage";
import { saveRemoteCheckin } from "../../services/checkinService";
import { generateWorkoutWithAi } from "../../services/ai/workout.service";
import { generateDietWithAi } from "../../services/ai/diet.service";
import { personalAvatarCatalog } from "../../data/platformImageCatalog";
import AiGeneratingScreen from "../shared/AiGeneratingScreen";
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

// Etapa de composição corporal — Intermediário
// Pergunta bioimpedância básica + intenção de fotos
const BODY_INTER_STEP = {
  id: "body_inter",
  title: "Composição corporal",
  subtitle: "Com esses dados, a IA personaliza seu volume de treino, calorias e macros com muito mais precisão.",
  note: {
    icon: "💡",
    text: "Não tem acesso a uma balança de bioimpedância agora? Sem problema — clique em Pular etapa. Você pode inserir esses dados no check-in quando tiver, e a IA remonta os protocolos automaticamente.",
  },
  fields: ["bodyFat", "leanMass", "photosAvailable"],
  optional: true,
};

// Etapa de composição corporal — Pro (análise completa)
const BODY_PRO_STEP = {
  id: "body_pro",
  title: "Bioimpedância e composição",
  subtitle: "O plano Pro usa análise completa de composição para calcular TDEE real, zona de treinamento e periodização com precisão científica.",
  note: {
    icon: "💡",
    text: "Se não tiver acesso à balança de bioimpedância agora, clique em Pular. No próximo check-in você pode inserir — a IA usa esses dados para regenerar os protocolos com ainda mais precisão.",
  },
  fields: ["bodyFat", "leanMass", "visceralFat", "muscleMass", "photosAvailable"],
  optional: true,
};

const STEPS = {
  basico: [
    { id: "basics",   title: "Seus dados básicos",    subtitle: "Informações essenciais para o Personal Virtual montar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "training", title: "Sua disponibilidade",   subtitle: "Marque os dias que você pode ir à academia e suas preferências de treino.", fields: ["trainingAvailableDays","muscleGroupCombinations","trainingPreferenceFreeText"] },
    NUTRITION_STEP,
    { id: "goals",    title: "Suas expectativas",      subtitle: "Conte o que espera alcançar — quanto mais detalhes, melhor.", fields: ["notes"] },
    PERSONAL_STEP,
  ],
  intermediario: [
    { id: "basics",   title: "Seus dados básicos",     subtitle: "Informações essenciais para personalizar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "profile",  title: "Perfil de treino",        subtitle: "Experiência, tempo disponível e preferências de divisão.", fields: ["trainingExperience","trainingAge","availableMinutes","trainingPreference","muscleGroupCombinations","trainingPreferenceFreeText","injuries"] },
    { id: "state",    title: "Seu estado atual",         subtitle: "Como você está hoje e quais dias pode treinar.", fields: ["energy","sleepQuality","trainingAvailableDays"] },
    NUTRITION_STEP,
    BODY_INTER_STEP,
    { id: "goals",    title: "Suas expectativas",        subtitle: "Conte o que espera alcançar com o Shape Certo.", fields: ["notes"] },
    PERSONAL_STEP,
  ],
  pro: [
    { id: "basics",    title: "Seus dados básicos",      subtitle: "Informações essenciais para personalizar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "profile",   title: "Perfil de treino",         subtitle: "Experiência, tempo disponível e preferências de divisão.", fields: ["trainingExperience","trainingAge","availableMinutes","trainingPreference","muscleGroupCombinations","trainingPreferenceFreeText","injuries"] },
    { id: "state",     title: "Seu estado atual",          subtitle: "Sinais de recuperação e disponibilidade semanal.", fields: ["energy","sleepQuality","fatigueLevel","trainingPerformance","trainingAvailableDays"] },
    { id: "nutrition", title: "Alimentação",               subtitle: "A IA usa essas informações para criar um plano alimentar preciso.", fields: ["mealsPerDay","dietaryRestrictions","foodPreferences"], optional: true },
    BODY_PRO_STEP,
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
                        options: [
                          ["hipertrofia","Hipertrofia — ganho de massa muscular"],
                          ["powerlifting","Powerlifting / Força máxima"],
                          ["emagrecimento","Emagrecimento"],
                          ["recomposicao","Recomposição corporal"],
                          ["cutting","Cutting (definição muscular)"],
                          ["condicionamento","Condicionamento físico"],
                          ["saude","Saúde geral"],
                        ] },
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
  trainingPreference: { label: "Preferência de divisão de treino", type: "select", required: false,
                        options: [
                          ["","Deixar a IA decidir o melhor split (recomendado)"],
                          ["full_body","Full Body — treino global em cada sessão"],
                          ["upper_lower","Upper / Lower — divisão superior e inferior"],
                          ["ppl","Push / Pull / Legs"],
                          ["abc","ABC — por grupo muscular (Peito+Tri / Costas+Bi / Pernas+Ombros)"],
                          ["abcd","ABCD — 4 divisões"],
                          ["abcde","ABCDE — 5 divisões"],
                          ["powerlifting_split","Periodização Powerlifting (Squat / Bench / Deadlift)"],
                        ],
                        hint: "Opcional — se deixar em branco, a IA escolhe o split ideal para seu objetivo e disponibilidade" },
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
                        placeholder: "Ex: 18.5", hint: "% de gordura corporal total — encontrado no relatório da bioimpedância" },
  leanMass:           { label: "Massa magra (kg)", type: "text", required: false,
                        placeholder: "Ex: 68.2", hint: "Massa sem gordura (músculos + ossos + água) — da bioimpedância" },
  visceralFat:        { label: "Gordura visceral (índice)", type: "text", required: false,
                        placeholder: "Ex: 8", hint: "Índice de gordura visceral da bioimpedância — geralmente entre 1 e 20 (saudável: abaixo de 10)" },
  muscleMass:         { label: "Massa muscular esquelética (kg)", type: "text", required: false,
                        placeholder: "Ex: 42.1", hint: "Massa muscular esquelética total — da bioimpedância (se disponível)" },
  photosAvailable:    { label: "Você tem fotos de progresso disponíveis?", type: "select", required: false,
                        options: [
                          ["","Selecione"],
                          ["sim","Sim — vou adicionar no primeiro check-in"],
                          ["nao","Ainda não tenho fotos"],
                          ["nao-enviar","Prefiro não enviar fotos por enquanto"],
                        ],
                        hint: "Fotos de frente e de lado permitem análise visual de postura, simetria e composição muscular. Você pode enviá-las na tela de Check-in." },
  trainingPreferenceFreeText: {
    label: "Descreva suas preferências de treino",
    type: "textarea", required: false,
    placeholder: "Ex: Prefiro exercícios compostos, não gosto de máquinas, curto treinos intensos com pouco descanso, gosto de agachamento e terra...",
    hint: "A IA usa esse texto como contexto ao montar seu protocolo — mesmo com split automático ativado",
  },
  muscleGroupCombinations: {
    label: "Combinações de grupos musculares preferidas",
    type: "musclegroupicker", required: false,
    hint: "Selecione as combinações que mais gosta. A IA priorizará essas divisões.",
  },
  notes:              { label: "Expectativas e contexto", type: "textarea", required: false,
                        placeholder: "Conte o que espera alcançar, sua rotina atual, qualquer informação relevante...",
                        hint: "Quanto mais você descrever, mais preciso o protocolo inicial" },
  personalName:       { label: "Nome do Personal Virtual", type: "text", required: false,
                        placeholder: "Ex: Alex, Marina, Coach, Lucas...",
                        hint: "Deixe em branco para usar 'Personal Virtual'" },
  personalAvatar:     { label: "Avatar", type: "avatarpicker", required: false },
};

// ── Combinações de grupos musculares por sexo ─────────────────────────────────

const MUSCLE_COMBOS_MASC = [
  { id: "full_body",      label: "Full Body" },
  { id: "push",           label: "Push (Peito + Ombros + Tri)" },
  { id: "pull",           label: "Pull (Costas + Bíceps)" },
  { id: "peito_tri",      label: "Peito + Tríceps" },
  { id: "costas_bi",      label: "Costas + Bíceps" },
  { id: "ombros_trap",    label: "Ombros + Trapézio" },
  { id: "pernas",         label: "Pernas (Quad + Post + Glúteo)" },
  { id: "peito_costas",   label: "Peito + Costas" },
  { id: "bracos",         label: "Braços (Bíceps + Tríceps)" },
  { id: "upper_lower",    label: "Superior + Inferior" },
];

const MUSCLE_COMBOS_FEM = [
  { id: "full_body",           label: "Full Body" },
  { id: "gluteos_posterior",   label: "Glúteos + Posteriores" },
  { id: "gluteos_iso",         label: "Glúteo isolado" },
  { id: "pernas_completas",    label: "Pernas completas (Quad + Post + Glúteo)" },
  { id: "lower",               label: "Inferior completo" },
  { id: "upper",               label: "Superior completo" },
  { id: "costas_bi",           label: "Costas + Bíceps" },
  { id: "peito_ombros",        label: "Peito + Ombros" },
  { id: "core_abdomen",        label: "Core + Abdômen" },
  { id: "upper_lower",         label: "Superior + Inferior" },
];

function buildInitialForm() {
  const defaults = { cadence: "weekly" };
  for (const [key, def] of Object.entries(FIELD_DEFS)) {
    if (def.type === "select" && def.options?.[0]?.[0] !== "") {
      defaults[key] = def.options[0][0];
    }
  }
  return defaults;
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
  const [savedGoal, setSavedGoal]                               = useState("");
  const [savedTrainingDays, setSavedTrainingDays]               = useState("");
  const [savedTrainingExp, setSavedTrainingExp]                 = useState("");
  const [savedTrainingAge, setSavedTrainingAge]                 = useState("");
  const [savedAvailableMinutes, setSavedAvailableMinutes]       = useState("");
  const [savedTrainingPreference, setSavedTrainingPreference]   = useState("");

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
      const goal                  = form.goal || "";
      const trainingAvailableDays = form.trainingAvailableDays || "";
      const trainingExperience    = form.trainingExperience || "";
      const trainingAge           = form.trainingAge || "";
      const availableMinutes      = form.availableMinutes || "";
      const trainingPreference    = form.trainingPreference || "";
      setSavedGoal(goal);
      setSavedTrainingDays(trainingAvailableDays);
      setSavedTrainingExp(trainingExperience);
      setSavedTrainingAge(trainingAge);
      setSavedAvailableMinutes(availableMinutes);
      setSavedTrainingPreference(trainingPreference);

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
        withTimeout(generateWorkoutWithAi({ persist: true, goal, trainingAvailableDays, trainingExperience, trainingAge, availableMinutes, trainingPreference }))
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
        trainingPreference: savedTrainingPreference,
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
      <AiGeneratingScreen
        workoutStatus={workoutStatus}
        dietStatus={dietStatus}
        workoutError={workoutError}
        dietError={dietError}
        onRetryWorkout={handleRetryWorkout}
        onRetryDiet={handleRetryDiet}
        onComplete={onComplete}
        completeLabel="Entrar no Shape Certo →"
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
          <label className="ob-field__label">
            {def.label}
            {def.required
              ? <span className="ob-field__req">*</span>
              : <span className="ob-field__optional">Opcional</span>}
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          <textarea className="ob-field__control" rows={3} placeholder={def.placeholder ?? ""}
            value={form[key] ?? ""} onChange={e => handleChange(key, e.target.value)} />
        </div>
      );
    }
    if (def.type === "musclegroupicker") {
      const sex = form.sex || "";
      const combos = sex === "feminino" ? MUSCLE_COMBOS_FEM : MUSCLE_COMBOS_MASC;
      const selected = (form[key] || "").split(",").filter(Boolean);
      return (
        <div key={key} className="ob-field">
          <label className="ob-field__label">
            {def.label}
            {!def.required && <span className="ob-field__optional">Opcional</span>}
          </label>
          {def.hint && <p className="ob-field__hint">{def.hint}</p>}
          {sex === "feminino" && (
            <p className="ob-field__hint ob-field__hint--gender">👩 Opções voltadas para treino feminino</p>
          )}
          {sex === "masculino" && (
            <p className="ob-field__hint ob-field__hint--gender">💪 Opções voltadas para treino masculino</p>
          )}
          <div className="ob-combo-picker">
            {combos.map(c => (
              <button key={c.id} type="button"
                className={`ob-combo-picker__btn${selected.includes(c.id) ? " is-active" : ""}`}
                onClick={() => {
                  const next = selected.includes(c.id)
                    ? selected.filter(x => x !== c.id)
                    : [...selected, c.id];
                  handleChange(key, next.join(","));
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
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
          {currentStep.note && (
            <div className="ob-step-note">
              <span className="ob-step-note__icon">{currentStep.note.icon}</span>
              <p className="ob-step-note__text">{currentStep.note.text}</p>
            </div>
          )}
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
