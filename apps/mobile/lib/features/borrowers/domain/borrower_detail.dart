import '../../../core/utils/json.dart';
import '../../loans/domain/loan.dart';
import 'borrower.dart';

/// `GET /api/borrowers/:id` — o cliente com todos os contratos vivos dele.
///
/// Diferente da aba Empréstimos, esta rota alcança os contratos de um cliente
/// **desativado** (`loans.service.ts` filtra a listagem por cliente ativo, mas
/// a busca por id não). É por aqui que o histórico de um desativado continua
/// acessível depois do soft delete.
class BorrowerDetail {
  const BorrowerDetail({required this.borrower, required this.loans});

  final Borrower borrower;
  final List<Loan> loans;

  double get totalLent =>
      loans.fold(0, (sum, loan) => sum + loan.originalAmount);

  double get totalToReceive =>
      loans.fold(0, (sum, loan) => sum + loan.installmentsTotal);

  double get totalPaid => loans.fold(0, (sum, loan) => sum + loan.paidAmount);

  double get outstanding =>
      (totalToReceive - totalPaid).clamp(0, double.infinity);

  int get overdueCount => loans
      .expand((loan) => loan.installments)
      .where((installment) => installment.status.isOverdue)
      .length;

  factory BorrowerDetail.fromJson(Map<String, dynamic> json) {
    final borrower = Borrower.fromJson(json);

    return BorrowerDetail(
      borrower: borrower,
      loans: asList(json['loans'], (loan) => Loan.fromJson(loan, owner: borrower)),
    );
  }
}
