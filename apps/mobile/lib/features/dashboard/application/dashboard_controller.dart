import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/dashboard_repository.dart';
import '../domain/dashboard_summary.dart';

/// Carrega o resumo do painel.
///
/// Exposto como [AsyncNotifier] para que a tela possa recarregar (pull to
/// refresh) sem recriar o provider.
class DashboardController extends AsyncNotifier<DashboardSummary> {
  @override
  Future<DashboardSummary> build() {
    return ref.watch(dashboardRepositoryProvider).fetch();
  }

  /// Recarrega mantendo os dados atuais visíveis enquanto busca — evita a
  /// tela piscar para o estado de carregamento a cada refresh.
  Future<void> refresh() async {
    state = await AsyncValue.guard(
      () => ref.read(dashboardRepositoryProvider).fetch(),
    );
  }
}

final dashboardControllerProvider =
    AsyncNotifierProvider<DashboardController, DashboardSummary>(
      DashboardController.new,
    );
