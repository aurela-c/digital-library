import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";

import {
  AddBook,
  GetBook,
  GetAllBooks,
  UpdateAvailability,
} from "../controllers/bookController.js";

const PROTO_PATH = path.resolve("../proto/book.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const bookPackage = grpcObject.book;

const server = new grpc.Server();

server.addService(bookPackage.BookService.service, {
  AddBook,
  GetBook,
  GetAllBooks,
  UpdateAvailability,
});

server.bindAsync(
  "0.0.0.0:5003",
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      console.error("gRPC bind error:", err);
      return;
    }

    console.log("Book gRPC running on", port);

    console.log("gRPC server ready");
  }
);