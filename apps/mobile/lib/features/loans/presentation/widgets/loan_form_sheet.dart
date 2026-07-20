import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/utils/money_input.dart';
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
Future<String?> showCreateLoanSheet(
  BuildContext context, {
  String? fixedBorrowerId,
}) {
  return showModalBottomSheet<String>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _LoanFormSheet(fixedBorrowerId: fixedBorrowerId),
  );
}

/// Correção de um contrato existente (`PATCH /loans/:id`). Retorna `true` se
/// algo foi salvo.
Future<bool> showEditLoanSheet(BuildContext context, Loan loan) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _LoanFormSheet(existing: loan),
  );
  return saved ?? false;
}

/// Formulário compartilhado por cadastro e correção.
///
/// A correção manda só o que mudou: alterar o valor ou o nº de parcelas
/// reconstrói o parcelamento (o servidor bloqueia se algo já foi pago), mexer
/// só nas datas é sempre permitido, e trocar de cliente nunca toca no
/// cronograma (ver `loans.service.ts#update`). Por isso o formulário compara
/// cada campo com o estado inicial e agrupa a diferença.
class _LoanFormSheet extends ConsumerStatefulWidget {
  const _LoanFormSheet({this.fixedBorrowerId, this.existing});

  final String? fixedBorrowerId;

  /// `null` cadastra; preenchido corrige.
  final Loan? existing;

  @override
  ConsumerState<_LoanFormSheet> createState() => _LoanFormSheetState();
}

class _LoanFormSheetState extends ConsumerState<_LoanFormSheet> {
  final _amount = TextEditingController();
  final _rate = TextEditingController();
  final _total = TextEditingController();
  final _installments = TextEditingController(text: '1');

  String? _borrowerId;
  _CalcMode _mode = _CalcMode.byRate;
  bool _singlePayment = false;
  PaymentFrequency _frequency = PaymentFrequency.monthly;
  DateTime _startDate = DateTime.now();

  /// Datas que o usuário ajustou por cima do cronograma automático, por índice.
  final Map<int, DateTime> _dueOverrides = {};
  bool _showDates = false;

  bool _isSaving = false;
  String? _error;

  // Estado inicial, para a correção mandar só o que mudou.
  late final _InitialState _initial;

  bool get _isEditing => widget.existing != null;

  @override
  void initState() {
    super.initState();
    final loan = widget.existing;

    if (loan != null) {
      _borrowerId = loan.borrower.id;
      _frequency = loan.frequency;
      _startDate = loan.startDate;
      _singlePayment = loan.installmentCount == 1;
      _amount.text = MoneyInput.editable(loan.originalAmount);
      _rate.text = MoneyInput.editable(loan.interestRate);
      _total.text = MoneyInput.editable(loan.totalAmount);
      _installments.text = '${loan.installmentCount}';
    } else {
      _borrowerId = widget.fixedBorrowerId;
    }

    _initial = _InitialState(
      borrowerId: _borrowerId,
      principal: _principal,
      rate: MoneyInput.parse(_rate.text),
      total: _previewTotal,
      count: _count,
      startDate: _startDate,
      frequency: _frequency,
    );

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

  double get _principal => MoneyInput.parse(_amount.text);

  int get _count {
    if (_singlePayment) return 1;
    final value = int.tryParse(_installments.text) ?? 0;
    return value < 1 ? 0 : value;
  }

  double get _previewTotal {
    if (_principal <= 0 || _count <= 0) return 0;
    return switch (_mode) {
      _CalcMode.byRate => totalFromRate(_principal, MoneyInput.parse(_rate.text), _count),
      _CalcMode.byTotal => MoneyInput.parse(_total.text),
    };
  }

  /// Cronograma exibido: o automático com os ajustes do usuário por cima.
  List<DateTime> get _schedule {
    final base = buildSchedule(_startDate, _frequency.wireValue, _count);
    return [
      for (var i = 0; i < base.length; i++) _dueOverrides[i] ?? base[i],
    ];
  }

  bool get _isValid =>
      _borrowerId != null && _principal > 0 && _count > 0 && _previewTotal > 0;

  Future<void> _pickStartDate() async {
    final picked = await _pickDate(_startDate);
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<DateTime?> _pickDate(DateTime initial) {
    final now = DateTime.now();
    return showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(now.year - 1),
      lastDate: DateTime(now.year + 6),
    );
  }

  Future<void> _submit() async {
    if (!_isValid) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      if (_isEditing) {
        await _submitEdit();
        if (mounted) Navigator.of(context).pop(true);
      } else {
        final id = await _submitCreate();
        if (mounted) Navigator.of(context).pop(id);
      }
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _isSaving = false;
        _error = e.message;
      });
    }
  }

  Future<String> _submitCreate() async {
    final loan = await ref.read(loanActionsProvider).create(
      borrowerId: _borrowerId!,
      originalAmount: _principal,
      interestRate: _rateToSend,
      totalAmount: _previewTotal,
      installmentCount: _count,
      startDate: _startDate,
      frequency: _frequency,
      dueDates: _dueOverrides.isEmpty ? null : _schedule,
    );
    return loan.id;
  }

  Future<void> _submitEdit() async {
    final moneyChanged = _principal != _initial.principal ||
        MoneyInput.parse(_rate.text) != _initial.rate ||
        _count != _initial.count ||
        (_mode == _CalcMode.byTotal && _previewTotal != _initial.total);
    final datesChanged = _startDate != _initial.startDate ||
        _frequency != _initial.frequency ||
        _dueOverrides.isNotEmpty;
    final borrowerChanged = _borrowerId != _initial.borrowerId;

    await ref.read(loanActionsProvider).update(
      widget.existing!.id,
      borrowerId: borrowerChanged ? _borrowerId : null,
      // O grupo de dinheiro viaja junto só quando mudou — assim corrigir só o
      // cliente de um contrato com parcelas pagas não esbarra no bloqueio.
      originalAmount: moneyChanged ? _principal : null,
      interestRate: moneyChanged ? _rateToSend : null,
      totalAmount: moneyChanged ? _previewTotal : null,
      installmentCount: moneyChanged ? _count : null,
      startDate: datesChanged ? _startDate : null,
      frequency: datesChanged ? _frequency : null,
      dueDates: _dueOverrides.isEmpty ? null : _schedule,
    );
  }

  /// No modo "informar total", grava a taxa que reproduz esse total.
  double get _rateToSend => switch (_mode) {
    _CalcMode.byRate => MoneyInput.parse(_rate.text),
    _CalcMode.byTotal => rateFromTotal(_principal, _previewTotal, _count),
  };

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
              _isEditing ? 'Corrigir contrato' : 'Novo empréstimo',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            if (_isEditing) ...[
              const SizedBox(height: 4),
              Text(
                'Ajuste o que foi digitado errado. Alterar valores refaz as '
                'parcelas e só é possível enquanto nada foi pago.',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.brand.mutedForeground,
                ),
              ),
            ],
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
              hintText: r'R$ 0,00',
              enabled: !_isSaving,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 12),

            _SinglePaymentToggle(
              value: _singlePayment,
              enabled: !_isSaving,
              onChanged: (value) => setState(() {
                _singlePayment = value;
                // Trocar de modo invalida qualquer ajuste manual de datas.
                _dueOverrides.clear();
              }),
            ),
            const SizedBox(height: 12),

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
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.next,
              )
            else
              TqTextField(
                label: 'Total a receber',
                controller: _total,
                hintText: r'R$ 0,00',
                enabled: !_isSaving,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                textInputAction: TextInputAction.next,
              ),
            const SizedBox(height: 16),

            if (!_singlePayment) ...[
              TqTextField(
                label: 'Número de parcelas',
                controller: _installments,
                hintText: '1',
                enabled: !_isSaving,
                keyboardType: TextInputType.number,
                textInputAction: TextInputAction.done,
              ),
              const SizedBox(height: 16),
            ],

            _FrequencyField(
              frequency: _frequency,
              enabled: !_isSaving && !_singlePayment,
              onChanged: (value) => setState(() {
                _frequency = value;
                _dueOverrides.clear();
              }),
            ),
            const SizedBox(height: 16),

            _DateField(
              label: _singlePayment ? 'Vencimento' : 'Primeiro vencimento',
              date: _startDate,
              enabled: !_isSaving,
              onTap: _pickStartDate,
            ),

            if (!_singlePayment && _count > 1) ...[
              const SizedBox(height: 8),
              _DatesToggle(
                expanded: _showDates,
                adjustedCount: _dueOverrides.length,
                onTap: () => setState(() => _showDates = !_showDates),
              ),
              if (_showDates) _DatesEditor(
                schedule: _schedule,
                onEdit: _isSaving ? null : _editDueDate,
              ),
            ],

            const SizedBox(height: 20),
            _Preview(total: _previewTotal, count: _count),

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
              label: _isEditing ? 'Salvar correção' : 'Criar empréstimo',
              isLoading: _isSaving,
              onPressed: _isValid ? _submit : null,
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _isSaving ? null : () => Navigator.of(context).pop(),
              child: const Text('Cancelar'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _editDueDate(int index) async {
    final picked = await _pickDate(_schedule[index]);
    if (picked != null) setState(() => _dueOverrides[index] = picked);
  }

  static String _periodNoun(PaymentFrequency frequency) => switch (frequency) {
    PaymentFrequency.weekly => 'semana',
    PaymentFrequency.biweekly => 'quinzena',
    PaymentFrequency.monthly => 'mês',
  };
}

/// Snapshot dos valores no momento em que a folha abriu.
class _InitialState {
  const _InitialState({
    required this.borrowerId,
    required this.principal,
    required this.rate,
    required this.total,
    required this.count,
    required this.startDate,
    required this.frequency,
  });

  final String? borrowerId;
  final double principal;
  final double rate;
  final double total;
  final int count;
  final DateTime startDate;
  final PaymentFrequency frequency;
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

class _SinglePaymentToggle extends StatelessWidget {
  const _SinglePaymentToggle({
    required this.value,
    required this.enabled,
    required this.onChanged,
  });

  final bool value;
  final bool enabled;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return SwitchListTile.adaptive(
      value: value,
      onChanged: enabled ? onChanged : null,
      contentPadding: EdgeInsets.zero,
      dense: true,
      title: Text('Pagamento único (à vista)', style: theme.textTheme.bodyMedium),
      subtitle: Text(
        'Uma só parcela, sem parcelamento.',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.brand.mutedForeground,
        ),
      ),
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
    required this.label,
    required this.date,
    required this.enabled,
    required this.onTap,
  });

  final String label;
  final DateTime date;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: theme.textTheme.titleSmall),
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

class _DatesToggle extends StatelessWidget {
  const _DatesToggle({
    required this.expanded,
    required this.adjustedCount,
    required this.onTap,
  });

  final bool expanded;
  final int adjustedCount;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Row(
          children: [
            Icon(
              expanded ? Icons.expand_less : Icons.expand_more,
              size: 18,
              color: theme.brand.neon,
            ),
            const SizedBox(width: 8),
            Text(
              'Ajustar vencimentos',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.brand.neon,
                fontWeight: FontWeight.w600,
              ),
            ),
            if (adjustedCount > 0) ...[
              const SizedBox(width: 6),
              Text(
                '($adjustedCount ajustada${adjustedCount == 1 ? '' : 's'})',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.brand.mutedForeground,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _DatesEditor extends StatelessWidget {
  const _DatesEditor({required this.schedule, required this.onEdit});

  final List<DateTime> schedule;
  final ValueChanged<int>? onEdit;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      children: [
        for (var i = 0; i < schedule.length; i++)
          Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                SizedBox(
                  width: 84,
                  child: Text(
                    'Parcela ${i + 1}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.brand.mutedForeground,
                    ),
                  ),
                ),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: onEdit == null ? null : () => onEdit!(i),
                    icon: const Icon(Icons.event_outlined, size: 16),
                    label: Text(Formatters.date(schedule[i])),
                    style: OutlinedButton.styleFrom(
                      alignment: Alignment.centerLeft,
                      foregroundColor: theme.colorScheme.onSurface,
                    ),
                  ),
                ),
              ],
            ),
          ),
      ],
    );
  }
}

class _Preview extends StatelessWidget {
  const _Preview({required this.total, required this.count});

  final double total;
  final int count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    if (total <= 0 || count <= 0) return const SizedBox.shrink();

    final parts = splitIntoInstallments(total, count);
    final first = parts.isEmpty ? 0.0 : parts.first;
    final last = parts.isEmpty ? 0.0 : parts.last;
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
          _row(
            theme,
            count == 1 ? 'Parcela única de' : '$count parcelas de',
            installmentLabel,
          ),
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
          style: (bold ? theme.textTheme.titleMedium : theme.textTheme.bodyMedium)
              ?.copyWith(
            fontWeight: FontWeight.w700,
            color: bold ? theme.brand.neon : theme.colorScheme.onSurface,
          ),
        ),
      ],
    );
  }
}
