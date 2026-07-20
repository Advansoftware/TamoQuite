import 'package:flutter_riverpod/flutter_riverpod.dart';
// StateProvider é legado no Riverpod 3, mas continua a forma mais enxuta de
// guardar o filtro da aba sem um Notifier dedicado.
import 'package:flutter_riverpod/legacy.dart';

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
    List<DateTime>? dueDates,
  }) async {
    final loan = await _repository.create(
      borrowerId: borrowerId,
      originalAmount: originalAmount,
      interestRate: interestRate,
      totalAmount: totalAmount,
      installmentCount: installmentCount,
      startDate: startDate,
      frequency: frequency,
      dueDates: dueDates,
    );
    _invalidateTotals();
    return loan;
  }

  /// Corrige o contrato (`PATCH /loans/:id`). O servidor reconstrói as parcelas
  /// quando o dinheiro muda; se algo já foi pago ele recusa com mensagem
  /// própria — a tela só a exibe.
  Future<Loan> update(
    String id, {
    String? borrowerId,
    double? originalAmount,
    double? interestRate,
    double? totalAmount,
    int? installmentCount,
    DateTime? startDate,
    PaymentFrequency? frequency,
    List<DateTime>? dueDates,
  }) async {
    final loan = await _repository.update(
      id,
      borrowerId: borrowerId,
      originalAmount: originalAmount,
      interestRate: interestRate,
      totalAmount: totalAmount,
      installmentCount: installmentCount,
      startDate: startDate,
      frequency: frequency,
      dueDates: dueDates,
    );
    _ref.invalidate(loanDetailProvider(id));
    _invalidateTotals();
    return loan;
  }

  Future<void> updateBilling(
    String id, {
    required bool doNotCharge,
    required String? whatsappMode,
  }) async {
    await _repository.updateBilling(
      id,
      doNotCharge: doNotCharge,
      whatsappMode: whatsappMode,
    );
    _ref.invalidate(loanDetailProvider(id));
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

  Future<void> setInstallmentDueDate(
    String loanId,
    String installmentId,
    DateTime dueDate,
  ) async {
    await _repository.setInstallmentDueDate(installmentId, dueDate);
    _afterInstallmentChange(loanId);
  }

  Future<void> rollRemaining(String loanId, String installmentId) async {
    await _repository.rollRemaining(installmentId);
    _afterInstallmentChange(loanId);
  }

  Future<void> payInterest(
    String loanId,
    String installmentId,
    double interestAmount, {
    required bool rollImmediately,
  }) async {
    await _repository.payInterest(
      installmentId,
      interestAmount,
      rollImmediately: rollImmediately,
    );
    _afterInstallmentChange(loanId);
  }

  Future<void> setInstallmentCharge(
    String loanId,
    String installmentId, {
    required bool doNotCharge,
  }) async {
    await _repository.setInstallmentCharge(installmentId, doNotCharge: doNotCharge);
    _ref.invalidate(loanDetailProvider(loanId));
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
