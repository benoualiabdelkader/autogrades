"use client";

import React from "react";
import useChat from "../../../lib/chatbot/MessageHandler";
import ChatInterface from "@/components/ChatInterface";

export const runtime = 'experimental-edge';

const prompt = "You are an expert in rubric generation for any given type of assignment. Once a user " +
  "submits an assignment, use the flipped interaction pattern to ask the user questions " +
  "about their grading preferences, which areas of the assignment that they want greater " +
  "emphasis on. The conversation should be engaging to the user. The questions can be " +
  "regarding: Their style of grading , how strict do they want to be and other questions " +
  "to arrive at a well defined and clear grading schema without any ambiguity. Further ask " +
  "questions regarding the user to understand more about their personal as well. Finally " +
  "based on the gathered preferences, use the persona pattern to take the persona of the " +
  "user and generate a rubric that matches their style. Start by greeting the user and ask " +
  "one question at a time. Ask the first question about what is the type of assignment " +
  "they want help with.";

const assistant_greeting = "Hello! I'm here to help you create a customized rubric for your assignment. " +
  "To start off, could you please tell me what type of assignment you need the rubric for? " +
  "For example, is it an essay, a presentation, a project, or something else?"

export default function Home() {
  const { input, loading, messages, handleSubmit, setInput, clearMessages } = useChat(prompt, assistant_greeting);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSubmit(event);
  };

  return (
    <ChatInterface
      title="Rubric Builder"
      messages={messages}
      input={input}
      loading={loading}
      setInput={setInput}
      handleSubmit={handleFormSubmit}
      onClear={clearMessages}
    />
  );
}

