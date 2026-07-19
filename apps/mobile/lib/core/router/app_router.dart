import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../features/auth/application/auth_controller.dart';
import '../../features/auth/presentation/login_screen.dart';
import '../../features/dashboard/presentation/dashboard_screen.dart';
import '../../features/lock/presentation/lock_screen.dart';
import '../../features/more/presentation/more_screen.dart';
import '../../features/shell/presentation/app_shell.dart';
import '../../features/shell/presentation/coming_soon_screen.dart';
import '../../features/splash/presentation/splash_screen.dart';
import '../../features/subscription/presentation/subscription_required_screen.dart';
import '../security/app_lock_controller.dart';
import 'routes.dart';

/// Router do app.
///
/// Todo o controle de acesso vive no [GoRouter.redirect], em uma ordem que
/// espelha os gates de `apps/web/src/app/(app)/layout.tsx`:
///
///   1. sessão carregando        → splash
///   2. sem sessão               → login
///   3. bloqueio local ativo     → tela de desbloqueio
///   4. sem assinatura ativa     → tela de assinatura
///   5. liberado                 → shell com abas
///
/// Concentrar isso aqui evita que cada tela repita verificações e garante
/// que nenhum deep link pule um gate.
final routerProvider = Provider<GoRouter>((ref) {
  final refresh = _RouterRefresh(ref);
  ref.onDispose(refresh.dispose);

  return GoRouter(
    initialLocation: AppRoutes.splash,
    refreshListenable: refresh,
    routes: [
      GoRoute(path: AppRoutes.splash, builder: (_, _) => const SplashScreen()),
      GoRoute(path: AppRoutes.login, builder: (_, _) => const LoginScreen()),
      GoRoute(path: AppRoutes.lock, builder: (_, _) => const LockScreen()),
      GoRoute(
        path: AppRoutes.subscriptionRequired,
        builder: (_, _) => const SubscriptionRequiredScreen(),
      ),

      // Área autenticada: cada aba tem sua própria pilha de navegação, então
      // trocar de aba preserva o histórico da anterior.
      StatefulShellRoute.indexedStack(
        builder: (_, _, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.dashboard,
                builder: (_, _) => const DashboardScreen(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.borrowers,
                builder: (_, _) => const ComingSoonScreen(
                  title: 'Clientes',
                  icon: Icons.people_outline,
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.loans,
                builder: (_, _) => const ComingSoonScreen(
                  title: 'Empréstimos',
                  icon: Icons.description_outlined,
                ),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: AppRoutes.more,
                builder: (_, _) => const MoreScreen(),
              ),
            ],
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final lock = ref.read(appLockControllerProvider);
      final location = state.matchedLocation;

      // 1. Ainda restaurando a sessão ou lendo as preferências de bloqueio.
      if (auth.isLoading || lock.isLoading) {
        return location == AppRoutes.splash ? null : AppRoutes.splash;
      }

      final user = auth.value;

      // 2. Sem sessão.
      if (user == null) {
        return location == AppRoutes.login ? null : AppRoutes.login;
      }

      // 3. Bloqueio local pendente.
      if (lock.value?.isLocked ?? false) {
        return location == AppRoutes.lock ? null : AppRoutes.lock;
      }

      // 4. Paywall — mesma regra do SubscriptionGuard da API.
      if (!user.hasAppAccess) {
        return location == AppRoutes.subscriptionRequired
            ? null
            : AppRoutes.subscriptionRequired;
      }

      // 5. Liberado: tira o usuário das telas de entrada.
      const entryRoutes = {
        AppRoutes.splash,
        AppRoutes.login,
        AppRoutes.lock,
        AppRoutes.subscriptionRequired,
      };
      return entryRoutes.contains(location) ? AppRoutes.dashboard : null;
    },
  );
});

/// Faz o [GoRouter] reavaliar o `redirect` quando a sessão ou o bloqueio mudam.
class _RouterRefresh extends ChangeNotifier {
  _RouterRefresh(Ref ref) {
    _subscriptions = [
      ref.listen(authControllerProvider, (_, _) => notifyListeners()),
      ref.listen(appLockControllerProvider, (_, _) => notifyListeners()),
    ];
  }

  late final List<ProviderSubscription<Object?>> _subscriptions;

  @override
  void dispose() {
    for (final subscription in _subscriptions) {
      subscription.close();
    }
    super.dispose();
  }
}
