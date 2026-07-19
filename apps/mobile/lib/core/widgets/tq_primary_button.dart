import 'package:flutter/material.dart';

import '../theme/app_theme.dart';

/// Botão primário do app: 48px, cantos de 12px e spinner no lugar do rótulo
/// enquanto carrega — como os botões neon do site.
class TqPrimaryButton extends StatelessWidget {
  const TqPrimaryButton({
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    super.key,
  });

  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    // Durante o carregamento o botão fica inerte, mas mantém a aparência de
    // ativo: desabilitá-lo faria a cor "piscar" a cada envio.
    final isEnabled = onPressed != null && !isLoading;

    return SizedBox(
      height: AppTheme.controlHeight,
      child: FilledButton(
        onPressed: isEnabled ? onPressed : null,
        child: isLoading
            ? SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: scheme.onPrimary,
                ),
              )
            : Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  if (icon != null) ...[
                    Icon(icon, size: 18),
                    const SizedBox(width: 8),
                  ],
                  Text(label),
                ],
              ),
      ),
    );
  }
}
