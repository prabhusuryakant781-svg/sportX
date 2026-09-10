/**
 * SportX Coach Insight Model (Flutter Mobile)
 * Maps 1:1 with Firestore coachInsights/{insightId} and POST /api/v1/ai/session-analysis.
 */
class CoachInsightModel {
  final String insightId;
  final String userId;
  final String type;
  final String? sourceSessionId;
  final String? exerciseId;
  final String summary;
  final List<String> doneWell;
  final List<String> areasToImprove;
  final List<String> actionableCues;
  final String nextFocus;
  final double confidence;
  final String createdAt;

  CoachInsightModel({
    required this.insightId,
    required this.userId,
    this.type = 'post_workout_analysis',
    this.sourceSessionId,
    this.exerciseId,
    required this.summary,
    this.doneWell = const [],
    this.areasToImprove = const [],
    this.actionableCues = const [],
    required this.nextFocus,
    this.confidence = 0.95,
    required this.createdAt,
  });

  factory CoachInsightModel.fromJson(Map<String, dynamic> json) {
    return CoachInsightModel(
      insightId: json['insightId'] ?? '',
      userId: json['userId'] ?? '',
      type: json['type'] ?? 'post_workout_analysis',
      sourceSessionId: json['sourceSessionId'],
      exerciseId: json['exerciseId'],
      summary: json['summary'] ?? '',
      doneWell: List<String>.from(json['doneWell'] ?? []),
      areasToImprove: List<String>.from(json['areasToImprove'] ?? []),
      actionableCues: List<String>.from(json['actionableCues'] ?? []),
      nextFocus: json['nextFocus'] ?? 'consistency',
      confidence: ((json['confidence'] ?? 0.95) as num).toDouble(),
      createdAt: json['createdAt'] ?? '',
    );
  }
}
