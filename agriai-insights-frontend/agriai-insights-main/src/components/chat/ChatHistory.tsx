
import Feedback from "./Feedback";

export interface ChatMessage {
  role: "user" | "assistant";
  text: string;
  id?: string;
}

interface ChatHistoryProps {
  messages: ChatMessage[];
}

export default function ChatHistory({
  messages,
}: ChatHistoryProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => {
        const messageId =
          message.id || `${message.role}-${index}`;

        return (
          <div
            key={messageId}
            className={
              message.role === "user"
                ? "flex justify-end"
                : "flex justify-start"
            }
          >
            <div
              className={
                message.role === "user"
                  ? "max-w-[80%] rounded-lg bg-primary px-4 py-3"
                  : "max-w-[80%] rounded-lg bg-muted px-4 py-3"
              }
            >
              {/* Message sender */}
              <div className="mb-1 text-xs font-semibold">
                {message.role === "user"
                  ? "You"
                  : "AgriAI"}
              </div>

              {/* Message text */}
              <p className="text-sm whitespace-pre-wrap">
                {message.text}
              </p>

              {/* Feedback for AI responses */}
              {message.role === "assistant" && (
                <div className="mt-3">
                  <Feedback messageId={messageId} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

