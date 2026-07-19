import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/responsive/responsive_builder.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/tq_state_views.dart';
import '../../../core/widgets/tq_stat_card.dart';
import '../application/loans_controller.dart';
import '../domain/installment.dart';
import '../domain/loan.dart';
import 'widgets/delete_loan_dialog.dart';
import 'widgets/installment_row.dart';
import 'widgets/partial_payment_sheet.dart';

/// Detalhe do contrato com as parcelas — espelha `LoanDetailView.tsx`
/// (versão focada: resumo, lista de parcelas e ações de pagamento).
class LoanDetailScreen extends ConsumerWidget {
  const LoanDetailScreen({required this.loanId, super.key});

  final String loanId;

  Future<void> _delete(BuildContext context, WidgetRef ref, Loan loan) async {
    final confirmed = await showDeleteLoanDialog(context, loan);
    if (!confirmed) return;

    try {
      await ref.read(loanActionsProvider).remove(loan.id);
      if (context.mounted) {
        _message(context, 'Contrato excluído.');
        context.pop();
      }
    } on ApiException catch (e) {
      if (context.mounted) _message(context, e.message);
    }
  }

  Future<void> _markPaid(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    try {
      await ref.read(loanActionsProvider).markPaid(loanId, installment.id);
      if (context.mounted) _message(context, 'Parcela quitada.');
    } on ApiException catch (e) {
      if (context.mounted) _message(context, e.message);
    }
  }

  Future<void> _partial(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    final amount = await showPartialPaymentSheet(context, installment);
    if (amount == null) return;

    try {
      await ref
          .read(loanActionsProvider)
          .addPartialPayment(loanId, installment.id, amount);
      if (context.mounted) _message(context, 'Pagamento registrado.');
    } on ApiException catch (e) {
      if (context.mounted) _message(context, e.message);
    }
  }

  Future<void> _undo(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    try {
      await ref.read(loanActionsProvider).undoPayment(loanId, installment.id);
      if (context.mounted) _message(context, 'Pagamento desfeito.');
    } on ApiException catch (e) {
      if (context.mounted) _message(context, e.message);
    }
  }

  void _message(BuildContext context, String text) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final loan = ref.watch(loanDetailProvider(loanId));

    return Scaffold(
      appBar: AppBar(
        title: Text(loan.value?.borrower.name ?? 'Contrato'),
        actions: [
          if (loan.hasValue)
            IconButton(
              tooltip: 'Excluir contrato',
              onPressed: () => _delete(context, ref, loan.value!),
              icon: const Icon(Icons.delete_outline),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(loanDetailProvider(loanId).future),
        child: switch (loan) {
          AsyncData(:final value) => _Content(
            loan: value,
            onMarkPaid: (i) => _markPaid(context, ref, i),
            onPartial: (i) => _partial(context, ref, i),
            onUndo: (i) => _undo(context, ref, i),
          ),
          AsyncError(:final error) => ListView(
            children: [
              SizedBox(
                height: 400,
                child: TqErrorState(
                  message: error is ApiException
                      ? error.message
                      : 'Não foi possível carregar o contrato.',
                  onRetry: () => ref.invalidate(loanDetailProvider(loanId)),
                ),
              ),
            ],
          ),
          _ => const TqLoadingState(),
        },
      ),
    );
  }
}

class _Content extends StatelessWidget {
  const _Content({
    required this.loan,
    required this.onMarkPaid,
    required this.onPartial,
    required this.onUndo,
  });

  final Loan loan;
  final ValueChanged<Installment> onMarkPaid;
  final ValueChanged<Installment> onPartial;
  final ValueChanged<Installment> onUndo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ResponsiveBuilder(
      builder: (context, size) {
        final padding = size.isMobile ? 16.0 : 24.0;

        return ListView(
          padding: EdgeInsets.fromLTRB(padding, 16, padding, 32),
          children: [
            _Summary(loan: loan, isMobile: size.isMobile),
            const SizedBox(height: 16),
            _Terms(loan: loan),
            const SizedBox(height: 24),

            TqSectionHeader(
              title: 'Parcelas',
              icon: Icons.receipt_long_outlined,
              color: theme.brand.mutedForeground,
            ),
            for (final installment in loan.installments)
              InstallmentRow(
                installment: installment,
                onMarkPaid: () => onMarkPaid(installment),
                onPartial: () => onPartial(installment),
                onUndo: () => onUndo(installment),
              ),
          ],
        );
      },
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.loan, required this.isMobile});

  final Loan loan;
  final bool isMobile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GridView.count(
      crossAxisCount: isMobile ? 2 : 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: isMobile ? 1.35 : 1.5,
      children: [
        TqStatCard(
          label: 'Total a receber',
          value: Formatters.currency(loan.installmentsTotal),
          icon: Icons.attach_money,
        ),
        TqStatCard(
          label: 'Recebido',
          value: Formatters.currency(loan.paidAmount),
          icon: Icons.trending_up,
          valueColor: theme.brand.neon,
        ),
        TqStatCard(
          label: 'Em aberto',
          value: Formatters.currency(loan.outstanding),
          icon: Icons.account_balance_wallet_outlined,
        ),
        TqStatCard(
          label: 'Parcelas',
          value: '${loan.paidCount}/${loan.installments.length}',
          icon: Icons.event_available_outlined,
        ),
      ],
    );
  }
}

/// Condições do contrato: emprestado, juros e periodicidade.
class _Terms extends StatelessWidget {
  const _Terms({required this.loan});

  final Loan loan;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _row(theme, 'Valor emprestado',
                Formatters.currency(loan.originalAmount)),
            const SizedBox(height: 10),
            _row(theme, 'Juros', '${Formatters.rate(loan.interestRate)}% por período'),
            const SizedBox(height: 10),
            _row(theme, 'Parcelas',
                '${loan.installmentCount}x · ${loan.frequency.label.toLowerCase()}'),
            const SizedBox(height: 10),
            _row(theme, 'Início', Formatters.date(loan.startDate)),
          ],
        ),
      ),
    );
  }

  Widget _row(ThemeData theme, String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
        Text(value, style: theme.textTheme.bodyMedium),
      ],
    );
  }
}
