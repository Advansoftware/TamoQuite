import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers/core_providers.dart';
import '../domain/dashboard_summary.dart';

class DashboardRepository {
  const DashboardRepository(this._client);

  final ApiClient _client;

  /// `GET /api/dashboard` — protegido por `JwtAuthGuard` + `SubscriptionGuard`.
  Future<DashboardSummary> fetch() async {
    return DashboardSummary.fromJson(await _client.get('/api/dashboard'));
  }
}

final dashboardRepositoryProvider = Provider<DashboardRepository>((ref) {
  return DashboardRepository(ref.watch(apiClientProvider));
});
