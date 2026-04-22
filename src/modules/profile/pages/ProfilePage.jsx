import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import {
  createStripePaymentMethodSession,
  createStripePortalSession,
  createStripeSubscriptionChangeSession,
  loadBillingSubscription,
  setStripeDefaultPaymentMethod,
} from "../../../services/stripeService";
import {
  closeStripePopup,
  isStripePopupMessage,
  notifyStripePopupResult,
  openPendingStripePopup,
  redirectStripePopup,
  watchStripePopupClose,
} from "../../../utils/stripePopup";
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
];

const addPaymentMethodOption = {
  id: "novo",
  brand: "+",
  ending: "novo",
  label: "Adicionar novo cartao",
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
  const normalizedBrand = String(method.brand || "").toLowerCase();
  const brand =
    normalizedBrand === "visa"
      ? "Visa"
      : normalizedBrand === "mastercard"
        ? "Mastercard"
        : method.brand === "Visa" || method.brand === "Mastercard"
          ? method.brand
          : "Stripe";
  const ending = String(method.ending || method.last4 || "")
    .replace(/\D/g, "")
    .slice(-4);

  return {
    id: method.id,
    brand,
    ending: ending || "----",
    label: method.label || "Metodo Stripe salvo",
    holder: method.holder || method.funding || "Gerenciado no Stripe",
    expires: method.expires || "--/--",
    isDefault: Boolean(method.isDefault),
    source: method.source || "stripe",
  };
}

function normalizeStripePaymentMethods(methods = []) {
  return methods.map(normalizePaymentMethod).filter((method) => method.id && method.source === "stripe");
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

    return normalizeStripePaymentMethods(parsedMethods);
  } catch (error) {
    return defaultPaymentMethods;
  }
}

function savePaymentMethods(methods) {
  localStorage.setItem(PROFILE_PAYMENT_METHODS_KEY, JSON.stringify(methods));
  return methods;
}

function getPlanPrice(plan, billingCycle) {
  return billingCycle === "annual" ? getAnnualPrice(plan) : plan.monthlyPrice;
}

function parseBillingDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildProrationEstimate({ subscription, currentPlan, currentBillingCycle, nextPlan, nextBillingCycle }) {
  const dayMs = 24 * 60 * 60 * 1000;
  const currentPrice = getPlanPrice(currentPlan, currentBillingCycle);
  const nextPrice = getPlanPrice(nextPlan, nextBillingCycle);
  const startDate = parseBillingDate(subscription?.current_period_start);
  const endDate = parseBillingDate(subscription?.current_period_end);
  const now = new Date();

  if (!startDate || !endDate || endDate <= startDate) {
    return {
      currentPrice,
      nextPrice,
      credit: 0,
      estimatedDue: nextPrice,
      usedDays: null,
      totalDays: null,
      remainingDays: null,
      hasActivePeriod: false,
    };
  }

  const totalDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / dayMs));
  const elapsedDays = Math.ceil((now.getTime() - startDate.getTime()) / dayMs);
  const usedDays = clampNumber(elapsedDays, 0, totalDays);
  const remainingDays = Math.max(0, totalDays - usedDays);
  const remainingRatio = remainingDays / totalDays;
  const credit = Number((currentPrice * remainingRatio).toFixed(2));

  return {
    currentPrice,
    nextPrice,
    credit,
    estimatedDue: Number(Math.max(0, nextPrice - credit).toFixed(2)),
    usedDays,
    totalDays,
    remainingDays,
    hasActivePeriod: true,
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
  const [searchParams] = useSearchParams();
  const [profilePhoto, setProfilePhoto] = useState(() => loadProfilePhoto());
  const [account, setAccount] = useState(() => loadProfileAccount());
  const [savedPaymentMethods, setSavedPaymentMethods] = useState(() => loadPaymentMethods());
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
  const [billingSummary, setBillingSummary] = useState(null);
  const [isChangingPlan, setIsChangingPlan] = useState(false);
  const [isUpdatingPaymentMethod, setIsUpdatingPaymentMethod] = useState(false);
  const stripePopupCompletedRef = useRef(false);

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
  const prorationEstimate = useMemo(
    () =>
      buildProrationEstimate({
        subscription: billingSummary?.subscription,
        currentPlan: activePlan,
        currentBillingCycle: account.billingCycle,
        nextPlan: selectedPlan,
        nextBillingCycle: pendingBillingCycle,
      }),
    [account.billingCycle, activePlan, billingSummary, pendingBillingCycle, selectedPlan]
  );

  useEffect(() => {
    let ignore = false;

    async function hydrateRemoteProfile() {
      const [result, equipmentResult, foodResult, billingResult] = await Promise.all([
        loadRemoteProfile(),
        hydrateGymEquipmentSelectionFromApi(),
        hydrateFoodPreferencesFromApi(),
        loadBillingSubscription(),
      ]);

      if (!ignore && !equipmentResult.error) {
        setSelectedEquipmentIds(equipmentResult.selectedIds);
      }

      if (!ignore && !foodResult.error) {
        setFoodPreferences(foodResult.preferences);
      }

      if (!ignore && !billingResult.error && billingResult.data) {
        setBillingSummary(billingResult.data);

        const paymentProfile = billingResult.data.paymentProfile;
        const stripeMethods = normalizeStripePaymentMethods(billingResult.data.paymentMethods || []);
        const defaultMethod =
          stripeMethods.find((method) => method.id === paymentProfile?.default_payment_method_id) ||
          stripeMethods.find((method) => method.isDefault) ||
          stripeMethods[0];

        if (stripeMethods.length) {
          setSavedPaymentMethods(savePaymentMethods(stripeMethods));
        }

        if (defaultMethod) {
          setAccount((current) => saveProfileAccount({ ...current, paymentMethod: defaultMethod.id }));
        }
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

  useEffect(() => {
    const paymentMethodStatus = searchParams.get("payment_method");
    const stripePortalStatus = searchParams.get("stripe_portal");
    const isStripePopupReturn = searchParams.get("stripe_popup") === "1";

    if (isStripePopupReturn && (paymentMethodStatus || stripePortalStatus)) {
      notifyStripePopupResult({
        area: "profile",
        paymentMethodStatus,
        stripePortalStatus,
      });
      return;
    }

    if (paymentMethodStatus === "success") {
      setAccountMessage("Metodo de pagamento enviado para a Stripe. Atualizando cartoes salvos...");
      refreshStripePaymentMethods("Metodo de pagamento salvo e sincronizado com a Stripe.");
    }

    if (paymentMethodStatus === "cancelled") {
      setAccountMessage("Cadastro de metodo de pagamento cancelado antes de concluir na Stripe.");
    }
  }, [searchParams]);

  useEffect(() => {
    function handleStripePopupMessage(event) {
      if (!isStripePopupMessage(event)) {
        return;
      }

      const payload = event.data.payload || {};

      if (payload.area === "checkout" && payload.status === "success") {
        stripePopupCompletedRef.current = true;
        setPlanConfirmOpen(false);
        setIsChangingPlan(false);
        setAccountMessage("Pagamento confirmado na Stripe. Atualizando plano e assinatura...");
        refreshStripePaymentMethods("Plano atualizado pela Stripe. Os dados serao sincronizados pelo webhook.");
        return;
      }

      if (payload.area !== "profile") {
        return;
      }

      stripePopupCompletedRef.current = true;

      if (payload.paymentMethodStatus === "success" || payload.stripePortalStatus === "returned") {
        setAccountMessage("Retorno da Stripe recebido. Atualizando dados de pagamento...");
        refreshStripePaymentMethods("Dados de pagamento atualizados pela Stripe.");
        return;
      }

      if (payload.paymentMethodStatus === "cancelled") {
        setAccountMessage("Cadastro de metodo de pagamento cancelado antes de concluir na Stripe.");
      }
    }

    window.addEventListener("message", handleStripePopupMessage);

    return () => window.removeEventListener("message", handleStripePopupMessage);
  }, []);

  async function refreshStripePaymentMethods(successMessage) {
    const result = await loadBillingSubscription();

    if (result.error || !result.data) {
      setAccountMessage(result.error?.message || "Nao foi possivel atualizar os cartoes salvos agora.");
      return;
    }

    const stripeMethods = normalizeStripePaymentMethods(result.data.paymentMethods || []);
    const paymentProfile = result.data.paymentProfile;
    const defaultMethod =
      stripeMethods.find((method) => method.id === paymentProfile?.default_payment_method_id) ||
      stripeMethods.find((method) => method.isDefault) ||
      stripeMethods[0];

    setBillingSummary(result.data);
    setSavedPaymentMethods(savePaymentMethods(stripeMethods));

    if (defaultMethod) {
      setAccount((current) => saveProfileAccount({ ...current, paymentMethod: defaultMethod.id }));
    }

    setAccountMessage(successMessage || "Cartoes salvos na Stripe atualizados.");
  }

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

  async function handlePaymentMethodSelect(method) {
    if (method.id === "novo") {
      await openStripePaymentMethodSession("Abrindo Stripe para adicionar um novo metodo de pagamento...");
      return;
    }

    setIsUpdatingPaymentMethod(true);
    setAccountMessage(`Definindo ${method.label} como cartao padrao...`);

    const result = await setStripeDefaultPaymentMethod(method.id);

    if (result.error || !result.data) {
      setIsUpdatingPaymentMethod(false);
      setAccountMessage(
        `Nao foi possivel selecionar este cartao. ${result.error?.message || "Tente novamente em alguns instantes."}`
      );
      return;
    }

    const stripeMethods = normalizeStripePaymentMethods(result.data.paymentMethods || []);
    const defaultPaymentMethodId = result.data.defaultPaymentMethodId || method.id;

    setSavedPaymentMethods(savePaymentMethods(stripeMethods));
    setAccount(saveProfileAccount({ ...account, paymentMethod: defaultPaymentMethodId }));
    setBillingSummary((current) => ({
      ...current,
      paymentMethods: result.data.paymentMethods || [],
      paymentProfile: {
        ...(current?.paymentProfile || {}),
        default_payment_method_id: defaultPaymentMethodId,
      },
    }));
    setIsUpdatingPaymentMethod(false);
    setAccountMessage("Cartao padrao atualizado com seguranca pela Stripe.");
  }

  function openPlanChangeConfirmation() {
    setPlanTermsAccepted(false);
    setPlanConfirmOpen(true);
  }

  async function confirmPlanChange() {
    if (!planTermsAccepted) {
      setAccountMessage("Aceite os termos da alteracao do plano para continuar.");
      return;
    }

    setIsChangingPlan(true);
    stripePopupCompletedRef.current = false;
    const stripePopup = openPendingStripePopup();

    if (!stripePopup) {
      setIsChangingPlan(false);
      setAccountMessage("O navegador bloqueou o popup da Stripe. Libere popups para continuar o pagamento.");
      return;
    }

    const stopWatchingPopup = watchStripePopupClose(stripePopup, () => {
      if (stripePopupCompletedRef.current) {
        return;
      }

      setIsChangingPlan(false);
      setAccountMessage("Janela da Stripe fechada. Se a alteracao foi concluida, o webhook atualizara o plano.");
    });

    const acceptedTermsText =
      "Li e aceito que a alteracao do plano pode mudar valores, recorrencia, limites de tokens, acessos disponiveis e gerar cobranca proporcional calculada pela Stripe.";
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
        prorationEstimate,
      },
    };

    const acceptanceResult = await savePlanChangeAcceptance(acceptanceRecord);
    const result = await createStripeSubscriptionChangeSession({
      planId: pendingPlan,
      billingCycle: pendingBillingCycle,
      prorationEstimate,
      returnMode: "popup",
    });

    if (result.error || !result.url) {
      setIsChangingPlan(false);
      stopWatchingPopup();
      closeStripePopup(stripePopup);
      setAccountMessage(
        `Aceite registrado, mas nao foi possivel abrir o Stripe. ${
          result.error?.message || "Tente novamente em alguns instantes."
        }${acceptanceResult.error ? ` Historico local salvo; Supabase: ${acceptanceResult.error.message}` : ""}`
      );
      return;
    }

    setPlanConfirmOpen(false);
    setAccountMessage("Aceite registrado. Conclua o pagamento na janela segura da Stripe.");
    redirectStripePopup(stripePopup, result.url);
  }

  async function openStripePortal() {
    setAccountMessage("Abrindo portal seguro do Stripe em uma janela popup...");
    stripePopupCompletedRef.current = false;
    const stripePopup = openPendingStripePopup();

    if (!stripePopup) {
      setAccountMessage("O navegador bloqueou o popup da Stripe. Libere popups para gerenciar a assinatura.");
      return;
    }

    const stopWatchingPopup = watchStripePopupClose(stripePopup, () => {
      if (stripePopupCompletedRef.current) {
        return;
      }

      setAccountMessage("Janela da Stripe fechada. Atualizando dados de pagamento...");
      refreshStripePaymentMethods();
    });

    const result = await createStripePortalSession();

    if (result.error || !result.url) {
      stopWatchingPopup();
      closeStripePopup(stripePopup);
      setAccountMessage(
        `Nao foi possivel abrir o portal Stripe. ${
          result.error?.message || "Finalize uma assinatura pelo checkout primeiro."
        }`
      );
      return;
    }

    redirectStripePopup(stripePopup, result.url);
  }

  async function openStripePaymentMethodSession(message = "Abrindo Stripe para gerenciar pagamento...") {
    setAccountMessage(message);
    stripePopupCompletedRef.current = false;
    const stripePopup = openPendingStripePopup();

    if (!stripePopup) {
      setAccountMessage("O navegador bloqueou o popup da Stripe. Libere popups para gerenciar cartoes.");
      return;
    }

    const stopWatchingPopup = watchStripePopupClose(stripePopup, () => {
      if (stripePopupCompletedRef.current) {
        return;
      }

      setAccountMessage("Janela da Stripe fechada. Atualizando cartoes salvos...");
      refreshStripePaymentMethods();
    });

    const result = await createStripePaymentMethodSession();

    if (result.error || !result.url) {
      stopWatchingPopup();
      closeStripePopup(stripePopup);
      setAccountMessage(
        `Nao foi possivel abrir a tela segura da Stripe. ${
          result.error?.message || "Tente novamente em alguns instantes."
        }`
      );
      return;
    }

    redirectStripePopup(stripePopup, result.url);
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
                  <small>
                    {isUpdatingPaymentMethod
                      ? "Atualizando cartao padrao na Stripe..."
                      : "Cartoes salvos e cobranca gerenciados pelo Stripe"}
                  </small>
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

                <button type="button" className="ghost-button" onClick={() => openStripePaymentMethodSession()}>
                  Adicionar ou alterar cartao na Stripe
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
                  <span>Estimativa proporcional</span>
                  <strong>{formatCurrency(prorationEstimate.estimatedDue)}</strong>
                  <small>
                    {prorationEstimate.hasActivePeriod
                      ? `Credito estimado de ${formatCurrency(prorationEstimate.credit)} pelos ${prorationEstimate.remainingDays} dias restantes.`
                      : "Sem ciclo ativo encontrado para calcular credito proporcional."}
                  </small>
                  <small>O Stripe recalcula o valor final antes do pagamento.</small>
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
                    Revise a mudanca antes de ir para a pagina segura da Stripe. O valor final do
                    proporcional sera recalculado no pagamento.
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

              <div className="plan-confirm-modal__proration">
                <div>
                  <small>Valor do novo ciclo</small>
                  <strong>{formatCurrency(prorationEstimate.nextPrice)}</strong>
                  <span>{pendingBillingCycle === "annual" ? "Ciclo anual" : "Ciclo mensal"}</span>
                </div>
                <div>
                  <small>Credito proporcional</small>
                  <strong>{formatCurrency(prorationEstimate.credit)}</strong>
                  <span>
                    {prorationEstimate.hasActivePeriod
                      ? `${prorationEstimate.remainingDays} dias restantes no ciclo atual`
                      : "Sem periodo ativo encontrado"}
                  </span>
                </div>
                <div>
                  <small>Estimativa a pagar agora</small>
                  <strong>{formatCurrency(prorationEstimate.estimatedDue)}</strong>
                  <span>
                    {prorationEstimate.hasActivePeriod
                      ? `${prorationEstimate.usedDays} de ${prorationEstimate.totalDays} dias usados`
                      : "A Stripe calcula o valor final"}
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
                  acessos disponiveis na plataforma, incluindo cobranca proporcional calculada pela Stripe.
                </span>
              </label>

              <div className="profile-modal__actions">
                <button type="button" className="ghost-button" onClick={() => setPlanConfirmOpen(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="primary-button"
                  disabled={!planTermsAccepted || isChangingPlan}
                  onClick={confirmPlanChange}
                >
                  {isChangingPlan ? "Abrindo Stripe..." : "Confirmar e pagar no Stripe"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
