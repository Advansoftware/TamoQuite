import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Guarda o JWT no armazenamento seguro do sistema
/// (Keystore no Android, Keychain no iOS).
///
/// O site guarda o token em `localStorage` sob a chave `tq_token`; no app o
/// equivalente seguro é este — `SharedPreferences` deixaria o token legível
/// por qualquer processo com acesso ao diretório do app.
class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
    : _storage =
          storage ??
          const FlutterSecureStorage(
            // first_unlock: o token continua legível em background após o
            // primeiro desbloqueio do aparelho, mas não com o device travado.
            iOptions: IOSOptions(
              accessibility: KeychainAccessibility.first_unlock,
            ),
          );

  static const _tokenKey = 'tq_token';

  final FlutterSecureStorage _storage;

  Future<String?> read() async {
    try {
      return await _storage.read(key: _tokenKey);
    } catch (_) {
      // Keystore corrompido (acontece após restore de backup): trata como
      // "sem sessão" em vez de travar a inicialização do app.
      return null;
    }
  }

  Future<void> write(String token) async {
    await _storage.write(key: _tokenKey, value: token);
  }

  Future<void> clear() async {
    try {
      await _storage.delete(key: _tokenKey);
    } catch (_) {
      /* nada a fazer — a sessão já é considerada encerrada */
    }
  }
}
