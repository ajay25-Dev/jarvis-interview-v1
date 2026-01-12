import { useCallback, useState } from 'react';
import { PracticeExerciseAPI } from '@/lib/api-bridge';
import { usePracticeContext } from '@/contexts/PracticeContext';

export function useMentorChat() {
  const {
    currentExerciseId,
    currentQuestionId,
    mentorMessages,
    addMentorMessage,
    mentorChatOpen,
    setMentorChatOpen,
  } = usePracticeContext();

  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [messageError, setMessageError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!currentExerciseId || !currentQuestionId) {
        setMessageError('Missing exercise or question ID');
        return;
      }

      if (!message.trim()) {
        setMessageError('Please enter a message');
        return;
      }

      try {
        setIsSendingMessage(true);
        setMessageError(null);

        addMentorMessage({
          role: 'user',
          content: message,
          timestamp: new Date().toISOString(),
        });

        const response = await PracticeExerciseAPI.sendChatMessage(
          currentExerciseId,
          currentQuestionId,
          message
        );

        addMentorMessage({
          role: 'mentor',
          content: response.content,
          timestamp: response.timestamp,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        setMessageError(errorMessage);
      } finally {
        setIsSendingMessage(false);
      }
    },
    [currentExerciseId, currentQuestionId, addMentorMessage]
  );

  const clearError = useCallback(() => {
    setMessageError(null);
  }, []);

  return {
    sendMessage,
    isSendingMessage,
    messageError,
    clearError,
    mentorChatOpen,
    toggleMentorChat: () => setMentorChatOpen(!mentorChatOpen),
    messages: mentorMessages,
  };
}
