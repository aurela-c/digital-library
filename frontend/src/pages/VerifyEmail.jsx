import { Navigate, useParams } from "react-router-dom";

/**
 * Legacy route /verify/:token — kept for backward compatibility with old
 * verification emails that used the path-param style. Forward to the new
 * unified success page so the user gets the same auto-login UX.
 */
const VerifyEmail = () => {
  const { token } = useParams();
  const target = token
    ? `/verify-email?token=${encodeURIComponent(token)}`
    : "/login";
  return <Navigate to={target} replace />;
};

export default VerifyEmail;
