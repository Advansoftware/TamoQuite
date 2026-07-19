import 'package:flutter_test/flutter_test.dart';
import 'package:tamoquite/features/auth/domain/subscription_status.dart';
import 'package:tamoquite/features/auth/domain/user.dart';

/// O gate de assinatura decide se o app abre ou não. Estes testes fixam a
/// regra contra `apps/api/src/common/subscription.guard.ts` — se a API mudar
/// a lista de status, é aqui que a divergência aparece.
void main() {
  group('SubscriptionAccess', () {
    test('libera assinatura ativa e período de trial', () {
      expect(SubscriptionAccess.isActive('active'), isTrue);
      expect(SubscriptionAccess.isActive('trialing'), isTrue);
    });

    test('bloqueia status inativos do Stripe', () {
      for (final status in [
        'canceled',
        'past_due',
        'incomplete',
        'incomplete_expired',
        'unpaid',
        'paused',
      ]) {
        expect(
          SubscriptionAccess.isActive(status),
          isFalse,
          reason: '$status não deveria liberar acesso',
        );
      }
    });

    test('bloqueia null e string vazia', () {
      expect(SubscriptionAccess.isActive(null), isFalse);
      expect(SubscriptionAccess.isActive(''), isFalse);
    });
  });

  group('User.hasAppAccess', () {
    User buildUser({required String role, String? subscriptionStatus}) {
      return User(
        id: 'u1',
        email: 'teste@tamoquite.app',
        name: 'Teste',
        role: role,
        mustChangePassword: false,
        subscriptionStatus: subscriptionStatus,
      );
    }

    test('CLIENT com assinatura ativa entra', () {
      expect(
        buildUser(role: 'CLIENT', subscriptionStatus: 'active').hasAppAccess,
        isTrue,
      );
    });

    test('CLIENT sem assinatura é barrado', () {
      expect(
        buildUser(role: 'CLIENT', subscriptionStatus: 'canceled').hasAppAccess,
        isFalse,
      );
      expect(buildUser(role: 'CLIENT').hasAppAccess, isFalse);
    });

    test('ADMIN passa pelo paywall mesmo sem assinatura', () {
      expect(buildUser(role: 'ADMIN').hasAppAccess, isTrue);
      expect(
        buildUser(role: 'ADMIN', subscriptionStatus: 'canceled').hasAppAccess,
        isTrue,
      );
    });
  });

  group('User.fromJson', () {
    test('lê o payload de GET /api/auth/me', () {
      final user = User.fromJson(const {
        'id': 'clx123',
        'email': 'bruno@tamoquite.app',
        'name': 'Bruno',
        'role': 'CLIENT',
        'mustChangePassword': false,
        'subscriptionStatus': 'trialing',
        'notifyBeforeSubExpiryDays': 5,
      });

      expect(user.id, 'clx123');
      expect(user.name, 'Bruno');
      expect(user.isAdmin, isFalse);
      expect(user.hasAppAccess, isTrue);
    });

    test('tolera campos ausentes sem quebrar', () {
      final user = User.fromJson(const {'id': 'clx123'});

      expect(user.email, isEmpty);
      expect(user.role, 'CLIENT');
      expect(user.mustChangePassword, isFalse);
      expect(user.subscriptionStatus, isNull);
      expect(user.hasAppAccess, isFalse);
    });
  });
}
