import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateProvider é legado no Riverpod 3, mas continua a forma mais enxuta de
// guardar um filtro de UI sem escrever um Notifier só para isso.
import 'package:flutter_riverpod/legacy.dart';

import '../../dashboard/application/dashboard_controller.dart';
import '../../loans/application/loans_controller.dart';
import '../data/borrowers_repository.dart';
import '../domain/borrower.dart';
import '../domain/borrower_detail.dart';

/// Aba selecionada na listagem de clientes.
final borrowerFilterProvider = StateProvider<BorrowerFilter>((ref) {
  return BorrowerFilter.active;
});

/// Lista de clientes de uma aba.
///
/// Indexada pelo filtro para que "Ativos" e "Desativados" tenham cada um seu
/// cache: trocar de aba e voltar não recarrega, e o contador de desativados
/// pode ser lido sem mexer na lista em exibição.
///
/// É [FutureProvider] porque a leitura não tem estado próprio — as escritas
/// vivem em [BorrowerActions] e terminam invalidando isto aqui.
final borrowersListProvider =
    FutureProvider.family<List<Borrower>, BorrowerFilter>((ref, filter) {
      return ref.watch(borrowersRepositoryProvider).list(filter);
    });

/// Detalhe de um cliente com os contratos dele.
final borrowerDetailProvider =
    FutureProvider.family<BorrowerDetail, String>((ref, id) {
      return ref.watch(borrowersRepositoryProvider).get(id);
    });

/// Escritas de cliente.
///
/// Cada ação recarrega o que ela pode ter mudado. Desativar e reativar movem
/// o cliente entre as abas, então as duas listas são invalidadas sempre —
/// atualizar só a aba visível deixaria a outra mentindo.
class BorrowerActions {
  const BorrowerActions(this._ref);

  final Ref _ref;

  BorrowersRepository get _repository =>
      _ref.read(borrowersRepositoryProvider);

  Future<void> create({
    required String name,
    required String whatsapp,
    String? notes,
  }) async {
    await _repository.create(name: name, whatsapp: whatsapp, notes: notes);
    _invalidateLists();
  }

  Future<void> update(
    String id, {
    required String name,
    required String whatsapp,
    required String notes,
  }) async {
    await _repository.update(id, name: name, whatsapp: whatsapp, notes: notes);
    _invalidateLists();
    _ref.invalidate(borrowerDetailProvider(id));
  }

  /// Desativa (soft delete reversível). Os contratos do cliente somem da aba
  /// Empréstimos e dos totais, mas continuam acessíveis pela tela dele.
  Future<void> deactivate(String id) async {
    await _repository.deactivate(id);
    _invalidateEverything(id);
  }

  Future<void> reactivate(String id) async {
    await _repository.reactivate(id);
    _invalidateEverything(id);
  }

  void _invalidateLists() {
    for (final filter in BorrowerFilter.values) {
      _ref.invalidate(borrowersListProvider(filter));
    }
  }

  /// Ativar/desativar um cliente entra e tira os contratos dele da aba
  /// Empréstimos e dos totais do painel — não é só a lista de clientes que
  /// muda.
  void _invalidateEverything(String id) {
    _invalidateLists();
    _ref.invalidate(borrowerDetailProvider(id));
    _ref.invalidate(loansListProvider);
    _ref.invalidate(dashboardControllerProvider);
  }
}

final borrowerActionsProvider = Provider<BorrowerActions>(BorrowerActions.new);
