import 'package:flutter/material.dart';

/// Tipografia Geist, espelhando as escalas usadas em `apps/web`.
///
/// O site usa utilitários Tailwind (`text-2xl font-bold`, `text-sm`, …);
/// os tamanhos abaixo são a tradução direta deles para o Material 3.
abstract final class AppTypography {
  const AppTypography._();

  static const fontFamily = 'Geist';

  /// Aplica a família Geist a um [TextTheme] mantendo a escala do Material 3,
  /// e ajusta os pontos onde o site diverge do padrão.
  static TextTheme apply(TextTheme base) {
    return base
        .apply(fontFamily: fontFamily)
        .copyWith(
          // `text-2xl font-bold tracking-tight` — título "TamoQuite" no login.
          headlineSmall: base.headlineSmall?.copyWith(
            fontFamily: fontFamily,
            fontSize: 24,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.5,
          ),
          // `text-lg font-semibold` — títulos de seção ("Recuperar senha").
          titleLarge: base.titleLarge?.copyWith(
            fontFamily: fontFamily,
            fontSize: 18,
            fontWeight: FontWeight.w600,
            letterSpacing: -0.2,
          ),
          // `text-sm font-medium` — labels de campo.
          titleSmall: base.titleSmall?.copyWith(
            fontFamily: fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
          // `text-sm` — corpo padrão do site.
          bodyMedium: base.bodyMedium?.copyWith(
            fontFamily: fontFamily,
            fontSize: 14,
          ),
          // `text-xs` — textos auxiliares/rodapé.
          bodySmall: base.bodySmall?.copyWith(
            fontFamily: fontFamily,
            fontSize: 12,
          ),
          // `font-semibold text-sm` — rótulo de botão primário.
          labelLarge: base.labelLarge?.copyWith(
            fontFamily: fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
        );
  }
}
