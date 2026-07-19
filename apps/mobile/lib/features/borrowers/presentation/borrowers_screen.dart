import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/responsive/responsive_builder.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/tq_card_grid.dart';
import '../../../core/widgets/tq_filter_tabs.dart';
import '../../../core/widgets/tq_search_field.dart';
import '../../../core/widgets/tq_state_views.dart';
import '../application/borrowers_controller.dart';
import '../domain/borrower.dart';
import 'widgets/borrower_card.dart';
import 'widgets/borrower_form_sheet.dart';

/// Lista de clientes — espelha `BorrowersView.tsx`.
class BorrowersScreen extends ConsumerStatefulWidget {
  const BorrowersScreen({super.key});

  @override
  ConsumerState<BorrowersScreen> createState() => _BorrowersScreenState();
}

class _BorrowersScreenState extends ConsumerState<BorrowersScreen> {
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    // A busca filtra uma lista já carregada, então basta redesenhar.
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final saved = await showBorrowerFormSheet(context);
    if (saved && mounted) _showMessage('Cliente cadastrado.');
  }

  Future<void> _edit(Borrower borrower) async {
    final saved = await showBorrowerFormSheet(context, borrower: borrower);
    if (saved && mounted) _showMessage('Cliente atualizado.');
  }

  Future<void> _toggleActive(Borrower borrower) async {
    if (borrower.isActive) {
      final confirmed = await _confirmDeactivate(borrower);
      if (!confirmed) return;
    }

    try {
      final actions = ref.read(borrowerActionsProvider);
      if (borrower.isActive) {
        await actions.deactivate(borrower.id);
        _showMessage(
          'Cliente desativado. Os contratos e parcelas dele saíram de tudo.',
        );
      } else {
        await actions.reactivate(borrower.id);
        _showMessage('Cliente reativado.');
      }
    } on ApiException catch (e) {
      _showMessage(e.message);
    }
  }

  Future<bool> _confirmDeactivate(Borrower borrower) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Desativar cliente'),
        // O texto insiste que nada é apagado porque a ação parece destrutiva
        // e não é: é o soft delete reversível de `borrowers.service.ts`.
        content: Text(
          '${borrower.name} some da sua lista junto com os contratos e as '
          'parcelas dele: saem do painel, dos relatórios, dos totais e do '
          'histórico de cobranças, e nada mais é cobrado.\n\n'
          'Nada é apagado — os contratos continuam na aba "Desativados", e ao '
          'reativar tudo volta como estava.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancelar'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(context).colorScheme.error,
            ),
            child: const Text('Desativar'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(borrowerFilterProvider);
    final borrowers = ref.watch(borrowersListProvider(filter));
    // Só o contador da aba: o badge de "Desativados" precisa do total mesmo
    // enquanto a aba "Ativos" está aberta.
    final inactiveCount = ref
        .watch(borrowersListProvider(BorrowerFilter.inactive))
        .valueOrNull
        ?.length;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () =>
            ref.refresh(borrowersListProvider(filter).future),
        child: ResponsiveBuilder(
          builder: (context, size) {
            final padding = size.isMobile ? 16.0 : 24.0;

            return ListView(
              padding: EdgeInsets.fromLTRB(padding, 16, padding, 96),
              children: [
                _Header(count: borrowers.valueOrNull?.length),
                const SizedBox(height: 16),
                TqSearchField(
                  controller: _search,
                  hintText: 'Buscar por nome ou WhatsApp...',
                ),
                const SizedBox(height: 12),
                TqFilterTabs(
                  value: filter,
                  onChanged: (value) =>
                      ref.read(borrowerFilterProvider.notifier).state = value,
                  options: [
                    TqFilterOption(
                      value: BorrowerFilter.active,
                      label: BorrowerFilter.active.label,
                    ),
                    TqFilterOption(
                      value: BorrowerFilter.inactive,
                      label: BorrowerFilter.inactive.label,
                      count: inactiveCount,
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                _List(
                  borrowers: borrowers,
                  query: _search.text,
                  onRetry: () => ref.invalidate(borrowersListProvider(filter)),
                  onEdit: _edit,
                  onToggleActive: _toggleActive,
                ),
              ],
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('Novo'),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.count});

  final int? count;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Clientes',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          count == null
              ? 'Carregando...'
              : '${Formatters.plural(count!, 'cliente', 'clientes')} '
                    '${count == 1 ? 'cadastrado' : 'cadastrados'}',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _List extends StatelessWidget {
  const _List({
    required this.borrowers,
    required this.query,
    required this.onRetry,
    required this.onEdit,
    required this.onToggleActive,
  });

  final AsyncValue<List<Borrower>> borrowers;
  final String query;
  final VoidCallback onRetry;
  final ValueChanged<Borrower> onEdit;
  final ValueChanged<Borrower> onToggleActive;

  @override
  Widget build(BuildContext context) {
    return switch (borrowers) {
      AsyncError(:final error) => SizedBox(
        height: 320,
        child: TqErrorState(
          message: error is ApiException
              ? error.message
              : 'Não foi possível carregar os clientes.',
          onRetry: onRetry,
        ),
      ),
      AsyncData(:final value) => _buildList(context, value),
      _ => const SizedBox(height: 320, child: TqLoadingState()),
    };
  }

  Widget _buildList(BuildContext context, List<Borrower> all) {
    final filtered = _filter(all);

    if (filtered.isEmpty) {
      return SizedBox(
        height: 320,
        child: TqEmptyState(
          icon: Icons.people_outline,
          title: query.isEmpty
              ? 'Nenhum cliente por aqui'
              : 'Nenhum resultado encontrado',
          description: query.isEmpty
              ? 'Cadastre um devedor para começar a controlar empréstimos.'
              : 'Tente outro nome ou número.',
        ),
      );
    }

    return TqCardGrid(
      maxColumns: 3,
      children: [
        for (final borrower in filtered)
          BorrowerCard(
            borrower: borrower,
            onTap: () => context.push(AppRoutes.borrowerDetail(borrower.id)),
            onEdit: () => onEdit(borrower),
            onToggleActive: () => onToggleActive(borrower),
          ),
      ],
    );
  }

  /// Busca por nome ou telefone, como no site. O telefone é comparado só por
  /// dígitos para que "11 91234" ache um número gravado como 5511912345678.
  List<Borrower> _filter(List<Borrower> all) {
    final term = query.trim().toLowerCase();
    if (term.isEmpty) return all;

    final digits = term.replaceAll(RegExp(r'\D'), '');

    return all.where((borrower) {
      if (borrower.name.toLowerCase().contains(term)) return true;
      return digits.isNotEmpty && borrower.whatsapp.contains(digits);
    }).toList(growable: false);
  }
}
