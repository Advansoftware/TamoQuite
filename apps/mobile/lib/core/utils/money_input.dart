/// Entrada de valores em pt-BR nos formulários.
///
/// O teclado numérico do aparelho pode produzir tanto vírgula quanto ponto
/// como separador decimal, e o usuário digita milhar com ponto. Centralizar a
/// leitura evita que cada campo reinvente (e erre) essa conversão.
abstract final class MoneyInput {
  const MoneyInput._();

  /// Lê "1.234,56" e "1234.56" como `1234.56`. Vazio ou inválido → 0.
  static double parse(String raw) {
    final text = raw.trim();
    if (text.isEmpty) return 0;
    if (text.contains(',')) {
      // pt-BR: ponto é milhar, vírgula é decimal.
      return double.tryParse(text.replaceAll('.', '').replaceAll(',', '.')) ?? 0;
    }
    return double.tryParse(text) ?? 0;
  }

  /// Valor de volta para um campo editável: inteiro sem casas, fracionário com
  /// vírgula ("1000" / "2,5"). Serve para pré-preencher a correção de contrato.
  static String editable(double value) {
    if (value == value.roundToDouble()) return value.toStringAsFixed(0);
    return value.toString().replaceAll('.', ',');
  }
}
