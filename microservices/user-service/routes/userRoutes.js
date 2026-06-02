import express from "express";
import { Op, QueryTypes } from "sequelize";
import { authMiddleware } from "../../shared/middleware/authMiddleware.js";
import { allowRoles } from "../../shared/middleware/roleMiddleware.js";
import { requireSelfOrAdmin } from "../../shared/middleware/requireSelfOrAdmin.js";
import {
  ROLES,
  toCanonicalRole,
} from "../../shared/constants/roles.js";
import { GetUserById } from "../controllers/userController.js";
import { invokeGrpc, sendGrpcError } from "../../shared/utils/grpcHttp.js";
import sequelize from "../config/database.js";
import User from "../models/User.js";
import SupportTicket from "../models/SupportTicket.js";

const router = express.Router();

// ---------- helpers ----------
const ALLOWED_STATUSES = new Set(["ACTIVE", "INACTIVE", "BANNED"]);

const publicUser = (u) => ({
  id: u.id,
  username: u.username,
  email: u.email,
  role: toCanonicalRole(u.role),
  profileImage: u.profileImage ?? null,
  isVerified: Boolean(u.isVerified),
  accountStatus: (u.accountStatus || "ACTIVE").toUpperCase(),
  createdAt: u.created_at,
});

/** Block admins from changing their own role or status (privilege escalation guard). */
const denySelfTarget = (req, res, next) => {
  const requesterId = String(req.user?.id ?? req.user?.sub ?? "");
  if (requesterId && requesterId === String(req.params.id)) {
    return res
      .status(403)
      .json({ success: false, message: "You cannot modify your own account here." });
  }
  next();
};

// ---------- routes ----------

/**
 * GET /users — admin-only listing.
 * Reads directly from the DB so we can include the new fields (isVerified,
 * accountStatus) without changing the user.proto / gRPC contract.
 */
/**
 * GET /users/admin/stats — admin-only aggregated dashboard counts.
 *
 * MUST be declared BEFORE `GET /:id` so the literal path isn't swallowed
 * by the wildcard route.
 */
router.get(
  "/admin/stats",
  authMiddleware,
  allowRoles(ROLES.ADMIN),
  async (req, res) => {
    /**
     * Defensive stats endpoint.
     *
     * Each count is awaited inside its own try/catch and falls back to 0
     * if it throws. This stops one misbehaving query (e.g. a column added
     * to the model AFTER the table was created, or a missing
     * support_tickets table on a fresh DB) from collapsing the whole
     * dashboard into a 500 → "[admin] stats endpoint failed, falling
     * back to client aggregation" client fallback.
     */
    const safeCount = async (label, runner) => {
      try {
        return await runner();
      } catch (err) {
        console.error(
          `[user-service] admin stats count "${label}" failed:`,
          err.message
        );
        return 0;
      }
    };

    // MySQL's default collation is case-insensitive, so a plain LIKE
    // works for both "ROLE_ADMIN" and "admin" without needing LOWER().
    const adminRoleLike = { role: { [Op.like]: "%admin%" } };

    // Books and categories live in the book-service's own model, but
    // every microservice points at the SAME `digital-library` MySQL
    // instance (see microservices/*/.env -> MYSQL_URL). So we can read
    // authoritative book/category totals via raw SQL from the user-
    // service connection without coupling to book-service code or
    // adding a gRPC roundtrip. This is the canonical source of truth
    // for the Overview cards — it does NOT depend on how many books the
    // frontend happens to have fetched on screen.
    const countBooks = async () => {
      const [row] = await sequelize.query(
        "SELECT COUNT(*) AS n FROM books",
        { type: QueryTypes.SELECT }
      );
      return Number(row?.n) || 0;
    };
    const countCategories = async () => {
      const [row] = await sequelize.query(
        "SELECT COUNT(DISTINCT category_id) AS n FROM books WHERE category_id IS NOT NULL",
        { type: QueryTypes.SELECT }
      );
      return Number(row?.n) || 0;
    };

    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      bannedUsers,
      adminCount,
      totalTickets,
      openTickets,
      totalBooks,
      totalCategories,
    ] = await Promise.all([
      safeCount("totalUsers", () => User.count()),
      safeCount("activeUsers", () =>
        User.count({ where: { accountStatus: "ACTIVE" } })
      ),
      safeCount("verifiedUsers", () =>
        User.count({ where: { isVerified: true } })
      ),
      safeCount("bannedUsers", () =>
        User.count({ where: { accountStatus: "BANNED" } })
      ),
      safeCount("adminCount", () => User.count({ where: adminRoleLike })),
      safeCount("totalTickets", () => SupportTicket.count()),
      safeCount("openTickets", () =>
        SupportTicket.count({ where: { status: "open" } })
      ),
      safeCount("totalBooks", countBooks),
      safeCount("totalCategories", countCategories),
    ]);

    console.log(
      `[user-service] admin stats -> users=${totalUsers} active=${activeUsers} tickets=${totalTickets} books=${totalBooks} categories=${totalCategories}`
    );

    return res.json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        verifiedUsers,
        bannedUsers,
        adminCount,
        totalTickets,
        openTickets,
        totalBooks,
        totalCategories,
      },
    });
  }
);

router.get("/", authMiddleware, allowRoles(ROLES.ADMIN), async (req, res) => {
  try {
    // Optional server-side filter. MySQL default collation is
    // case-insensitive so a plain LIKE matches "John", "JOHN", "john"
    // alike — no LOWER() necessary. We escape `%` and `_` in the
    // supplied query so user input doesn't act as a wildcard.
    const q = String(req.query.q ?? "").trim();
    const where = q
      ? (() => {
          const escaped = q.replace(/[\\%_]/g, "\\$&");
          const pattern = `%${escaped}%`;
          return {
            [Op.or]: [
              { username: { [Op.like]: pattern } },
              { email: { [Op.like]: pattern } },
            ],
          };
        })()
      : undefined;

    const rows = await User.findAll({
      where,
      order: [["created_at", "DESC"]],
      attributes: [
        "id",
        "username",
        "email",
        "role",
        "profileImage",
        "isVerified",
        "accountStatus",
        "created_at",
      ],
    });
    console.log(
      `[user-service] GET /users q="${q}" returned=${rows.length}`
    );
    res.json(rows.map(publicUser));
  } catch (err) {
    console.error("[user-service] list users error:", err.message);
    res.status(500).json({ success: false, message: "Failed to load users" });
  }
});

router.get("/:id", authMiddleware, requireSelfOrAdmin("id"), async (req, res) => {
  try {
    const response = await invokeGrpc(GetUserById, { id: req.params.id });
    res.json(response);
  } catch (err) {
    sendGrpcError(res, err);
  }
});

/**
 * PATCH /users/:id/role  body: { role: "ROLE_USER" | "ROLE_ADMIN" | "ROLE_LIBRARIAN" }
 * Admin-only. Cannot target self.
 *
 * NOTE: this endpoint persists the new role on the user record, but it
 * does NOT invalidate the target user's existing access token. JWTs are
 * stateless and signed at login-time, so the role string baked into the
 * old token remains in force until that token expires (default 1h) or
 * the user logs out and back in. The `/auth/refresh` endpoint re-reads
 * `user.role` from the DB when issuing a replacement access token, so a
 * promoted user picks up admin privileges automatically within at most
 * one access-token TTL — provided their session is still active. We
 * surface this caveat in the response message so the admin UI can show
 * it to the operator without needing to hard-code copy.
 */
router.patch(
  "/:id/role",
  authMiddleware,
  allowRoles(ROLES.ADMIN),
  denySelfTarget,
  async (req, res) => {
    const requested = String(req.body?.role || "").trim();
    const canonical = toCanonicalRole(requested);
    const validRoles = new Set([ROLES.USER, ROLES.ADMIN, ROLES.LIBRARIAN]);
    if (!validRoles.has(canonical)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed: ${[...validRoles].join(", ")}`,
      });
    }

    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const previous = user.role;
      user.role = canonical;
      await user.save();

      // Re-read so we LOG what was actually persisted (caught the
      // ENUM-truncation bug on first appearance — leave the read in).
      await user.reload();
      console.log(
        `[admin] role changed -> userId=${user.id} from=${previous} requested=${requested} canonical=${canonical} stored=${user.role} by=${req.user?.id}`
      );

      const message =
        canonical === ROLES.ADMIN
          ? `Role updated to ADMIN. ${user.username || user.email} will pick up admin privileges automatically within ~1 hour (next token refresh) or immediately after they sign out and back in.`
          : canonical === ROLES.LIBRARIAN
          ? `Role updated to LIBRARIAN. New permissions activate on next sign-in or token refresh.`
          : `Role updated to USER. Admin privileges revoked from the user's next sign-in or token refresh.`;

      return res.json({
        success: true,
        message,
        user: publicUser(user),
      });
    } catch (err) {
      console.error("[user-service] update role error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update role" });
    }
  }
);

/**
 * DELETE /users/:id  — admin-only hard delete. Cannot target self.
 * Cascades any tickets owned by the user (cleanest behaviour — the
 * `support_tickets.user_id` would otherwise dangle).
 */
router.delete(
  "/:id",
  authMiddleware,
  allowRoles(ROLES.ADMIN),
  denySelfTarget,
  async (req, res) => {
    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }

      const snapshot = { id: user.id, email: user.email };

      // Cascade-clean: drop ticket rows owned by this user so we don't leave
      // orphaned support history pointing at a deleted account.
      const ticketsDeleted = await SupportTicket.destroy({
        where: { userId: user.id },
      });

      await user.destroy();

      console.log(
        `[admin] user deleted -> id=${snapshot.id} email=${snapshot.email} tickets_removed=${ticketsDeleted} by=${req.user?.id}`
      );

      return res.json({
        success: true,
        message: "User account deleted",
        deletedUserId: snapshot.id,
        ticketsRemoved: ticketsDeleted,
      });
    } catch (err) {
      console.error("[user-service] delete user error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to delete user" });
    }
  }
);

/**
 * PATCH /users/:id/status  body: { accountStatus: "ACTIVE" | "INACTIVE" | "BANNED" }
 * Admin-only. Cannot target self.
 *
 * BANNED  → login() rejects with 403 ("Account suspended").
 * INACTIVE → login() rejects with 403 ("Account inactive").
 * ACTIVE  → re-enables login.
 *
 * Token-side enforcement: a banned user with a live access token can
 * still hit protected endpoints until that token expires (TTL ~1h),
 * since JWTs are stateless and aren't revoked on ban. /auth/refresh
 * blocks the user from getting a new access token though, so the
 * worst-case lock-out delay is one access-token TTL.
 */
router.patch(
  "/:id/status",
  authMiddleware,
  allowRoles(ROLES.ADMIN),
  denySelfTarget,
  async (req, res) => {
    const status = String(req.body?.accountStatus || "").trim().toUpperCase();
    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed: ${[...ALLOWED_STATUSES].join(", ")}`,
      });
    }

    try {
      const user = await User.findByPk(req.params.id);
      if (!user) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
      const previous = user.accountStatus;
      user.accountStatus = status;
      await user.save();

      // Defensive re-read — confirms what MySQL actually persisted.
      // This was how the ENUM-truncation bug was first spotted: the
      // controller logged "status=BANNED" but the re-read showed "".
      await user.reload();
      console.log(
        `[admin] status changed -> userId=${user.id} from=${previous} requested=${status} stored=${user.accountStatus} by=${req.user?.id}`
      );

      const who = user.username || user.email;
      const message =
        status === "BANNED"
          ? `${who} banned. They can no longer sign in. Any existing session is locked out within ~1 hour (refresh is blocked immediately).`
          : status === "INACTIVE"
          ? `${who} marked inactive. They cannot sign in until reactivated.`
          : `${who} activated. They can sign in again.`;

      return res.json({
        success: true,
        message,
        user: publicUser(user),
      });
    } catch (err) {
      console.error("[user-service] update status error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update status" });
    }
  }
);

export default router;
