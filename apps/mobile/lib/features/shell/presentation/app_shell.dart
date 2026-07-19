import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/responsive/breakpoints.dart';
import '../../../core/responsive/responsive_builder.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/tq_logo.dart';

/// Abas da navegação principal, iguais às do site
/// (`BottomNav` em `Navigation.tsx`), mais "Mais" para o que no site vive
/// no menu do cabeçalho. A aba Admin do site não existe no app.
enum AppTab {
  dashboard('Painel', Icons.dashboard_outlined, Icons.dashboard),
  borrowers('Clientes', Icons.people_outline, Icons.people),
  loans('Empréstimos', Icons.description_outlined, Icons.description),
  more('Mais', Icons.more_horiz, Icons.more_horiz);

  const AppTab(this.label, this.icon, this.selectedIcon);

  final String label;
  final IconData icon;
  final IconData selectedIcon;
}

/// Casca do app autenticado: cabeçalho, área de conteúdo e navegação.
///
/// Em celulares a navegação é uma [NavigationBar] inferior (como no site);
/// em tablets e telas largas vira uma [NavigationRail] lateral, que aproveita
/// melhor a largura e mantém o polegar longe do centro da tela.
class AppShell extends StatelessWidget {
  const AppShell({required this.navigationShell, super.key});

  final StatefulNavigationShell navigationShell;

  void _onTabSelected(int index) {
    navigationShell.goBranch(
      index,
      // Tocar na aba já ativa volta para a raiz dela — comportamento padrão
      // esperado em navegação por abas.
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    return ResponsiveBuilder(
      builder: (context, size) {
        final content = Scaffold(
          appBar: const _AppShellHeader(),
          body: SafeArea(
            top: false,
            child: ResponsiveCenter(
              maxWidth: Breakpoints.maxContentWidth,
              child: navigationShell,
            ),
          ),
          bottomNavigationBar: size.isMobile
              ? _BottomNav(
                  currentIndex: navigationShell.currentIndex,
                  onSelected: _onTabSelected,
                )
              : null,
        );

        if (size.isMobile) return content;

        return Scaffold(
          body: Row(
            children: [
              _SideRail(
                currentIndex: navigationShell.currentIndex,
                onSelected: _onTabSelected,
                extended: size.isDesktop,
              ),
              Expanded(child: content),
            ],
          ),
        );
      },
    );
  }
}

class _AppShellHeader extends StatelessWidget implements PreferredSizeWidget {
  const _AppShellHeader();

  @override
  Size get preferredSize => const Size.fromHeight(56);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AppBar(
      titleSpacing: 16,
      title: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const TqLogo(size: 32),
          const SizedBox(width: 10),
          Text(
            'TamoQuite',
            style: theme.textTheme.titleMedium?.copyWith(
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
      // Borda inferior sutil, como o `border-b border-border` do site.
      bottom: PreferredSize(
        preferredSize: const Size.fromHeight(1),
        child: Container(height: 1, color: theme.colorScheme.outline),
      ),
    );
  }
}

class _BottomNav extends StatelessWidget {
  const _BottomNav({required this.currentIndex, required this.onSelected});

  final int currentIndex;
  final ValueChanged<int> onSelected;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: theme.colorScheme.outline)),
      ),
      child: NavigationBar(
        selectedIndex: currentIndex,
        onDestinationSelected: onSelected,
        backgroundColor: theme.colorScheme.surface,
        indicatorColor: AppColors.neonDim,
        // 64px mantém o alvo de toque acima de 44px sem ocupar tela demais.
        height: 64,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: [
          for (final tab in AppTab.values)
            NavigationDestination(
              icon: Icon(tab.icon),
              selectedIcon: Icon(tab.selectedIcon, color: theme.colorScheme.primary),
              label: tab.label,
            ),
        ],
      ),
    );
  }
}

class _SideRail extends StatelessWidget {
  const _SideRail({
    required this.currentIndex,
    required this.onSelected,
    required this.extended,
  });

  final int currentIndex;
  final ValueChanged<int> onSelected;
  final bool extended;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return NavigationRail(
      selectedIndex: currentIndex,
      onDestinationSelected: onSelected,
      extended: extended,
      backgroundColor: theme.colorScheme.surface,
      indicatorColor: AppColors.neonDim,
      labelType: extended ? null : NavigationRailLabelType.all,
      destinations: [
        for (final tab in AppTab.values)
          NavigationRailDestination(
            icon: Icon(tab.icon),
            selectedIcon: Icon(tab.selectedIcon, color: theme.colorScheme.primary),
            label: Text(tab.label),
          ),
      ],
    );
  }
}
