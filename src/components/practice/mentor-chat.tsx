'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  MessageCircle,
  Send,
  ChevronDown,
  ChevronUp,
  Trash2,
  Lightbulb,
  Loader,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { MentorChatMessage } from './types';

interface MentorChatProps {
  exerciseId: string;
  questionId: string;
  onMinimize?: () => void;
  isOpen: boolean;
  onLoadSession?: () => Promise<void>;
  onSendMessage?: (message: string) => Promise<string>;
  initialMessages?: MentorChatMessage[];
}

export function MentorChat({
  exerciseId,
  questionId,
  onMinimize,
  isOpen,
  onLoadSession,
  onSendMessage,
  initialMessages = [],
}: MentorChatProps) {
  const [messages, setMessages] = useState<MentorChatMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTimestamp = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString();
  };

  // Keep local state in sync when history is fetched/updated by parent
  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const suggestions = [
    'Can you explain this concept?',
    'What approach should I use?',
    'Can you give me a hint?',
    'What is the optimal solution?',
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && initialMessages.length === 0 && onLoadSession) {
      setIsLoading(true);
      onLoadSession()
        .catch((err) => console.error('Failed to load session:', err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, exerciseId, questionId, onLoadSession, initialMessages.length]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: MentorChatMessage = {
      role: 'student',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      if (onSendMessage) {
        const response = await onSendMessage(text);
        const mentorMessage: MentorChatMessage = {
          role: 'mentor',
          content: response,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, mentorMessage]);
      }
    } catch (error) {
      console.error('Failed to get mentor response:', error);
      const errorMessage: MentorChatMessage = {
        role: 'mentor',
        content: 'Sorry, I encountered an error while processing your message. Please try again.',
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSendMessage(suggestion);
  };

  const handleClearHistory = () => {
    if (confirm('Clear all chat messages?')) {
      setMessages([]);
    }
  };

  return (
    <Card className="flex flex-col h-[525px] border-l">
      {/* Header */}
      <CardHeader className="pb-3 border-b flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-blue-600" />
            <CardTitle className="text-base">Mentor Chat</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            {/* <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              disabled={messages.length === 0 || isSending}
              className="h-8 px-2 text-gray-400 hover:text-red-500"
              title="Clear chat history"
            >
              <Trash2 className="w-4 h-4" />
            </Button> */}
            {onMinimize && (
              <button
                onClick={onMinimize}
                className="p-1 hover:bg-gray-200 rounded transition"
              >
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronUp className="w-5 h-5 text-gray-600" />
                )}
              </button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center">
              <Loader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
              <p className="text-xs text-gray-500">Loading mentor session...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-gray-900 mb-2">
              Start a conversation
            </h3>
            <p className="text-xs text-gray-600 mb-4">
              Ask the mentor for help with this question
            </p>

            {/* Suggestions */}
            {messages.length === 0 && (
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-xs text-left bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors text-gray-700 flex items-center gap-2"
                  >
                    <Lightbulb className="w-3 h-3 text-blue-600 flex-shrink-0" />
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className="space-y-1">
                <div
                  className={`flex gap-3 ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-xs lg:max-w-sm rounded-lg p-3 text-sm ${
                      msg.role === 'student'
                        ? 'bg-blue-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-900 rounded-bl-none'
                    }`}
                  >
                    {msg.role === 'mentor' ? (
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                          code: ({ children }) => (
                            <code className="bg-gray-200 px-1 rounded text-xs font-mono">
                              {children}
                            </code>
                          ),
                          li: ({ children }) => (
                            <li className="ml-4 mb-1">{children}</li>
                          ),
                          ul: ({ children }) => <ul className="list-disc">{children}</ul>,
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    ) : (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
                {formatTimestamp(msg.created_at) && (
                  <div
                    className={`flex ${msg.role === 'student' ? 'justify-end' : 'justify-start'}`}
                  >
                    <p
                      className={`text-[10px] ${
                        msg.role === 'student' ? 'text-blue-400' : 'text-gray-500'
                      }`}
                    >
                      {formatTimestamp(msg.created_at)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            {isSending && (
              <div className="flex gap-3 justify-start">
                <div className="bg-gray-100 text-gray-900 rounded-lg rounded-bl-none p-3 text-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </CardContent>

      {/* Input Area */}
      <div className="border-t p-3 bg-gray-50 flex-shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Ask the mentor..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(input);
              }
            }}
            disabled={isSending || isLoading}
            className="text-sm"
          />
          <Button
            onClick={() => handleSendMessage(input)}
            disabled={!input.trim() || isSending || isLoading}
            size="sm"
            className="px-3"
          >
            {isSending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
}
