/**
 * Tiny HTTP + gRPC mock helpers shared by every per-service unit test.
 *
 * Kept dependency-free so it can be imported from each service's
 * isolated jest project without forcing a workspace install.
 */
import { jest } from "@jest/globals";

/** Build an Express-shaped request object with safe defaults. */
export const makeReq = (overrides = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  user: null,
  ...overrides,
});

/**
 * Build an Express-shaped response with chainable jest.fn() spies for
 * status / json / send / redirect / setHeader. Call .json/.send to
 * assert the body, .status to assert the HTTP code.
 */
export const makeRes = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  res.setHeader = jest.fn(() => res);
  res.locals = {};
  return res;
};

/**
 * Wrap a gRPC handler `(call, callback) => void` in a Promise so unit
 * tests can simply `await invokeGrpc(handler, request)`.
 *
 * - resolves with the response payload on success
 * - rejects with the grpc-style error `{ code, message }` on failure
 */
export const invokeGrpc = (handler, request) =>
  new Promise((resolve, reject) => {
    handler({ request }, (err, payload) => {
      if (err) reject(err);
      else resolve(payload);
    });
  });

/**
 * Build a fake Sequelize model instance: a plain object with spy
 * `save`, `update`, `destroy`, `reload`, `get`, `set`, `changed`
 * methods that resolve to `this`. Useful when business logic mutates
 * a fetched row and then `.save()`s it.
 */
export const makeFakeRow = (fields = {}) => {
  const row = { ...fields };
  row.save = jest.fn(async () => row);
  row.update = jest.fn(async (patch) => {
    Object.assign(row, patch);
    return row;
  });
  row.destroy = jest.fn(async () => undefined);
  row.reload = jest.fn(async () => row);
  row.get = jest.fn(({ plain } = {}) => (plain ? { ...row } : row));
  row.set = jest.fn((key, value) => {
    row[key] = value;
    return row;
  });
  row.changed = jest.fn(() => row);
  return row;
};

/** Convenience: silence console noise from controllers' debug logs. */
export const muteConsole = () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "warn").mockImplementation(() => {});
};
