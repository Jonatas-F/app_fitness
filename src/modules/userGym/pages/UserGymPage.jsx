import { useMemo, useState } from "react";
import { gymEquipmentCatalog, allGymEquipment } from "../../../data/gymEquipmentCatalog";
import {
  buildEquipmentAiContext,
  getAllEquipmentIds,
  loadGymEquipmentSelection,
  saveGymEquipmentSelection,
} from "../../../data/gymEquipmentStorage";
import "./UserGymPage.css";

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

export default function UserGymPage() {
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
    <section className="user-gym-page">
      <header className="user-gym-hero glass-panel">
        <div>
          <span>Academia do usuário</span>
          <h1>Aparelhos disponíveis para a IA montar o treino.</h1>
          <p>
            Tudo começa selecionado. Desmarque o que não existe na academia para
            evitar exercícios que o usuário não consegue executar.
          </p>
        </div>

        <aside>
          <strong>
            {selectedIds.length}/{allGymEquipment.length}
          </strong>
          <span>aparelhos liberados</span>
          <small>{aiContext.unavailableEquipment.length} fora do treino</small>
        </aside>
      </header>

      <div className="user-gym-actions">
        <button type="button" className="primary-button" onClick={() => updateSelection(getAllEquipmentIds())}>
          Marcar todos
        </button>
        <button type="button" className="ghost-button" onClick={() => updateSelection([])}>
          Desmarcar todos
        </button>
      </div>

      <div className="user-gym-ai-note glass-panel">
        <strong>Regra para a IA</strong>
        <p>
          Priorizar aparelhos marcados. Aparelhos desmarcados devem ser
          substituídos por alternativas equivalentes.
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
                      {selectedInCategory}/{category.items.length} disponíveis
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
