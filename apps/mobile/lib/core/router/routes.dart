/// Rotas do app, espelhando as URLs de `apps/web`.
///
/// Clientes e Empréstimos já existem como aba e rota (a navegação inferior é
/// a mesma do site), mas ainda exibem um placeholder — suas telas entram nas
/// próximas versões, junto com relatórios, cobranças e configurações.
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
}
