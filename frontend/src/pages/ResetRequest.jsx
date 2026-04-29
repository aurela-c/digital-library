import { useState } from "react";
import api from "../services/api";

const ResetRequest = () => {
  const [email, setEmail] = useState("");

  const sendRequest = async () => {
    await api.post("/auth/reset-request", { email });
    alert("Check email");
  };

  return (
    <div>
      <h2>Reset Password</h2>
      <input onChange={(e) => setEmail(e.target.value)} />
      <button onClick={sendRequest}>Send</button>
    </div>
  );
};

export default ResetRequest;