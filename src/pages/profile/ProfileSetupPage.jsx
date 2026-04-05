function ProfileSetupPage() {
  return (
    <div className="grid mt-24">
      <section className="hero-card">
        <span className="eyebrow">Perfil inteligente</span>
        <h2 className="hero-title">
          Base do usuário para personalização de treino, dieta e progresso
        </h2>
        <p className="hero-description">
          Esta área reúne os dados principais do usuário para que o app consiga
          evoluir depois para bioimpedância, dieta personalizada, dashboards,
          check-ins e recomendações da IA.
        </p>

        <div className="hero-actions">
          <button className="primary-button" type="button">
            Salvar perfil
          </button>
          <button className="ghost-button" type="button">
            Revisar dados
          </button>
        </div>
      </section>

      <section className="grid grid-4">
        <article className="metric-card">
          <div className="metric-label">Objetivo principal</div>
          <div className="metric-value">Hipertrofia</div>
          <div className="metric-trend">Meta ativa do usuário</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Peso atual</div>
          <div className="metric-value">84,6 kg</div>
          <div className="metric-trend">Última atualização corporal</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Altura</div>
          <div className="metric-value">1,78 m</div>
          <div className="metric-trend">Base para cálculos futuros</div>
        </article>

        <article className="metric-card">
          <div className="metric-label">Plano atual</div>
          <div className="metric-value">Personalizado</div>
          <div className="metric-trend">Preparado para IA</div>
        </article>
      </section>

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
            />
          </div>

          <div className="input-group">
            <label className="input-label">Idade</label>
            <input
              className="input-field"
              type="number"
              placeholder="Ex.: 29"
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
            />
          </div>

          <div className="input-group">
            <label className="input-label">Peso atual</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 84,6 kg"
            />
          </div>

          <div className="input-group">
            <label className="input-label">Sexo</label>
            <select className="select-field" defaultValue="">
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
            <select className="select-field" defaultValue="">
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
            <select className="select-field" defaultValue="">
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
            <select className="select-field" defaultValue="">
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
            />
          </div>

          <div className="input-group">
            <label className="input-label">Água por dia</label>
            <input
              className="input-field"
              type="text"
              placeholder="Ex.: 3 litros"
            />
          </div>
        </div>

        <div className="input-group mt-16">
          <label className="input-label">Preferências e restrições</label>
          <textarea
            className="textarea-field"
            placeholder="Ex.: prefiro frango, arroz e ovos. Evitar lactose."
          />
        </div>
      </section>
    </div>
  );
}

export default ProfileSetupPage;