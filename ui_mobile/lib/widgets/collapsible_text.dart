import 'package:flutter/material.dart';

class CollapsibleText extends StatefulWidget {
  final String text;
  final int maxLines;

  const CollapsibleText({super.key, required this.text, this.maxLines = 3});

  @override
  State<CollapsibleText> createState() => _CollapsibleTextState();
}

class _CollapsibleTextState extends State<CollapsibleText> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        AnimatedCrossFade(
          duration: const Duration(milliseconds: 200),
          crossFadeState:
              _expanded ? CrossFadeState.showSecond : CrossFadeState.showFirst,
          firstChild: Text(
            widget.text,
            maxLines: widget.maxLines,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 13, height: 1.5),
          ),
          secondChild: Text(
            widget.text,
            style: const TextStyle(color: Color(0xFFa7a7a7), fontSize: 13, height: 1.5),
          ),
        ),
        GestureDetector(
          onTap: () => setState(() => _expanded = !_expanded),
          child: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(
              _expanded ? 'Show less' : 'Show more',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 12),
            ),
          ),
        ),
      ],
    );
  }
}
