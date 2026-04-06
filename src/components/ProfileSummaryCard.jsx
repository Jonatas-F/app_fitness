import { getProfileSummary } from "../data/profileDerivedData";

function ProfileSummaryCard() {
  const summary = getProfileSummary();

  return (
    <article className="glass-card card-padding">
      <div className="card-header">
        <div>
          <h3 className="card-title">Resumo do perfil</h3>
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
          <span>Estratégia alimentar</span>
          <strong>{summary.diet.strategy}</strong>
        </div>
      </div>
    </article>
  );
}

export default ProfileSummaryCard;