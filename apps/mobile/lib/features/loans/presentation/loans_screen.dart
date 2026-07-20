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
import '../application/loans_controller.dart';
import '../domain/loan.dart';
import 'widgets/delete_loan_dialog.dart';
import 'widgets/loan_card.dart';
import 'widgets/loan_form_sheet.dart';

/// Lista de contratos — espelha `LoansView.tsx`.
class LoansScreen extends ConsumerStatefulWidget {
  const LoansScreen({super.key});

  @override
  ConsumerState<LoansScreen> createState() => _LoansScreenState();
}

class _LoansScreenState extends ConsumerState<LoansScreen> {
  final _search = TextEditingController();

  @override
  void initState() {
    super.initState();
    _search.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _create() async {
    final loanId = await showCreateLoanSheet(context);
    if (loanId == null || !mounted) return;

    _showMessage('Empréstimo criado.');
    // Leva direto às parcelas recém-geradas: é o que o usuário quer conferir
    // logo depois de cadastrar.
    context.push(AppRoutes.loanDetail(loanId));
  }

  Future<void> _delete(Loan loan) async {
    final confirmed = await showDeleteLoanDialog(context, loan);
    if (!confirmed) return;

    try {
      await ref.read(loanActionsProvider).remove(loan.id);
      _showMessage('Contrato excluído.');
    } on ApiException catch (e) {
      _showMessage(e.message);
    }
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final filter = ref.watch(loanFilterProvider);
    final loans = ref.watch(loansListProvider);
    final all = loans.value ?? const <Loan>[];

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(loansListProvider.future),
        child: ResponsiveBuilder(
          builder: (context, size) {
            final padding = size.isMobile ? 16.0 : 24.0;

            return ListView(
              padding: EdgeInsets.fromLTRB(padding, 16, padding, 96),
              children: [
                _Header(count: loans.value?.length),
                const SizedBox(height: 16),
                TqSearchField(
                  controller: _search,
                  hintText: 'Buscar por nome...',
                ),
                const SizedBox(height: 12),
                TqFilterTabs(
                  value: filter,
                  onChanged: (value) =>
                      ref.read(loanFilterProvider.notifier).state = value,
                  options: [
                    for (final option in LoanFilter.values)
                      TqFilterOption(
                        value: option,
                        label: option.label,
                        // Sem dados ainda, o contador some em vez de exibir 0.
                        count: loans.hasValue
                            ? all.where(option.matches).length
                            : null,
                      ),
                  ],
                ),
                const SizedBox(height: 16),
                _List(
                  loans: loans,
                  filter: filter,
                  query: _search.text,
                  onRetry: () => ref.invalidate(loansListProvider),
                  onDelete: _delete,
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
          'Empréstimos',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          count == null
              ? 'Carregando...'
              : Formatters.plural(count!, 'contrato', 'contratos'),
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
    required this.loans,
    required this.filter,
    required this.query,
    required this.onRetry,
    required this.onDelete,
  });

  final AsyncValue<List<Loan>> loans;
  final LoanFilter filter;
  final String query;
  final VoidCallback onRetry;
  final ValueChanged<Loan> onDelete;

  @override
  Widget build(BuildContext context) {
    return switch (loans) {
      AsyncError(:final error) => SizedBox(
        height: 320,
        child: TqErrorState(
          message: error is ApiException
              ? error.message
              : 'Não foi possível carregar os empréstimos.',
          onRetry: onRetry,
        ),
      ),
      AsyncData(:final value) => _buildList(context, value),
      _ => const SizedBox(height: 320, child: TqLoadingState()),
    };
  }

  Widget _buildList(BuildContext context, List<Loan> all) {
    final term = query.trim().toLowerCase();
    final filtered = all
        .where(filter.matches)
        .where((loan) => loan.borrower.name.toLowerCase().contains(term))
        .toList(growable: false);

    if (filtered.isEmpty) {
      return SizedBox(
        height: 320,
        child: TqEmptyState(
          icon: Icons.description_outlined,
          title: _emptyTitle(all.isEmpty),
          description: _emptyDescription(all.isEmpty),
        ),
      );
    }

    return TqCardGrid(
      maxColumns: 2,
      children: [
        for (final loan in filtered)
          LoanCard(
            loan: loan,
            onTap: () => context.push(AppRoutes.loanDetail(loan.id)),
            onDelete: () => onDelete(loan),
          ),
      ],
    );
  }

  String _emptyTitle(bool noneAtAll) {
    if (noneAtAll) return 'Nenhum empréstimo cadastrado';
    if (query.trim().isNotEmpty) return 'Nenhum resultado';
    return 'Nada em "${filter.label}"';
  }

  String? _emptyDescription(bool noneAtAll) {
    if (noneAtAll) {
      return 'Cadastre um contrato para acompanhar as parcelas por aqui.';
    }
    if (query.trim().isNotEmpty) return 'Tente outro nome.';
    return 'Troque de aba para ver os outros contratos.';
  }
}
