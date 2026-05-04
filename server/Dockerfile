FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .
EXPOSE 8787
CMD ["node_modules/.bin/tsx", "src/index.ts"]
