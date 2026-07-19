'use client';

import { useState } from 'react';
import { TrendingUp, Clock } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';
import { useReportSummary } from '@/features/reports/use-reports';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { StatTile } from '@/components/ui/stat-tile';
import { LoadingBlock } from '@/components/ui/spinner';
import { EmptyState } from '@/components/ui/empty-state';
import { ChartCard } from '@/components/charts/ChartCard';
import { ColumnChart } from '@/components/charts/ColumnChart';
import { StackedBar } from '@/components/charts/StackedBar';
import { STATUS_COLOR, STATUS_LABEL } from '@/components/charts/chart-theme';

/**
 * Reports hub. Each report is a self-contained card, so adding the next one is
 * a new entry here — nothing else has to change. Wording is deliberately plain:
 * the reader is a lender, not an analyst.
 */

/** Reports not built yet. Listed so the screen shows where it is going. */
const UPCOMING = [
  { key: 'projetado', title: 'Projetado x Realizado', hint: 'O que você esperava receber e o que entrou de verdade.' },
  { key: 'custo', title: 'Custo x Recebido', hint: 'Quanto saiu do seu bolso e quanto já voltou.' },
  { key: 'ativo', title: 'Custo Ativo', hint: 'Quanto do seu dinheiro está na rua agora.' },
];

export function ReportsView() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useReportSummary(months);

  if (isLoading) return <LoadingBlock />;

  if (!data || data.totals.totalContracts === 0) {
    return (
      <div className="space-y-4 pb-6">
        <Header />
        <EmptyState
          icon={TrendingUp}
          title="Ainda não há nada para mostrar"
          description="Assim que você cadastrar um empréstimo, seus números aparecem aqui."
        />
      </div>
    );
  }

  const { totals, byStatus, monthly } = data;

  return (
    <div className="space-y-4 pb-6">
      <Header />

      <FilterTabs
        value={String(months)}
        onChange={(v) => setMonths(Number(v))}
        options={[
          { value: '6', label: 'Últimos 6 meses' },
          { value: '12', label: 'Últimos 12 meses' },
        ]}
      />

      {/* Headline numbers — these are figures, not charts. */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Contratos em andamento" value={String(totals.activeContracts)} />
        <StatTile label="Você emprestou" value={formatCurrency(totals.totalLent)} />
        <StatTile label="Já recebeu" value={formatCurrency(totals.totalReceived)} tone="neon" />
        <StatTile label="Ainda vai receber" value={formatCurrency(totals.outstanding)} tone="warning" />
      </div>

      <ChartCard
        title="Quanto você recebeu por mês"
        hint="Some tudo que entrou em cada mês. Toque em uma barra para ver o valor exato."
        table={monthly.map((m) => ({ label: m.label, value: formatCurrency(m.received) }))}
      >
        <ColumnChart
          data={monthly.map((m) => ({ label: m.label, value: m.received }))}
          formatValue={(v) => formatCurrency(v)}
        />
      </ChartCard>

      <ChartCard
        title="Situação dos seus contratos"
        hint="Quantos estão em andamento, quitados ou cancelados."
        table={(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => ({
          label: STATUS_LABEL[k],
          value: String(byStatus[k]),
        }))}
      >
        <StackedBar
          segments={(Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[]).map((k) => ({
            key: k,
            label: STATUS_LABEL[k],
            value: byStatus[k],
            color: STATUS_COLOR[k],
          }))}
        />
      </ChartCard>

      <ChartCard
        title="Seu ganho previsto"
        hint="É o que você recebe além do valor emprestado (os juros), somando os contratos que estão valendo."
      >
        <p className="text-2xl font-bold text-neon tabular-nums">{formatCurrency(totals.expectedProfit)}</p>
        <p className="text-xs text-muted-foreground">
          Sobre {formatCurrency(totals.totalLent)} emprestados.
        </p>
      </ChartCard>

      <div className="space-y-2 pt-2">
        <p className="text-sm font-semibold text-foreground">Em breve</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {UPCOMING.map((r) => (
            <div key={r.key} className="bg-surface rounded-2xl border border-border p-4 opacity-70">
              <div className="w-9 h-9 rounded-xl bg-surface-elevated flex items-center justify-center mb-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">{r.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{r.hint}</p>
              <p className="text-[11px] text-muted-foreground mt-2">Em breve</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="space-y-1">
      <h2 className="text-xl font-bold text-foreground">Relatórios</h2>
      <p className="text-sm text-muted-foreground">Um resumo de como seus empréstimos estão indo.</p>
    </div>
  );
}
