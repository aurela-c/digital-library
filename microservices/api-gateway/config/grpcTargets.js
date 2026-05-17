function grpcTarget(envKey, devDefault) {
  const value = process.env[envKey];
  if (value && String(value).trim() !== "") {
    return value.trim();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(`${envKey} must be set when NODE_ENV=production`);
  }
  return devDefault;
}

export const GRPC_TARGETS = {
  auth: grpcTarget("AUTH_SERVICE_GRPC", "localhost:5010"),
  user: grpcTarget("USER_SERVICE_GRPC", "localhost:5012"),
  book: grpcTarget("BOOK_SERVICE_GRPC", "localhost:5013"),
  borrow: grpcTarget("BORROW_SERVICE_GRPC", "localhost:5014"),
};
