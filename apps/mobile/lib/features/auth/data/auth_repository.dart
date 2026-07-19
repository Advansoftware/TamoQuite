import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/user.dart';

/// Acesso aos endpoints de autenticação da API TamoQuite.
///
/// Mantém o token em sincronia com o [TokenStorage]; quem chama lida só com
/// [User] e [ApiException].
class AuthRepository {
  const AuthRepository({
    required ApiClient client,
    required TokenStorage tokenStorage,
  }) : _client = client,
       _tokenStorage = tokenStorage;

  final ApiClient _client;
  final TokenStorage _tokenStorage;

  /// `POST /api/auth/login` → `{ token, user }`.
  Future<User> login({required String email, required String password}) async {
    final data = await _client.post('/api/auth/login', {
      'email': email.trim(),
      'password': password,
    });

    final token = data['token'] as String?;
    if (token == null || token.isEmpty) {
      throw const ApiException.unknown();
    }
    await _tokenStorage.write(token);

    return User.fromJson(data['user'] as Map<String, dynamic>);
  }

  /// `GET /api/auth/me` — fonte de verdade do status de assinatura, lido
  /// direto do banco pelo `JwtAuthGuard` (nunca de claims do JWT).
  Future<User> me() async {
    final data = await _client.get('/api/auth/me');
    return User.fromJson(data);
  }

  /// `POST /api/auth/forgot-password`. A API sempre responde sucesso, para
  /// não revelar se o email existe.
  Future<void> forgotPassword(String email) async {
    await _client.post('/api/auth/forgot-password', {'email': email.trim()});
  }

  Future<void> logout() => _tokenStorage.clear();

  Future<bool> hasStoredSession() async {
    final token = await _tokenStorage.read();
    return token != null && token.isNotEmpty;
  }
}
