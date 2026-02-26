import { useState, useCallback } from "react";

type ChatMessage = { role: "ai" | "user"; content: string; time: string };

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function useAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      content: 'Welcome teacher. You can control the full dashboard from chat. Try: "help commands".',
      time: now(),
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [assistantBusy, setAssistantBusy] = useState(false);

  const appendAI = useCallback((content: string) => {
    setMessages((m) => [...m, { role: "ai", content, time: now() }]);
  }, []);

  const appendUser = useCallback((content: string) => {
    setMessages((m) => [...m, { role: "user", content, time: now() }]);
  }, []);

  const askModel = useCallback(
    async (text: string, context: any): Promise<string | null> => {
      try {
        const res = await fetch("/api/assistant-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: messages
              .slice(-8)
              .map((m) => ({
                role: m.role === "ai" ? "assistant" : "user",
                content: m.content,
              })),
            context,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data?.success || typeof data?.reply !== "string") return null;
        return data.reply.trim();
      } catch {
        return null;
      }
    },
    [messages]
  );

  return {
    messages,
    chatInput,
    assistantBusy,
    setChatInput,
    setAssistantBusy,
    appendAI,
    appendUser,
    askModel,
  };
}
