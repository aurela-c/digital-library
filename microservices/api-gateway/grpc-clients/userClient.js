import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { resolveProtoPath } from "../config/resolveProtoPath.js";
import { GRPC_TARGETS } from "../config/grpcTargets.js";

const PROTO_PATH = resolveProtoPath("user.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const userPackage = grpcObject.user;

const client = new userPackage.UserService(
  GRPC_TARGETS.user,
  grpc.credentials.createInsecure()
);

export default client;