import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { getPersonalAvatarById } from "../../../data/platformImageCatalog";
import { loadAssistantContext } from "../../../services/assistantService";
import { sendAiChatMessage } from "../../../services/ai/chat.service";
import "./ChatPage.css";

const SETTINGS_KEY = "shapeCertoSettings";

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

// Bloqueio client-side de perguntas explicitamente fora de escopo
const blockedPatterns = [
  /outro(s)? usuario(s)?/i,
  /email(s)? de (clientes|usuarios|terceiros)/i,
  /todos os usuarios/i,
  /banco inteiro/i,
  /cartao completo/i,
  /senha(s)?/i,
  /token(s)? secreto(s)?/i,
];

function buildContextSummary(context) {
  const latestCheckin = Array.isArray(context?.checkins) ? context.checkins[0] : null;
  const enabledWorkouts = (context?.workout?.activePlan?.payload?.workouts || []).filter((w) => w.enabled).length;
  const enabledMeals = (context?.diet?.activePlan?.payload?.meals || []).filter((m) => m.enabled).length;
  const subscription = context?.billing?.subscription;

  return [
    {
      label: "Usuario",
      value: context?.profile?.full_name || context?.account?.email || "--",
      helper: "Perfil ativo",
    },
    {
      label: "Check-ins",
      value: String(context?.checkins?.length || 0),
      helper: latestCheckin ? `Ultimo: ${new Date(latestCheckin.created_at).toLocaleDateString("pt-BR")}` : "Sem registro",
    },
    {
      label: "Treinos",
      value: String(enabledWorkouts),
      helper: `${context?.workout?.recentSessions?.length || 0} sessoes recentes`,
    },
    {
      label: "Dieta",
      value: String(enabledMeals),
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


function loadPersonalSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY));

    return {
      name: settings?.personal?.name || "Personal Virtual",
      avatarId: settings?.personal?.avatarId || "default-personal",
    };
  } catch (error) {
    return {
      name: "Personal Virtual",
      avatarId: "default-personal",
    };
  }
}

export default function ChatPage() {
  const fileInputRef = useRef(null);
  const threadRef = useRef(null);
  const [personalSettings, setPersonalSettings] = useState(() => loadPersonalSettings());
  const [context, setContext] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [contextError, setContextError] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [conversation, setConversation] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const personalAvatar = useMemo(
    () => getPersonalAvatarById(personalSettings.avatarId),
    [personalSettings.avatarId]
  );
  const personalName = personalSettings.name || "Personal Virtual";

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

      if (result.context?.settings) {
        setPersonalSettings({
          name: result.context.settings.personal_name || "Personal Virtual",
          avatarId: result.context.settings.avatar_id || "default-personal",
        });
      }
    }

    hydrateContext();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    function syncPersonalSettings(event) {
      if (event.detail?.personal) {
        setPersonalSettings({
          name: event.detail.personal.name || "Personal Virtual",
          avatarId: event.detail.personal.avatarId || "default-personal",
        });
        return;
      }

      setPersonalSettings(loadPersonalSettings());
    }

    window.addEventListener("shape-certo-settings-updated", syncPersonalSettings);
    window.addEventListener("storage", syncPersonalSettings);

    return () => {
      window.removeEventListener("shape-certo-settings-updated", syncPersonalSettings);
      window.removeEventListener("storage", syncPersonalSettings);
    };
  }, []);

  // Rola thread para o fim sempre que chega uma nova mensagem
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [conversation, isSending]);

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

  async function handleSubmit(event) {
    event.preventDefault();
    const trimmed = message.trim();

    if (!trimmed || !context || isSending) {
      return;
    }

    setSendError("");

    // Bloqueio client-side: resposta imediata sem chamar a API
    if (isBlockedQuestion(trimmed)) {
      const userMessage = { role: "user", text: trimmed, attachments };
      const blockedReply = {
        role: "assistant",
        text: "Nao posso consultar ou inferir dados de outros usuarios, credenciais, tokens secretos ou dados completos de pagamento. Posso analisar apenas os dados da sua propria conta logada.",
      };
      setConversation((current) => [...current, userMessage, blockedReply]);
      setMessage("");
      setAttachments([]);
      return;
    }

    const userMessage = { role: "user", text: trimmed, attachments };

    // Adiciona mensagem do usuário imediatamente e limpa o campo
    setConversation((current) => [...current, userMessage]);
    setMessage("");
    setAttachments([]);
    setIsSending(true);

    try {
      // Passa o histórico atual (sem a mensagem recém-adicionada — o backend a recebe no campo `message`)
      const historyForApi = conversation.map((m) => ({ role: m.role, text: m.text || "" }));
      const result = await sendAiChatMessage(trimmed, historyForApi);

      if (result.error) {
        setSendError(result.error.message || "Erro ao chamar o Personal Virtual.");
        return;
      }

      const assistantReply = {
        role: "assistant",
        text: result.text || "Sem resposta.",
        run: result.run,
      };

      setConversation((current) => [...current, assistantReply]);
    } catch (error) {
      setSendError(error.message || "Erro de conexao com o servidor.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="chat-page">
      <section className="chat-hero">
        <div className="chat-hero__identity">
          {personalAvatar ? (
            <img className="chat-hero__avatar" src={personalAvatar.url} alt={`Avatar ${personalName}`} />
          ) : null}
          <div>
            <span>Personal Virtual</span>
            <strong>{personalName}</strong>
          </div>
        </div>

        <div className="chat-hero__copy">
          <h1>Converse com seus dados de treino, dieta e evolucao.</h1>
          <p>
            Consulte treino, dieta, check-ins e dashboard em uma conversa focada no seu progresso.
          </p>
        </div>
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

          <div className="chat-thread" aria-live="polite" ref={threadRef}>
            {conversation.map((item, index) => (
              <article key={`${item.role}-${index}`} className={`chat-message is-${item.role}`}>
                <span>{item.role === "assistant" ? personalName : "Voce"}</span>
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

            {isSending ? (
              <article className="chat-message is-assistant is-typing">
                <span>{personalName}</span>
                <p className="chat-typing-indicator">
                  <span />
                  <span />
                  <span />
                </p>
              </article>
            ) : null}

            {sendError ? (
              <p className="chat-send-error">{sendError}</p>
            ) : null}
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
              <button type="submit" className="primary-button" disabled={!context || !message.trim() || isSending}>
                {isSending ? "Aguardando..." : "Enviar pergunta"}
              </button>
            </div>
          </form>
        </main>
      </section>
    </div>
  );
}
