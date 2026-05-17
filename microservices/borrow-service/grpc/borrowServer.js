import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import { createLogger } from "../../observability/logger.js";
import { formatGrpcBindError } from "../../observability/friendlyErrors.js";
import {
  BorrowBook,
  ReturnBook,
  GetBorrowsByUser,
} from "../controllers/borrowController.js";
import { resolveProtoPath } from "./resolveProtoPath.js";

grpc.setLogVerbosity(grpc.logVerbosity.NONE);

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

const grpcPort = Number(process.env.BORROW_GRPC_PORT || 5014);
const log = createLogger("borrow-service");

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