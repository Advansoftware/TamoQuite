import 'package:flutter/material.dart';

import 'breakpoints.dart';

/// Entrega a [ScreenSize] a partir das restrições reais do pai.
///
/// Prefira este widget a `MediaQuery` quando a decisão de layout depender do
/// espaço disponível para *aquele trecho* da tela (um painel lateral, por
/// exemplo) e não do tamanho da janela inteira.
class ResponsiveBuilder extends StatelessWidget {
  const ResponsiveBuilder({required this.builder, super.key});

  final Widget Function(BuildContext context, ScreenSize size) builder;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) =>
          builder(context, Breakpoints.fromWidth(constraints.maxWidth)),
    );
  }
}

/// Centraliza o conteúdo e limita sua largura, para que em tablets e telas
/// largas o texto não se estique de borda a borda.
///
/// O padding horizontal cresce junto com a tela, acompanhando o
/// `px-4 md:px-6` do site.
class ResponsiveCenter extends StatelessWidget {
  const ResponsiveCenter({
    required this.child,
    this.maxWidth = Breakpoints.maxContentWidth,
    super.key,
  });

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, size) {
        return Align(
          alignment: Alignment.topCenter,
          child: ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: size.isMobile ? 24 : 32,
              ),
              child: child,
            ),
          ),
        );
      },
    );
  }
}
