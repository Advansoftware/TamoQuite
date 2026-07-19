import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app_lock_settings.dart';
import 'biometric_service.dart';

final biometricServiceProvider = Provider<BiometricService>((ref) {
  return BiometricService();
});

final appLockSettingsProvider = Provider<AppLockSettings>((ref) {
  return AppLockSettings();
});

/// Estado do bloqueio local do app.
class AppLockState {
  const AppLockState({
    this.isEnabled = false,
    this.isUnlocked = false,
    this.isAvailable = false,
    this.hasBiometrics = false,
    this.shouldOfferSetup = false,
  });

  /// Usuário ativou o bloqueio nas configurações.
  final bool isEnabled;

  /// Já se autenticou nesta execução do app.
  final bool isUnlocked;

  /// Aparelho suporta biometria ou PIN/padrão.
  final bool isAvailable;

  /// Há digital/rosto cadastrado (só muda o texto da interface).
  final bool hasBiometrics;

  /// Mostrar o convite de ativação (primeiro login, ainda não perguntado).
  final bool shouldOfferSetup;

  /// Precisa passar pela tela de bloqueio antes de liberar o app.
  bool get isLocked => isEnabled && !isUnlocked;

  AppLockState copyWith({
    bool? isEnabled,
    bool? isUnlocked,
    bool? isAvailable,
    bool? hasBiometrics,
    bool? shouldOfferSetup,
  }) {
    return AppLockState(
      isEnabled: isEnabled ?? this.isEnabled,
      isUnlocked: isUnlocked ?? this.isUnlocked,
      isAvailable: isAvailable ?? this.isAvailable,
      hasBiometrics: hasBiometrics ?? this.hasBiometrics,
      shouldOfferSetup: shouldOfferSetup ?? this.shouldOfferSetup,
    );
  }
}

/// Controla o bloqueio do app por biometria/credencial do aparelho.
///
/// O bloqueio guarda a **sessão já salva** — a senha do usuário nunca é
/// persistida. Falhar no desbloqueio não desloga: o usuário pode tentar de
/// novo ou sair da conta pela própria tela de bloqueio.
class AppLockController extends AsyncNotifier<AppLockState> {
  @override
  Future<AppLockState> build() async {
    final biometrics = ref.watch(biometricServiceProvider);
    final settings = ref.watch(appLockSettingsProvider);

    final available = await biometrics.isAvailable();
    final enabled = available && await settings.isEnabled();

    return AppLockState(
      isEnabled: enabled,
      isAvailable: available,
      hasBiometrics: await biometrics.hasEnrolledBiometrics(),
      // Começa travado quando o bloqueio está ligado.
      isUnlocked: !enabled,
    );
  }

  /// Abre o prompt do sistema. Retorna `true` se destravou.
  Future<bool> unlock() async {
    final current = state.value;
    if (current == null) return false;

    final ok = await ref
        .read(biometricServiceProvider)
        .authenticate(reason: 'Desbloqueie para acessar o TamoQuite');

    if (ok) state = AsyncData(current.copyWith(isUnlocked: true));
    return ok;
  }

  /// Liga o bloqueio, confirmando antes que o usuário consegue se autenticar
  /// — evita ativar um bloqueio que ele não conseguiria abrir depois.
  Future<bool> enable() async {
    final current = state.value;
    if (current == null || !current.isAvailable) return false;

    final ok = await ref
        .read(biometricServiceProvider)
        .authenticate(reason: 'Confirme para ativar o bloqueio do app');
    if (!ok) return false;

    await ref.read(appLockSettingsProvider).setEnabled(true);
    state = AsyncData(
      current.copyWith(
        isEnabled: true,
        isUnlocked: true,
        shouldOfferSetup: false,
      ),
    );
    return true;
  }

  Future<void> disable() async {
    final current = state.value;
    if (current == null) return;

    await ref.read(appLockSettingsProvider).setEnabled(false);
    state = AsyncData(current.copyWith(isEnabled: false, isUnlocked: true));
  }

  /// Após um login bem-sucedido, decide se o convite de ativação aparece.
  Future<void> maybeOfferSetup() async {
    final current = state.value;
    if (current == null || !current.isAvailable || current.isEnabled) return;

    final settings = ref.read(appLockSettingsProvider);
    if (await settings.wasPrompted()) return;

    state = AsyncData(current.copyWith(shouldOfferSetup: true));
  }

  /// Registra que o convite já foi mostrado, aceito ou não.
  Future<void> dismissSetupOffer() async {
    final current = state.value;
    if (current == null) return;

    await ref.read(appLockSettingsProvider).markPrompted();
    state = AsyncData(current.copyWith(shouldOfferSetup: false));
  }

  /// Ao sair da conta o app volta a exigir desbloqueio no próximo acesso.
  void relock() {
    final current = state.value;
    if (current == null || !current.isEnabled) return;
    state = AsyncData(current.copyWith(isUnlocked: false));
  }
}

final appLockControllerProvider =
    AsyncNotifierProvider<AppLockController, AppLockState>(
      AppLockController.new,
    );
