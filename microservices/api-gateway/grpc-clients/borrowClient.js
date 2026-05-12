import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { resolveProtoPath } from "../config/resolveProtoPath.js";
import { GRPC_TARGETS } from "../config/grpcTargets.js";

const PROTO_PATH = resolveProtoPath("borrow.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const borrowPackage = grpcObject.borrow;

const client = new borrowPackage.BorrowService(
  GRPC_TARGETS.borrow,
  grpc.credentials.createInsecure()
);

export default client;