import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import PaymentCard3D from "../../../components/ui/PaymentCard3D";
import logo from "../../../assets/logo.svg";
import { foodMarkOptions, foodPreferencesCatalog } from "../../../data/foodPreferencesCatalog";
import {
  buildFoodPreferencesContext,
  hydrateFoodPreferencesFromApi,
  loadFoodPreferences,
  saveFoodPreferences,
} from "../../../data/foodPreferencesStorage";
import { allGymEquipment, gymEquipmentCatalog } from "../../../data/gymEquipmentCatalog";
import {
  buildEquipmentAiContext,
  getAllEquipmentIds,
  hydrateGymEquipmentSelectionFromApi,
  loadGymEquipmentSelection,
  saveGymEquipmentSelection,
} from "../../../data/gymEquipmentStorage";
import { formatCurrency, getAnnualPrice, getPlanById, subscriptionPlans } from "../../../data/plans";
import { signOut } from "../../../services/authService";
import { savePlanChangeAcceptance } from "../../../services/planAcceptanceService";
import { loadRemoteProfile, saveRemoteProfile, uploadProfileAvatar } from "../../../services/profileService";
import { createStripePortalSession } from "../../../services/stripeService";
import "./ProfilePage.css";

const PROFILE_PHOTO_KEY = "shapeCertoProfilePhoto";
const PROFILE_ACCOUNT_KEY = "shapeCertoProfileAccount";
const PROFILE_PAYMENT_METHODS_KEY = "shapeCertoPaymentMethods";

const defaultAccount = {
  fullName: "",
  username: "",
  email: "",
  googleLinked: false,
  paymentMethod: "principal",
  activePlan: "intermediario",
  billingCycle: "monthly",
};

const defaultPaymentMethods = [
  {
    id: "principal",
    brand: "Visa",
    ending: "2847",
    label: "Cartao principal",
    holder: "Jonatas Ferreira",
    expires: "12/29",
  },
  {
    id: "reserva",
    brand: "Mastercard",
    ending: "9132",
    label: "Cartao reserva",
    holder: "Jonatas Ferreira",
    expires: "08/28",
  },
];

const addPaymentMethodOption = {
  id: "novo",
  brand: "+",
  ending: "novo",
  label: "Adicionar novo cartao",
};

const emptyPaymentMethodDraft = {
  id: "",
  label: "",
  brand: "Visa",
  ending: "",
  holder: "",
  expires: "",
};

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

function normalizePaymentMethod(method) {
  return {
    id: method.id,
    brand: method.brand === "Mastercard" ? "Mastercard" : "Visa",
    ending: String(method.ending || "").replace(/\D/g, "").slice(-4),
    label: method.label || "Cartao salvo",
    holder: method.holder || "Titular nao informado",
    expires: method.expires || "--/--",
  };
}

function loadPaymentMethods() {
  try {
    const storedMethods = localStorage.getItem(PROFILE_PAYMENT_METHODS_KEY);

    if (!storedMethods) {
      return defaultPaymentMethods;
    }

    const parsedMethods = JSON.parse(storedMethods);

    if (!Array.isArray(parsedMethods)) {
      return defaultPaymentMethods;
    }

    return parsedMethods
      .map(normalizePaymentMethod)
      .filter((method) => method.id && method.ending.length === 4);
  } catch (error) {
    return defaultPaymentMethods;
  }
}

function savePaymentMethods(methods) {
  localStorage.setItem(PROFILE_PAYMENT_METHODS_KEY, JSON.stringify(methods));
  return methods;
}

function createPaymentDraft(method = {}) {
  return {
    ...emptyPaymentMethodDraft,
    ...method,
    ending: method.ending && method.ending !== "novo" ? String(method.ending).replace(/\D/g, "").slice(-4) : "",
  };
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
  const [savedPaymentMethods, setSavedPaymentMethods] = useState(() => loadPaymentMethods());
  const [paymentModalMode, setPaymentModalMode] = useState(null);
  const [paymentDraft, setPaymentDraft] = useState(() => createPaymentDraft());
  const [planConfirmOpen, setPlanConfirmOpen] = useState(false);
  const [planTermsAccepted, setPlanTermsAccepted] = useState(false);
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
  const paymentMethodOptions = useMemo(
    () => [...savedPaymentMethods, addPaymentMethodOption],
    [savedPaymentMethods]
  );
  const selectedPaymentMethod =
    savedPaymentMethods.find((method) => method.id === account.paymentMethod) ||
    savedPaymentMethods[0] ||
    addPaymentMethodOption;
  const selectedPlanPrice =
    pendingBillingCycle === "annual"
      ? getAnnualPrice(selectedPlan)
      : selectedPlan.monthlyPrice;

  useEffect(() => {
    let ignore = false;

    async function hydrateRemoteProfile() {
      const [result, equipmentResult, foodResult] = await Promise.all([
        loadRemoteProfile(),
        hydrateGymEquipmentSelectionFromApi(),
        hydrateFoodPreferencesFromApi(),
      ]);

      if (!ignore && !equipmentResult.error) {
        setSelectedEquipmentIds(equipmentResult.selectedIds);
      }

      if (!ignore && !foodResult.error) {
        setFoodPreferences(foodResult.preferences);
      }

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

  function handlePaymentMethodSelect(method) {
    if (method.id === "novo") {
      setPaymentDraft(createPaymentDraft());
      setPaymentModalMode("add");
      setAccountMessage("");
      return;
    }

    if (account.paymentMethod === method.id) {
      setPaymentDraft(createPaymentDraft(method));
      setPaymentModalMode("edit");
      setAccountMessage("");
      return;
    }

    setAccount(saveProfileAccount({ ...account, paymentMethod: method.id }));
    setPaymentModalMode(null);
    setAccountMessage(`${method.label} selecionado para cobrancas.`);
  }

  function closePaymentModal() {
    setPaymentModalMode(null);
    setPaymentDraft(createPaymentDraft());
  }

  function handlePaymentDraftChange(event) {
    const { name, value } = event.target;
    setAccountMessage("");
    setPaymentDraft((current) => ({
      ...current,
      [name]: name === "ending" ? value.replace(/\D/g, "").slice(0, 4) : value,
    }));
  }

  function handlePaymentDraftSubmit(event) {
    event.preventDefault();

    const ending = paymentDraft.ending.replace(/\D/g, "").slice(-4);

    if (ending.length !== 4) {
      setAccountMessage("Informe os 4 ultimos digitos do cartao.");
      return;
    }

    const method = {
      id: paymentModalMode === "edit" ? paymentDraft.id : `card-${Date.now()}`,
      brand: paymentDraft.brand,
      ending,
      label: paymentDraft.label || `${paymentDraft.brand} final ${ending}`,
      holder: paymentDraft.holder || "Titular nao informado",
      expires: paymentDraft.expires || "--/--",
    };
    const updatedMethods =
      paymentModalMode === "edit"
        ? savedPaymentMethods.map((savedMethod) => (savedMethod.id === method.id ? method : savedMethod))
        : [...savedPaymentMethods, method];
    const nextAccount = { ...account, paymentMethod: method.id };

    setSavedPaymentMethods(savePaymentMethods(updatedMethods));
    setAccount(saveProfileAccount(nextAccount));
    closePaymentModal();
    setAccountMessage(
      paymentModalMode === "edit"
        ? "Dados do cartao atualizados."
        : "Novo cartao adicionado e definido como metodo preferencial."
    );
  }

  function handleDeletePaymentMethod() {
    const methodId = paymentDraft.id;

    if (!methodId) {
      closePaymentModal();
      return;
    }

    const updatedMethods = savePaymentMethods(savedPaymentMethods.filter((method) => method.id !== methodId));
    const nextSelectedMethod = updatedMethods[0]?.id || "novo";

    setSavedPaymentMethods(updatedMethods);

    if (account.paymentMethod === methodId) {
      setAccount(saveProfileAccount({ ...account, paymentMethod: nextSelectedMethod }));
    }

    closePaymentModal();
    setAccountMessage("Cartao removido dos metodos salvos.");
  }

  function openPlanChangeConfirmation() {
    const hasSavedPaymentMethod = savedPaymentMethods.some((method) => method.id === account.paymentMethod);

    if (!hasSavedPaymentMethod) {
      setAccountMessage("Adicione ou selecione um cartao salvo antes de confirmar a alteracao do plano.");
      return;
    }

    setPlanTermsAccepted(false);
    setPlanConfirmOpen(true);
  }

  async function confirmPlanChange() {
    if (!planTermsAccepted) {
      setAccountMessage("Aceite os termos da alteracao do plano para continuar.");
      return;
    }

    const acceptedTermsText =
      "Li e aceito que a alteracao do plano pode mudar valores, recorrencia, limites de tokens e acessos disponiveis na plataforma.";
    const acceptanceRecord = {
      previousPlan: account.activePlan,
      previousBillingCycle: account.billingCycle,
      nextPlan: pendingPlan,
      nextBillingCycle: pendingBillingCycle,
      paymentMethodLabel: selectedPaymentMethod.label,
      paymentMethodLast4: selectedPaymentMethod.id !== "novo" ? selectedPaymentMethod.ending : null,
      acceptedTermsText,
      acceptedAt: new Date().toISOString(),
      metadata: {
        previousPlanName: activePlan.name,
        nextPlanName: selectedPlan.name,
        selectedPlanPrice,
      },
    };
    const nextAccount = {
      ...account,
      activePlan: pendingPlan,
      billingCycle: pendingBillingCycle,
    };

    const acceptanceResult = await savePlanChangeAcceptance(acceptanceRecord);
    setAccount(saveProfileAccount(nextAccount));
    const result = await saveRemoteProfile(nextAccount);
    setPlanConfirmOpen(false);

    if (result.error) {
      setAccountMessage(`Plano salvo localmente. Supabase: ${result.error.message}`);
      return;
    }

    setAccountMessage(
      `Plano ${getPlanById(pendingPlan).name} confirmado no pagamento ${
        pendingBillingCycle === "annual" ? "anual" : "mensal"
      } usando ${selectedPaymentMethod.label}.${
        acceptanceResult.error ? ` Historico local salvo; Supabase: ${acceptanceResult.error.message}` : ""
      }`
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

      <section className="profile-section profile-account-section glass-panel">
        <div className="profile-section__heading">
          <div>
            <span>Conta e acesso</span>
            <h2>Perfil, acesso e cobranca</h2>
            <p>
              Os dados ficam organizados em blocos recolhidos para reduzir a rolagem no celular.
            </p>
          </div>
          <aside>
            <strong>{activePlan.name}</strong>
            <span>{account.billingCycle === "annual" ? "pagamento anual" : "pagamento mensal"}</span>
            <small>{account.email || "email nao informado"}</small>
          </aside>
        </div>

        <div className="profile-compact-stack">
          <details className="profile-compact-panel">
            <summary className="profile-compact-summary">
              <span className="profile-compact-summary__icon">+</span>
              <span>
                <strong>Dados do usuario e senha</strong>
                <small>{account.username || account.fullName || "Editar nome, email e acesso"}</small>
              </span>
              <em>Recolhido</em>
            </summary>

            <div className="profile-compact-panel__body profile-dual-grid">
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
            </div>
          </details>

          <details className={`profile-compact-panel profile-google-card ${account.googleLinked ? "is-linked" : ""}`}>
            <summary className="profile-compact-summary">
              <span className="profile-compact-summary__icon">+</span>
              <span>
                <strong>Vinculo de contas</strong>
                <small>{account.googleLinked ? "Google conectado" : "Google nao vinculado"}</small>
              </span>
              <em>{account.googleLinked ? "Ativo" : "Opcional"}</em>
            </summary>

            <div className="profile-compact-panel__body">
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
            </div>
          </details>

          <details className="profile-compact-panel profile-plan-card">
            <summary className="profile-compact-summary">
              <span className="profile-compact-summary__icon">+</span>
              <span>
                <strong>Plano e pagamento</strong>
                <small>
                  {activePlan.name} | {selectedPaymentMethod.label}
                </small>
              </span>
              <em>{account.billingCycle === "annual" ? "Anual" : "Mensal"}</em>
            </summary>

            <div className="profile-compact-panel__body profile-payment-plan-grid">
              <article className="profile-account-card profile-payment-card">
                <div className="profile-account-card__heading">
                  <strong>Dados de pagamento</strong>
                  <small>Cartao e cobranca gerenciados pelo Stripe</small>
                </div>

                <div className="payment-methods">
                  {paymentMethodOptions.map((method) => (
                    <PaymentCard3D
                      key={method.id}
                      method={method}
                      selected={account.paymentMethod === method.id}
                      onSelect={handlePaymentMethodSelect}
                    />
                  ))}
                </div>

                <button type="button" className="ghost-button" onClick={openStripePortal}>
                  Gerenciar pagamento no Stripe
                </button>
              </article>

              <article className="profile-account-card profile-plan-card__details">
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
                  <select value={pendingPlan} onChange={(event) => setPendingPlan(event.target.value)}>
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

                <button type="button" className="primary-button" onClick={openPlanChangeConfirmation}>
                  Confirmar alteracao do plano
                </button>
              </article>
            </div>
          </details>

          {accountMessage ? <small className="profile-form-message profile-status-message">{accountMessage}</small> : null}

          <article className="profile-logout-card">
            <div>
              <strong>Sair da conta</strong>
              <small>Encerra a sessao visual e volta para a home.</small>
            </div>

            <button type="button" className="profile-logout-button" onClick={handleLogout}>
              Sair / deslogar
            </button>
          </article>
        </div>
      </section>

      <details className="profile-section profile-collapsible-section glass-panel">
        <summary className="profile-section-summary">
          <span className="profile-compact-summary__icon">+</span>
          <span>
            <strong>Academia do usuario</strong>
            <small>
              {selectedEquipmentIds.length}/{allGymEquipment.length} aparelhos liberados
            </small>
          </span>
          <em>{equipmentContext.unavailableEquipment.length} fora do treino</em>
        </summary>

        <div className="profile-collapsible-section__body">
          <div className="profile-section__heading profile-section__heading--compact">
            <div>
              <span>Aparelhos</span>
              <h2>Aparelhos disponiveis para montar o treino</h2>
              <p>
                Tudo comeca selecionado. Desmarque o que nao existe na academia para evitar exercicios
                impossiveis no protocolo.
              </p>
            </div>
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
        </div>
      </details>

      <details className="profile-section profile-collapsible-section glass-panel">
        <summary className="profile-section-summary">
          <span className="profile-compact-summary__icon">+</span>
          <span>
            <strong>Preferencias alimentares</strong>
            <small>{foodContext.selectedPreferences.length} marcacoes salvas</small>
          </span>
          <em>{foodPreferencesCatalog.length} grupos</em>
        </summary>

        <div className="profile-collapsible-section__body">
          <div className="profile-section__heading profile-section__heading--compact">
            <div>
              <span>Alimentacao</span>
              <h2>Gostos, restricoes e alimentos para priorizar</h2>
              <p>
                Marque alergias, intolerancias, itens evitados e alimentos favoritos. Esses dados ficam
                prontos para alimentar a dieta personalizada.
              </p>
            </div>
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
        </div>
      </details>

      <AnimatePresence>
        {paymentModalMode ? (
          <motion.div
            className="profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closePaymentModal}
          >
            <motion.form
              className="profile-modal payment-modal"
              onSubmit={handlePaymentDraftSubmit}
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="profile-modal__heading">
                <div>
                  <span>{paymentModalMode === "edit" ? "Cartao selecionado" : "Novo metodo"}</span>
                  <h2>
                    {paymentModalMode === "edit" ? "Alterar dados do cartao" : "Adicionar novo cartao"}
                  </h2>
                  <p>
                    A cobranca real deve continuar no Stripe. Aqui ficam apenas os dados visuais usados no
                    perfil.
                  </p>
                </div>
                <button type="button" className="profile-modal__close" onClick={closePaymentModal}>
                  x
                </button>
              </div>

              <div className="payment-modal__preview" aria-hidden="true">
                <span>{paymentDraft.brand}</span>
                <strong>{paymentDraft.ending ? `**** **** **** ${paymentDraft.ending}` : "**** **** **** ----"}</strong>
                <small>{paymentDraft.holder || "Nome do titular"}</small>
              </div>

              <div className="payment-add-form__grid">
                <label className="profile-field">
                  <span>Apelido do cartao</span>
                  <input
                    type="text"
                    name="label"
                    value={paymentDraft.label}
                    onChange={handlePaymentDraftChange}
                    placeholder="Ex.: Cartao principal"
                  />
                </label>

                <label className="profile-field">
                  <span>Bandeira</span>
                  <select name="brand" value={paymentDraft.brand} onChange={handlePaymentDraftChange}>
                    <option value="Visa">Visa</option>
                    <option value="Mastercard">Mastercard</option>
                  </select>
                </label>

                <label className="profile-field">
                  <span>Ultimos 4 digitos</span>
                  <input
                    type="text"
                    name="ending"
                    inputMode="numeric"
                    value={paymentDraft.ending}
                    onChange={handlePaymentDraftChange}
                    placeholder="2847"
                  />
                </label>

                <label className="profile-field">
                  <span>Validade</span>
                  <input
                    type="text"
                    name="expires"
                    value={paymentDraft.expires}
                    onChange={handlePaymentDraftChange}
                    placeholder="MM/AA"
                  />
                </label>

                <label className="profile-field payment-add-form__wide">
                  <span>Nome no cartao</span>
                  <input
                    type="text"
                    name="holder"
                    value={paymentDraft.holder}
                    onChange={handlePaymentDraftChange}
                    placeholder="Nome do titular"
                  />
                </label>
              </div>

              <div className="profile-modal__actions">
                {paymentModalMode === "edit" ? (
                  <button type="button" className="profile-modal__danger" onClick={handleDeletePaymentMethod}>
                    Excluir cartao
                  </button>
                ) : null}
                <button type="button" className="ghost-button" onClick={closePaymentModal}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button">
                  {paymentModalMode === "edit" ? "Salvar alteracoes" : "Adicionar cartao"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {planConfirmOpen ? (
          <motion.div
            className="profile-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPlanConfirmOpen(false)}
          >
            <motion.div
              className="profile-modal plan-confirm-modal"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 18, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="profile-modal__heading">
                <div>
                  <span>Confirmacao do plano</span>
                  <h2>Confirmar alteracao da assinatura</h2>
                  <p>
                    Revise a mudanca antes de aplicar. A assinatura sera atualizada usando o cartao
                    selecionado.
                  </p>
                </div>
                <button type="button" className="profile-modal__close" onClick={() => setPlanConfirmOpen(false)}>
                  x
                </button>
              </div>

              <div className="plan-confirm-modal__summary">
                <div>
                  <small>Plano atual</small>
                  <strong>{activePlan.name}</strong>
                  <span>{account.billingCycle === "annual" ? "Anual" : "Mensal"}</span>
                </div>
                <div>
                  <small>Novo plano</small>
                  <strong>{selectedPlan.name}</strong>
                  <span>{pendingBillingCycle === "annual" ? "Anual" : "Mensal"}</span>
                </div>
                <div>
                  <small>Cobranca</small>
                  <strong>{formatCurrency(selectedPlanPrice)}</strong>
                  <span>
                    {selectedPaymentMethod.label}
                    {selectedPaymentMethod.id !== "novo" ? ` final ${selectedPaymentMethod.ending}` : ""}
                  </span>
                </div>
              </div>

              <label className="plan-confirm-modal__terms">
                <input
                  type="checkbox"
                  checked={planTermsAccepted}
                  onChange={(event) => setPlanTermsAccepted(event.target.checked)}
                />
                <span>
                  Li e aceito que a alteracao do plano pode mudar valores, recorrencia, limites de tokens e
                  acessos disponiveis na plataforma.
                </span>
              </label>

              <div className="profile-modal__actions">
                <button type="button" className="ghost-button" onClick={() => setPlanConfirmOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!planTermsAccepted}
                  onClick={confirmPlanChange}
                >
                  Confirmar mudanca
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
