
import { useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";

interface FeedbackProps {
  messageId?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://127.0.0.1:8000";

export default function Feedback({
  messageId,
}: FeedbackProps) {
  const [selected, setSelected] = useState<
    "positive" | "negative" | null
  >(null);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const submitFeedback = async (
    feedback: "positive" | "negative"
  ) => {
    // 1. Message ID is required
    if (!messageId) {
      console.warn(
        "⚠️ Cannot submit feedback: message ID is missing."
      );
      return;
    }

    // 2. Prevent duplicate request while submitting
    if (isSubmitting) {
      console.log(
        "⏳ Feedback request already in progress."
      );
      return;
    }

    // 3. Prevent submitting the same feedback again
    if (selected === feedback) {
      console.log(
        "ℹ️ This feedback has already been submitted."
      );
      return;
    }

    try {
      setIsSubmitting(true);

      console.log("=================================");
      console.log("📤 SENDING FEEDBACK");
      console.log("Message ID:", messageId);
      console.log("Feedback:", feedback);
      console.log("=================================");

      const response = await fetch(
        `${API_BASE_URL}/api/v1/feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message_id: messageId,
            feedback,
          }),
        }
      );

      console.log(
        "📥 Feedback HTTP status:",
        response.status
      );

      const data = await response.json();

      console.log(
        "📥 Feedback response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.detail ||
            "Failed to submit feedback."
        );
      }

      // 4. Mark selected feedback
      setSelected(feedback);

      console.log(
        "✅ Feedback submitted successfully."
      );
    } catch (error) {
      console.error(
        "❌ Feedback submission failed:",
        error
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render feedback without message ID
  if (!messageId) {
    return null;
  }

  return (
    <div className="flex items-center gap-1 mt-2">
      {/* POSITIVE FEEDBACK */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={(event) => {
          event.stopPropagation();
          submitFeedback("positive");
        }}
        className={`p-2 rounded-md transition ${
          selected === "positive"
            ? "bg-green-100 text-green-600"
            : "text-gray-500 hover:bg-gray-100"
        } ${
          isSubmitting
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        title="Helpful"
      >
        <ThumbsUp size={16} />
      </button>

      {/* NEGATIVE FEEDBACK */}
      <button
        type="button"
        disabled={isSubmitting}
        onClick={(event) => {
          event.stopPropagation();
          submitFeedback("negative");
        }}
        className={`p-2 rounded-md transition ${
          selected === "negative"
            ? "bg-red-100 text-red-600"
            : "text-gray-500 hover:bg-gray-100"
        } ${
          isSubmitting
            ? "opacity-50 cursor-not-allowed"
            : ""
        }`}
        title="Not helpful"
      >
        <ThumbsDown size={16} />
      </button>
    </div>
  );
}

