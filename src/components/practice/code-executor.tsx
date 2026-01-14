"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Play, RefreshCw, Database, Code, AlertCircle, Check } from 'lucide-react';
import { useDuckDB } from '@/hooks/use-duckdb';
import { usePyodide } from '@/hooks/use-pyodide';
import { JsonValue, PracticeQuestionType, Dataset } from './types';

export type SqlTablePreview = {
  tableName: string;
  columns: string[];
  rows: JsonValue[][];
  rowCount: number;
};

type CodeExecutorProps = {
  exerciseType: PracticeQuestionType;
  datasets?: Dataset[];
  dataCreationSql?: string;
  initialCode?: string;
  onCodeChange?: (code: string) => void;
  onExecutionComplete?: (result: CodeExecutionResult | null) => void;
  onSqlTablePreviews?: (tables: SqlTablePreview[]) => void;
  onTableList?: (tables: string[]) => void;
};

type CodeExecutionResult = {
  success?: boolean;
  error?: string;
  output?: string;
  result?: {
    columns: string[];
    rows: JsonValue[][];
    rowCount?: number;
  };
};

const normalizeSqlForSignature = (value?: string) => {
  if (!value) return '';
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/;$/, '');
};

const truncateString = (value: string, limit = 160) => {
  if (value.length <= limit) return value;
  return value.substring(0, limit);
};

const safeStringify = (value: unknown) => {
  if (value === undefined || value === null) return '';
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
};

// Remove Markdown-style code fences so SQL sent to DuckDB starts with actual statements.
const stripSqlCodeFences = (value?: string | null) => {
  if (!value) return '';
  return value
    .replace(/```[\w+-]*\s*/gi, '')
    .replace(/\s*```/gi, '')
    .trim();
};

const parseCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (char === '"') {
      const nextChar = line[index + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values.map((value) => value.trim());
};

const sanitizeTableName = (value?: string, fallbackIndex?: number) => {
  const normalized =
    value?.trim().replace(/[^\w]/g, '_').replace(/__+/g, '_') || '';
  if (normalized.length > 0 && /^[A-Za-z]/.test(normalized)) {
    return normalized;
  }
  if (normalized.length > 0) {
    return `table_${normalized}`;
  }
  return `dataset_${fallbackIndex ?? 0}`;
};

const parseCsvToObjects = (csv?: string): Record<string, JsonValue>[] => {
  if (!csv) return [];
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const headerLine = lines[0] ?? '';
  const headers = parseCsvLine(headerLine).map((value, idx) =>
    value.length > 0 ? value : `column_${idx + 1}`,
  );

  if (headers.length === 0) return [];

  const rows: Record<string, JsonValue>[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const parsed = parseCsvLine(lines[i] ?? '');
    const rowRecord: Record<string, JsonValue> = {};
    headers.forEach((header, idx) => {
      const cell = parsed[idx] ?? '';
      rowRecord[header] = cell;
    });
    rows.push(rowRecord);
  }

  return rows;
};

export function buildDatasetSignature(
  datasets: Dataset[] = [],
  dataCreationSql?: string,
  exerciseType?: PracticeQuestionType,
) {
  const normalizedSql = normalizeSqlForSignature(dataCreationSql);
  const sortedDatasets = [...datasets].sort((a, b) => {
    const aLabel = (a.id || a.table_name || a.name || '').toString();
    const bLabel = (b.id || b.table_name || b.name || '').toString();
    return aLabel.localeCompare(bLabel);
  });

  const datasetParts = sortedDatasets.map((dataset) => {
    const identifier = (dataset.id || dataset.table_name || dataset.name || 'unknown').toString();
    const creationSql = normalizeSqlForSignature(dataset.creation_sql || dataset.data_creation_sql);
    const sampleRow = dataset.data && dataset.data.length > 0 ? safeStringify(dataset.data[0]) : '';
    const truncatedSample = truncateString(sampleRow, 120);
    const dataLength = dataset.data?.length ?? 0;
    return `${identifier}:${creationSql}:${dataLength}:${truncatedSample}`;
  });

  const typeLabel = exerciseType || 'unknown';
  return `${typeLabel}::${normalizedSql}::${datasetParts.join('|')}`;
}

export function CodeExecutor({
  exerciseType,
  datasets = [],
  dataCreationSql,
  initialCode = '',
  onCodeChange,
  onExecutionComplete,
  onSqlTablePreviews,
  onTableList,
}: CodeExecutorProps) {
  const [code, setCode] = useState(initialCode);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResult, setExecutionResult] = useState<CodeExecutionResult | null>(null);
  const [datasetsLoaded, setDatasetsLoaded] = useState(false);
  const datasetSignature = useMemo(
    () => buildDatasetSignature(datasets, dataCreationSql, exerciseType),
    [datasets, dataCreationSql, exerciseType],
  );

  const executedStatementsRef = useRef<Set<string>>(new Set());
  const createdTablesRef = useRef<Set<string>>(new Set());
  const datasetSignatureRef = useRef<string>('');

  const dataCreationSqlRef = useRef<string | null>(null);
  const dataLoadInProgressRef = useRef(false);
  const lastSqlTablePreviewsRef = useRef<string>('');
  const lastTableListRef = useRef<string>('');
  const resetPreviewNeededRef = useRef(false);

  console.log("aaa", exerciseType);

  // Determine which engine to use
  const useSQL = exerciseType === 'sql';
  // Default to Python for other code-based types or generic types
  const usePython = exerciseType === 'python' || exerciseType === 'statistics' || !useSQL;

  // Initialize execution engines on demand
  const needsDuckDbSeed =
    useSQL ||
    !!(dataCreationSql?.trim()) ||
    datasets.some(
      (dataset) =>
        Boolean(dataset.creation_sql || dataset.data_creation_sql || (dataset.data && dataset.table_name)),
    );
  const duckdb = useDuckDB({ autoInit: needsDuckDbSeed });
  const pyodide = usePyodide({ autoInit: usePython });
  
  const engine = useSQL ? duckdb : usePython ? pyodide : null;
  const isEngineReady = engine?.isReady && !engine?.isLoading;
  const isEngineLoading = engine?.isLoading || false;
  const engineError = engine?.error || null;
  const duckDbReady = duckdb.isReady && !duckdb.isLoading;
  const [showSlowLoadingWarning, setShowSlowLoadingWarning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isEngineLoading) {
      console.log('⏱️ CodeExecutor: Engine loading started, will show warning after 10s');
      timer = setTimeout(() => {
        console.log('⚠️ CodeExecutor: Still loading after 10 seconds - showing slow loading warning');
        console.log('⚠️ CodeExecutor: Engine details:', {
          exerciseType,
          useSQL,
          usePython,
          isEngineReady,
          engineError: engineError || 'none',
          isEngineLoading
        });
        setShowSlowLoadingWarning(true);
      }, 10000); // Show warning after 10 seconds
    } else {
      console.log('✅ CodeExecutor: Engine loading completed, hiding any loading warnings');
      setShowSlowLoadingWarning(false);
    }
    return () => clearTimeout(timer);
  }, [isEngineLoading, exerciseType, useSQL, usePython, isEngineReady, engineError]);

  useEffect(() => {
    if (datasetSignatureRef.current === datasetSignature) {
      return;
    }

    datasetSignatureRef.current = datasetSignature;
    executedStatementsRef.current.clear();
    createdTablesRef.current.clear();
    dataCreationSqlRef.current = null;
    setDatasetsLoaded(false);
    lastSqlTablePreviewsRef.current = '';
    lastTableListRef.current = '';
    resetPreviewNeededRef.current = true;
  }, [datasetSignature]);

  // Load datasets when engine is ready or required engines become available
  useEffect(() => {
    if (datasetsLoaded) return;
    if (!duckDbReady) return;

    if (!needsDuckDbSeed && datasets.length === 0) {
      setDatasetsLoaded(true);
      return;
    }

    const resetSqlPreviews = () => {
      if (lastSqlTablePreviewsRef.current !== '') {
        lastSqlTablePreviewsRef.current = '';
        onSqlTablePreviews?.([]);
      }
      if (lastTableListRef.current !== '') {
        lastTableListRef.current = '';
        onTableList?.([]);
      }
    };

    if (resetPreviewNeededRef.current) {
      resetSqlPreviews();
      resetPreviewNeededRef.current = false;
    }

    const escapeSqlIdentifier = (identifier: string) =>
      `"${identifier.replace(/"/g, '""')}"`;

    const escapeSqlValue = (value: JsonValue): string => {
      if (value === null || value === undefined || value === '') {
        return 'NULL';
      }
      if (typeof value === 'number' && Number.isFinite(value)) {
        return String(value);
      }
      if (typeof value === 'boolean') {
        return value ? 'TRUE' : 'FALSE';
      }
      const stringValue = String(value);
      const escaped = stringValue.replace(/'/g, "''");
      return `'${escaped}'`;
    };

    const buildInsertStatements = (
      targetTable: string,
      columnOrder: string[],
      rows: Record<string, JsonValue>[],
    ): string => {
      if (rows.length === 0 || columnOrder.length === 0) {
        return '';
      }

      const columnsPart = columnOrder.map(escapeSqlIdentifier).join(', ');
      return rows
        .map((row) => {
          const rowValues = columnOrder.map((column) => escapeSqlValue(row[column] ?? null));
          return `INSERT INTO ${escapeSqlIdentifier(targetTable)} (${columnsPart}) VALUES (${rowValues.join(
            ', ',
          )});`;
        })
        .join('\n');
    };

    const loadDatasets = async () => {
      if (dataLoadInProgressRef.current) {
        return;
      }
      dataLoadInProgressRef.current = true;

      const executedStatements = executedStatementsRef.current;
      const createdTables = createdTablesRef.current;

      const extractCreateTableNames = (sql: string): string[] => {
        const matches: string[] = [];
        const regex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([A-Za-z0-9_]+)["'`]?/gi;
        let match: RegExpExecArray | null;
        while ((match = regex.exec(sql)) !== null) {
          if (match[1]) {
            matches.push(match[1].toLowerCase());
          }
        }
        return matches;
      };

    const splitSqlStatements = (sql: string) => {
      const statements: string[] = [];
        let current = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inBacktick = false;

        for (let i = 0; i < sql.length; i += 1) {
          const char = sql[i];
          const prevChar = sql[i - 1] ?? '';

          if (char === '\'' && prevChar !== '\\' && !inDoubleQuote && !inBacktick) {
            inSingleQuote = !inSingleQuote;
          } else if (char === '"' && prevChar !== '\\' && !inSingleQuote && !inBacktick) {
            inDoubleQuote = !inDoubleQuote;
          } else if (char === '`' && prevChar !== '\\' && !inSingleQuote && !inDoubleQuote) {
            inBacktick = !inBacktick;
          }

          let isNewStatementStart = false;
          if ((char === 'c' || char === 'C') && !inSingleQuote && !inDoubleQuote && !inBacktick) {
            const substr = sql.substring(i, i + 12).toUpperCase();
            const isStartOfWord = i === 0 || /\s/.test(prevChar) || prevChar === ';';
            if (substr === 'CREATE TABLE' && current.trim().length > 0 && isStartOfWord) {
              isNewStatementStart = true;
            }
          }

          if ((char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) || isNewStatementStart) {
            if (current.trim().length > 0) {
              statements.push(current.trim());
            }
            current = '';
            if (isNewStatementStart) {
              current += char;
            }
          } else {
            current += char;
          }
        }

        if (current.trim().length > 0) {
          statements.push(current.trim());
        }

      return statements;
    };

    const creationSqlLooksLikeSql = (sql: string) => {
      if (!sql) return false;
      return /\b(create\s+table|insert\s+into|with\s+|alter\s+table|drop\s+table)\b/i.test(sql);
    };

      const executeSqlBlock = async (sql?: string) => {
        const sqlInput = stripSqlCodeFences(sql);
        if (!sqlInput) return;

        const sanitized = sqlInput.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');

        for (const statement of splitSqlStatements(sanitized)) {
          const normalized = statement.replace(/\s+/g, ' ').trim();
          if (!normalized || executedStatements.has(normalized.toLowerCase())) {
            continue;
          }

          const createTableMatches = Array.from(
            normalized.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([^`"'\s;]+)[`"']?/gi),
          );

          if (createTableMatches.length > 0) {
            let allTablesExist = true;
            const tablesFound: string[] = [];

           for (const match of createTableMatches) {
             const tableName = match[1] ?? '';
              tablesFound.push(tableName);
              const exists = await duckdb.tableExists(tableName);
              if (!exists) {
                allTablesExist = false;
              }
            }

            if (allTablesExist) {
              console.log(`Tables [${tablesFound.join(', ')}] already exist, skipping creation.`);
              executedStatements.add(normalized.toLowerCase());
              continue;
            }
            console.log(`Some tables in [${tablesFound.join(', ')}] do not exist, executing creation statement.`);
          }

          const result = await duckdb.executeQuery(statement);
          if (!result.success) {
            console.error('Failed to execute SQL statement:', {
              statement,
              error: result.error,
            });
            throw new Error(result.error || 'SQL execution failed');
          }

          executedStatements.add(normalized.toLowerCase());
          extractCreateTableNames(statement).forEach((table) => createdTables.add(table));
        }
      };

      try {
        console.log('dY\"\\u0015 CodeExecutor: Loading datasets into DuckDB...', {
          hasDataCreationSql: !!dataCreationSql,
          dataCreationSqlLength: dataCreationSql?.length || 0,
          datasetsCount: datasets.length,
        });
        
        const sanitizedDataCreationSql = stripSqlCodeFences(dataCreationSql);
        if (sanitizedDataCreationSql.length > 0) {
          if (dataCreationSqlRef.current !== sanitizedDataCreationSql) {
            console.log('dY\"S CodeExecutor: Executing data creation SQL...');
            await executeSqlBlock(sanitizedDataCreationSql);
            dataCreationSqlRef.current = sanitizedDataCreationSql;
            console.log('バ. CodeExecutor: Data creation SQL executed in DuckDB.');
          } else {
            console.log('dY\"< CodeExecutor: Skipping already executed data creation SQL.');
          }
        } else {
          dataCreationSqlRef.current = null;
        }

        for (const [datasetIndex, dataset] of datasets.entries()) {
          const schemaRows =
            dataset.schema_info && Array.isArray(dataset.schema_info.dataset_rows)
              ? (dataset.schema_info.dataset_rows as Record<string, JsonValue>[])
              : [];

          const datasetRows =
            Array.isArray(dataset.data) && dataset.data.length > 0
              ? dataset.data
              : schemaRows.length > 0
                ? schemaRows
                : parseCsvToObjects(dataset.dataset_csv_raw);

          const tableName =
            dataset.table_name ||
            sanitizeTableName(dataset.name || dataset.id, datasetIndex + 1);

          const creationSqlRaw = dataset.creation_sql || dataset.data_creation_sql;
          const sanitizedCreationSql = stripSqlCodeFences(creationSqlRaw);
          const shouldExecuteCreationSql = creationSqlLooksLikeSql(sanitizedCreationSql);

          if (sanitizedCreationSql.length > 0 && shouldExecuteCreationSql) {
            const creationTables = extractCreateTableNames(sanitizedCreationSql);
            const shouldExecute =
              creationTables.length === 0 ||
              creationTables.some((name) => !createdTables.has(name));

            if (!shouldExecute) {
              console.log(
                `dY\"S CodeExecutor: Skipping creation SQL for dataset ${dataset.name} (tables already created)`,
              );
            } else {
              console.log(`dY\"S CodeExecutor: Executing creation SQL for dataset: ${dataset.name}`);
              await executeSqlBlock(sanitizedCreationSql);

              const creationHasInsert = /INSERT\s+INTO/i.test(sanitizedCreationSql);
              if (!creationHasInsert && datasetRows.length > 0) {
                const columnCandidates =
                  Array.isArray(dataset.columns) && dataset.columns.length > 0
                    ? dataset.columns
                    : Object.keys(datasetRows[0] || {});
                const insertSql = buildInsertStatements(tableName, columnCandidates, datasetRows);
                if (insertSql) {
                  console.log(
                    `dY\"S CodeExecutor: Inserting rows for dataset ${tableName} via generated SQL`,
                  );
                  await executeSqlBlock(insertSql);
                }
              }
            }
          } else if (sanitizedCreationSql.length > 0) {
            console.log(
              `dY\"S CodeExecutor: Skipping creation SQL for dataset ${dataset.name} (looks like CSV or non-SQL text)`,
            );
          } else {
            if (datasetRows.length > 0) {
              console.log(
                `dY\"S CodeExecutor: Loading dataset: ${tableName} (rows=${datasetRows.length})`,
              );
              await duckdb.loadDataset(tableName, datasetRows, dataset.columns);
            } else {
              console.log(
                `dY\"S CodeExecutor: No rows available to load dataset: ${tableName}`,
              );
            }
          }
        }

            const showTablesResult = await duckdb.executeQuery('SHOW TABLES');
            if (showTablesResult.success) {
              console.log('dY\"< CodeExecutor: Tables in DuckDB:', showTablesResult.result?.rows);
            }
        const tableNames =
          showTablesResult.success && showTablesResult.result
            ? (showTablesResult.result.rows ?? [])
                .map((row) => (Array.isArray(row) ? row[0] : row))
                .filter((value): value is string => typeof value === 'string')
            : [];
        const sortedTableNames = [...tableNames].sort();
        const tableListSignature = sortedTableNames.join(',');
        if (tableListSignature !== lastTableListRef.current) {
          lastTableListRef.current = tableListSignature;
          onTableList?.(tableNames);
        }

        const gatherSqlTablePreviews = async (): Promise<SqlTablePreview[]> => {
          if (!showTablesResult.success || !showTablesResult.result) {
            return [];
          }

          const previews: SqlTablePreview[] = [];

          for (const tableName of tableNames) {
            const escapedTable = tableName.replace(/"/g, '""');
            try {
              const previewResult = await duckdb.executeQuery(
                `SELECT * FROM "${escapedTable}" LIMIT 5`,
              );
              if (!previewResult.success || !previewResult.result) {
                continue;
              }
              previews.push({
                tableName,
                columns: previewResult.result.columns,
                rows: previewResult.result.rows,
                rowCount: previewResult.result.rowCount ?? previewResult.result.rows.length ?? 0,
              });
            } catch (previewError) {
              console.error('dY\"? CodeExecutor: Failed to fetch preview for table', tableName, previewError);
            }
          }

          return previews;
        };

        const sqlTablePreviews = await gatherSqlTablePreviews();
        const previewSignature = sqlTablePreviews
          .map((table) => `${table.tableName}:${table.rowCount}`)
          .sort()
          .join('|');
        if (previewSignature !== lastSqlTablePreviewsRef.current) {
          lastSqlTablePreviewsRef.current = previewSignature;
          onSqlTablePreviews?.(sqlTablePreviews);
        }

        setDatasetsLoaded(true);
        console.log('ƒo. CodeExecutor: All datasets loaded successfully');
      } catch (error) {
        console.error('ƒ?O CodeExecutor: Failed to load datasets into DuckDB:', error);
        resetSqlPreviews();
        setExecutionResult({
          success: false,
          error: error instanceof Error ? error.message : 'Failed to load datasets',
        });
      } finally {
        dataLoadInProgressRef.current = false;
      }
    };

    loadDatasets();
  }, [
    duckDbReady,
    datasetsLoaded,
    needsDuckDbSeed,
    datasets,
    dataCreationSql,
    duckdb,
    onSqlTablePreviews,
    onTableList,
  ]);

  // Update code when initialCode changes
  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode);
    onCodeChange?.(newCode);
  }, [onCodeChange]);

  const executeCode = useCallback(async () => {
    if (!isEngineReady || isExecuting) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      let result;

      if (useSQL && duckdb.isReady) {
        console.log('CodeExecutor: Executing SQL...');
        result = await duckdb.executeQuery(code);
        console.log('CodeExecutor: SQL Result:', result);
      } else if (usePython && pyodide.isReady) {
        result = await pyodide.executeCode(code);
      } else {
        result = {
          success: false,
          error: 'Execution engine not available for this exercise type',
        };
      }

      setExecutionResult(result);
      onExecutionComplete?.(result);
    } catch (error) {
      const errorResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
      };
      setExecutionResult(errorResult);
      onExecutionComplete?.(errorResult);
    } finally {
      setIsExecuting(false);
    }
  }, [isEngineReady, isExecuting, code, useSQL, usePython, duckdb, pyodide, onExecutionComplete]);

  const handleReset = useCallback(() => {
    setCode(initialCode);
    setExecutionResult(null);
    onCodeChange?.(initialCode);
  }, [initialCode, onCodeChange]);

  const getPlaceholder = () => {
    switch (exerciseType) {
      case 'sql':
        return '-- Write your SQL query here\nSELECT * FROM table_name;';
      case 'python':
        return '# Write your Python code here\nprint("Hello, World!")';
      case 'statistics':
        return '# Statistical analysis\nimport pandas as pd\nimport numpy as np\n\n# Your analysis here';
      default:
        return '# Write your code here';
    }
  };

  const getEditorTheme = () => {
    if (exerciseType === 'sql') {
      return {
        bg: 'bg-[#0f172a]',
        text: 'text-green-400',
        border: 'border-gray-700',
      };
    }
    return {
      bg: 'bg-gray-900',
      text: 'text-gray-100',
      border: 'border-gray-700',
    };
  };

  const theme = getEditorTheme();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2 text-white">
          {useSQL ? <Database className="w-4 h-4" /> : <Code className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {exerciseType === 'sql' ? 'SQL' : exerciseType === 'python' ? 'Python' : 'Code'} Editor
          </span>
          {isEngineLoading && (
            <span className="text-xs text-yellow-400 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {showSlowLoadingWarning ? 'Still loading (this is taking longer than usual)...' : 'Loading Engine...'}
            </span>
          )}
          {!isEngineLoading && isEngineReady && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              <Check className="w-3 h-3" />
              Ready
            </span>
          )}
          {datasetsLoaded && datasets.length > 0 && (
            <span className="text-xs text-blue-400 flex items-center gap-1">
              <Database className="w-3 h-3" />
              Data Loaded
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            disabled={isExecuting}
            className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
          <button
            onClick={executeCode}
            disabled={!isEngineReady || isExecuting}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
          >
            {isExecuting ? (
              <RefreshCw className="w-3 h-3 animate-spin" />
            ) : (
              <Play className="w-3 h-3" />
            )}
            {isExecuting ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>

      {/* Engine Error */}
      {engineError && (
        <div className="px-4 py-2 bg-red-900/20 border-b border-red-800 text-red-400 text-sm flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {engineError}
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="text-xs underline hover:text-red-300"
          >
            Reload Page
          </button>
        </div>
      )}

      {/* Code Editor */}
      <div className={`flex-1 flex flex-col min-h-0 ${executionResult ? 'h-1/2' : 'h-full'}`}>
        <textarea
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className={`flex-1 font-mono text-sm p-4 outline-none resize-none ${theme.bg} ${theme.text}`}
          placeholder={getPlaceholder()}
          spellCheck={false}
          style={{
            fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
          }}
        />
      </div>

      {/* Execution Results */}
      {executionResult && (
        <div className="h-1/2 border-t border-gray-700 flex flex-col bg-white">
          <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Execution Result
            </span>
            <button 
              onClick={() => setExecutionResult(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4">
            {executionResult.error ? (
              <div className="text-red-600 font-mono text-sm whitespace-pre-wrap">
                <div className="flex items-center gap-2 font-bold mb-2">
                  <AlertCircle className="w-4 h-4" />
                  Error
                </div>
                {executionResult.error}
              </div>
            ) : useSQL ? (
              executionResult.result ? (
                executionResult.result.rows.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm border border-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {executionResult.result.columns.map((col: string, i: number) => (
                            <th key={i} className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider border-b">
                              {col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {executionResult.result.rows.map((row, i) => (
                          <tr key={i} className="hover:bg-gray-50">
                            {row.map((cell, j) => (
                              <td key={j} className="px-3 py-2 whitespace-nowrap text-gray-900 border-r last:border-r-0">
                                {cell?.toString() ?? <span className="text-gray-400 italic">NULL</span>}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 text-xs text-gray-500">
                      {executionResult.result.rows.length} rows returned
                    </div>
                  </div>
                ) : (
                  <div className="text-gray-500 italic">Query executed successfully. No rows returned.</div>
                )
              ) : (
                <div className="text-gray-500 italic">Query executed successfully. No result set returned.</div>
              )
            ) : usePython && executionResult.output ? (
              <div className="font-mono text-sm whitespace-pre-wrap text-gray-800">
                {executionResult.output}
              </div>
            ) : (
              <div className="text-gray-500 italic">Execution completed successfully.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
