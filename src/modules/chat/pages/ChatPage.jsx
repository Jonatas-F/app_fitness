import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { getPersonalAvatarById } from "../../../data/platformImageCatalog";
import { loadAssistantContext } from "../../../services/assistantService";
import { sendAiChatMessage, loadChatHistory } from "../../../services/ai/chat.service";
import "./ChatPage.css";

const SETTINGS_KEY = "shapeCertoSettings";
const PROFILE_PHOTO_KEY = "shapeCertoProfilePhoto";

function loadUserPhoto() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROFILE_PHOTO_KEY));
    return stored?.dataUrl || null;
  } catch {
    return null;
  }
}

const suggestedQuestions = [
  "Compare minha evolução de peso e medidas dos últimos check-ins.",
  "Com base nos meus treinos recentes, onde posso evoluir carga com segurança?",
  "Minha dieta atual está coerente com meu objetivo e rotina?",
  "Quais dados ainda faltam para melhorar a precisão do meu próximo protocolo?",
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

function isBlockedQuestion(text) {
  return blockedPatterns.some((p) => p.test(text));
}

function loadPersonalSettings() {
  try {
    const s = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    return {
      name: s?.personal?.name || "Personal Virtual",
      avatarId: s?.personal?.avatarId || "default-personal",
    };
  } catch {
    return { name: "Personal Virtual", avatarId: "default-personal" };
  }
}

function UserInitials({ name, avatarUrl, size = 40 }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className="chat-avatar-img"
        style={{ width: size, height: size }}
      />
    );
  }

  const initials = (name || "U")
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("");

  return (
    <span className="chat-avatar-initials" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials}
    </span>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export default function ChatPage() {
  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  const [personalSettings, setPersonalSettings] = useState(() => loadPersonalSettings());
  const [userPhotoUrl, setUserPhotoUrl] = useState(() => loadUserPhoto());
  const [context, setContext] = useState(null);
  const [isLoadingContext, setIsLoadingContext] = useState(true);
  const [contextError, setContextError] = useState("");

  const [conversation, setConversation] = useState([]);
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Filtro de participante (null = todos)
  const [activeParticipant, setActiveParticipant] = useState(null);

  const personalAvatar = useMemo(
    () => getPersonalAvatarById(personalSettings.avatarId),
    [personalSettings.avatarId]
  );
  const personalName = personalSettings.name || "Personal Virtual";

  const userProfile = context?.profile || {};
  const userName = userProfile.full_name || context?.account?.email || "Você";

  // Carrega contexto + histórico em paralelo
  useEffect(() => {
    let mounted = true;

    async function init() {
      const [contextResult, historyResult] = await Promise.all([
        loadAssistantContext(),
        loadChatHistory(),
      ]);

      if (!mounted) return;

      setIsLoadingContext(false);
      setIsLoadingHistory(false);

      if (contextResult.error) {
        setContextError(contextResult.error.message);
      } else if (contextResult.skipped) {
        setContextError("Entre na conta para ativar o Personal Virtual.");
      } else {
        setContext(contextResult.context);
        if (contextResult.context?.settings) {
          setPersonalSettings({
            name: contextResult.context.settings.personal_name || "Personal Virtual",
            avatarId: contextResult.context.settings.avatar_id || "default-personal",
          });
        }
      }

      if (historyResult?.messages?.length) {
        const loaded = historyResult.messages.map((m) => ({
          role: m.role,
          text: m.content,
          createdAt: m.created_at,
          fromDb: true,
        }));
        setConversation(loaded);
      }
    }

    init();
    return () => { mounted = false; };
  }, []);

  // Sync personal settings + user photo from storage events
  useEffect(() => {
    function sync(e) {
      if (e.detail?.personal) {
        setPersonalSettings({
          name: e.detail.personal.name || "Personal Virtual",
          avatarId: e.detail.personal.avatarId || "default-personal",
        });
        return;
      }
      setPersonalSettings(loadPersonalSettings());
      setUserPhotoUrl(loadUserPhoto());
    }
    window.addEventListener("shape-certo-settings-updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("shape-certo-settings-updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Scroll para o fim quando chega mensagem nova
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [conversation, isSending]);

  const filteredConversation = useMemo(() => {
    if (!activeParticipant) return conversation;
    return conversation.filter((m) => {
      if (activeParticipant === "assistant") return m.role === "assistant";
      if (activeParticipant === "user") return m.role === "user";
      return true;
    });
  }, [conversation, activeParticipant]);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    setSendError("");

    if (isBlockedQuestion(trimmed)) {
      setConversation((prev) => [
        ...prev,
        { role: "user", text: trimmed, createdAt: new Date().toISOString() },
        {
          role: "assistant",
          text: "Não posso consultar dados de outros usuários, credenciais ou informações sensíveis. Posso analisar apenas os dados da sua conta logada.",
          createdAt: new Date().toISOString(),
        },
      ]);
      setMessage("");
      return;
    }

    const userMsg = { role: "user", text: trimmed, createdAt: new Date().toISOString() };
    setConversation((prev) => [...prev, userMsg]);
    setMessage("");
    setIsSending(true);

    try {
      const result = await sendAiChatMessage(trimmed);

      if (result.error) {
        setSendError(result.error.message || "Erro ao conectar com o Personal Virtual.");
        return;
      }

      setConversation((prev) => [
        ...prev,
        {
          role: "assistant",
          text: result.text || "Sem resposta.",
          createdAt: new Date().toISOString(),
          run: result.run,
        },
      ]);
    } catch (err) {
      setSendError(err.message || "Erro de conexão com o servidor.");
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  function handleSuggestion(q) {
    setMessage(q);
    textareaRef.current?.focus();
  }

  const isLoading = isLoadingContext || isLoadingHistory;

  return (
    <div className="mono-chat">
      {/* ── Header ─────────────────────────────────── */}
      <header className="mono-chat__header">
        <div className="mono-chat__header-identity">
          <div className="mono-chat__header-avatar-wrap">
            {personalAvatar ? (
              <img src={personalAvatar.url} alt={personalName} className="mono-chat__header-avatar" />
            ) : (
              <span className="mono-chat__header-avatar-fallback">P</span>
            )}
            <span className="mono-chat__online-dot" />
          </div>
          <div>
            <strong className="mono-chat__header-name">{personalName}</strong>
            <span className="mono-chat__header-sub">
              {isLoading ? "Sincronizando..." : contextError ? "Offline" : "Online · Personal Virtual"}
            </span>
          </div>
        </div>

        <div className="mono-chat__header-meta">
          <span className="mono-chat__msg-count">
            {conversation.length} {conversation.length === 1 ? "mensagem" : "mensagens"}
          </span>
          <Icon icon="solar:chat-dots-bold" width={20} className="mono-chat__header-icon" />
        </div>
      </header>

      {/* ── Body ───────────────────────────────────── */}
      <div className="mono-chat__body">
        {/* Sidebar de participantes */}
        <aside className="mono-chat__sidebar">
          <p className="mono-chat__sidebar-label">Participantes</p>

          {/* Personal */}
          <button
            type="button"
            className={`mono-chat__participant ${activeParticipant === "assistant" ? "is-active" : ""}`}
            onClick={() => setActiveParticipant(activeParticipant === "assistant" ? null : "assistant")}
          >
            <div className="mono-chat__participant-avatar-wrap">
              {personalAvatar ? (
                <img src={personalAvatar.url} alt={personalName} className="mono-chat__participant-avatar" />
              ) : (
                <span className="mono-chat__participant-fallback">P</span>
              )}
              <span className="mono-chat__online-dot mono-chat__online-dot--sm" />
            </div>
            <div className="mono-chat__participant-info">
              <strong>{personalName}</strong>
              <span>Personal Virtual</span>
            </div>
          </button>

          {/* User */}
          <button
            type="button"
            className={`mono-chat__participant ${activeParticipant === "user" ? "is-active" : ""}`}
            onClick={() => setActiveParticipant(activeParticipant === "user" ? null : "user")}
          >
            <div className="mono-chat__participant-avatar-wrap">
              <UserInitials name={userName} avatarUrl={userPhotoUrl} size={40} />
            </div>
            <div className="mono-chat__participant-info">
              <strong>{userName.split(" ")[0]}</strong>
              <span>Você</span>
            </div>
          </button>

          {activeParticipant && (
            <button
              type="button"
              className="mono-chat__clear-filter"
              onClick={() => setActiveParticipant(null)}
            >
              Ver todas
            </button>
          )}

          {/* Sugestões */}
          <div className="mono-chat__suggestions">
            <p className="mono-chat__sidebar-label">Sugestões</p>
            {suggestedQuestions.map((q) => (
              <button key={q} type="button" className="mono-chat__suggestion" onClick={() => handleSuggestion(q)}>
                {q}
              </button>
            ))}
          </div>
        </aside>

        {/* Thread de mensagens */}
        <section className="mono-chat__thread-wrap">
          <div className="mono-chat__thread" ref={threadRef} aria-live="polite">
            {isLoading ? (
              <div className="mono-chat__loading">
                <span className="mono-chat__spinner" />
                <span>Carregando histórico...</span>
              </div>
            ) : contextError ? (
              <div className="mono-chat__empty">
                <Icon icon="solar:shield-warning-bold" width={32} />
                <p>{contextError}</p>
              </div>
            ) : filteredConversation.length === 0 ? (
              <div className="mono-chat__empty">
                <Icon icon="solar:chat-round-dots-bold" width={36} />
                <p>Nenhuma mensagem ainda. Comece uma conversa!</p>
              </div>
            ) : (
              filteredConversation.map((msg, index) => {
                const isPersonal = msg.role === "assistant";
                const senderName = isPersonal ? personalName : userName.split(" ")[0];
                const avatarEl = isPersonal ? (
                  personalAvatar ? (
                    <img src={personalAvatar.url} alt={personalName} className="mono-chat__msg-avatar" />
                  ) : (
                    <span className="mono-chat__msg-avatar mono-chat__msg-avatar--fallback">P</span>
                  )
                ) : (
                  <UserInitials name={userName} avatarUrl={userPhotoUrl} size={36} />
                );

                return (
                  <article key={index} className={`mono-chat__msg ${isPersonal ? "is-assistant" : "is-user"}`}>
                    <div className="mono-chat__msg-avatar-col">{avatarEl}</div>
                    <div className="mono-chat__msg-body">
                      <div className="mono-chat__msg-meta">
                        <strong>{senderName}</strong>
                        <time>{formatTime(msg.createdAt)}</time>
                      </div>
                      <p className="mono-chat__msg-text">{msg.text}</p>
                    </div>
                  </article>
                );
              })
            )}

            {isSending && (
              <article className="mono-chat__msg is-assistant is-typing">
                <div className="mono-chat__msg-avatar-col">
                  {personalAvatar ? (
                    <img src={personalAvatar.url} alt={personalName} className="mono-chat__msg-avatar" />
                  ) : (
                    <span className="mono-chat__msg-avatar mono-chat__msg-avatar--fallback">P</span>
                  )}
                </div>
                <div className="mono-chat__msg-body">
                  <div className="mono-chat__msg-meta">
                    <strong>{personalName}</strong>
                  </div>
                  <div className="mono-chat__typing">
                    <span /><span /><span />
                  </div>
                </div>
              </article>
            )}

            {sendError && <p className="mono-chat__error">{sendError}</p>}
          </div>

          {/* Composer */}
          <form className="mono-chat__composer" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escreva sua mensagem... (Enter para enviar)"
              rows={1}
              disabled={isSending || !!contextError}
              className="mono-chat__input"
              data-tour="chat-input"
            />
            <button
              type="submit"
              className="mono-chat__send primary-button"
              disabled={!message.trim() || isSending || !!contextError}
              aria-label="Enviar mensagem"
            >
              {isSending ? (
                <span className="mono-chat__spinner mono-chat__spinner--sm" />
              ) : (
                <Icon icon="solar:arrow-up-bold" width={20} />
              )}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
