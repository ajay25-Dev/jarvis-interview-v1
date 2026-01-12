"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import type * as duckdb from '@duckdb/duckdb-wasm';
import { getCachedDuckDb, initializeDuckDb } from '@/lib/duckdb-initializer';

type QueryResult = {
  columns: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: any[][];
  rowCount: number;
};

type ExecutionResult = {
  success: boolean;
  result?: QueryResult;
  error?: string;
  executionTime?: number;
};

type UseDuckDBOptions = {
  autoInit?: boolean;
};

export function useDuckDB(options: UseDuckDBOptions = {}) {
  const { autoInit = true } = options;
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(autoInit);
  const [error, setError] = useState<string | null>(null);
  const [shouldInit, setShouldInit] = useState(autoInit);
  const dbRef = useRef<duckdb.AsyncDuckDB | null>(null);
  const connRef = useRef<duckdb.AsyncDuckDBConnection | null>(null);
  const initRequestedRef = useRef(false);

  const attachResources = useCallback(
    (resources: { db: duckdb.AsyncDuckDB; conn: duckdb.AsyncDuckDBConnection }) => {
      dbRef.current = resources.db;
      connRef.current = resources.conn;
      setIsReady(true);
      setIsLoading(false);
    },
    [],
  );

  useEffect(() => {
    if (autoInit) {
      setShouldInit(true);
    }
  }, [autoInit]);

  useEffect(() => {
    if (!shouldInit || isReady || initRequestedRef.current) {
      if (!shouldInit && !isReady) {
        setIsLoading(false);
      }
      return;
    }

    initRequestedRef.current = true;
    let mounted = true;

    const runInitialization = async () => {
      const initStartTime = Date.now();
      console.log('🔧 useDuckDB: Starting initialization...');
      setIsLoading(true);
      setError(null);

      const timeoutId = setTimeout(() => {
        if (mounted) {
          console.error('🔧 useDuckDB: ❌ INITIALIZATION TIMED OUT AFTER 60s');
          setError('DuckDB initialization timed out (60s).');
          setIsLoading(false);
          initRequestedRef.current = false;
        }
      }, 60000);

      console.log('🔧 useDuckDB: Checking for cached instance...');
      const cached = getCachedDuckDb();

      if (cached) {
        clearTimeout(timeoutId);
        console.log('🔧 useDuckDB: ✅ Using cached instance in', Date.now() - initStartTime, 'ms');
        attachResources(cached);
        return;
      }

      try {
        console.log('🔧 useDuckDB: No cached instance found, initializing new DuckDB...');
        const resources = await initializeDuckDb();
        if (!mounted) {
          clearTimeout(timeoutId);
          console.log('🔧 useDuckDB: Component unmounted during initialization');
          return;
        }

        clearTimeout(timeoutId);
        console.log('🔧 useDuckDB: ✅ Initialization completed in', Date.now() - initStartTime, 'ms');
        attachResources(resources);
      } catch (err) {
        clearTimeout(timeoutId);
        console.error('🔧 useDuckDB: ❌ Initialization failed after', Date.now() - initStartTime, 'ms:', err);
        console.error('🔧 useDuckDB: Error details:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : 'No stack trace',
          timestamp: new Date().toISOString()
        });
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to initialize DuckDB');
          setIsLoading(false);
          initRequestedRef.current = false;
        }
      }
    };

    runInitialization();

    return () => {
      mounted = false;
      initRequestedRef.current = false;
    };
  }, [attachResources, isReady, shouldInit]);

  const initialize = useCallback(() => {
    setShouldInit(true);
  }, []);

  const executeQuery = useCallback(async (query: string): Promise<ExecutionResult> => {
    if (!connRef.current || !isReady) {
      return {
        success: false,
        error: 'Database not ready',
      };
    }

    const startTime = performance.now();

    try {
      console.log('🦆 DuckDB: Executing query:', query);
      const result = await connRef.current.query(query);
      const endTime = performance.now();

      console.log('🦆 DuckDB: Query executed, processing results...', {
        numRows: result.numRows,
        numCols: result.numCols
      });

      const columns = result.schema.fields.map(field => field.name);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows: any[][] = [];

      for (let i = 0; i < result.numRows; i++) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row: any[] = [];
        for (let j = 0; j < result.numCols; j++) {
          const column = result.getChildAt(j);
          let val = column?.get(i);
          
          // Handle BigInt and other special types
          if (typeof val === 'bigint') {
            val = val.toString();
          } else if (val instanceof Date) {
            val = val.toISOString();
          } else if (val && typeof val === 'object' && 'toString' in val) {
             // Handle Arrow specific types that might need string conversion
             val = val.toString();
          }
          
          row.push(val);
        }
        rows.push(row);
      }

      console.log('🦆 DuckDB: Results processed:', { columns, rowCount: rows.length });

      return {
        success: true,
        result: {
          columns,
          rows,
          rowCount: result.numRows,
        },
        executionTime: endTime - startTime,
      };
    } catch (err) {
      console.error('🦆 DuckDB: Query execution failed:', err);
      const endTime = performance.now();
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Query execution failed',
        executionTime: endTime - startTime,
      };
    }
  }, [isReady]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const loadDataset = useCallback(async (tableName: string, data: any[], columns?: string[]): Promise<boolean> => {
    if (!connRef.current || !isReady) {
      console.error('Database not ready');
      return false;
    }

    try {
      // Drop table if exists
      const escapedTableName = tableName.replace(/"/g, '""');
      await connRef.current.query(`DROP TABLE IF EXISTS "${escapedTableName}"`);

      // Convert data to Arrow table format
      if (data.length === 0) {
        console.warn('No data to load');
        return false;
      }

      // Create table from JSON data
      const jsonData = JSON.stringify(data);
      const safeJson = jsonData.replace(/'/g, "''");
      await connRef.current.query(
        `CREATE TABLE "${escapedTableName}" AS SELECT * FROM read_json_auto('${safeJson}')`,
      );

      return true;
    } catch (err) {
      console.error('Failed to load dataset:', err);
      return false;
    }
  }, [isReady]);

  const loadDatasetFromSQL = useCallback(async (createSQL: string): Promise<boolean> => {
    if (!connRef.current || !isReady) {
      console.error('Database not ready');
      return false;
    }

    try {
      await connRef.current.query(createSQL);
      return true;
    } catch (err) {
      console.error('Failed to load dataset from SQL:', err);
      return false;
    }
  }, [isReady]);

  const tableExists = useCallback(async (tableName: string): Promise<boolean> => {
    if (!connRef.current || !isReady) {
      console.warn('Database not ready for table existence check');
      return false;
    }

    try {
      const escapedTableName = tableName.replace(/'/g, "''");
      const result = await connRef.current.query(
        `SELECT table_name FROM information_schema.tables WHERE table_name = '${escapedTableName}' AND table_schema = 'main'`
      );
      return result.numRows > 0;
    } catch (err) {
      console.error(`Failed to check if table ${tableName} exists:`, err);
      return false;
    }
  }, [isReady]);

  const reset = useCallback(async (): Promise<void> => {
    if (!connRef.current || !isReady) {
      return;
    }

    try {
      const result = await connRef.current.query('SHOW TABLES');
      const tables: string[] = [];

      for (let i = 0; i < result.numRows; i++) {
        const nameColumn = result.getChildAt(0);
        const name = nameColumn?.get(i);
        if (name) {
          tables.push(String(name));
        }
      }

      for (const table of tables) {
        const escaped = table.replace(/"/g, '""');
        await connRef.current.query(`DROP TABLE IF EXISTS "${escaped}"`);
      }
    } catch (err) {
      console.error('Failed to reset database:', err);
    }
  }, [isReady]);

  return {
    isReady,
    isLoading,
    error,
    executeQuery,
    loadDataset,
    loadDatasetFromSQL,
    tableExists,
    reset,
    initialize,
  };
}
