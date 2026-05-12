FROM node:20

WORKDIR /workspace

COPY observability ./observability
COPY proto ./proto
COPY auth-service ./auth-service

WORKDIR /workspace/auth-service

RUN npm install

EXPOSE 5001

CMD ["node", "index.js"]
