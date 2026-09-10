import '../core/network/api_client.dart';
import '../config/api_constants.dart';
import '../models/session_model.dart';

class WorkoutSessionService {
  final ApiClient _apiClient;

  WorkoutSessionService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  /// Initiates an in-progress workout session on the backend
  Future<Map<String, dynamic>> startSession({
    required String exerciseId,
    String? exerciseName,
    String planId = 'dorm_blast_20',
  }) async {
    final response = await _apiClient.post(
      ApiConstants.sessionsStart,
      body: {
        'exerciseId': exerciseId,
        if (exerciseName != null) 'exerciseName': exerciseName,
        'planId': planId,
      },
    );

    if (response != null && response['data'] != null) {
      return response['data'] as Map<String, dynamic>;
    }
    throw ApiException('Failed to initiate workout session');
  }

  /// Authoritatively completes a workout session with server XP, streak, and badges
  Future<Map<String, dynamic>> completeSession(
    String sessionId, {
    required int totalReps,
    required double averageFormScore,
    required int durationSeconds,
    String? exerciseId,
  }) async {
    final response = await _apiClient.post(
      '${ApiConstants.sessionsComplete}/$sessionId/complete',
      body: {
        'totalReps': totalReps,
        'averageFormScore': averageFormScore,
        'durationSeconds': durationSeconds,
        if (exerciseId != null) 'exerciseId': exerciseId,
      },
    );

    if (response != null && response['data'] != null) {
      return response['data'] as Map<String, dynamic>;
    }
    throw ApiException('Failed to complete workout session');
  }

  /// Retrieves user workout history
  Future<List<WorkoutSessionModel>> getUserSessions({int limit = 20}) async {
    final response = await _apiClient.get('${ApiConstants.sessions}?limit=$limit');

    if (response != null && response['data'] != null) {
      final list = response['data'] as List<dynamic>;
      return list.map((item) => WorkoutSessionModel.fromJson(item as Map<String, dynamic>)).toList();
    }
    return [];
  }

  /// Fetches a single session by ID
  Future<WorkoutSessionModel?> getSession(String sessionId) async {
    final response = await _apiClient.get('${ApiConstants.sessions}/$sessionId');

    if (response != null && response['data'] != null) {
      return WorkoutSessionModel.fromJson(response['data'] as Map<String, dynamic>);
    }
    return null;
  }
}
