import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_brand_colors.dart';
import '../../../../core/utils/formatters.dart';
import '../../../../core/widgets/tq_state_views.dart';
import '../../application/share_controller.dart';
import '../../domain/loan.dart';
import '../../domain/loan_share.dart';

/// Gera, copia, envia e revoga o link público de um contrato.
///
/// Quem abre o link só consegue **ver** as parcelas — o token é toda a
/// segurança, e revogar troca o token, matando qualquer endereço antigo.
Future<void> showShareLoanSheet(BuildContext context, Loan loan) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    useSafeArea: true,
    builder: (_) => _ShareLoanSheet(loan: loan),
  );
}

class _ShareLoanSheet extends ConsumerWidget {
  const _ShareLoanSheet({required this.loan});

  final Loan loan;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final share = ref.watch(loanShareProvider(loan.id));

    return Padding(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 8,
        bottom: MediaQuery.viewInsetsOf(context).bottom + 20,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Center(
            child: Container(
              width: 36,
              height: 4,
              margin: const EdgeInsets.only(bottom: 20),
              decoration: BoxDecoration(
                color: theme.colorScheme.outline,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
          ),
          Text(
            'Compartilhar contrato',
            style: theme.textTheme.titleLarge?.copyWith(
              fontWeight: FontWeight.w700,
              fontSize: 18,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Gere um link para ${loan.borrower.name} acompanhar as parcelas. '
            'Quem abrir só consegue ver — ninguém altera nada por lá.',
            style: theme.textTheme.bodySmall?.copyWith(
              color: theme.brand.mutedForeground,
            ),
          ),
          const SizedBox(height: 20),

          switch (share) {
            AsyncData(:final value) when value.active =>
              _ActiveLink(loan: loan, share: value),
            AsyncData() => _Disabled(loan: loan),
            AsyncError(:final error) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: TqErrorState(
                message: error is ApiException
                    ? error.message
                    : 'Não foi possível carregar o link.',
                onRetry: () => ref.invalidate(loanShareProvider(loan.id)),
              ),
            ),
            _ => const Padding(
              padding: EdgeInsets.symmetric(vertical: 32),
              child: TqLoadingState(),
            ),
          },

          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }
}

class _Disabled extends ConsumerStatefulWidget {
  const _Disabled({required this.loan});

  final Loan loan;

  @override
  ConsumerState<_Disabled> createState() => _DisabledState();
}

class _DisabledState extends ConsumerState<_Disabled> {
  bool _working = false;

  Future<void> _enable() async {
    setState(() => _working = true);
    try {
      await ref.read(shareActionsProvider).enable(widget.loan.id);
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _working = false);
        ScaffoldMessenger.of(context)
          ..hideCurrentSnackBar()
          ..showSnackBar(SnackBar(content: Text(e.message)));
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        FilledButton.icon(
          onPressed: _working ? null : _enable,
          icon: _working
              ? const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Icon(Icons.link, size: 18),
          label: Text(_working ? 'Gerando...' : 'Gerar link'),
        ),
        const SizedBox(height: 8),
        Text(
          'Só quem receber o link consegue abrir. Você pode desativá-lo a '
          'qualquer momento.',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall?.copyWith(
            color: theme.brand.mutedForeground,
          ),
        ),
      ],
    );
  }
}

class _ActiveLink extends ConsumerStatefulWidget {
  const _ActiveLink({required this.loan, required this.share});

  final Loan loan;
  final LoanShare share;

  @override
  ConsumerState<_ActiveLink> createState() => _ActiveLinkState();
}

class _ActiveLinkState extends ConsumerState<_ActiveLink> {
  bool _copied = false;
  bool _revoking = false;

  String get _url => widget.share.url!;

  Future<void> _copy() async {
    await Clipboard.setData(ClipboardData(text: _url));
    if (!mounted) return;
    setState(() => _copied = true);
    _message('Link copiado!');
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _copied = false);
    });
  }

  Future<void> _sendWhatsapp() async {
    final text = Uri.encodeComponent(
      'Olá, ${widget.loan.borrower.name}! Aqui você acompanha o nosso '
      'contrato e as parcelas: $_url',
    );
    final digits = widget.loan.borrower.phone.e164Digits;
    final target = Uri.parse(
      digits.isNotEmpty ? 'https://wa.me/$digits?text=$text' : 'https://wa.me/?text=$text',
    );

    final launched = await launchUrl(target, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      _message('Não foi possível abrir o WhatsApp. O link foi copiado.');
      await Clipboard.setData(ClipboardData(text: _url));
    }
  }

  Future<void> _revoke() async {
    setState(() => _revoking = true);
    try {
      await ref.read(shareActionsProvider).revoke(widget.loan.id);
      _message('Link desativado. Quem tinha o endereço não consegue mais abrir.');
    } on ApiException catch (e) {
      if (mounted) {
        setState(() => _revoking = false);
        _message(e.message);
      }
    }
  }

  void _message(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final brand = theme.brand;
    final views = widget.share.viewCount;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: theme.colorScheme.surfaceContainerHigh,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: theme.colorScheme.outline),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Link do contrato',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: brand.mutedForeground,
                ),
              ),
              const SizedBox(height: 4),
              Text(_url, style: theme.textTheme.bodySmall),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _copy,
                icon: Icon(
                  _copied ? Icons.check : Icons.copy,
                  size: 18,
                  color: _copied ? brand.neon : null,
                ),
                label: Text(_copied ? 'Copiado' : 'Copiar'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: FilledButton.icon(
                onPressed: _sendWhatsapp,
                icon: const Icon(Icons.send, size: 18),
                label: const Text('Enviar'),
              ),
            ),
          ],
        ),
        if (views != null) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              Icon(Icons.visibility_outlined, size: 14, color: brand.mutedForeground),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  _viewsLabel(views, widget.share.lastViewedAt),
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: brand.mutedForeground,
                  ),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 12),
        TextButton.icon(
          onPressed: _revoking ? null : _revoke,
          icon: Icon(Icons.link_off, size: 18, color: theme.colorScheme.error),
          label: Text(
            _revoking ? 'Desativando...' : 'Desativar este link',
            style: TextStyle(color: theme.colorScheme.error),
          ),
        ),
      ],
    );
  }

  static String _viewsLabel(int views, DateTime? lastViewedAt) {
    if (views == 0) return 'Ainda não foi aberto.';
    final times = views == 1 ? '1 vez' : '$views vezes';
    final last = lastViewedAt == null
        ? ''
        : ' · última em ${Formatters.date(lastViewedAt)}';
    return 'Aberto $times$last.';
  }
}
