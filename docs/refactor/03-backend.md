# 03 — Arquitetura Backend (NestJS)

> Meta: controllers finos (só HTTP), regra de negócio em services testáveis, validação por DTO,
> erros consistentes.

## Problema: regra de negócio nos controllers

- `installments.controller.ts` (368 linhas) faz cálculo de rolagem, undo, juros, pagamento parcial — tudo direto no controller, com Prisma inline.
- `loans.controller.ts` calcula juros/parcelas no handler.
- `stripe.controller.ts` mistura checkout, webhook e portal com lógica de assinatura.
- Difícil testar isoladamente (precisa subir HTTP) e reusar.

## Padrão-alvo: Controller → Service → Prisma

```
<módulo>/
  <módulo>.controller.ts   # rota + DTO + auth guard; delega ao service
  <módulo>.service.ts      # regra de negócio pura (recebe ids/dtos, usa Prisma)
  dto/
    create-x.dto.ts        # class-validator
```

Exemplo (loans):
```ts
// loans.service.ts
@Injectable()
export class LoansService {
  constructor(private prisma: PrismaService) {}
  async create(userId: string, dto: CreateLoanDto) {
    // cálculo de juros simples + geração de parcelas (hoje no controller)
  }
}
// loans.controller.ts
@Post()
create(@CurrentUser('id') userId: string, @Body() dto: CreateLoanDto) {
  return this.loans.create(userId, dto);
}
```

### Módulos a refatorar (ordem sugerida)
1. `loans` — extrair cálculo (compartilhar a mesma lógica de juros simples do front; documentar como fonte da verdade).
2. `installments` — extrair `InstallmentsService` com métodos: `payFull`, `payPartial`, `payInterest`, `rollRemaining`, `undo*`. Onde está o grosso da complexidade.
3. `stripe` — separar `CheckoutService`, `WebhookService`, `SubscriptionService`.
4. `billing` — já tem service; revisar (`BillingCron.chargeInstallmentNow`/`sendCustomCharge` poderiam virar `ChargeService`).

## Validação: DTOs + ValidationPipe global

Hoje: `if (!borrowerId || !originalAmount …) throw new BadRequestException(...)` repetido.

Alvo:
- Instalar/usar `class-validator` + `class-transformer`.
- `main.ts`: `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))`.
- DTOs com decorators:
  ```ts
  export class CreateLoanDto {
    @IsString() borrowerId: string;
    @IsNumber() @IsPositive() originalAmount: number;
    @IsNumber() @Min(0) interestRate: number;
    @IsInt() @Min(1) installmentCount: number;
    @IsIn(['WEEKLY','BIWEEKLY','MONTHLY']) @IsOptional() frequency?: string;
    @IsDateString() startDate: string;
  }
  ```

## Erros consistentes

- Criar um `AllExceptionsFilter` (ou usar o padrão Nest) que sempre responde `{ statusCode, code?, message }`.
- Alinhar com o front: `getApiError` já lê `data.error || data.message`. Padronizar o backend para sempre mandar `message` (e `code` quando o front precisa detectar, como o `SUBSCRIPTION_INACTIVE` do `SubscriptionGuard`).

## Guards / segurança (já iniciado)
- `SubscriptionGuard` e `JwtAuthGuard` estão OK. Documentar quais rotas exigem assinatura.
- Padronizar checagem de admin: hoje há `assertSuperAdmin` duplicado em `admin.controller` e `admin-billing.controller` comparando e-mail. Extrair um `SuperAdminGuard` (ou decorator `@Roles`).
- Centralizar `SUPER_ADMIN_EMAIL` (já em `common/constants.ts`) e considerar mover para env.

## Camada Prisma
- Manter `PrismaService` como está.
- Evitar N+1 (ex.: `fetchLoanData` no front faz N chamadas de partial-payments — resolver no backend com include, ver [02-frontend.md]).
- Transações onde há múltiplos writes dependentes (rolagem de parcelas, undo) — hoje são vários `update` soltos; envolver em `prisma.$transaction`.

## Testes (ver [05-testing.md])
- Testes de unidade dos services (cálculo de juros, rolagem, undo) — sem HTTP.
- e2e por módulo com banco de teste (SQLite/among ou MySQL de teste + `prisma migrate`/`db push`).

## Checklist
- [ ] `ValidationPipe` global + DTOs por rota de escrita
- [ ] Extrair services: loans, installments, stripe (checkout/webhook/subscription)
- [ ] `SuperAdminGuard` / `@Roles` no lugar de `assertSuperAdmin` duplicado
- [ ] Filtro de exceção global com shape consistente
- [ ] `$transaction` nas operações multi-write (rolagem/undo/pagamento)
- [ ] Testes de service para toda regra movida
