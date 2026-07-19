import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/features/dashboard/domain/dashboard_summary.dart';

/// A resposta de `GET /api/dashboard` mistura números e datas ISO vindas do
/// Prisma. Estes testes cobrem a coerção defensiva e os cálculos derivados.
void main() {
  group('DashboardSummary.fromJson', () {
    test('lê o payload completo do endpoint', () {
      final summary = DashboardSummary.fromJson(const {
        'totalMonthly': 5000.0,
        'totalMonthlyPending': 1500.5,
        'receivedMonthly': 3499.5,
        'totalOutstanding': 12000.0,
        'activeLoans': 7,
        'overdueCount': 2,
        'upcomingInstallments': [
          {
            'id': 'i1',
            'installmentNumber': 3,
            'dueDate': '2026-08-10T00:00:00.000Z',
            'amount': 500.0,
            'status': 'PENDING',
            'paidAmount': 0,
            'borrowerName': 'Maria',
            'loanId': 'l1',
          },
        ],
        'overdueInstallments': [],
      });

      expect(summary.totalMonthly, 5000.0);
      expect(summary.activeLoans, 7);
      expect(summary.upcomingInstallments, hasLength(1));
      expect(summary.upcomingInstallments.first.borrowerName, 'Maria');
      expect(summary.overdueInstallments, isEmpty);
    });

    test('converte valores enviados como string', () {
      final summary = DashboardSummary.fromJson(const {
        'totalMonthly': '1000.50',
        'activeLoans': '3',
      });

      expect(summary.totalMonthly, 1000.5);
      expect(summary.activeLoans, 3);
    });

    test('usa zero para campos ausentes ou inválidos', () {
      final summary = DashboardSummary.fromJson(const {});

      expect(summary.totalMonthly, 0);
      expect(summary.totalOutstanding, 0);
      expect(summary.overdueCount, 0);
      expect(summary.upcomingInstallments, isEmpty);
      expect(summary.isEmpty, isTrue);
    });

    test('ignora entradas malformadas nas listas', () {
      final summary = DashboardSummary.fromJson(const {
        'upcomingInstallments': ['isto não é um objeto', 42],
      });

      expect(summary.upcomingInstallments, isEmpty);
    });
  });

  group('monthlyProgress', () {
    DashboardSummary build({required double total, required double received}) {
      return DashboardSummary.fromJson({
        'totalMonthly': total,
        'receivedMonthly': received,
      });
    }

    test('é a fração recebida do total', () {
      expect(build(total: 1000, received: 250).monthlyProgress, 0.25);
    });

    test('não divide por zero quando não há parcelas no mês', () {
      expect(build(total: 0, received: 0).monthlyProgress, 0);
    });

    test('satura em 1 quando recebe mais que o previsto', () {
      expect(build(total: 1000, received: 1500).monthlyProgress, 1.0);
    });
  });

  group('InstallmentSummary', () {
    InstallmentSummary build({double amount = 500, double paid = 0}) {
      return InstallmentSummary.fromJson({
        'id': 'i1',
        'installmentNumber': 1,
        'dueDate': '2026-08-10T00:00:00.000Z',
        'amount': amount,
        'paidAmount': paid,
        'status': 'PENDING',
        'borrowerName': 'João',
        'loanId': 'l1',
      });
    }

    test('remaining desconta o pagamento parcial', () {
      expect(build(amount: 500, paid: 200).remaining, 300);
    });

    test('remaining nunca fica negativo', () {
      expect(build(amount: 500, paid: 700).remaining, 0);
    });

    test('data inválida não quebra o parse', () {
      final installment = InstallmentSummary.fromJson(const {
        'id': 'i1',
        'dueDate': 'data-invalida',
      });

      expect(installment.dueDate, isA<DateTime>());
    });
  });
}
