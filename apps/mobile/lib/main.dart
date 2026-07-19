import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter/widgets.dart';
import 'package:intl/date_symbol_data_local.dart';

import 'app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // DateFormat com locale pt_BR precisa dos símbolos carregados antes do
  // primeiro uso — sem isto, formatar datas lança LocaleDataException.
  await initializeDateFormatting('pt_BR');

  // A orientação fica livre de propósito: o shell troca para NavigationRail
  // em telas largas, o que só faz sentido se paisagem/tablet for permitido.
  runApp(const ProviderScope(child: TamoQuiteApp()));
}
