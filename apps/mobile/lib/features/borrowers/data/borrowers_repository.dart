import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/core_providers.dart';
import '../../../core/utils/phone.dart';
import '../domain/borrower.dart';
import '../domain/borrower_detail.dart';

/// Acesso a `/api/borrowers` — todas as rotas exigem JWT + assinatura ativa.
class BorrowersRepository {
  const BorrowersRepository(this._client);

  final ApiClient _client;

  Future<List<Borrower>> list(BorrowerFilter filter) async {
    final data = await _client.getList(
      '/api/borrowers',
      query: {'status': filter.wireValue},
    );
    return data.map(Borrower.fromJson).toList(growable: false);
  }

  Future<BorrowerDetail> get(String id) async {
    return BorrowerDetail.fromJson(await _client.get('/api/borrowers/$id'));
  }

  Future<Borrower> create({
    required String name,
    required String whatsapp,
    String? notes,
  }) async {
    final data = await _client.post('/api/borrowers', {
      'name': name,
      'whatsapp': whatsapp,
      if (notes != null && notes.isNotEmpty) 'notes': notes,
    });
    return Borrower.fromJson(data);
  }

  /// O `UpdateBorrowerDto` é parcial: o servidor só toca no que foi enviado.
  /// `notes` vai sempre — mandar string vazia é como o usuário limpa o campo.
  Future<Borrower> update(
    String id, {
    required String name,
    required String whatsapp,
    required String notes,
  }) async {
    final data = await _client.put('/api/borrowers/$id', {
      'name': name,
      'whatsapp': whatsapp,
      'notes': notes,
    });
    return Borrower.fromJson(data);
  }

  /// `DELETE /api/borrowers/:id` **desativa** o cliente, não apaga nada: os
  /// contratos, parcelas e cobranças dele saem das listas e dos totais e ele
  /// passa a viver na aba "Desativados". [reactivate] desfaz por completo.
  Future<void> deactivate(String id) => _client.delete('/api/borrowers/$id');

  Future<void> reactivate(String id) =>
      _client.post('/api/borrowers/$id/reactivate');
}

/// Normaliza o telefone antes de enviar: a API grava só dígitos, e o campo do
/// app trabalha com a máscara de exibição.
String borrowerWhatsappPayload(PhoneNumber phone) => phone.e164Digits;

final borrowersRepositoryProvider = Provider<BorrowersRepository>((ref) {
  return BorrowersRepository(ref.watch(apiClientProvider));
});
