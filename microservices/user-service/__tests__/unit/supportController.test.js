import { jest, describe, beforeEach, beforeAll, it, expect } from "@jest/globals";

// ── Mocked models ────────────────────────────────────────────────────
const SupportTicket = {
  create: jest.fn(),
  findAll: jest.fn(),
  findByPk: jest.fn(),
};
const SupportTicketReply = {
  create: jest.fn(),
};
const User = {
  findAll: jest.fn(async () => []),
};

jest.unstable_mockModule("../../models/SupportTicket.js", () => ({
  default: SupportTicket,
}));
jest.unstable_mockModule("../../models/SupportTicketReply.js", () => ({
  default: SupportTicketReply,
}));
jest.unstable_mockModule("../../models/User.js", () => ({ default: User }));

let createTicket,
  listTickets,
  listMyTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  updateTicketPriority;

let makeReq, makeRes, makeFakeRow, muteConsole;

beforeAll(async () => {
  ({ makeReq, makeRes, makeFakeRow, muteConsole } = await import(
    "../../../__tests__/_helpers/http.js"
  ));
  ({
    createTicket,
    listTickets,
    listMyTickets,
    getTicket,
    replyToTicket,
    updateTicketStatus,
    updateTicketPriority,
  } = await import("../../controllers/supportController.js"));
});

beforeEach(() => {
  jest.clearAllMocks();
  muteConsole();
  User.findAll.mockResolvedValue([]);
});

const makeTicketRow = (overrides = {}) => {
  const fields = {
    id: 1,
    userId: 5,
    subject: "Help",
    message: "Please help me",
    category: "general",
    status: "open",
    priority: "normal",
    created_at: new Date("2025-01-01T00:00:00Z"),
    updated_at: new Date("2025-01-01T00:00:00Z"),
    replies: [],
    ...overrides,
  };
  return makeFakeRow(fields);
};

// ====================================================================
describe("createTicket", () => {
  it("401s when the request is unauthenticated", async () => {
    const req = makeReq({ body: { subject: "x", message: "longenough" } });
    const res = makeRes();
    await createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("400s when subject is empty", async () => {
    const req = makeReq({
      user: { id: 5 },
      body: { subject: "   ", message: "longenough" },
    });
    const res = makeRes();
    await createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400s when message < 5 chars", async () => {
    const req = makeReq({
      user: { id: 5 },
      body: { subject: "x", message: "hi" },
    });
    const res = makeRes();
    await createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("400s on an unsupported category", async () => {
    const req = makeReq({
      user: { id: 5 },
      body: { subject: "x", message: "longenough", category: "MALICIOUS" },
    });
    const res = makeRes();
    await createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("creates the ticket with sanitised fields and defaults open/normal", async () => {
    const ticket = makeTicketRow({ id: 42 });
    SupportTicket.create.mockResolvedValueOnce(ticket);
    const req = makeReq({
      user: { id: 5 },
      body: {
        subject: "  Need help with login  ",
        message: "I cannot log in to the system, can you help?",
        category: " TECHNICAL ",
      },
    });
    const res = makeRes();
    await createTicket(req, res);

    expect(SupportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 5,
        subject: "Need help with login",
        message: expect.stringContaining("I cannot log in"),
        category: "technical",
        status: "open",
        priority: "normal",
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("returns 500 when DB creation fails", async () => {
    SupportTicket.create.mockRejectedValueOnce(new Error("db down"));
    const req = makeReq({
      user: { id: 5 },
      body: { subject: "x", message: "longenough" },
    });
    const res = makeRes();
    await createTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ====================================================================
describe("listTickets", () => {
  it("401s when unauthenticated", async () => {
    const res = makeRes();
    await listTickets(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("scopes the query to the caller's own tickets for non-admins", async () => {
    SupportTicket.findAll.mockResolvedValueOnce([]);
    const req = makeReq({
      user: { id: 5, role: "ROLE_USER" },
      query: { status: "open" },
    });
    const res = makeRes();
    await listTickets(req, res);

    expect(SupportTicket.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 5, status: "open" }),
      })
    );
  });

  it("lets admins see ALL tickets and accepts an optional userId filter", async () => {
    SupportTicket.findAll.mockResolvedValueOnce([]);
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      query: { userId: "9", priority: "high", category: "account" },
    });
    const res = makeRes();
    await listTickets(req, res);

    expect(SupportTicket.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 9,
          priority: "high",
          category: "account",
        }),
      })
    );
  });

  it("silently drops invalid filter values (defence-in-depth against SQL noise)", async () => {
    SupportTicket.findAll.mockResolvedValueOnce([]);
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      query: {
        status: "MALICIOUS",
        priority: "NUCLEAR",
        category: "DROP_TABLE",
      },
    });
    const res = makeRes();
    await listTickets(req, res);

    const call = SupportTicket.findAll.mock.calls[0][0];
    expect(call.where).not.toHaveProperty("status");
    expect(call.where).not.toHaveProperty("priority");
    expect(call.where).not.toHaveProperty("category");
  });

  it("returns 500 on DB failure", async () => {
    SupportTicket.findAll.mockRejectedValueOnce(new Error("dead"));
    const req = makeReq({ user: { id: 1, role: "ROLE_ADMIN" } });
    const res = makeRes();
    await listTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("maps every row through publicTicket and enriches with the author lookup", async () => {
    SupportTicket.findAll.mockResolvedValueOnce([
      makeTicketRow({ id: 1, userId: 5, replies: [] }),
      makeTicketRow({ id: 2, userId: 6, replies: [] }),
    ]);
    User.findAll.mockResolvedValueOnce([
      // Sequelize-shaped rows with a `.get({plain:true})` accessor.
      makeFakeRow({ id: 5, username: "alice", email: "a@x", role: "ROLE_USER" }),
      makeFakeRow({ id: 6, username: "bob", email: "b@x", role: "ROLE_USER" }),
    ]);

    const req = makeReq({ user: { id: 1, role: "ROLE_ADMIN" } });
    const res = makeRes();
    await listTickets(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.tickets).toHaveLength(2);
    // The map arrow inside `tickets.map(...)` ran, so requester is attached.
    expect(body.tickets[0].requester).toMatchObject({ username: "alice" });
    expect(body.tickets[1].requester).toMatchObject({ username: "bob" });
  });
});

// ====================================================================
describe("listMyTickets", () => {
  it("always scopes the query to the requester regardless of role", async () => {
    SupportTicket.findAll.mockResolvedValueOnce([]);
    const req = makeReq({
      user: { id: 7, role: "ROLE_ADMIN" },
      query: { status: "open", category: "general" },
    });
    const res = makeRes();
    await listMyTickets(req, res);

    expect(SupportTicket.findAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 7,
          status: "open",
          category: "general",
        }),
      })
    );
  });

  it("401s when unauthenticated", async () => {
    const res = makeRes();
    await listMyTickets(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("maps every row through publicTicket in the response", async () => {
    SupportTicket.findAll.mockResolvedValueOnce([
      makeTicketRow({ id: 11, userId: 7, replies: [] }),
    ]);
    User.findAll.mockResolvedValueOnce([
      makeFakeRow({ id: 7, username: "carol", email: "c@x", role: "ROLE_USER" }),
    ]);
    const req = makeReq({ user: { id: 7, role: "ROLE_USER" } });
    const res = makeRes();
    await listMyTickets(req, res);

    const body = res.json.mock.calls[0][0];
    expect(body.tickets).toHaveLength(1);
    expect(body.tickets[0].id).toBe(11);
  });
});

// ====================================================================
describe("getTicket", () => {
  it("400s on invalid id", async () => {
    const req = makeReq({ user: { id: 1 }, params: { id: "abc" } });
    const res = makeRes();
    await getTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s when the ticket is missing", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(null);
    const req = makeReq({ user: { id: 1 }, params: { id: "1" } });
    const res = makeRes();
    await getTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("forbids a user from viewing someone else's ticket", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(
      makeTicketRow({ userId: 99, replies: [] })
    );
    const req = makeReq({
      user: { id: 5, role: "ROLE_USER" },
      params: { id: "1" },
    });
    const res = makeRes();
    await getTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("allows the owner to view their own ticket", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(
      makeTicketRow({ userId: 5, replies: [] })
    );
    const req = makeReq({
      user: { id: 5, role: "ROLE_USER" },
      params: { id: "1" },
    });
    const res = makeRes();
    await getTicket(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("allows any admin to view any ticket", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(
      makeTicketRow({ userId: 99, replies: [] })
    );
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      params: { id: "1" },
    });
    const res = makeRes();
    await getTicket(req, res);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });
});

// ====================================================================
describe("replyToTicket — state transitions are the core business rule", () => {
  it("admin reply on an OPEN ticket flips it to PENDING (waiting for user)", async () => {
    const ticket = makeTicketRow({ userId: 5, status: "open" });
    SupportTicket.findByPk
      .mockResolvedValueOnce(ticket) // initial lookup
      .mockResolvedValueOnce(makeTicketRow({ userId: 5, status: "pending" })); // post-save refetch

    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      params: { id: "1" },
      body: { message: "Looking into it." },
    });
    const res = makeRes();
    await replyToTicket(req, res);

    expect(SupportTicketReply.create).toHaveBeenCalledWith(
      expect.objectContaining({
        ticketId: ticket.id,
        authorId: 1,
        authorRole: "admin",
        message: "Looking into it.",
      })
    );
    expect(ticket.status).toBe("pending");
    expect(ticket.save).toHaveBeenCalledTimes(1);
  });

  it("user reply on a PENDING ticket flips it back to OPEN (waiting for admin)", async () => {
    const ticket = makeTicketRow({ userId: 5, status: "pending" });
    SupportTicket.findByPk
      .mockResolvedValueOnce(ticket)
      .mockResolvedValueOnce(makeTicketRow({ userId: 5, status: "open" }));

    const req = makeReq({
      user: { id: 5, role: "ROLE_USER" },
      params: { id: "1" },
      body: { message: "Any update?" },
    });
    const res = makeRes();
    await replyToTicket(req, res);

    expect(SupportTicketReply.create).toHaveBeenCalledWith(
      expect.objectContaining({ authorRole: "user" })
    );
    expect(ticket.status).toBe("open");
  });

  it("rejects replies on CLOSED tickets", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(
      makeTicketRow({ userId: 5, status: "closed" })
    );
    const req = makeReq({
      user: { id: 5 },
      params: { id: "1" },
      body: { message: "anything" },
    });
    const res = makeRes();
    await replyToTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("forbids a stranger from replying to someone else's ticket", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(makeTicketRow({ userId: 99 }));
    const req = makeReq({
      user: { id: 5, role: "ROLE_USER" },
      params: { id: "1" },
      body: { message: "hello" },
    });
    const res = makeRes();
    await replyToTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("400s on an empty message body", async () => {
    const req = makeReq({
      user: { id: 5 },
      params: { id: "1" },
      body: { message: "" },
    });
    const res = makeRes();
    await replyToTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("401s when unauthenticated", async () => {
    const res = makeRes();
    await replyToTicket(makeReq({ params: { id: "1" } }), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("400s on invalid id", async () => {
    const req = makeReq({
      user: { id: 5 },
      params: { id: "abc" },
      body: { message: "x" },
    });
    const res = makeRes();
    await replyToTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });
});

// ====================================================================
describe("updateTicketStatus", () => {
  it("rejects unknown status values", async () => {
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      params: { id: "1" },
      body: { status: "WRECKED" },
    });
    const res = makeRes();
    await updateTicketStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("accepts whitelisted statuses and persists them", async () => {
    const ticket = makeTicketRow();
    SupportTicket.findByPk.mockResolvedValueOnce(ticket);
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      params: { id: "1" },
      body: { status: "resolved" },
    });
    const res = makeRes();
    await updateTicketStatus(req, res);
    expect(ticket.status).toBe("resolved");
    expect(ticket.save).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true })
    );
  });

  it("400s on non-numeric ticket id", async () => {
    const res = makeRes();
    await updateTicketStatus(
      makeReq({ params: { id: "abc" }, body: { status: "open" } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s when the ticket is missing", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(null);
    const res = makeRes();
    await updateTicketStatus(
      makeReq({
        user: { id: 1, role: "ROLE_ADMIN" },
        params: { id: "1" },
        body: { status: "open" },
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when the DB save fails", async () => {
    const ticket = makeTicketRow();
    ticket.save.mockRejectedValueOnce(new Error("db boom"));
    SupportTicket.findByPk.mockResolvedValueOnce(ticket);
    const res = makeRes();
    await updateTicketStatus(
      makeReq({
        user: { id: 1, role: "ROLE_ADMIN" },
        params: { id: "1" },
        body: { status: "resolved" },
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe("updateTicketPriority", () => {
  it("rejects unknown priorities", async () => {
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      params: { id: "1" },
      body: { priority: "URGENT" },
    });
    const res = makeRes();
    await updateTicketPriority(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("accepts whitelisted priorities and persists them", async () => {
    const ticket = makeTicketRow();
    SupportTicket.findByPk.mockResolvedValueOnce(ticket);
    const req = makeReq({
      user: { id: 1, role: "ROLE_ADMIN" },
      params: { id: "1" },
      body: { priority: "high" },
    });
    const res = makeRes();
    await updateTicketPriority(req, res);
    expect(ticket.priority).toBe("high");
    expect(ticket.save).toHaveBeenCalledTimes(1);
  });

  it("400s on non-numeric ticket id", async () => {
    const res = makeRes();
    await updateTicketPriority(
      makeReq({ params: { id: "abc" }, body: { priority: "high" } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("404s when the ticket is missing", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(null);
    const res = makeRes();
    await updateTicketPriority(
      makeReq({
        user: { id: 1, role: "ROLE_ADMIN" },
        params: { id: "1" },
        body: { priority: "low" },
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 500 when the DB save fails", async () => {
    const ticket = makeTicketRow();
    ticket.save.mockRejectedValueOnce(new Error("db boom"));
    SupportTicket.findByPk.mockResolvedValueOnce(ticket);
    const res = makeRes();
    await updateTicketPriority(
      makeReq({
        user: { id: 1, role: "ROLE_ADMIN" },
        params: { id: "1" },
        body: { priority: "low" },
      }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ====================================================================
describe("publicTicket reply serialisation (exercised via getTicket)", () => {
  it("sorts replies chronologically and includes them in the response", async () => {
    const replies = [
      {
        id: 2,
        ticketId: 1,
        authorId: 5,
        authorRole: "user",
        message: "later",
        created_at: new Date("2025-01-02T00:00:00Z"),
      },
      {
        id: 1,
        ticketId: 1,
        authorId: 1,
        authorRole: "admin",
        message: "earlier",
        created_at: new Date("2025-01-01T00:00:00Z"),
      },
    ];
    SupportTicket.findByPk.mockResolvedValueOnce(
      makeTicketRow({ userId: 5, replies })
    );
    const req = makeReq({
      user: { id: 5, role: "ROLE_USER" },
      params: { id: "1" },
    });
    const res = makeRes();
    await getTicket(req, res);

    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.ticket.replies).toHaveLength(2);
    // Earlier comes first after sort.
    expect(payload.ticket.replies[0]).toMatchObject({
      id: 1,
      message: "earlier",
    });
    expect(payload.ticket.replies[1].id).toBe(2);
  });

  it("returns 500 when getTicket's DB lookup throws", async () => {
    SupportTicket.findByPk.mockRejectedValueOnce(new Error("explode"));
    const res = makeRes();
    await getTicket(
      makeReq({ user: { id: 5 }, params: { id: "1" } }),
      res
    );
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ====================================================================
describe("listMyTickets / replyToTicket error paths", () => {
  it("returns 500 from listMyTickets when DB fails", async () => {
    SupportTicket.findAll.mockRejectedValueOnce(new Error("nope"));
    const req = makeReq({ user: { id: 5 } });
    const res = makeRes();
    await listMyTickets(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("returns 500 from replyToTicket when DB fails mid-write", async () => {
    SupportTicket.findByPk.mockRejectedValueOnce(new Error("dead"));
    const req = makeReq({
      user: { id: 5 },
      params: { id: "1" },
      body: { message: "hello" },
    });
    const res = makeRes();
    await replyToTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it("404s in replyToTicket when ticket missing", async () => {
    SupportTicket.findByPk.mockResolvedValueOnce(null);
    const req = makeReq({
      user: { id: 5 },
      params: { id: "1" },
      body: { message: "hello" },
    });
    const res = makeRes();
    await replyToTicket(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
