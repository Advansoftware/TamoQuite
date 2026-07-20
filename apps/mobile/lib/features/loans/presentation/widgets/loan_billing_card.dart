import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../application/loans_controller.dart';
import '../../domain/loan.dart';

/// A escolha única deste card — uma pergunta no lugar de um toggle + seletor
/// de modo, como no `LoanBillingCard` do site.
enum _BillingChoice {
  inherit('Seguir minhas configurações', 'Usa o que está nas suas Configurações.'),
  own('Enviar pelo meu WhatsApp', 'Sai do seu número conectado.'),
  global(
    'Enviar pelo número TamoQuite',
    'Sai do número da plataforma, dizendo que a cobrança é sua.',
  ),
  off(
    'Não cobrar automaticamente',
    'Nada é enviado sozinho. Você ainda pode cobrar pelo link do WhatsApp.',
  );

  const _BillingChoice(this.label, this.description);

  final String label;
  final String description;

  /// Como o site: `doNotCharge` ou modo `MANUAL` viram "não cobrar".
  static _BillingChoice from(Loan loan) {
    if (loan.doNotCharge || loan.whatsappMode == 'MANUAL') return _BillingChoice.off;
    return switch (loan.whatsappMode) {
      'OWN' => _BillingChoice.own,
      'GLOBAL' => _BillingChoice.global,
      _ => _BillingChoice.inherit,
    };
  }

  bool get _doNotCharge => this == _BillingChoice.off;

  /// `whatsappMode` a enviar; nulo herda as configurações do usuário.
  String? get _whatsappMode => switch (this) {
    _BillingChoice.own => 'OWN',
    _BillingChoice.global => 'GLOBAL',
    _ => null,
  };
}

/// Como as cobranças automáticas deste contrato são enviadas
/// (`PUT /api/loans/:id/billing`).
class LoanBillingCard extends ConsumerStatefulWidget {
  const LoanBillingCard({required this.loan, super.key});

  final Loan loan;

  @override
  ConsumerState<LoanBillingCard> createState() => _LoanBillingCardState();
}

class _LoanBillingCardState extends ConsumerState<LoanBillingCard> {
  late _BillingChoice _choice = _BillingChoice.from(widget.loan);
  bool _saving = false;

  Future<void> _select(_BillingChoice choice) async {
    if (choice == _choice || _saving) return;
    final previous = _choice;

    setState(() {
      _choice = choice;
      _saving = true;
    });

    try {
      await ref.read(loanActionsProvider).updateBilling(
        widget.loan.id,
        doNotCharge: choice._doNotCharge,
        whatsappMode: choice._whatsappMode,
      );
      _message('Cobrança deste contrato atualizada.');
    } on ApiException catch (e) {
      // O invalidate do loanDetail vai recarregar o valor real; aqui só
      // revertemos o otimismo visual e avisamos.
      if (mounted) setState(() => _choice = previous);
      _message(e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: theme.colorScheme.surfaceContainerHigh,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    Icons.notifications_outlined,
                    size: 18,
                    color: brand.mutedForeground,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Cobrança automática',
                        style: theme.textTheme.titleSmall,
                      ),
                      Text(
                        'Como as mensagens deste contrato são enviadas.',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: brand.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            for (final choice in _BillingChoice.values)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _ChoiceTile(
                  choice: choice,
                  selected: choice == _choice,
                  enabled: !_saving,
                  onTap: () => _select(choice),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _ChoiceTile extends StatelessWidget {
  const _ChoiceTile({
    required this.choice,
    required this.selected,
    required this.enabled,
    required this.onTap,
  });

  final _BillingChoice choice;
  final bool selected;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Opacity(
      opacity: enabled ? 1 : 0.6,
      child: Material(
        color: selected ? brand.neonDim : theme.colorScheme.surfaceContainerHigh,
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(12),
          child: Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: selected ? brand.neon : theme.colorScheme.outline,
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        choice.label,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: selected ? brand.neon : theme.colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        choice.description,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: brand.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                ),
                if (selected)
                  Icon(Icons.check_circle, size: 18, color: brand.neon),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
