import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";

import { Register, Login } from "../controllers/authController.js";

const PROTO_PATH = path.resolve("../proto/auth.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const authPackage = grpcObject.auth;

const server = new grpc.Server();

server.addService(authPackage.AuthService.service, {
  Register,
  Login,
});

server.bindAsync(
  "0.0.0.0:5001",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log(" Auth gRPC running on 5001");
    server.start();
  }
);