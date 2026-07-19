import 'subscription_status.dart';

/// Usuário autenticado, como devolvido por `GET /api/auth/me` e pelo
/// `POST /api/auth/login` (ver `AuthUser` em
/// `apps/api/src/common/current-user.decorator.ts`).
class User {
  const User({
    required this.id,
    required this.email,
    required this.name,
    required this.role,
    required this.mustChangePassword,
    required this.subscriptionStatus,
  });

  final String id;
  final String email;
  final String name;
  final String role;
  final bool mustChangePassword;
  final String? subscriptionStatus;

  bool get isAdmin => role == 'ADMIN';

  /// Se o usuário pode usar o app.
  ///
  /// Admins passam pelo paywall, exatamente como no [SubscriptionGuard] da API
  /// e no gate de `apps/web/src/app/(app)/layout.tsx`.
  bool get hasAppAccess =>
      isAdmin || SubscriptionAccess.isActive(subscriptionStatus);

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'] as String,
      email: json['email'] as String? ?? '',
      name: json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'CLIENT',
      mustChangePassword: json['mustChangePassword'] as bool? ?? false,
      subscriptionStatus: json['subscriptionStatus'] as String?,
    );
  }

  User copyWith({String? subscriptionStatus, bool? mustChangePassword}) {
    return User(
      id: id,
      email: email,
      name: name,
      role: role,
      mustChangePassword: mustChangePassword ?? this.mustChangePassword,
      subscriptionStatus: subscriptionStatus ?? this.subscriptionStatus,
    );
  }
}
