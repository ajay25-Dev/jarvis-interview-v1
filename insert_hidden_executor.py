from pathlib import Path
path = Path('src/components/practice/practice-area-ai-enhanced.tsx')
text = path.read_text()
needle = '          )}\n\n\n\n          {/* Results Panel */}\n'
insert = '          )}\n\n          {isTextAnswerMode && (\n            <div class="hidden" aria-hidden="true">\n              <CodeExecutor\n                exerciseType={exerciseType}\n                datasets={datasets}\n                initialCode={userCode}\n                dataCreationSql={dataCreationSql}\n                onSqlTablePreviews={setSqlTablePreviews}\n                onTableList={setDuckDbTableNames}\n              />\n            </div>\n          )}\n\n          {/* Results Panel */}\n'
if needle not in text:
    raise SystemExit('needle not found')
if insert in text:
    raise SystemExit('already inserted')
text = text.replace(needle, insert, 1)
path.write_text(text)
