import { useMemo, useState } from "react";
import {
  createExampleTrainingProtocol,
  loadTrainingProtocol,
  loadTrainingHistory,
  saveTrainingProtocol,
  closeTrainingProtocol,
  resetTrainingState,
  getTrainingMetrics,
} from "../../data/trainingStorage";
import "./training.css";

function TrainingPage() {
  const [protocol, setProtocol] = useState(() => loadTrainingProtocol());
  const [history, setHistory] = useState(() => loadTrainingHistory());
  const [feedback, setFeedback] = useState("");

  const metrics = useMemo(
    () => getTrainingMetrics(protocol, history),
    [protocol, history]
  );

  function updateProtocolField(field, value) {
    setProtocol((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateClosureField(field, value) {
    setProtocol((current) => ({
      ...current,
      closurePlan: {
        ...current.closurePlan,
        [field]: value,
      },
    }));
  }

  function updateDivisionField(index, field, value) {
    setProtocol((current) => ({
      ...current,
      division: current.division.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  }

  function handleSave() {
    const saved = saveTrainingProtocol(protocol);
    setProtocol(saved);
    setFeedback("Protocolo atual salvo com sucesso.");
  }

  function handleLoadExample() {
    const example = createExampleTrainingProtocol();
    setProtocol(example);
    setFeedback("Exemplo de protocolo carregado na tela.");
  }

  function handleCloseProtocol() {
    const result = closeTrainingProtocol(protocol);
    setProtocol(result.currentProtocol);
    setHistory(result.history);
    setFeedback(
      "Protocolo encerrado e movido para o histórico. Novo ciclo liberado."
    );
  }

  function handleReset() {
    const resetProtocol = resetTrainingState();
    setProtocol(resetProtocol);
    setHistory([]);
    setFeedback("Treinos resetados com sucesso.");
  }

  return (
    <section className="training-page">
      <section className="hero-card">
        <span className="eyebrow">Protocolo de treino</span>
        <h2 className="hero-title">
          Organize o treino atual e mantenha o histórico de protocolos anteriores.
        </h2>
        <p className="hero-description">
          Agora a área de treinos passa a salvar o protocolo atual, registrar
          encerramentos de ciclo e manter um histórico de protocolos liberados
          para o usuário.
        </p>

        <div className="hero-actions">
          <button type="button" className="primary-button" onClick={handleSave}>
            Salvar protocolo
          </button>

          <button
            type="button"
            className="secondary-button"
            onClick={handleCloseProtocol}
          >
            Encerrar protocolo
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={handleLoadExample}
          >
            Carregar exemplo
          </button>

          <button type="button" className="ghost-button" onClick={handleReset}>
            Resetar treinos
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

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Protocolo atual</h3>
            <p className="card-subtitle">
              Dados principais do ciclo de treino em andamento.
            </p>
          </div>
          <span className="badge badge-primary">{protocol.status}</span>
        </div>

        <div className="form-grid grid-2">
          <div className="input-group">
            <label className="input-label">Nome do protocolo</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: Protocolo Hipertrofia 01"
              value={protocol.title}
              onChange={(event) =>
                updateProtocolField("title", event.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Objetivo do protocolo</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: Hipertrofia com foco em massa magra"
              value={protocol.objective}
              onChange={(event) =>
                updateProtocolField("objective", event.target.value)
              }
            />
          </div>
        </div>

        <div className="form-grid grid-2 mt-16">
          <div className="input-group">
            <label className="input-label">Data de início</label>
            <input
              className="input-field"
              type="date"
              value={protocol.startDate}
              onChange={(event) =>
                updateProtocolField("startDate", event.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Data final</label>
            <input
              className="input-field"
              type="date"
              value={protocol.endDate}
              onChange={(event) =>
                updateProtocolField("endDate", event.target.value)
              }
            />
          </div>
        </div>

        <div className="input-group mt-16">
          <label className="input-label">Observações do protocolo</label>
          <textarea
            className="textarea-field"
            placeholder="Observações gerais do ciclo, intensidade, limitações, estratégia e notas do treinador."
            value={protocol.notes}
            onChange={(event) => updateProtocolField("notes", event.target.value)}
          />
        </div>
      </section>

      <section className="training-division-grid">
        {protocol.division.map((item, index) => (
          <article key={item.id} className="glass-card card-padding">
            <div className="card-header">
              <div>
                <h3 className="card-title">{item.title}</h3>
                <p className="card-subtitle">
                  Divisão atual do protocolo de treino.
                </p>
              </div>
              <span className="badge badge-success">{item.id}</span>
            </div>

            <div className="form-grid">
              <div className="input-group">
                <label className="input-label">Nome da divisão</label>
                <input
                  className="input-field"
                  type="text"
                  value={item.title}
                  onChange={(event) =>
                    updateDivisionField(index, "title", event.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label className="input-label">Foco do treino</label>
                <input
                  className="input-field"
                  type="text"
                  placeholder="Ex.: Costas e bíceps"
                  value={item.focus}
                  onChange={(event) =>
                    updateDivisionField(index, "focus", event.target.value)
                  }
                />
              </div>

              <div className="input-group">
                <label className="input-label">Exercícios do protocolo</label>
                <textarea
                  className="textarea-field training-exercises-field"
                  placeholder="Digite um exercício por linha. Ex.: Supino reto — 4x10"
                  value={item.exercises}
                  onChange={(event) =>
                    updateDivisionField(index, "exercises", event.target.value)
                  }
                />
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Rotina de encerramento do protocolo</h3>
            <p className="card-subtitle">
              Checklist de reavaliação que acompanha o fechamento do ciclo.
            </p>
          </div>
          <span className="badge badge-warning">Reavaliação</span>
        </div>

        <div className="training-checklist">
          <label className="training-check-row">
            <div>
              <strong>Solicitar novas fotos</strong>
              <span>Atualiza a leitura visual ao final do protocolo.</span>
            </div>
            <input
              type="checkbox"
              checked={protocol.closurePlan.requestPhotos}
              onChange={(event) =>
                updateClosureField("requestPhotos", event.target.checked)
              }
            />
          </label>

          <label className="training-check-row">
            <div>
              <strong>Solicitar bioimpedância</strong>
              <span>Campo opcional para dados corporais mais completos.</span>
            </div>
            <input
              type="checkbox"
              checked={protocol.closurePlan.requestBioimpedance}
              onChange={(event) =>
                updateClosureField("requestBioimpedance", event.target.checked)
              }
            />
          </label>

          <label className="training-check-row">
            <div>
              <strong>Permitir seguir só com fotos</strong>
              <span>O ciclo pode ser renovado mesmo sem bioimpedância.</span>
            </div>
            <input
              type="checkbox"
              checked={protocol.closurePlan.allowPhotosOnly}
              onChange={(event) =>
                updateClosureField("allowPhotosOnly", event.target.checked)
              }
            />
          </label>

          <label className="training-check-row">
            <div>
              <strong>Liberar novo protocolo após o fechamento</strong>
              <span>Prepara o sistema para o próximo ciclo mensal.</span>
            </div>
            <input
              type="checkbox"
              checked={protocol.closurePlan.unlockNewProtocol}
              onChange={(event) =>
                updateClosureField("unlockNewProtocol", event.target.checked)
              }
            />
          </label>
        </div>
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Histórico de protocolos</h3>
            <p className="card-subtitle">
              Protocolos anteriores encerrados e salvos para consulta.
            </p>
          </div>
          <span className="badge badge-primary">{history.length}</span>
        </div>

        {history.length === 0 ? (
          <div className="training-empty-history">
            Ainda não existem protocolos finalizados. Quando você encerrar o
            protocolo atual, ele aparecerá aqui.
          </div>
        ) : (
          <div className="training-history-list">
            {history.map((item) => (
              <article key={item.id} className="training-history-card">
                <div className="training-history-top">
                  <div>
                    <h4>{item.title || "Protocolo sem nome"}</h4>
                    <p>
                      {item.startDate || "--"} até {item.endDate || "--"}
                    </p>
                  </div>

                  <span className="badge badge-success">
                    {item.status || "finalizado"}
                  </span>
                </div>

                <div className="training-history-grid">
                  <div className="data-row">
                    <span>Objetivo</span>
                    <strong>{item.objective || "--"}</strong>
                  </div>

                  <div className="data-row">
                    <span>Fechado em</span>
                    <strong>
                      {item?.metadata?.closedAt
                        ? new Date(item.metadata.closedAt).toLocaleString("pt-BR")
                        : "--"}
                    </strong>
                  </div>

                  <div className="data-row">
                    <span>Fotos solicitadas</span>
                    <strong>
                      {item?.closurePlan?.requestPhotos ? "Sim" : "Não"}
                    </strong>
                  </div>

                  <div className="data-row">
                    <span>Bioimpedância</span>
                    <strong>
                      {item?.closurePlan?.requestBioimpedance ? "Sim" : "Não"}
                    </strong>
                  </div>
                </div>

                <div className="training-history-division-list">
                  {item.division.map((division) => (
                    <div key={`${item.id}-${division.id}`} className="training-history-division">
                      <strong>
                        {division.title} — {division.focus || "Sem foco definido"}
                      </strong>
                      <p>{division.exercises || "Sem exercícios registrados."}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default TrainingPage;