import { useState, useEffect, useCallback, useRef } from 'react';
import { JsonValue } from '@/components/practice/types';

type SqlValue = JsonValue;

interface SqlExecResult {
  columns: string[];
  values: SqlValue[][];
}

interface SqlJsDatabase {
  exec: (sql: string) => SqlExecResult[];
  run: (sql: string, params?: SqlValue[]) => void;
  export: () => Uint8Array;
  close: () => void;
}

interface SqlJsStatic {
  Database: new (data?: ArrayBuffer | Uint8Array) => SqlJsDatabase;
}

interface WindowWithInitSqlJs extends Window {
  initSqlJs: (config: { locateFile: (file: string) => string }) => Promise<SqlJsStatic>;
}

type SqlRow = Record<string, SqlValue>;

export interface SQLResult {
  columns: string[];
  values: SqlValue[][];
}

export interface SQLiteError {
  message: string;
  errno?: number;
}

export interface UseSQLiteReturn {
  db: SqlJsDatabase | null;
  isLoading: boolean;
  error: SQLiteError | null;
  execute: (sql: string) => Promise<SQLResult[]>;
  createTable: (tableName: string, columns: string[]) => Promise<void>;
  insertData: (tableName: string, data: SqlRow[]) => Promise<void>;
  runQuery: (sql: string) => Promise<SQLResult[]>;
  exportDatabase: () => Uint8Array | null;
  importDatabase: (buffer: Uint8Array) => Promise<void>;
  resetDatabase: () => Promise<void>;
}

export function useSQLite(initialData?: ArrayBuffer | Uint8Array): UseSQLiteReturn {
  const [db, setDb] = useState<SqlJsDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<SQLiteError | null>(null);
  const SQL = useRef<SqlJsStatic | null>(null);
  const dbRef = useRef<SqlJsDatabase | null>(null);

  useEffect(() => {
    const initializeSQL = async () => {
      try {
        setIsLoading(true);
        setError(null);

        if (typeof window === 'undefined') {
          setError({ message: 'SQLite only works in browser environment' });
          setIsLoading(false);
          return;
        }

        const timeoutId = setTimeout(() => {
          setError({
            message: 'SQLite initialization timed out. The CDN might be unavailable or your connection is slow.'
          });
          setIsLoading(false);
        }, 30000);

        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
        script.async = true;
        
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load SQL.js from CDN'));
          document.head.appendChild(script);
        });

        const sqlModule = await (window as unknown as WindowWithInitSqlJs).initSqlJs({
          locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });
        SQL.current = sqlModule;

        let database: SqlJsDatabase;

        if (initialData) {
          database = new sqlModule.Database(initialData);
        } else {
          database = new sqlModule.Database();
        }

        clearTimeout(timeoutId);
        setDb(database);
        dbRef.current = database;
        setIsLoading(false);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to initialize SQLite database. Please check your internet connection and try again.';
        const errno =
          err && typeof err === 'object' && 'errno' in err ? (err as { errno?: number }).errno : undefined;
        console.error('Failed to initialize SQLite:', err);
        setError({
          message: errorMessage,
          errno
        });
        setIsLoading(false);
      }
    };

    initializeSQL();

    return () => {
      if (dbRef.current) {
        try {
          dbRef.current.close();
        } catch (err) {
          console.warn('Error closing database:', err);
        }
      }
    };
  }, [initialData]);

  const execute = useCallback(async (sql: string): Promise<SQLResult[]> => {
    if (!db || !SQL.current) {
      throw new Error('Database not initialized');
    }

    try {
      const results: SQLResult[] = [];
      const statements = sql.trim().split(';').filter(stmt => stmt.trim());

      for (const statement of statements) {
        const trimmedStatement = statement.trim();
        if (!trimmedStatement) continue;

        try {
          const isSelect = /^\s*SELECT/i.test(trimmedStatement);
          const isExplain = /^\s*EXPLAIN/i.test(trimmedStatement);
          const isPragma = /^\s*PRAGMA/i.test(trimmedStatement);

          if (isSelect || isExplain || isPragma) {
            const result = db.exec(trimmedStatement);
            if (result.length > 0) {
              result.forEach((res: SqlExecResult) => {
                results.push({
                  columns: res.columns,
                  values: res.values
                });
              });
            } else {
              results.push({
                columns: [],
                values: []
              });
            }
          } else {
            const upperStatement = trimmedStatement.toUpperCase().trim();

            if (upperStatement.startsWith('SHOW ')) {
              if (upperStatement === 'SHOW TABLES') {
                const result = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
                if (result.length > 0) {
                  result.forEach((res: SqlExecResult) => {
                    results.push({
                      columns: res.columns,
                      values: res.values
                    });
                  });
                } else {
                  results.push({
                    columns: [],
                    values: []
                  });
                }
              } else if (upperStatement === 'SHOW DATABASES') {
                results.push({
                  columns: ['Database'],
                  values: [['main']]
                });
              } else {
                throw new Error(`SQLite doesn't support "${trimmedStatement}". Try "SELECT name FROM sqlite_master WHERE type='table';" for tables.`);
              }
            } else if (upperStatement.startsWith('USE ')) {
              results.push({
                columns: ['Message'],
                values: [['SQLite uses a single database file - no USE command needed']]
              });
            } else {
              db.run(trimmedStatement);
            }
          }
        } catch (stmtError) {
          const stmtMessage = stmtError instanceof Error ? stmtError.message : String(stmtError);
          console.error(`Error in statement "${trimmedStatement}":`, stmtError);
          throw new Error(`SQL Error: ${stmtMessage}`);
        }
      }

      return results;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('SQL execution error:', err);
      throw new Error(`Database error: ${errorMessage}`);
    }
  }, [db]);

  const createTable = useCallback(async (tableName: string, columns: string[]): Promise<void> => {
    const columnDefinitions = columns.map(col => {
      return `"${col}" TEXT`;
    }).join(', ');

    const sql = `CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefinitions})`;
    await execute(sql);
  }, [execute]);

  const insertData = useCallback(async (tableName: string, data: SqlRow[]): Promise<void> => {
    if (data.length === 0) return;

    if (!db) {
      throw new Error('Database not initialized');
    }

    const firstRow = data[0];
    if (!firstRow) return;

    const columns = Object.keys(firstRow);
    const placeholders = columns.map(() => '?').join(', ');
    const columnNames = columns.map(col => `"${col}"`).join(', ');

    const sql = `INSERT INTO "${tableName}" (${columnNames}) VALUES (${placeholders})`;

    for (const row of data) {
      const values = columns.map(col => row[col]);
      db.run(sql, values);
    }
  }, [db]);

  const runQuery = useCallback(async (sql: string): Promise<SQLResult[]> => {
    return execute(sql);
  }, [execute]);

  const exportDatabase = useCallback((): Uint8Array | null => {
    if (!db) return null;
    return db.export();
  }, [db]);

  const importDatabase = useCallback(async (buffer: Uint8Array): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (db) {
        db.close();
      }

      if (!SQL.current) {
        throw new Error('SQLite runtime not initialized');
      }
      const newDb = new SQL.current.Database(buffer);
      setDb(newDb);
      dbRef.current = newDb;
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to import database';
      const errno =
        err && typeof err === 'object' && 'errno' in err ? (err as { errno?: number }).errno : undefined;
      console.error('Failed to import database:', err);
      setError({
        message: errorMessage,
        errno
      });
      setIsLoading(false);
      throw err;
    }
  }, [db]);

  const resetDatabase = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (db) {
        db.close();
      }

      if (!SQL.current) {
        throw new Error('SQLite runtime not initialized');
      }
      const newDb = new SQL.current.Database();
      setDb(newDb);
      dbRef.current = newDb;
      setIsLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset database';
      const errno =
        err && typeof err === 'object' && 'errno' in err ? (err as { errno?: number }).errno : undefined;
      console.error('Failed to reset database:', err);
      setError({
        message: errorMessage,
        errno
      });
      setIsLoading(false);
      throw err;
    }
  }, [db]);

  return {
    db,
    isLoading,
    error,
    execute,
    createTable,
    insertData,
    runQuery,
    exportDatabase,
    importDatabase,
    resetDatabase
  };
}
