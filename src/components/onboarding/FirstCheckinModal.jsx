import { useState } from "react";
import { saveCheckin, defaultCheckinForm } from "../../data/checkinStorage";
import { saveRemoteCheckin } from "../../services/checkinService";
import "./FirstCheckinModal.css";

const STEPS = {
  basico: [
    { id: "basics",   title: "Seus dados básicos",     subtitle: "Informações essenciais para o Personal Virtual montar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "training", title: "Sua disponibilidade",    subtitle: "Marque os dias que você pode ir à academia.", fields: ["trainingAvailableDays"] },
    { id: "goals",    title: "Suas expectativas",       subtitle: "Conte o que espera alcançar — quanto mais detalhes, melhor.", fields: ["notes"] },
  ],
  intermediario: [
    { id: "basics",   title: "Seus dados básicos",       subtitle: "Informações essenciais para personalizar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "profile",  title: "Perfil de treino",          subtitle: "Experiência, tempo disponível e limitações físicas.", fields: ["trainingExperience","trainingAge","availableMinutes","injuries"] },
    { id: "state",    title: "Seu estado atual",           subtitle: "Como você está hoje e quais dias pode treinar.", fields: ["energy","sleepQuality","trainingAvailableDays"] },
    { id: "goals",    title: "Suas expectativas",          subtitle: "Conte o que espera alcançar com o Shape Certo.", fields: ["notes"] },
  ],
  pro: [
    { id: "basics",   title: "Seus dados básicos",         subtitle: "Informações essenciais para personalizar seu protocolo.", fields: ["goal","sex","age","height","weight"] },
    { id: "profile",  title: "Perfil de treino",            subtitle: "Experiência, tempo disponível e limitações físicas.", fields: ["trainingExperience","trainingAge","availableMinutes","injuries"] },
    { id: "state",    title: "Seu estado atual",             subtitle: "Sinais de recuperação e disponibilidade semanal.", fields: ["energy","sleepQuality","fatigueLevel","trainingPerformance","trainingAvailableDays"] },
    { id: "nutrition",title: "Alimentação", subtitle: "Restrições e preferências (opcional — pode pular).", fields: ["dietaryRestrictions","foodPreferences"], optional: true },
    { id: "body",     title: "Dados corporais",              subtitle: "Bioimpedância e composição corporal (opcional).", fields: ["bodyFat","leanMass"], optional: true },
  ],
};

const WEEK_DAYS = [
  { id: "monday", short: "SEG" }, { id: "tuesday", short: "TER" },
  { id: "wednesday", short: "QUA" }, { id: "thursday", short: "QUI" },
  { id: "friday", short: "SEX" }, { id: "saturday", short: "SAB" },
  { id: "sunday", short: "DOM" },
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
  dietaryRestrictions:{ label: "Restrições alimentares", type: "textarea", required: false,
                        placeholder: "Ex: intolerância à lactose, sem glúten, vegano", hint: "Deixe em branco se não tiver" },
  foodPreferences:    { label: "Preferências alimentares", type: "textarea", required: false,
                        placeholder: "Ex: prefiro frango, não gosto de peixe, como muito ovo", hint: "Opcional" },
  bodyFat:            { label: "Gordura corporal (%)", type: "text", required: false,
                        placeholder: "Ex: 18.5", hint: "Da bioimpedância — opcional" },
  leanMass:           { label: "Massa magra (kg)", type: "text", required: false,
                        placeholder: "Ex: 68.2", hint: "Da bioimpedância — opcional" },
  notes:              { label: "Expectativas e contexto", type: "textarea", required: false,
                        placeholder: "Conte o que espera alcançar, sua rotina atual, qualquer informação relevante...",
                        hint: "Quanto mais você descrever, mais preciso o protocolo inicial" },
};

export default function FirstCheckinModal({ planId, onComplete }) {
  const steps = STEPS[planId] ?? STEPS.intermediario;
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ cadence: "weekly" });
  const [saving, setSaving] = useState(false);

  const currentStep = steps[step];
  const isLast = step === steps.length - 1;
  const progress = ((step + 1) / steps.length) * 100;

  // Required fields for current step
  const required = currentStep.fields.filter(f => FIELD_DEFS[f]?.required);
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
      const payload = { ...defaultCheckinForm, ...form, cadence: "weekly" };
      const updated = saveCheckin(payload, { createdAt: new Date().toISOString() });
      saveRemoteCheckin(updated[0]).catch(() => {});
      onComplete();
    } finally {
      setSaving(false);
    }
  }

  // Render a field given its key
  function renderField(key) {
    const def = FIELD_DEFS[key];
    if (!def) return null;
    if (key === "trainingAvailableDays") {
      // inline DayPicker
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
                    : [...selected, d.id].sort((a,b) => WEEK_DAYS.findIndex(w=>w.id===a)-WEEK_DAYS.findIndex(w=>w.id===b));
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
          <label className="ob-field__label">{def.label}{def.required && <span className="ob-field__req">*</span>}</label>
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
    // text/number
    return (
      <div key={key} className="ob-field">
        <label className="ob-field__label">{def.label}{def.required && <span className="ob-field__req">*</span>}</label>
        {def.hint && <p className="ob-field__hint">{def.hint}</p>}
        <input className="ob-field__control" type={def.type === "number" ? "number" : "text"}
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
