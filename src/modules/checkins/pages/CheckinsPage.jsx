import { useMemo, useState } from "react";
import {
  calculateCheckinCompleteness,
  defaultCheckinForm,
  getCheckinMetrics,
  getMonthlyReevaluation,
  loadCheckins,
  resetCheckins,
  saveCheckin,
  validateCheckinForm,
} from "../../../data/checkinStorage";
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

export default function CheckinsPage() {
  const [formData, setFormData] = useState(defaultCheckinForm);
  const [checkins, setCheckins] = useState(() => loadCheckins());
  const [feedback, setFeedback] = useState("");

  const metrics = useMemo(() => getCheckinMetrics(checkins), [checkins]);
  const reevaluation = useMemo(() => getMonthlyReevaluation(), [checkins]);
  const completeness = useMemo(
    () => calculateCheckinCompleteness(formData),
    [formData]
  );
  const latestCheckin = checkins[0];

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const validation = validateCheckinForm(formData);

    if (!validation.isValid) {
      setFeedback(validation.message);
      return;
    }

    const updated = saveCheckin(formData);
    setCheckins(updated);
    setFormData(defaultCheckinForm);
    setFeedback("Check-in salvo. O historico ja pode alimentar treino, dieta e dashboard.");
  }

  function handleReset() {
    const resetData = resetCheckins();
    setCheckins(resetData);
    setFeedback("Historico de check-ins resetado.");
  }

  return (
    <section className="checkins-page">
      <header className="checkins-hero glass-panel">
        <div>
          <span className="checkins-hero__eyebrow">Check-in inteligente</span>
          <h1>Dados suficientes para montar treino e dieta com IA.</h1>
          <p>
            O basico e obrigatorio. Bioimpedancia, rotina, preferencias e
            historico deixam a recomendacao mais precisa a cada registro.
          </p>
        </div>

        <aside className="checkins-readiness">
          <span>Qualidade do check-in atual</span>
          <strong>{completeness}%</strong>
          <div className="checkins-progress">
            <span style={{ width: `${completeness}%` }} />
          </div>
          <small>
            A IA pode trabalhar com o minimo, mas melhora quando o usuario
            informa bioimpedancia, restricoes e rotina real.
          </small>
        </aside>
      </header>

      {feedback ? <p className="checkins-feedback">{feedback}</p> : null}

      <section className="checkins-metrics">
        {metrics.map((item) => (
          <article key={item.label} className="module-stat glass-panel">
            <span className="module-stat__label">{item.label}</span>
            <strong className="module-stat__value">{item.value}</strong>
            <span className="module-stat__helper">{item.trend}</span>
          </article>
        ))}
      </section>

      <form className="checkins-form" onSubmit={handleSubmit}>
        <div className="checkins-form__main">
          <Section
            eyebrow="01"
            title="Objetivo e dados obrigatorios"
            description="Esses campos definem o ponto de partida para qualquer plano."
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

              <Field
                label="Esporte especifico"
                hint="Use quando o objetivo for corrida, futebol, luta, ciclismo ou outro esporte."
              >
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

          <Section
            eyebrow="02"
            title="Bioimpedancia e medidas"
            description="Campos opcionais para melhorar calorias, macros e escolha do treino."
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

          <Section
            eyebrow="03"
            title="Rotina, treino e dieta"
            description="Essas respostas ajudam a IA a montar um plano executavel, nao apenas ideal."
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

              <Field label="Dias disponiveis por semana">
                <input
                  name="weeklyTrainingDays"
                  value={formData.weeklyTrainingDays}
                  onChange={handleChange}
                  placeholder="Ex.: 5"
                />
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

              <Field label="Agua por dia">
                <input
                  name="waterIntake"
                  value={formData.waterIntake}
                  onChange={handleChange}
                  placeholder="Ex.: 2.5 L"
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

          <Section
            eyebrow="04"
            title="Sinais da semana"
            description="Energia, sono e aderencia ajudam a decidir quando ajustar volume, calorias e recuperacao."
          >
            <div className="checkins-grid checkins-grid--three">
              <Field label="Energia" required>
                <select name="energy" value={formData.energy} onChange={handleChange}>
                  {Array.from({ length: 10 }, (_, index) => String(index + 1)).map((value) => (
                    <option key={value} value={value}>
                      {value}/10
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Sono medio" required>
                <input
                  name="sleep"
                  value={formData.sleep}
                  onChange={handleChange}
                  inputMode="decimal"
                  placeholder="Ex.: 7.5 h"
                />
              </Field>

              <Field label="Aderencia ao plano" required>
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

              <Field label="Fotos">
                <input
                  name="photoNote"
                  value={formData.photoNote}
                  onChange={handleChange}
                  placeholder="Ex.: frontal e lateral enviadas"
                />
              </Field>
            </div>

            <Field label="Observacoes gerais">
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Ex.: fome a noite, treino rendeu pouco, viagem, ciclo menstrual, dores, exames recentes."
              />
            </Field>
          </Section>
        </div>

        <aside className="checkins-sidebar">
          <article className="checkins-actions glass-panel">
            <h2>Salvar check-in</h2>
            <p>
              O registro fica no historico local e ja nasce estruturado para uma
              futura chamada de IA.
            </p>
            <button type="submit" className="primary-button">
              Salvar check-in
            </button>
            <button type="button" className="ghost-button" onClick={handleReset}>
              Resetar historico
            </button>
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
            <h2>Ultimo payload</h2>
            {latestCheckin ? (
              <div className="checkins-payload">
                <span>Objetivo: {latestCheckin.goal || "--"}</span>
                <span>Prontidao IA: {latestCheckin.aiContext?.readiness || "basica"}</span>
                <span>Completude: {latestCheckin.completeness ?? "--"}%</span>
                <span>
                  Criado em: {new Date(latestCheckin.createdAt).toLocaleString("pt-BR")}
                </span>
              </div>
            ) : (
              <p>Nenhum check-in salvo ainda.</p>
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
            Crie o primeiro check-in para iniciar a linha do tempo do usuario.
          </p>
        ) : (
          <div className="checkins-history__list">
            {checkins.map((item) => (
              <article key={item.id} className="checkins-history-card">
                <div className="checkins-history-card__top">
                  <div>
                    <h3>{new Date(item.createdAt).toLocaleString("pt-BR")}</h3>
                    <p>{item.goal || "Objetivo nao informado"}</p>
                  </div>
                  <span>{item.completeness ?? "--"}% para IA</span>
                </div>

                <div className="checkins-history-card__grid">
                  <div>
                    <small>Peso</small>
                    <strong>{formatValue(item.weight)}</strong>
                  </div>
                  <div>
                    <small>Altura</small>
                    <strong>{formatValue(item.height)}</strong>
                  </div>
                  <div>
                    <small>Gordura</small>
                    <strong>{formatValue(item.bodyFat)}</strong>
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
                </div>

                <p className="checkins-history-card__notes">
                  {item.notes || "Sem observacoes registradas."}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}
