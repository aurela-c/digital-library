FROM node:20

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev

COPY proto ./proto
COPY user-service ./user-service

WORKDIR /workspace/user-service

RUN npm install

EXPOSE 5002 5012

CMD ["node", "index.js"]
