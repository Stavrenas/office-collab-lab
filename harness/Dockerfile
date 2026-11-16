FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src
COPY scripts ./scripts

ENV HARNESS_PORT=3100
EXPOSE 3100

CMD ["node", "src/server.js"]
