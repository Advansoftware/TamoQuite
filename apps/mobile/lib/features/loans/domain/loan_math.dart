/// Matemática do empréstimo, espelhando `apps/api/src/loans/loan-math.ts`.
///
/// Juros **simples** sobre o valor emprestado: total = principal × (1 + taxa ×
/// nº de períodos). O app calcula o mesmo total que o servidor gravaria e o
/// envia explícito — derivar da taxa arredondada em 2 casas transformaria um
/// contrato de R$250 em 249,98.
library;

double _roundCents(double value) => (value * 100).round() / 100;

/// Total a receber a partir de uma taxa por período (em %).
double totalFromRate(double principal, double ratePercent, int installments) {
  final periodRate = ratePercent / 100;
  return _roundCents(principal * (1 + periodRate * installments));
}

/// Taxa por período (em %) que leva o principal ao total informado. É o inverso
/// de [totalFromRate], usado no modo "informar o total".
double rateFromTotal(double principal, double total, int installments) {
  if (principal <= 0 || installments <= 0) return 0;
  final rate = ((total / principal) - 1) / installments * 100;
  return rate <= 0 ? 0 : (rate * 100).round() / 100;
}

/// Avança uma data em `count` períodos, igual a `addPeriods` do servidor:
/// semanal = +7 dias, quinzenal = **+15** dias, mensal = +1 mês de calendário.
DateTime addPeriods(DateTime base, String frequency, int count) {
  return switch (frequency) {
    'WEEKLY' => DateTime(base.year, base.month, base.day + 7 * count),
    'BIWEEKLY' => DateTime(base.year, base.month, base.day + 15 * count),
    _ => DateTime(base.year, base.month + count, base.day),
  };
}

/// Cronograma padrão: a primeira parcela vence em [start] e cada uma cai um
/// período depois. É o mesmo que o servidor gera quando `dueDates` é omitido.
List<DateTime> buildSchedule(DateTime start, String frequency, int count) {
  return List.generate(count, (index) => addPeriods(start, frequency, index));
}

/// Divide o total em parcelas que somam exatamente o total, distribuindo os
/// centavos que sobram nas primeiras — igual a `splitIntoInstallments`.
List<double> splitIntoInstallments(double total, int count) {
  if (count <= 0) return const [];
  final totalCents = (total * 100).round();
  final base = totalCents ~/ count;
  final remainder = totalCents - base * count;
  return List.generate(
    count,
    (index) => (base + (index < remainder ? 1 : 0)) / 100,
  );
}
