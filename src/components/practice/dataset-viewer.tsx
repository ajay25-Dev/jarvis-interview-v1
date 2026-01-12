'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Dataset, JsonObject, JsonValue } from './types';

interface DatasetViewerProps {
  datasets: Dataset[];
  maxRows?: number;
  searchable?: boolean;
  collapsible?: boolean;
}

const normalizeDataset = (dataset: Dataset): Dataset => {
  let rawData = dataset.data;
  let columns = dataset.columns ? [...dataset.columns] : [];

  if (typeof rawData === 'string') {
    try {
      rawData = JSON.parse(rawData);
    } catch {
      rawData = [];
    }
  }

  if (!Array.isArray(rawData) && typeof rawData === 'object' && rawData !== null) {
    const keys = Object.keys(rawData);
    const values = Object.values(rawData);
    const isColumnar = values.length > 0 && values.every(v => Array.isArray(v));

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

export function DatasetViewer({
  datasets,
  maxRows = 50,
  searchable = true,
  collapsible = true,
}: DatasetViewerProps) {
  const normalizedDatasets = useMemo(() => datasets.map(normalizeDataset), [datasets]);

  const [expandedDatasets, setExpandedDatasets] = useState<Set<string>>(
    new Set(normalizedDatasets.map((_, i) => i.toString()))
  );
  const [searchQueries, setSearchQueries] = useState<Record<string, string>>({});
  const [visibleColumns, setVisibleColumns] = useState<Record<string, Set<string>>>({});

  const toggleDataset = (index: string) => {
    const newExpanded = new Set(expandedDatasets);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedDatasets(newExpanded);
  };

  const getColumnTypes = (dataset: Dataset): Record<string, string> => {
    const types: Record<string, string> = {};
    if (dataset.schema_info && typeof dataset.schema_info === 'object') {
      const info = dataset.schema_info as Record<string, unknown>;
      if (info.columns && Array.isArray(info.columns)) {
        (info.columns as Array<Record<string, unknown> | string>).forEach((col) => {
          if (typeof col === 'object' && col !== null) {
            const colObj = col as Record<string, unknown>;
            types[String(colObj.name) || String(col)] = String(colObj.type) || 'VARCHAR';
          } else {
            types[String(col)] = 'VARCHAR';
          }
        });
      }
    }
    if (!Object.keys(types).length && dataset.columns) {
      dataset.columns.forEach((col) => {
        types[col] = 'VARCHAR';
      });
    }
    return types;
  };

  const getFilteredRows = (dataset: Dataset, search: string) => {
    if (!dataset.data || !Array.isArray(dataset.data)) {
      return [];
    }

    if (!search.trim()) {
      return dataset.data.slice(0, maxRows);
    }

    const query = search.toLowerCase();
    return dataset.data
      .filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(query)
        )
      )
      .slice(0, maxRows);
  };

  const initializeVisibleColumns = (datasetIndex: string, dataset: Dataset) => {
    if (!visibleColumns[datasetIndex] && dataset.columns) {
      const cols = new Set(dataset.columns);
      setVisibleColumns((prev) => ({
        ...prev,
        [datasetIndex]: cols,
      }));
      return cols;
    }
    return visibleColumns[datasetIndex] || new Set();
  };

  const toggleColumnVisibility = (datasetIndex: string, column: string) => {
    setVisibleColumns((prev) => {
      const cols = new Set(prev[datasetIndex] || []);
      if (cols.has(column)) {
        cols.delete(column);
      } else {
        cols.add(column);
      }
      return { ...prev, [datasetIndex]: cols };
    });
  };

  const downloadAsCSV = (dataset: Dataset) => {
    if (!dataset.data || !dataset.columns) return;

    const columnList = dataset.columns ?? [];
    const headers = columnList.join(',');
    const rows = dataset.data.map((row) =>
      columnList
        .map((col) => {
          const val = row[col] ?? '';
          const str = String(val);
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset.name || 'dataset'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (datasets.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-12 text-center">
          <Database className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Datasets</h3>
          <p className="text-sm text-gray-600">
            No datasets available for this exercise.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {normalizedDatasets.map((dataset, idx) => {
        const datasetKey = idx.toString();
        const isExpanded = expandedDatasets.has(datasetKey);
        const search = searchQueries[datasetKey] || '';
        const filteredRows = getFilteredRows(dataset, search);
        const columnTypes = getColumnTypes(dataset);
        const visibleCols = initializeVisibleColumns(datasetKey, dataset);
        const visibleColumns_list = (dataset.columns || []).filter((col) =>
          visibleCols.has(col)
        );

        return (
          <Card key={dataset.id || idx} className="overflow-hidden">
            {/* Header */}
            <CardHeader
              className={`pb-3 cursor-pointer transition-colors ${
                collapsible ? 'hover:bg-gray-50' : ''
              }`}
              onClick={() => collapsible && toggleDataset(datasetKey)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary flex-shrink-0" />
                    <CardTitle className="text-base truncate">{dataset.name}</CardTitle>
                  </div>
                  {dataset.description && (
                    <CardDescription className="mt-1 line-clamp-2">
                      {dataset.description}
                    </CardDescription>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {dataset.data && (
                    <Badge variant="secondary" className="text-xs">
                      {dataset.data.length} rows
                    </Badge>
                  )}
                  {collapsible && (
                    <button className="p-1 hover:bg-gray-200 rounded transition">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Schema Info */}
              {dataset.columns && isExpanded && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {dataset.columns.map((col) => (
                    <Badge
                      key={col}
                      variant="outline"
                      className="text-xs font-mono"
                      title={columnTypes[col] || 'VARCHAR'}
                    >
                      {dataset.columns!.every((c, i) => c === String(i)) ? `col_${parseInt(col) + 1}` : col}: {columnTypes[col] || 'VARCHAR'}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>

            {/* Content */}
            {isExpanded && (
              <CardContent className="space-y-4 border-t pt-4">
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {searchable && (
                    <div className="flex-1 min-w-[200px] relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        placeholder="Search in data..."
                        value={search}
                        onChange={(e) =>
                          setSearchQueries((prev) => ({
                            ...prev,
                            [datasetKey]: e.target.value,
                          }))
                        }
                        className="pl-10"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {dataset.columns && dataset.columns.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const current = visibleColumns[datasetKey] || new Set();
                          if (current.size === dataset.columns!.length) {
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [datasetKey]: new Set(),
                            }));
                          } else {
                            setVisibleColumns((prev) => ({
                              ...prev,
                              [datasetKey]: new Set(dataset.columns),
                            }));
                          }
                        }}
                      >
                        {visibleCols.size === dataset.columns.length ? (
                          <>
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hide All
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3 mr-1" />
                            Show All
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadAsCSV(dataset)}
                      disabled={!dataset.data || dataset.data.length === 0}
                      className="text-xs"
                    >
                      <Download className="w-3 h-3 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>

                {/* Column Toggle */}
                {dataset.columns && dataset.columns.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-gray-50 rounded">
                    {dataset.columns.map((col) => (
                      <button
                        key={col}
                        onClick={() => toggleColumnVisibility(datasetKey, col)}
                        className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                          visibleCols.has(col)
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        }`}
                      >
                        {col}
                      </button>
                    ))}
                  </div>
                )}

                {/* Data Table */}
                {dataset.data && dataset.data.length > 0 ? (
                  <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          {visibleColumns_list.map((col) => (
                            <th
                              key={col}
                              className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900 bg-gray-100"
                            >
                              {dataset.columns!.every((c, i) => c === String(i)) ? `col_${parseInt(col) + 1}` : col}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((row, rowIdx) => (
                          <tr
                            key={rowIdx}
                            className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                          >
                            {visibleColumns_list.map((col) => (
                              <td
                                key={col}
                                className="border border-gray-300 px-3 py-2 text-gray-700 font-mono text-xs break-words max-w-xs"
                                title={String(row[col] ?? '')}
                              >
                                {typeof row[col] === 'object'
                                  ? JSON.stringify(row[col])
                                  : String(row[col] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No data available</p>
                  </div>
                )}

                {/* Pagination Info */}
                {dataset.data && dataset.data.length > maxRows && (
                  <p className="text-xs text-gray-500 text-center">
                    Showing {filteredRows.length} of {dataset.data.length} rows
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
