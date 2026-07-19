/// Erro de API já traduzido para uma mensagem exibível ao usuário.
///
/// As mensagens espelham `getApiError` em `apps/web/src/lib/api.ts`, para que
/// app e site falem exatamente a mesma língua diante da mesma falha.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;

  /// Código estruturado devolvido pela API (ex.: `SUBSCRIPTION_INACTIVE`).
  final String? code;

  /// Paywall do servidor — ver `apps/api/src/common/subscription.guard.ts`.
  bool get isSubscriptionInactive => code == 'SUBSCRIPTION_INACTIVE';

  /// Sessão inválida ou expirada: o token deve ser descartado.
  bool get isUnauthorized => statusCode == 401;

  const ApiException.network()
    : message = 'Erro de conexão com o servidor. Verifique sua internet.',
      statusCode = null,
      code = null;

  const ApiException.unknown()
    : message = 'Erro no servidor. Tente novamente.',
      statusCode = null,
      code = null;

  @override
  String toString() => 'ApiException($statusCode, $code): $message';
}
