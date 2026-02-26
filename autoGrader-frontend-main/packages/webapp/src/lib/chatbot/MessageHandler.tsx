"use client";

import { ChatMessage } from './ChatMessage';
import React, { useState } from "react";

export default function useChat(prompt: string, assistant_greeting: string) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: prompt },
    { role: 'assistant', content: assistant_greeting }, // Fixed role for greeting
  ]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!input || !input.trim()) return;

    setLoading(true);

    const userMessage: ChatMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const assistantMessage = await sendMessage(newMessages);
      setMessages((prevMessages: ChatMessage[]) => [...prevMessages, assistantMessage]);
    } catch (error) {
      console.error('Groq API Error:', error);
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const sendMessage = async (history: ChatMessage[]): Promise<ChatMessage> => {
    const response = await fetch('/api/groq-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        messages: history.map((m) => ({
          role: m.role,
          content: m.content
        }))
      })
    });

    const data = await response.json();
    if (!response.ok || !data?.success) {
      throw new Error(data?.error || 'AI request failed');
    }

    return {
      role: 'assistant',
      content: data.content || '',
    };
  };

  const clearMessages = () => {
    setMessages([
      { role: 'system', content: prompt },
      { role: 'assistant', content: assistant_greeting },
    ]);
  };

  return { input, loading, messages, handleSubmit, setInput, clearMessages };
}
