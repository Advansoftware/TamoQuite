import '../../../core/config/app_config.dart';
import '../../../core/utils/json.dart';

/// Estado do link público de um contrato (`/api/loans/:id/share`).
///
/// O token é toda a segurança do link: quem o tem, vê o contrato. Por isso
/// reativar sempre gera um token novo, matando qualquer URL antiga.
class LoanShare {
  const LoanShare({
    required this.active,
    required this.token,
    required this.viewCount,
    required this.lastViewedAt,
  });

  final bool active;
  final String? token;

  /// Quantas vezes o devedor abriu o link (null quando nunca compartilhado).
  final int? viewCount;
  final DateTime? lastViewedAt;

  /// URL que o devedor abre — o mesmo formato do site (`/share/:token`),
  /// montado sobre o domínio público, não a API.
  String? get url =>
      active && token != null ? '${AppConfig.websiteUrl}/share/$token' : null;

  static const inactive = LoanShare(
    active: false,
    token: null,
    viewCount: null,
    lastViewedAt: null,
  );

  factory LoanShare.fromJson(Map<String, dynamic> json) {
    return LoanShare(
      active: asBool(json['active']),
      token: json['token'] as String?,
      viewCount: json.containsKey('viewCount') ? asInt(json['viewCount']) : null,
      lastViewedAt: asDate(json['lastViewedAt']),
    );
  }
}
