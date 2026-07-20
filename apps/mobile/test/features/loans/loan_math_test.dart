import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/features/loans/domain/loan_math.dart';

/// Espelha `apps/api/src/loans/loan-math.ts`. O app precisa calcular o mesmo
/// total que o servidor gravaria — é o que evita o contrato de R$250 virar
/// 249,98 ao ser derivado de uma taxa arredondada.
void main() {
  group('totalFromRate', () {
    test('juros simples sobre o principal', () {
      // 1000 × (1 + 0,10 × 3) = 1300.
      expect(totalFromRate(1000, 10, 3), 1300);
    });

    test('taxa zero devolve o próprio principal', () {
      expect(totalFromRate(1000, 0, 4), 1000);
    });

    test('arredonda para centavos', () {
      // 100 × (1 + 0,0833 × 1) = 108,33.
      expect(totalFromRate(100, 8.33, 1), 108.33);
    });
  });

  group('rateFromTotal', () {
    test('inverte totalFromRate', () {
      expect(rateFromTotal(1000, 1300, 3), 10);
    });

    test('total igual ao principal é taxa zero', () {
      expect(rateFromTotal(1000, 1000, 2), 0);
    });

    test('total abaixo do principal não vira taxa negativa', () {
      expect(rateFromTotal(1000, 900, 2), 0);
    });

    test('principal inválido não divide por zero', () {
      expect(rateFromTotal(0, 500, 3), 0);
    });
  });

  group('addPeriods / buildSchedule', () {
    test('semanal soma 7 dias por período', () {
      final schedule = buildSchedule(DateTime(2026, 1, 1), 'WEEKLY', 3);
      expect(schedule, [
        DateTime(2026, 1, 1),
        DateTime(2026, 1, 8),
        DateTime(2026, 1, 15),
      ]);
    });

    test('quinzenal soma 15 dias (não 14), como o servidor', () {
      final schedule = buildSchedule(DateTime(2026, 1, 1), 'BIWEEKLY', 2);
      expect(schedule, [DateTime(2026, 1, 1), DateTime(2026, 1, 16)]);
    });

    test('mensal anda de mês em mês', () {
      final schedule = buildSchedule(DateTime(2026, 1, 10), 'MONTHLY', 3);
      expect(schedule, [
        DateTime(2026, 1, 10),
        DateTime(2026, 2, 10),
        DateTime(2026, 3, 10),
      ]);
    });
  });

  group('splitIntoInstallments', () {
    test('soma exatamente o total, distribuindo os centavos', () {
      final parts = splitIntoInstallments(250, 3);
      expect(parts, [83.34, 83.33, 83.33]);
      expect(parts.reduce((a, b) => a + b), closeTo(250, 1e-9));
    });

    test('divisão exata reparte igual', () {
      expect(splitIntoInstallments(300, 3), [100, 100, 100]);
    });

    test('contagem inválida devolve lista vazia', () {
      expect(splitIntoInstallments(100, 0), isEmpty);
    });
  });
}
