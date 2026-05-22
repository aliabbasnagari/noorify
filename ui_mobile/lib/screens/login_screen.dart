import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../providers/server_config_provider.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _serverController = TextEditingController(text: 'http://');
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;
  bool _isFirstTime = false;
  bool _checkingServer = false;

  @override
  void initState() {
    super.initState();
    _checkServerStatus();
  }

  Future<void> _checkServerStatus() async {
    // Check if server is in first-time setup mode
    final config = context.read<ServerConfigProvider>();
    if (config.loaded && config.config.firstTime) {
      setState(() => _isFirstTime = true);
    }
  }

  Future<void> _checkAndSetFirstTime() async {
    if (_serverController.text.isEmpty) return;
    setState(() => _checkingServer = true);
    try {
      final auth = context.read<AuthProvider>();
      final serverConfig = context.read<ServerConfigProvider>();
      // Temporarily create a client to check status
      final client =
          await _getNativeClientForUrl(_serverController.text.trim());
      if (client != null) {
        // ignore: unused_local_variable
        final _ = (auth, serverConfig);
        // We'll pass the client temporarily; ServerConfigProvider.load() takes a NativeClient
        // Use auth's native client trick
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _checkingServer = false);
    }
  }

  // Workaround: instantiate client inline
  dynamic _getNativeClientForUrl(String url) => null; // placeholder

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final serverUrl = _serverController.text.trim().replaceAll(RegExp(r'/+$'), '');

    if (_isFirstTime) {
      await auth.createAdmin(
          serverUrl, _usernameController.text, _passwordController.text);
    } else {
      await auth.login(
          serverUrl, _usernameController.text, _passwordController.text);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 32),
            child: Form(
              key: _formKey,
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Logo
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1db954),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: const Icon(Icons.music_note, color: Colors.black, size: 48),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    _isFirstTime ? 'Create Admin Account' : 'Log in to Navidrome',
                    style: const TextStyle(
                        color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _isFirstTime
                        ? 'Set up your first admin account'
                        : 'Enter your server details',
                    style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 14),
                  ),
                  const SizedBox(height: 32),

                  // Server URL
                  _InputField(
                    controller: _serverController,
                    label: 'Server URL',
                    hint: 'http://192.168.1.1:4533',
                    icon: Icons.dns_outlined,
                    keyboardType: TextInputType.url,
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Enter server URL' : null,
                  ),
                  const SizedBox(height: 16),

                  // Username
                  _InputField(
                    controller: _usernameController,
                    label: 'Username',
                    hint: 'admin',
                    icon: Icons.person_outline,
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Enter username' : null,
                  ),
                  const SizedBox(height: 16),

                  // Password
                  _InputField(
                    controller: _passwordController,
                    label: 'Password',
                    hint: '••••••••',
                    icon: Icons.lock_outline,
                    obscureText: _obscurePassword,
                    suffix: IconButton(
                      icon: Icon(
                          _obscurePassword ? Icons.visibility_off : Icons.visibility,
                          color: const Color(0xFFa7a7a7)),
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                    ),
                    validator: (v) =>
                        v == null || v.isEmpty ? 'Enter password' : null,
                  ),
                  const SizedBox(height: 8),

                  // Error
                  if (auth.error != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 12),
                      child: Text(auth.error!,
                          style: const TextStyle(color: Colors.redAccent, fontSize: 13)),
                    ),

                  const SizedBox(height: 8),

                  // Submit button
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: auth.isLoading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF1db954),
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(25)),
                      ),
                      child: auth.isLoading
                          ? const CircularProgressIndicator(
                              color: Colors.black, strokeWidth: 2)
                          : Text(
                              _isFirstTime ? 'Create Account' : 'Log In',
                              style: const TextStyle(
                                  fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Toggle first-time / login
                  GestureDetector(
                    onTap: () => setState(() => _isFirstTime = !_isFirstTime),
                    child: Text(
                      _isFirstTime
                          ? 'Already have an account? Log in'
                          : 'First time setup? Create admin',
                      style: const TextStyle(
                          color: Color(0xFFa7a7a7),
                          decoration: TextDecoration.underline,
                          fontSize: 13),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _InputField extends StatelessWidget {
  final TextEditingController controller;
  final String label;
  final String hint;
  final IconData icon;
  final bool obscureText;
  final Widget? suffix;
  final String? Function(String?)? validator;
  final TextInputType? keyboardType;

  const _InputField({
    required this.controller,
    required this.label,
    required this.hint,
    required this.icon,
    this.obscureText = false,
    this.suffix,
    this.validator,
    this.keyboardType,
  });

  @override
  Widget build(BuildContext context) {
    return TextFormField(
      controller: controller,
      obscureText: obscureText,
      keyboardType: keyboardType,
      style: const TextStyle(color: Colors.white),
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        labelStyle: const TextStyle(color: Color(0xFFa7a7a7)),
        hintStyle: const TextStyle(color: Color(0xFF555555)),
        prefixIcon: Icon(icon, color: const Color(0xFFa7a7a7)),
        suffixIcon: suffix,
        filled: true,
        fillColor: const Color(0xFF282828),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide.none,
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: Color(0xFF1db954)),
        ),
      ),
    );
  }
}
