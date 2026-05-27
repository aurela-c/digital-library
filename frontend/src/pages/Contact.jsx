import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaPaperPlane,
  FaUserShield,
} from "react-icons/fa";

import HomeNavbar from "../components/HomeNavbar";
import Footer from "../components/Footer";
import PageContainer from "../components/layout/PageContainer";
import { AuthContext } from "../../context/AuthContext.jsx";
import {
  createSupportTicket,
  getMySupportTickets,
  getSupportTicket,
  replySupportTicket,
} from "../services/api";

const CATEGORIES = [
  { value: "technical", label: "Technical issue" },
  { value: "account", label: "Account problem" },
  { value: "book", label: "Book issue" },
  { value: "general", label: "General question" },
];

const STATUS_STYLE = {
  open: "bg-blue-50 text-blue-700 ring-1 ring-blue-100",
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-100",
  resolved: "bg-green-50 text-green-700 ring-1 ring-green-100",
  closed: "bg-gray-100 text-gray-600 ring-1 ring-gray-200",
};

const apiErr = (err, fallback) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

const fmtDate = (v) => {
  if (!v) return "";
  try {
    return new Date(v).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return String(v);
  }
};

const EMPTY_FORM = { subject: "", category: "general", message: "" };

const Contact = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const isAuthed = Boolean(user || localStorage.getItem("accessToken"));

  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [tickets, setTickets] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [loadingActive, setLoadingActive] = useState(false);

  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);

  const setField = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const loadTickets = useCallback(async () => {
    if (!isAuthed) return;
    setLoadingList(true);
    try {
      // /me explicitly — even an admin viewing /contact only sees their own
      // submissions here. The admin dashboard is the place to see everyone's.
      const res = await getMySupportTickets();
      const list = Array.isArray(res.data?.tickets) ? res.data.tickets : [];
      list.sort(
        (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
      );
      setTickets(list);
    } catch (err) {
      toast.error(apiErr(err, "Could not load your messages."));
    } finally {
      setLoadingList(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  const openTicket = useCallback(async (id) => {
    if (activeId === id) {
      setActiveId(null);
      setActive(null);
      setReplyDraft("");
      return;
    }
    setActiveId(id);
    setActive(null);
    setReplyDraft("");
    setLoadingActive(true);
    try {
      const res = await getSupportTicket(id);
      setActive(res.data?.ticket || null);
    } catch (err) {
      toast.error(apiErr(err, "Could not load that conversation."));
    } finally {
      setLoadingActive(false);
    }
  }, [activeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthed) {
      toast.info("Please sign in first.");
      navigate("/login");
      return;
    }
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!subject) return toast.error("Please add a short subject.");
    if (message.length < 5)
      return toast.error("Tell us a bit more (min. 5 characters).");

    setSubmitting(true);
    try {
      await createSupportTicket({
        subject,
        message,
        category: form.category,
      });
      toast.success("Message sent — we'll get back to you shortly.");
      setForm(EMPTY_FORM);
      loadTickets();
      setShowHistory(true);
    } catch (err) {
      toast.error(apiErr(err, "Could not send your message."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!active) return;
    const message = replyDraft.trim();
    if (!message) return;
    setReplying(true);
    try {
      const res = await replySupportTicket(active.id, { message });
      setActive(res.data?.ticket || active);
      setReplyDraft("");
      loadTickets();
    } catch (err) {
      toast.error(apiErr(err, "Could not send reply."));
    } finally {
      setReplying(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#f5efe9]">
      <HomeNavbar />

      <main className="flex-1">
        <PageContainer className="py-10 sm:py-14">
          {/* Back link — minimal */}
          <Link
            to="/home"
            className="mb-8 inline-flex items-center gap-2 text-xs font-medium text-gray-500 transition hover:text-[#D34F4E]"
          >
            <FaArrowLeft className="text-[10px]" />
            Back
          </Link>

          {/* Centered, single-column layout */}
          <div className="mx-auto w-full max-w-xl">
            <header className="mb-8 text-center">
              <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                Contact support
              </h1>
              <p className="mt-2 text-sm text-gray-500 sm:text-base">
                Send a message to our team. We'll reply within one business day.
              </p>
            </header>

            {/* The form — the only thing in focus */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
            >
              <div className="space-y-5">
                <Field label="Category" htmlFor="ct-category">
                  <select
                    id="ct-category"
                    value={form.category}
                    onChange={setField("category")}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/15"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Subject"
                  htmlFor="ct-subject"
                  hint="A short summary of your message."
                >
                  <input
                    id="ct-subject"
                    type="text"
                    maxLength={160}
                    value={form.subject}
                    onChange={setField("subject")}
                    placeholder="e.g. Can't borrow a book"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 transition placeholder:text-gray-400 focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/15"
                  />
                </Field>

                <Field
                  label="Message"
                  htmlFor="ct-message"
                  hint="Add any detail that helps us help you."
                >
                  <textarea
                    id="ct-message"
                    rows={6}
                    maxLength={5000}
                    value={form.message}
                    onChange={setField("message")}
                    placeholder="Describe what's going on…"
                    className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-gray-800 transition placeholder:text-gray-400 focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/15"
                  />
                  <p className="mt-1 text-right text-[11px] text-gray-400">
                    {form.message.length} / 5000
                  </p>
                </Field>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#D34F4E] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c04544] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Sending…
                  </>
                ) : (
                  <>
                    <FaPaperPlane className="text-xs" />
                    Send message
                  </>
                )}
              </button>
            </form>

            {/* Tiny, low-key reassurance line — no email channel involved. */}
            <p className="mt-4 text-center text-xs text-gray-500">
              Our team usually replies within 24 hours.
            </p>

            {/* Past conversations — collapsed by default, never dominant */}
            {isAuthed && tickets.length > 0 && (
              <HistoryPanel
                open={showHistory}
                onToggle={() => setShowHistory((s) => !s)}
                tickets={tickets}
                loading={loadingList}
                activeId={activeId}
                onSelect={openTicket}
                active={active}
                loadingActive={loadingActive}
                meId={user?.id}
                replyDraft={replyDraft}
                setReplyDraft={setReplyDraft}
                onReply={handleReply}
                replying={replying}
              />
            )}
          </div>
        </PageContainer>
      </main>

      <Footer />
    </div>
  );
};

// ============================================================
// Form field — label above input + optional muted helper text
// ============================================================
const Field = ({ label, htmlFor, hint, children }) => (
  <div>
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-medium text-gray-800"
    >
      {label}
    </label>
    {children}
    {hint && <p className="mt-1 text-[11px] text-gray-400">{hint}</p>}
  </div>
);

// ============================================================
// Past conversations — collapsible, visually quiet
// ============================================================
const HistoryPanel = ({
  open,
  onToggle,
  tickets,
  loading,
  activeId,
  onSelect,
  active,
  loadingActive,
  meId,
  replyDraft,
  setReplyDraft,
  onReply,
  replying,
}) => (
  <div className="mt-10">
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between rounded-lg px-1 py-2 text-left text-sm text-gray-600 transition hover:text-[#D34F4E]"
      aria-expanded={open}
    >
      <span className="font-medium">
        Your conversations
        <span className="ml-2 text-xs text-gray-400">({tickets.length})</span>
      </span>
      {open ? (
        <FaChevronUp className="text-xs" />
      ) : (
        <FaChevronDown className="text-xs" />
      )}
    </button>

    {open && (
      <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {loading && tickets.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Loading…
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tickets.map((t) => {
              const isOpen = activeId === t.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(t.id)}
                    className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50 ${
                      isOpen ? "bg-gray-50" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {t.subject}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {fmtDate(t.updatedAt)}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-4">
                      {loadingActive ? (
                        <p className="text-center text-xs text-gray-500">
                          Loading conversation…
                        </p>
                      ) : active ? (
                        <ConversationThread
                          ticket={active}
                          meId={meId}
                          replyDraft={replyDraft}
                          setReplyDraft={setReplyDraft}
                          onReply={onReply}
                          replying={replying}
                        />
                      ) : null}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    )}
  </div>
);

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
      STATUS_STYLE[status] || STATUS_STYLE.open
    }`}
  >
    {status === "resolved" && <FaCheckCircle className="text-[9px]" />}
    {status}
  </span>
);

// ============================================================
// Conversation thread — compact bubbles + reply box
// ============================================================
const ConversationThread = ({
  ticket,
  meId,
  replyDraft,
  setReplyDraft,
  onReply,
  replying,
}) => {
  const closed = ticket.status === "closed";

  return (
    <div className="space-y-3">
      <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
        <Bubble
          mine
          authorRole="user"
          author={ticket.requester}
          message={ticket.message}
          createdAt={ticket.createdAt}
        />
        {(ticket.replies || []).map((r) => (
          <Bubble
            key={r.id}
            mine={r.authorId === meId}
            authorRole={r.authorRole}
            author={r.author}
            message={r.message}
            createdAt={r.createdAt}
          />
        ))}
      </div>

      {closed ? (
        <p className="rounded-lg bg-white px-3 py-2 text-xs text-gray-500">
          This conversation is closed.
        </p>
      ) : (
        <form onSubmit={onReply} className="space-y-2">
          <textarea
            rows={2}
            value={replyDraft}
            onChange={(e) => setReplyDraft(e.target.value)}
            placeholder="Write a reply…"
            className="w-full resize-y rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 transition placeholder:text-gray-400 focus:border-[#D34F4E] focus:outline-none focus:ring-2 focus:ring-[#D34F4E]/15"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={replying || !replyDraft.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#D34F4E] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#c04544] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FaPaperPlane className="text-[10px]" />
              {replying ? "Sending…" : "Send reply"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

const Bubble = ({ mine, authorRole, author, message, createdAt }) => {
  const isAdmin = authorRole === "admin";
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-xl px-3 py-2 text-sm shadow-sm ${
          mine
            ? "bg-[#D34F4E] text-white"
            : isAdmin
            ? "bg-blue-50 text-blue-900 ring-1 ring-blue-100"
            : "bg-white text-gray-800 ring-1 ring-gray-100"
        }`}
      >
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-75">
          {isAdmin && <FaUserShield className="text-[10px]" />}
          {author?.username || (isAdmin ? "Support" : "You")}
          <span className="opacity-70">· {fmtDate(createdAt)}</span>
        </div>
        <p className="mt-1 whitespace-pre-wrap break-words leading-snug">
          {message}
        </p>
      </div>
    </div>
  );
};

export default Contact;
