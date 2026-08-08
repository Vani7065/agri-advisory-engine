
import { Volume2 } from "lucide-react";

interface AudioPlayerProps {
  audioUrl: string;
  isPlaying?: boolean;
  onPlay?: () => void;
  onEnded?: () => void;
}

export default function AudioPlayer({
  audioUrl,
  isPlaying = false,
  onPlay,
  onEnded,
}: AudioPlayerProps) {
  if (!audioUrl) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Volume2 className="h-4 w-4" />

        <span>
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

