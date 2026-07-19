import 'package:flutter/material.dart';

import '../../../core/responsive/breakpoints.dart';
import '../../../core/responsive/responsive_builder.dart';
import '../../../core/widgets/tq_logo.dart';
import 'widgets/forgot_password_form.dart';
import 'widgets/login_form.dart';

/// Modos da tela de entrada, como em `LoginPage.tsx`.
enum LoginMode { login, forgotPassword }

/// Tela de login, espelhando `apps/web/src/components/loan-system/LoginPage.tsx`:
/// logo centralizado, formulário estreito e link para a política de privacidade.
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  LoginMode _mode = LoginMode.login;

  void _switchTo(LoginMode mode) => setState(() => _mode = mode);

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: SafeArea(
        child: ResponsiveBuilder(
          builder: (context, size) {
            return Center(
              child: SingleChildScrollView(
                // Em telas baixas (celular com teclado aberto) o conteúdo
                // rola; em telas altas ele fica centralizado.
                padding: EdgeInsets.symmetric(
                  horizontal: size.isMobile ? 24 : 32,
                  vertical: 32,
                ),
                child: ConstrainedBox(
                  constraints: const BoxConstraints(
                    maxWidth: Breakpoints.maxFormWidth,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TqLogoHeader(logoSize: size.isMobile ? 64 : 72),
                      const SizedBox(height: 32),
                      AnimatedSize(
                        duration: const Duration(milliseconds: 200),
                        curve: Curves.easeOut,
                        alignment: Alignment.topCenter,
                        child: switch (_mode) {
                          LoginMode.login => LoginForm(
                            onForgotPassword: () =>
                                _switchTo(LoginMode.forgotPassword),
                          ),
                          LoginMode.forgotPassword => ForgotPasswordForm(
                            onBackToLogin: () => _switchTo(LoginMode.login),
                          ),
                        },
                      ),
                      const SizedBox(height: 32),
                      Text(
                        'Acesso restrito',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: theme.brandMutedSubtle,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

extension on ThemeData {
  /// `text-muted-foreground/50` do rodapé do site.
  Color get brandMutedSubtle =>
      colorScheme.onSurfaceVariant.withValues(alpha: 0.5);
}
