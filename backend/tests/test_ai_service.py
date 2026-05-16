from app.services.ai_service import AIService


def test_parse_ai_response_keeps_plain_text():
    service = AIService()

    parsed = service._parse_ai_response("当前文档主要介绍 AIDoc 的核心功能。")

    assert parsed["answer"] == "当前文档主要介绍 AIDoc 的核心功能。"
    assert parsed["references"] == []


def test_parse_ai_response_extracts_answer_from_invalid_legacy_json():
    service = AIService()
    raw_response = '''```json
{
  "answer": "当前文档是《AIDoc 使用指南》。\\n\\n1. 支持写作和 AI 对话。",
  "confidence": "high",
  "references": [
    {
      "source_index": 31,
      "quote": "点击 Block 工具栏的"问 AI"按钮"
    }
  ]
}
```'''

    parsed = service._parse_ai_response(raw_response)

    assert parsed["answer"] == "当前文档是《AIDoc 使用指南》。\n\n1. 支持写作和 AI 对话。"
    assert parsed["references"] == []
