import 'package:flutter/material.dart';

import '../theme/app_brand_colors.dart';
import '../theme/app_colors.dart';

/// Marca do TamoQuite: quadrado neon arredondado com o raio, mais o glow.
///
/// Replica o bloco de logo de `LoginPage.tsx`
/// (`w-16 h-16 rounded-2xl bg-neon … shadow-[0_0_30px_rgba(0,255,163,0.3)]`).
class TqLogo extends StatelessWidget {
  const TqLogo({this.size = 64, super.key});

  final double size;

  @override
  Widget build(BuildContext context) {
    final brand = Theme.of(context).brand;

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        color: brand.neon,
        borderRadius: BorderRadius.circular(size / 4),
        boxShadow: AppColors.neonGlow(blur: size * 0.47),
      ),
      child: Icon(
        Icons.bolt,
        size: size / 2,
        color: AppColors.background,
      ),
    );
  }
}

/// Logo + nome + tagline, como no topo da tela de login do site.
class TqLogoHeader extends StatelessWidget {
  const TqLogoHeader({this.logoSize = 64, super.key});

  final double logoSize;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        TqLogo(size: logoSize),
        const SizedBox(height: 16),
        Text('TamoQuite', style: theme.textTheme.headlineSmall),
        const SizedBox(height: 4),
        Text(
          'Cobranças & Repasses Inteligentes',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.brand.mutedForeground,
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
