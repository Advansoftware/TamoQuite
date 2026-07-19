import 'package:flutter/material.dart';

import 'app_colors.dart';

/// Tokens da marca que não têm slot no [ColorScheme] do Material 3
/// (superfície elevada, verde do WhatsApp, cor de aviso).
///
/// Exposto como [ThemeExtension] para que os widgets leiam
/// `Theme.of(context).brand.surfaceElevated` em vez de importar
/// [AppColors] e escolher a variante clara/escura na mão.
@immutable
class AppBrandColors extends ThemeExtension<AppBrandColors> {
  const AppBrandColors({
    required this.neon,
    required this.neonDim,
    required this.surfaceElevated,
    required this.whatsapp,
    required this.warning,
    required this.mutedForeground,
  });

  final Color neon;
  final Color neonDim;
  final Color surfaceElevated;
  final Color whatsapp;
  final Color warning;
  final Color mutedForeground;

  static const dark = AppBrandColors(
    neon: AppColors.neon,
    neonDim: AppColors.neonDim,
    surfaceElevated: AppColors.surfaceElevated,
    whatsapp: AppColors.whatsapp,
    warning: AppColors.warning,
    mutedForeground: AppColors.mutedForeground,
  );

  static const light = AppBrandColors(
    neon: AppColors.neon,
    neonDim: AppColors.neonDim,
    surfaceElevated: AppColors.lightSurfaceElevated,
    whatsapp: AppColors.whatsapp,
    warning: AppColors.warning,
    mutedForeground: AppColors.lightMutedForeground,
  );

  @override
  AppBrandColors copyWith({
    Color? neon,
    Color? neonDim,
    Color? surfaceElevated,
    Color? whatsapp,
    Color? warning,
    Color? mutedForeground,
  }) {
    return AppBrandColors(
      neon: neon ?? this.neon,
      neonDim: neonDim ?? this.neonDim,
      surfaceElevated: surfaceElevated ?? this.surfaceElevated,
      whatsapp: whatsapp ?? this.whatsapp,
      warning: warning ?? this.warning,
      mutedForeground: mutedForeground ?? this.mutedForeground,
    );
  }

  @override
  AppBrandColors lerp(ThemeExtension<AppBrandColors>? other, double t) {
    if (other is! AppBrandColors) return this;
    return AppBrandColors(
      neon: Color.lerp(neon, other.neon, t)!,
      neonDim: Color.lerp(neonDim, other.neonDim, t)!,
      surfaceElevated: Color.lerp(surfaceElevated, other.surfaceElevated, t)!,
      whatsapp: Color.lerp(whatsapp, other.whatsapp, t)!,
      warning: Color.lerp(warning, other.warning, t)!,
      mutedForeground: Color.lerp(mutedForeground, other.mutedForeground, t)!,
    );
  }
}

/// Açúcar sintático: `Theme.of(context).brand.neon`.
extension AppBrandColorsX on ThemeData {
  AppBrandColors get brand => extension<AppBrandColors>() ?? AppBrandColors.dark;
}
