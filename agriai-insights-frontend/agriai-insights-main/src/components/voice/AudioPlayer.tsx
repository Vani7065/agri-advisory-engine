
import { Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioBase64: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  onEnded?: () => void;
}

export default function AudioPlayer({
  audioBase64,
  isPlaying = false,
  onPlay,
  onEnded,
}: AudioPlayerProps) {

  if (!audioBase64) {
    return null;
  }

  // Backend returns WAV audio as base64.
  const audioUrl =
    `data:audio/wav;base64,${audioBase64}`;

  return (
    <div className="mt-4 rounded-lg border p-4">

      <div className="mb-3 flex items-center gap-2">

        <Volume2 className="h-5 w-5" />

        <span className="text-sm font-medium">
          {isPlaying
            ? "AI Voice Playing..."
            : "AI Voice Response"}
        </span>

      </div>

      <audio
        controls
        src={audioUrl}
        className="w-full"
        onPlay={onPlay}
        onEnded={onEnded}
      />

    </div>
  );
}

