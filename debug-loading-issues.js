/**
 * Debug Loading Issues Script
 * This script helps identify why DuckDB/Pyodide are taking longer than usual to load
 * Run this in the browser console when experiencing loading issues
 */

(function() {
  'use strict';
  
  console.log('🔍 Loading Issues Debugger Started');
  console.log('📊 Monitoring network requests and initialization phases...');
  
  // Monitor all network requests
  const originalFetch = window.fetch;
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  // Track fetch requests
  window.fetch = function(...args) {
    const url = args[0];
    const startTime = performance.now();
    
    console.log('🌐 FETCH START:', url);
    
    return originalFetch.apply(this, args)
      .then(response => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (response.ok) {
          console.log(`✅ FETCH SUCCESS: ${url} (${duration.toFixed(2)}ms)`, {
            status: response.status,
            statusText: response.statusText,
            size: response.headers.get('content-length') || 'unknown'
          });
        } else {
          console.error(`❌ FETCH FAILED: ${url} (${duration.toFixed(2)}ms)`, {
            status: response.status,
            statusText: response.statusText
          });
        }
        
        return response;
      })
      .catch(error => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.error(`❌ FETCH ERROR: ${url} (${duration.toFixed(2)}ms)`, error);
        throw error;
      });
  };
  
  // Track XMLHttpRequest
  XMLHttpRequest.prototype.open = function(method, url, ...args) {
    this._debugUrl = url;
    this._debugMethod = method;
    this._debugStartTime = performance.now();
    
    console.log(`🌐 XHR START: ${method} ${url}`);
    
    return originalXHROpen.apply(this, [method, url, ...args]);
  };
  
  XMLHttpRequest.prototype.send = function(...args) {
    const originalOnReadyStateChange = this.onreadystatechange;
    
    this.onreadystatechange = function(event) {
      if (this.readyState === 4) {
        const endTime = performance.now();
        const duration = endTime - this._debugStartTime;
        
        if (this.status >= 200 && this.status < 300) {
          console.log(`✅ XHR SUCCESS: ${this._debugMethod} ${this._debugUrl} (${duration.toFixed(2)}ms)`, {
            status: this.status,
            statusText: this.statusText
          });
        } else {
          console.error(`❌ XHR FAILED: ${this._debugMethod} ${this._debugUrl} (${duration.toFixed(2)}ms)`, {
            status: this.status,
            statusText: this.statusText
          });
        }
      }
      
      if (originalOnReadyStateChange) {
        originalOnReadyStateChange.call(this, event);
      }
    };
    
    return originalXHRSend.apply(this, args);
  };
  
  // Monitor script loading
  const originalCreateElement = document.createElement;
  document.createElement = function(tagName) {
    const element = originalCreateElement.call(this, tagName);
    
    if (tagName.toLowerCase() === 'script') {
      const originalSetAttribute = element.setAttribute;
      element.setAttribute = function(name, value) {
        if (name === 'src') {
          console.log('📜 SCRIPT LOADING:', value);
          
          const originalOnload = this.onload;
          const originalOnerror = this.onerror;
          
          this.onload = function(event) {
            console.log(`✅ SCRIPT LOADED: ${value}`);
            if (originalOnload) originalOnload.call(this, event);
          };
          
          this.onerror = function(event) {
            console.error(`❌ SCRIPT FAILED: ${value}`, event);
            if (originalOnerror) originalOnerror.call(this, event);
          };
        }
        
        return originalSetAttribute.call(this, name, value);
      };
    }
    
    return element;
  };
  
  // Monitor Web Workers
  const originalWorker = window.Worker;
  window.Worker = function(scriptURL, options) {
    console.log('👷 WORKER CREATING:', scriptURL);
    
    try {
      const worker = new originalWorker(scriptURL, options);
      
      worker.addEventListener('error', function(event) {
        console.error('❌ WORKER ERROR:', event);
      });
      
      worker.addEventListener('message', function(event) {
        if (event.data && typeof event.data === 'object' && event.data.type === 'error') {
          console.error('❌ WORKER MESSAGE ERROR:', event.data);
        }
      });
      
      return worker;
    } catch (error) {
      console.error('❌ WORKER CREATION FAILED:', scriptURL, error);
      throw error;
    }
  };
  
  // Monitor console errors
  const originalError = console.error;
  console.error = function(...args) {
    originalError.apply(console, args);
    
    // Check for DuckDB/Pyodide related errors
    const message = args.join(' ');
    if (message.includes('DuckDB') || message.includes('Pyodide') || 
        message.includes('duckdb') || message.includes('pyodide')) {
      console.error('🚨 DUCKDB/PYODIDE ERROR DETECTED:', {
        timestamp: new Date().toISOString(),
        message: args,
        stack: new Error().stack
      });
    }
  };
  
  // Memory and performance monitoring
  const performanceMonitor = setInterval(() => {
    if (performance.memory) {
      console.log('💾 MEMORY USAGE:', {
        used: `${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)}MB`,
        total: `${(performance.memory.totalJSHeapSize / 1048576).toFixed(2)}MB`,
        limit: `${(performance.memory.jsHeapSizeLimit / 1048576).toFixed(2)}MB`
      });
    }
    
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      console.log('⏱️ PAGE TIMING:', {
        domContentLoaded: `${navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart}ms`,
        loadComplete: `${navigation.loadEventEnd - navigation.loadEventStart}ms`,
        totalLoadTime: `${navigation.loadEventEnd - navigation.navigationStart}ms`
      });
    }
  }, 10000); // Every 10 seconds
  
  // Check for specific files that might be missing
  const checkFiles = async () => {
    const filesToCheck = [
      '/duckdb/duckdb-mvp.wasm',
      '/duckdb/duckdb-browser-mvp.worker.js',
      '/duckdb/duckdb-eh.wasm',
      '/duckdb/duckdb-browser-eh.worker.js',
      '/pyodide/pyodide.js'
    ];
    
    console.log('🔍 CHECKING FILE ACCESSIBILITY...');
    
    for (const file of filesToCheck) {
      try {
        const response = await fetch(file, { method: 'HEAD' });
        if (response.ok) {
          console.log(`✅ FILE ACCESSIBLE: ${file} (${response.headers.get('content-length') || 'unknown'} bytes)`);
        } else {
          console.error(`❌ FILE NOT ACCESSIBLE: ${file} (${response.status})`);
        }
      } catch (error) {
        console.error(`❌ FILE CHECK FAILED: ${file}`, error);
      }
    }
  };
  
  // Run file check immediately
  checkFiles();
  
  // Browser compatibility check
  console.log('🌍 BROWSER COMPATIBILITY:', {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: navigator.deviceMemory || 'unknown',
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType,
      downlink: navigator.connection.downlink,
      rtt: navigator.connection.rtt
    } : 'unknown',
    webAssembly: typeof WebAssembly === 'object',
    workers: typeof Worker === 'function',
    fetch: typeof fetch === 'function',
    indexedDB: typeof indexedDB === 'object'
  });
  
  // Provide cleanup function
  window.stopLoadingDebugger = function() {
    console.log('🛑 Loading Issues Debugger Stopped');
    clearInterval(performanceMonitor);
    
    // Restore original functions
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
    document.createElement = originalCreateElement;
    window.Worker = originalWorker;
    console.error = originalError;
  };
  
  console.log('💡 Debugger active! Call window.stopLoadingDebugger() to stop monitoring.');
  console.log('📋 Quick file check results above. Check for any ❌ marks.');
  console.log('🌐 Monitor the console for network request logs during loading.');
})();
