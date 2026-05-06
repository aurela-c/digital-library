import helmet from "helmet";

export const helmetConfig = helmet({
  contentSecurityPolicy: false, 
  crossOriginResourcePolicy: { policy: "cross-origin" },
});