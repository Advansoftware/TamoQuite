import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_status_badge.dart';
import '../../domain/installment.dart';

/// Linha de parcela na tela de detalhe do contrato.
///
/// Mostra número, vencimento e valor, e um menu com as ações de pagamento —
/// quitar, registrar parcial, desfazer.
class InstallmentRow extends StatelessWidget {
  const InstallmentRow({
    required this.installment,
    required this.onMarkPaid,
    required this.onPartial,
    required this.onUndo,
    super.key,
  });

  final Installment installment;
  final VoidCallback onMarkPaid;
  final VoidCallback onPartial;
  final VoidCallback onUndo;

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
                  Text(
                    _subtitle(),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: status.isOverdue
                          ? theme.colorScheme.error
                          : brand.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
            _Menu(
              installment: installment,
              onMarkPaid: onMarkPaid,
              onPartial: onPartial,
              onUndo: onUndo,
            ),
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
  const _Menu({
    required this.installment,
    required this.onMarkPaid,
    required this.onPartial,
    required this.onUndo,
  });

  final Installment installment;
  final VoidCallback onMarkPaid;
  final VoidCallback onPartial;
  final VoidCallback onUndo;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = installment.status;
    // Quitada ou parcial já têm pagamento: a ação é desfazer. Pendente/atrasada
    // ainda podem receber pagamento — total ou parcial.
    final hasPayment = status.isPaid || status == InstallmentStatus.partial;

    return PopupMenuButton<VoidCallback>(
      onSelected: (action) => action(),
      tooltip: 'Ações da parcela',
      icon: Icon(Icons.more_vert, color: theme.brand.mutedForeground),
      itemBuilder: (context) => [
        if (!status.isPaid)
          PopupMenuItem(
            value: onMarkPaid,
            child: const _MenuRow(icon: Icons.check_circle_outline, label: 'Marcar como pago'),
          ),
        if (!status.isPaid)
          PopupMenuItem(
            value: onPartial,
            child: const _MenuRow(icon: Icons.payments_outlined, label: 'Pagamento parcial'),
          ),
        if (hasPayment)
          PopupMenuItem(
            value: onUndo,
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
