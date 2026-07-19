import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_status_badge.dart';
import '../../domain/loan.dart';

/// Cartão de contrato — espelha o card de `LoansView.tsx`.
///
/// [showBorrower] fica falso na tela do próprio cliente, onde repetir o nome
/// e o telefone em cada contrato só ocuparia espaço.
class LoanCard extends StatelessWidget {
  const LoanCard({
    required this.loan,
    required this.onTap,
    this.onDelete,
    this.showBorrower = true,
    super.key,
  });

  final Loan loan;
  final VoidCallback onTap;
  final VoidCallback? onDelete;
  final bool showBorrower;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (showBorrower) ...[
                _BorrowerRow(loan: loan, onDelete: onDelete),
                const SizedBox(height: 12),
              ] else ...[
                _ContractRow(loan: loan, onDelete: onDelete),
                const SizedBox(height: 12),
              ],

              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(
                    child: _Amount(
                      label: 'Valor total',
                      value: Formatters.currency(loan.installmentsTotal),
                      emphasis: true,
                    ),
                  ),
                  _Amount(
                    label: 'Original',
                    value: Formatters.currency(loan.originalAmount),
                    align: CrossAxisAlignment.end,
                  ),
                ],
              ),
              const SizedBox(height: 12),

              _Progress(loan: loan),
              const SizedBox(height: 12),

              Divider(height: 1, color: theme.colorScheme.outline),
              const SizedBox(height: 12),

              Row(
                children: [
                  _Meta(
                    icon: Icons.percent,
                    label: '${Formatters.rate(loan.interestRate)}% a.${_periodInitial(loan.frequency)}',
                  ),
                  const SizedBox(width: 12),
                  _Meta(
                    icon: Icons.event_outlined,
                    label: '${loan.installmentCount}x ${loan.frequency.label.toLowerCase()}',
                  ),
                  const Spacer(),
                  Text(
                    'Ver parcelas',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: brand.neon,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  Icon(Icons.arrow_forward, size: 12, color: brand.neon),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// "a.m." / "a.q." / "a.s." — a taxa é por período, não necessariamente
  /// mensal, e o site fixava "a.m." mesmo em contrato semanal.
  static String _periodInitial(PaymentFrequency frequency) =>
      switch (frequency) {
        PaymentFrequency.weekly => 's.',
        PaymentFrequency.biweekly => 'q.',
        PaymentFrequency.monthly => 'm.',
      };
}

class _BorrowerRow extends StatelessWidget {
  const _BorrowerRow({required this.loan, required this.onDelete});

  final Loan loan;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Row(
      children: [
        TqInitialsAvatar(
          initials: Formatters.initials(loan.borrower.name),
          color: brand.neon,
          background: brand.neonDim,
          size: 40,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                loan.borrower.name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleSmall,
              ),
              const SizedBox(height: 2),
              Text(
                loan.borrower.phone.display,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: brand.mutedForeground,
                ),
              ),
            ],
          ),
        ),
        _LoanBadge(loan: loan),
        if (onDelete != null) _DeleteButton(onPressed: onDelete!),
      ],
    );
  }
}

/// Cabeçalho do cartão quando o cliente já é o dono da tela.
class _ContractRow extends StatelessWidget {
  const _ContractRow({required this.loan, required this.onDelete});

  final Loan loan;
  final VoidCallback? onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      children: [
        Expanded(
          child: Text(
            'Contrato de ${Formatters.date(loan.startDate)}',
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: theme.textTheme.titleSmall,
          ),
        ),
        _LoanBadge(loan: loan),
        if (onDelete != null) _DeleteButton(onPressed: onDelete!),
      ],
    );
  }
}

/// Atraso vence o status: um contrato ativo com parcela vencida precisa
/// gritar isso, não dizer "Ativo".
class _LoanBadge extends StatelessWidget {
  const _LoanBadge({required this.loan});

  final Loan loan;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (loan.hasOverdue) {
      return TqStatusBadge(
        label: 'Atrasado',
        color: theme.colorScheme.error,
        dense: true,
      );
    }
    if (loan.status == LoanStatus.completed) {
      return TqStatusBadge(
        label: loan.status.label,
        color: theme.brand.neon,
        dense: true,
      );
    }
    return const SizedBox.shrink();
  }
}

class _DeleteButton extends StatelessWidget {
  const _DeleteButton({required this.onPressed});

  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: 'Excluir contrato',
      constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
      iconSize: 18,
      color: Theme.of(context).brand.mutedForeground,
      icon: const Icon(Icons.delete_outline),
    );
  }
}

class _Amount extends StatelessWidget {
  const _Amount({
    required this.label,
    required this.value,
    this.emphasis = false,
    this.align = CrossAxisAlignment.start,
  });

  final String label;
  final String value;
  final bool emphasis;
  final CrossAxisAlignment align;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: align,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: emphasis
              ? theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                )
              : theme.textTheme.bodyMedium?.copyWith(
                  color: theme.brand.mutedForeground,
                ),
        ),
      ],
    );
  }
}

class _Progress extends StatelessWidget {
  const _Progress({required this.loan});

  final Loan loan;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Column(
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${loan.paidCount}/${loan.installments.length} parcelas',
              style: theme.textTheme.bodySmall?.copyWith(
                color: brand.mutedForeground,
              ),
            ),
            Text(
              '${(loan.progress * 100).round()}%',
              style: theme.textTheme.bodySmall?.copyWith(
                color: brand.neon,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(999),
          child: LinearProgressIndicator(
            value: loan.progress,
            minHeight: 6,
            backgroundColor: brand.surfaceElevated,
            valueColor: AlwaysStoppedAnimation(brand.neon),
          ),
        ),
      ],
    );
  }
}

class _Meta extends StatelessWidget {
  const _Meta({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: theme.brand.mutedForeground),
        const SizedBox(width: 4),
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
      ],
    );
  }
}
