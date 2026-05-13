import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { resolveProtoPath } from "./resolveProtoPath.js";
import {
  Register,
  Login,
  RefreshToken,
  ValidateAccessToken,
} from "../controllers/authGrpcController.js";

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
          logger.error({ err }, "auth gRPC bind failed");
          return reject(err);
        }
        server.start();
        logger.info(
          { grpcPort: boundPort, transport: "grpc" },
          "auth-service gRPC listening"
        );
        resolve(boundPort);
      }
    );
  });
}
