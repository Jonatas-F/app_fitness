function ProfileSetupPage() {
  return (
    <section className="glass-card card-padding mt-24">
      <div className="card-header">
        <div>
          <h3 className="card-title">Perfil do usuário</h3>
          <p className="card-subtitle">
            Estrutura inicial estabilizada para validação visual do app.
          </p>
        </div>
        <span className="badge badge-primary">Perfil</span>
      </div>

      <div className="grid grid-2">
        <div className="input-group">
          <label className="input-label">Objetivo principal</label>
          <select className="select-field" defaultValue="">
            <option value="">Selecione</option>
            <option value="emagrecimento">Emagrecimento</option>
            <option value="hipertrofia">Hipertrofia</option>
            <option value="condicionamento">Condicionamento</option>
          </select>
        </div>

        <div className="input-group">
          <label className="input-label">Peso atual</label>
          <input
            className="input-field"
            type="text"
            placeholder="Ex.: 84,6 kg"
          />
        </div>
      </div>

      <div className="data-list mt-24">
        <div className="data-row">
          <span>Status da página</span>
          <strong>Estável</strong>
        </div>
        <div className="data-row">
          <span>Função desta etapa</span>
          <strong>Validar base visual</strong>
        </div>
      </div>
    </section>
  );
}

export default ProfileSetupPage;