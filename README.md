# 🤝 TamoQuite — Gestão de Repasses & Cobranças

Sistema de gestão de repasses, cobranças simplificadas e controle de empréstimos. Interface premium com tema escuro, otimizada para desktop e mobile (PWA).

## 🚀 Tecnologias

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS 4 + shadcn/ui
- **Banco de Dados:** SQLite via Prisma ORM
- **Autenticação:** Sessions com cookies (customizada)
- **Animações:** Framer Motion
- **Gráficos:** Recharts
- **PWA:** Service Worker + Manifest

## 📦 Pré-requisitos

- Node.js >= 18
- Yarn >= 1.22

## ⚡ Instalação

```bash
# Clone o repositório
git clone git@github.com:Advansoftware/TamoQuite.git
cd TamoQuite

# Instale as dependências
yarn install

# Configure as variáveis de ambiente
cp .env.example .env

# Gere o Prisma Client
yarn db:generate

# Aplique o schema no banco de dados
yarn db:push
```

## 🛠 Scripts Disponíveis

| Comando           | Descrição                                  |
| ----------------- | ------------------------------------------ |
| `yarn dev`        | Inicia o servidor de desenvolvimento       |
| `yarn build`      | Gera o build de produção (standalone)      |
| `yarn start`      | Inicia o servidor de produção              |
| `yarn lint`       | Executa o ESLint                           |
| `yarn db:generate`| Gera o Prisma Client                       |
| `yarn db:push`    | Aplica o schema no banco                   |
| `yarn db:migrate` | Cria e aplica migrações                    |
| `yarn db:reset`   | Reseta o banco de dados                    |

## 🏗 Estrutura do Projeto

```
├── prisma/              # Schema do banco e seed
│   ├── schema.prisma
│   └── seed.ts
├── public/              # Assets estáticos e PWA
├── src/
│   ├── app/             # Rotas (App Router)
│   │   ├── api/         # API Routes (auth, loans, borrowers, etc.)
│   │   ├── layout.tsx   # Layout raiz
│   │   └── page.tsx     # Página principal
│   ├── components/
│   │   ├── loan-system/ # Componentes do sistema
│   │   └── ui/          # Componentes shadcn/ui
│   ├── hooks/           # Custom hooks
│   └── lib/             # Utilitários (auth, db, api, sessions)
├── .env.example         # Variáveis de ambiente (modelo)
└── package.json
```

## 🔐 Funcionalidades

- **Login e autenticação** com sessões seguras
- **Gestão de devedores** (CRUD completo)
- **Controle de empréstimos** com cálculo de juros e parcelas
- **Dashboard** com métricas e gráficos em tempo real
- **Painel administrativo** para gerenciar usuários
- **PWA** — instalável como app no celular
- **Tema escuro** premium com animações fluidas

## 📄 Licença

Projeto privado — Todos os direitos reservados.
