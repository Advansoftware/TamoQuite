import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_status_badge.dart';
import '../../domain/installment.dart';

/// Ações disponíveis no menu de uma parcela.
class InstallmentActions {
  const InstallmentActions({
    required this.onMarkPaid,
    required this.onPartial,
    required this.onUndo,
    required this.onChangeDueDate,
    required this.onRoll,
    required this.onPayInterest,
    required this.onToggleCharge,
  });

  final VoidCallback onMarkPaid;
  final VoidCallback onPartial;
  final VoidCallback onUndo;
  final VoidCallback onChangeDueDate;
  final VoidCallback onRoll;
  final VoidCallback onPayInterest;
  final VoidCallback onToggleCharge;
}

/// Linha de parcela na tela de detalhe do contrato.
///
/// Mostra número, vencimento e valor, e um menu com as ações da parcela —
/// quitar, parcial, desfazer, alterar vencimento, rolar, pagar juros e
/// silenciar a cobrança.
class InstallmentRow extends StatelessWidget {
  const InstallmentRow({
    required this.installment,
    required this.actions,
    super.key,
  });

  final Installment installment;
  final InstallmentActions actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;
    final status = installment.status;
    final isPaid = status.isPaid;

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            // Número da parcela em um selo redondo, verde quando quitada.
            Container(
              width: 36,
              height: 36,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isPaid ? brand.neonDim : theme.colorScheme.surfaceContainerHigh,
                shape: BoxShape.circle,
              ),
              child: isPaid
                  ? Icon(Icons.check, size: 18, color: brand.neon)
                  : Text(
                      '${installment.installmentNumber}',
                      style: theme.textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          Formatters.currency(installment.amount),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.titleSmall?.copyWith(
                            decoration: isPaid ? TextDecoration.lineThrough : null,
                            color: isPaid ? brand.mutedForeground : null,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      TqStatusBadge(
                        label: status.label,
                        color: status.color(theme),
                        dense: true,
                      ),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          _subtitle(),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: theme.textTheme.bodySmall?.copyWith(
                            color: status.isOverdue
                                ? theme.colorScheme.error
                                : brand.mutedForeground,
                          ),
                        ),
                      ),
                      if (installment.doNotCharge) ...[
                        const SizedBox(width: 6),
                        Icon(
                          Icons.notifications_off_outlined,
                          size: 13,
                          color: brand.mutedForeground,
                        ),
                      ],
                    ],
                  ),
                ],
              ),
            ),
            _Menu(installment: installment, actions: actions),
          ],
        ),
      ),
    );
  }

  String _subtitle() {
    final due = 'Vence ${Formatters.date(installment.dueDate)}';

    if (installment.status == InstallmentStatus.partial) {
      return '$due · falta ${Formatters.currency(installment.remaining)}';
    }
    if (installment.status.isOverdue) {
      final days = Formatters.daysOverdue(installment.dueDate);
      if (days <= 0) return 'Vence hoje';
      return '$due · ${days == 1 ? '1 dia' : '$days dias'} em atraso';
    }
    return due;
  }
}

class _Menu extends StatelessWidget {
  const _Menu({required this.installment, required this.actions});

  final Installment installment;
  final InstallmentActions actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = installment.status;
    // Quitada ou parcial já têm pagamento: a ação é desfazer. Pendente/atrasada
    // ainda podem receber pagamento — total ou parcial.
    final isPartial = status == InstallmentStatus.partial;
    final hasPayment = status.isPaid || isPartial;

    return PopupMenuButton<VoidCallback>(
      onSelected: (action) => action(),
      tooltip: 'Ações da parcela',
      icon: Icon(Icons.more_vert, color: theme.brand.mutedForeground),
      itemBuilder: (context) => [
        if (!status.isPaid)
          PopupMenuItem(
            value: actions.onMarkPaid,
            child: const _MenuRow(icon: Icons.check_circle_outline, label: 'Marcar como pago'),
          ),
        if (!status.isPaid)
          PopupMenuItem(
            value: actions.onPartial,
            child: const _MenuRow(icon: Icons.payments_outlined, label: 'Pagamento parcial'),
          ),
        if (!status.isPaid)
          PopupMenuItem(
            value: actions.onPayInterest,
            child: const _MenuRow(icon: Icons.percent, label: 'Pagar juros'),
          ),
        // Rolar só faz sentido numa parcela parcial (regra do servidor).
        if (isPartial)
          PopupMenuItem(
            value: actions.onRoll,
            child: const _MenuRow(icon: Icons.fast_forward_outlined, label: 'Rolar parcela'),
          ),
        if (!status.isPaid)
          PopupMenuItem(
            value: actions.onChangeDueDate,
            child: const _MenuRow(icon: Icons.event_outlined, label: 'Alterar vencimento'),
          ),
        PopupMenuItem(
          value: actions.onToggleCharge,
          child: _MenuRow(
            icon: installment.doNotCharge
                ? Icons.notifications_active_outlined
                : Icons.notifications_off_outlined,
            label: installment.doNotCharge
                ? 'Voltar a cobrar'
                : 'Não cobrar esta parcela',
          ),
        ),
        if (hasPayment)
          PopupMenuItem(
            value: actions.onUndo,
            child: _MenuRow(
              icon: Icons.undo,
              label: 'Desfazer pagamento',
              color: theme.colorScheme.error,
            ),
          ),
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
