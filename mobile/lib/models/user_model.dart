class UserModel {
  final String id;
  final String name;
  final String email;
  final String collegeName;
  final String department;
  final String fitnessLevel;
  final List<String> selectedSports;
  final int totalXp;
  final int level;
  final int currentStreak;
  final int longestStreak;
  final List<String> badges;

  UserModel({
    required this.id,
    required this.name,
    required this.email,
    this.collegeName = 'Campus University',
    this.department = 'Engineering',
    this.fitnessLevel = 'beginner',
    this.selectedSports = const [],
    this.totalXp = 0,
    this.level = 1,
    this.currentStreak = 0,
    this.longestStreak = 0,
    this.badges = const [],
  });

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['id'] ?? json['userId'] ?? '',
      name: json['name'] ?? 'Athlete',
      email: json['email'] ?? '',
      collegeName: json['collegeName'] ?? 'Campus University',
      department: json['department'] ?? 'General',
      fitnessLevel: json['fitnessLevel'] ?? 'beginner',
      selectedSports: List<String>.from(json['selectedSports'] ?? []),
      totalXp: (json['totalXp'] ?? json['xp'] ?? 0) as int,
      level: (json['level'] ?? 1) as int,
      currentStreak: (json['currentStreak'] ?? 0) as int,
      longestStreak: (json['longestStreak'] ?? 0) as int,
      badges: List<String>.from(json['badges'] ?? []),
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': id,
    'name': name,
    'email': email,
    'collegeName': collegeName,
    'department': department,
    'fitnessLevel': fitnessLevel,
    'selectedSports': selectedSports,
  };
}
