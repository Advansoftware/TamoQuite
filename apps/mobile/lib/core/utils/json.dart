/// Coerções defensivas para os corpos JSON da API.
///
/// O Prisma serializa valores monetários como number, mas o driver do MySQL
/// pode devolver decimais como string dependendo da coluna — e datas chegam
/// como texto ISO. Ler tudo por estas funções evita que um `as double` estoure
/// a tela inteira por causa de um campo.
library;

double asDouble(Object? value) => switch (value) {
  final num n => n.toDouble(),
  final String s => double.tryParse(s) ?? 0,
  _ => 0,
};

int asInt(Object? value) => switch (value) {
  final num n => n.toInt(),
  final String s => int.tryParse(s) ?? 0,
  _ => 0,
};

bool asBool(Object? value) => switch (value) {
  final bool b => b,
  // MySQL devolve booleanos como 0/1 em algumas projeções.
  final num n => n != 0,
  'true' => true,
  _ => false,
};

String asString(Object? value) => value?.toString() ?? '';

/// Datas da API são ISO-8601 em UTC; a exibição é sempre no fuso do aparelho.
DateTime? asDate(Object? value) {
  final text = value?.toString();
  if (text == null || text.isEmpty) return null;
  return DateTime.tryParse(text)?.toLocal();
}

/// Lê uma lista de objetos aninhada, descartando o que não for objeto.
List<T> asList<T>(Object? raw, T Function(Map<String, dynamic>) parse) {
  if (raw is! List) return const [];
  return raw.whereType<Map<String, dynamic>>().map(parse).toList(growable: false);
}
