import SupportTicket from "../models/SupportTicket.js";
import SupportTicketReply from "../models/SupportTicketReply.js";
import User from "../models/User.js";
import { isAdminRole } from "../../shared/constants/roles.js";

const CATEGORIES = new Set(["technical", "account", "book", "general"]);
const STATUSES = new Set(["open", "pending", "resolved", "closed"]);
const PRIORITIES = new Set(["low", "normal", "high"]);

const MAX_SUBJECT = 160;
const MAX_MESSAGE = 5000;

const meId = (req) => {
  const raw = req.user?.id ?? req.user?.userId ?? req.user?.sub;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const isAdmin = (req) => isAdminRole(req.user?.role);

const sanitize = (s, max) =>
  String(s ?? "").trim().slice(0, max);

const fail = (res, status, message, extra = {}) =>
  res.status(status).json({ success: false, message, ...extra });

/** Lightweight user lookup so admins see who opened a ticket. */
const fetchAuthorMap = async (userIds) => {
  if (userIds.length === 0) return new Map();
  const rows = await User.findAll({
    where: { id: [...new Set(userIds)] },
    attributes: ["id", "username", "email", "role", "profileImage"],
  });
  return new Map(rows.map((u) => [u.id, u.get({ plain: true })]));
};

const publicTicket = (ticket, authorMap) => {
  const t = ticket.get({ plain: true });
  return {
    id: t.id,
    userId: t.userId,
    subject: t.subject,
    message: t.message,
    category: t.category,
    status: t.status,
    priority: t.priority,
    createdAt: t.created_at ?? t.createdAt,
    updatedAt: t.updated_at ?? t.updatedAt,
    requester: authorMap?.get(t.userId) || null,
    replies: Array.isArray(t.replies)
      ? t.replies
          .slice()
          .sort(
            (a, b) =>
              new Date(a.created_at ?? a.createdAt) -
              new Date(b.created_at ?? b.createdAt)
          )
          .map((r) => ({
            id: r.id,
            ticketId: r.ticketId ?? r.ticket_id,
            authorId: r.authorId ?? r.author_id,
            authorRole: r.authorRole ?? r.author_role,
            message: r.message,
            createdAt: r.created_at ?? r.createdAt,
            author: authorMap?.get(r.authorId ?? r.author_id) || null,
          }))
      : [],
  };
};

// ============================================================
// POST /support/tickets   — any authenticated user
// ============================================================
export const createTicket = async (req, res) => {
  const userId = meId(req);
  if (!userId) return fail(res, 401, "Not authenticated");

  const subject = sanitize(req.body?.subject, MAX_SUBJECT);
  const message = sanitize(req.body?.message, MAX_MESSAGE);
  const category = String(req.body?.category || "general").trim().toLowerCase();

  if (!subject) return fail(res, 400, "Subject is required");
  if (!message || message.length < 5)
    return fail(res, 400, "Message must be at least 5 characters");
  if (!CATEGORIES.has(category))
    return fail(res, 400, `Invalid category. Allowed: ${[...CATEGORIES].join(", ")}`);

  try {
    const ticket = await SupportTicket.create({
      userId,
      subject,
      message,
      category,
      status: "open",
      priority: "normal",
    });

    console.log(
      `[support] ticket created -> id=${ticket.id} userId=${userId} category=${category}`
    );

    const authorMap = await fetchAuthorMap([userId]);
    return res
      .status(201)
      .json({ success: true, ticket: publicTicket(ticket, authorMap) });
  } catch (err) {
    console.error("[support] createTicket error:", err.message);
    return fail(res, 500, "Failed to create ticket");
  }
};

// ============================================================
// GET /support/tickets   — admin: everyone, user: own only
// Query: ?status=&category=&priority=&q=
// ============================================================
export const listTickets = async (req, res) => {
  const userId = meId(req);
  if (!userId) return fail(res, 401, "Not authenticated");

  const where = {};

  if (req.query.status) {
    const status = String(req.query.status).toLowerCase();
    if (STATUSES.has(status)) where.status = status;
  }
  if (req.query.category) {
    const cat = String(req.query.category).toLowerCase();
    if (CATEGORIES.has(cat)) where.category = cat;
  }
  if (req.query.priority) {
    const pr = String(req.query.priority).toLowerCase();
    if (PRIORITIES.has(pr)) where.priority = pr;
  }

  if (!isAdmin(req)) {
    where.userId = userId;
  } else if (req.query.userId) {
    const uid = Number(req.query.userId);
    if (Number.isFinite(uid)) where.userId = uid;
  }

  try {
    const tickets = await SupportTicket.findAll({
      where,
      order: [["updated_at", "DESC"]],
    });

    const ids = tickets.map((t) => t.userId);
    const authorMap = await fetchAuthorMap(ids);

    console.log(
      `[support] list -> requesterId=${userId} isAdmin=${isAdmin(req)} count=${tickets.length}`
    );

    return res.json({
      success: true,
      tickets: tickets.map((t) => publicTicket(t, authorMap)),
    });
  } catch (err) {
    console.error("[support] listTickets error:", err.message);
    return fail(res, 500, "Failed to load tickets");
  }
};

// ============================================================
// GET /support/tickets/me   — ALWAYS the requester's own tickets,
// even for admins. Same filter options as the main list.
// ============================================================
export const listMyTickets = async (req, res) => {
  const userId = meId(req);
  if (!userId) return fail(res, 401, "Not authenticated");

  const where = { userId };
  if (req.query.status) {
    const status = String(req.query.status).toLowerCase();
    if (STATUSES.has(status)) where.status = status;
  }
  if (req.query.category) {
    const cat = String(req.query.category).toLowerCase();
    if (CATEGORIES.has(cat)) where.category = cat;
  }

  try {
    const tickets = await SupportTicket.findAll({
      where,
      order: [["updated_at", "DESC"]],
    });
    const authorMap = await fetchAuthorMap([userId]);

    console.log(`[support] list-mine -> userId=${userId} count=${tickets.length}`);

    return res.json({
      success: true,
      tickets: tickets.map((t) => publicTicket(t, authorMap)),
    });
  } catch (err) {
    console.error("[support] listMyTickets error:", err.message);
    return fail(res, 500, "Failed to load your tickets");
  }
};

// ============================================================
// GET /support/tickets/:id   — owner OR admin
// ============================================================
export const getTicket = async (req, res) => {
  const userId = meId(req);
  if (!userId) return fail(res, 401, "Not authenticated");

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return fail(res, 400, "Invalid ticket id");

  try {
    const ticket = await SupportTicket.findByPk(id, {
      include: [{ model: SupportTicketReply, as: "replies" }],
    });
    if (!ticket) return fail(res, 404, "Ticket not found");

    if (!isAdmin(req) && ticket.userId !== userId) {
      return fail(res, 403, "Forbidden");
    }

    const ids = [ticket.userId, ...ticket.replies.map((r) => r.authorId)];
    const authorMap = await fetchAuthorMap(ids);

    return res.json({ success: true, ticket: publicTicket(ticket, authorMap) });
  } catch (err) {
    console.error("[support] getTicket error:", err.message);
    return fail(res, 500, "Failed to load ticket");
  }
};

// ============================================================
// POST /support/tickets/:id/reply   — owner OR admin
// ============================================================
export const replyToTicket = async (req, res) => {
  const userId = meId(req);
  if (!userId) return fail(res, 401, "Not authenticated");

  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return fail(res, 400, "Invalid ticket id");

  const message = sanitize(req.body?.message, MAX_MESSAGE);
  if (!message || message.length < 1) return fail(res, 400, "Message is required");

  try {
    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) return fail(res, 404, "Ticket not found");

    const admin = isAdmin(req);
    if (!admin && ticket.userId !== userId) return fail(res, 403, "Forbidden");
    if (ticket.status === "closed")
      return fail(res, 400, "This ticket is closed and cannot receive new replies.");

    await SupportTicketReply.create({
      ticketId: ticket.id,
      authorId: userId,
      authorRole: admin ? "admin" : "user",
      message,
    });

    // Automatic status transitions:
    //  - admin replies on an open ticket  -> pending (waiting for user)
    //  - user replies on a pending ticket -> open (waiting for admin)
    if (admin && ticket.status === "open") ticket.status = "pending";
    else if (!admin && ticket.status === "pending") ticket.status = "open";

    // Touch updatedAt so the ticket bubbles to the top of the queue even when
    // no status transition happened (Sequelize otherwise skips the timestamp).
    ticket.set("updatedAt", new Date());
    ticket.changed("updatedAt", true);
    await ticket.save();

    const fresh = await SupportTicket.findByPk(ticket.id, {
      include: [{ model: SupportTicketReply, as: "replies" }],
    });
    const ids = [fresh.userId, ...fresh.replies.map((r) => r.authorId)];
    const authorMap = await fetchAuthorMap(ids);

    console.log(
      `[support] reply -> ticketId=${ticket.id} by=${userId} role=${admin ? "admin" : "user"}`
    );
    return res.json({ success: true, ticket: publicTicket(fresh, authorMap) });
  } catch (err) {
    console.error("[support] replyToTicket error:", err.message);
    return fail(res, 500, "Failed to add reply");
  }
};

// ============================================================
// PATCH /support/tickets/:id/status   — admin only
// ============================================================
export const updateTicketStatus = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return fail(res, 400, "Invalid ticket id");

  const status = String(req.body?.status || "").trim().toLowerCase();
  if (!STATUSES.has(status))
    return fail(res, 400, `Invalid status. Allowed: ${[...STATUSES].join(", ")}`);

  try {
    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) return fail(res, 404, "Ticket not found");
    ticket.status = status;
    await ticket.save();

    console.log(
      `[support] status changed -> ticketId=${ticket.id} status=${status} by=${meId(req)}`
    );
    return res.json({
      success: true,
      message: `Ticket marked ${status}`,
      ticket: publicTicket(ticket),
    });
  } catch (err) {
    console.error("[support] updateTicketStatus error:", err.message);
    return fail(res, 500, "Failed to update status");
  }
};

// ============================================================
// PATCH /support/tickets/:id/priority   — admin only
// ============================================================
export const updateTicketPriority = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return fail(res, 400, "Invalid ticket id");

  const priority = String(req.body?.priority || "").trim().toLowerCase();
  if (!PRIORITIES.has(priority))
    return fail(res, 400, `Invalid priority. Allowed: ${[...PRIORITIES].join(", ")}`);

  try {
    const ticket = await SupportTicket.findByPk(id);
    if (!ticket) return fail(res, 404, "Ticket not found");
    ticket.priority = priority;
    await ticket.save();
    return res.json({
      success: true,
      message: `Priority set to ${priority}`,
      ticket: publicTicket(ticket),
    });
  } catch (err) {
    console.error("[support] updateTicketPriority error:", err.message);
    return fail(res, 500, "Failed to update priority");
  }
};
