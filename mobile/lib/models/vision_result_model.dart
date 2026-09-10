class VisionResultModel {
  final String? id;
  final String sessionId;
  final String exerciseId;
  final String exerciseName;
  final int reps;
  final int validFormReps;
  final double formScore;
  final double confidence;
  final List<String> detectedIssues;
  final List<dynamic> feedbackLog;
  final String tempoPacing;
  final int durationSeconds;

  VisionResultModel({
    this.id,
    required this.sessionId,
    required this.exerciseId,
    required this.exerciseName,
    required this.reps,
    required this.validFormReps,
    required this.formScore,
    this.confidence = 0.95,
    this.detectedIssues = const [],
    this.feedbackLog = const [],
    this.tempoPacing = '2.0',
    required this.durationSeconds,
  });

  Map<String, dynamic> toJson() => {
    'sessionId': sessionId,
    'exerciseId': exerciseId,
    'exerciseName': exerciseName,
    'reps': reps,
    'validFormReps': validFormReps,
    'formScore': formScore,
    'confidence': confidence,
    'detectedIssues': detectedIssues,
    'feedbackLog': feedbackLog,
    'tempoPacing': tempoPacing,
    'durationSeconds': durationSeconds,
  };

  factory VisionResultModel.fromJson(Map<String, dynamic> json) {
    return VisionResultModel(
      id: json['id'],
      sessionId: json['sessionId'] ?? '',
      exerciseId: json['exerciseId'] ?? '',
      exerciseName: json['exerciseName'] ?? '',
      reps: (json['reps'] ?? 0) as int,
      validFormReps: (json['validFormReps'] ?? 0) as int,
      formScore: ((json['formScore'] ?? 0) as num).toDouble(),
      confidence: ((json['confidence'] ?? 0.95) as num).toDouble(),
      detectedIssues: List<String>.from(json['detectedIssues'] ?? []),
      feedbackLog: List<dynamic>.from(json['feedbackLog'] ?? []),
      tempoPacing: json['tempoPacing'] ?? '2.0',
      durationSeconds: (json['durationSeconds'] ?? 0) as int,
    );
  }
}
