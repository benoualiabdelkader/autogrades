"use client";

import React from "react";
import useChat from "../../lib/chatbot/MessageHandler";
import ChatInterface from "@/components/ChatInterface";

const prompt = "You are a helpful and intelligent AI educational assistant. Your goal is to help " +
    "professors and students with any questions related to education, course planning, " +
    "grading strategies, or academic research. Be professional, insightful, and supportive. " +
    "You can provide suggestions for lesson plans, explain complex topics, or help " +
    "brainstorm creative educational activities.";

const assistant_greeting = "Hello! I'm your AutoGrader AI Assistant. How can I help you streamline your " +
    "educational workflow or answer your academic questions today?";

export default function Home() {
    const { input, loading, messages, handleSubmit, setInput, clearMessages } = useChat(prompt, assistant_greeting);

    const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        await handleSubmit(event);
    };

    return (
        <ChatInterface
            title="AI Academic Assistant"
            messages={messages}
            input={input}
            loading={loading}
            setInput={setInput}
            handleSubmit={handleFormSubmit}
            onClear={clearMessages}
        />
    );
}
