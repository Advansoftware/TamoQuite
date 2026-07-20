import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/core_providers.dart';
import '../domain/loan_share.dart';

/// Acesso ao link público de um contrato (`/api/loans/:id/share`).
class ShareRepository {
  const ShareRepository(this._client);

  final ApiClient _client;

  Future<LoanShare> get(String loanId) async {
    return LoanShare.fromJson(await _client.get('/api/loans/$loanId/share'));
  }

  /// Gera o link, ou revive um revogado com um token novo.
  Future<LoanShare> enable(String loanId) async {
    return LoanShare.fromJson(await _client.post('/api/loans/$loanId/share'));
  }

  /// Mata o link. O endereço para de funcionar; um novo pode ser gerado depois.
  Future<LoanShare> revoke(String loanId) async {
    return LoanShare.fromJson(await _client.delete('/api/loans/$loanId/share'));
  }
}

final shareRepositoryProvider = Provider<ShareRepository>((ref) {
  return ShareRepository(ref.watch(apiClientProvider));
});
