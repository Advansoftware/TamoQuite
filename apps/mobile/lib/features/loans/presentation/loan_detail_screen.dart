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
import 'widgets/loan_billing_card.dart';
import 'widgets/loan_form_sheet.dart';
import 'widgets/partial_payment_sheet.dart';
import 'widgets/pay_interest_sheet.dart';
import 'widgets/share_loan_sheet.dart';

/// Detalhe do contrato com as parcelas — espelha `LoanDetailView.tsx`.
///
/// Reúne resumo, condições, cobrança automática e a lista de parcelas, com
/// todas as ações por parcela (quitar, parcial, juros, rolar, vencimento,
/// silenciar, desfazer), além de corrigir, compartilhar e excluir o contrato.
class LoanDetailScreen extends ConsumerWidget {
  const LoanDetailScreen({required this.loanId, super.key});

  final String loanId;

  LoanActions _actions(WidgetRef ref) => ref.read(loanActionsProvider);

  Future<void> _edit(BuildContext context, Loan loan) async {
    final saved = await showEditLoanSheet(context, loan);
    if (saved && context.mounted) _message(context, 'Contrato atualizado.');
  }

  Future<void> _delete(BuildContext context, WidgetRef ref, Loan loan) async {
    final confirmed = await showDeleteLoanDialog(context, loan);
    if (!confirmed) return;

    try {
      await _actions(ref).remove(loan.id);
      if (context.mounted) {
        _message(context, 'Contrato excluído.');
        context.pop();
      }
    } on ApiException catch (e) {
      if (context.mounted) _message(context, e.message);
    }
  }

  Future<void> _run(
    BuildContext context,
    Future<void> Function() action,
    String success,
  ) async {
    try {
      await action();
      if (context.mounted) _message(context, success);
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
    if (amount == null || !context.mounted) return;
    await _run(
      context,
      () => _actions(ref).addPartialPayment(loanId, installment.id, amount),
      'Pagamento registrado.',
    );
  }

  Future<void> _payInterest(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    final result = await showPayInterestSheet(context, installment);
    if (result == null || !context.mounted) return;
    await _run(
      context,
      () => _actions(ref).payInterest(
        loanId,
        installment.id,
        result.amount,
        rollImmediately: result.rollImmediately,
      ),
      result.rollImmediately ? 'Juros pagos e parcela rolada.' : 'Juros registrados.',
    );
  }

  Future<void> _roll(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    final confirmed = await _confirm(
      context,
      title: 'Rolar parcela',
      message: 'O valor já pago vira uma parcela de juros e esta parcela '
          '(com o saldo) e as seguintes vão um período à frente. Confirmar?',
      confirmLabel: 'Rolar',
    );
    if (!confirmed || !context.mounted) return;
    await _run(
      context,
      () => _actions(ref).rollRemaining(loanId, installment.id),
      'Parcela rolada.',
    );
  }

  Future<void> _changeDueDate(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: installment.dueDate,
      firstDate: DateTime(now.year - 2),
      lastDate: DateTime(now.year + 6),
      helpText: 'Novo vencimento',
    );
    if (picked == null || !context.mounted) return;
    await _run(
      context,
      () => _actions(ref).setInstallmentDueDate(loanId, installment.id, picked),
      'Vencimento alterado.',
    );
  }

  Future<void> _toggleCharge(
    BuildContext context,
    WidgetRef ref,
    Installment installment,
  ) async {
    final mute = !installment.doNotCharge;
    await _run(
      context,
      () => _actions(ref)
          .setInstallmentCharge(loanId, installment.id, doNotCharge: mute),
      mute ? 'Cobrança desta parcela silenciada.' : 'Cobrança reativada.',
    );
  }

  Future<bool> _confirm(
    BuildContext context, {
    required String title,
    required String message,
    required String confirmLabel,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: Text(confirmLabel),
          ),
        ],
      ),
    );
    return confirmed ?? false;
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
          if (loan.hasValue) ...[
            IconButton(
              tooltip: 'Compartilhar',
              onPressed: () => showShareLoanSheet(context, loan.value!),
              icon: const Icon(Icons.share_outlined),
            ),
            PopupMenuButton<VoidCallback>(
              onSelected: (action) => action(),
              itemBuilder: (context) => [
                PopupMenuItem(
                  value: () => _edit(context, loan.value!),
                  child: const _MenuRow(
                    icon: Icons.edit_outlined,
                    label: 'Corrigir contrato',
                  ),
                ),
                PopupMenuItem(
                  value: () => _delete(context, ref, loan.value!),
                  child: _MenuRow(
                    icon: Icons.delete_outline,
                    label: 'Excluir contrato',
                    color: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(loanDetailProvider(loanId).future),
        child: switch (loan) {
          AsyncData(:final value) => _Content(
            loan: value,
            actionsFor: (installment) => InstallmentActions(
              onMarkPaid: () => _run(
                context,
                () => _actions(ref).markPaid(loanId, installment.id),
                'Parcela quitada.',
              ),
              onPartial: () => _partial(context, ref, installment),
              onUndo: () => _run(
                context,
                () => _actions(ref).undoPayment(loanId, installment.id),
                'Pagamento desfeito.',
              ),
              onChangeDueDate: () => _changeDueDate(context, ref, installment),
              onRoll: () => _roll(context, ref, installment),
              onPayInterest: () => _payInterest(context, ref, installment),
              onToggleCharge: () => _toggleCharge(context, ref, installment),
            ),
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
  const _Content({required this.loan, required this.actionsFor});

  final Loan loan;
  final InstallmentActions Function(Installment) actionsFor;

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
            const SizedBox(height: 16),
            LoanBillingCard(loan: loan),
            const SizedBox(height: 24),

            TqSectionHeader(
              title: 'Parcelas',
              icon: Icons.receipt_long_outlined,
              color: theme.brand.mutedForeground,
            ),
            for (final installment in loan.installments)
              InstallmentRow(
                installment: installment,
                actions: actionsFor(installment),
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

class _MenuRow extends StatelessWidget {
  const _MenuRow({required this.icon, required this.label, this.color});

  final IconData icon;
  final String label;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 18, color: color),
        const SizedBox(width: 12),
        Text(label, style: color == null ? null : TextStyle(color: color)),
      ],
    );
  }
}
