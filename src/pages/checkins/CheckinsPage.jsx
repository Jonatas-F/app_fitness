import { useMemo, useState } from "react";
import {
  defaultCheckinForm,
  loadCheckins,
  saveCheckin,
  resetCheckins,
  getCheckinMetrics,
  getMonthlyReevaluation,
} from "../../data/checkinStorage";
import "./checkins.css";

function CheckinsPage() {
  const [formData, setFormData] = useState(defaultCheckinForm);
  const [checkins, setCheckins] = useState(() => loadCheckins());
  const [feedback, setFeedback] = useState("");

  const metrics = useMemo(() => getCheckinMetrics(checkins), [checkins]);
  const reevaluation = useMemo(
    () => getMonthlyReevaluation(),
    [checkins, feedback]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const updated = saveCheckin(formData);
    setCheckins(updated);
    setFormData(defaultCheckinForm);
    setFeedback("Check-in salvo com sucesso.");
  }

  function handleReset() {
    const resetData = resetCheckins();
    setCheckins(resetData);
    setFeedback("Histórico de check-ins resetado com sucesso.");
  }

  return (
    <section className="checkins-page">
      <section className="hero-card">
        <span className="eyebrow">Check-ins e reavaliação</span>
        <h2 className="hero-title">
          Registre atualizações rápidas e acompanhe quando o ciclo precisa ser revisado.
        </h2>
        <p className="hero-description">
          Esta etapa cria a base dos check-ins recorrentes e conecta o sistema à
          lógica de reavaliação mensal usando as datas finais do treino e da dieta.
        </p>

        <div className="hero-actions">
          <button type="submit" form="checkin-form" className="primary-button">
            Salvar check-in
          </button>
          <button type="button" className="ghost-button" onClick={handleReset}>
            Resetar check-ins
          </button>
        </div>

        {feedback ? <p className="text-secondary mt-16">{feedback}</p> : null}
      </section>

      <section className="grid grid-4">
        {metrics.map((item) => (
          <article key={item.label} className="metric-card">
            <div className="metric-label">{item.label}</div>
            <div className="metric-value">{item.value}</div>
            <div className="metric-trend">{item.trend}</div>
          </article>
        ))}
      </section>

      <section className="checkins-main-grid">
        <article className="glass-card card-padding">
          <div className="card-header">
            <div>
              <h3 className="card-title">Novo check-in</h3>
              <p className="card-subtitle">
                Peso, energia, sono, aderência, observações e foto opcional.
              </p>
            </div>
            <span className="badge badge-primary">Atualização</span>
          </div>

          <form id="checkin-form" className="form-grid" onSubmit={handleSubmit}>
            <div className="form-grid grid-2">
              <div className="input-group">
                <label className="input-label">Peso</label>
                <input
                  className="input-field"
                  name="weight"
                  type="text"
                  placeholder="Ex.: 84,6 kg"
                  value={formData.weight}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Energia</label>
                <select
                  className="select-field"
                  name="energy"
                  value={formData.energy}
                  onChange={handleChange}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                  <option value="7">7</option>
                  <option value="8">8</option>
                  <option value="9">9</option>
                  <option value="10">10</option>
                </select>
              </div>
            </div>

            <div className="form-grid grid-2">
              <div className="input-group">
                <label className="input-label">Sono</label>
                <input
                  className="input-field"
                  name="sleep"
                  type="number"
                  step="0.1"
                  placeholder="Ex.: 7.5"
                  value={formData.sleep}
                  onChange={handleChange}
                />
              </div>

              <div className="input-group">
                <label className="input-label">Aderência</label>
                <select
                  className="select-field"
                  name="adherence"
                  value={formData.adherence}
                  onChange={handleChange}
                >
                  <option value="50">50%</option>
                  <option value="60">60%</option>
                  <option value="70">70%</option>
                  <option value="80">80%</option>
                  <option value="85">85%</option>
                  <option value="90">90%</option>
                  <option value="95">95%</option>
                  <option value="100">100%</option>
                </select>
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Observações</label>
              <textarea
                className="textarea-field"
                name="notes"
                placeholder="Ex.: mais fome à noite, treino rendeu bem, sono ficou abaixo da média."
                value={formData.notes}
                onChange={handleChange}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Foto opcional</label>
              <input
                className="input-field"
                name="photoNote"
                type="text"
                placeholder="Ex.: Foto frontal enviada / foto não enviada"
                value={formData.photoNote}
                onChange={handleChange}
              />
            </div>
          </form>
        </article>

        <article className="glass-card card-padding">
          <div className="card-header">
            <div>
              <h3 className="card-title">Reavaliação mensal</h3>
              <p className="card-subtitle">
                Leitura do fim de ciclo do treino e da dieta.
              </p>
            </div>
            <span
              className={`badge ${
                reevaluation.reevaluationNeeded ? "badge-warning" : "badge-success"
              }`}
            >
              {reevaluation.reevaluationNeeded ? "Atenção" : "Em dia"}
            </span>
          </div>

          <div className="checkins-reeval-list">
            <div className="checkins-reeval-card">
              <strong>Treino atual</strong>
              <span>{reevaluation.training.title}</span>
              <p>
                Final: {reevaluation.training.endDate} — {reevaluation.training.cycle.label}
              </p>
              <small>{reevaluation.training.cycle.detail}</small>
            </div>

            <div className="checkins-reeval-card">
              <strong>Dieta atual</strong>
              <span>{reevaluation.diet.title}</span>
              <p>
                Final: {reevaluation.diet.endDate} — {reevaluation.diet.cycle.label}
              </p>
              <small>{reevaluation.diet.cycle.detail}</small>
            </div>
          </div>

          <div className="checkins-reeval-actions">
            {reevaluation.recommendedActions.map((action) => (
              <span key={action} className="badge badge-primary">
                {action}
              </span>
            ))}
          </div>

          {reevaluation.training.closurePlan ? (
            <div className="checkins-closure-box">
              <h4>Checklist do encerramento do treino</h4>
              <ul className="checkins-inline-list">
                <li>
                  Fotos: {reevaluation.training.closurePlan.requestPhotos ? "Sim" : "Não"}
                </li>
                <li>
                  Bioimpedância:{" "}
                  {reevaluation.training.closurePlan.requestBioimpedance ? "Sim" : "Não"}
                </li>
                <li>
                  Só com fotos:{" "}
                  {reevaluation.training.closurePlan.allowPhotosOnly ? "Sim" : "Não"}
                </li>
                <li>
                  Novo protocolo:{" "}
                  {reevaluation.training.closurePlan.unlockNewProtocol ? "Sim" : "Não"}
                </li>
              </ul>
            </div>
          ) : null}
        </article>
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Histórico de check-ins</h3>
            <p className="card-subtitle">
              Registros anteriores salvos para acompanhar evolução recorrente.
            </p>
          </div>
          <span className="badge badge-primary">{checkins.length}</span>
        </div>

        {checkins.length === 0 ? (
          <div className="checkins-empty">
            Ainda não existem check-ins salvos. Crie o primeiro registro para
            começar o histórico.
          </div>
        ) : (
          <div className="checkins-history-list">
            {checkins.map((item) => (
              <article key={item.id} className="checkins-history-card">
                <div className="checkins-history-top">
                  <div>
                    <h4>{new Date(item.createdAt).toLocaleString("pt-BR")}</h4>
                    <p>Registro salvo no histórico do usuário.</p>
                  </div>

                  <span className="badge badge-success">
                    {item.adherence || "--"} de aderência
                  </span>
                </div>

                <div className="checkins-history-grid">
                  <div className="data-row">
                    <span>Peso</span>
                    <strong>{item.weight || "--"}</strong>
                  </div>
                  <div className="data-row">
                    <span>Energia</span>
                    <strong>{item.energy || "--"}/10</strong>
                  </div>
                  <div className="data-row">
                    <span>Sono</span>
                    <strong>{item.sleep ? `${item.sleep}h` : "--"}</strong>
                  </div>
                  <div className="data-row">
                    <span>Foto</span>
                    <strong>{item.photoNote || "--"}</strong>
                  </div>
                </div>

                <div className="checkins-notes-box">
                  <strong>Observações</strong>
                  <p>{item.notes || "Sem observações registradas."}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default CheckinsPage;