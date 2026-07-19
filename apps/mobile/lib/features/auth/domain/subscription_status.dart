/// Regra de acesso do paywall, espelhada de
/// `apps/api/src/common/subscription.guard.ts` e de `hasActiveSubscription`
/// em `apps/web/src/lib/helpers.ts`.
///
/// Se a lista de status de acesso mudar na API, ela precisa mudar aqui também
/// — o servidor continua sendo a autoridade (o app só evita mostrar telas que
/// seriam bloqueadas de qualquer forma).
abstract final class SubscriptionAccess {
  const SubscriptionAccess._();

  /// `trialing` cobre o período de 7 dias grátis; `active` é assinatura paga.
  static const grantedStatuses = {'active', 'trialing'};

  static bool isActive(String? status) =>
      status != null && grantedStatuses.contains(status);
}
