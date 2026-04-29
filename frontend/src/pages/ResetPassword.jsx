import { useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const ResetPassword = () => {
  const { token } = useParams();
  const [password, setPassword] = useState("");

  const reset = async () => {
    await api.post(`/auth/reset/${token}`, { password });
    alert("Password changed");
    window.location.href = "/login";
  };

  return (
    <div>
      <h2>New Password</h2>
      <input onChange={(e) => setPassword(e.target.value)} />
      <button onClick={reset}>Reset</button>
    </div>
  );
};

export default ResetPassword;