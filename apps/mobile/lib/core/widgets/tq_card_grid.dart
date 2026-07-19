import 'package:flutter/material.dart';

import '../responsive/breakpoints.dart';

/// Grade de cartões de altura variável.
///
/// [GridView] exige proporção fixa, o que corta observações e nomes longos.
/// Aqui a largura da coluna é calculada e a altura fica livre, então cada
/// cartão cresce conforme o próprio conteúdo — o mesmo efeito do
/// `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` do site.
class TqCardGrid extends StatelessWidget {
  const TqCardGrid({
    required this.children,
    this.maxColumns = 2,
    this.spacing = 12,
    super.key,
  });

  final List<Widget> children;

  /// Teto de colunas em telas largas; no celular é sempre 1.
  final int maxColumns;

  final double spacing;

  @override
  Widget build(BuildContext context) {
    if (children.isEmpty) return const SizedBox.shrink();

    return LayoutBuilder(
      builder: (context, constraints) {
        final size = Breakpoints.fromWidth(constraints.maxWidth);
        final columns = switch (size) {
          ScreenSize.mobile => 1,
          ScreenSize.tablet => maxColumns.clamp(1, 2),
          ScreenSize.desktop => maxColumns,
        };

        if (columns == 1) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              for (final child in children) ...[
                child,
                SizedBox(height: spacing),
              ],
            ],
          );
        }

        final itemWidth =
            (constraints.maxWidth - spacing * (columns - 1)) / columns;

        return Wrap(
          spacing: spacing,
          runSpacing: spacing,
          children: [
            for (final child in children)
              SizedBox(width: itemWidth, child: child),
          ],
        );
      },
    );
  }
}
