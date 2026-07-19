/// Telefones, espelhando `apps/web/src/lib/phone.ts`.
///
/// O valor é sempre guardado como dígitos internacionais (código do país +
/// número nacional, sem "+"), ex.: `5511999999999`. A exibição omite o código
/// do país — a bandeira já identifica de onde é — e o envio ao WhatsApp usa
/// [PhoneNumber.e164Digits].
library;

/// País suportado no cadastro de WhatsApp.
class PhoneCountry {
  const PhoneCountry({
    required this.iso,
    required this.name,
    required this.dial,
    required this.flag,
    required this.maxNational,
    required this.placeholder,
    required List<int> groups,
    this.formatter,
  }) : _groups = groups;

  final String iso;
  final String name;

  /// Código de discagem, só dígitos e sem "+".
  final String dial;
  final String flag;

  /// Tamanho máximo do número nacional, em dígitos.
  final int maxNational;
  final String placeholder;

  final List<int> _groups;

  /// Máscara própria, quando o país não é um simples agrupamento por espaços.
  final String Function(String national)? formatter;

  /// Formata o número nacional para exibição/digitação.
  String format(String national) {
    final digits = national.length > maxNational
        ? national.substring(0, maxNational)
        : national;
    if (digits.isEmpty) return '';
    return formatter?.call(digits) ?? _group(digits, _groups);
  }
}

/// Agrupa dígitos em blocos de tamanho fixo separados por espaço; o que sobra
/// vira um bloco extra em vez de ser descartado.
String _group(String digits, List<int> groups) {
  final parts = <String>[];
  var index = 0;
  for (final size in groups) {
    if (index >= digits.length) break;
    final end = index + size;
    parts.add(digits.substring(index, end > digits.length ? digits.length : end));
    index = end;
  }
  if (index < digits.length) parts.add(digits.substring(index));
  return parts.join(' ');
}

/// Brasil: (XX) XXXXX-XXXX. A máscara é de celular porque o WhatsApp não usa
/// fixo, e ela precisa funcionar já durante a digitação.
String _formatBr(String d) {
  if (d.length <= 2) return '($d';
  final ddd = d.substring(0, 2);
  final rest = d.substring(2);
  if (rest.length <= 5) return '($ddd) $rest';
  return '($ddd) ${rest.substring(0, 5)}-${rest.substring(5)}';
}

/// EUA/Canadá: (XXX) XXX-XXXX.
String _formatUs(String d) {
  if (d.length <= 3) return '($d';
  if (d.length <= 6) return '(${d.substring(0, 3)}) ${d.substring(3)}';
  return '(${d.substring(0, 3)}) ${d.substring(3, 6)}-${d.substring(6)}';
}

/// Mesma lista e mesma ordem do site — Brasil primeiro (padrão).
const kPhoneCountries = <PhoneCountry>[
  PhoneCountry(
    iso: 'BR',
    name: 'Brasil',
    dial: '55',
    flag: '🇧🇷',
    groups: [],
    formatter: _formatBr,
    maxNational: 11,
    placeholder: '(11) 91234-5678',
  ),
  PhoneCountry(
    iso: 'PT',
    name: 'Portugal',
    dial: '351',
    flag: '🇵🇹',
    groups: [3, 3, 3],
    maxNational: 9,
    placeholder: '912 345 678',
  ),
  PhoneCountry(
    iso: 'US',
    name: 'Estados Unidos',
    dial: '1',
    flag: '🇺🇸',
    groups: [],
    formatter: _formatUs,
    maxNational: 10,
    placeholder: '(201) 555-0123',
  ),
  PhoneCountry(
    iso: 'AR',
    name: 'Argentina',
    dial: '54',
    flag: '🇦🇷',
    groups: [2, 4, 4],
    maxNational: 11,
    placeholder: '11 2345 6789',
  ),
  PhoneCountry(
    iso: 'PY',
    name: 'Paraguai',
    dial: '595',
    flag: '🇵🇾',
    groups: [3, 3, 3],
    maxNational: 9,
    placeholder: '961 234 567',
  ),
  PhoneCountry(
    iso: 'UY',
    name: 'Uruguai',
    dial: '598',
    flag: '🇺🇾',
    groups: [2, 3, 3],
    maxNational: 8,
    placeholder: '91 234 567',
  ),
  PhoneCountry(
    iso: 'CL',
    name: 'Chile',
    dial: '56',
    flag: '🇨🇱',
    groups: [1, 4, 4],
    maxNational: 9,
    placeholder: '9 1234 5678',
  ),
  PhoneCountry(
    iso: 'CO',
    name: 'Colômbia',
    dial: '57',
    flag: '🇨🇴',
    groups: [3, 3, 4],
    maxNational: 10,
    placeholder: '321 234 5678',
  ),
  PhoneCountry(
    iso: 'MX',
    name: 'México',
    dial: '52',
    flag: '🇲🇽',
    groups: [2, 4, 4],
    maxNational: 10,
    placeholder: '55 1234 5678',
  ),
  PhoneCountry(
    iso: 'BO',
    name: 'Bolívia',
    dial: '591',
    flag: '🇧🇴',
    groups: [8],
    maxNational: 8,
    placeholder: '71234567',
  ),
  PhoneCountry(
    iso: 'PE',
    name: 'Peru',
    dial: '51',
    flag: '🇵🇪',
    groups: [3, 3, 3],
    maxNational: 9,
    placeholder: '912 345 678',
  ),
  PhoneCountry(
    iso: 'ES',
    name: 'Espanha',
    dial: '34',
    flag: '🇪🇸',
    groups: [3, 3, 3],
    maxNational: 9,
    placeholder: '612 345 678',
  ),
];

const kDefaultPhoneCountry = kPhoneCountries[0];

/// Um telefone já separado em país + número nacional.
class PhoneNumber {
  const PhoneNumber({required this.country, required this.national});

  final PhoneCountry country;
  final String national;

  bool get isEmpty => national.isEmpty;

  /// Dígitos internacionais completos (código + nacional), sem "+".
  String get e164Digits => national.isEmpty ? '' : country.dial + national;

  /// Como aparece em listas e cartões: bandeira + número nacional formatado.
  String get display =>
      national.isEmpty ? '' : '${country.flag} ${country.format(national)}';

  /// Separa um valor armazenado em país + número nacional.
  ///
  /// Trata os números brasileiros antigos, gravados sem o código do país.
  factory PhoneNumber.parse(String? value) {
    final digits = onlyDigits(value ?? '');
    if (digits.isEmpty) {
      return const PhoneNumber(country: kDefaultPhoneCountry, national: '');
    }

    // Legado BR: 10–11 dígitos gravados sem código de país.
    if (!digits.startsWith('55') && digits.length <= 11) {
      return PhoneNumber(country: kDefaultPhoneCountry, national: digits);
    }

    // Brasil explícito (12–13 dígitos, com o "55").
    if (digits.startsWith('55') && digits.length >= 12 && digits.length <= 13) {
      return PhoneNumber(
        country: kDefaultPhoneCountry,
        national: digits.substring(2),
      );
    }

    // Senão, casa o código de discagem mais longo que der — "1" (EUA) não pode
    // ganhar de "51" (Peru) só por vir antes na lista.
    final byLongestDial = [...kPhoneCountries]
      ..sort((a, b) => b.dial.length.compareTo(a.dial.length));
    for (final country in byLongestDial) {
      if (digits.startsWith(country.dial)) {
        return PhoneNumber(
          country: country,
          national: digits.substring(country.dial.length),
        );
      }
    }

    return PhoneNumber(country: kDefaultPhoneCountry, national: digits);
  }
}

String onlyDigits(String value) => value.replaceAll(RegExp(r'\D'), '');
