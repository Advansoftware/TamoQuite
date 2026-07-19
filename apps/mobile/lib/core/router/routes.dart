/// Rotas do app, espelhando as URLs de `apps/web`.
///
/// Relatórios, cobranças e configurações continuam só no site — no app vivem
/// como "em breve" na aba Mais.
abstract final class AppRoutes {
  const AppRoutes._();

  // Fora do shell autenticado
  static const splash = '/';
  static const login = '/login';
  static const lock = '/bloqueio';
  static const subscriptionRequired = '/assinatura';

  // Abas do shell — mesmos caminhos do site
  static const dashboard = '/dashboard';
  static const borrowers = '/borrowers';
  static const loans = '/loans';
  static const more = '/mais';

  // Telas de detalhe, empilhadas sobre a aba de origem. O segmento é `:id`
  // sem barra inicial, como o go_router espera em uma sub-rota.
  static const detailPath = ':id';

  static String borrowerDetail(String id) => '$borrowers/$id';
  static String loanDetail(String id) => '$loans/$id';
}
