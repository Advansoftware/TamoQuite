# 🤝 TamoQuite — Gestão de Repasses & Cobranças

Sistema de gestão de repasses, cobranças simplificadas e controle de empréstimos, com **cobrança automática por WhatsApp** (Evolution API). Interface premium com tema escuro, otimizada para desktop e mobile (PWA), preparada para um futuro app mobile.

## 🏗 Arquitetura (monorepo)

```
TamoQuite/
├── apps/
│   ├── web/          # Front-end Next.js 16 (App Router, PWA) — apenas UI, consome a API
│   └── api/          # Back-end NestJS (REST /api, cron de cobrança, Evolution, Stripe, Prisma)
├── docker-compose.yml  # Stack completo: MySQL + api + web (deploy no Coolify)
└── .env.example        # Variáveis do stack
```

- **web** (`apps/web`): Next.js standalone. Navegação por rotas reais com slug (`/loans/[id]`, `/borrowers/[id]`, …) — recarregar dentro de um contrato **permanece** no contrato. Auth via token JWT (Bearer, persistido em `localStorage`). A URL da API é injetada em runtime (`API_URL`), sem precisar rebuild.
- **api** (`apps/api`): NestJS + Prisma (MySQL). Toda a lógica de negócio, autenticação JWT, integração com a Evolution API (uma instância de WhatsApp por usuário) e um cron horário que envia lembretes/cobranças no vencimento e após o vencimento.
- **db**: MySQL 8 (volume persistente).

## 🚀 Tecnologias

- **Front-end:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Framer Motion · Recharts · PWA
- **Back-end:** NestJS 10 · Prisma ORM · JWT (`@nestjs/jwt`) · `@nestjs/schedule` (cron)
- **Banco:** MySQL 8
- **Integrações:** Evolution API (WhatsApp) · Stripe (assinatura)
- **Infra:** Docker / Docker Compose · Coolify

## ⚡ Desenvolvimento local

Pré-requisitos: Node 20+ (api) / 22+ (web), Docker (para o MySQL).

```bash
# 1) Suba o MySQL (via compose ou docker run)
docker compose up -d db     # publica MySQL conforme o compose

# 2) API
cd apps/api
cp .env.example .env        # ajuste DATABASE_URL, JWT_SECRET, EVOLUTION_*, STRIPE_*
npm install
npm run db:push             # aplica o schema no MySQL
npm run db:seed             # cria o admin (brunoantunes94@hotmail.com / admin123)
npm run start:dev           # API em http://localhost:3042/api

# 3) Web
cd ../web
cp .env.example .env        # NEXT_PUBLIC_API_URL=http://localhost:3042
yarn install
yarn dev                    # http://localhost:3000
```

## 🐳 Deploy no Coolify

O `docker-compose.yml` na raiz sobe os três serviços (MySQL + api + web). No Coolify:

1. Aponte o recurso para este repositório usando o `docker-compose.yml`.
2. Defina as variáveis de ambiente do stack (ver `.env.example`):
   `MYSQL_*`, `JWT_SECRET`, `WEB_ORIGIN`, `NEXT_PUBLIC_API_URL`, `TZ`,
   `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`,
   `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`.
3. A API aplica o schema (`prisma db push`) e roda o seed no start; o MySQL persiste em volume.
4. Configure o webhook do Stripe para `https://<sua-api>/api/stripe/webhook`.

## 🔐 Funcionalidades

- Login/autenticação (JWT), gestão de devedores e empréstimos (cálculo Price de juros/parcelas)
- Pagamentos parciais, rolagem de juros, dashboard com métricas
- **Cobrança automática por WhatsApp**: lembrete antes do vencimento, no dia e após o vencimento (até marcar “não cobrar” ou a parcela ser paga)
- **Configurações**: conectar/desconectar o WhatsApp (QR code), editar mensagens padrão, cobrança global e por contrato
- Painel administrativo, PWA instalável, tema escuro premium

## 📄 Licença

Projeto privado — Todos os direitos reservados.
