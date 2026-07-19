import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/security/app_lock_controller.dart';
import '../../../../core/theme/app_brand_colors.dart';

/// Liga/desliga o bloqueio do app.
///
/// Em aparelhos sem biometria nem PIN configurado o item aparece desativado,
/// com o motivo — melhor que oferecer um botão que falharia.
class AppLockTile extends ConsumerStatefulWidget {
  const AppLockTile({super.key});

  @override
  ConsumerState<AppLockTile> createState() => _AppLockTileState();
}

class _AppLockTileState extends ConsumerState<AppLockTile> {
  bool _isBusy = false;

  Future<void> _toggle(bool enable) async {
    setState(() => _isBusy = true);
    final controller = ref.read(appLockControllerProvider.notifier);

    if (enable) {
      final ok = await controller.enable();
      if (!ok && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Não foi possível ativar o bloqueio.'),
          ),
        );
      }
    } else {
      await controller.disable();
    }

    if (mounted) setState(() => _isBusy = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final lock = ref.watch(appLockControllerProvider).value;

    final isAvailable = lock?.isAvailable ?? false;
    final isEnabled = lock?.isEnabled ?? false;
    final hasBiometrics = lock?.hasBiometrics ?? false;

    return SwitchListTile(
      value: isEnabled,
      onChanged: isAvailable && !_isBusy ? _toggle : null,
      secondary: Icon(
        hasBiometrics ? Icons.fingerprint : Icons.lock_outline,
        color: isEnabled ? theme.brand.neon : null,
      ),
      title: Text(
        hasBiometrics ? 'Entrar com digital' : 'Bloqueio do app',
      ),
      subtitle: Text(
        isAvailable
            ? 'Exige ${hasBiometrics ? 'digital, rosto' : 'PIN'} ou o bloqueio '
                  'do aparelho ao abrir o app.'
            : 'Configure um bloqueio de tela no aparelho para usar este recurso.',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.brand.mutedForeground,
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}
