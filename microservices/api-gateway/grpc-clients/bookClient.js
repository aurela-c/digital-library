import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { resolveProtoPath } from "../config/resolveProtoPath.js";
import { GRPC_TARGETS } from "../config/grpcTargets.js";

const PROTO_PATH = resolveProtoPath("book.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const bookPackage = grpcObject.book;

const client = new bookPackage.BookService(
  GRPC_TARGETS.book,
  grpc.credentials.createInsecure()
);

export default client;