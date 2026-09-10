/**
 * SportX Progress Model (Flutter Mobile)
 * Maps 1:1 with Firestore progress/{userId} collection and GET /api/v1/progress endpoint.
 */
class ProgressModel {
  final String userId;
  final int totalWorkouts;
  final int totalReps;
  final int totalCalories;
  final int totalMinutes;
  final int totalXp;
  final int currentStreak;
  final int longestStreak;
  final int level;
  final double goalCompletionPercentage;
  final double averageFormScore;
  final Map<String, int> personalRecords;
  final List<Map<String, dynamic>> formScoreTrends;

  ProgressModel({
    required this.userId,
    this.totalWorkouts = 0,
    this.totalReps = 0,
    this.totalCalories = 0,
    this.totalMinutes = 0,
    this.totalXp = 0,
    this.currentStreak = 0,
    this.longestStreak = 0,
    this.level = 1,
    this.goalCompletionPercentage = 0.0,
    this.averageFormScore = 80.0,
    this.personalRecords = const {},
    this.formScoreTrends = const [],
  });

  factory ProgressModel.fromJson(Map<String, dynamic> json) {
    final prRaw = json['personalRecords'] as Map<String, dynamic>? ?? {};
    final prs = prRaw.map((k, v) => MapEntry(k, (v as num).toInt()));

    return ProgressModel(
      userId: json['userId'] ?? '',
      totalWorkouts: (json['totalWorkouts'] ?? 0) as int,
      totalReps: (json['totalReps'] ?? 0) as int,
      totalCalories: (json['totalCalories'] ?? 0) as int,
      totalMinutes: (json['totalMinutes'] ?? 0) as int,
      totalXp: (json['totalXp'] ?? json['xp'] ?? 0) as int,
      currentStreak: (json['currentStreak'] ?? 0) as int,
      longestStreak: (json['longestStreak'] ?? 0) as int,
      level: (json['level'] ?? 1) as int,
      goalCompletionPercentage: ((json['goalCompletionPercentage'] ?? 0) as num).toDouble(),
      averageFormScore: ((json['averageFormScore'] ?? 80) as num).toDouble(),
      personalRecords: prs,
      formScoreTrends: List<Map<String, dynamic>>.from(json['formScoreTrends'] ?? []),
    );
  }
}
