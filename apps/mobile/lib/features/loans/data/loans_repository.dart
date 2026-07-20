import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/core_providers.dart';
import '../../../core/utils/formatters.dart';
import '../domain/installment.dart';
import '../domain/loan.dart';

/// Acesso a `/api/loans` e `/api/installments` — JWT + assinatura ativa.
class LoansRepository {
  const LoansRepository(this._client);

  final ApiClient _client;

  /// Contratos vivos de clientes ativos (`VISIBLE_LOAN` em `loans.service.ts`).
  /// Contratos de um cliente desativado não aparecem aqui — só pela tela do
  /// próprio cliente.
  Future<List<Loan>> list() async {
    final data = await _client.getList('/api/loans');
    return data.map(Loan.fromJson).toList(growable: false);
  }

  Future<Loan> get(String id) async {
    return Loan.fromJson(await _client.get('/api/loans/$id'));
  }

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
    final data = await _client.post('/api/loans', {
      'borrowerId': borrowerId,
      'originalAmount': originalAmount,
      'interestRate': interestRate,
      // O total viaja explícito: derivá-lo de uma taxa arredondada em 2 casas
      // transforma um contrato de R$250 em 249,98 (ver `create-loan.dto.ts`).
      'totalAmount': totalAmount,
      'installmentCount': installmentCount,
      'startDate': Formatters.isoDate(startDate),
      'frequency': frequency.wireValue,
      // Só quando o usuário mexeu nas datas: senão o servidor as gera pela
      // periodicidade a partir de `startDate`.
      if (dueDates != null)
        'dueDates': dueDates.map(Formatters.isoDate).toList(growable: false),
    });
    return Loan.fromJson(data);
  }

  /// `PATCH /api/loans/:id` — corrige um contrato digitado errado. Manda só o
  /// que mudou; o servidor reconstrói as parcelas quando o dinheiro muda e
  /// **recusa** isso se algo já foi pago (mensagem própria da API). Trocar de
  /// cliente ou corrigir datas é sempre permitido.
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
    final data = await _client.patch('/api/loans/$id', {
      // Valor nulo omite a entrada: o servidor só toca no que foi enviado.
      'borrowerId': ?borrowerId,
      'originalAmount': ?originalAmount,
      'interestRate': ?interestRate,
      'totalAmount': ?totalAmount,
      'installmentCount': ?installmentCount,
      if (startDate != null) 'startDate': Formatters.isoDate(startDate),
      if (frequency != null) 'frequency': frequency.wireValue,
      if (dueDates != null)
        'dueDates': dueDates.map(Formatters.isoDate).toList(growable: false),
    });
    return Loan.fromJson(data);
  }

  /// `PUT /api/loans/:id/billing` — como este contrato é cobrado.
  /// `whatsappMode` nulo = herda das configurações do usuário.
  Future<void> updateBilling(
    String id, {
    required bool doNotCharge,
    required String? whatsappMode,
  }) => _client.put('/api/loans/$id/billing', {
    'doNotCharge': doNotCharge,
    'whatsappMode': whatsappMode,
  });

  /// `DELETE /api/loans/:id` — soft delete no banco, mas **definitivo para o
  /// usuário**: o contrato some com as parcelas e as cobranças, o link público
  /// é revogado, as mensagens na fila são canceladas e não existe rota de
  /// restauração. As linhas ficam só para auditoria.
  Future<void> remove(String id) => _client.delete('/api/loans/$id');

  /// Quita a parcela. Sem `paidAmount`, o servidor usa o valor cheio dela.
  Future<void> markInstallmentPaid(String installmentId) =>
      _client.put('/api/installments/$installmentId', {
        'status': InstallmentStatus.paid.wireValue,
      });

  /// Registra um pagamento parcial; o servidor soma ao que já havia sido pago
  /// e recalcula o status (`PARTIAL`, ou `PAID` se fechar o valor). Recusa
  /// valor que exceda o restante ou parcela já quitada.
  Future<void> addPartialPayment(String installmentId, double amount) =>
      _client.post('/api/installments/$installmentId/partial-payments', {
        'amount': amount,
      });

  /// Zera os pagamentos da parcela: apaga os pagamentos parciais e a devolve
  /// a `PENDING`. Não é "desfazer o último" — limpa tudo. O servidor recusa
  /// quando a parcela já está em `PENDING`.
  Future<void> undoPayment(String installmentId) =>
      _client.post('/api/installments/$installmentId/undo-payment');

  /// Move o vencimento de uma única parcela — usado quando o devedor combina
  /// pagar em outro dia. As outras parcelas ficam onde estão. O servidor recusa
  /// mover uma parcela já quitada.
  Future<void> setInstallmentDueDate(String installmentId, DateTime dueDate) =>
      _client.patch('/api/installments/$installmentId/due-date', {
        'dueDate': Formatters.isoDate(dueDate),
      });

  /// Rola uma parcela **parcial**: o que já foi pago vira uma parcela de juros
  /// quitada e a parcela original (com o saldo) é empurrada um período à frente,
  /// junto com as seguintes. Só vale para parcelas em `PARTIAL`.
  Future<void> rollRemaining(String installmentId) =>
      _client.post('/api/installments/$installmentId/roll-remaining');

  /// Registra o pagamento de juros de uma parcela. Com [rollImmediately], já
  /// empurra a parcela (e as seguintes) um período à frente; sem ele, apenas
  /// marca a parcela como parcial com o valor do juro.
  Future<void> payInterest(
    String installmentId,
    double interestAmount, {
    required bool rollImmediately,
  }) => _client.post('/api/installments/$installmentId/pay-interest', {
    'interestAmount': interestAmount,
    'rollImmediately': rollImmediately,
  });

  /// Silencia ou reativa a cobrança automática de uma única parcela.
  Future<void> setInstallmentCharge(
    String installmentId, {
    required bool doNotCharge,
  }) => _client.patch('/api/installments/$installmentId/charge', {
    'doNotCharge': doNotCharge,
  });
}

final loansRepositoryProvider = Provider<LoansRepository>((ref) {
  return LoansRepository(ref.watch(apiClientProvider));
});
