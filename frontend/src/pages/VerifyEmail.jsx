import { Navigate, useParams } from "react-router-dom";


const VerifyEmail = () => {
  const { token } = useParams();
  const target = token
    ? `/verify-email?token=${encodeURIComponent(token)}`
    : "/login";
  return <Navigate to={target} replace />;
};

export default VerifyEmail;
