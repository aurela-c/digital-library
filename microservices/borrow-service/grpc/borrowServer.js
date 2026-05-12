import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import {
  BorrowBook,
  ReturnBook,
  GetBorrowsByUser,
} from "../controllers/borrowController.js";
import { resolveProtoPath } from "./resolveProtoPath.js";

const PROTO_PATH = resolveProtoPath("borrow.proto");
const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const borrowPackage = grpcObject.borrow;

const server = new grpc.Server();

server.addService(borrowPackage.BorrowService.service, {
  BorrowBook,
  ReturnBook,
  GetBorrowsByUser,
});

server.bindAsync(
  "0.0.0.0:5004",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("gRPC bind error:", err);
      return;
    }

    server.start();
    console.log("Borrow gRPC running on", port);
    console.log("gRPC server ready");
  }
);