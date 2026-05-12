FROM node:20

WORKDIR /workspace

COPY observability ./observability
COPY proto ./proto
COPY api-gateway ./api-gateway

WORKDIR /workspace/api-gateway

RUN npm install

ENV PORT=4000
EXPOSE 4000

CMD ["node", "index.js"]
