import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers/core_providers.dart';
import '../data/auth_repository.dart';
import '../domain/user.dart';

final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository(
    client: ref.watch(apiClientProvider),
    tokenStorage: ref.watch(tokenStorageProvider),
  );
});

/// Estado da sessão do app.
///
/// `AsyncLoading` → ainda restaurando a sessão salva (tela de splash);
/// `AsyncData(null)` → sem sessão (login);
/// `AsyncData(user)` → autenticado — o acesso ao app depende ainda de
/// [User.hasAppAccess].
///
/// Erros de login **não** são guardados aqui: eles pertencem ao formulário,
/// não à sessão. Ver `LoginController`.
class AuthController extends AsyncNotifier<User?> {
  @override
  Future<User?> build() async {
    final client = ref.watch(apiClientProvider);

    // O paywall e a expiração de sessão podem ser disparados por qualquer
    // requisição; refletir isso na sessão mantém o router sempre coerente.
    client.onUnauthorized = _handleUnauthorized;
    client.onSubscriptionInactive = _handleSubscriptionInactive;
    ref.onDispose(() {
      client.onUnauthorized = null;
      client.onSubscriptionInactive = null;
    });

    return _restoreSession();
  }

  Future<User?> _restoreSession() async {
    final repository = ref.read(authRepositoryProvider);
    if (!await repository.hasStoredSession()) return null;

    try {
      // Revalida no servidor: o token pode estar válido mas a assinatura
      // ter mudado desde o último uso.
      return await repository.me();
    } catch (_) {
      // Token inválido/expirado, ou API indisponível. Em ambos os casos
      // começamos deslogados; a mensagem aparece ao tentar entrar.
      await repository.logout();
      return null;
    }
  }

  /// Autentica e passa a sessão para o estado. Propaga [ApiException] para
  /// que a tela de login mostre a mensagem — por isso não usa `AsyncValue.guard`.
  Future<void> login({required String email, required String password}) async {
    final user = await ref
        .read(authRepositoryProvider)
        .login(email: email, password: password);
    state = AsyncData(user);
  }

  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  /// Rebusca `/api/auth/me` — usado pela tela de assinatura, depois que o
  /// usuário assina pelo site e volta ao app.
  Future<void> refreshUser() async {
    final repository = ref.read(authRepositoryProvider);
    state = await AsyncValue.guard(repository.me);
    if (state.hasError) {
      await repository.logout();
      state = const AsyncData(null);
    }
  }

  void _handleUnauthorized() {
    ref.read(authRepositoryProvider).logout();
    state = const AsyncData(null);
  }

  void _handleSubscriptionInactive() {
    final user = state.value;
    if (user == null) return;
    // Marca inativo localmente para cair na tela de assinatura de imediato,
    // sem esperar o próximo /me (mesmo comportamento do web).
    state = AsyncData(user.copyWith(subscriptionStatus: 'inactive'));
  }
}

final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(
  AuthController.new,
);
