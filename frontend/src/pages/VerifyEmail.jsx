import { useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";

const VerifyEmail = () => {
  const { token } = useParams();

  useEffect(() => {
    api.get(`/auth/verify/${token}`).then(() => {
      alert("Email verified!");
      window.location.href = "/login";
    });
  }, []);

  return <h2>Verifying...</h2>;
};

export default VerifyEmail;