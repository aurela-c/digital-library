# syntax=docker/dockerfile:1.6
#
# borrow-service — REST on 5004, gRPC on 5014.
# See the long comment in auth-service/Dockerfile for the layering rationale.

FROM node:20-alpine AS runtime

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev --no-audit --no-fund

COPY shared ./shared
RUN cd shared && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto

COPY borrow-service/package*.json ./borrow-service/
RUN cd borrow-service && npm install --omit=dev --no-audit --no-fund

COPY borrow-service ./borrow-service

WORKDIR /workspace/borrow-service

ENV NODE_ENV=production \
    PORT=5004 \
    BORROW_GRPC_PORT=5014 \
    LOG_FORMAT=json

EXPOSE 5004 5014

HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5004/ || exit 1

USER node

CMD ["node", "index.js"]
