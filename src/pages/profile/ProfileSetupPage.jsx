import { useMemo, useState } from "react";
import ProfileSummaryCard from "../../components/ProfileSummaryCard";
import {
  loadProfileData,
  saveProfileData,
  resetProfileData,
  getProfileCompletion,
} from "../../data/profileStorage";
import {
  getProfileHistorySummary,
  getCurrentVsPreviousComparison,
} from "../../data/profileDerivedData";
import "./profile.css";

function ProfileSetupPage() {
  const [profileData, setProfileData] = useState(() => loadProfileData());
  const [statusMessage, setStatusMessage] = useState("");

  const completion = useMemo(
    () => getProfileCompletion(profileData),
    [profileData]
  );

  const historySummary = useMemo(
    () => getProfileHistorySummary(),
    [profileData, statusMessage]
  );

  const currentVsPrevious = useMemo(
    () => getCurrentVsPreviousComparison(),
    [profileData, statusMessage]
  );

  function updateSectionField(section, field, value) {
    setProfileData((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  }

  function handleSave() {
    const saved = saveProfileData(profileData);
    setProfileData(saved);
    setStatusMessage("Perfil salvo com histórico atualizado com sucesso.");
  }

  function handleReset() {
    const resetData = resetProfileData();
    setProfileData(resetData);
    setStatusMessage("Perfil e histórico resetados com sucesso.");
  }

  const updatedAtLabel = profileData?.metadata?.updatedAt
    ? new Date(profileData.metadata.updatedAt).toLocaleString("pt-BR")
    : "Ainda não salvo";

  return (
    <div className="grid mt-24">
      <section className="hero-card">
        <span className="eyebrow">Perfil inteligente</span>
        <h2 className="hero-title">
          Base do usuário para personalização de treino, dieta e progresso
        </h2>
        <p className="hero-description">
          Agora o perfil funciona como base viva do sistema: salva os dados
          atuais, registra snapshots anteriores e mostra uma comparação simples
          entre versões.
        </p>

        <div className="hero-actions">
          <button className="primary-button" type="button" onClick={handleSave}>
            Salvar perfil
          </button>
          <button className="ghost-button" type="button" onClick={handleReset}>
            Limpar dados
          </button>
        </div>

        {statusMessage ? (
          <p className="text-secondary mt-16">{statusMessage}</p>
        ) : null}
      </section>

      <section className="grid grid-4">
        <article className="metric-card">
          <div className="metric-label">Preenchimento</div>
          <div className="metric-value">{completion}%</div>
          <div className="metric-trend">Base para IA e dashboards</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Objetivo principal</div>
          <div className="metric-value">
            {profileData.goals.primaryGoal || "--"}
          </div>
          <div className="metric-trend">Meta principal do usuário</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Peso atual</div>
          <div className="metric-value">
            {profileData.basic.weight || "--"}
          </div>
          <div className="metric-trend">Último valor informado</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Última atualização</div>
          <div className="metric-value">{updatedAtLabel}</div>
          <div className="metric-trend">Perfil persistido localmente</div>
        </article>
      </section>

      <ProfileSummaryCard />

      {currentVsPrevious ? (
        <section className="glass-card card-padding">
          <div className="card-header">
            <div>
              <h3 className="card-title">Comparação atual vs anterior</h3>
              <p className="card-subtitle">
                Comparação básica do perfil atual com o snapshot anterior salvo.
              </p>
            </div>
            <span className="badge badge-success">
              {currentVsPrevious.changedFields.length} mudanças
            </span>
          </div>

          <div className="profile-comparison-grid">
            <div className="profile-comparison-card">
              <h4>Atual</h4>
              <div className="data-list">
                <div className="data-row">
                  <span>Peso</span>
                  <strong>{currentVsPrevious.current.weight}</strong>
                </div>
                <div className="data-row">
                  <span>Gordura</span>
                  <strong>{currentVsPrevious.current.bodyFat}</strong>
                </div>
                <div className="data-row">
                  <span>Massa magra</span>
                  <strong>{currentVsPrevious.current.leanMass}</strong>
                </div>
                <div className="data-row">
                  <span>Objetivo</span>
                  <strong>{currentVsPrevious.current.primaryGoal}</strong>
                </div>
                <div className="data-row">
                  <span>Dieta</span>
                  <strong>{currentVsPrevious.current.strategy}</strong>
                </div>
              </div>
            </div>

            <div className="profile-comparison-card">
              <h4>Anterior</h4>
              <div className="data-list">
                <div className="data-row">
                  <span>Peso</span>
                  <strong>{currentVsPrevious.previous.weight}</strong>
                </div>
                <div className="data-row">
                  <span>Gordura</span>
                  <strong>{currentVsPrevious.previous.bodyFat}</strong>
                </div>
                <div className="data-row">
                  <span>Massa magra</span>
                  <strong>{currentVsPrevious.previous.leanMass}</strong>
                </div>
                <div className="data-row">
                  <span>Objetivo</span>
                  <strong>{currentVsPrevious.previous.primaryGoal}</strong>
                </div>
                <div className="data-row">
                  <span>Dieta</span>
                  <strong>{currentVsPrevious.previous.strategy}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-changed-fields mt-20">
            {currentVsPrevious.changedFields.map((field) => (
              <span key={field} className="badge badge-primary">
                {field}
              </span>
            ))}
          </div>
        </section>
      ) : null}

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Dados básicos</h3>
            <p className="card-subtitle">
              Informações principais do usuário para personalização do sistema.
            </p>
          </div>
          <span className="badge badge-primary">Perfil</span>
        </div>

        <div className="form-grid grid-2">
          <div className="input-group">
            <label className="input-label">Nome completo</label>
            <input
              className="input-field"
              type="text"
              placeholder="Digite o nome do usuário"
              value={profileData.basic.fullName}
              onChange={(e) =>
                updateSectionField("basic", "fullName", e.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Idade</label>
            <input
              className="input-field"
              type="number"
              placeholder="Ex.: 29"
              value={profileData.basic.age}
              onChange={(e) =>
                updateSectionField("basic", "age", e.target.value)
              }
            />
          </div>
        </div>

        <div className="form-grid grid-3 mt-16">
          <div className="input-group">
            <label className="input-label">Altura</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 1,78 m"
              value={profileData.basic.height}
              onChange={(e) =>
                updateSectionField("basic", "height", e.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Peso atual</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 84,6 kg"
              value={profileData.basic.weight}
              onChange={(e) =>
                updateSectionField("basic", "weight", e.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Sexo</label>
            <select
              className="select-field"
              value={profileData.basic.sex}
              onChange={(e) =>
                updateSectionField("basic", "sex", e.target.value)
              }
            >
              <option value="">Selecione</option>
              <option value="masculino">Masculino</option>
              <option value="feminino">Feminino</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div className="form-grid grid-2 mt-16">
          <div className="input-group">
            <label className="input-label">Gordura corporal</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 14%"
              value={profileData.basic.bodyFat}
              onChange={(e) =>
                updateSectionField("basic", "bodyFat", e.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Massa magra</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 72 kg"
              value={profileData.basic.leanMass}
              onChange={(e) =>
                updateSectionField("basic", "leanMass", e.target.value)
              }
            />
          </div>
        </div>
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Objetivos e direcionamento</h3>
            <p className="card-subtitle">
              Campos que ajudam a IA a entender a meta principal do usuário.
            </p>
          </div>
          <span className="badge badge-success">Meta</span>
        </div>

        <div className="form-grid grid-2">
          <div className="input-group">
            <label className="input-label">Objetivo principal</label>
            <select
              className="select-field"
              value={profileData.goals.primaryGoal}
              onChange={(e) =>
                updateSectionField("goals", "primaryGoal", e.target.value)
              }
            >
              <option value="">Selecione</option>
              <option value="emagrecimento">Emagrecimento</option>
              <option value="hipertrofia">Hipertrofia</option>
              <option value="recomposicao">Recomposição corporal</option>
              <option value="condicionamento">Condicionamento</option>
              <option value="performance">Performance esportiva</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Foco de condicionamento</label>
            <select
              className="select-field"
              value={profileData.goals.conditioningGoal}
              onChange={(e) =>
                updateSectionField("goals", "conditioningGoal", e.target.value)
              }
            >
              <option value="">Selecione</option>
              <option value="resistencia">Melhorar resistência</option>
              <option value="forca">Ganhar força</option>
              <option value="prova">Preparação para prova</option>
              <option value="corrida">Melhorar corrida</option>
              <option value="esporte">Esporte específico</option>
            </select>
          </div>
        </div>

        <div className="input-group mt-16">
          <label className="input-label">Observações do objetivo</label>
          <textarea
            className="textarea-field"
            placeholder="Ex.: quero reduzir gordura, ganhar massa magra e melhorar meu condicionamento."
            value={profileData.goals.notes}
            onChange={(e) =>
              updateSectionField("goals", "notes", e.target.value)
            }
          />
        </div>
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Dados da dieta</h3>
            <p className="card-subtitle">
              Base para o plano alimentar e futuras sugestões da IA.
            </p>
          </div>
          <span className="badge badge-warning">Nutrição</span>
        </div>

        <div className="form-grid grid-3">
          <div className="input-group">
            <label className="input-label">Estratégia alimentar</label>
            <select
              className="select-field"
              value={profileData.diet.strategy}
              onChange={(e) =>
                updateSectionField("diet", "strategy", e.target.value)
              }
            >
              <option value="">Selecione</option>
              <option value="manutencao">Manutenção</option>
              <option value="deficit">Déficit calórico</option>
              <option value="superavit">Superávit calórico</option>
              <option value="lowcarb">Low carb</option>
              <option value="alta-proteina">Alta proteína</option>
            </select>
          </div>

          <div className="input-group">
            <label className="input-label">Refeições por dia</label>
            <input
              className="input-field"
              type="number"
              placeholder="Ex.: 5"
              value={profileData.diet.mealsPerDay}
              onChange={(e) =>
                updateSectionField("diet", "mealsPerDay", e.target.value)
              }
            />
          </div>

          <div className="input-group">
            <label className="input-label">Água por dia</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 3 litros"
              value={profileData.diet.waterPerDay}
              onChange={(e) =>
                updateSectionField("diet", "waterPerDay", e.target.value)
              }
            />
          </div>
        </div>

        <div className="input-group mt-16">
          <label className="input-label">Preferências e restrições</label>
          <textarea
            className="textarea-field"
            placeholder="Ex.: prefiro frango, arroz e ovos. Evitar lactose."
            value={profileData.diet.preferences}
            onChange={(e) =>
              updateSectionField("diet", "preferences", e.target.value)
            }
          />
        </div>
      </section>

      <section className="glass-card card-padding">
        <div className="card-header">
          <div>
            <h3 className="card-title">Histórico do perfil</h3>
            <p className="card-subtitle">
              Snapshots anteriores salvos automaticamente sempre que o perfil é atualizado.
            </p>
          </div>
          <span className="badge badge-primary">{historySummary.length}</span>
        </div>

        {historySummary.length === 0 ? (
          <div className="profile-history-empty">
            Ainda não existem versões anteriores. Salve o perfil e depois altere
            algum campo para começar o histórico.
          </div>
        ) : (
          <div className="profile-history-list">
            {historySummary.map((entry) => (
              <article key={entry.id} className="profile-history-item">
                <div className="profile-history-top">
                  <div>
                    <h4>Snapshot anterior</h4>
                    <p>
                      Salvo em{" "}
                      <strong>
                        {new Date(entry.savedAt).toLocaleString("pt-BR")}
                      </strong>
                    </p>
                  </div>

                  <span className="badge badge-success">
                    {entry.changedFields.length} campos alterados
                  </span>
                </div>

                <div className="profile-history-fields">
                  {entry.changedFields.map((field) => (
                    <span key={field} className="badge badge-primary">
                      {field}
                    </span>
                  ))}
                </div>

                <div className="profile-history-grid">
                  <div className="data-row">
                    <span>Peso anterior</span>
                    <strong>{entry.basic.weight}</strong>
                  </div>
                  <div className="data-row">
                    <span>Gordura anterior</span>
                    <strong>{entry.basic.bodyFat}</strong>
                  </div>
                  <div className="data-row">
                    <span>Massa magra anterior</span>
                    <strong>{entry.basic.leanMass}</strong>
                  </div>
                  <div className="data-row">
                    <span>Objetivo anterior</span>
                    <strong>{entry.goals.primaryGoal}</strong>
                  </div>
                  <div className="data-row">
                    <span>Dieta anterior</span>
                    <strong>{entry.diet.strategy}</strong>
                  </div>
                  <div className="data-row">
                    <span>Água anterior</span>
                    <strong>{entry.diet.waterPerDay}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProfileSetupPage;