"use client";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { api, useLocal, whatsappNumber } from "../lib/local/client";
import { brandNames, type Brand, type Conversation } from "../lib/local/types";
export default function LiveChat({ brand = "idesire" }: { brand?: Brand }) {
  const { data } = useLocal();
  const [open, setOpen] = useState(false),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [phone, setPhone] = useState(""),
    [text, setText] = useState(""),
    [conversation, setConversation] = useState<Conversation | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [unread, setUnread] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const lastStaff = useRef("");
  const openRef = useRef(false),
    activeRef = useRef(false);
  openRef.current = open;
  activeRef.current = !!conversation;
  const sending = useRef(false),
    mutationVersion = useRef(0),
    initialized = useRef(false);
  useEffect(() => {
    let alive = true,
      pending = false;
    const load = async () => {
      if (pending || sending.current) return;
      pending = true;
      const version = mutationVersion.current;
      try {
        const d = await api(`/api/local/chat/${brand}`);
        if (!alive || version !== mutationVersion.current) return;
        setConversation(d.conversation);
        const last = d.conversation?.messages
          .filter((m: any) => m.from === "staff")
          .at(-1)?.id;
        if (last && initialized.current && last !== lastStaff.current)
          setUnread(true);
        lastStaff.current = last || "";
        initialized.current = true;
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        pending = false;
      }
    };
    void load();
    // Poll only for visitors who have a conversation or the panel open.
    const timer = setInterval(() => {
      if (!document.hidden && (openRef.current || activeRef.current)) void load();
    }, 4000);
    window.addEventListener("focus", load);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("focus", load);
    };
  }, [brand]);
  useEffect(() => {
    if (open) {
      setUnread(false);
      end.current?.scrollIntoView({ block: "nearest" });
    }
  }, [conversation, open]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    sending.current = true;
    mutationVersion.current++;
    setBusy(true);
    setError("");
    try {
      const d = await api(`/api/local/chat/${brand}`, { name, email, phone, text });
      setConversation(d.conversation);
      initialized.current = true;
      setText("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };
  return (
    <div className={`live-chat-widget ${brand}-chat`}>
      <button
        className="chat-launch"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={`${brand}-chat-panel`}
      >
        {open ? (
          "Close chat ×"
        ) : (
          <>
            <span className="chat-label-full">
              Chat with {brand === "kokies" ? "Kokies" : "us"} ✦
            </span>
            <span className="chat-label-short" aria-hidden="true">
              <MessageCircle size={20} strokeWidth={1.8} />
            </span>
            <span className="sr-only chat-label-sr">Chat with us</span>
            {unread && <b> • New reply</b>}
          </>
        )}
      </button>
      {open && (
        <section
          id={`${brand}-chat-panel`}
          className="chat-panel"
          aria-label={`${brandNames[brand]} live chat`}
        >
          <header>
            <div>
              <strong>
                {brand === "kokies"
                  ? "Kokies gift concierge"
                  : "iDesire fabric care"}
              </strong>
              <small>
                {data?.settings.chatOnline
                  ? "Team available · leave your question"
                  : "Team away · leave a message for a reply"}
              </small>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </header>
          <div className="chat-messages" aria-live="polite">
            {!conversation?.messages.length && (
              <p className="chat-welcome">
                {data?.settings.chatWelcome ||
                  `Welcome to ${brandNames[brand]}. How can we help?`}
              </p>
            )}
            {conversation?.messages.map((m) => (
              <article
                className={
                  m.from === "visitor" ? "visitor-message" : "staff-message"
                }
                key={m.id}
              >
                <p>{m.text}</p>
                {m.product && (
                  <a href={m.product.href}>
                    <img src={m.product.image} alt="" />
                    {m.product.name} ↗
                  </a>
                )}
                <small>
                  {m.from === "visitor" ? "You" : m.staffName || "Team"} ·{" "}
                  {new Date(m.at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </small>
              </article>
            ))}
            <div ref={end} />
          </div>
          <form onSubmit={send}>
            {!conversation && (
              <>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  aria-label="Your name"
                  autoComplete="name"
                  required
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone or WhatsApp number"
                  aria-label="Phone or WhatsApp number"
                  autoComplete="tel"
                  inputMode="tel"
                  pattern="[+0-9 ()-]{10,20}"
                  title="Enter a phone number with at least 10 digits"
                  required
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  aria-label="Email (optional)"
                  autoComplete="email"
                />
              </>
            )}
            <textarea
              required
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="How can we help?"
              aria-label="Message"
              rows={2}
            />
            <button className="button button-dark" disabled={busy}>
              {busy ? "Sending…" : "Send message"}
            </button>
            {error && <p role="alert">{error}</p>}
            <a
              className="chat-whatsapp-link"
              href={`https://wa.me/${whatsappNumber(data?.settings.phone, brand === "kokies" ? "2349099591993" : "2348091142201")}`}
              target="_blank"
              rel="noreferrer"
            >
              Continue on WhatsApp ↗
            </a>
            <small>
              Replies appear here live. Keep this browser open to continue your
              conversation.
            </small>
          </form>
        </section>
      )}
    </div>
  );
}
