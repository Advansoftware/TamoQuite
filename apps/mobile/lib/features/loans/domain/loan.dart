import 'package:flutter/material.dart';

import '../../../core/theme/app_brand_colors.dart';
import '../../../core/utils/json.dart';
import '../../borrowers/domain/borrower.dart';
import 'installment.dart';

/// Situação do contrato (`Loan.status`).
///
/// `CANCELED` só existe em contratos já excluídos, que a API nunca devolve —
/// está aqui apenas para que um registro antigo não caia em um `orElse`
/// enganoso.
enum LoanStatus {
  active('ACTIVE', 'Ativo'),
  completed('COMPLETED', 'Concluído'),
  canceled('CANCELED', 'Cancelado');

  const LoanStatus(this.wireValue, this.label);

  final String wireValue;
  final String label;

  static LoanStatus fromWire(Object? value) {
    return LoanStatus.values.firstWhere(
      (status) => status.wireValue == value,
      orElse: () => LoanStatus.active,
    );
  }

  Color color(ThemeData theme) => switch (this) {
    LoanStatus.completed => theme.brand.neon,
    LoanStatus.canceled => theme.brand.mutedForeground,
    LoanStatus.active => theme.brand.mutedForeground,
  };
}

/// Periodicidade das parcelas (`Loan.paymentFrequency`), normalizada em
/// `apps/api/src/common/period.util.ts`.
enum PaymentFrequency {
  weekly('WEEKLY', 'Semanal'),
  biweekly('BIWEEKLY', 'Quinzenal'),
  monthly('MONTHLY', 'Mensal');

  const PaymentFrequency(this.wireValue, this.label);

  final String wireValue;
  final String label;

  static PaymentFrequency fromWire(Object? value) {
    return PaymentFrequency.values.firstWhere(
      (frequency) => frequency.wireValue == value,
      orElse: () => PaymentFrequency.monthly,
    );
  }
}

/// Contrato de empréstimo (`GET /api/loans` e `GET /api/loans/:id`).
class Loan {
  const Loan({
    required this.id,
    required this.borrower,
    required this.originalAmount,
    required this.interestRate,
    required this.totalAmount,
    required this.installmentCount,
    required this.startDate,
    required this.frequency,
    required this.status,
    required this.installments,
    required this.doNotCharge,
    required this.whatsappMode,
  });

  final String id;
  final Borrower borrower;

  /// Valor emprestado.
  final double originalAmount;

  /// Juros simples por período, em % (ver `loan-math.ts`).
  final double interestRate;

  /// Valor total a receber.
  final double totalAmount;

  final int installmentCount;
  final DateTime startDate;
  final PaymentFrequency frequency;
  final LoanStatus status;
  final List<Installment> installments;

  /// Contrato marcado como "não cobrar" nas configurações de cobrança.
  final bool doNotCharge;

  /// Modo de envio do contrato (`MANUAL` | `OWN` | `GLOBAL`); nulo herda as
  /// configurações do usuário. Ver `LoanBillingCard`.
  final String? whatsappMode;

  /// Soma das parcelas. O site totaliza a partir delas em vez de usar
  /// `totalAmount`, porque uma parcela rolada ou de juros muda o total do
  /// contrato sem reescrever o campo.
  double get installmentsTotal =>
      installments.fold(0, (sum, installment) => sum + installment.amount);

  double get paidAmount =>
      installments.fold(0, (sum, installment) => sum + installment.paidAmount);

  double get outstanding =>
      (installmentsTotal - paidAmount).clamp(0, double.infinity);

  int get paidCount => installments.where((i) => i.status.isPaid).length;

  bool get hasOverdue => installments.any((i) => i.status.isOverdue);

  /// Proporção quitada, entre 0 e 1 — em valor, não em número de parcelas.
  double get progress {
    final total = installmentsTotal;
    if (total <= 0) return 0;
    return (paidAmount / total).clamp(0.0, 1.0);
  }

  /// Próxima parcela a vencer: a primeira ainda não quitada, na ordem em que
  /// a API já devolve (`installmentNumber` crescente).
  Installment? get nextInstallment {
    for (final installment in installments) {
      if (!installment.status.isPaid) return installment;
    }
    return null;
  }

  /// [owner] cobre `GET /api/borrowers/:id`, onde os contratos vêm sem o
  /// objeto `borrower` aninhado — o cliente já é o dono da tela.
  factory Loan.fromJson(Map<String, dynamic> json, {Borrower? owner}) {
    final borrower = json['borrower'];

    return Loan(
      id: asString(json['id']),
      borrower: borrower is Map<String, dynamic>
          ? Borrower.fromJson(borrower)
          : owner ?? Borrower.unknown(asString(json['borrowerId'])),
      originalAmount: asDouble(json['originalAmount']),
      interestRate: asDouble(json['interestRate']),
      totalAmount: asDouble(json['totalAmount']),
      installmentCount: asInt(json['installmentCount']),
      startDate: asDate(json['startDate']) ?? DateTime.now(),
      frequency: PaymentFrequency.fromWire(json['paymentFrequency']),
      status: LoanStatus.fromWire(json['status']),
      installments: asList(json['installments'], Installment.fromJson),
      doNotCharge: asBool(json['doNotCharge']),
      whatsappMode: json['whatsappMode'] as String?,
    );
  }
}
