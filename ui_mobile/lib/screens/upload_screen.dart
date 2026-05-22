import 'dart:io';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class UploadScreen extends StatefulWidget {
  const UploadScreen({super.key});

  @override
  State<UploadScreen> createState() => _UploadScreenState();
}

class _UploadScreenState extends State<UploadScreen> {
  bool _uploading = false;
  double _progress = 0;
  String? _statusMessage;
  List<String> _uploadedFiles = [];

  Future<void> _pickAndUpload() async {
    final auth = context.read<AuthProvider>();
    final result = await FilePicker.platform.pickFiles(
      type: FileType.audio,
      allowMultiple: true,
    );
    if (result == null || result.files.isEmpty) return;
    if (!mounted) return;

    setState(() {
      _uploading = true;
      _progress = 0;
      _statusMessage = 'Uploading...';
      _uploadedFiles = [];
    });

    final client = auth.nativeClient;
    if (client == null) return;

    int done = 0;
    for (final file in result.files) {
      if (file.path == null) continue;
      try {
        final bytes = await File(file.path!).readAsBytes();
        await client.uploadFile(bytes, file.name);
        _uploadedFiles.add(file.name);
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to upload ${file.name}: $e')),
          );
        }
      }
      done++;
      if (mounted) {
        setState(() => _progress = done / result.files.length);
      }
    }

    if (mounted) {
      setState(() {
        _uploading = false;
        _statusMessage = 'Uploaded ${_uploadedFiles.length}/${result.files.length} files';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF121212),
      appBar: AppBar(
        backgroundColor: const Color(0xFF121212),
        title: const Text('Upload',
            style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      body: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            const SizedBox(height: 32),
            Container(
              width: double.infinity,
              height: 180,
              decoration: BoxDecoration(
                border: Border.all(
                    color: const Color(0xFF1db954).withAlpha(100), width: 2),
                borderRadius: BorderRadius.circular(16),
                color: const Color(0xFF282828),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.upload_file,
                      color: Color(0xFF1db954), size: 48),
                  const SizedBox(height: 12),
                  const Text('Select audio files to upload',
                      style: TextStyle(color: Colors.white, fontSize: 16)),
                  const SizedBox(height: 8),
                  const Text('MP3, FLAC, WAV, AAC and more',
                      style: TextStyle(color: Color(0xFFa7a7a7), fontSize: 12)),
                  const SizedBox(height: 16),
                  ElevatedButton.icon(
                    onPressed: _uploading ? null : _pickAndUpload,
                    icon: const Icon(Icons.add, color: Colors.black),
                    label: const Text('Choose Files',
                        style: TextStyle(
                            color: Colors.black, fontWeight: FontWeight.bold)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1db954),
                      shape: const StadiumBorder(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            if (_uploading) ...[
              LinearProgressIndicator(
                value: _progress,
                backgroundColor: const Color(0xFF282828),
                valueColor:
                    const AlwaysStoppedAnimation<Color>(Color(0xFF1db954)),
              ),
              const SizedBox(height: 8),
              Text('Uploading ${(_progress * 100).toInt()}%...',
                  style: const TextStyle(color: Color(0xFFa7a7a7))),
            ],
            if (_statusMessage != null && !_uploading)
              Text(_statusMessage!,
                  style: const TextStyle(color: Color(0xFF1db954))),
            if (_uploadedFiles.isNotEmpty) ...[
              const SizedBox(height: 16),
              Expanded(
                child: ListView.builder(
                  itemCount: _uploadedFiles.length,
                  itemBuilder: (_, i) => ListTile(
                    leading: const Icon(Icons.check_circle,
                        color: Color(0xFF1db954), size: 20),
                    title: Text(_uploadedFiles[i],
                        style:
                            const TextStyle(color: Colors.white, fontSize: 13)),
                    dense: true,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
