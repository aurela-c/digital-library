import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.join(__dirname, "../../proto/auth.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const authPackage = grpcObject.auth;

const client = new authPackage.AuthService(
  "localhost:5001",
  grpc.credentials.createInsecure()
);

export default client;