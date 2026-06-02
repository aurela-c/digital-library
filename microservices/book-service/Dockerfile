# syntax=docker/dockerfile:1.6
#
# book-service — REST on 5003, gRPC on 5013.
# See the long comment in auth-service/Dockerfile for the layering rationale.

FROM node:20-alpine AS runtime

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev --no-audit --no-fund

COPY shared ./shared
RUN cd shared && npm install --omit=dev --no-audit --no-fund

COPY proto ./proto

COPY book-service/package*.json ./book-service/
RUN cd book-service && npm install --omit=dev --no-audit --no-fund

COPY book-service ./book-service

WORKDIR /workspace/book-service

ENV NODE_ENV=production \
    PORT=5003 \
    BOOK_GRPC_PORT=5013 \
    LOG_FORMAT=json

EXPOSE 5003 5013

# Same reason as user-service: `/` is reserved for the catalog list, so
# the liveness probe uses `/_status`.
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:5003/_status || exit 1

USER node

CMD ["node", "index.js"]
