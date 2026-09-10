import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';
import '../../config/api_constants.dart';

class ApiException implements Exception {
  final String message;
  final int? statusCode;
  ApiException(this.message, [this.statusCode]);

  @override
  String toString() => 'ApiException: $message (HTTP $statusCode)';
}

class ApiClient {
  final String baseUrl;
  final FirebaseAuth _auth = FirebaseAuth.instance;

  ApiClient({this.baseUrl = ApiConstants.baseUrl});

  Future<Map<String, String>> _getHeaders() async {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    final currentUser = _auth.currentUser;
    if (currentUser != null) {
      try {
        final idToken = await currentUser.getIdToken();
        if (idToken != null) {
          headers['Authorization'] = 'Bearer $idToken';
        }
      } catch (_) {}
    }

    return headers;
  }

  Future<dynamic> get(String path, {Map<String, String>? queryParams}) async {
    final uri = Uri.parse('$baseUrl$path').replace(queryParameters: queryParams);
    final headers = await _getHeaders();

    final response = await http.get(uri, headers: headers).timeout(
      const Duration(seconds: 15),
    );

    return _processResponse(response);
  }

  Future<dynamic> post(String path, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = await _getHeaders();

    final response = await http.post(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 20));

    return _processResponse(response);
  }

  Future<dynamic> put(String path, {dynamic body}) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = await _getHeaders();

    final response = await http.put(
      uri,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    ).timeout(const Duration(seconds: 20));

    return _processResponse(response);
  }

  dynamic _processResponse(http.Response response) {
    dynamic bodyJson;
    try {
      bodyJson = jsonDecode(response.body);
    } catch (_) {
      bodyJson = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return bodyJson;
    }

    final errorMessage = (bodyJson is Map && bodyJson['error'] != null)
        ? bodyJson['error'].toString()
        : 'Server returned HTTP ${response.statusCode}';
    throw ApiException(errorMessage, response.statusCode);
  }
}
