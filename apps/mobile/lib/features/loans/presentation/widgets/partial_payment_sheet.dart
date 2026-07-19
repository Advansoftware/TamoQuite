import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_primary_button.dart';
import '../../../../core/widgets/tq_text_field.dart';
import '../../domain/installment.dart';

/// Registra um pagamento parcial de uma parcela. Retorna o valor informado,
/// ou `null` se cancelado.
///
/// A validação de "não exceder o restante" também roda no servidor
/// (`installments.controller.ts`); aqui é só para dar retorno imediato.
Future<double?> showPartialPaymentSheet(
  BuildContext context,
  Installment installment,
) {
  return showModalBottomSheet<double>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _PartialPaymentSheet(installment: installment),
  );
}

class _PartialPaymentSheet extends StatefulWidget {
  const _PartialPaymentSheet({required this.installment});

  final Installment installment;

  @override
  State<_PartialPaymentSheet> createState() => _PartialPaymentSheetState();
}

class _PartialPaymentSheetState extends State<_PartialPaymentSheet> {
  final _amount = TextEditingController();
  String? _error;

  double get _remaining => widget.installment.remaining;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  void _submit() {
    final value = _parse(_amount.text);

    if (value <= 0) {
      setState(() => _error = 'Informe um valor maior que zero.');
      return;
    }
    // O restante é comparado em centavos: 0.1 + 0.2 em double não fecha 0.3,
    // e um pagamento que quita a parcela não pode ser recusado por isso.
    if ((value * 100).round() > (_remaining * 100).round()) {
      setState(() => _error =
          'Valor acima do restante (${Formatters.currency(_remaining)}).');
      return;
    }

    Navigator.of(context).pop(value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 8,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: theme.colorScheme.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text(
            'Pagamento parcial',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Parcela ${widget.installment.installmentNumber} · '
            'restam ${Formatters.currency(_remaining)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.brand.mutedForeground,
            ),
          ),
          const SizedBox(height: 20),

          TqTextField(
            label: 'Valor recebido',
            controller: _amount,
            hintText: 'R\$ 0,00',
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),

          if (_error != null) ...[
            const SizedBox(height: 12),
            Text(
              _error!,
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.colorScheme.error,
              ),
            ),
          ],

          const SizedBox(height: 24),
          TqPrimaryButton(label: 'Registrar', onPressed: _submit),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }

  static double _parse(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return 0;
    if (text.contains(',')) {
      return double.tryParse(text.replaceAll('.', '').replaceAll(',', '.')) ?? 0;
    }
    return double.tryParse(text) ?? 0;
  }
}
