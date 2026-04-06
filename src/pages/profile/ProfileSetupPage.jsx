import { useMemo, useState } from "react";
import ProfileSummaryCard from "../../components/ProfileSummaryCard";
import {
  loadProfileData,
  saveProfileData,
  resetProfileData,
  getProfileCompletion,
} from "../../data/profileStorage";

function ProfileSetupPage() {
  const [profileData, setProfileData] = useState(() => loadProfileData());
  const [statusMessage, setStatusMessage] = useState("");

  const completion = useMemo(
    () => getProfileCompletion(profileData),
    [profileData]
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
    setStatusMessage("Perfil salvo com sucesso.");
  }

  function handleReset() {
    const resetData = resetProfileData();
    setProfileData(resetData);
    setStatusMessage("Perfil resetado com sucesso.");
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
          Esta área reúne os dados principais do usuário para que o app consiga
          evoluir para bioimpedância, dieta personalizada, dashboards,
          check-ins e recomendações da IA.
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
          <div className="metric-trend">Persistido em localStorage</div>
        </article>
      </section>

      <ProfileSummaryCard />

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
    </div>
  );
}

export default ProfileSetupPage;