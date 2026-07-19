import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/features/loans/domain/installment.dart';
import 'package:tamoquite/features/loans/domain/loan.dart';

/// `GET /api/loans` traz o contrato com o devedor e as parcelas aninhados. Os
/// totais da tela vêm das parcelas, não do campo `totalAmount`, porque uma
/// parcela rolada muda o total sem reescrever aquele campo.
void main() {
  Map<String, dynamic> loanJson({
    List<Map<String, dynamic>> installments = const [],
    String status = 'ACTIVE',
  }) {
    return {
      'id': 'l1',
      'borrower': {'id': 'b1', 'name': 'Maria Souza', 'whatsapp': '5511912345678'},
      'originalAmount': 1000.0,
      'interestRate': 10.0,
      'totalAmount': 1300.0,
      'installmentCount': installments.length,
      'startDate': '2026-08-10T00:00:00.000Z',
      'paymentFrequency': 'MONTHLY',
      'status': status,
      'installments': installments,
    };
  }

  Map<String, dynamic> installmentJson({
    required int number,
    required double amount,
    double paid = 0,
    String status = 'PENDING',
  }) {
    return {
      'id': 'i$number',
      'loanId': 'l1',
      'installmentNumber': number,
      'dueDate': '2026-0$number-10T00:00:00.000Z',
      'amount': amount,
      'paidAmount': paid,
      'status': status,
    };
  }

  test('lê o devedor e as parcelas aninhadas', () {
    final loan = Loan.fromJson(loanJson(
      installments: [installmentJson(number: 1, amount: 650)],
    ));

    expect(loan.borrower.name, 'Maria Souza');
    expect(loan.frequency, PaymentFrequency.monthly);
    expect(loan.status, LoanStatus.active);
    expect(loan.installments, hasLength(1));
  });

  test('totaliza a partir das parcelas', () {
    final loan = Loan.fromJson(loanJson(installments: [
      installmentJson(number: 1, amount: 650, paid: 650, status: 'PAID'),
      installmentJson(number: 2, amount: 650),
    ]));

    expect(loan.installmentsTotal, 1300);
    expect(loan.paidAmount, 650);
    expect(loan.outstanding, 650);
    expect(loan.paidCount, 1);
    expect(loan.progress, 0.5);
  });

  test('detecta atraso em qualquer parcela', () {
    final loan = Loan.fromJson(loanJson(installments: [
      installmentJson(number: 1, amount: 650, status: 'OVERDUE'),
      installmentJson(number: 2, amount: 650),
    ]));

    expect(loan.hasOverdue, isTrue);
    expect(loan.nextInstallment?.installmentNumber, 1);
  });

  test('status desconhecido não some da tela', () {
    final loan = Loan.fromJson(loanJson(status: 'FUTURO_DESCONHECIDO'));
    expect(loan.status, LoanStatus.active);
  });

  test('parcela sem devedor aninhado usa o dono informado', () {
    final loan = Loan.fromJson(
      {
        'id': 'l2',
        'originalAmount': 500,
        'installments': const [],
      },
      owner: null,
    );
    // Sem owner e sem borrower vira o placeholder, mas não quebra.
    expect(loan.borrower.name, 'Cliente');
  });

  test('InstallmentStatus.remaining desconta o parcial', () {
    final installment = Installment.fromJson(
      installmentJson(number: 1, amount: 500, paid: 200, status: 'PARTIAL'),
    );
    expect(installment.status, InstallmentStatus.partial);
    expect(installment.remaining, 300);
  });
}
