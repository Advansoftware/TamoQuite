import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/security/app_lock_controller.dart';
import '../../../../core/widgets/tq_primary_button.dart';
import '../../../../core/widgets/tq_text_field.dart';
import '../../application/auth_controller.dart';

/// Formulário de email + senha.
///
/// Mantém o próprio estado de carregamento e erro: uma falha de login é um
/// problema *deste formulário*, não da sessão do app.
class LoginForm extends ConsumerStatefulWidget {
  const LoginForm({required this.onForgotPassword, super.key});

  final VoidCallback onForgotPassword;

  @override
  ConsumerState<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends ConsumerState<LoginForm> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  bool _isSubmitting = false;
  bool _showPassword = false;

  @override
  void initState() {
    super.initState();
    // Reavalia o botão "Entrar" a cada tecla, como o `canSubmit` do site.
    _emailController.addListener(_onFieldChanged);
    _passwordController.addListener(_onFieldChanged);
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  void _onFieldChanged() => setState(() {});

  bool get _canSubmit =>
      _emailController.text.trim().isNotEmpty &&
      _passwordController.text.isNotEmpty &&
      !_isSubmitting;

  Future<void> _submit() async {
    if (!_canSubmit) return;

    FocusScope.of(context).unfocus();
    setState(() => _isSubmitting = true);

    try {
      await ref
          .read(authControllerProvider.notifier)
          .login(
            email: _emailController.text,
            password: _passwordController.text,
          );

      // Login concluído: talvez convidar a ativar o bloqueio do app.
      // O router já está levando para o dashboard neste ponto.
      await ref.read(appLockControllerProvider.notifier).maybeOfferSetup();
    } on ApiException catch (e) {
      _showError(e.message);
    } catch (_) {
      _showError('Erro de conexão com o servidor. Verifique sua internet.');
    } finally {
      // A tela pode ter sido descartada pelo redirect do router.
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return AutofillGroup(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TqTextField(
            label: 'Email',
            controller: _emailController,
            hintText: 'seu@email.com',
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            autofillHints: const [AutofillHints.email],
            enabled: !_isSubmitting,
          ),
          const SizedBox(height: 16),
          TqTextField(
            label: 'Senha',
            controller: _passwordController,
            hintText: '••••••••',
            obscureText: !_showPassword,
            textInputAction: TextInputAction.done,
            autofillHints: const [AutofillHints.password],
            enabled: !_isSubmitting,
            onSubmitted: (_) => _submit(),
            trailingLabel: TextButton(
              onPressed: _isSubmitting ? null : widget.onForgotPassword,
              style: TextButton.styleFrom(
                foregroundColor: theme.colorScheme.primary,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                textStyle: theme.textTheme.bodySmall,
              ),
              child: const Text('Esqueci minha senha'),
            ),
            suffix: PasswordVisibilityToggle(
              isVisible: _showPassword,
              onToggle: _isSubmitting
                  ? null
                  : () => setState(() => _showPassword = !_showPassword),
            ),
          ),
          const SizedBox(height: 24),
          TqPrimaryButton(
            label: 'Entrar',
            icon: Icons.login,
            isLoading: _isSubmitting,
            onPressed: _canSubmit ? _submit : null,
          ),
        ],
      ),
    );
  }
}
