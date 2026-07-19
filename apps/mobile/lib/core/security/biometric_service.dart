import 'package:flutter/services.dart';
import 'package:local_auth/local_auth.dart';

/// Acesso ao desbloqueio por biometria/credencial do aparelho.
///
/// Importante: isto protege o **acesso local** à sessão já salva no aparelho.
/// Não é um segundo fator junto ao servidor e não substitui o login — a senha
/// do usuário nunca é armazenada no dispositivo.
class BiometricService {
  BiometricService({LocalAuthentication? auth})
    : _auth = auth ?? LocalAuthentication();

  final LocalAuthentication _auth;

  /// Se o aparelho pode autenticar o usuário — por biometria **ou** pelo
  /// PIN/padrão do sistema. Quem não tem sensor ainda consegue usar o
  /// bloqueio, o que evita oferecer um recurso que falharia depois.
  Future<bool> isAvailable() async {
    try {
      return await _auth.isDeviceSupported();
    } on PlatformException {
      return false;
    }
  }

  /// Se há biometria cadastrada (digital/rosto). Usado só para escolher o
  /// texto e o ícone da interface.
  Future<bool> hasEnrolledBiometrics() async {
    try {
      return await _auth.canCheckBiometrics &&
          (await _auth.getAvailableBiometrics()).isNotEmpty;
    } on PlatformException {
      return false;
    }
  }

  /// Abre o prompt do sistema. Retorna `true` só quando o usuário se
  /// autentica com sucesso.
  Future<bool> authenticate({required String reason}) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        // Permite cair no PIN/padrão quando a biometria falha ou não existe.
        biometricOnly: false,
        // Mantém o prompt aberto se o app for para segundo plano durante a
        // autenticação (o usuário pode ir ajustar o sensor e voltar).
        persistAcrossBackgrounding: true,
      );
    } on PlatformException {
      // Sensor indisponível, muitas tentativas, ou usuário cancelou.
      return false;
    }
  }
}
