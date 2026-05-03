FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --no-audit --no-fund
COPY server/ .
RUN npm run build
EXPOSE 8787
CMD ["node", "dist/index.js"]
