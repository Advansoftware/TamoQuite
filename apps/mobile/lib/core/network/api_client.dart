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

  Future<Map<String, dynamic>> get(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    return _asMap(
      await _send(() => _dio.get<dynamic>(path, queryParameters: query)),
    );
  }

  /// Variante de [get] para os endpoints de coleção (`/api/borrowers`,
  /// `/api/loans`), que respondem com um array JSON na raiz.
  Future<List<Map<String, dynamic>>> getList(
    String path, {
    Map<String, dynamic>? query,
  }) async {
    final data = await _send(
      () => _dio.get<dynamic>(path, queryParameters: query),
    );
    if (data is! List) return const [];
    return data.whereType<Map<String, dynamic>>().toList(growable: false);
  }

  Future<Map<String, dynamic>> post(String path, [Object? body]) async {
    return _asMap(await _send(() => _dio.post<dynamic>(path, data: body)));
  }

  Future<Map<String, dynamic>> put(String path, [Object? body]) async {
    return _asMap(await _send(() => _dio.put<dynamic>(path, data: body)));
  }

  Future<Map<String, dynamic>> patch(String path, [Object? body]) async {
    return _asMap(await _send(() => _dio.patch<dynamic>(path, data: body)));
  }

  /// `DELETE` — em toda a API isso é *soft delete*, nunca remoção de linha
  /// (ver `borrowers.service.ts` e `loans.service.ts`). O que muda é o quanto
  /// a ação é reversível, e quem chama é que precisa dizer isso ao usuário.
  Future<Map<String, dynamic>> delete(String path) async {
    return _asMap(await _send(() => _dio.delete<dynamic>(path)));
  }

  /// Corpo de sucesso ainda cru: `Map` para recursos, `List` para coleções.
  Future<Object?> _send(Future<Response<dynamic>> Function() request) async {
    final Response<dynamic> response;
    try {
      response = await request();
    } on DioException catch (e) {
      throw _fromDioException(e);
    }

    final status = response.statusCode ?? 0;
    if (status >= 200 && status < 300) return response.data;

    throw _toApiException(response);
  }

  /// Endpoints que respondem 204 ou corpo não-objeto viram um mapa vazio —
  /// quem chama trata ausência de campo, não um tipo inesperado.
  static Map<String, dynamic> _asMap(Object? data) =>
      data is Map<String, dynamic> ? data : const {};

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
