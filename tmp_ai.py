from pathlib import Path
text = Path('src/components/practice/practice-area-ai-enhanced.tsx').read_text()
start = text.index('{hasAiEval ? (')
end = text.index('{backendRawResponse && (', start)
print(text[start:end])
