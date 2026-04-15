FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.json ./
COPY src ./src
RUN npm install && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY aif-agent.config.json ./aif-agent.config.json
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]
