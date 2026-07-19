import 'package:flutter/widgets.dart';
import 'package:intl/intl.dart';

import 'phone.dart';

/// Formatação pt-BR, equivalente às funções de `apps/web/src/lib/helpers.ts`.
///
/// Os formatters são criados uma única vez: instanciar [NumberFormat] a cada
/// linha de lista é caro o suficiente para aparecer no scroll.
abstract final class Formatters {
  const Formatters._();

  static const _locale = 'pt_BR';

  static final _currency = NumberFormat.currency(
    locale: _locale,
    symbol: r'R$',
  );

  static final _date = DateFormat('dd/MM/yyyy', _locale);
  static final _dateShort = DateFormat('dd MMM', _locale);
  static final _isoDate = DateFormat('yyyy-MM-dd');

  /// `formatCurrency` → "R$ 1.234,56".
  static String currency(double value) => _currency.format(value);

  /// `formatDate` → "07/03/2026".
  static String date(DateTime value) => _date.format(value);

  /// `formatDateShort` → "07 mar".
  static String dateShort(DateTime value) => _dateShort.format(value);

  /// Data como a API espera receber (`startDate`, `dueDates`): "2026-03-07".
  static String isoDate(DateTime value) => _isoDate.format(value);

  /// `formatPhone` → "🇧🇷 (11) 91234-5678".
  static String phone(String value) => PhoneNumber.parse(value).display;

  /// `formatRate` — taxa com no máximo 2 casas, sem zeros à toa:
  /// 5.0000000000000004 → "5", 2.5 → "2,5".
  static String rate(double value) {
    final rounded = (value * 100).round() / 100;
    final text = rounded == rounded.roundToDouble()
        ? rounded.toStringAsFixed(0)
        : rounded.toString();
    return text.replaceAll('.', ',');
  }

  /// Dias de atraso de uma parcela vencida (positivo quando já passou).
  static int daysOverdue(DateTime dueDate, {DateTime? now}) {
    final today = _atMidnight(now ?? DateTime.now());
    return today.difference(_atMidnight(dueDate)).inDays;
  }

  /// Dias até o vencimento (negativo quando já passou) — `getDaysUntil`.
  static int daysUntil(DateTime dueDate, {DateTime? now}) =>
      -daysOverdue(dueDate, now: now);

  /// `getDaysLabel` → "Vence hoje", "Faltam 3 dias", "Venceu há 2 dias".
  static String daysLabel(int days) {
    if (days == 0) return 'Vence hoje';
    if (days == 1) return 'Vence amanhã';
    if (days > 1) return 'Faltam $days dias';
    if (days == -1) return 'Venceu ontem';
    return 'Venceu há ${days.abs()} dias';
  }

  /// Iniciais para os avatares das listas ("João Silva" → "JS").
  static String initials(String name) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty);
    if (parts.isEmpty) return '?';
    if (parts.length == 1) return parts.first.characters.first.toUpperCase();
    return (parts.first.characters.first + parts.last.characters.first)
        .toUpperCase();
  }

  /// Concordância de número em contadores ("1 cliente" / "2 clientes").
  static String plural(int count, String singular, String plural) =>
      '$count ${count == 1 ? singular : plural}';

  static DateTime _atMidnight(DateTime value) =>
      DateTime(value.year, value.month, value.day);
}
