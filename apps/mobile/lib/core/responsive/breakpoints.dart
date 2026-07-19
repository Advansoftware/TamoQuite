import 'package:flutter/widgets.dart';

/// Classes de largura do app.
///
/// Os limites acompanham os breakpoints do Tailwind usados em `apps/web`
/// (`sm:640`, `md:768`, `lg:1024`), que é onde o site troca de layout.
enum ScreenSize {
  /// < 640px — celulares.
  mobile,

  /// 640–1023px — celulares grandes em paisagem e tablets em retrato.
  tablet,

  /// >= 1024px — tablets em paisagem e desktop.
  desktop;

  bool get isMobile => this == ScreenSize.mobile;
  bool get isTablet => this == ScreenSize.tablet;
  bool get isDesktop => this == ScreenSize.desktop;

  /// Verdadeiro para tablet e acima — usado para decidir entre layout de
  /// coluna única e layouts com mais respiro.
  bool get isWide => this != ScreenSize.mobile;
}

abstract final class Breakpoints {
  const Breakpoints._();

  static const tablet = 640.0;
  static const desktop = 1024.0;

  /// Largura máxima de conteúdo (`max-w-5xl` no site).
  static const maxContentWidth = 1024.0;

  /// Largura máxima de formulários centrados (`max-w-sm` na tela de login).
  static const maxFormWidth = 384.0;

  static ScreenSize fromWidth(double width) {
    if (width >= desktop) return ScreenSize.desktop;
    if (width >= tablet) return ScreenSize.tablet;
    return ScreenSize.mobile;
  }
}

extension ScreenSizeContext on BuildContext {
  /// Classe de tela derivada da largura da janela.
  ///
  /// Prefira [ResponsiveBuilder] dentro de widgets que já estão sob um
  /// [LayoutBuilder]; use esta extensão para decisões pontuais.
  ScreenSize get screenSize =>
      Breakpoints.fromWidth(MediaQuery.sizeOf(this).width);
}
