import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_primary_button.dart';
import '../../../../core/widgets/tq_text_field.dart';
import '../../../borrowers/application/borrowers_controller.dart';
import '../../../borrowers/domain/borrower.dart';
import '../../application/loans_controller.dart';
import '../../domain/loan.dart';
import '../../domain/loan_math.dart';

/// Como o usuário informa o quanto vai receber.
enum _CalcMode { byRate, byTotal }

/// Cadastro de empréstimo. Retorna o id do contrato criado, ou `null` se
/// cancelado.
///
/// Cobre os campos essenciais do `CreateLoanDialog.tsx` — cliente, valor,
/// juros ou total, nº de parcelas, primeira data e frequência. As datas por
/// parcela e o modo "à vista" do site ficam para depois.
Future<String?> showCreateLoanSheet(
  BuildContext context, {
  String? fixedBorrowerId,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _CreateLoanSheet(fixedBorrowerId: fixedBorrowerId),
  );
}

class _CreateLoanSheet extends ConsumerStatefulWidget {
  const _CreateLoanSheet({this.fixedBorrowerId});

  /// Quando aberto da tela de um cliente, o cliente já vem fixado.
  final String? fixedBorrowerId;

  @override
  ConsumerState<_CreateLoanSheet> createState() => _CreateLoanSheetState();
}

class _CreateLoanSheetState extends ConsumerState<_CreateLoanSheet> {
  final _amount = TextEditingController();
  final _rate = TextEditingController();
  final _total = TextEditingController();
  final _installments = TextEditingController(text: '1');

  String? _borrowerId;
  _CalcMode _mode = _CalcMode.byRate;
  PaymentFrequency _frequency = PaymentFrequency.monthly;
  DateTime _startDate = DateTime.now();

  bool _isSaving = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _borrowerId = widget.fixedBorrowerId;
    for (final controller in [_amount, _rate, _total, _installments]) {
      controller.addListener(() => setState(() {}));
    }
  }

  @override
  void dispose() {
    _amount.dispose();
    _rate.dispose();
    _total.dispose();
    _installments.dispose();
    super.dispose();
  }

  double get _principal => _parse(_amount.text);
  int get _count {
    final value = int.tryParse(_installments.text) ?? 0;
    return value < 1 ? 0 : value;
  }

  /// Total previsto, pela mesma conta do servidor.
  double get _previewTotal {
    if (_principal <= 0 || _count <= 0) return 0;
    return switch (_mode) {
      _CalcMode.byRate => totalFromRate(_principal, _parse(_rate.text), _count),
      _CalcMode.byTotal => _parse(_total.text),
    };
  }

  double get _installmentValue =>
      _count > 0 ? _previewTotal / _count : 0;

  bool get _isValid =>
      _borrowerId != null &&
      _principal > 0 &&
      _count > 0 &&
      _previewTotal > 0;

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 5),
      helpText: 'Primeira data de vencimento',
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _submit() async {
    if (!_isValid) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    // No modo "informar total", a taxa que vai gravada é a que reproduz esse
    // total — o servidor ainda respeita o `totalAmount` que enviamos.
    final rate = switch (_mode) {
      _CalcMode.byRate => _parse(_rate.text),
      _CalcMode.byTotal => rateFromTotal(_principal, _previewTotal, _count),
    };

    try {
      final loan = await ref.read(loanActionsProvider).create(
            borrowerId: _borrowerId!,
            originalAmount: _principal,
            interestRate: rate,
            totalAmount: _previewTotal,
            installmentCount: _count,
            startDate: _startDate,
            frequency: _frequency,
          );
      if (mounted) Navigator.of(context).pop(loan.id);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _error = e.message;
      });
    }
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
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _grabber(theme),
            Text(
              'Novo empréstimo',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 20),

            if (widget.fixedBorrowerId == null) ...[
              _BorrowerField(
                borrowerId: _borrowerId,
                enabled: !_isSaving,
                onChanged: (id) => setState(() => _borrowerId = id),
              ),
              const SizedBox(height: 16),
            ],

            TqTextField(
              label: 'Valor emprestado',
              controller: _amount,
              hintText: 'R\$ 0,00',
              enabled: !_isSaving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),

            _ModeToggle(
              mode: _mode,
              enabled: !_isSaving,
              onChanged: (mode) => setState(() => _mode = mode),
            ),
            const SizedBox(height: 12),

            if (_mode == _CalcMode.byRate)
              TqTextField(
                label: 'Juros por ${_periodNoun(_frequency)} (%)',
                controller: _rate,
                hintText: '0',
                enabled: !_isSaving,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.next,
              )
            else
              TqTextField(
                label: 'Total a receber',
                controller: _total,
                hintText: 'R\$ 0,00',
                enabled: !_isSaving,
                keyboardType:
                    const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.next,
              ),
            const SizedBox(height: 16),

            TqTextField(
              label: 'Número de parcelas',
              controller: _installments,
              hintText: '1',
              enabled: !_isSaving,
              keyboardType: TextInputType.number,
              textInputAction: TextInputAction.done,
            ),
            const SizedBox(height: 16),

            _FrequencyField(
              frequency: _frequency,
              enabled: !_isSaving,
              onChanged: (value) => setState(() => _frequency = value),
            ),
            const SizedBox(height: 16),

            _DateField(
              date: _startDate,
              enabled: !_isSaving,
              onTap: _pickDate,
            ),

            const SizedBox(height: 20),
            _Preview(
              total: _previewTotal,
              installmentValue: _installmentValue,
              count: _count,
            ),

            if (_error != null) ...[
              const SizedBox(height: 16),
              Text(
                _error!,
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.error,
                ),
              ),
            ],

            const SizedBox(height: 24),
            TqPrimaryButton(
              label: 'Criar empréstimo',
              isLoading: _isSaving,
              onPressed: _isValid ? _submit : null,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed:
                  _isSaving ? null : () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _grabber(ThemeData theme) => Center(
    child: Container(
      width: 36,
      height: 4,
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: theme.colorScheme.outline,
        borderRadius: BorderRadius.circular(2),
      ),
    ),
  );

  static String _periodNoun(PaymentFrequency frequency) => switch (frequency) {
    PaymentFrequency.weekly => 'semana',
    PaymentFrequency.biweekly => 'quinzena',
    PaymentFrequency.monthly => 'mês',
  };

  /// Aceita "1.234,56" e "1234.56": vírgula é decimal em pt-BR, e o ponto de
  /// milhar é descartado.
  static double _parse(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return 0;
    if (text.contains(',')) {
      return double.tryParse(text.replaceAll('.', '').replaceAll(',', '.')) ?? 0;
    }
    return double.tryParse(text) ?? 0;
  }
}

class _BorrowerField extends ConsumerWidget {
  const _BorrowerField({
    required this.borrowerId,
    required this.enabled,
    required this.onChanged,
  });

  final String? borrowerId;
  final bool enabled;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    // Só se empresta para cliente ativo, então a lista é a de ativos.
    final borrowers =
        ref.watch(borrowersListProvider(BorrowerFilter.active)).value ??
            const <Borrower>[];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Cliente', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: borrowerId,
          isExpanded: true,
          hint: Text(
            borrowers.isEmpty
                ? 'Cadastre um cliente primeiro'
                : 'Selecione o cliente',
          ),
          onChanged: !enabled || borrowers.isEmpty
              ? null
              : (value) {
                  if (value != null) onChanged(value);
                },
          items: [
            for (final borrower in borrowers)
              DropdownMenuItem(
                value: borrower.id,
                child: Text(borrower.name, overflow: TextOverflow.ellipsis),
              ),
          ],
        ),
      ],
    );
  }
}

class _ModeToggle extends StatelessWidget {
  const _ModeToggle({
    required this.mode,
    required this.enabled,
    required this.onChanged,
  });

  final _CalcMode mode;
  final bool enabled;
  final ValueChanged<_CalcMode> onChanged;

  @override
  Widget build(BuildContext context) {
    return SegmentedButton<_CalcMode>(
      segments: const [
        ButtonSegment(value: _CalcMode.byRate, label: Text('Por juros')),
        ButtonSegment(value: _CalcMode.byTotal, label: Text('Informar total')),
      ],
      selected: {mode},
      onSelectionChanged:
          enabled ? (selection) => onChanged(selection.first) : null,
      showSelectedIcon: false,
    );
  }
}

class _FrequencyField extends StatelessWidget {
  const _FrequencyField({
    required this.frequency,
    required this.enabled,
    required this.onChanged,
  });

  final PaymentFrequency frequency;
  final bool enabled;
  final ValueChanged<PaymentFrequency> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Frequência', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        DropdownButtonFormField<PaymentFrequency>(
          initialValue: frequency,
          isExpanded: true,
          onChanged: enabled
              ? (value) {
                  if (value != null) onChanged(value);
                }
              : null,
          items: [
            for (final option in PaymentFrequency.values)
              DropdownMenuItem(value: option, child: Text(option.label)),
          ],
        ),
      ],
    );
  }
}

class _DateField extends StatelessWidget {
  const _DateField({
    required this.date,
    required this.enabled,
    required this.onTap,
  });

  final DateTime date;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Primeiro vencimento', style: theme.textTheme.titleSmall),
        const SizedBox(height: 8),
        InkWell(
          onTap: enabled ? onTap : null,
          borderRadius: BorderRadius.circular(12),
          child: InputDecorator(
            decoration: const InputDecoration(),
            child: Row(
              children: [
                Icon(
                  Icons.event_outlined,
                  size: 18,
                  color: theme.brand.mutedForeground,
                ),
                const SizedBox(width: 12),
                Text(Formatters.date(date), style: theme.textTheme.bodyMedium),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Prévia do que será gravado, com os centavos já distribuídos como as
/// parcelas de verdade.
class _Preview extends StatelessWidget {
  const _Preview({
    required this.total,
    required this.installmentValue,
    required this.count,
  });

  final double total;
  final double installmentValue;
  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    if (total <= 0 || count <= 0) {
      return const SizedBox.shrink();
    }

    final parts = splitIntoInstallments(total, count);
    final first = parts.isEmpty ? 0.0 : parts.first;
    final last = parts.isEmpty ? 0.0 : parts.last;
    // Os centavos que sobram vão nas primeiras parcelas, então elas podem
    // ficar um centavo acima das últimas — mostramos a faixa quando isso
    // acontece em vez de um valor único que não bate.
    final installmentLabel = first == last
        ? Formatters.currency(first)
        : '${Formatters.currency(last)} – ${Formatters.currency(first)}';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: brand.neonDim,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: brand.neon.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          _row(theme, 'Total a receber', Formatters.currency(total), bold: true),
          const SizedBox(height: 8),
          _row(theme, '$count ${count == 1 ? 'parcela' : 'parcelas'} de',
              installmentLabel),
        ],
      ),
    );
  }

  Widget _row(ThemeData theme, String label, String value, {bool bold = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
        Text(
          value,
          style: (bold
                  ? theme.textTheme.titleMedium
                  : theme.textTheme.bodyMedium)
              ?.copyWith(
            fontWeight: FontWeight.w700,
            color: bold ? theme.brand.neon : theme.colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}
