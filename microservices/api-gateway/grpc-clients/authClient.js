import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { resolveProtoPath } from "../config/resolveProtoPath.js";
import { GRPC_TARGETS } from "../config/grpcTargets.js";

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

const client = new authPackage.AuthService(
  GRPC_TARGETS.auth,
  grpc.credentials.createInsecure()
);

export default client;
