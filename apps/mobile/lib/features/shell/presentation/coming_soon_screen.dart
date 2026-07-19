import 'package:flutter/material.dart';

import '../../../core/widgets/tq_state_views.dart';

/// Placeholder das abas cujas telas ainda não foram portadas do site
/// (Clientes e Empréstimos). Mantém a navegação completa desde a primeira
/// versão sem simular funcionalidade que não existe.
class ComingSoonScreen extends StatelessWidget {
  const ComingSoonScreen({
    required this.title,
    required this.icon,
    super.key,
  });

  final String title;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return TqEmptyState(
      icon: icon,
      title: title,
      description: 'Esta seção chega em uma próxima atualização do app. '
          'Por enquanto ela continua disponível no site.',
    );
  }
}
