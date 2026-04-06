import { getProfileSummary } from "../data/profileDerivedData";

function ProfileSummaryCard() {
  const summary = getProfileSummary();

  const updatedAtLabel = summary.updatedAt
    ? new Date(summary.updatedAt).toLocaleString("pt-BR")
    : "Ainda não salvo";

  return (
    <article className="glass-card card-padding">
      <div className="card-header">
        <div>
          <h3 className="card-title">Resumo do perfil atual</h3>
          <p className="card-subtitle">
            Dados atuais salvos e prontos para alimentar o app.
          </p>
        </div>
        <span className="badge badge-primary">{summary.completion}%</span>
      </div>

      <div className="data-list">
        <div className="data-row">
          <span>Nome</span>
          <strong>{summary.basic.fullName}</strong>
        </div>

        <div className="data-row">
          <span>Objetivo</span>
          <strong>{summary.goals.primaryGoal}</strong>
        </div>

        <div className="data-row">
          <span>Peso</span>
          <strong>{summary.basic.weight}</strong>
        </div>

        <div className="data-row">
          <span>Gordura corporal</span>
          <strong>{summary.basic.bodyFat}</strong>
        </div>

        <div className="data-row">
          <span>Massa magra</span>
          <strong>{summary.basic.leanMass}</strong>
        </div>

        <div className="data-row">
          <span>Estratégia alimentar</span>
          <strong>{summary.diet.strategy}</strong>
        </div>

        <div className="data-row">
          <span>Última atualização</span>
          <strong>{updatedAtLabel}</strong>
        </div>

        <div className="data-row">
          <span>Versões anteriores</span>
          <strong>{summary.historyCount}</strong>
        </div>
      </div>
    </article>
  );
}

export default ProfileSummaryCard;