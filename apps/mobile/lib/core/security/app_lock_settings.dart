import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Preferências do bloqueio do app, persistidas entre sessões.
///
/// Guarda dois sinais:
///  - se o bloqueio está ligado;
///  - se já perguntamos ao usuário (para o convite aparecer só uma vez).
class AppLockSettings {
  AppLockSettings({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  static const _enabledKey = 'tq_app_lock_enabled';
  static const _promptedKey = 'tq_app_lock_prompted';

  final FlutterSecureStorage _storage;

  Future<bool> isEnabled() => _readFlag(_enabledKey);

  Future<void> setEnabled(bool value) =>
      _storage.write(key: _enabledKey, value: value.toString());

  Future<bool> wasPrompted() => _readFlag(_promptedKey);

  Future<void> markPrompted() =>
      _storage.write(key: _promptedKey, value: 'true');

  Future<bool> _readFlag(String key) async {
    try {
      return await _storage.read(key: key) == 'true';
    } catch (_) {
      return false;
    }
  }
}
