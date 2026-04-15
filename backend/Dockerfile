# Build the monorepo's backend + shared packages, then copy only the artifacts
# into a slim runtime image.
#
# Expected build context: the aif/ monorepo root.
#   gcloud run deploy aif-backend --source . --dockerfile=backend/Dockerfile

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY backend ./backend
COPY shared ./shared
RUN npm install --workspace=backend --workspace=shared --include-workspace-root \
 && npm run build --workspace=backend

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Cloud Run injects PORT (default 8080). Our env.ts reads it.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/package.json ./backend/package.json
COPY --from=build /app/shared ./shared
EXPOSE 8080
CMD ["node", "backend/dist/index.js"]
