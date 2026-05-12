export const GRPC_TARGETS = {
  /** Auth gRPC (default 5010 — separate from HTTP REST on 5001) */
  auth: process.env.AUTH_SERVICE_GRPC || "localhost:5010",
  user: process.env.USER_SERVICE_GRPC || "localhost:5002",
  book: process.env.BOOK_SERVICE_GRPC || "localhost:5003",
  borrow: process.env.BORROW_SERVICE_GRPC || "localhost:5004",
};
