import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/responsive/breakpoints.dart';
import '../../../core/responsive/responsive_builder.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/tq_state_views.dart';
import '../../lock/presentation/widgets/app_lock_setup_sheet.dart';
import '../application/dashboard_controller.dart';
import '../domain/dashboard_summary.dart';
import 'widgets/installment_tile.dart';
import 'widgets/monthly_progress_card.dart';
import '../../../core/widgets/tq_stat_card.dart';

/// Painel de controle — espelha `DashboardView.tsx`.
///
/// Layout responsivo: 2 colunas de métricas no celular e 4 em telas largas;
/// as listas ficam empilhadas no celular e lado a lado a partir de tablet.
class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  @override
  void initState() {
    super.initState();
    // Convite para ativar o bloqueio do app, uma única vez, após o primeiro
    // login. Fora do build para não abrir a folha durante a construção.
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeOfferAppLock());
  }

  Future<void> _maybeOfferAppLock() async {
    final lock = ref.read(appLockControllerProvider).value;
    if (lock == null || !lock.shouldOfferSetup || !mounted) return;

    await showAppLockSetupSheet(context, ref);
  }

  @override
  Widget build(BuildContext context) {
    // Reage ao convite chegando depois do primeiro frame (login → dashboard).
    ref.listen(appLockControllerProvider, (_, next) {
      if (next.value?.shouldOfferSetup ?? false) _maybeOfferAppLock();
    });

    final dashboard = ref.watch(dashboardControllerProvider);

    return RefreshIndicator(
      onRefresh: () => ref.read(dashboardControllerProvider.notifier).refresh(),
      child: switch (dashboard) {
        AsyncData(:final value) => _DashboardContent(summary: value),
        AsyncError(:final error) => _buildError(error),
        _ => const TqLoadingState(),
      },
    );
  }

  Widget _buildError(Object error) {
    final message = error is ApiException
        ? error.message
        : 'Não foi possível carregar o painel.';

    // ListView (e não Center) para que o pull-to-refresh continue funcionando
    // mesmo com a tela em estado de erro.
    return ListView(
      children: [
        SizedBox(
          height: 400,
          child: TqErrorState(
            message: message,
            onRetry: () =>
                ref.read(dashboardControllerProvider.notifier).refresh(),
          ),
        ),
      ],
    );
  }
}

class _DashboardContent extends StatelessWidget {
  const _DashboardContent({required this.summary});

  final DashboardSummary summary;

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, size) {
        return ListView(
          padding: EdgeInsets.fromLTRB(
            size.isMobile ? 16 : 24,
            16,
            size.isMobile ? 16 : 24,
            24,
          ),
          children: [
            _Header(),
            const SizedBox(height: 20),
            _StatGrid(summary: summary, size: size),
            if (summary.totalMonthly > 0) ...[
              const SizedBox(height: 16),
              MonthlyProgressCard(
                received: summary.receivedMonthly,
                total: summary.totalMonthly,
                progress: summary.monthlyProgress,
              ),
            ],
            const SizedBox(height: 24),
            _InstallmentSections(summary: summary, size: size),
          ],
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Painel de Controle',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w700,
            fontSize: 20,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          'Visão geral dos seus repasses',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
      ],
    );
  }
}

/// Grade de métricas: `grid-cols-2 md:grid-cols-4` no site.
class _StatGrid extends StatelessWidget {
  const _StatGrid({required this.summary, required this.size});

  final DashboardSummary summary;
  final ScreenSize size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;

    final cards = [
      TqStatCard(
        label: 'A Receber (Mês)',
        value: Formatters.currency(summary.totalMonthlyPending),
        icon: Icons.account_balance_wallet_outlined,
      ),
      TqStatCard(
        label: 'Recebido (Mês)',
        value: Formatters.currency(summary.receivedMonthly),
        icon: Icons.trending_up,
        valueColor: brand.neon,
      ),
      TqStatCard(
        label: 'Inadimplentes',
        value: '${summary.overdueCount}',
        icon: Icons.warning_amber_rounded,
        iconColor: theme.colorScheme.error,
        iconBackground: theme.colorScheme.error.withValues(alpha: 0.1),
        valueColor: theme.colorScheme.error,
      ),
      TqStatCard(
        label: 'Total a Receber',
        value: Formatters.currency(summary.totalOutstanding),
        icon: Icons.attach_money,
        iconColor: theme.colorScheme.onSurface,
        iconBackground: brand.surfaceElevated,
      ),
    ];

    return GridView.count(
      crossAxisCount: size.isMobile ? 2 : 4,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      // Cards baixos e largos; no celular ficam levemente mais altos para
      // caber o valor em uma linha.
      childAspectRatio: size.isMobile ? 1.35 : 1.5,
      children: cards,
    );
  }
}

/// Listas de atrasadas e a vencer — empilhadas no celular, lado a lado
/// a partir de tablet (`md:grid-cols-2` no site).
class _InstallmentSections extends StatelessWidget {
  const _InstallmentSections({required this.summary, required this.size});

  final DashboardSummary summary;
  final ScreenSize size;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    final overdue = _Section(
      title: 'Parcelas Atrasadas',
      icon: Icons.warning_amber_rounded,
      color: theme.colorScheme.error,
      installments: summary.overdueInstallments,
    );

    final upcoming = _Section(
      title: 'Próximos Vencimentos',
      icon: Icons.event_outlined,
      installments: summary.upcomingInstallments,
    );

    if (summary.overdueInstallments.isEmpty &&
        summary.upcomingInstallments.isEmpty) {
      return const TqEmptyState(
        icon: Icons.receipt_long_outlined,
        title: 'Nenhuma parcela por perto',
        description: 'Parcelas a vencer nos próximos 15 dias aparecem aqui.',
      );
    }

    if (size.isMobile) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (summary.overdueInstallments.isNotEmpty) ...[
            overdue,
            const SizedBox(height: 24),
          ],
          if (summary.upcomingInstallments.isNotEmpty) upcoming,
        ],
      );
    }

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (summary.overdueInstallments.isNotEmpty) ...[
          Expanded(child: overdue),
          const SizedBox(width: 24),
        ],
        if (summary.upcomingInstallments.isNotEmpty) Expanded(child: upcoming),
      ],
    );
  }
}

class _Section extends StatelessWidget {
  const _Section({
    required this.title,
    required this.installments,
    this.icon,
    this.color,
  });

  final String title;
  final List<InstallmentSummary> installments;
  final IconData? icon;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TqSectionHeader(title: title, icon: icon, color: color),
        for (final installment in installments)
          InstallmentTile(installment: installment),
      ],
    );
  }
}
