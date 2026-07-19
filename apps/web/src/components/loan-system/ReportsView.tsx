'use client';

import { useState } from 'react';
import { TrendingUp } from 'lucide-react';
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

  // Capital recuperado, limitado a 100% — o que passa disso é lucro, dito em texto.
  const recoveredPct =
    totals.totalLent > 0
      ? Math.round((Math.min(totals.totalReceived, totals.totalLent) / totals.totalLent) * 100)
      : 0;

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
        hint="Quantos estão em andamento e quantos já foram quitados."
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

      <ChartCard
        title="Projetado x Realizado"
        hint="O que você esperava receber até hoje e o que entrou de verdade. Parcelas que ainda não venceram não entram na conta."
        table={[
          { label: 'Previsto até hoje', value: formatCurrency(totals.expectedToDate) },
          { label: 'Recebido', value: formatCurrency(totals.totalReceived) },
          { label: 'Diferença', value: formatCurrency(totals.totalReceived - totals.expectedToDate) },
        ]}
      >
        <ColumnChart
          data={[
            { label: 'Previsto', value: totals.expectedToDate },
            { label: 'Recebido', value: totals.totalReceived },
          ]}
          formatValue={(v) => formatCurrency(v)}
        />
        <p className="text-xs text-muted-foreground">
          {totals.totalReceived < totals.expectedToDate
            ? `Faltam ${formatCurrency(totals.expectedToDate - totals.totalReceived)} do que já era esperado.`
            : 'Você está em dia com o que era esperado até agora.'}
        </p>
      </ChartCard>

      <ChartCard
        title="Custo x Recebido"
        hint="Quanto saiu do seu bolso e quanto já voltou, somando tudo (capital + juros)."
        table={[
          { label: 'Saiu do seu bolso', value: formatCurrency(totals.totalLent) },
          { label: 'Já voltou', value: formatCurrency(totals.totalReceived) },
          { label: 'Capital recuperado', value: `${recoveredPct}%` },
        ]}
      >
        <ColumnChart
          data={[
            { label: 'Emprestado', value: totals.totalLent },
            { label: 'Recebido', value: totals.totalReceived },
          ]}
          formatValue={(v) => formatCurrency(v)}
        />
        <p className="text-xs text-muted-foreground">
          {totals.totalReceived >= totals.totalLent
            ? `Você já recuperou tudo que emprestou e está ${formatCurrency(totals.totalReceived - totals.totalLent)} acima.`
            : `Você já recuperou ${recoveredPct}% do que emprestou.`}
        </p>
      </ChartCard>

      <ChartCard
        title="Custo Ativo"
        hint="Quanto do seu dinheiro está na rua agora — contratos em andamento que ainda não devolveram o que você colocou."
      >
        <p className="text-2xl font-bold text-warning tabular-nums">{formatCurrency(totals.activeCapital)}</p>
        <p className="text-xs text-muted-foreground">
          {totals.activeCapital > 0
            ? `De ${formatCurrency(totals.totalLent)} emprestados, é o que ainda não voltou pro seu bolso.`
            : 'Todo o dinheiro que você emprestou já voltou.'}
        </p>
      </ChartCard>
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
