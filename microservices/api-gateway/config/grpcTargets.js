export const GRPC_TARGETS = {
  /** Auth gRPC (default 5010 — separate from HTTP REST on 5001) */
  auth: process.env.AUTH_SERVICE_GRPC || "localhost:5010",
  /** User gRPC (default 5012 — HTTP REST stays on 5002) */
  user: process.env.USER_SERVICE_GRPC || "localhost:5012",
  /** Book gRPC (default 5013 — HTTP REST stays on 5003) */
  book: process.env.BOOK_SERVICE_GRPC || "localhost:5013",
  /** Borrow gRPC (default 5014 — HTTP REST stays on 5004) */
  borrow: process.env.BORROW_SERVICE_GRPC || "localhost:5014",
};
