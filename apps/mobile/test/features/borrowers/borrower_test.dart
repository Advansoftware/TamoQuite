import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/features/borrowers/domain/borrower.dart';
import 'package:tamoquite/features/borrowers/domain/borrower_detail.dart';

/// `GET /api/borrowers` projeta agregados que a tela usa: `_count.loans` e o
/// status das parcelas de cada contrato (para marcar quem está atrasado).
void main() {
  group('Borrower.fromJson', () {
    test('lê contadores e o atraso derivado das parcelas', () {
      final borrower = Borrower.fromJson(const {
        'id': 'b1',
        'name': 'João Silva',
        'whatsapp': '5511912345678',
        'notes': 'Vizinho',
        'isActive': true,
        '_count': {'loans': 2},
        'loans': [
          {
            'installments': [
              {'status': 'PAID'},
              {'status': 'OVERDUE'},
            ],
          },
        ],
      });

      expect(borrower.name, 'João Silva');
      expect(borrower.loanCount, 2);
      expect(borrower.hasOverdue, isTrue);
      expect(borrower.notes, 'Vizinho');
    });

    test('sem parcela vencida não marca atraso', () {
      final borrower = Borrower.fromJson(const {
        'id': 'b1',
        'name': 'Ana',
        'whatsapp': '5511912345678',
        '_count': {'loans': 1},
        'loans': [
          {
            'installments': [
              {'status': 'PAID'},
              {'status': 'PENDING'},
            ],
          },
        ],
      });

      expect(borrower.hasOverdue, isFalse);
    });

    test('observação vazia vira nulo', () {
      final borrower = Borrower.fromJson(const {
        'id': 'b1',
        'name': 'Ana',
        'whatsapp': '5511912345678',
        'notes': '',
      });

      expect(borrower.notes, isNull);
    });
  });

  group('BorrowerDetail', () {
    test('soma os totais dos contratos', () {
      final detail = BorrowerDetail.fromJson(const {
        'id': 'b1',
        'name': 'João',
        'whatsapp': '5511912345678',
        'isActive': false,
        'loans': [
          {
            'id': 'l1',
            'originalAmount': 1000.0,
            'installments': [
              {'installmentNumber': 1, 'amount': 650.0, 'paidAmount': 650.0, 'status': 'PAID'},
              {'installmentNumber': 2, 'amount': 650.0, 'paidAmount': 0, 'status': 'OVERDUE'},
            ],
          },
        ],
      });

      expect(detail.borrower.isActive, isFalse);
      expect(detail.totalLent, 1000);
      expect(detail.totalToReceive, 1300);
      expect(detail.totalPaid, 650);
      expect(detail.outstanding, 650);
      expect(detail.overdueCount, 1);
      // O contrato herda o devedor da tela, mesmo sem `borrower` aninhado.
      expect(detail.loans.first.borrower.name, 'João');
    });
  });
}
