import { useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import ModulePageLayout from "../../../components/ModulePageLayout";
import { workoutsViews } from "../../../data/appData";
import { gymEquipmentCatalog, allGymEquipment } from "../../../data/gymEquipmentCatalog";
import {
  buildEquipmentAiContext,
  getAllEquipmentIds,
  loadGymEquipmentSelection,
  saveGymEquipmentSelection,
} from "../../../data/gymEquipmentStorage";
import "./WorkoutsPage.css";

function getWorkoutView(pathname, workoutId) {
  if (workoutId) return "detail";
  if (pathname.endsWith("/historico")) return "history";
  if (pathname.endsWith("/gerar")) return "generate";
  return "list";
}

function EquipmentCard({ item, selected, onToggle }) {
  return (
    <article className={`equipment-card ${selected ? "is-selected" : ""}`}>
      <label className="equipment-card__control">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(item.id)}
        />
        <span>
          <strong>{item.name}</strong>
          <small>{selected ? "Disponivel para IA" : "Nao usar no treino"}</small>
        </span>
      </label>

      <div className="equipment-card__image">
        {item.image ? (
          <img src={item.image} alt={`Aparelho ${item.name}`} />
        ) : (
          <div>
            <span>Imagem</span>
            <small>Adicionar foto do aparelho</small>
          </div>
        )}
      </div>
    </article>
  );
}

function GymEquipmentSection() {
  const [selectedIds, setSelectedIds] = useState(() => loadGymEquipmentSelection());
  const [openCategories, setOpenCategories] = useState(() =>
    gymEquipmentCatalog.slice(0, 2).map((category) => category.id)
  );
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const aiContext = useMemo(
    () => buildEquipmentAiContext(selectedIds),
    [selectedIds]
  );

  function updateSelection(nextIds) {
    setSelectedIds(saveGymEquipmentSelection(nextIds));
  }

  function handleToggle(id) {
    const next = selectedSet.has(id)
      ? selectedIds.filter((selectedId) => selectedId !== id)
      : [...selectedIds, id];

    updateSelection(next);
  }

  function handleSelectAll() {
    updateSelection(getAllEquipmentIds());
  }

  function handleClearAll() {
    updateSelection([]);
  }

  function toggleCategory(categoryId) {
    setOpenCategories((current) =>
      current.includes(categoryId)
        ? current.filter((id) => id !== categoryId)
        : [...current, categoryId]
    );
  }

  function handleSelectCategory(category) {
    const next = new Set(selectedIds);
    category.items.forEach((item) => next.add(item.id));
    updateSelection([...next]);
  }

  function handleClearCategory(category) {
    const categoryIds = new Set(category.items.map((item) => item.id));
    updateSelection(selectedIds.filter((id) => !categoryIds.has(id)));
  }

  return (
    <section className="gym-equipment glass-panel">
      <header className="gym-equipment__header">
        <div>
          <span className="gym-equipment__eyebrow">Academia do usuario</span>
          <h2>Aparelhos disponiveis para montar o treino</h2>
          <p>
            Tudo comeca selecionado. Desmarque o que nao existe na academia para
            a IA evitar exercicios com aparelhos indisponiveis.
          </p>
        </div>

        <aside className="gym-equipment__summary">
          <strong>
            {selectedIds.length}/{allGymEquipment.length}
          </strong>
          <span>aparelhos liberados</span>
          <small>{aiContext.unavailableEquipment.length} fora do treino</small>
        </aside>
      </header>

      <div className="gym-equipment__actions">
        <button type="button" className="primary-button" onClick={handleSelectAll}>
          Marcar todos
        </button>
        <button type="button" className="ghost-button" onClick={handleClearAll}>
          Desmarcar todos
        </button>
      </div>

      <div className="gym-equipment__ai-note">
        <strong>Regra para a IA</strong>
        <p>
          Priorizar aparelhos marcados. Aparelhos desmarcados devem ser
          substituidos por alternativas equivalentes.
        </p>
      </div>

      <div className="gym-equipment__categories">
        {gymEquipmentCatalog.map((category) => {
          const selectedInCategory = category.items.filter((item) =>
            selectedSet.has(item.id)
          ).length;
          const isOpen = openCategories.includes(category.id);

          return (
            <section
              key={category.id}
              className={`equipment-category ${isOpen ? "is-open" : ""}`}
            >
              <div className="equipment-category__header">
                <button
                  type="button"
                  className="equipment-category__toggle"
                  onClick={() => toggleCategory(category.id)}
                  aria-expanded={isOpen}
                >
                  <span className="equipment-category__chevron">
                    {isOpen ? "−" : "+"}
                  </span>
                  <span>
                    <strong>{category.title}</strong>
                    <small>
                      {selectedInCategory}/{category.items.length} disponiveis
                    </small>
                  </span>
                </button>

                <div className="equipment-category__actions">
                  <button type="button" onClick={() => handleSelectCategory(category)}>
                    Marcar grupo
                  </button>
                  <button type="button" onClick={() => handleClearCategory(category)}>
                    Desmarcar grupo
                  </button>
                </div>
              </div>

              {isOpen ? (
                <div className="equipment-category__grid">
                  {category.items.map((item) => (
                    <EquipmentCard
                      key={item.id}
                      item={item}
                      selected={selectedSet.has(item.id)}
                      onToggle={handleToggle}
                    />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </section>
  );
}

export default function WorkoutsPage() {
  const { pathname } = useLocation();
  const { workoutId } = useParams();

  const viewKey = getWorkoutView(pathname, workoutId);
  const content = { ...workoutsViews[viewKey] };

  if (workoutId) {
    content.title = `Treino ${workoutId}`;
    content.footerNote = `Rota dinamica funcionando em /treinos/${workoutId}. Depois ela deve buscar o treino real pelo id no backend.`;
  }

  return (
    <div className="workouts-page">
      <ModulePageLayout {...content} />
      {["list", "generate"].includes(viewKey) ? <GymEquipmentSection /> : null}
    </div>
  );
}
