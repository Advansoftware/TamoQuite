import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_status_badge.dart';
import '../../domain/borrower.dart';

/// Cartão de cliente na listagem.
///
/// Quem tem parcela atrasada ganha borda e avatar em vermelho — é o sinal que
/// o site usa para o usuário achar o problema sem ler a lista inteira.
class BorrowerCard extends StatelessWidget {
  const BorrowerCard({
    required this.borrower,
    required this.onTap,
    required this.onEdit,
    required this.onToggleActive,
    super.key,
  });

  final Borrower borrower;
  final VoidCallback onTap;
  final VoidCallback onEdit;

  /// Desativa um cliente ativo, reativa um desativado.
  final VoidCallback onToggleActive;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;
    final error = theme.colorScheme.error;
    final hasOverdue = borrower.hasOverdue;

    return Card(
      clipBehavior: Clip.antiAlias,
      color: hasOverdue ? error.withValues(alpha: 0.05) : null,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: hasOverdue
              ? error.withValues(alpha: 0.3)
              : theme.colorScheme.outline,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              TqInitialsAvatar(
                initials: Formatters.initials(borrower.name),
                color: hasOverdue ? error : brand.neon,
                background: hasOverdue
                    ? error.withValues(alpha: 0.2)
                    : brand.neonDim,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            borrower.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: theme.textTheme.titleSmall,
                          ),
                        ),
                        ?_badge(theme),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      borrower.phone.display,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: brand.mutedForeground,
                      ),
                    ),
                    if (borrower.notes != null) ...[
                      const SizedBox(height: 2),
                      Text(
                        borrower.notes!,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: brand.mutedForeground.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              _Action(
                icon: Icons.edit_outlined,
                tooltip: 'Editar cliente',
                onPressed: onEdit,
              ),
              _Action(
                icon: borrower.isActive
                    ? Icons.person_remove_outlined
                    : Icons.person_add_alt,
                tooltip: borrower.isActive
                    ? 'Desativar cliente'
                    : 'Reativar cliente',
                color: borrower.isActive ? null : brand.neon,
                onPressed: onToggleActive,
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// "Atrasado" tem prioridade sobre a contagem de contratos: com uma parcela
  /// vencida, o número de contratos é a informação menos urgente.
  ///
  /// O espaçamento vem junto do badge para que um cliente sem nenhum dos dois
  /// não fique com um vão sobrando depois do nome.
  Widget? _badge(ThemeData theme) {
    final badge = switch (borrower) {
      Borrower(hasOverdue: true) => TqStatusBadge(
        label: 'Atrasado',
        color: theme.colorScheme.error,
        dense: true,
      ),
      Borrower(:final loanCount) when loanCount > 0 => TqStatusBadge(
        label: Formatters.plural(loanCount, 'contrato', 'contratos'),
        color: theme.brand.neon,
        dense: true,
      ),
      _ => null,
    };

    if (badge == null) return null;
    return Padding(padding: const EdgeInsets.only(left: 6), child: badge);
  }
}

class _Action extends StatelessWidget {
  const _Action({
    required this.icon,
    required this.tooltip,
    required this.onPressed,
    this.color,
  });

  final IconData icon;
  final String tooltip;
  final VoidCallback onPressed;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onPressed,
      tooltip: tooltip,
      // 44px é o alvo de toque mínimo do app.
      constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
      iconSize: 18,
      color: color ?? Theme.of(context).brand.mutedForeground,
      icon: Icon(icon),
    );
  }
}
