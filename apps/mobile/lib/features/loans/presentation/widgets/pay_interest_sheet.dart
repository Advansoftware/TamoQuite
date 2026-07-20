import 'package:flutter/material.dart';

import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/money_input.dart';
import '../../../../core/widgets/tq_primary_button.dart';
import '../../../../core/widgets/tq_text_field.dart';
import '../../domain/installment.dart';

/// Resultado do pagamento de juros: o valor e se a parcela deve ser rolada
/// (empurrada um período à frente) na hora.
class PayInterestResult {
  const PayInterestResult({required this.amount, required this.rollImmediately});

  final double amount;
  final bool rollImmediately;
}

/// Registra o pagamento só dos juros de uma parcela — quando o devedor paga
/// para "segurar" a dívida sem amortizar. Opcionalmente já rola a parcela.
Future<PayInterestResult?> showPayInterestSheet(
  BuildContext context,
  Installment installment,
) {
  return showModalBottomSheet<PayInterestResult>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _PayInterestSheet(installment: installment),
  );
}

class _PayInterestSheet extends StatefulWidget {
  const _PayInterestSheet({required this.installment});

  final Installment installment;

  @override
  State<_PayInterestSheet> createState() => _PayInterestSheetState();
}

class _PayInterestSheetState extends State<_PayInterestSheet> {
  final _amount = TextEditingController();
  bool _rollImmediately = true;
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  void _submit() {
    final value = MoneyInput.parse(_amount.text);
    if (value <= 0) {
      setState(() => _error = 'Informe um valor maior que zero.');
      return;
    }
    Navigator.of(context).pop(
      PayInterestResult(amount: value, rollImmediately: _rollImmediately),
    );
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
            'Pagar juros',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Parcela ${widget.installment.installmentNumber} · '
            '${Formatters.currency(widget.installment.amount)}',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.brand.mutedForeground,
            ),
          ),
          const SizedBox(height: 20),

          TqTextField(
            label: 'Valor dos juros',
            controller: _amount,
            hintText: r'R$ 0,00',
            autofocus: true,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            onSubmitted: (_) => _submit(),
          ),
          const SizedBox(height: 8),

          SwitchListTile.adaptive(
            value: _rollImmediately,
            onChanged: (value) => setState(() => _rollImmediately = value),
            contentPadding: EdgeInsets.zero,
            dense: true,
            title: Text('Rolar a parcela', style: theme.textTheme.bodyMedium),
            subtitle: Text(
              'Empurra esta parcela e as seguintes um período à frente.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.brand.mutedForeground,
              ),
            ),
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
}
