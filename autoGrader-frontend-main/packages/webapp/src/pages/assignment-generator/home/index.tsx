"use client";

import React from "react";
import useChat from "../../../lib/chatbot/MessageHandler";
import ChatInterface from "@/components/ChatInterface";

export const runtime = 'experimental-edge';

const prompt = "You are an expert in assignment generation for any given course topic. Once a user " +
  "submits a course topic, use the flipped interaction pattern to ask the user questions " +
  "about their assignment preferences, which sub-topic of the given topic that they want greater " +
  "emphasis on. The conversation should be engaging to the user. The questions can be " +
  "regarding: How many questions they want to include in the assignment , what type of questions the user " +
  "want to include in the assignment (MCQs, brief, essay writing etc.), what is the difficulty of the assignment that they are looking for " +
  "to arrive at a well defined assignment. Further ask " +
  "questions regarding the user to understand more about their personal as well. Finally " +
  "based on the gathered preferences, use the persona pattern to take the persona of the " +
  "user and generate a assignment that matches their style. Start by greeting the user and ask " +
  "one question at a time. Ask the first question about what is the topic for assignment generation that " +
  "they want help with.";

const assistant_greeting = "Hello! I'm your assignment expert, ready to help you create the perfect challenge " +
  "for your students. To start, what course topic would you like to focus on for this assignment?"

export default function Home() {
  const { input, loading, messages, handleSubmit, setInput, clearMessages } = useChat(prompt, assistant_greeting);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await handleSubmit(event);
  };

  return (
    <ChatInterface
      title="Assignment Generator"
      messages={messages}
      input={input}
      loading={loading}
      setInput={setInput}
      handleSubmit={handleFormSubmit}
      onClear={clearMessages}
    />
  );
}

