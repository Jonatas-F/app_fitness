import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { formatCurrency, getAnnualPrice, getPlanById, subscriptionPlans } from "../../../data/plans";
import { signOut } from "../../../services/authService";
import { loadRemoteProfile, saveRemoteProfile, uploadProfileAvatar } from "../../../services/profileService";
import { createStripePortalSession } from "../../../services/stripeService";
import "./ProfilePage.css";

const PROFILE_PHOTO_KEY = "shapeCertoProfilePhoto";
const PROFILE_ACCOUNT_KEY = "shapeCertoProfileAccount";

const defaultAccount = {
  fullName: "",
  username: "",
  email: "",
  googleLinked: false,
  paymentMethod: "principal",
  activePlan: "intermediario",
  billingCycle: "monthly",
};

const paymentMethods = [
  { id: "principal", brand: "Visa", ending: "2847", label: "Cartao principal" },
  { id: "reserva", brand: "Mastercard", ending: "9132", label: "Cartao reserva" },
  { id: "novo", brand: "+", ending: "novo", label: "Adicionar novo cartao" },
];

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

function loadProfileAccount() {
  try {
    return { ...defaultAccount, ...JSON.parse(localStorage.getItem(PROFILE_ACCOUNT_KEY)) };
  } catch (error) {
    return defaultAccount;
  }
}

function saveProfileAccount(account) {
  localStorage.setItem(PROFILE_ACCOUNT_KEY, JSON.stringify(account));
  return account;
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
  const navigate = useNavigate();
  const [profilePhoto, setProfilePhoto] = useState(() => loadProfilePhoto());
  const [account, setAccount] = useState(() => loadProfileAccount());
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [accountMessage, setAccountMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [pendingPlan, setPendingPlan] = useState(() => loadProfileAccount().activePlan);
  const [pendingBillingCycle, setPendingBillingCycle] = useState(() => loadProfileAccount().billingCycle);
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
  const activePlan = getPlanById(account.activePlan);
  const selectedPlan = getPlanById(pendingPlan);
  const selectedPaymentMethod =
    paymentMethods.find((method) => method.id === account.paymentMethod) || paymentMethods[0];
  const selectedPlanPrice =
    pendingBillingCycle === "annual"
      ? getAnnualPrice(selectedPlan)
      : selectedPlan.monthlyPrice;

  useEffect(() => {
    let ignore = false;

    async function hydrateRemoteProfile() {
      const result = await loadRemoteProfile();

      if (ignore || result.skipped || result.error || !result.user) {
        return;
      }

      const remoteAccount = {
        ...loadProfileAccount(),
        fullName: result.profile?.full_name || result.user.user_metadata?.full_name || "",
        username: result.profile?.username || "",
        email: result.user.email || "",
        googleLinked: result.user.app_metadata?.provider === "google",
        activePlan: result.profile?.active_plan || "intermediario",
        billingCycle: result.profile?.billing_cycle || "monthly",
      };

      setAccount(saveProfileAccount(remoteAccount));
      setPendingPlan(remoteAccount.activePlan);
      setPendingBillingCycle(remoteAccount.billingCycle);

      if (result.profile?.avatar_path) {
        setProfilePhoto((current) => ({
          ...current,
          name: current?.name || "Foto do perfil",
          avatarPath: result.profile.avatar_path,
        }));
      }
    }

    hydrateRemoteProfile();

    return () => {
      ignore = true;
    };
  }, []);

  async function handlePhotoUpload(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setProfilePhoto(saveProfilePhoto({ name: file.name, dataUrl: reader.result }));
    };
    reader.readAsDataURL(file);

    const upload = await uploadProfileAvatar(file);

    if (upload.error) {
      setAccountMessage(upload.error.message);
      return;
    }

    if (!upload.skipped && upload.signedUrl) {
      setProfilePhoto(saveProfilePhoto({ name: file.name, dataUrl: upload.signedUrl, avatarPath: upload.path }));
      setAccountMessage("Foto enviada para o Supabase Storage.");
    }
  }

  function handleAccountChange(event) {
    const { name, value } = event.target;
    setAccountMessage("");
    setAccount((current) => ({ ...current, [name]: value }));
  }

  async function handleAccountSubmit(event) {
    event.preventDefault();
    setAccount(saveProfileAccount(account));
    const result = await saveRemoteProfile(account);

    if (result.error) {
      setAccountMessage(`Dados salvos localmente. Supabase: ${result.error.message}`);
      return;
    }

    setAccountMessage(
      result.skipped
        ? "Dados de perfil salvos neste dispositivo."
        : "Dados de perfil salvos no Supabase."
    );
  }

  function handlePasswordChange(event) {
    const { name, value } = event.target;
    setPasswordMessage("");
    setPasswordForm((current) => ({ ...current, [name]: value }));
  }

  function handlePasswordSubmit(event) {
    event.preventDefault();

    if (!passwordForm.newPassword || passwordForm.newPassword.length < 8) {
      setPasswordMessage("Use uma nova senha com pelo menos 8 caracteres.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage("A confirmacao precisa ser igual a nova senha.");
      return;
    }

    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setPasswordMessage("Solicitacao de alteracao preparada para a integracao de conta.");
  }

  function toggleGoogleLink() {
    const nextAccount = { ...account, googleLinked: !account.googleLinked };
    setAccount(saveProfileAccount(nextAccount));
    setAccountMessage(
      nextAccount.googleLinked
        ? "Conta marcada como vinculada ao Google."
        : "Vinculo com Google removido neste dispositivo."
    );
  }

  async function confirmPlanChange() {
    if (account.paymentMethod === "novo") {
      setAccountMessage("Adicione ou selecione um cartao salvo antes de confirmar a alteracao do plano.");
      return;
    }

    const nextAccount = {
      ...account,
      activePlan: pendingPlan,
      billingCycle: pendingBillingCycle,
    };

    setAccount(saveProfileAccount(nextAccount));
    const result = await saveRemoteProfile(nextAccount);

    if (result.error) {
      setAccountMessage(`Plano salvo localmente. Supabase: ${result.error.message}`);
      return;
    }

    setAccountMessage(
      `Plano ${getPlanById(pendingPlan).name} confirmado no pagamento ${
        pendingBillingCycle === "annual" ? "anual" : "mensal"
      } usando ${selectedPaymentMethod.label}.`
    );
  }

  async function openStripePortal() {
    setAccountMessage("Abrindo portal seguro do Stripe...");
    const result = await createStripePortalSession();

    if (result.error || !result.url) {
      setAccountMessage(
        `Nao foi possivel abrir o portal Stripe. ${
          result.error?.message || "Finalize uma assinatura pelo checkout primeiro."
        }`
      );
      return;
    }

    window.location.href = result.url;
  }

  async function handleLogout() {
    await signOut();
    navigate("/");
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
            <span>Conta e acesso</span>
            <h2>Nome, senha, Google e pagamento</h2>
            <p>
              Atualize as informacoes principais do perfil e deixe o acesso preparado para vincular
              com Gmail ou conta Google. O cartao escolhido fica salvo como preferencia de pagamento.
            </p>
          </div>
          <aside>
            <strong>{account.googleLinked ? "Google" : "Local"}</strong>
            <span>{account.googleLinked ? "conta vinculada" : "sem vinculo externo"}</span>
            <small>{account.email || "email nao informado"}</small>
          </aside>
        </div>

        <div className="profile-account-grid">
          <form className="profile-account-card" onSubmit={handleAccountSubmit}>
            <div className="profile-account-card__heading">
              <strong>Dados do usuario</strong>
              <small>Nome publico e identificadores</small>
            </div>

            <label className="profile-field">
              <span>Nome completo</span>
              <input
                type="text"
                name="fullName"
                value={account.fullName}
                onChange={handleAccountChange}
                placeholder="Ex.: Jonatas Silva"
              />
            </label>

            <label className="profile-field">
              <span>Nome de usuario</span>
              <input
                type="text"
                name="username"
                value={account.username}
                onChange={handleAccountChange}
                placeholder="Ex.: jonatas.silva"
              />
            </label>

            <label className="profile-field">
              <span>Email / Gmail</span>
              <input
                type="email"
                name="email"
                value={account.email}
                onChange={handleAccountChange}
                placeholder="usuario@gmail.com"
              />
            </label>

            <button type="submit" className="primary-button">
              Salvar dados
            </button>
              {accountMessage ? <small className="profile-form-message">{accountMessage}</small> : null}
          </form>

          <form className="profile-account-card" onSubmit={handlePasswordSubmit}>
            <div className="profile-account-card__heading">
              <strong>Alterar senha</strong>
              <small>Validacao local ate conectar backend</small>
            </div>

            <label className="profile-field">
              <span>Senha atual</span>
              <input
                type="password"
                name="currentPassword"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Digite a senha atual"
              />
            </label>

            <label className="profile-field">
              <span>Nova senha</span>
              <input
                type="password"
                name="newPassword"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                placeholder="Minimo de 8 caracteres"
              />
            </label>

            <label className="profile-field">
              <span>Confirmar nova senha</span>
              <input
                type="password"
                name="confirmPassword"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Repita a nova senha"
              />
            </label>

            <button type="submit" className="primary-button">
              Atualizar senha
            </button>
            {passwordMessage ? <small className="profile-form-message">{passwordMessage}</small> : null}
          </form>

          <article className={`profile-account-card profile-google-card ${account.googleLinked ? "is-linked" : ""}`}>
            <div className="profile-account-card__heading">
              <strong>Conta Google</strong>
              <small>Gmail, login social e sincronizacao futura</small>
            </div>

            <div className="profile-google-card__badge">
              <span>G</span>
              <div>
                <strong>{account.googleLinked ? "Vinculada ao Google" : "Vincular Gmail / Google"}</strong>
                <small>
                  {account.googleLinked
                    ? account.email || "Conta Google conectada"
                    : "Use para facilitar login e recuperacao de acesso"}
                </small>
              </div>
            </div>

            <button type="button" className="ghost-button" onClick={toggleGoogleLink}>
              {account.googleLinked ? "Desvincular Google" : "Vincular Google"}
            </button>
          </article>

          <article className="profile-account-card profile-payment-card">
            <div className="profile-account-card__heading">
              <strong>Dados de pagamento</strong>
              <small>Cartao e cobranca gerenciados pelo Stripe</small>
            </div>

            <div className="payment-methods">
              {[
                ...paymentMethods,
              ].map((method) => (
                <button
                  key={method.id}
                  type="button"
                  className={`payment-method ${account.paymentMethod === method.id ? "is-selected" : ""}`}
                  onClick={() => {
                    const nextAccount = { ...account, paymentMethod: method.id };
                    setAccount(saveProfileAccount(nextAccount));
                    setAccountMessage("Metodo de pagamento preferencial atualizado.");
                  }}
                >
                  <span>{method.brand}</span>
                  <div>
                    <strong>{method.label}</strong>
                    <small>
                      {method.id === "novo" ? "preparado para checkout" : `final ${method.ending}`}
                    </small>
                  </div>
                </button>
              ))}
            </div>

            <button type="button" className="ghost-button" onClick={openStripePortal}>
              Gerenciar pagamento no Stripe
            </button>
          </article>

          <article className="profile-account-card profile-plan-card">
            <div className="profile-account-card__heading">
              <strong>Plano ativo</strong>
              <small>Assinatura atual e limites de uso</small>
            </div>

            <div className="profile-plan-card__current">
              <span>{activePlan.name}</span>
              <strong>{activePlan.tokens}</strong>
              <small>
                {activePlan.workouts} | {account.billingCycle === "annual" ? "Anual" : "Mensal"}
              </small>
            </div>

            <label className="profile-field">
              <span>Novo plano</span>
              <select
                value={pendingPlan}
                onChange={(event) => setPendingPlan(event.target.value)}
              >
                {subscriptionPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - {formatCurrency(plan.monthlyPrice)}/mes
                  </option>
                ))}
              </select>
            </label>

            <div className="profile-plan-card__billing">
              <button
                type="button"
                className={pendingBillingCycle === "monthly" ? "is-selected" : ""}
                onClick={() => setPendingBillingCycle("monthly")}
              >
                <strong>Mensal</strong>
                <small>{formatCurrency(selectedPlan.monthlyPrice)} recorrente</small>
              </button>
              <button
                type="button"
                className={pendingBillingCycle === "annual" ? "is-selected" : ""}
                onClick={() => setPendingBillingCycle("annual")}
              >
                <strong>Anual</strong>
                <small>{formatCurrency(getAnnualPrice(selectedPlan))} com 20% off</small>
              </button>
            </div>

            <div className="profile-plan-card__confirm">
              <span>Confirmacao</span>
              <strong>{formatCurrency(selectedPlanPrice)}</strong>
              <small>
                Cobrar no {selectedPaymentMethod.label}
                {selectedPaymentMethod.id !== "novo" ? ` final ${selectedPaymentMethod.ending}` : ""}.
              </small>
            </div>

            <button type="button" className="primary-button" onClick={confirmPlanChange}>
              Confirmar alteracao do plano
            </button>

            <small className="profile-form-message">
              A cobranca real sera feita pelo gateway quando o backend de pagamentos for conectado.
            </small>
          </article>

          <article className="profile-account-card profile-logout-card">
            <div className="profile-account-card__heading">
              <strong>Sair da conta</strong>
              <small>Voltar para a pagina inicial e encerrar a sessao visual.</small>
            </div>

            <button type="button" className="profile-logout-button" onClick={handleLogout}>
              Sair / deslogar
            </button>
          </article>
        </div>
      </section>

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
