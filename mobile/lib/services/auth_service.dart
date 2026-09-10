import 'package:firebase_auth/firebase_auth.dart';
import '../core/network/api_client.dart';
import '../config/api_constants.dart';
import '../models/user_model.dart';

class AuthService {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final ApiClient _apiClient;

  AuthService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();
  User? get currentUser => _firebaseAuth.currentUser;

  Future<UserModel> signIn({required String email, required String password}) async {
    final userCredential = await _firebaseAuth.signInWithEmailAndPassword(
      email: email,
      password: password,
    );

    final res = await _apiClient.get(ApiConstants.userProfile);
    if (res != null && res['data'] != null) {
      return UserModel.fromJson(res['data']);
    }

    return UserModel(
      id: userCredential.user!.uid,
      name: userCredential.user!.displayName ?? email.split('@')[0],
      email: email,
    );
  }

  Future<UserModel> signUp({
    required String email,
    required String password,
    required String name,
    String collegeName = 'Campus University',
    String department = 'Engineering',
  }) async {
    final userCredential = await _firebaseAuth.createUserWithEmailAndPassword(
      email: email,
      password: password,
    );

    if (userCredential.user != null && name.isNotEmpty) {
      await userCredential.user!.updateDisplayName(name);
    }

    final payload = {
      'name': name,
      'email': email,
      'collegeName': collegeName,
      'department': department,
    };

    try {
      await _apiClient.put(ApiConstants.userProfile, body: payload);
    } catch (_) {}

    return UserModel(
      id: userCredential.user!.uid,
      name: name,
      email: email,
      collegeName: collegeName,
      department: department,
    );
  }

  Future<void> signOut() async {
    await _firebaseAuth.signOut();
  }

  Future<void> resetPassword(String email) async {
    await _firebaseAuth.sendPasswordResetEmail(email: email);
  }
}
