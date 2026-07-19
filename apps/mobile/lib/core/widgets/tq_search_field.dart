import 'package:flutter/material.dart';

import '../theme/app_brand_colors.dart';

/// Campo de busca das listas (Clientes, Empréstimos).
///
/// Sem label — o `hintText` já diz o que fazer, como no site. O botão de
/// limpar só aparece com texto digitado.
class TqSearchField extends StatelessWidget {
  const TqSearchField({
    required this.controller,
    required this.hintText,
    super.key,
  });

  final TextEditingController controller;
  final String hintText;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (context, value, _) {
        return TextField(
          controller: controller,
          textInputAction: TextInputAction.search,
          style: theme.textTheme.bodyMedium,
          decoration: InputDecoration(
            hintText: hintText,
            prefixIcon: Icon(
              Icons.search,
              size: 18,
              color: theme.brand.mutedForeground,
            ),
            suffixIcon: value.text.isEmpty
                ? null
                : IconButton(
                    onPressed: controller.clear,
                    tooltip: 'Limpar busca',
                    icon: Icon(
                      Icons.close,
                      size: 18,
                      color: theme.brand.mutedForeground,
                    ),
                  ),
          ),
        );
      },
    );
  }
}
