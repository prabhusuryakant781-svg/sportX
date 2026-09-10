import '../core/network/api_client.dart';
import '../config/api_constants.dart';
import '../models/coach_insight_model.dart';

class AICoachResponseModel {
  final String summary;
  final List<String> strengths;
  final List<String> recommendations;
  final String nextFocus;

  AICoachResponseModel({
    required this.summary,
    required this.strengths,
    required this.recommendations,
    required this.nextFocus,
  });

  factory AICoachResponseModel.fromJson(Map<String, dynamic> json) {
    return AICoachResponseModel(
      summary: json['summary'] ?? '',
      strengths: List<String>.from(json['strengths'] ?? []),
      recommendations: List<String>.from(json['recommendations'] ?? []),
      nextFocus: json['nextFocus'] ?? 'consistency',
    );
  }
}

class AICoachService {
  final ApiClient _apiClient;

  AICoachService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<AICoachResponseModel> askCoach(String message) async {
    final response = await _apiClient.post(
      ApiConstants.aiAskCoach,
      body: {'message': message},
    );

    if (response != null && response['data'] != null) {
      return AICoachResponseModel.fromJson(response['data']);
    }

    throw ApiException('Invalid response from AI Coach service');
  }

  Future<Map<String, dynamic>> generatePersonalizedWorkout({
    String? focusMuscle,
    int durationMinutes = 20,
    String? difficulty,
  }) async {
    final response = await _apiClient.post(
      ApiConstants.aiGenerateWorkout,
      body: {
        if (focusMuscle != null) 'focusMuscle': focusMuscle,
        'durationMinutes': durationMinutes,
        if (difficulty != null) 'difficulty': difficulty,
      },
    );

    return response?['data'] ?? {};
  }

  /// Evaluates a completed workout session with Gemini post-workout analysis
  Future<CoachInsightModel> analyzeSession(String sessionId) async {
    final response = await _apiClient.post(
      ApiConstants.aiSessionAnalysis,
      body: {'sessionId': sessionId},
    );

    if (response != null && response['data'] != null) {
      return CoachInsightModel.fromJson(response['data']);
    }

    throw ApiException('Failed to generate session analysis');
  }
}
