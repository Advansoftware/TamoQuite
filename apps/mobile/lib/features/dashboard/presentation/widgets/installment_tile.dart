import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../domain/dashboard_summary.dart';

/// Linha de parcela nas listas "Parcelas Atrasadas" e "Próximos Vencimentos".
///
/// Mostra o nome do devedor, o número da parcela, o vencimento e o saldo.
class InstallmentTile extends StatelessWidget {
  const InstallmentTile({required this.installment, this.onTap, super.key});

  final InstallmentSummary installment;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;
    final isOverdue = installment.isOverdue;

    return Card(
      clipBehavior: Clip.antiAlias,
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      installment.borrowerName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.titleSmall,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _subtitle(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: isOverdue
                            ? theme.colorScheme.error
                            : brand.mutedForeground,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              Text(
                Formatters.currency(installment.remaining),
                style: theme.textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: isOverdue ? theme.colorScheme.error : null,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _subtitle() {
    final parcel = 'Parcela ${installment.installmentNumber}';
    final due = Formatters.date(installment.dueDate);

    if (!installment.isOverdue) return '$parcel · vence em $due';

    final days = Formatters.daysOverdue(installment.dueDate);
    if (days <= 0) return '$parcel · vence hoje';
    return '$parcel · $days ${days == 1 ? 'dia' : 'dias'} em atraso';
  }
}
