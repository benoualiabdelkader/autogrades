"use client";

import { ChatMessage } from './ChatMessage';
import React, { useState, useCallback, useRef } from "react";

/**
 * Enhanced chat hook with:
 * - Larger conversation context window (20 messages)
 * - Retry logic on failure
 * - <think> tag stripping for reasoning models
 * - Error recovery with user-friendly messages
 * - Duplicate message prevention
 */
export default function useChat(prompt: string, assistant_greeting: string) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: prompt },
    { role: 'assistant', content: assistant_greeting },
  ]);

  const stripThinkTags = (text: string): string => {
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  };

  const sendMessage = useCallback(async (history: ChatMessage[], retries = 2): Promise<ChatMessage> => {
    // Send last 20 messages for richer context
    const contextMessages = history.slice(-20).map((m) => ({
      role: m.role,
      content: m.content
    }));

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch('/api/groq-chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'qwen/qwen3-32b',
            messages: contextMessages,
            temperature: 0.3,
            max_tokens: 2000
          })
        });

        const data = await response.json();

        if (!response.ok || !data?.success) {
          if (attempt < retries && response.status >= 500) continue;
          throw new Error(data?.error || 'AI request failed');
        }

        const rawContent = data.content || data.choices?.[0]?.message?.content || '';
        const cleanContent = stripThinkTags(rawContent);

        return {
          role: 'assistant',
          content: cleanContent || 'I apologize, I could not generate a response. Please try rephrasing your question.',
        };
      } catch (error) {
        if (attempt < retries) continue;
        console.error('Chat API Error:', error);
        return {
          role: 'assistant',
          content: '⚠️ I encountered an issue processing your request. Please try again in a moment.',
        };
      }
    }

    return {
      role: 'assistant',
      content: '⚠️ Unable to reach the AI service. Please check your connection and try again.',
    };
  }, []);

  const handleSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input || !input.trim() || submittingRef.current) return;

    submittingRef.current = true;
    setLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');

    try {
      const assistantMessage = await sendMessage(newMessages);
      setMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  }, [input, messages, sendMessage]);

  const clearMessages = useCallback(() => {
    setMessages([
      { role: 'system', content: prompt },
      { role: 'assistant', content: assistant_greeting },
    ]);
    setInput('');
  }, [prompt, assistant_greeting]);

  return { input, loading, messages, handleSubmit, setInput, clearMessages };
}
