# TamoQuite API (NestJS + Prisma + MySQL)
FROM node:20-slim

# Prisma precisa de openssl no runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Instala dependências (postinstall roda `prisma generate`, por isso o schema vem antes)
COPY package.json ./
COPY prisma ./prisma
RUN npm install

# Código e build
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=3042
EXPOSE 3042

# Aplica o schema no MySQL, garante o admin (seed idempotente) e sobe a API
CMD ["sh", "-c", "npx prisma db push --skip-generate && npx prisma db seed && node dist/main.js"]
