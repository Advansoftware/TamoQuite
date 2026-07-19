import 'package:flutter/material.dart';

import '../theme/app_brand_colors.dart';

/// Campo de texto do app: label acima + campo de 48px, como no site
/// (`text-sm font-medium` + `h-12 px-4 rounded-xl`).
class TqTextField extends StatelessWidget {
  const TqTextField({
    required this.label,
    required this.controller,
    this.hintText,
    this.keyboardType,
    this.textInputAction,
    this.autofillHints,
    this.obscureText = false,
    this.enabled = true,
    this.autofocus = false,
    this.suffix,
    this.trailingLabel,
    this.onSubmitted,
    super.key,
  });

  final String label;
  final TextEditingController controller;
  final String? hintText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final Iterable<String>? autofillHints;
  final bool obscureText;
  final bool enabled;
  final bool autofocus;
  final Widget? suffix;

  /// Ação alinhada à direita do label (ex.: "Esqueci minha senha").
  final Widget? trailingLabel;

  final ValueChanged<String>? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: theme.textTheme.titleSmall),
            ?trailingLabel,
          ],
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          autofillHints: autofillHints,
          obscureText: obscureText,
          enabled: enabled,
          autofocus: autofocus,
          onSubmitted: onSubmitted,
          style: theme.textTheme.bodyMedium,
          decoration: InputDecoration(
            hintText: hintText,
            suffixIcon: suffix,
          ),
        ),
      ],
    );
  }
}

/// Botão "olho" que alterna a visibilidade da senha.
class PasswordVisibilityToggle extends StatelessWidget {
  const PasswordVisibilityToggle({
    required this.isVisible,
    required this.onToggle,
    super.key,
  });

  final bool isVisible;
  final VoidCallback? onToggle;

  @override
  Widget build(BuildContext context) {
    return IconButton(
      onPressed: onToggle,
      // Ícone não é foco de teclado — o campo já foi lido pelo leitor de tela.
      focusNode: FocusNode(skipTraversal: true),
      tooltip: isVisible ? 'Ocultar senha' : 'Mostrar senha',
      icon: Icon(
        isVisible ? Icons.visibility_off_outlined : Icons.visibility_outlined,
        size: 20,
        color: Theme.of(context).brand.mutedForeground,
      ),
    );
  }
}
