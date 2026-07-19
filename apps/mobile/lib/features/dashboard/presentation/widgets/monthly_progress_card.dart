import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';

/// Barra de progresso do mês: quanto já foi recebido do total previsto.
/// Espelha o bloco "Progresso do Mês" do painel do site.
class MonthlyProgressCard extends StatelessWidget {
  const MonthlyProgressCard({
    required this.received,
    required this.total,
    required this.progress,
    super.key,
  });

  final double received;
  final double total;

  /// Entre 0 e 1.
  final double progress;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Progresso do Mês', style: theme.textTheme.titleSmall),
                Text(
                  '${(progress * 100).round()}%',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: brand.neon,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: brand.surfaceElevated,
                valueColor: AlwaysStoppedAnimation(brand.neon),
              ),
            ),
            const SizedBox(height: 8),
            DefaultTextStyle(
              style:
                  theme.textTheme.bodySmall?.copyWith(
                    color: brand.mutedForeground,
                  ) ??
                  const TextStyle(),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${Formatters.currency(received)} recebido'),
                  Text('${Formatters.currency(total)} total'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
