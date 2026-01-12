'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Copy,
  Trash2,
  ZoomIn,
  ZoomOut,
  Code2,
  Loader,
} from 'lucide-react';
import SyntaxHighlighter from 'react-syntax-highlighter';
import { atomOneDark } from 'react-syntax-highlighter/dist/esm/styles/hljs';

interface CodeEditorProps {
  code: string;
  language: 'sql' | 'python' | 'javascript' | 'java' | 'cpp' | 'csharp';
  onChange: (code: string) => void;
  onRun?: () => void;
  onSubmit?: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  title?: string;
  placeholder?: string;
}

const languageAliases: Record<string, string> = {
  sql: 'sql',
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
  csharp: 'csharp',
};

export function CodeEditor({
  code,
  language = 'sql',
  onChange,
  onRun,
  onSubmit,
  isRunning = false,
  isSubmitting = false,
  readOnly = false,
  showLineNumbers = true,
  title,
  placeholder = `Write your ${language} code here...`,
}: CodeEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [zoom, setZoom] = React.useState(100);
  const [isCopied, setIsCopied] = React.useState(false);

  const langAlias = languageAliases[language] || 'plaintext';

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClear = () => {
    if (!readOnly && confirm('Clear all code?')) {
      onChange('');
    }
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom((prev) => {
      const newZoom = direction === 'in' ? prev + 10 : prev - 10;
      return Math.max(70, Math.min(150, newZoom));
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newCode = code.substring(0, start) + '\t' + code.substring(end);
        onChange(newCode);
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 1;
        }, 0);
      }
    }

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      onRun?.();
    }
  };

  const lineCount = code.split('\n').length;
  const charCount = code.length;

  return (
    <Card className="flex flex-col h-full bg-gray-900 border-gray-800">
      {title && (
        <CardHeader className="pb-3 border-b border-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="w-5 h-5 text-blue-400" />
              <CardTitle className="text-base">{title}</CardTitle>
            </div>
            <div className="text-xs text-gray-400">
              {charCount} chars • {lineCount} lines
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="border-b border-gray-800 bg-gray-800 px-4 py-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400 px-2 py-1">
              Language: <span className="font-mono font-bold text-gray-200">{language.toUpperCase()}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom('out')}
              disabled={zoom <= 70}
              className="h-8 px-2 text-gray-400 hover:text-gray-200"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-400 w-8 text-center">{zoom}%</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleZoom('in')}
              disabled={zoom >= 150}
              className="h-8 px-2 text-gray-400 hover:text-gray-200"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>

            <div className="w-px h-6 bg-gray-700 mx-1" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              disabled={!code}
              className="h-8 px-2 text-gray-400 hover:text-gray-200"
              title="Copy code"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={!code || readOnly}
              className="h-8 px-2 text-gray-400 hover:text-red-400"
              title="Clear code"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Editor */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{ fontSize: `${(zoom / 100) * 14}px` }}
        >
          {/* Hidden textarea for input */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            readOnly={readOnly}
            className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none font-mono focus:outline-none focus:ring-0 z-10"
            spellCheck="false"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
          />

          {/* Syntax highlighted display */}
          <div className="absolute inset-0 overflow-auto pointer-events-none bg-gray-900">
            <SyntaxHighlighter
              language={langAlias}
              style={atomOneDark}
              showLineNumbers={showLineNumbers}
              wrapLines={true}
              codeTagProps={{
                style: {
                  fontFamily: "'Monaco', 'Courier New', monospace",
                  fontSize: 'inherit',
                },
              }}
              lineNumberContainerProps={{
                style: {
                  paddingRight: '16px',
                  minWidth: '50px',
                  textAlign: 'right',
                  backgroundColor: '#111827',
                  color: '#6B7280',
                  userSelect: 'none',
                },
              }}
              customStyle={{
                margin: 0,
                padding: '16px 0 16px 16px',
                backgroundColor: '#111827',
                fontSize: 'inherit',
                fontFamily: "'Monaco', 'Courier New', monospace",
              }}
            >
              {code || placeholder}
            </SyntaxHighlighter>
          </div>
        </div>

        {/* Status Bar */}
        <div className="border-t border-gray-800 bg-gray-800 px-4 py-2 flex items-center justify-between gap-2 text-xs text-gray-400">
          <div>
            {isCopied && <span className="text-green-400">✓ Copied to clipboard</span>}
          </div>
          <div className="flex gap-2">
            {onRun && (
              <Button
                onClick={onRun}
                disabled={isRunning || readOnly || !code}
                size="sm"
                className="h-8"
              >
                {isRunning && <Loader className="w-3 h-3 mr-1 animate-spin" />}
                Run
              </Button>
            )}
            {onSubmit && (
              <Button
                onClick={onSubmit}
                disabled={isSubmitting || readOnly || !code}
                size="sm"
                variant="default"
                className="h-8"
              >
                {isSubmitting && <Loader className="w-3 h-3 mr-1 animate-spin" />}
                Submit
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
