
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
    <div className="space-y-4 mt-6">
      {messages.map((message, index) => (
        <div
          key={`${message.id || message.role}-${index}`}
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
            <div className="text-xs font-semibold mb-1">
              {message.role === "user"
                ? "You"
                : "AgriAI"}
            </div>

            <p className="text-sm whitespace-pre-wrap">
              {message.text}
            </p>

            {message.role === "assistant" && (
              <Feedback
                messageId={message.id}
              />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

