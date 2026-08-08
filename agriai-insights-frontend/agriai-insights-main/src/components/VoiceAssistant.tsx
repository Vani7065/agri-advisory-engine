
import { useRef, useState } from "react";
import Feedback from "./chat/Feedback";
import MicButton from "./voice/MicButton";
import AudioPlayer from "./voice/AudioPlayer";

interface VoiceAssistantProps {
  onResponse?: (
    userText: string,
    aiText: string,
    audioUrl: string,
    feedbackId: string
  ) => void;
}

interface VoiceResponse {
  message_id?: string;
  session_id?: string;
  detected_language?: string;
  canonical_query?: string;
  inferred_intent?: string;
  extracted_agricultural_entities?: Record<string, unknown>;
  canonical_response?: string;
  translated_response?: string;
  audio?: string | null;
  tts_language?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:8000";

const SESSION_ID = "session_web_client";

export function VoiceAssistant({
  onResponse,
}: VoiceAssistantProps) {
  const [recording, setRecording] =
    useState(false);

  const [isProcessing, setIsProcessing] =
    useState(false);

  const [statusText, setStatusText] =
    useState("Ready");

  const [userText, setUserText] =
    useState("");

  const [aiText, setAiText] =
    useState("");

  const [audioBase64, setAudioBase64] =
    useState("");

  const [messageId, setMessageId] =
    useState("");

  const mediaRecorderRef =
    useRef<MediaRecorder | null>(null);

  const audioChunksRef =
    useRef<Blob[]>([]);

  // -----------------------------------------
  // START RECORDING
  // -----------------------------------------

  const startRecording = async () => {
    try {
      setStatusText(
        "Requesting microphone..."
      );

      setUserText("");
      setAiText("");
      setAudioBase64("");
      setMessageId("");

      const stream =
        await navigator.mediaDevices.getUserMedia(
          {
            audio: true,
          }
        );

      const mediaRecorder =
        new MediaRecorder(stream);

      mediaRecorderRef.current =
        mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (
        event
      ) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(
            event.data
          );
        }
      };

      mediaRecorder.onstop = async () => {
        stream
          .getTracks()
          .forEach((track) =>
            track.stop()
          );

        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type:
              mediaRecorder.mimeType ||
              "audio/webm",
          }
        );

        console.log(
          "Recorded audio:",
          audioBlob.type,
          audioBlob.size
        );

        await sendAudioToBackend(
          audioBlob
        );
      };

      mediaRecorder.start();

      setRecording(true);
      setStatusText("Listening...");
    } catch (error) {
      console.error(
        "Microphone error:",
        error
      );

      setRecording(false);

      setStatusText(
        "Microphone access failed. Please allow microphone permission."
      );
    }
  };

  // -----------------------------------------
  // STOP RECORDING
  // -----------------------------------------

  const stopRecording = () => {
    const mediaRecorder =
      mediaRecorderRef.current;

    if (!mediaRecorder) {
      return;
    }

    if (
      mediaRecorder.state ===
      "recording"
    ) {
      setRecording(false);
      setStatusText(
        "Processing your voice..."
      );

      mediaRecorder.stop();
    }
  };

  // -----------------------------------------
  // SEND AUDIO TO FASTAPI
  // -----------------------------------------

  const sendAudioToBackend = async (
    audioBlob: Blob
  ) => {
    try {
      setIsProcessing(true);
      setStatusText(
        "Sending voice to AgriAI..."
      );

      const formData = new FormData();

      // IMPORTANT:
      // Backend expects "file", not "audio"
      formData.append(
        "file",
        audioBlob,
        "voice_query.webm"
      );

      // Backend expects session_id
      formData.append(
        "session_id",
        SESSION_ID
      );

      // Backend expects language_code
      formData.append(
        "language_code",
        "en-IN"
      );

      console.log(
        "Sending audio to:",
        `${API_BASE_URL}/api/v1/query/audio`
      );

      const response = await fetch(
        `${API_BASE_URL}/api/v1/query/audio`,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        "Voice API status:",
        response.status
      );

      if (!response.ok) {
        const errorText =
          await response.text();

        console.error(
          "Backend error:",
          errorText
        );

        throw new Error(
          `Backend error ${response.status}: ${errorText}`
        );
      }

      const data: VoiceResponse =
        await response.json();

      console.log(
        "Voice API response:",
        data
      );

      // -------------------------------------
      // TRANSCRIPT
      // -------------------------------------

      const transcript =
        data.canonical_query || "";

      // -------------------------------------
      // AI RESPONSE
      // -------------------------------------

      const answer =
        data.translated_response ||
        data.canonical_response ||
        "";

      // -------------------------------------
      // TTS AUDIO
      // -------------------------------------

      const returnedAudio =
        data.audio || "";

      // -------------------------------------
      // MESSAGE ID
      // -------------------------------------

      const returnedMessageId =
        data.message_id || "";

      setUserText(transcript);

      setAiText(answer);

      setAudioBase64(
        returnedAudio
      );

      setMessageId(
        returnedMessageId
      );

      setStatusText(
        "Response received"
      );

      console.log(
        "Transcript:",
        transcript
      );

      console.log(
        "AI response:",
        answer
      );

      console.log(
        "Audio received:",
        returnedAudio
          ? `Yes (${returnedAudio.length} characters)`
          : "No"
      );

      console.log(
        "Message ID:",
        returnedMessageId
      );

      // Notify parent component
      onResponse?.(
        transcript,
        answer,
        returnedAudio,
        returnedMessageId
      );
    } catch (error) {
      console.error(
        "Voice request failed:",
        error
      );

      setStatusText(
        "Connection failed. Could not send voice data to the FastAPI backend."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // -----------------------------------------
  // UI
  // -----------------------------------------

  return (
    <div className="w-full space-y-6">

      {/* MIC BUTTON */}

      <div className="flex flex-col items-center justify-center gap-4">

        <MicButton
          isRecording={recording}
          isProcessing={isProcessing}
          onStart={startRecording}
          onStop={stopRecording}
        />

        <p className="text-sm text-muted-foreground">
          {statusText}
        </p>

      </div>

      {/* USER QUERY */}

      {userText && (
        <div className="rounded-lg border p-4">

          <p className="mb-1 text-sm font-medium">
            You
          </p>

          <p className="text-sm text-muted-foreground">
            {userText}
          </p>

        </div>
      )}

      {/* AI RESPONSE */}

      {aiText && (
        <div className="rounded-lg border p-4">

          <p className="mb-1 text-sm font-medium">
            AgriAI
          </p>

          <p className="whitespace-pre-line text-sm">
            {aiText}
          </p>

        </div>
      )}

      {/* AI VOICE RESPONSE */}

      {audioBase64 && (
        <AudioPlayer
          audioBase64={audioBase64}
        />
      )}

      {/* FEEDBACK */}

      {messageId && aiText && (
        <Feedback
          messageId={messageId}
        />
      )}

    </div>
  );
}

