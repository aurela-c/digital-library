export const GRPC_TARGETS = {
  user: process.env.USER_SERVICE_GRPC || "localhost:5002",
  book: process.env.BOOK_SERVICE_GRPC || "localhost:5003",
  borrow: process.env.BORROW_SERVICE_GRPC || "localhost:5004",
};
