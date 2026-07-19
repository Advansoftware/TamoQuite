import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/responsive/responsive_builder.dart';
import '../../../core/security/app_lock_controller.dart';
import '../../../core/theme/app_brand_colors.dart';
import '../../auth/application/auth_controller.dart';
import 'widgets/app_lock_tile.dart';

/// Aba "Mais" — no site estes itens ficam no menu do cabeçalho
/// (Relatórios, Cobranças, Configurações).
///
/// Nesta versão traz a conta, o bloqueio do app e o logout; as demais seções
/// aparecem como "em breve" para não prometer navegação que ainda não existe.
class MoreScreen extends ConsumerWidget {
  const MoreScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authControllerProvider).value;

    return ResponsiveBuilder(
      builder: (context, size) {
        return ListView(
          padding: EdgeInsets.symmetric(
            horizontal: size.isMobile ? 16 : 24,
            vertical: 16,
          ),
          children: [
            if (user != null) ...[
              _AccountCard(name: user.name, email: user.email),
              const SizedBox(height: 24),
            ],

            const _SectionLabel('Segurança'),
            const AppLockTile(),

            const SizedBox(height: 24),
            const _SectionLabel('Em breve'),
            const _ComingSoonTile(
              icon: Icons.bar_chart_outlined,
              title: 'Relatórios',
            ),
            const _ComingSoonTile(
              icon: Icons.send_outlined,
              title: 'Cobranças enviadas',
            ),
            const _ComingSoonTile(
              icon: Icons.settings_outlined,
              title: 'Configurações',
            ),

            const SizedBox(height: 24),
            ListTile(
              onTap: () async {
                await ref.read(authControllerProvider.notifier).logout();
                ref.read(appLockControllerProvider.notifier).relock();
              },
              leading: Icon(Icons.logout, color: theme.colorScheme.error),
              title: Text(
                'Sair da conta',
                style: TextStyle(color: theme.colorScheme.error),
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ],
        );
      },
    );
  }
}

class _AccountCard extends StatelessWidget {
  const _AccountCard({required this.name, required this.email});

  final String name;
  final String email;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 24,
              backgroundColor: theme.brand.neonDim,
              child: Text(
                _initials(name),
                style: theme.textTheme.titleSmall?.copyWith(
                  color: theme.brand.neon,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.titleSmall,
                  ),
                  const SizedBox(height: 2),
                  Text(
                    email,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.brand.mutedForeground,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  static String _initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        text.toUpperCase(),
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.brand.mutedForeground,
          fontWeight: FontWeight.w600,
          letterSpacing: 0.8,
        ),
      ),
    );
  }
}

class _ComingSoonTile extends StatelessWidget {
  const _ComingSoonTile({required this.icon, required this.title});

  final IconData icon;
  final String title;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListTile(
      enabled: false,
      leading: Icon(icon),
      title: Text(title),
      trailing: Text(
        'Em breve',
        style: theme.textTheme.bodySmall?.copyWith(
          color: theme.brand.mutedForeground,
        ),
      ),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    );
  }
}
