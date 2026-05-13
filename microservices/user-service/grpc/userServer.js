import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

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

server.bindAsync(
  `0.0.0.0:${grpcPort}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("gRPC bind error:", err);
      return;
    }

    server.start();
    console.log("User gRPC running on", port);
    console.log("gRPC server ready");
  }
);