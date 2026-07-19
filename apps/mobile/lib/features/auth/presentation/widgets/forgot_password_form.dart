import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/widgets/tq_primary_button.dart';
import '../../../../core/widgets/tq_text_field.dart';
import '../../application/auth_controller.dart';

/// Recuperação de senha em duas etapas: pedir o email e confirmar o envio.
///
/// A API sempre responde sucesso (não revela se o email existe), então a
/// mensagem de confirmação é deliberadamente condicional — "se houver uma
/// conta associada…", igual ao site.
class ForgotPasswordForm extends ConsumerStatefulWidget {
  const ForgotPasswordForm({required this.onBackToLogin, super.key});

  final VoidCallback onBackToLogin;

  @override
  ConsumerState<ForgotPasswordForm> createState() => _ForgotPasswordFormState();
}

class _ForgotPasswordFormState extends ConsumerState<ForgotPasswordForm> {
  final _emailController = TextEditingController();

  bool _isSubmitting = false;
  bool _wasSent = false;

  @override
  void initState() {
    super.initState();
    _emailController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || _isSubmitting) return;

    FocusScope.of(context).unfocus();
    setState(() => _isSubmitting = true);

    try {
      await ref.read(authRepositoryProvider).forgotPassword(email);
      if (mounted) setState(() => _wasSent = true);
    } on ApiException catch (_) {
      _showError('Não foi possível enviar o email. Tente novamente.');
    } catch (_) {
      _showError('Erro de conexão com o servidor');
    } finally {
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
    return _wasSent ? _buildSuccess(context) : _buildForm(context);
  }

  Widget _buildForm(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Recuperar senha',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: 4),
        Text(
          'Informe seu email e enviaremos um link para redefinir sua senha.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
        const SizedBox(height: 24),
        TqTextField(
          label: 'Email',
          controller: _emailController,
          hintText: 'seu@email.com',
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          autofillHints: const [AutofillHints.email],
          autofocus: true,
          enabled: !_isSubmitting,
          onSubmitted: (_) => _submit(),
        ),
        const SizedBox(height: 24),
        TqPrimaryButton(
          label: 'Enviar link de recuperação',
          icon: Icons.mail_outline,
          isLoading: _isSubmitting,
          onPressed: _emailController.text.trim().isEmpty ? null : _submit,
        ),
        const SizedBox(height: 8),
        _BackToLoginButton(
          onPressed: _isSubmitting ? null : widget.onBackToLogin,
        ),
      ],
    );
  }

  Widget _buildSuccess(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
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
              Icons.check_circle_outline,
              size: 28,
              color: theme.brand.neon,
            ),
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Verifique seu email',
          textAlign: TextAlign.center,
          style: theme.textTheme.titleLarge,
        ),
        const SizedBox(height: 4),
        Text.rich(
          TextSpan(
            children: [
              const TextSpan(text: 'Se houver uma conta associada a '),
              TextSpan(
                text: _emailController.text.trim(),
                style: TextStyle(color: theme.colorScheme.onSurface),
              ),
              const TextSpan(
                text:
                    ', você receberá um link para redefinir a senha. '
                    'O link expira em 1 hora.',
              ),
            ],
          ),
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
        const SizedBox(height: 24),
        _BackToLoginButton(onPressed: widget.onBackToLogin),
      ],
    );
  }
}

class _BackToLoginButton extends StatelessWidget {
  const _BackToLoginButton({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onPressed,
      icon: const Icon(Icons.arrow_back, size: 16),
      label: const Text('Voltar ao login'),
    );
  }
}
