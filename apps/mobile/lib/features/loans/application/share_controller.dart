import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/share_repository.dart';
import '../domain/loan_share.dart';

/// Estado atual do link público de um contrato.
final loanShareProvider = FutureProvider.family<LoanShare, String>((ref, loanId) {
  return ref.watch(shareRepositoryProvider).get(loanId);
});

/// Gera e revoga o link. Cada ação atualiza o [loanShareProvider] do contrato.
class ShareActions {
  const ShareActions(this._ref);

  final Ref _ref;

  Future<LoanShare> enable(String loanId) async {
    final share = await _ref.read(shareRepositoryProvider).enable(loanId);
    _ref.invalidate(loanShareProvider(loanId));
    return share;
  }

  Future<LoanShare> revoke(String loanId) async {
    final share = await _ref.read(shareRepositoryProvider).revoke(loanId);
    _ref.invalidate(loanShareProvider(loanId));
    return share;
  }
}

final shareActionsProvider = Provider<ShareActions>(ShareActions.new);
