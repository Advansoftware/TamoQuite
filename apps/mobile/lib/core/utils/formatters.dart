import 'package:intl/intl.dart';

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

  /// `formatCurrency` → "R$ 1.234,56".
  static String currency(double value) => _currency.format(value);

  /// `formatDate` → "07/03/2026".
  static String date(DateTime value) => _date.format(value);

  /// `formatDateShort` → "07 mar".
  static String dateShort(DateTime value) => _dateShort.format(value);

  /// Dias de atraso de uma parcela vencida (positivo quando já passou).
  static int daysOverdue(DateTime dueDate, {DateTime? now}) {
    final today = _atMidnight(now ?? DateTime.now());
    return today.difference(_atMidnight(dueDate)).inDays;
  }

  static DateTime _atMidnight(DateTime value) =>
      DateTime(value.year, value.month, value.day);
}
