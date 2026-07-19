import 'package:flutter/material.dart';

import '../../../core/widgets/tq_logo.dart';

/// Tela exibida enquanto a sessão salva é restaurada e revalidada em
/// `GET /api/auth/me`. O router sai daqui sozinho assim que o estado resolve.
class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const TqLogo(),
            const SizedBox(height: 32),
            SizedBox(
              width: 24,
              height: 24,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
