FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install --no-audit --no-fund
COPY server/ .
EXPOSE 8787
CMD ["node_modules/.bin/tsx", "src/index.ts"]
