import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/core/responsive/breakpoints.dart';

void main() {
  group('Breakpoints.fromWidth', () {
    test('celular abaixo de 640', () {
      expect(Breakpoints.fromWidth(360), ScreenSize.mobile);
      expect(Breakpoints.fromWidth(639.9), ScreenSize.mobile);
    });

    test('tablet entre 640 e 1023', () {
      expect(Breakpoints.fromWidth(640), ScreenSize.tablet);
      expect(Breakpoints.fromWidth(1023.9), ScreenSize.tablet);
    });

    test('desktop a partir de 1024', () {
      expect(Breakpoints.fromWidth(1024), ScreenSize.desktop);
      expect(Breakpoints.fromWidth(1920), ScreenSize.desktop);
    });

    test('isWide cobre tablet e desktop', () {
      expect(ScreenSize.mobile.isWide, isFalse);
      expect(ScreenSize.tablet.isWide, isTrue);
      expect(ScreenSize.desktop.isWide, isTrue);
    });
  });
}
