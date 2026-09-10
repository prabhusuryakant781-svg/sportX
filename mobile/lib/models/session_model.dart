/**
 * SportX Session Model (Flutter Mobile)
 * Maps 1:1 with Firestore workoutSessions collection and backend Session API contracts.
 */
class WorkoutSessionModel {
  final String sessionId;
  final String userId;
  final String workoutId;
  final String sportId;
  final String? exerciseId;
  final String? exerciseName;
  final String? visionResultId;
  final String startTime;
  final String? completionTime;
  final int durationMinutes;
  final int durationSeconds;
  final int totalReps;
  final double formAccuracyAverage;
  final int caloriesBurned;
  final int xpEarned;
  final String status;
  final Map<String, dynamic>? aiAnalysis;

  WorkoutSessionModel({
    required this.sessionId,
    required this.userId,
    this.workoutId = 'workout_standard',
    this.sportId = 'general',
    this.exerciseId,
    this.exerciseName,
    this.visionResultId,
    required this.startTime,
    this.completionTime,
    this.durationMinutes = 0,
    this.durationSeconds = 0,
    this.totalReps = 0,
    this.formAccuracyAverage = 0.0,
    this.caloriesBurned = 0,
    this.xpEarned = 0,
    this.status = 'in-progress',
    this.aiAnalysis,
  });

  Map<String, dynamic> toJson() => {
    'sessionId': sessionId,
    'userId': userId,
    'workoutId': workoutId,
    'sportId': sportId,
    'exerciseId': exerciseId,
    'exerciseName': exerciseName,
    'visionResultId': visionResultId,
    'startTime': startTime,
    'completionTime': completionTime,
    'durationMinutes': durationMinutes,
    'durationSeconds': durationSeconds,
    'totalReps': totalReps,
    'formAccuracyAverage': formAccuracyAverage,
    'caloriesBurned': caloriesBurned,
    'xpEarned': xpEarned,
    'status': status,
    'aiAnalysis': aiAnalysis,
  };

  factory WorkoutSessionModel.fromJson(Map<String, dynamic> json) {
    return WorkoutSessionModel(
      sessionId: json['sessionId'] ?? '',
      userId: json['userId'] ?? '',
      workoutId: json['workoutId'] ?? 'workout_standard',
      sportId: json['sportId'] ?? 'general',
      exerciseId: json['exerciseId'],
      exerciseName: json['exerciseName'],
      visionResultId: json['visionResultId'],
      startTime: json['startTime'] ?? '',
      completionTime: json['completionTime'],
      durationMinutes: (json['durationMinutes'] ?? 0) as int,
      durationSeconds: (json['durationSeconds'] ?? 0) as int,
      totalReps: (json['totalReps'] ?? 0) as int,
      formAccuracyAverage: ((json['formAccuracyAverage'] ?? json['averageFormScore'] ?? 0) as num).toDouble(),
      caloriesBurned: (json['caloriesBurned'] ?? 0) as int,
      xpEarned: (json['xpEarned'] ?? 0) as int,
      status: json['status'] ?? 'completed',
      aiAnalysis: json['aiAnalysis'],
    );
  }
}
