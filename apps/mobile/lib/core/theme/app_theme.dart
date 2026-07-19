import 'package:flutter/material.dart';

import 'app_brand_colors.dart';
import 'app_colors.dart';
import 'app_typography.dart';

/// Temas Material 3 do app.
///
/// O esquema é gerado por [ColorScheme.fromSeed] a partir do neon da marca e
/// então sobrescrito nos papéis que o site define explicitamente — assim
/// ganhamos as harmonias do Material You sem deixar o app divergir do
/// visual de `apps/web`.
abstract final class AppTheme {
  const AppTheme._();

  /// `--radius: 0.75rem` → 12px. Campos e botões usam `rounded-xl`.
  static const radius = 12.0;

  /// Altura de campo/botão no site (`h-12`).
  static const controlHeight = 48.0;

  static ThemeData get dark => _build(
    ColorScheme.fromSeed(
      seedColor: AppColors.neon,
      brightness: Brightness.dark,
    ).copyWith(
      primary: AppColors.neon,
      onPrimary: AppColors.background,
      surface: AppColors.background,
      onSurface: AppColors.foreground,
      surfaceContainer: AppColors.surface,
      surfaceContainerHigh: AppColors.surfaceElevated,
      onSurfaceVariant: AppColors.mutedForeground,
      outline: AppColors.border,
      outlineVariant: AppColors.border,
      error: AppColors.danger,
    ),
    AppBrandColors.dark,
  );

  static ThemeData get light => _build(
    ColorScheme.fromSeed(
      seedColor: AppColors.neon,
      brightness: Brightness.light,
    ).copyWith(
      // No claro o neon puro não tem contraste suficiente para texto sobre
      // branco, então ele fica restrito a preenchimentos (botões, ícones),
      // sempre com conteúdo escuro por cima.
      primary: AppColors.neon,
      onPrimary: AppColors.lightForeground,
      surface: AppColors.lightBackground,
      onSurface: AppColors.lightForeground,
      surfaceContainer: AppColors.lightSurface,
      surfaceContainerHigh: AppColors.lightSurfaceElevated,
      onSurfaceVariant: AppColors.lightMutedForeground,
      outline: AppColors.lightBorder,
      outlineVariant: AppColors.lightBorder,
      error: AppColors.danger,
    ),
    AppBrandColors.light,
  );

  static ThemeData _build(ColorScheme scheme, AppBrandColors brand) {
    final base = ThemeData(colorScheme: scheme, useMaterial3: true);

    return base.copyWith(
      scaffoldBackgroundColor: scheme.surface,
      textTheme: AppTypography.apply(base.textTheme),
      extensions: [brand],

      appBarTheme: AppBarTheme(
        backgroundColor: scheme.surface,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        scrolledUnderElevation: 0,
        centerTitle: false,
        titleTextStyle: AppTypography.apply(
          base.textTheme,
        ).titleLarge?.copyWith(color: scheme.onSurface),
      ),

      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: scheme.surfaceContainer,
        // O site usa `h-12 px-4`; com isDense=false o padding vertical abaixo
        // resulta na mesma altura de 48px.
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        hintStyle: TextStyle(color: brand.mutedForeground, fontSize: 14),
        border: _inputBorder(scheme.outline),
        enabledBorder: _inputBorder(scheme.outline),
        // `focus:border-neon/50 focus:ring-1 focus:ring-neon/20`
        focusedBorder: _inputBorder(scheme.primary.withValues(alpha: 0.5)),
        errorBorder: _inputBorder(scheme.error),
        focusedErrorBorder: _inputBorder(scheme.error),
      ),

      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          minimumSize: const Size.fromHeight(controlHeight),
          backgroundColor: scheme.primary,
          foregroundColor: scheme.onPrimary,
          disabledBackgroundColor: scheme.primary.withValues(alpha: 0.4),
          disabledForegroundColor: scheme.onPrimary.withValues(alpha: 0.7),
          textStyle: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radius),
          ),
        ),
      ),

      textButtonTheme: TextButtonThemeData(
        style: TextButton.styleFrom(
          foregroundColor: brand.mutedForeground,
          // Alvo de toque mínimo de 44px, como no ajuste mobile do site.
          minimumSize: const Size(44, 44),
          textStyle: const TextStyle(
            fontFamily: AppTypography.fontFamily,
            fontSize: 14,
            fontWeight: FontWeight.w500,
          ),
        ),
      ),

      cardTheme: CardThemeData(
        color: scheme.surfaceContainer,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius + 4),
          side: BorderSide(color: scheme.outline),
        ),
      ),

      snackBarTheme: SnackBarThemeData(
        backgroundColor: scheme.surfaceContainerHigh,
        contentTextStyle: TextStyle(
          fontFamily: AppTypography.fontFamily,
          color: scheme.onSurface,
          fontSize: 14,
        ),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(radius),
        ),
      ),
    );
  }

  static OutlineInputBorder _inputBorder(Color color) => OutlineInputBorder(
    borderRadius: BorderRadius.circular(radius),
    borderSide: BorderSide(color: color),
  );
}
