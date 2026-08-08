
import { Mic, Square, Loader2 } from "lucide-react";

interface MicButtonProps {
  isRecording: boolean;
  isProcessing: boolean;
  onStart: () => void;
  onStop: () => void;
}

export default function MicButton({
  isRecording,
  isProcessing,
  onStart,
  onStop,
}: MicButtonProps) {
  const handleClick = () => {
    if (isProcessing) return;

    if (isRecording) {
      onStop();
    } else {
      onStart();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isProcessing}
      aria-label={
        isProcessing
          ? "Processing voice"
          : isRecording
          ? "Stop recording"
          : "Start recording"
      }
      className={`relative flex h-16 w-16 items-center justify-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
        isProcessing
          ? "cursor-not-allowed bg-gray-400 text-white opacity-70"
          : isRecording
          ? "scale-105 bg-red-500 text-white shadow-lg"
          : "bg-primary text-primary-foreground shadow-md hover:scale-105 hover:shadow-lg"
      }`}
    >
      {isProcessing ? (
        <Loader2 className="h-7 w-7 animate-spin" />
      ) : isRecording ? (
        <Square className="h-6 w-6" />
      ) : (
        <Mic className="h-7 w-7" />
      )}

      {isRecording && !isProcessing && (
        <span className="absolute inset-0 rounded-full bg-red-400 opacity-20 animate-ping" />
      )}
    </button>
  );
}

