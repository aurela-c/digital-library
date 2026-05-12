import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { resolveProtoPath } from "./resolveProtoPath.js";

const PROTO_PATH = resolveProtoPath("book.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const bookPackage = grpcObject.book;

const target = process.env.BOOK_SERVICE_GRPC || "localhost:5003";

export default new bookPackage.BookService(
  target,
  grpc.credentials.createInsecure()
);
