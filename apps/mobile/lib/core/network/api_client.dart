import 'package:dio/dio.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

/// Cliente HTTP do app.
///
/// Responsabilidades:
///  - anexar `Authorization: Bearer <token>` quando há sessão;
///  - converter qualquer falha do Dio em [ApiException] com mensagem pronta;
///  - sinalizar 401 e 403/`SUBSCRIPTION_INACTIVE` para quem controla a sessão.
///
/// Equivale ao `apiFetch` de `apps/web/src/lib/api.ts`.
class ApiClient {
  ApiClient({required TokenStorage tokenStorage, Dio? dio})
    : _tokenStorage = tokenStorage,
      _dio =
          dio ??
          Dio(
            BaseOptions(
              baseUrl: AppConfig.apiBaseUrl,
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 20),
              contentType: Headers.jsonContentType,
              // Nunca lançar por status: o tratamento é centralizado em
              // _toApiException, que precisa enxergar o corpo da resposta.
              validateStatus: (_) => true,
            ),
          ) {
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _tokenStorage.read();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
      ),
    );
  }

  final Dio _dio;
  final TokenStorage _tokenStorage;

  /// Disparado quando a API rejeita a sessão (401). Quem escuta deve
  /// limpar o token e mandar o usuário ao login.
  void Function()? onUnauthorized;

  /// Disparado quando o paywall do servidor barra a requisição (403 com
  /// `code: SUBSCRIPTION_INACTIVE`). Permite que o app caia na tela de
  /// assinatura na hora, sem esperar o próximo `/me`.
  void Function()? onSubscriptionInactive;

  Future<Map<String, dynamic>> get(String path) =>
      _send(() => _dio.get<dynamic>(path));

  Future<Map<String, dynamic>> post(String path, [Object? body]) =>
      _send(() => _dio.post<dynamic>(path, data: body));

  Future<Map<String, dynamic>> _send(
    Future<Response<dynamic>> Function() request,
  ) async {
    final Response<dynamic> response;
    try {
      response = await request();
    } on DioException catch (e) {
      throw _fromDioException(e);
    }

    final status = response.statusCode ?? 0;
    if (status >= 200 && status < 300) {
      final data = response.data;
      if (data is Map<String, dynamic>) return data;
      // Endpoints que respondem 204 ou corpo não-objeto.
      return const {};
    }

    throw _toApiException(response);
  }

  ApiException _toApiException(Response<dynamic> response) {
    final status = response.statusCode ?? 0;
    final data = response.data;
    final body = data is Map<String, dynamic> ? data : const <String, dynamic>{};
    final code = body['code'] as String?;

    // A API do NestJS devolve tanto `error` quanto `message`; `message` pode
    // vir como lista quando o ValidationPipe rejeita o DTO.
    final rawMessage = body['error'] ?? body['message'];
    final serverMessage = rawMessage is List
        ? rawMessage.join(', ')
        : rawMessage as String?;

    if (status == 401) {
      onUnauthorized?.call();
      return const ApiException(
        'Sessão expirada. Faça login novamente.',
        statusCode: 401,
      );
    }

    if (status == 403) {
      if (code == 'SUBSCRIPTION_INACTIVE') {
        onSubscriptionInactive?.call();
        return ApiException(
          serverMessage ?? 'Assinatura inativa.',
          statusCode: 403,
          code: code,
        );
      }
      return const ApiException(
        'Você não tem permissão para esta ação.',
        statusCode: 403,
      );
    }

    if (status == 404) {
      return const ApiException('Recurso não encontrado.', statusCode: 404);
    }

    if (status == 400 || status == 422) {
      return ApiException(
        serverMessage ?? 'Dados inválidos. Verifique os campos.',
        statusCode: status,
      );
    }

    return ApiException(
      serverMessage ?? 'Erro no servidor. Tente novamente.',
      statusCode: status,
    );
  }

  ApiException _fromDioException(DioException e) {
    return switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.sendTimeout ||
      DioExceptionType.receiveTimeout => const ApiException(
        'O servidor demorou a responder. Tente novamente.',
      ),
      DioExceptionType.connectionError ||
      DioExceptionType.badCertificate => const ApiException.network(),
      _ => const ApiException.unknown(),
    };
  }
}
