/// Configuração de ambiente resolvida em tempo de compilação.
///
/// O valor vem de `--dart-define=API_URL=...`; sem ele, builds de release
/// apontam para a API de produção e builds de debug para o servidor local.
///
/// ```sh
/// # dev contra a API local
/// flutter run --dart-define=API_URL=http://10.0.2.2:3042
///
/// # release para a Play Store (usa o padrão de produção)
/// flutter build appbundle --release
/// ```
abstract final class AppConfig {
  const AppConfig._();

  static const _apiUrlOverride = String.fromEnvironment('API_URL');

  static const productionApiUrl = 'https://api.tamoquite.app';

  /// No emulador Android, `localhost` é o próprio emulador — 10.0.2.2
  /// é o host da máquina de desenvolvimento.
  static const localApiUrl = 'http://10.0.2.2:3042';

  static const isRelease = bool.fromEnvironment('dart.vm.product');

  /// Base da API, sem barra no final. Todos os paths já incluem o prefixo
  /// global `/api` definido em `apps/api/src/main.ts`.
  static String get apiBaseUrl {
    if (_apiUrlOverride.isNotEmpty) return _stripTrailingSlash(_apiUrlOverride);
    return isRelease ? productionApiUrl : localApiUrl;
  }

  /// Site onde a assinatura é contratada (Stripe).
  static const websiteUrl = 'https://tamoquite.app';

  static String _stripTrailingSlash(String url) =>
      url.endsWith('/') ? url.substring(0, url.length - 1) : url;
}
