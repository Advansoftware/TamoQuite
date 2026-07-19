import '../../../core/utils/json.dart';
import '../../../core/utils/phone.dart';

/// Cliente/devedor (`GET /api/borrowers`).
///
/// A listagem traz dois agregados que a tela usa e o detalhe não repete:
/// `_count.loans` (contratos vivos) e, dentro de `loans[]`, apenas o status
/// das parcelas — o suficiente para marcar quem está atrasado sem baixar o
/// contrato inteiro.
class Borrower {
  const Borrower({
    required this.id,
    required this.name,
    required this.whatsapp,
    required this.notes,
    required this.isActive,
    required this.loanCount,
    required this.hasOverdue,
  });

  final String id;
  final String name;

  /// Dígitos internacionais, como a API grava (ex.: `5511999999999`).
  final String whatsapp;

  final String? notes;

  /// `false` para clientes desativados — o soft delete de `DELETE
  /// /api/borrowers/:id`, reversível pelo endpoint de reativação.
  final bool isActive;

  /// Contratos não excluídos deste cliente.
  final int loanCount;

  /// Tem ao menos uma parcela atrasada em algum contrato vivo.
  final bool hasOverdue;

  PhoneNumber get phone => PhoneNumber.parse(whatsapp);

  /// Placeholder para quando um contrato vier sem o objeto `borrower`
  /// aninhado — a tela mostra o contrato em vez de quebrar.
  factory Borrower.unknown(String id) => Borrower(
    id: id,
    name: 'Cliente',
    whatsapp: '',
    notes: null,
    isActive: true,
    loanCount: 0,
    hasOverdue: false,
  );

  factory Borrower.fromJson(Map<String, dynamic> json) {
    final notes = json['notes'] as String?;
    final count = json['_count'];

    return Borrower(
      id: asString(json['id']),
      name: asString(json['name']),
      whatsapp: asString(json['whatsapp']),
      notes: (notes == null || notes.isEmpty) ? null : notes,
      // Ausente no objeto aninhado em um contrato; nesse caso o cliente está
      // ativo por construção, já que a listagem de contratos filtra por isso.
      isActive: json.containsKey('isActive') ? asBool(json['isActive']) : true,
      loanCount: count is Map<String, dynamic> ? asInt(count['loans']) : 0,
      hasOverdue: _hasOverdue(json['loans']),
    );
  }

  /// `loans[].installments[].status` — a listagem projeta só o status.
  static bool _hasOverdue(Object? loans) {
    if (loans is! List) return false;
    return loans.whereType<Map<String, dynamic>>().any((loan) {
      final installments = loan['installments'];
      if (installments is! List) return false;
      return installments
          .whereType<Map<String, dynamic>>()
          .any((installment) => installment['status'] == 'OVERDUE');
    });
  }
}

/// Aba da listagem de clientes — o mesmo `status` que
/// `GET /api/borrowers?status=` aceita.
enum BorrowerFilter {
  active('active', 'Ativos'),
  inactive('inactive', 'Desativados');

  const BorrowerFilter(this.wireValue, this.label);

  final String wireValue;
  final String label;
}
