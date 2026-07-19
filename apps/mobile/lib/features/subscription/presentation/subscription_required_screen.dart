import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/responsive/breakpoints.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../../core/widgets/tq_logo.dart';
import '../../../core/widgets/tq_primary_button.dart';
import '../../auth/application/auth_controller.dart';

/// Tela de bloqueio por assinatura inativa.
///
/// Deliberadamente **não** oferece botão de pagamento nem link para o
/// checkout externo: um app distribuído na Play Store que direciona o usuário
/// a pagar fora do Google Play Billing costuma ser reprovado na revisão. A
/// tela apenas informa o estado da conta; quem já assinou usa "Já assinei"
/// para revalidar em `GET /api/auth/me`.
class SubscriptionRequiredScreen extends ConsumerStatefulWidget {
  const SubscriptionRequiredScreen({super.key});

  @override
  ConsumerState<SubscriptionRequiredScreen> createState() =>
      _SubscriptionRequiredScreenState();
}

class _SubscriptionRequiredScreenState
    extends ConsumerState<SubscriptionRequiredScreen> {
  bool _isRefreshing = false;

  Future<void> _refresh() async {
    setState(() => _isRefreshing = true);
    await ref.read(authControllerProvider.notifier).refreshUser();

    if (!mounted) return;
    setState(() => _isRefreshing = false);

    // Se a assinatura tiver sido reconhecida, o router já terá saído daqui.
    final user = ref.read(authControllerProvider).value;
    if (user != null && !user.hasAppAccess) {
      ScaffoldMessenger.of(context)
        ..hideCurrentSnackBar()
        ..showSnackBar(
          const SnackBar(
            content: Text('Ainda não identificamos uma assinatura ativa.'),
          ),
        );
    }
  }

  Future<void> _logout() async {
    await ref.read(authControllerProvider.notifier).logout();
    ref.read(appLockControllerProvider.notifier).relock();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final userName = ref.watch(authControllerProvider).value?.name;

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
                    Icons.workspace_premium_outlined,
                    size: 48,
                    color: theme.brand.warning,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Assinatura necessária',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.titleLarge,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    userName == null
                        ? 'Sua conta está ativa, mas é necessária uma assinatura '
                              'válida para liberar o acesso ao sistema.'
                        : 'Olá, $userName. Sua conta está ativa, mas é necessária '
                              'uma assinatura válida para liberar o acesso ao sistema.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: theme.brand.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'A assinatura é gerenciada na sua conta TamoQuite.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.brand.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 32),
                  TqPrimaryButton(
                    label: 'Já assinei — verificar novamente',
                    icon: Icons.refresh,
                    isLoading: _isRefreshing,
                    onPressed: _refresh,
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _isRefreshing ? null : _logout,
                    child: const Text('Sair da conta'),
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
