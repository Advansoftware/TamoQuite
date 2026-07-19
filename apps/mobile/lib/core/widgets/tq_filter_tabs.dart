import 'package:flutter/material.dart';

import '../theme/app_brand_colors.dart';
import '../theme/app_theme.dart';

/// Uma opção de [TqFilterTabs].
class TqFilterOption<T> {
  const TqFilterOption({required this.value, required this.label, this.count});

  final T value;
  final String label;

  /// Contador ao lado do rótulo. `null` esconde o badge — útil para uma aba
  /// cujo total ainda está carregando.
  final int? count;
}

/// Filtro em pílulas, equivalente ao `FilterTabs` do site.
///
/// Rola na horizontal porque com quatro abas e contadores ("Concluídos 12")
/// os rótulos não cabem na largura de um celular pequeno.
class TqFilterTabs<T> extends StatelessWidget {
  const TqFilterTabs({
    required this.value,
    required this.options,
    required this.onChanged,
    super.key,
  });

  final T value;
  final List<TqFilterOption<T>> options;
  final ValueChanged<T> onChanged;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          for (final option in options) ...[
            _Pill(
              option: option,
              selected: option.value == value,
              onTap: () => onChanged(option.value),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}

class _Pill<T> extends StatelessWidget {
  const _Pill({
    required this.option,
    required this.selected,
    required this.onTap,
  });

  final TqFilterOption<T> option;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;
    final foreground = selected ? brand.neon : brand.mutedForeground;

    return Material(
      color: selected ? brand.neonDim : theme.colorScheme.surfaceContainer,
      borderRadius: BorderRadius.circular(AppTheme.radius),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(AppTheme.radius),
        child: Container(
          // 44px é o alvo de toque mínimo adotado no app.
          constraints: const BoxConstraints(minHeight: 44),
          padding: const EdgeInsets.symmetric(horizontal: 14),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppTheme.radius),
            border: Border.all(
              color: selected
                  ? brand.neon.withValues(alpha: 0.3)
                  : theme.colorScheme.outline,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                option.label,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: foreground,
                  fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                ),
              ),
              if (option.count != null) ...[
                const SizedBox(width: 6),
                Text(
                  '${option.count}',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: foreground.withValues(alpha: 0.7),
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
