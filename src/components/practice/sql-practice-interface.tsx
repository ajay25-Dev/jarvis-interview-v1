"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSQLite } from "@/hooks/useSQLite";
import { toast } from "sonner";
import {
  PlayCircle,
  CheckCircle,
  Zap,
  RotateCcw,
  Database,
  Table,
  Code,
  Loader
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JsonObject, JsonValue, SqlPracticeInterfaceProps, ExecutionResult, Dataset } from "./types";

const DEFAULT_SQL_TEMPLATE = `-- SQLite Practice Exercise
-- Write your SQL queries below

-- Example: Basic SELECT query
-- SELECT * FROM sales_data LIMIT 5;

-- Your solution here
`;

const normalizeDataset = (dataset: Dataset): Dataset => {
  let rawData = dataset.data;
  let columns = dataset.columns ? [...dataset.columns] : [];

  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch (parseError) {
      console.error('Failed to parse dataset JSON:', parseError);
      rawData = [];
    }
  }

  if (!Array.isArray(rawData) && typeof rawData === 'object' && rawData !== null) {
    const keys = Object.keys(rawData);
    const values = Object.values(rawData) as JsonValue[];
    const isColumnar = values.length > 0 && values.every((v) => Array.isArray(v));

    if (isColumnar) {
      const columnArrays = values as JsonValue[][];
      const numRows = columnArrays[0]?.length ?? 0;
      const newRows: JsonObject[] = [];
      for (let i = 0; i < numRows; i += 1) {
        const row: JsonObject = {};
        keys.forEach((key, colIdx) => {
          const columnValues = columnArrays[colIdx] ?? [];
          row[key] = columnValues[i];
        });
        newRows.push(row);
      }
      rawData = newRows;
      if (columns.length === 0) {
        columns = keys;
      }
    } else {
      rawData = Object.values(rawData);
    }
  }
  
  if (columns.length === 0 && Array.isArray(rawData) && rawData.length > 0) {
      const firstRow = rawData[0];
      if (Array.isArray(firstRow)) {
          columns = firstRow.map((_, i: number) => String(i));
      } else if (typeof firstRow === 'object' && firstRow !== null) {
          columns = Object.keys(firstRow);
      }
  }

  return { ...dataset, data: rawData, columns };
};

export function SqlPracticeInterface({
  exerciseId,
  questionId,
  initialCode = "",
  title,
  description,
  onSubmit
}: SqlPracticeInterfaceProps) {
  const [code, setCode] = useState<string>(initialCode || DEFAULT_SQL_TEMPLATE);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'results' | 'schema'>('editor');
  const [stdout, setStdout] = useState<string>('');

  const editorRef = useRef<HTMLTextAreaElement>(null);

  const {
    db,
    isLoading: dbLoading,
    execute: executeQuery,
    createTable,
    insertData,
    resetDatabase
  } = useSQLite();

  const initializeDatabaseWithDatasets = useCallback(
    async (datasets: Dataset[]) => {
      if (!db) return;

      try {
        for (const dataset of datasets) {
          const tableName = dataset.table_name || 'data';
          
          if (dataset.data && Array.isArray(dataset.data)) {
            let columns = dataset.columns || Object.keys(dataset.data[0] || {});
            let dataToInsert = dataset.data;
            
            const isNumericColumns =
              columns.length > 0 && columns.every((col, i) => col === String(i));
            
            if (isNumericColumns && dataset.data.length > 0) {
              columns = columns.map((_, i) => `col_${i + 1}`);
              dataToInsert = dataset.data.map((row) => {
                const newRow: Record<string, JsonValue> = {};
                if (Array.isArray(row)) {
                  row.forEach((val, i) => {
                    newRow[`col_${i + 1}`] = val;
                  });
                } else if (typeof row === 'object' && row !== null) {
                  Object.entries(row).forEach(([key, value]) => {
                    const index = Number(key);
                    const newKey = Number.isNaN(index) ? key : `col_${index + 1}`;
                    newRow[newKey] = value as JsonValue;
                  });
                }
                return newRow;
              });
            }

            await createTable(tableName, columns);
            await insertData(tableName, dataToInsert);
          }
        }
      } catch (error) {
        console.error('Failed to initialize database with datasets:', error);
        toast.error('Failed to load dataset into database');
      }
    },
    [db, createTable, insertData]
  );

  useEffect(() => {
    const loadDatasets = async () => {
      try {
        const response = await fetch(`/api/interview-prep/practice-exercises/${exerciseId}/datasets/${questionId}`);
        if (response.ok) {
          const data = await response.json();
          const rawDatasets = Array.isArray(data.datasets) ? data.datasets : [];
          const normalizedDatasets = rawDatasets.map(normalizeDataset);
          setDatasets(normalizedDatasets);
          
          if (normalizedDatasets.length > 0) {
            await initializeDatabaseWithDatasets(normalizedDatasets);
          }
        }
      } catch (error) {
        console.error('Failed to load datasets:', error);
        setDatasets([]);
      }
    };

    if (questionId) {
      loadDatasets();
    }
  }, [questionId, exerciseId, initializeDatabaseWithDatasets]);

  const handleExecute = async () => {
    if (!code.trim()) {
      toast.error('Please enter SQL code');
      return;
    }

    if (!db) {
      toast.error('Database not initialized');
      return;
    }

    setIsExecuting(true);
    try {
      const results = await executeQuery(code);
      setStdout(JSON.stringify(results, null, 2));
      setActiveTab('results');
      toast.success('Query executed successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      setStdout(errorMessage);
      setActiveTab('results');
      toast.error('Query execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const result: ExecutionResult = {
        success: true,
        passed: true,
        score: 100,
        total_points: 100,
        test_results: [],
        overall_result: {
          stdout: stdout,
          stderr: '',
          execution_time: 0,
          memory_used: 0,
          exit_code: 0
        }
      };

      if (onSubmit) {
        onSubmit(result);
      }
      toast.success('Solution submitted');
    } catch (error) {
      console.error('Failed to submit solution:', error);
      toast.error('Failed to submit solution');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = async () => {
    try {
      await resetDatabase();
      if (datasets.length > 0) {
        await initializeDatabaseWithDatasets(datasets);
      }
      toast.success('Database reset successfully');
    } catch (error) {
      console.error('Failed to reset database:', error);
      toast.error('Failed to reset database');
    }
  };

  if (dbLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Initializing SQL database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('editor')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'editor'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Code className="w-4 h-4 inline mr-2" />
            Editor
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'schema'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table className="w-4 h-4 inline mr-2" />
            Schema
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 font-medium text-sm ${
              activeTab === 'results'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Results
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'editor' && (
            <div className="p-4 h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600">{description}</p>
              </div>
              <textarea
                ref={editorRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="-- Write your SQL code here..."
                className="flex-1 w-full p-3 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {activeTab === 'schema' && (
            <div className="p-4">
              {datasets.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No datasets available</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {datasets.map((dataset) => (
                    <Card key={dataset.id}>
                      <CardHeader>
                        <CardTitle className="text-sm">{dataset.name}</CardTitle>
                        <CardDescription>{dataset.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Columns:</h4>
                          <div className="flex flex-wrap gap-2">
                            {(dataset.columns && dataset.columns.length > 0 && dataset.columns.every((c, i) => c === String(i)) 
                              ? dataset.columns.map((_, i) => `col_${i + 1}`) 
                              : dataset.columns
                            )?.map((col) => (
                              <Badge key={col} variant="secondary">{col}</Badge>
                            ))}
                          </div>
                        </div>
                        {dataset.data && dataset.data.length > 0 && (
                          <div>
                            <h4 className="font-semibold text-sm mb-2">Sample Data:</h4>
                            <div className="overflow-x-auto">
                              <table className="text-xs border-collapse w-full">
                                <thead>
                                  <tr className="bg-gray-100">
                                    {dataset.columns?.map((col) => (
                                      <th key={col} className="border border-gray-300 px-2 py-1 text-left">
                                        {col}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dataset.data.slice(0, 5).map((row, idx) => (
                                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                      {dataset.columns?.map((col) => (
                                        <td key={col} className="border border-gray-300 px-2 py-1">
                                          {String(row[col] ?? '')}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            {dataset.data.length > 5 && (
                              <p className="text-xs text-gray-500 mt-2">
                                Showing 5 of {dataset.data.length} rows
                              </p>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'results' && (
            <div className="p-4">
              {stdout ? (
                <div className="bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
                  <pre>{stdout}</pre>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No results yet. Click &quot;Run&quot; to execute your query.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="border-t border-gray-200 bg-gray-50 p-4 flex gap-2">
        <Button
          onClick={handleExecute}
          disabled={isExecuting || dbLoading}
          className="gap-2"
        >
          {isExecuting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <PlayCircle className="w-4 h-4" />
          )}
          {isExecuting ? 'Running...' : 'Run'}
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !stdout}
          variant="default"
          className="gap-2"
        >
          {isSubmitting ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle className="w-4 h-4" />
          )}
          Submit
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>
      </div>
    </div>
  );
}
