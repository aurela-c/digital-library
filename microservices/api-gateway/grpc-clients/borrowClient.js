import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.resolve("../proto/borrow.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const borrowPackage = grpcObject.borrow;

const client = new borrowPackage.BookService(
  "localhost:5004",
  grpc.credentials.createInsecure()
);

export default client;
