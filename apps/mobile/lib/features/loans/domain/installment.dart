import 'package:flutter/material.dart';

import '../../../core/theme/app_brand_colors.dart';
import '../../../core/utils/json.dart';

/// Situação de uma parcela — os mesmos valores gravados em
/// `Installment.status` (ver `apps/api/prisma/schema.prisma`).
enum InstallmentStatus {
  pending('PENDING', 'Pendente'),
  partial('PARTIAL', 'Parcial'),
  paid('PAID', 'Pago'),
  overdue('OVERDUE', 'Atrasado');

  const InstallmentStatus(this.wireValue, this.label);

  /// Valor trocado com a API.
  final String wireValue;

  /// Rótulo em pt-BR, igual ao `getStatusLabel` do site.
  final String label;

  /// Status desconhecido cai em [pending], como no site — uma parcela nunca
  /// deve sumir da tela só porque o servidor ganhou um estado novo.
  static InstallmentStatus fromWire(Object? value) {
    return InstallmentStatus.values.firstWhere(
      (status) => status.wireValue == value,
      orElse: () => InstallmentStatus.pending,
    );
  }

  /// Cor do status, espelhando `getStatusBgColor` do site.
  Color color(ThemeData theme) => switch (this) {
    InstallmentStatus.paid => theme.brand.neon,
    InstallmentStatus.partial => theme.brand.warning,
    InstallmentStatus.overdue => theme.colorScheme.error,
    InstallmentStatus.pending => theme.brand.mutedForeground,
  };

  bool get isPaid => this == InstallmentStatus.paid;
  bool get isOverdue => this == InstallmentStatus.overdue;
}

/// Parcela de um contrato (`GET /api/loans/:id` → `installments[]`).
class Installment {
  const Installment({
    required this.id,
    required this.loanId,
    required this.installmentNumber,
    required this.dueDate,
    required this.amount,
    required this.paidAmount,
    required this.status,
    required this.paidAt,
    required this.doNotCharge,
  });

  final String id;
  final String loanId;
  final int installmentNumber;
  final DateTime dueDate;
  final double amount;
  final double paidAmount;
  final InstallmentStatus status;
  final DateTime? paidAt;

  /// Parcela marcada para não ser cobrada automaticamente.
  final bool doNotCharge;

  /// Quanto ainda falta — é isso que as listas mostram quando houve
  /// pagamento parcial, não o valor cheio.
  double get remaining => (amount - paidAmount).clamp(0, double.infinity);

  factory Installment.fromJson(Map<String, dynamic> json) {
    return Installment(
      id: asString(json['id']),
      loanId: asString(json['loanId']),
      installmentNumber: asInt(json['installmentNumber']),
      dueDate: asDate(json['dueDate']) ?? DateTime.now(),
      amount: asDouble(json['amount']),
      paidAmount: asDouble(json['paidAmount']),
      status: InstallmentStatus.fromWire(json['status']),
      paidAt: asDate(json['paidAt']),
      doNotCharge: asBool(json['doNotCharge']),
    );
  }
}
