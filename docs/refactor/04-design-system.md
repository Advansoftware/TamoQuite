# 04 — Design System & Tema

> Pedido: "usar tema em arquivo de tema, ser um projeto consistente."
> Meta: tokens centralizados, claro/escuro consistente, zero cor hardcoded solta.

## Situação hoje
- Tokens em CSS vars no `globals.css` (`--neon`, `--surface`, `--popover`, etc.) + mapeamento no `tailwind.config.ts`.
- Cores hardcoded aparecem espalhadas: `#25D366` (verde WhatsApp), `bg-[#25D366]/10`, `rgba(0,255,163,...)` em sombras, etc.
- Sem documentação dos tokens; escolhas de cor feitas ad-hoc por componente.

## Alvo: fonte única de tema

### 1. Arquivo de tema
Criar `src/theme/tokens.css` (ou `theme.css`) como **única** fonte de design tokens, importado pelo `globals.css`:
```css
:root {
  /* Brand */
  --neon: 158 100% 50%;        /* usar HSL sem cor para permitir /opacity */
  --brand-whatsapp: 142 70% 49%;
  /* Superfícies */
  --background: ...; --surface: ...; --surface-elevated: ...;
  --border: ...; --foreground: ...; --muted-foreground: ...;
  /* Semânticos */
  --success: ...; --warning: ...; --danger: ...; --info: ...;
  /* Raio, sombra, espaçamento */
  --radius: 0.75rem;
}
:root[data-theme="light"], @media (prefers-color-scheme: light) { ... }
```
Regras:
- Todo token em HSL (`H S L`) para funcionar com `text-neon/50` etc.
- `tailwind.config.ts` só referencia os tokens — nunca define cor literal.
- **Proibido** `#hex` ou `rgba()` solto em componente. WhatsApp vira `--brand-whatsapp` → classe `text-whatsapp`, `bg-whatsapp/10`.

### 2. Claro/escuro consistente
- Definir os dois temas no arquivo de tema (hoje o app é dark-first).
- Se houver toggle, respeitar `prefers-color-scheme` + `data-theme` no `<html>`.
- Garantir contraste AA em ambos.

### 3. Primitivas de UI
- `components/ui/*` (shadcn) já é a base — manter e usar **sempre** (Button, Input, Dialog, Select, Popover, Sheet, DropdownMenu).
- Eliminar `<button className="...">` reinventado quando existe `Button` variant. Criar variants que faltam (ex.: `variant="whatsapp"`, tamanhos) em vez de classes soltas.
- Padronizar espaçamentos/raios via tokens (`rounded-xl` = `--radius`).

### 4. Tipografia e ícones
- Fonte já é local (Geist) — manter.
- Ícones sempre `lucide-react`, tamanho consistente por contexto (16 em ação, 20 em header).

## Migração (sem regressão visual)
1. Extrair todos os tokens atuais do `globals.css`/`tailwind.config.ts` para `theme/tokens.css` (mesmos valores → visual idêntico).
2. Substituir hardcodes (`#25D366`, `rgba(0,255,163,...)`) por tokens equivalentes.
3. Criar variants de `Button`/badges que cobrem os usos hoje feitos com classes cruas.
4. Rodar o app e comparar telas (visual regression manual ou screenshot).

## Checklist
- [ ] `theme/tokens.css` como fonte única (HSL), importado no `globals.css`
- [ ] `tailwind.config.ts` sem cor literal
- [ ] Zero `#hex`/`rgba()` solto em componentes (WhatsApp e neon viram tokens)
- [ ] Claro + escuro definidos e testados
- [ ] Variants de `Button`/`Badge` cobrindo os usos atuais
- [ ] Doc curta de "como usar o tema" no topo do arquivo de tema
