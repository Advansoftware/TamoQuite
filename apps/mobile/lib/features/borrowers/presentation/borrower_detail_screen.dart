import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/responsive/responsive_builder.dart';
import '../../../core/router/routes.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/tq_card_grid.dart';
import '../../../core/widgets/tq_state_views.dart';
import '../../../core/widgets/tq_status_badge.dart';
import '../../../core/widgets/tq_stat_card.dart';
import '../../loans/presentation/widgets/loan_card.dart';
import '../application/borrowers_controller.dart';
import '../domain/borrower.dart';
import '../domain/borrower_detail.dart';
import 'widgets/borrower_form_sheet.dart';

/// Detalhe do cliente — espelha `BorrowerDetailView.tsx`.
///
/// É a única tela que alcança os contratos de um cliente desativado: a aba
/// Empréstimos filtra por cliente ativo.
class BorrowerDetailScreen extends ConsumerWidget {
  const BorrowerDetailScreen({required this.borrowerId, super.key});

  final String borrowerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final detail = ref.watch(borrowerDetailProvider(borrowerId));

    return Scaffold(
      appBar: AppBar(
        title: Text(detail.valueOrNull?.borrower.name ?? 'Cliente'),
        actions: [
          if (detail.hasValue)
            IconButton(
              tooltip: 'Editar cliente',
              onPressed: () =>
                  showBorrowerFormSheet(context, borrower: detail.value!.borrower),
              icon: const Icon(Icons.edit_outlined),
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(borrowerDetailProvider(borrowerId).future),
        child: switch (detail) {
          AsyncData(:final value) => _Content(detail: value),
          AsyncError(:final error) => ListView(
            children: [
              SizedBox(
                height: 400,
                child: TqErrorState(
                  message: error is ApiException
                      ? error.message
                      : 'Não foi possível carregar o cliente.',
                  onRetry: () =>
                      ref.invalidate(borrowerDetailProvider(borrowerId)),
                ),
              ),
            ],
          ),
          _ => const TqLoadingState(),
        },
      ),
    );
  }
}

class _Content extends StatelessWidget {
  const _Content({required this.detail});

  final BorrowerDetail detail;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final borrower = detail.borrower;

    return ResponsiveBuilder(
      builder: (context, size) {
        final padding = size.isMobile ? 16.0 : 24.0;

        return ListView(
          padding: EdgeInsets.fromLTRB(padding, 16, padding, 32),
          children: [
            if (!borrower.isActive) ...[
              const _InactiveBanner(),
              const SizedBox(height: 16),
            ],

            _IdentityCard(borrower: borrower),
            const SizedBox(height: 20),

            _Summary(detail: detail, isMobile: size.isMobile),
            const SizedBox(height: 24),

            TqSectionHeader(
              title: 'Contratos',
              icon: Icons.description_outlined,
              color: theme.brand.mutedForeground,
            ),

            if (detail.loans.isEmpty)
              const TqEmptyState(
                icon: Icons.description_outlined,
                title: 'Nenhum contrato',
                description: 'Os empréstimos deste cliente aparecem aqui.',
              )
            else
              TqCardGrid(
                maxColumns: 2,
                children: [
                  for (final loan in detail.loans)
                    LoanCard(
                      loan: loan,
                      showBorrower: false,
                      onTap: () => context.push(AppRoutes.loanDetail(loan.id)),
                    ),
                ],
              ),
          ],
        );
      },
    );
  }
}

/// Deixa explícito por que este cliente não aparece nas listas — e que dá
/// para desfazer.
class _InactiveBanner extends StatelessWidget {
  const _InactiveBanner();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final warning = theme.brand.warning;

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: warning.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: warning.withValues(alpha: 0.2)),
      ),
      child: Row(
        children: [
          Icon(Icons.pause_circle_outline, size: 18, color: warning),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Cliente desativado. Os contratos abaixo estão fora do painel, '
              'dos totais e das cobranças até você reativá-lo.',
              style: theme.textTheme.bodySmall?.copyWith(color: warning),
            ),
          ),
        ],
      ),
    );
  }
}

class _IdentityCard extends StatelessWidget {
  const _IdentityCard({required this.borrower});

  final Borrower borrower;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            TqInitialsAvatar(
              initials: Formatters.initials(borrower.name),
              color: brand.neon,
              background: brand.neonDim,
              size: 52,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(borrower.name, style: theme.textTheme.titleMedium),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(
                        Icons.phone_outlined,
                        size: 13,
                        color: brand.mutedForeground,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        borrower.phone.display,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: brand.mutedForeground,
                        ),
                      ),
                    ],
                  ),
                  if (borrower.notes != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      borrower.notes!,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: brand.mutedForeground,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Summary extends StatelessWidget {
  const _Summary({required this.detail, required this.isMobile});

  final BorrowerDetail detail;
  final bool isMobile;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GridView.count(
      crossAxisCount: isMobile ? 2 : 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: isMobile ? 1.35 : 1.5,
      children: [
        TqStatCard(
          label: 'Emprestado',
          value: Formatters.currency(detail.totalLent),
          icon: Icons.north_east,
        ),
        TqStatCard(
          label: 'Recebido',
          value: Formatters.currency(detail.totalPaid),
          icon: Icons.trending_up,
          valueColor: theme.brand.neon,
        ),
        TqStatCard(
          label: 'Em aberto',
          value: Formatters.currency(detail.outstanding),
          icon: Icons.account_balance_wallet_outlined,
        ),
        TqStatCard(
          label: 'Parcelas atrasadas',
          value: '${detail.overdueCount}',
          icon: Icons.warning_amber_rounded,
          iconColor: theme.colorScheme.error,
          iconBackground: theme.colorScheme.error.withValues(alpha: 0.1),
          valueColor: detail.overdueCount > 0
              ? theme.colorScheme.error
              : null,
        ),
      ],
    );
  }
}
