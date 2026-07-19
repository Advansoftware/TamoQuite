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
    });
    return Loan.fromJson(data);
  }

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
}

final loansRepositoryProvider = Provider<LoansRepository>((ref) {
  return LoansRepository(ref.watch(apiClientProvider));
});
