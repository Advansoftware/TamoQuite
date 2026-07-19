import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/core/utils/phone.dart';

/// Espelha `apps/web/src/lib/phone.ts`. Os números são gravados como dígitos
/// internacionais; o app precisa separar país e número, remontar o E.164 para
/// o WhatsApp e formatar para exibição do mesmo jeito que o site.
void main() {
  group('PhoneNumber.parse', () {
    test('brasileiro legado, sem código do país', () {
      final phone = PhoneNumber.parse('11912345678');
      expect(phone.country.iso, 'BR');
      expect(phone.national, '11912345678');
    });

    test('brasileiro com o código 55', () {
      final phone = PhoneNumber.parse('5511912345678');
      expect(phone.country.iso, 'BR');
      expect(phone.national, '11912345678');
    });

    test('casa o código de discagem mais longo', () {
      // 595 (Paraguai) não pode perder para 5 nem para 59.
      final phone = PhoneNumber.parse('595961234567');
      expect(phone.country.iso, 'PY');
      expect(phone.national, '961234567');
    });

    test('vazio cai no país padrão', () {
      final phone = PhoneNumber.parse('');
      expect(phone.country.iso, 'BR');
      expect(phone.isEmpty, isTrue);
    });
  });

  group('e164Digits', () {
    test('remonta os dígitos internacionais', () {
      expect(PhoneNumber.parse('11912345678').e164Digits, '5511912345678');
    });

    test('vazio continua vazio', () {
      expect(PhoneNumber.parse('').e164Digits, '');
    });
  });

  group('display', () {
    test('formata com bandeira e máscara nacional', () {
      expect(PhoneNumber.parse('5511912345678').display, '🇧🇷 (11) 91234-5678');
    });
  });
}
