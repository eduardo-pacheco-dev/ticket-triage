# syntax=docker/dockerfile:1

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci
COPY shared/ shared/
COPY backend/ backend/
RUN npm run build --workspace shared && npm run build --workspace backend

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --omit=dev --workspace backend --workspace shared
COPY --from=build /app/shared/dist shared/dist
COPY backend/dist backend/dist
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/typeorm migration:run -d backend/dist/data-source.js && exec node backend/dist/main.js"]
