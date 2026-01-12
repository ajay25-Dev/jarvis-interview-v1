"use client";

import type * as duckdb from "@duckdb/duckdb-wasm";

type DuckDbModule = typeof import("@duckdb/duckdb-wasm");

type DuckDbResources = {
  db: duckdb.AsyncDuckDB;
  conn: duckdb.AsyncDuckDBConnection;
};

let initPromise: Promise<DuckDbResources> | null = null;
let cachedResources: DuckDbResources | null = null;
let duckdbModulePromise: Promise<DuckDbModule> | null = null;

async function loadDuckDbModule(): Promise<DuckDbModule> {
  if (!duckdbModulePromise) {
    duckdbModulePromise = import("@duckdb/duckdb-wasm");
  }
  return duckdbModulePromise;
}

export async function initializeDuckDb(): Promise<DuckDbResources> {
  if (cachedResources) {
    console.log('🦆 DuckDB: Using cached instance');
    return cachedResources;
  }

  if (initPromise) {
    console.log('🦆 DuckDB: Waiting for existing initialization');
    return initPromise;
  }

  initPromise = (async () => {
    const overallStartTime = Date.now();
    console.log('dYİ+ DuckDB: Starting initialization...');
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { effectiveType?: string };
    };
    console.log('dYİ+ DuckDB: Browser info:', {
      userAgent: nav.userAgent,
      platform: nav.platform,
      memory: nav.deviceMemory ? `${nav.deviceMemory}GB` : 'unknown',
      connection: nav.connection?.effectiveType ?? 'unknown'
    });

    try {
      console.log('dYİ+ DuckDB: Phase 1 - Loading module...');
      const moduleLoadStart = Date.now();
      const duckdb = await loadDuckDbModule();
      console.log('dYİ+ DuckDB: Phase 1 completed - Module loaded in', Date.now() - moduleLoadStart, 'ms');

      console.log('dYİ+ DuckDB: Phase 2 - Selecting bundle...');
      const bundleSelectStart = Date.now();
      const bundle = await duckdb.selectBundle({
        mvp: {
          mainModule: window.location.origin + '/duckdb/duckdb-mvp.wasm',
          mainWorker: window.location.origin + '/duckdb/duckdb-browser-mvp.worker.js',
        },
        eh: {
          mainModule: window.location.origin + '/duckdb/duckdb-eh.wasm',
          mainWorker: window.location.origin + '/duckdb/duckdb-browser-eh.worker.js',
        },
      });
      console.log('dYİ+ DuckDB: Phase 2 completed - Selected bundle:', bundle, 'in', Date.now() - bundleSelectStart, 'ms');

      console.log('dYİ+ DuckDB: Phase 3 - Creating worker...');
      const workerCreateStart = Date.now();
      const workerUrl = URL.createObjectURL(
        new Blob([`importScripts("${bundle.mainWorker}");`], {
          type: "text/javascript",
        }),
      );

      console.log('dYİ+ DuckDB: Created worker URL:', workerUrl);
      const worker = new Worker(workerUrl);
      console.log('dYİ+ DuckDB: Phase 3 completed - Worker created in', Date.now() - workerCreateStart, 'ms');

      console.log('dYİ+ DuckDB: Phase 4 - Creating database instance...');
      const dbCreateStart = Date.now();
      const logger = new duckdb.ConsoleLogger();
      const db = new duckdb.AsyncDuckDB(logger, worker);
      console.log('dYİ+ DuckDB: Phase 4 completed - Database instance created in', Date.now() - dbCreateStart, 'ms');

      console.log('dYİ+ DuckDB: Phase 5 - Instantiating database...');
      const instantiateStart = Date.now();
      await db.instantiate(bundle.mainModule, bundle.pthreadWorker || undefined);
      console.log('dYİ+ DuckDB: Phase 5 completed - Database instantiated in', Date.now() - instantiateStart, 'ms');

      URL.revokeObjectURL(workerUrl);

      console.log('dYİ+ DuckDB: Phase 6 - Connecting to database...');
      const connectStart = Date.now();
      const conn = await db.connect();
      console.log('dYİ+ DuckDB: Phase 6 completed - Connected in', Date.now() - connectStart, 'ms');

      cachedResources = { db, conn };
      console.log('dYİ+ DuckDB: 🎉 ALL PHASES COMPLETED! Total initialization time:', Date.now() - overallStartTime, 'ms');
      return cachedResources;
    } catch (error) {
      console.error('dYİ+ DuckDB: Initialization failed:', error);
      throw error;
    }
  })();

  try {
    return await initPromise;
  } finally {
    initPromise = null;
  }
}

export function getCachedDuckDb(): DuckDbResources | null {
  return cachedResources;
}

export async function terminateDuckDb(): Promise<void> {
  if (!cachedResources) {
    return;
  }

  try {
    await cachedResources.conn.close();
  } catch (error) {
    console.error("[DuckDB] Failed to close connection:", error);
  }

  try {
    await cachedResources.db.terminate();
  } catch (error) {
    console.error("[DuckDB] Failed to terminate instance:", error);
  }

  cachedResources = null;
}
