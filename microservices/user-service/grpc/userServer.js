import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { createLogger } from "../../observability/logger.js";
import { formatGrpcBindError } from "../../observability/friendlyErrors.js";

import {
  GetAllUsers,
  GetUserById,
} from "../controllers/userController.js";
import { resolveProtoPath } from "./resolveProtoPath.js";

const PROTO_PATH = resolveProtoPath("user.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const userPackage = grpcObject.user;

const server = new grpc.Server();

server.addService(userPackage.UserService.service, {
  GetAllUsers,
  GetUserById,
});

const grpcPort = Number(process.env.USER_GRPC_PORT || 5012);
const log = createLogger("user-service");

server.bindAsync(
  `0.0.0.0:${grpcPort}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      log.error(
        { err: { message: err.message, code: err.code } },
        formatGrpcBindError(grpcPort, err)
      );
      return;
    }

    log.info(`gRPC listening on port ${port}`);
  }
);