FROM node:20

WORKDIR /workspace

COPY observability ./observability
COPY proto ./proto
COPY user-service ./user-service

WORKDIR /workspace/user-service

RUN npm install

EXPOSE 5002

CMD ["node", "index.js"]
