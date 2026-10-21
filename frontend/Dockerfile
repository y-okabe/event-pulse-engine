FROM node:20-alpine AS deps
WORKDIR /app/frontend
COPY frontend/package.json .
RUN npm install

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/frontend/node_modules ./frontend/node_modules
COPY frontend/ ./frontend/
COPY shared/ ./shared/
WORKDIR /app/frontend
ARG NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/frontend/.next ./.next
COPY frontend/public ./public
COPY --from=builder /app/frontend/package.json .
COPY --from=builder /app/frontend/node_modules ./node_modules
COPY --from=builder /app/frontend/next.config.js .

EXPOSE 3000
CMD ["node_modules/.bin/next", "start"]
