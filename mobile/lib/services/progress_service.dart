import '../core/network/api_client.dart';
import '../config/api_constants.dart';
import '../models/progress_model.dart';

class ProgressService {
  final ApiClient _apiClient;

  ProgressService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Retrieves user progress aggregation, PRs, and trends
  Future<ProgressModel> getProgressSummary() async {
    final response = await _apiClient.get(ApiConstants.progress);

    if (response != null && response['data'] != null) {
      return ProgressModel.fromJson(response['data'] as Map<String, dynamic>);
    }

    throw ApiException('Failed to retrieve user progress summary');
  }
}
