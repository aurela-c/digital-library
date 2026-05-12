import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";

import {
  AddBook,
  GetBook,
  GetAllBooks,
  UpdateAvailability,
  DeleteBook,
} from "../controllers/bookController.js";
import { resolveProtoPath } from "./resolveProtoPath.js";

const PROTO_PATH = resolveProtoPath("book.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const bookPackage = grpcObject.book;

const server = new grpc.Server();

server.addService(bookPackage.BookService.service, {
  AddBook,
  GetBook,
  GetAllBooks,
  UpdateAvailability,
  DeleteBook,
});

server.bindAsync(
  "0.0.0.0:5003",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("gRPC bind error:", err);
      return;
    }

    server.start();
    console.log("Book gRPC running on", port);
    console.log("gRPC server ready");
  }
);