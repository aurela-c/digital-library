import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import path from "path";
import User from "../models/User.js";

const PROTO_PATH = path.resolve("../proto/user.proto");

const packageDef = protoLoader.loadSync(PROTO_PATH);
const grpcObject = grpc.loadPackageDefinition(packageDef);

const userPackage = grpcObject.user;

const GetAllUsers = async (_, callback) => {
  try {
    const users = await User.findAll();

    callback(null, {
      users: users.map((u) => ({
        id: u.id.toString(),
        username: u.username,
        email: u.email,
        role: u.role,
        profileImage: u.profileImage,
        createdAt: u.created_at,
      })),
    });

  } catch (err) {
    callback({
      code: 13,
      message: "Server error",
    });
  }
};

const GetUserById = async (call, callback) => {
  try {
    const user = await User.findByPk(call.request.id);

    if (!user) {
      return callback({
        code: 5,
        message: "User not found",
      });
    }

    callback(null, {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      createdAt: user.created_at,
    });

  } catch (err) {
    callback({
      code: 13,
      message: "Server error",
    });
  }
};

// gRPC SERVER
const server = new grpc.Server();

server.addService(userPackage.UserService.service, {
  GetAllUsers,
  GetUserById,
});

server.bindAsync(
  "0.0.0.0:5002",
  grpc.ServerCredentials.createInsecure(),
  () => {
    console.log("User gRPC running on 5002");
    server.start();
  }
);