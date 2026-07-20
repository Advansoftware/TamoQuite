import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/core/config/app_config.dart';
import 'package:tamoquite/features/loans/domain/loan_share.dart';

/// `/api/loans/:id/share` diz se o link está ativo e, quando está, o token. A
/// URL do devedor é montada sobre o domínio público, não a API.
void main() {
  test('link ativo monta a URL pública com o token', () {
    final share = LoanShare.fromJson(const {
      'active': true,
      'token': 'abc123',
      'viewCount': 2,
      'lastViewedAt': '2026-07-01T12:00:00.000Z',
    });

    expect(share.active, isTrue);
    expect(share.url, '${AppConfig.websiteUrl}/share/abc123');
    expect(share.viewCount, 2);
    expect(share.lastViewedAt, isNotNull);
  });

  test('link inativo não tem URL', () {
    final share = LoanShare.fromJson(const {'active': false});
    expect(share.active, isFalse);
    expect(share.url, isNull);
    expect(share.viewCount, isNull);
  });
}
