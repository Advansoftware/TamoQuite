import 'package:flutter/material.dart';

/// Pílula de status, equivalente ao `StatusBadge` do site.
///
/// Só desenha: o rótulo e a cor vêm de quem conhece o domínio
/// (ver `InstallmentStatus` e `LoanStatus`), para que a mesma regra sirva
/// parcelas e contratos sem duplicar o mapa de cores.
class TqStatusBadge extends StatelessWidget {
  const TqStatusBadge({
    required this.label,
    required this.color,
    this.dense = false,
    super.key,
  });

  final String label;
  final Color color;

  /// Versão menor, para caber ao lado do nome em cartões apertados.
  final bool dense;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      padding: EdgeInsets.symmetric(
        horizontal: dense ? 6 : 8,
        vertical: dense ? 1 : 2,
      ),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(
        label,
        style: (dense ? theme.textTheme.labelSmall : theme.textTheme.bodySmall)
            ?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

/// Avatar com as iniciais do cliente, usado nas listas e nos detalhes.
class TqInitialsAvatar extends StatelessWidget {
  const TqInitialsAvatar({
    required this.initials,
    required this.color,
    required this.background,
    this.size = 44,
    super.key,
  });

  final String initials;
  final Color color;
  final Color background;
  final double size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(size / 3.5),
      ),
      child: Text(
        initials,
        style: theme.textTheme.titleSmall?.copyWith(
          color: color,
          fontWeight: FontWeight.w700,
          fontSize: size / 3.2,
        ),
      ),
    );
  }
}
