import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";

const PROTO_PATH = path.resolve("../proto/auth.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const authPackage = grpcObject.auth;

const client = new authPackage.AuthService(
  "localhost:5001",
  grpc.credentials.createInsecure()
);

export default client;