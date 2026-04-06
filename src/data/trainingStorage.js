const TRAINING_CURRENT_KEY = "shapeCertoTrainingCurrent";
const TRAINING_HISTORY_KEY = "shapeCertoTrainingHistory";

function formatDateInput(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setDate(date.getDate() + days);
  return date;
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function getDefaultClosurePlan() {
  return {
    requestPhotos: true,
    requestBioimpedance: false,
    allowPhotosOnly: true,
    unlockNewProtocol: true,
  };
}

function getDefaultDivision() {
  return [
    {
      id: "A",
      title: "Treino A",
      focus: "Peito, ombro e tríceps",
      exercises:
        "Supino reto — 4x10\nDesenvolvimento com halteres — 4x12\nTríceps corda — 3x15",
    },
    {
      id: "B",
      title: "Treino B",
      focus: "Costas e bíceps",
      exercises:
        "Puxada frontal — 4x10\nRemada baixa — 4x12\nRosca direta — 3x15",
    },
    {
      id: "C",
      title: "Treino C",
      focus: "Pernas completas",
      exercises:
        "Agachamento livre — 4x10\nLeg press — 4x12\nMesa flexora — 3x15",
    },
  ];
}

function getBlankDivision() {
  return [
    { id: "A", title: "Treino A", focus: "", exercises: "" },
    { id: "B", title: "Treino B", focus: "", exercises: "" },
    { id: "C", title: "Treino C", focus: "", exercises: "" },
  ];
}

export function createExampleTrainingProtocol() {
  const now = new Date();

  return {
    id: `protocol-${Date.now()}`,
    title: "Protocolo Hipertrofia 01",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
    objective: "Hipertrofia com foco em ganho de massa magra",
    status: "ativo",
    notes:
      "Protocolo base de 30 dias com progressão de carga e revisão ao final do ciclo.",
    division: getDefaultDivision(),
    closurePlan: getDefaultClosurePlan(),
    metadata: {
      createdAt: null,
      updatedAt: null,
      closedAt: null,
    },
  };
}

export function createNewTrainingProtocolTemplate() {
  const now = new Date();

  return {
    id: `protocol-${Date.now()}`,
    title: "Novo protocolo",
    startDate: formatDateInput(now),
    endDate: formatDateInput(addDays(now, 30)),
    objective: "",
    status: "ativo",
    notes: "",
    division: getBlankDivision(),
    closurePlan: getDefaultClosurePlan(),
    metadata: {
      createdAt: null,
      updatedAt: null,
      closedAt: null,
    },
  };
}

function normalizeProtocol(protocol) {
  const base = createNewTrainingProtocolTemplate();

  return {
    id: protocol?.id || base.id,
    title: protocol?.title || base.title,
    startDate: protocol?.startDate || base.startDate,
    endDate: protocol?.endDate || base.endDate,
    objective: protocol?.objective || "",
    status: protocol?.status || "ativo",
    notes: protocol?.notes || "",
    division: Array.isArray(protocol?.division)
      ? protocol.division.map((item, index) => ({
          id: item?.id || String.fromCharCode(65 + index),
          title: item?.title || `Treino ${String.fromCharCode(65 + index)}`,
          focus: item?.focus || "",
          exercises: item?.exercises || "",
        }))
      : base.division,
    closurePlan: {
      requestPhotos:
        typeof protocol?.closurePlan?.requestPhotos === "boolean"
          ? protocol.closurePlan.requestPhotos
          : true,
      requestBioimpedance:
        typeof protocol?.closurePlan?.requestBioimpedance === "boolean"
          ? protocol.closurePlan.requestBioimpedance
          : false,
      allowPhotosOnly:
        typeof protocol?.closurePlan?.allowPhotosOnly === "boolean"
          ? protocol.closurePlan.allowPhotosOnly
          : true,
      unlockNewProtocol:
        typeof protocol?.closurePlan?.unlockNewProtocol === "boolean"
          ? protocol.closurePlan.unlockNewProtocol
          : true,
    },
    metadata: {
      createdAt: protocol?.metadata?.createdAt || null,
      updatedAt: protocol?.metadata?.updatedAt || null,
      closedAt: protocol?.metadata?.closedAt || null,
    },
  };
}

export function loadTrainingProtocol() {
  const raw = localStorage.getItem(TRAINING_CURRENT_KEY);

  if (!raw) {
    return createExampleTrainingProtocol();
  }

  return normalizeProtocol(safeParse(raw, createExampleTrainingProtocol()));
}

export function loadTrainingHistory() {
  const raw = localStorage.getItem(TRAINING_HISTORY_KEY);

  if (!raw) {
    return [];
  }

  const parsed = safeParse(raw, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveTrainingProtocol(protocol) {
  const current = loadTrainingProtocol();
  const normalized = normalizeProtocol(protocol);
  const now = new Date().toISOString();

  const finalProtocol = {
    ...normalized,
    status: "ativo",
    metadata: {
      ...normalized.metadata,
      createdAt: current?.metadata?.createdAt || now,
      updatedAt: now,
      closedAt: null,
    },
  };

  localStorage.setItem(TRAINING_CURRENT_KEY, JSON.stringify(finalProtocol));
  return finalProtocol;
}

export function closeTrainingProtocol(protocol) {
  const normalized = normalizeProtocol(protocol);
  const history = loadTrainingHistory();
  const now = new Date().toISOString();

  const finalizedProtocol = {
    ...normalized,
    status: "finalizado",
    metadata: {
      ...normalized.metadata,
      createdAt: normalized?.metadata?.createdAt || now,
      updatedAt: now,
      closedAt: now,
    },
  };

  const updatedHistory = [finalizedProtocol, ...history];
  localStorage.setItem(TRAINING_HISTORY_KEY, JSON.stringify(updatedHistory));

  const nextProtocol = createNewTrainingProtocolTemplate();
  localStorage.setItem(TRAINING_CURRENT_KEY, JSON.stringify(nextProtocol));

  return {
    currentProtocol: nextProtocol,
    history: updatedHistory,
  };
}

export function resetTrainingState() {
  localStorage.removeItem(TRAINING_CURRENT_KEY);
  localStorage.removeItem(TRAINING_HISTORY_KEY);
  return createExampleTrainingProtocol();
}

export function getTrainingMetrics(protocol, history) {
  const current = normalizeProtocol(protocol);
  const protocolHistory = Array.isArray(history) ? history : [];

  const exerciseCount = current.division.reduce((total, item) => {
    const count = item.exercises
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean).length;

    return total + count;
  }, 0);

  const today = new Date();
  const endDate = current.endDate ? new Date(`${current.endDate}T00:00:00`) : null;

  let daysRemaining = "--";

  if (endDate && !Number.isNaN(endDate.getTime())) {
    const diff = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    daysRemaining = diff >= 0 ? `${diff} dias` : "Encerrado";
  }

  return [
    {
      label: "Status do protocolo",
      value: current.status || "ativo",
      trend: "Ciclo de treino em andamento",
    },
    {
      label: "Exercícios atuais",
      value: `${exerciseCount}`,
      trend: "Itens cadastrados no protocolo",
    },
    {
      label: "Fim do ciclo",
      value: daysRemaining,
      trend: "Janela prevista para reavaliação",
    },
    {
      label: "Histórico",
      value: `${protocolHistory.length}`,
      trend: "Protocolos anteriores salvos",
    },
  ];
}