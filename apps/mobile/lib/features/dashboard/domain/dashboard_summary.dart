/// Resposta de `GET /api/dashboard`
/// (ver `apps/api/src/dashboard/dashboard.controller.ts`).
class DashboardSummary {
  const DashboardSummary({
    required this.totalMonthly,
    required this.totalMonthlyPending,
    required this.receivedMonthly,
    required this.totalOutstanding,
    required this.activeLoans,
    required this.overdueCount,
    required this.upcomingInstallments,
    required this.overdueInstallments,
  });

  /// Soma das parcelas com vencimento no mês corrente.
  final double totalMonthly;

  /// Quanto ainda falta receber das parcelas do mês.
  final double totalMonthlyPending;

  /// Quanto entrou no mês corrente.
  final double receivedMonthly;

  /// Saldo em aberto de todas as parcelas não quitadas.
  final double totalOutstanding;

  final int activeLoans;
  final int overdueCount;

  /// Parcelas a vencer nos próximos 15 dias (máx. 10).
  final List<InstallmentSummary> upcomingInstallments;

  /// Parcelas vencidas (máx. 10).
  final List<InstallmentSummary> overdueInstallments;

  /// Proporção recebida do mês, entre 0 e 1.
  double get monthlyProgress {
    if (totalMonthly <= 0) return 0;
    return (receivedMonthly / totalMonthly).clamp(0.0, 1.0);
  }

  bool get isEmpty =>
      activeLoans == 0 &&
      totalOutstanding == 0 &&
      upcomingInstallments.isEmpty &&
      overdueInstallments.isEmpty;

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      totalMonthly: _toDouble(json['totalMonthly']),
      totalMonthlyPending: _toDouble(json['totalMonthlyPending']),
      receivedMonthly: _toDouble(json['receivedMonthly']),
      totalOutstanding: _toDouble(json['totalOutstanding']),
      activeLoans: _toInt(json['activeLoans']),
      overdueCount: _toInt(json['overdueCount']),
      upcomingInstallments: _parseInstallments(json['upcomingInstallments']),
      overdueInstallments: _parseInstallments(json['overdueInstallments']),
    );
  }

  static List<InstallmentSummary> _parseInstallments(Object? raw) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map<String, dynamic>>()
        .map(InstallmentSummary.fromJson)
        .toList(growable: false);
  }
}

/// Parcela exibida nas listas de "a vencer" e "atrasadas".
class InstallmentSummary {
  const InstallmentSummary({
    required this.id,
    required this.installmentNumber,
    required this.dueDate,
    required this.amount,
    required this.paidAmount,
    required this.status,
    required this.borrowerName,
    required this.loanId,
  });

  final String id;
  final int installmentNumber;
  final DateTime dueDate;
  final double amount;
  final double paidAmount;

  /// `PENDING`, `OVERDUE` ou `PAID`.
  final String status;

  final String borrowerName;
  final String loanId;

  bool get isOverdue => status == 'OVERDUE';

  /// Quanto falta desta parcela — o site exibe o saldo, não o valor cheio,
  /// quando houve pagamento parcial.
  double get remaining => (amount - paidAmount).clamp(0, double.infinity);

  factory InstallmentSummary.fromJson(Map<String, dynamic> json) {
    return InstallmentSummary(
      id: json['id'] as String? ?? '',
      installmentNumber: _toInt(json['installmentNumber']),
      dueDate: DateTime.tryParse(json['dueDate']?.toString() ?? '')?.toLocal() ??
          DateTime.now(),
      amount: _toDouble(json['amount']),
      paidAmount: _toDouble(json['paidAmount']),
      status: json['status'] as String? ?? 'PENDING',
      borrowerName: json['borrowerName'] as String? ?? '',
      loanId: json['loanId'] as String? ?? '',
    );
  }
}

// O Prisma serializa valores monetários como number, mas MySQL pode devolver
// decimais como string dependendo do driver — daí a coerção defensiva.
double _toDouble(Object? value) => switch (value) {
  final num n => n.toDouble(),
  final String s => double.tryParse(s) ?? 0,
  _ => 0,
};

int _toInt(Object? value) => switch (value) {
  final num n => n.toInt(),
  final String s => int.tryParse(s) ?? 0,
  _ => 0,
};
