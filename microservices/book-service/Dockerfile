FROM node:20

WORKDIR /workspace

COPY observability ./observability
COPY proto ./proto
COPY book-service ./book-service

WORKDIR /workspace/book-service

RUN npm install

EXPOSE 5003

CMD ["node", "index.js"]
