import { useMemo, useState } from "react";
import logo from "../../../assets/logo.svg";
import { foodMarkOptions, foodPreferencesCatalog } from "../../../data/foodPreferencesCatalog";
import {
  buildFoodPreferencesContext,
  loadFoodPreferences,
  saveFoodPreferences,
} from "../../../data/foodPreferencesStorage";
import { allGymEquipment, gymEquipmentCatalog } from "../../../data/gymEquipmentCatalog";
import {
  buildEquipmentAiContext,
  getAllEquipmentIds,
  loadGymEquipmentSelection,
  saveGymEquipmentSelection,
} from "../../../data/gymEquipmentStorage";
import "./ProfilePage.css";

const PROFILE_PHOTO_KEY = "shapeCertoProfilePhoto";

function loadProfilePhoto() {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_PHOTO_KEY)) || null;
  } catch (error) {
    return null;
  }
}

function saveProfilePhoto(photo) {
  localStorage.setItem(PROFILE_PHOTO_KEY, JSON.stringify(photo));
  return photo;
}

function EquipmentCard({ item, selected, onToggle }) {
  return (
    <article className={`profile-equipment-card ${selected ? "is-selected" : ""}`}>
      <label className="profile-equipment-card__control">
        <input type="checkbox" checked={selected} onChange={() => onToggle(item.id)} />
        <span>
          <strong>{item.name}</strong>
          <small>{selected ? "Disponivel para o treino" : "Nao usar no treino"}</small>
        </span>
      </label>

      <div className="profile-equipment-card__image">
        {item.image ? (
          <img src={item.image} alt={`Aparelho ${item.name}`} />
        ) : (
          <div>
            <span>Foto</span>
            <small>Espaco para imagem do aparelho</small>
          </div>
        )}
      </div>
    </article>
  );
}

function FoodPreferenceCard({ item, selectedMark, onChange }) {
  const activeMark = foodMarkOptions.find((option) => option.id === selectedMark);

  return (
    <article className={`food-card ${activeMark ? `has-mark is-${activeMark.tone}` : ""}`}>
      <div className="food-card__heading">
        <strong>{item.name}</strong>
        <small>{activeMark ? activeMark.label : "Sem marcacao"}</small>
      </div>

      <div className="food-card__marks">
        {foodMarkOptions
          .filter((option) => item.allowedMarks.includes(option.id))
          .map((option) => (
            <button
              key={option.id}
              type="button"
              className={`food-mark is-${option.tone} ${selectedMark === option.id ? "is-active" : ""}`}
              onClick={() => onChange(item.id, option.id)}
            >
              {option.label}
            </button>
          ))}
        {selectedMark ? (
          <button type="button" className="food-mark is-clear" onClick={() => onChange(item.id, null)}>
            Limpar
          </button>
        ) : null}
      </div>
    </article>
  );
}

export default function ProfilePage() {
  const [profilePhoto, setProfilePhoto] = useState(() => loadProfilePhoto());
  const [selectedEquipmentIds, setSelectedEquipmentIds] = useState(() => loadGymEquipmentSelection());
  const [openEquipmentGroups, setOpenEquipmentGroups] = useState([]);
  const [foodPreferences, setFoodPreferences] = useState(() => loadFoodPreferences());
  const [openFoodGroups, setOpenFoodGroups] = useState([]);

  const selectedEquipmentSet = useMemo(() => new Set(selectedEquipmentIds), [selectedEquipmentIds]);
  const equipmentContext = useMemo(
    () => buildEquipmentAiContext(selectedEquipmentIds),
    [selectedEquipmentIds]
  );
  const foodContext = useMemo(() => buildFoodPreferencesContext(foodPreferences), [foodPreferences]);

  function handlePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(saveProfilePhoto({ name: file.name, dataUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  function updateEquipmentSelection(nextIds) {
    setSelectedEquipmentIds(saveGymEquipmentSelection(nextIds));
  }

  function handleEquipmentToggle(id) {
    const next = selectedEquipmentSet.has(id)
      ? selectedEquipmentIds.filter((selectedId) => selectedId !== id)
      : [...selectedEquipmentIds, id];

    updateEquipmentSelection(next);
  }

  function toggleEquipmentGroup(groupId) {
    setOpenEquipmentGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  }

  function selectEquipmentGroup(category) {
    const next = new Set(selectedEquipmentIds);
    category.items.forEach((item) => next.add(item.id));
    updateEquipmentSelection([...next]);
  }

  function clearEquipmentGroup(category) {
    const categoryIds = new Set(category.items.map((item) => item.id));
    updateEquipmentSelection(selectedEquipmentIds.filter((id) => !categoryIds.has(id)));
  }

  function toggleFoodGroup(groupId) {
    setOpenFoodGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId]
    );
  }

  function handleFoodMark(itemId, mark) {
    const next = { ...foodPreferences };

    if (mark) {
      next[itemId] = mark;
    } else {
      delete next[itemId];
    }

    setFoodPreferences(saveFoodPreferences(next));
  }

  function markFoodGroup(group, mark) {
    const next = { ...foodPreferences };
    group.subgroups.forEach((subgroup) => {
      subgroup.items.forEach((item) => {
        if (item.allowedMarks.includes(mark)) {
          next[item.id] = mark;
        }
      });
    });
    setFoodPreferences(saveFoodPreferences(next));
  }

  function clearFoodGroup(group) {
    const next = { ...foodPreferences };
    group.subgroups.forEach((subgroup) => {
      subgroup.items.forEach((item) => {
        delete next[item.id];
      });
    });
    setFoodPreferences(saveFoodPreferences(next));
  }

  return (
    <section className="profile-page">
      <header className="profile-hero glass-panel">
        <div className="profile-hero__copy">
          <span>Perfil</span>
          <h1>Dados permanentes para treino, dieta e preferencias.</h1>
          <p>
            Centralize foto, aparelhos disponiveis na academia e preferencias alimentares para o Personal
            Virtual montar protocolos mais coerentes.
          </p>
        </div>

        <aside className="profile-photo-card">
          <div className="profile-photo-card__preview">
            {profilePhoto?.dataUrl ? (
              <img src={profilePhoto.dataUrl} alt="Foto de perfil" />
            ) : (
              <img src={logo} alt="Shape Certo" />
            )}
          </div>
          <strong>{profilePhoto?.name || "Foto do usuario"}</strong>
          <label className="profile-photo-card__button">
            Enviar foto
            <input type="file" accept="image/*" onChange={handlePhotoUpload} />
          </label>
        </aside>
      </header>

      <section className="profile-section glass-panel">
        <div className="profile-section__heading">
          <div>
            <span>Academia do usuario</span>
            <h2>Aparelhos disponiveis para montar o treino</h2>
            <p>
              Tudo comeca selecionado. Desmarque o que nao existe na academia para evitar exercicios
              impossiveis no protocolo.
            </p>
          </div>
          <aside>
            <strong>
              {selectedEquipmentIds.length}/{allGymEquipment.length}
            </strong>
            <span>aparelhos liberados</span>
            <small>{equipmentContext.unavailableEquipment.length} fora do treino</small>
          </aside>
        </div>

        <div className="profile-actions">
          <button type="button" className="primary-button" onClick={() => updateEquipmentSelection(getAllEquipmentIds())}>
            Marcar todos
          </button>
          <button type="button" className="ghost-button" onClick={() => updateEquipmentSelection([])}>
            Desmarcar todos
          </button>
        </div>

        <div className="profile-categories">
          {gymEquipmentCatalog.map((category) => {
            const selectedInCategory = category.items.filter((item) =>
              selectedEquipmentSet.has(item.id)
            ).length;
            const isOpen = openEquipmentGroups.includes(category.id);

            return (
              <section key={category.id} className={`profile-category ${isOpen ? "is-open" : ""}`}>
                <div className="profile-category__header">
                  <button
                    type="button"
                    className="profile-category__toggle"
                    onClick={() => toggleEquipmentGroup(category.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="profile-category__chevron">{isOpen ? "-" : "+"}</span>
                    <span>
                      <strong>{category.title}</strong>
                      <small>
                        {selectedInCategory}/{category.items.length} disponiveis
                      </small>
                    </span>
                  </button>

                  <div className="profile-category__actions">
                    <button type="button" onClick={() => selectEquipmentGroup(category)}>
                      Marcar grupo
                    </button>
                    <button type="button" onClick={() => clearEquipmentGroup(category)}>
                      Desmarcar grupo
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="profile-equipment-grid">
                    {category.items.map((item) => (
                      <EquipmentCard
                        key={item.id}
                        item={item}
                        selected={selectedEquipmentSet.has(item.id)}
                        onToggle={handleEquipmentToggle}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>

      <section className="profile-section glass-panel">
        <div className="profile-section__heading">
          <div>
            <span>Preferencias alimentares</span>
            <h2>Gostos, restricoes e alimentos para priorizar</h2>
            <p>
              Marque alergias, intolerancias, itens evitados e alimentos favoritos. Esses dados ficam
              prontos para alimentar a dieta personalizada.
            </p>
          </div>
          <aside>
            <strong>{foodContext.selectedPreferences.length}</strong>
            <span>marcacoes salvas</span>
            <small>organizadas por grupo alimentar</small>
          </aside>
        </div>

        <div className="profile-categories">
          {foodPreferencesCatalog.map((group) => {
            const groupItems = group.subgroups.flatMap((subgroup) => subgroup.items);
            const markedInGroup = groupItems.filter((item) => foodPreferences[item.id]).length;
            const isOpen = openFoodGroups.includes(group.id);

            return (
              <section key={group.id} className={`profile-category ${isOpen ? "is-open" : ""}`}>
                <div className="profile-category__header">
                  <button
                    type="button"
                    className="profile-category__toggle"
                    onClick={() => toggleFoodGroup(group.id)}
                    aria-expanded={isOpen}
                  >
                    <span className="profile-category__chevron">{isOpen ? "-" : "+"}</span>
                    <span>
                      <strong>{group.title}</strong>
                      <small>
                        {markedInGroup}/{groupItems.length} marcados
                      </small>
                    </span>
                  </button>

                  <div className="profile-category__actions">
                    <button type="button" onClick={() => markFoodGroup(group, "gosta")}>
                      Gosto do grupo
                    </button>
                    <button type="button" onClick={() => clearFoodGroup(group)}>
                      Limpar grupo
                    </button>
                  </div>
                </div>

                {isOpen ? (
                  <div className="food-subgroups">
                    {group.subgroups.map((subgroup) => (
                      <section key={subgroup.title} className="food-subgroup">
                        <h3>{subgroup.title}</h3>
                        <div className="food-grid">
                          {subgroup.items.map((item) => (
                            <FoodPreferenceCard
                              key={item.id}
                              item={item}
                              selectedMark={foodPreferences[item.id]}
                              onChange={handleFoodMark}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      </section>
    </section>
  );
}
