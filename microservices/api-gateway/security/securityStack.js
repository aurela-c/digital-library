import express from "express";
import { helmetConfig } from "./helmetConfig.js";
import { rateLimiter } from "./rateLimiter.js";
import { xssSanitizer } from "./xssSanitizer.js";
import { httpsRedirect } from "./httpsRedirect.js";

export const securityStack = (app) => {
  //  HTTPS enforce
  app.use(httpsRedirect);

  //  Security headers
  app.use(helmetConfig);

  //  Rate limiting
  app.use(rateLimiter);

  // Body parsing
  app.use(express.json({ limit: "10kb" })); // anti payload abuse

  // XSS protection
  app.use(xssSanitizer);
};