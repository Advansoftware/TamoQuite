import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/widgets/tq_phone_field.dart';
import '../../../../core/widgets/tq_primary_button.dart';
import '../../../../core/widgets/tq_text_field.dart';
import '../../application/borrowers_controller.dart';
import '../../domain/borrower.dart';

/// Cadastro e edição de cliente.
///
/// Uma folha em vez de um diálogo: o formulário tem três campos e um teclado
/// aberto quase o tempo todo, e a folha acompanha a altura do teclado sem
/// espremer o conteúdo.
Future<bool> showBorrowerFormSheet(
  BuildContext context, {
  Borrower? borrower,
}) async {
  final saved = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _BorrowerFormSheet(borrower: borrower),
  );
  return saved ?? false;
}

class _BorrowerFormSheet extends ConsumerStatefulWidget {
  const _BorrowerFormSheet({this.borrower});

  /// `null` cadastra; preenchido edita.
  final Borrower? borrower;

  @override
  ConsumerState<_BorrowerFormSheet> createState() => _BorrowerFormSheetState();
}

class _BorrowerFormSheetState extends ConsumerState<_BorrowerFormSheet> {
  late final TextEditingController _name;
  late final TextEditingController _notes;
  late String _whatsapp;

  bool _isSaving = false;
  String? _error;

  bool get _isEditing => widget.borrower != null;

  @override
  void initState() {
    super.initState();
    final borrower = widget.borrower;
    _name = TextEditingController(text: borrower?.name ?? '');
    _notes = TextEditingController(text: borrower?.notes ?? '');
    _whatsapp = borrower?.whatsapp ?? '';
  }

  @override
  void dispose() {
    _name.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final name = _name.text.trim();
    if (name.isEmpty || _whatsapp.isEmpty) return;

    setState(() {
      _isSaving = true;
      _error = null;
    });

    try {
      final actions = ref.read(borrowerActionsProvider);
      final borrower = widget.borrower;

      if (borrower == null) {
        await actions.create(
          name: name,
          whatsapp: _whatsapp,
          notes: _notes.text.trim(),
        );
      } else {
        await actions.update(
          borrower.id,
          name: name,
          whatsapp: _whatsapp,
          notes: _notes.text.trim(),
        );
      }

      if (mounted) Navigator.of(context).pop(true);
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
      // Empurra a folha acima do teclado.
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
              _isEditing ? 'Editar cliente' : 'Novo cliente',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w700,
                fontSize: 18,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              _isEditing
                  ? 'Atualize os dados do devedor.'
                  : 'Cadastre um devedor para controlar empréstimos.',
              style: theme.textTheme.bodySmall?.copyWith(
                color: theme.brand.mutedForeground,
              ),
            ),
            const SizedBox(height: 20),

            TqTextField(
              label: 'Nome completo',
              controller: _name,
              hintText: 'Ex: João Silva',
              enabled: !_isSaving,
              autofocus: !_isEditing,
              textInputAction: TextInputAction.next,
            ),
            const SizedBox(height: 16),

            TqPhoneField(
              label: 'WhatsApp',
              initialValue: _whatsapp,
              enabled: !_isSaving,
              onChanged: (value) => setState(() => _whatsapp = value),
            ),
            const SizedBox(height: 16),

            TqTextField(
              label: 'Observação',
              controller: _notes,
              hintText: 'Contexto do empréstimo, relação, etc.',
              enabled: !_isSaving,
              textInputAction: TextInputAction.done,
              onSubmitted: (_) => _submit(),
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
            // O nome vem de um controller, então sem escutá-lo o botão só
            // habilitaria no próximo rebuild vindo de outro campo. Nome e
            // WhatsApp são obrigatórios, como no site.
            AnimatedBuilder(
              animation: _name,
              builder: (context, _) => TqPrimaryButton(
                label: _isEditing ? 'Salvar' : 'Cadastrar',
                isLoading: _isSaving,
                onPressed: _name.text.trim().isEmpty || _whatsapp.isEmpty
                    ? null
                    : _submit,
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: _isSaving ? null : () => Navigator.of(context).pop(false),
              child: const Text('Cancelar'),
            ),
          ],
        ),
      ),
    );
  }
}
