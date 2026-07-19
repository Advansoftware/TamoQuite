import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';

/// Card de métrica do painel: ícone em quadrado colorido, rótulo pequeno e
/// valor em destaque — como os cards de `DashboardView.tsx`
/// (`bg-surface rounded-2xl p-4 border border-border`).
class StatCard extends StatelessWidget {
  const StatCard({
    required this.label,
    required this.value,
    required this.icon,
    this.iconColor,
    this.iconBackground,
    this.valueColor,
    this.onTap,
    super.key,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color? iconColor;
  final Color? iconBackground;
  final Color? valueColor;
  final VoidCallback? onTap;

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
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: iconBackground ?? brand.neonDim,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: iconColor ?? brand.neon),
              ),
              const SizedBox(height: 12),
              Text(
                label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: brand.mutedForeground,
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: valueColor ?? theme.colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
