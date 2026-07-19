import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/security/app_lock_controller.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/widgets/tq_primary_button.dart';

/// Convite para ativar o bloqueio do app, mostrado uma única vez após o
/// primeiro login em um aparelho compatível.
///
/// Marca o convite como visto independentemente da resposta — quem recusar
/// ainda pode ativar depois em "Mais".
Future<void> showAppLockSetupSheet(BuildContext context, WidgetRef ref) async {
  final controller = ref.read(appLockControllerProvider.notifier);

  await showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => const _AppLockSetupSheet(),
  );

  await controller.dismissSetupOffer();
}

class _AppLockSetupSheet extends ConsumerStatefulWidget {
  const _AppLockSetupSheet();

  @override
  ConsumerState<_AppLockSetupSheet> createState() => _AppLockSetupSheetState();
}

class _AppLockSetupSheetState extends ConsumerState<_AppLockSetupSheet> {
  bool _isEnabling = false;

  Future<void> _enable() async {
    setState(() => _isEnabling = true);
    final enabled = await ref.read(appLockControllerProvider.notifier).enable();
    if (!mounted) return;

    setState(() => _isEnabling = false);
    Navigator.of(context).pop();

    if (enabled) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Bloqueio do app ativado.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final hasBiometrics =
        ref.watch(appLockControllerProvider).value?.hasBiometrics ?? false;

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: theme.brand.neonDim,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(
                  hasBiometrics ? Icons.fingerprint : Icons.lock_outline,
                  size: 28,
                  color: theme.brand.neon,
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              hasBiometrics
                  ? 'Entrar com a digital?'
                  : 'Proteger o app com bloqueio?',
              textAlign: TextAlign.center,
              style: theme.textTheme.titleLarge,
            ),
            const SizedBox(height: 8),
            Text(
              hasBiometrics
                  ? 'Ative o bloqueio para abrir o TamoQuite com a digital ou o '
                        'bloqueio do aparelho, em vez de digitar a senha.'
                  : 'Ative o bloqueio para exigir o PIN ou padrão do aparelho '
                        'ao abrir o TamoQuite.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.brand.mutedForeground,
              ),
            ),
            const SizedBox(height: 24),
            TqPrimaryButton(
              label: 'Ativar',
              icon: hasBiometrics ? Icons.fingerprint : Icons.lock_outline,
              isLoading: _isEnabling,
              onPressed: _enable,
            ),
            const SizedBox(height: 4),
            TextButton(
              onPressed: _isEnabling ? null : () => Navigator.of(context).pop(),
              child: const Text('Agora não'),
            ),
          ],
        ),
      ),
    );
  }
}
