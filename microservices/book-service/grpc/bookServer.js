import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { createLogger } from "../../observability/logger.js";
import { formatGrpcBindError } from "../../observability/friendlyErrors.js";

import {
  AddBook,
  GetBook,
  GetAllBooks,
  UpdateAvailability,
  DeleteBook,
} from "../controllers/bookController.js";
import { resolveProtoPath } from "./resolveProtoPath.js";

grpc.setLogVerbosity(grpc.logVerbosity.NONE);

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

const grpcPort = Number(process.env.BOOK_GRPC_PORT || 5013);
const log = createLogger("book-service");

server.bindAsync(
  `0.0.0.0:${grpcPort}`,
  grpc.ServerCredentials.createInsecure(),
  (err, port) => {
    if (err) {
      log.error(
        { err: { message: err.message, code: err.code } },
        formatGrpcBindError(grpcPort, err)
      );
      return;
    }

    log.info(`gRPC listening on port ${port}`);
  }
);