FROM node:20

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev

COPY proto ./proto
COPY borrow-service ./borrow-service

WORKDIR /workspace/borrow-service

RUN npm install

EXPOSE 5004 5014

CMD ["node", "index.js"]
