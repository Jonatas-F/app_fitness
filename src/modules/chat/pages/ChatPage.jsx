import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { loadAssistantContext } from "../../../services/assistantService";
import "./ChatPage.css";

const contextChips = [
  { label: "@dashboard", value: "@dashboard ", helper: "peso, medidas, aderencia e evolucao" },
  { label: "@treino", value: "@treino ", helper: "protocolo, cargas, sessoes e tecnica" },
  { label: "@dieta", value: "@dieta ", helper: "refeicoes, agua, restricoes e ajustes" },
  { label: "@checkin", value: "@checkin ", helper: "historico semanal, mensal e fotos" },
  { label: "#comparar", value: "#comparar ", helper: "comparar periodos do proprio usuario" },
  { label: "#video", value: "#video ", helper: "pedir feedback de execucao anexada" },
];

const suggestedQuestions = [
  "Compare minha evolucao de peso e medidas dos ultimos check-ins.",
  "Com base nos meus treinos recentes, onde posso evoluir carga com seguranca?",
  "Minha dieta atual esta coerente com meu objetivo e rotina?",
  "Analise este video curto e me diga pontos de ajuste na execucao.",
  "Quais dados ainda faltam para melhorar a precisao do meu proximo protocolo?",
];

const blockedPatterns = [
  /outro(s)? usuario(s)?/i,
  /email(s)? de (clientes|usuarios|terceiros)/i,
  /todos os usuarios/i,
  /banco inteiro/i,
  /cartao completo/i,
  /senha(s)?/i,
  /token(s)? secreto(s)?/i,
];

function getLatestCheckin(context) {
  return Array.isArray(context?.checkins) ? context.checkins[0] : null;
}

function getEnabledWorkoutCount(context) {
  const workouts = context?.workout?.activePlan?.payload?.workouts || [];
  return workouts.filter((item) => item.enabled).length;
}

function getEnabledMealCount(context) {
  const meals = context?.diet?.activePlan?.payload?.meals || [];
  return meals.filter((item) => item.enabled).length;
}

function buildContextSummary(context) {
  const latestCheckin = getLatestCheckin(context);
  const subscription = context?.billing?.subscription;

  return [
    {
      label: "Usuario",
      value: context?.profile?.full_name || context?.account?.email || "--",
      helper: "Escopo exclusivo da conta logada",
    },
    {
      label: "Check-ins",
      value: String(context?.checkins?.length || 0),
      helper: latestCheckin ? `Ultimo: ${new Date(latestCheckin.created_at).toLocaleDateString("pt-BR")}` : "Sem registro",
    },
    {
      label: "Treinos",
      value: String(getEnabledWorkoutCount(context)),
      helper: `${context?.workout?.recentSessions?.length || 0} sessoes recentes`,
    },
    {
      label: "Dieta",
      value: String(getEnabledMealCount(context)),
      helper: "Refeicoes ativas no protocolo",
    },
    {
      label: "Plano",
      value: subscription?.plan || context?.account?.plan_type || "--",
      helper: subscription?.token_balance ? `${subscription.token_balance} tokens` : "Consumo futuro",
    },
  ];
}

function isBlockedQuestion(text) {
  return blockedPatterns.some((pattern) => pattern.test(text));
}

function createLocalAssistantReply(question, context, attachments) {
  if (isBlockedQuestion(question)) {
    return {
      role: "assistant",
      text:
        "Nao posso consultar ou inferir dados de outros usuarios, credenciais, tokens secretos ou dados completos de pagamento. Posso analisar apenas os dados da sua propria conta logada.",
    };
  }

  const latestCheckin = getLatestCheckin(context);
  const attachmentText = attachments.length
    ? ` Recebi ${attachments.length} anexo(s). Quando a API de visao estiver conectada, eu uso esses arquivos para avaliar pose, execucao ou progresso visual.`
    : "";

  if (/@treino|carga|execucao|video|serie/i.test(question)) {
    return {
      role: "assistant",
      text: `Consultei somente seu protocolo e suas sessoes recentes. Hoje existem ${getEnabledWorkoutCount(
        context
      )} treinos habilitados e ${context?.workout?.recentSessions?.length || 0} sessoes registradas para comparacao.${attachmentText}`,
    };
  }

  if (/@dieta|refeicao|agua|alimento|restricao/i.test(question)) {
    return {
      role: "assistant",
      text: `Consultei somente sua dieta ativa e preferencias alimentares. O protocolo atual tem ${getEnabledMealCount(
        context
      )} refeicoes habilitadas. Posso cruzar isso com check-ins para sugerir ajustes quando a geracao por IA estiver conectada.${attachmentText}`,
    };
  }

  if (/@dashboard|evolucao|peso|medida|bioimpedancia|checkin/i.test(question)) {
    return {
      role: "assistant",
      text: `Consultei seu historico de check-ins. O ultimo registro ${
        latestCheckin ? `foi em ${new Date(latestCheckin.created_at).toLocaleDateString("pt-BR")}` : "ainda nao existe"
      }. Posso comparar peso, medidas, aderencia, sono e bioimpedancia quando esses campos estiverem preenchidos.${attachmentText}`,
    };
  }

  return {
    role: "assistant",
    text: `Entendi. Vou responder usando apenas seus dados autenticados: perfil, check-ins, treino, dieta, dashboard e preferencias. Para uma consulta mais precisa, use @treino, @dieta, @dashboard ou @checkin.${attachmentText}`,
  };
}

export default function ChatPage() {
  const fileInputRef = useRef(null);
  const [context, setContext] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [contextError, setContextError] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [conversation, setConversation] = useState([
    {
      role: "assistant",
      text:
        "Estou pronto para consultar seus dados do Shape Certo. Meu escopo e apenas a sua conta logada.",
    },
  ]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateContext() {
      const result = await loadAssistantContext();

      if (!isMounted) {
        return;
      }

      setIsLoadingContext(false);

      if (result.error) {
        setContextError(result.error.message);
        return;
      }

      if (result.skipped) {
        setContextError("Entre na conta para liberar consultas seguras ao banco.");
        return;
      }

      setContext(result.context);
    }

    hydrateContext();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => buildContextSummary(context), [context]);

  function appendShortcut(value) {
    setMessage((current) => `${current}${value}`.trimStart());
  }

  function handleFiles(event) {
    const files = Array.from(event.target.files || []);
    const safeFiles = files
      .filter((file) => file.type.startsWith("image/") || file.type.startsWith("video/"))
      .slice(0, 4)
      .map((file) => ({
        id: `${file.name}-${file.lastModified}`,
        name: file.name,
        type: file.type.startsWith("video/") ? "video" : "imagem",
        size: file.size,
      }));

    setAttachments((current) => [...current, ...safeFiles].slice(0, 4));
    event.target.value = "";
  }

  function removeAttachment(id) {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed || !context) {
      return;
    }

    const userMessage = {
      role: "user",
      text: trimmed,
      attachments,
    };
    const assistantReply = createLocalAssistantReply(trimmed, context, attachments);

    setConversation((current) => [...current, userMessage, assistantReply]);
    setMessage("");
    setAttachments([]);
  }

  return (
    <div className="chat-page">
      <section className="chat-hero">
        <span>Personal Virtual</span>
        <h1>Converse com seus dados de treino, dieta e evolucao.</h1>
        <p>
          O agente consulta apenas a conta autenticada. Perguntas sobre outros usuarios, credenciais
          ou dados completos de pagamento sao bloqueadas.
        </p>
      </section>

      <section className="chat-grid">
        <aside className="chat-context-panel">
          <div className="chat-panel-header">
            <span>Contexto seguro</span>
            <strong>{isLoadingContext ? "Sincronizando" : context ? "Ativo" : "Pendente"}</strong>
          </div>

          {contextError ? <p className="chat-alert">{contextError}</p> : null}

          <div className="chat-context-cards">
            {summary.map((item) => (
              <article key={item.label}>
                <small>{item.label}</small>
                <strong>{item.value}</strong>
                <span>{item.helper}</span>
              </article>
            ))}
          </div>

          <div className="chat-scope-box">
            <Icon icon="solar:shield-check-bold" aria-hidden="true" />
            <p>
              Cada consulta do backend usa o ID da sessao autenticada. O chat nao recebe parametro
              para buscar outro usuario.
            </p>
          </div>

          <div className="chat-shortcuts">
            <h2>Atalhos</h2>
            {contextChips.map((chip) => (
              <button key={chip.label} type="button" onClick={() => appendShortcut(chip.value)}>
                <strong>{chip.label}</strong>
                <span>{chip.helper}</span>
              </button>
            ))}
          </div>
        </aside>

        <main className="chat-console">
          <div className="chat-suggestions">
            {suggestedQuestions.map((question) => (
              <button key={question} type="button" onClick={() => setMessage(question)}>
                {question}
              </button>
            ))}
          </div>

          <div className="chat-thread" aria-live="polite">
            {conversation.map((item, index) => (
              <article key={`${item.role}-${index}`} className={`chat-message is-${item.role}`}>
                <span>{item.role === "assistant" ? "Personal Virtual" : "Voce"}</span>
                <p>{item.text}</p>
                {item.attachments?.length ? (
                  <div className="chat-message-attachments">
                    {item.attachments.map((attachment) => (
                      <small key={attachment.id}>{attachment.type}: {attachment.name}</small>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>

          <form className="chat-composer" onSubmit={handleSubmit}>
            {attachments.length ? (
              <div className="chat-attachments">
                {attachments.map((attachment) => (
                  <button key={attachment.id} type="button" onClick={() => removeAttachment(attachment.id)}>
                    <Icon icon={attachment.type === "video" ? "solar:videocamera-bold" : "solar:gallery-bold"} />
                    {attachment.name}
                    <span>remover</span>
                  </button>
                ))}
              </div>
            ) : null}

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ex: @treino compare minha carga no supino das ultimas sessoes..."
              rows={4}
            />

            <div className="chat-composer-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleFiles}
              />
              <button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>
                <Icon icon="solar:paperclip-bold" aria-hidden="true" />
                Anexar imagem ou video curto
              </button>
              <button type="submit" className="primary-button" disabled={!context || !message.trim()}>
                Enviar pergunta
              </button>
            </div>
          </form>
        </main>
      </section>
    </div>
  );
}
