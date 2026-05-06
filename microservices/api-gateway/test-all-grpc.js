import userClient from "./grpc-clients/userClient.js";
import bookClient from "./grpc-clients/bookClient.js";
import borrowClient from "./grpc-clients/borrowClient.js";

console.log("STARTING gRPC TESTS...\n");

userClient.GetAllUsers({}, (err, res) => {
  if (err) console.log(" USER GetAllUsers:", err.message);
  else console.log(" USER GetAllUsers:", res);
});

bookClient.GetBook({ id: "1" }, (err, res) => {
  if (err) console.log(" BOOK GetBook:", err.message);
  else console.log(" BOOK GetBook:", res);
});

borrowClient.GetBorrowsByUser({ userId: "1" }, (err, res) => {
  if (err) console.log(" BORROW GetBorrows:", err.message);
  else console.log(" BORROW GetBorrows:", res);
})

borrowClient.BorrowBook(
  { userId: "1", bookId: "1" },
  (err, res) => {
    if (err) console.log(" BORROW FLOW:", err.message);
    else console.log(" BORROW FLOW:", res);
  }
);