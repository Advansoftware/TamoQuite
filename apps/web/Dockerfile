# TamoQuite Web (Next.js 16 standalone / PWA)
FROM node:22-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json yarn.lock* ./
RUN yarn install --frozen-lockfile || yarn install
COPY . .
RUN yarn build

FROM node:22-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# O build já copia .next/static e public para dentro do standalone
COPY --from=build /app/.next/standalone ./
EXPOSE 3000
CMD ["node", "server.js"]
