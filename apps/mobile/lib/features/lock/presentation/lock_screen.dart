import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/responsive/breakpoints.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../../core/widgets/tq_logo.dart';
import '../../../core/widgets/tq_primary_button.dart';
import '../../auth/application/auth_controller.dart';

/// Tela de desbloqueio, mostrada quando o usuário ativou o bloqueio do app.
///
/// Protege a sessão já salva no aparelho: nenhuma senha é digitada aqui.
/// Se a biometria falhar repetidamente, o usuário ainda pode sair da conta e
/// entrar de novo com email e senha.
class LockScreen extends ConsumerStatefulWidget {
  const LockScreen({super.key});

  @override
  ConsumerState<LockScreen> createState() => _LockScreenState();
}

class _LockScreenState extends ConsumerState<LockScreen> {
  bool _isAuthenticating = false;

  @override
  void initState() {
    super.initState();
    // Abre o prompt do sistema assim que a tela aparece — o usuário não
    // deveria precisar de um toque extra no caminho feliz.
    WidgetsBinding.instance.addPostFrameCallback((_) => _unlock());
  }

  Future<void> _unlock() async {
    if (_isAuthenticating) return;
    setState(() => _isAuthenticating = true);

    await ref.read(appLockControllerProvider.notifier).unlock();

    // Sucesso: o router redireciona e esta tela sai de cena.
    if (mounted) setState(() => _isAuthenticating = false);
  }

  Future<void> _logout() async {
    await ref.read(authControllerProvider.notifier).logout();
    ref.read(appLockControllerProvider.notifier).relock();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lock = ref.watch(appLockControllerProvider).value;
    final usesBiometrics = lock?.hasBiometrics ?? false;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: ConstrainedBox(
              constraints: const BoxConstraints(
                maxWidth: Breakpoints.maxFormWidth,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const TqLogoHeader(),
                  const SizedBox(height: 40),
                  Icon(
                    usesBiometrics ? Icons.fingerprint : Icons.lock_outline,
                    size: 48,
                    color: theme.brand.neon,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'App bloqueado',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    usesBiometrics
                        ? 'Use sua digital ou o bloqueio do aparelho para continuar.'
                        : 'Use o bloqueio do aparelho para continuar.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.brand.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 32),
                  TqPrimaryButton(
                    label: 'Desbloquear',
                    icon: usesBiometrics ? Icons.fingerprint : Icons.lock_open,
                    isLoading: _isAuthenticating,
                    onPressed: _unlock,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _isAuthenticating ? null : _logout,
                    child: const Text('Entrar com outra conta'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
