import React from 'react';
import { Button } from '@/components/ui/button';
import { PlayCircle, CheckCircle, RotateCcw, Save, Lightbulb, MessageCircle } from 'lucide-react';

interface CodeActionButtonsProps {
  onRun: () => void;
  onSubmit: () => void;
  onReset: () => void;
  onSaveProgress: () => void;
  onRequestHint: () => void;
  onOpenChat: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
  hasCode?: boolean;
  disabled?: boolean;
}

export function CodeActionButtons({
  onRun,
  onSubmit,
  onReset,
  onSaveProgress,
  onRequestHint,
  onOpenChat,
  isRunning = false,
  isSubmitting = false,
  hasCode = true,
  disabled = false,
}: CodeActionButtonsProps) {
  const isLoading = isRunning || isSubmitting;

  return (
    <div className="space-y-2">
      {/* Primary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onRun}
          disabled={disabled || !hasCode || isLoading}
          variant="outline"
          size="sm"
          className="w-full"
        >
          <PlayCircle className="w-4 h-4 mr-2" />
          {isRunning ? 'Running...' : 'Run'}
        </Button>
        <Button
          onClick={onSubmit}
          disabled={disabled || !hasCode || isLoading}
          variant="default"
          size="sm"
          className="w-full"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </div>

      {/* Secondary Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onRequestHint}
          disabled={disabled || isLoading}
          variant="outline"
          size="sm"
          className="w-full text-amber-600 hover:bg-amber-50"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Hint
        </Button>
        <Button
          onClick={onOpenChat}
          disabled={disabled}
          variant="outline"
          size="sm"
          className="w-full text-blue-600 hover:bg-blue-50"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          Chat
        </Button>
      </div>

      {/* Utility Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={onSaveProgress}
          disabled={disabled || isLoading}
          variant="ghost"
          size="sm"
          className="w-full"
        >
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
        <Button
          onClick={onReset}
          disabled={disabled || isLoading || !hasCode}
          variant="ghost"
          size="sm"
          className="w-full text-red-600 hover:bg-red-50"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>
    </div>
  );
}
