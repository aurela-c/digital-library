FROM node:20

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev

COPY proto ./proto
COPY auth-service ./auth-service

WORKDIR /workspace/auth-service

RUN npm install

EXPOSE 5001 5010

CMD ["node", "index.js"]
