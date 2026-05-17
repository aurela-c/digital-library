import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { formatGrpcBindError } from "../../observability/friendlyErrors.js";
import { resolveProtoPath } from "./resolveProtoPath.js";
import {
  Register,
  Login,
  RefreshToken,
  ValidateAccessToken,
} from "../controllers/authGrpcController.js";

// Avoid duplicate stderr from @grpc/grpc-js; we log bind failures ourselves.
grpc.setLogVerbosity(grpc.logVerbosity.NONE);

const PROTO_PATH = resolveProtoPath("auth.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const grpcObject = grpc.loadPackageDefinition(packageDef);
const authPackage = grpcObject.auth;

const server = new grpc.Server();

server.addService(authPackage.AuthService.service, {
  Register,
  Login,
  RefreshToken,
  ValidateAccessToken,
});

const port = Number(process.env.AUTH_GRPC_PORT || 5010);

export function startAuthGrpcServer(logger) {
  return new Promise((resolve, reject) => {
    server.bindAsync(
      `0.0.0.0:${port}`,
      grpc.ServerCredentials.createInsecure(),
      (err, boundPort) => {
        if (err) {
          logger.error(
            { err: { message: err.message, code: err.code } },
            formatGrpcBindError(port, err)
          );
          return reject(err);
        }
        logger.info(`gRPC listening on port ${boundPort}`);
        resolve(boundPort);
      }
    );
  });
}
