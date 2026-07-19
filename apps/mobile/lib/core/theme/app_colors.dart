import 'package:flutter/material.dart';

/// Design tokens espelhados de `apps/web/src/app/theme.css`.
///
/// Esta é a única fonte de verdade de cor do app. Nenhum widget deve declarar
/// hex diretamente — consuma via [Theme.of] ou pelas extensões em
/// `app_theme.dart`, para que uma troca de paleta aconteça em um lugar só.
abstract final class AppColors {
  const AppColors._();

  // ---- Marca ----
  /// `--neon` / `--primary` — verde neon do TamoQuite. Cor-semente do esquema.
  static const neon = Color(0xFF00FFA3);

  /// `--neon-dim` — rgba(0,255,163,0.15), usado em fundos de ícone.
  static const neonDim = Color(0x2600FFA3);

  /// `--whatsapp` — verde da marca WhatsApp.
  static const whatsapp = Color(0xFF25D366);

  // ---- Superfícies (tema escuro — igual ao site) ----
  static const background = Color(0xFF080C12); // --background
  static const surface = Color(0xFF111827); // --card / --surface
  static const surfaceElevated = Color(0xFF1A1F2E); // --surface-elevated
  static const sidebar = Color(0xFF0D1117); // --sidebar

  // ---- Conteúdo ----
  static const foreground = Color(0xFFF1F5F9); // --foreground
  static const mutedForeground = Color(0xFF6B7280); // --muted-foreground

  // ---- Bordas ----
  static const border = Color(0x14FFFFFF); // rgba(255,255,255,0.08)
  static const input = Color(0x1AFFFFFF); // rgba(255,255,255,0.10)

  // ---- Status ----
  static const danger = Color(0xFFEF4444); // --destructive / --danger
  static const warning = Color(0xFFF59E0B); // --warning

  // ---- Superfícies do tema claro ----
  // O site é dark-only; estes valores são derivados para o modo claro do app,
  // mantendo o neon como cor de destaque sobre fundos quase-brancos.
  static const lightBackground = Color(0xFFF8FAFC);
  static const lightSurface = Color(0xFFFFFFFF);
  static const lightSurfaceElevated = Color(0xFFF1F5F9);
  static const lightForeground = Color(0xFF0F172A);
  static const lightMutedForeground = Color(0xFF64748B);
  static const lightBorder = Color(0x140F172A);

  /// Sombra do glow neon (`shadow-[0_0_20px_rgba(0,255,163,0.3)]` no site).
  static List<BoxShadow> neonGlow({double blur = 20, double opacity = 0.3}) => [
    BoxShadow(color: neon.withValues(alpha: opacity), blurRadius: blur),
  ];
}
