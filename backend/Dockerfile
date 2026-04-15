FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend ./backend
COPY shared ./shared
RUN npm install --workspaces=false --omit=dev=false \
 && npm install --workspace=backend --workspace=shared \
 && npm run build --workspace=shared --if-present \
 && npm run build --workspace=backend

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/shared ./shared
EXPOSE 3000
CMD ["node", "backend/dist/index.js"]
