import express from "express";
import { Sequelize } from "sequelize";
import { authMiddleware } from "../../shared/middleware/authMiddleware.js";
import { allowRoles } from "../../shared/middleware/roleMiddleware.js";
import { requireSelfOrAdmin } from "../../shared/middleware/requireSelfOrAdmin.js";
import {
  ROLES,
  toCanonicalRole,
} from "../../shared/constants/roles.js";
import { GetUserById } from "../controllers/userController.js";
import { invokeGrpc, sendGrpcError } from "../../shared/utils/grpcHttp.js";
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
    try {
      const [
        totalUsers,
        activeUsers,
        verifiedUsers,
        bannedUsers,
        adminCount,
        totalTickets,
        openTickets,
      ] = await Promise.all([
        User.count(),
        User.count({ where: { accountStatus: "ACTIVE" } }),
        User.count({ where: { isVerified: true } }),
        User.count({ where: { accountStatus: "BANNED" } }),
        User.count({
          where: Sequelize.where(
            Sequelize.fn("LOWER", Sequelize.col("role")),
            "like",
            "%admin%"
          ),
        }),
        SupportTicket.count(),
        SupportTicket.count({ where: { status: "open" } }),
      ]);

      console.log(
        `[user-service] admin stats -> users=${totalUsers} active=${activeUsers} tickets=${totalTickets}`
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
        },
      });
    } catch (err) {
      console.error("[user-service] admin stats error:", err.message);
      return res
        .status(500)
        .json({ success: false, message: "Failed to load stats" });
    }
  }
);

router.get("/", authMiddleware, allowRoles(ROLES.ADMIN), async (req, res) => {
  try {
    const rows = await User.findAll({
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
      user.role = canonical;
      await user.save();
      console.log(
        `[admin] role changed -> userId=${user.id} role=${canonical} by=${req.user?.id}`
      );
      return res.json({
        success: true,
        message: "Role updated",
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
      user.accountStatus = status;
      await user.save();
      console.log(
        `[admin] status changed -> userId=${user.id} status=${status} by=${req.user?.id}`
      );
      return res.json({
        success: true,
        message: `Account ${status.toLowerCase()}`,
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
