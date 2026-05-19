FROM node:20

WORKDIR /workspace

COPY observability ./observability
RUN cd observability && npm install --omit=dev

COPY shared ./shared
RUN cd shared && npm install --omit=dev

COPY proto ./proto
COPY book-service ./book-service

WORKDIR /workspace/book-service

RUN npm install

EXPOSE 5003 5013

CMD ["node", "index.js"]
