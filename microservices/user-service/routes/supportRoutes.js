import express from "express";
import { authMiddleware } from "../../shared/middleware/authMiddleware.js";
import { allowRoles } from "../../shared/middleware/roleMiddleware.js";
import { ROLES } from "../../shared/constants/roles.js";
import {
  createTicket,
  listTickets,
  listMyTickets,
  getTicket,
  replyToTicket,
  updateTicketStatus,
  updateTicketPriority,
} from "../controllers/supportController.js";

const router = express.Router();

// Trace every hit — invaluable when debugging "not found" issues.
router.use((req, _res, next) => {
  console.log(
    `[support] ${req.method} ${req.originalUrl} userId=${
      req.user?.id ?? req.user?.sub ?? "?"
    }`
  );
  next();
});

// ---- User-or-admin ----
router.post("/tickets", authMiddleware, createTicket);
router.get("/tickets", authMiddleware, listTickets);
// "/tickets/me" MUST come before "/tickets/:id" so it isn't captured as id="me".
router.get("/tickets/me", authMiddleware, listMyTickets);
router.get("/tickets/:id", authMiddleware, getTicket);
router.post("/tickets/:id/reply", authMiddleware, replyToTicket);

// ---- Admin-only ----
router.patch(
  "/tickets/:id/status",
  authMiddleware,
  allowRoles(ROLES.ADMIN),
  updateTicketStatus
);
router.patch(
  "/tickets/:id/priority",
  authMiddleware,
  allowRoles(ROLES.ADMIN),
  updateTicketPriority
);

export default router;
