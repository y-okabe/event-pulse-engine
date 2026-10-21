FROM node:20-alpine AS builder
WORKDIR /app

# shared をコピー
COPY shared ./shared

# backend 依存インストール
COPY backend/package.json ./backend/
WORKDIR /app/backend
RUN npm install

# ソースビルド
COPY backend/tsconfig.json .
COPY backend/src ./src
RUN npx tsc

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/node_modules ./node_modules
COPY --from=builder /app/shared ./shared

ENV PORT=4000
EXPOSE 4000
CMD ["node", "dist/backend/src/index.js"]
