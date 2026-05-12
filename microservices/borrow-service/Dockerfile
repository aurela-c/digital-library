FROM node:20

WORKDIR /workspace

COPY observability ./observability
COPY proto ./proto
COPY borrow-service ./borrow-service

WORKDIR /workspace/borrow-service

RUN npm install

EXPOSE 5004

CMD ["node", "index.js"]
