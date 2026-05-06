import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";

import {
  GetAllBooks,
  GetBook,
  AddBook,
  UpdateAvailability,
} from "../controllers/bookController.js";

const PROTO_PATH = path.resolve("../proto/book.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const bookPackage = grpcObject.book;

const server = new grpc.Server();

server.addService(bookPackage.BookService.service, {
  GetAllBooks,
  GetBook,
  AddBook,
  UpdateAvailability,
});

server.bindAsync(
  "0.0.0.0:5003",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log(" Book gRPC running on 5003");
    server.start();
  }
);