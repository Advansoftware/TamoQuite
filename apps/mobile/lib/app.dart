import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';

/// Raiz da aplicação.
class TamoQuiteApp extends ConsumerWidget {
  const TamoQuiteApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'TamoQuite',
      debugShowCheckedModeBanner: false,
      routerConfig: ref.watch(routerProvider),

      theme: AppTheme.light,
      darkTheme: AppTheme.dark,
      // O site é dark-only; o app segue o sistema, mas nasce no escuro
      // quando o aparelho não expressa preferência.
      themeMode: ThemeMode.system,

      locale: const Locale('pt', 'BR'),
      supportedLocales: const [Locale('pt', 'BR')],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],

      builder: (context, child) {
        // Limita o fator de escala de fonte: acima de 1.3 os cards de métrica
        // do painel quebram, e o usuário perde mais do que ganha.
        final mediaQuery = MediaQuery.of(context);
        return MediaQuery(
          data: mediaQuery.copyWith(
            textScaler: mediaQuery.textScaler.clamp(
              minScaleFactor: 0.85,
              maxScaleFactor: 1.3,
            ),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
    );
  }
}
