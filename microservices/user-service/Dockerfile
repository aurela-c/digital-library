# syntax=docker/dockerfile:1.6
#
# user-service — REST on 5002, gRPC on 5012.
# See the long comment in auth-service/Dockerfile for the layering rationale.

FROM node:20-alpine AS runtime

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev --no-audit --no-fund

COPY shared ./shared
RUN cd shared && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto

COPY user-service/package*.json ./user-service/
RUN cd user-service && npm install --omit=dev --no-audit --no-fund

COPY user-service ./user-service

WORKDIR /workspace/user-service

ENV NODE_ENV=production \
    PORT=5002 \
    USER_GRPC_PORT=5012 \
    LOG_FORMAT=json

EXPOSE 5002 5012

# user-service intentionally does NOT mount `/` (it would shadow
# `GET /users` — see the long comment in index.js). `/_status` is the
# liveness route added for exactly this purpose.
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5002/_status || exit 1

USER node

CMD ["node", "index.js"]
