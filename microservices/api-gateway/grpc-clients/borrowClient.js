import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, "../../proto/borrow.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const borrowPackage = grpcObject.borrow;

const client = new borrowPackage.BorrowService(
  "localhost:5004",
  grpc.credentials.createInsecure()
);

export default client;