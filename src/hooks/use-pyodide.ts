"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

type ExecutionResult = {
  success: boolean;
  output?: string;
  error?: string;
  executionTime?: number;
};

type PyodidePackageName = string | string[];

interface PyodideGlobals {
  get: (name: string) => unknown;
}

interface PyodideInstance {
  runPythonAsync: (code: string) => Promise<unknown>;
  loadPackage: (packageName: PyodidePackageName) => Promise<unknown>;
  globals: PyodideGlobals;
}

type LoadPyodideFn = (config: { indexURL: string }) => Promise<PyodideInstance>;

declare global {
  interface Window {
    loadPyodide?: LoadPyodideFn;
  }
}

type UsePyodideOptions = {
  autoInit?: boolean;
};

export function usePyodide(options: UsePyodideOptions = {}) {
  const { autoInit = true } = options;
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(autoInit);
  const [error, setError] = useState<string | null>(null);
  const [shouldInit, setShouldInit] = useState(autoInit);
  const pyodideRef = useRef<PyodideInstance | null>(null);
  const initRequestedRef = useRef(false);

  useEffect(() => {
    if (autoInit) {
      setShouldInit(true);
    }
  }, [autoInit]);

  useEffect(() => {
    if (!shouldInit || pyodideRef.current || initRequestedRef.current) {
      // Don't set isLoading to false when not initializing - this was the bug!
      return;
    }

    initRequestedRef.current = true;
    let mounted = true;

    const initPyodide = async () => {
      const overallStartTime = Date.now();
      try {
        console.log('🐍 Pyodide: Starting initialization...');
        const nav = navigator as Navigator & {
          deviceMemory?: number;
          connection?: { effectiveType?: string };
        };
        console.log('🐍 Pyodide: Browser info:', {
          userAgent: nav.userAgent,
          platform: nav.platform,
          memory: nav.deviceMemory ? `${nav.deviceMemory}GB` : 'unknown',
          connection: nav.connection?.effectiveType ?? 'unknown',
        });
        setIsLoading(true);
        setError(null);

        const timeoutId = setTimeout(() => {
          if (mounted) {
            console.error('🐍 Pyodide: ❌ INITIALIZATION TIMED OUT AFTER 60s');
            console.error('🐍 Pyodide: Check your internet connection and CDN availability');
            setError('Pyodide initialization timed out (60s). Your internet connection might be slow or CDN is unavailable.');
            setIsLoading(false);
            initRequestedRef.current = false;
          }
        }, 60000);

        console.log('🐍 Pyodide: Phase 1 - Checking if script is already loaded...');
        if (!window.loadPyodide) {
          console.log('🐍 Pyodide: Phase 1a - Loading script from /pyodide/pyodide.js...');
          const scriptLoadStart = Date.now();
          const script = document.createElement('script');
          script.src = '/pyodide/pyodide.js';
          script.async = true;
          
          await new Promise<void>((resolve, reject) => {
            script.onload = () => {
                console.log('🐍 Pyodide: Phase 1a completed - Script loaded successfully in', Date.now() - scriptLoadStart, 'ms');
                resolve();
            };
            script.onerror = (e) => {
                console.error('🐍 Pyodide: Phase 1a failed - Script load failed after', Date.now() - scriptLoadStart, 'ms:', e);
                console.error('🐍 Pyodide: Attempted URL:', script.src);
                reject(new Error('Failed to load Pyodide script from local resources'));
            };
            document.head.appendChild(script);
          });
        } else {
            console.log('🐍 Pyodide: Phase 1 completed - Script already loaded');
        }

        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        const loadPyodide = window.loadPyodide;
        if (!loadPyodide) {
          throw new Error('Pyodide loader not available on window');
        }

        console.log('🐍 Pyodide: Phase 2 - Initializing Pyodide engine...');
        const engineInitStart = Date.now();
        const pyodide = await loadPyodide({
          indexURL: '/pyodide/',
          // @ts-expect-error - checkIntegrity might not be in the type definition yet
          checkIntegrity: false,
        });
        console.log('🐍 Pyodide: Phase 2 completed - Engine initialized in', Date.now() - engineInitStart, 'ms');

        // Verify engine is working
        console.log('🐍 Pyodide: Phase 3 - Verifying engine functionality...');
        const verifyStart = Date.now();
        await pyodide.runPythonAsync('print("Python engine verified")');
        console.log('🐍 Pyodide: Phase 3 completed - Engine verified in', Date.now() - verifyStart, 'ms');

        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        console.log('🐍 Pyodide: Phase 4 - Loading Python packages (numpy, pandas)...');
        try {
          console.log('🐍 Pyodide: Phase 4a - Loading numpy first...');
          const numpyStart = Date.now();
          await pyodide.loadPackage('numpy');
          console.log('🐍 Pyodide: Phase 4a completed - numpy loaded in', Date.now() - numpyStart, 'ms');
          
          console.log('🐍 Pyodide: Phase 4b - Loading pandas...');
          const pandasStart = Date.now();
          await pyodide.loadPackage('pandas');
          console.log('🐍 Pyodide: Phase 4b completed - pandas loaded in', Date.now() - pandasStart, 'ms');
        } catch (packageError) {
          console.error('🐍 Pyodide: Phase 4 failed - Failed to load packages:', packageError);
          console.log('🐍 Pyodide: Package loading failed - continuing with core Python only');
          // Continue with basic Python functionality even if packages fail
          console.log('🐍 Pyodide: ⚠️  Core Python functionality available (numpy/pandas may be limited)');
        }

        if (!mounted) {
          clearTimeout(timeoutId);
          return;
        }

        clearTimeout(timeoutId);
        pyodideRef.current = pyodide;
        setIsReady(true);
        setIsLoading(false);
        console.log('🐍 Pyodide: 🎉 ALL PHASES COMPLETED! Total initialization time:', Date.now() - overallStartTime, 'ms');
        console.log('🐍 Pyodide: Ready!');
      } catch (err) {
        console.error('🐍 Pyodide: ❌ INITIALIZATION FAILED after', Date.now() - overallStartTime, 'ms:', err);
        console.error('🐍 Pyodide: Error details:', {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : 'No stack trace'
        });
        if (mounted) {
          const errorMessage = err instanceof Error 
            ? err.message 
            : 'Failed to initialize Pyodide. Please check your internet connection and try again.';
          setError(errorMessage);
          setIsLoading(false);
          initRequestedRef.current = false;
        }
      }
    };

    initPyodide();

    return () => {
      mounted = false;
      initRequestedRef.current = false;
    };
  }, [shouldInit]);

  const initialize = useCallback(() => {
    setShouldInit(true);
  }, []);

  const executeCode = useCallback(async (code: string): Promise<ExecutionResult> => {
    if (!pyodideRef.current || !isReady) {
      return {
        success: false,
        error: 'Python runtime not ready',
      };
    }

    const startTime = performance.now();

    try {
      const captureCode = `
import sys
import traceback
from io import StringIO

_stdout = StringIO()
_stderr = StringIO()
sys.stdout = _stdout
sys.stderr = _stderr

try:
${code.split('\n').map(line => '    ' + line).join('\n')}
except Exception:
    traceback.print_exc(file=sys.stderr)

_output = _stdout.getvalue()
_error = _stderr.getvalue()
`;

      await pyodideRef.current.runPythonAsync(captureCode);
      
      const outputValue = pyodideRef.current.globals.get('_output');
      const errorValue = pyodideRef.current.globals.get('_error');
      const endTime = performance.now();

      console.log('🐍 Pyodide: Execution result:', { outputValue, errorValue });

      const errorText =
        typeof errorValue === 'string'
          ? errorValue
          : errorValue != null
          ? String(errorValue)
          : '';

      if (errorText.trim().length > 0) {
        return {
          success: false,
          error: errorText.trim(),
          executionTime: endTime - startTime,
        };
      }

      const outputText =
        typeof outputValue === 'string'
          ? outputValue
          : outputValue != null
          ? String(outputValue)
          : '';

      return {
        success: true,
        output: outputText.trim(),
        executionTime: endTime - startTime,
      };
    } catch (err) {
      console.error('🐍 Pyodide: Execution error:', err);
      const endTime = performance.now();
      const errorMessage = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: errorMessage,
        executionTime: endTime - startTime,
      };
    }
  }, [isReady]);

  return {
    isReady,
    isLoading,
    error,
    initialize,
    executeCode,
  };
}
