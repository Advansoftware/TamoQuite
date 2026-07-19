import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../dashboard/application/dashboard_controller.dart';
import '../data/loans_repository.dart';
import '../domain/loan.dart';

/// Filtro da listagem de contratos, igual às abas do site.
enum LoanFilter {
  active('Ativos'),
  overdue('Atrasados'),
  completed('Concluídos'),
  all('Todos');

  const LoanFilter(this.label);

  final String label;

  /// O filtro é aplicado no app, sobre a lista que a API já devolve inteira —
  /// é assim no site, e evita uma ida ao servidor a cada toque na aba.
  bool matches(Loan loan) => switch (this) {
    LoanFilter.active => loan.status == LoanStatus.active,
    LoanFilter.overdue => loan.status == LoanStatus.active && loan.hasOverdue,
    LoanFilter.completed => loan.status == LoanStatus.completed,
    LoanFilter.all => true,
  };
}

final loanFilterProvider = StateProvider<LoanFilter>((ref) => LoanFilter.active);

/// Contratos vivos de clientes ativos.
final loansListProvider = FutureProvider<List<Loan>>((ref) {
  return ref.watch(loansRepositoryProvider).list();
});

/// Um contrato com as parcelas. Diferente da listagem, alcança também o
/// contrato de um cliente desativado (ver `loans.service.ts`).
final loanDetailProvider = FutureProvider.family<Loan, String>((ref, id) {
  return ref.watch(loansRepositoryProvider).get(id);
});

/// Escritas de contrato e de parcela.
///
/// Toda ação aqui mexe em dinheiro a receber, então além do próprio contrato
/// ela recarrega a listagem e o painel — que somam parcelas.
class LoanActions {
  const LoanActions(this._ref);

  final Ref _ref;

  LoansRepository get _repository => _ref.read(loansRepositoryProvider);

  Future<Loan> create({
    required String borrowerId,
    required double originalAmount,
    required double interestRate,
    required double totalAmount,
    required int installmentCount,
    required DateTime startDate,
    required PaymentFrequency frequency,
  }) async {
    final loan = await _repository.create(
      borrowerId: borrowerId,
      originalAmount: originalAmount,
      interestRate: interestRate,
      totalAmount: totalAmount,
      installmentCount: installmentCount,
      startDate: startDate,
      frequency: frequency,
    );
    _invalidateTotals();
    return loan;
  }

  /// Exclui o contrato. É soft delete no banco, mas irreversível pelo app:
  /// não existe rota de restauração (ver `loans.service.ts#remove`).
  Future<void> remove(String id) async {
    await _repository.remove(id);
    _invalidateTotals();
    _ref.invalidate(loanDetailProvider(id));
  }

  Future<void> markPaid(String loanId, String installmentId) async {
    await _repository.markInstallmentPaid(installmentId);
    _afterInstallmentChange(loanId);
  }

  Future<void> addPartialPayment(
    String loanId,
    String installmentId,
    double amount,
  ) async {
    await _repository.addPartialPayment(installmentId, amount);
    _afterInstallmentChange(loanId);
  }

  Future<void> undoPayment(String loanId, String installmentId) async {
    await _repository.undoPayment(installmentId);
    _afterInstallmentChange(loanId);
  }

  /// Pagar uma parcela pode concluir o contrato, então o status na listagem
  /// muda junto com o detalhe.
  void _afterInstallmentChange(String loanId) {
    _ref.invalidate(loanDetailProvider(loanId));
    _invalidateTotals();
  }

  void _invalidateTotals() {
    _ref.invalidate(loansListProvider);
    _ref.invalidate(dashboardControllerProvider);
  }
}

final loanActionsProvider = Provider<LoanActions>(LoanActions.new);
