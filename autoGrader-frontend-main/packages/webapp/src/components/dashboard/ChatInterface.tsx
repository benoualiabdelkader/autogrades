import React, { useRef, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPaperPlane, faSpinner } from "@fortawesome/free-solid-svg-icons";

type ChatMessage = { role: "ai" | "user"; content: string; time: string };

interface ChatInterfaceProps {
  messages: ChatMessage[];
  chatInput: string;
  assistantBusy: boolean;
  onSetChatInput: (input: string) => void;
  onSendMessage: () => void;
}

export default function ChatInterface({
  messages,
  chatInput,
  assistantBusy,
  onSetChatInput,
  onSendMessage,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSendMessage();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4">AI Assistant</h2>

      <div className="flex-1 overflow-y-auto mb-4 space-y-3 min-h-[300px] max-h-[500px]">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
              <div className="text-xs opacity-70 mt-1">{msg.time}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <textarea
          value={chatInput}
          onChange={(e) => onSetChatInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a command or question... (Enter to send, Shift+Enter for new line)"
          className="flex-1 px-3 py-2 border rounded resize-none"
          rows={2}
          disabled={assistantBusy}
        />
        <button
          onClick={onSendMessage}
          disabled={assistantBusy || !chatInput.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {assistantBusy ? (
            <FontAwesomeIcon icon={faSpinner} spin />
          ) : (
            <FontAwesomeIcon icon={faPaperPlane} />
          )}
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Try: &quot;help commands&quot; | &quot;list tasks&quot; | &quot;preview data&quot; | &quot;review selected&quot; | &quot;autopilot&quot;
      </div>
    </div>
  );
}
