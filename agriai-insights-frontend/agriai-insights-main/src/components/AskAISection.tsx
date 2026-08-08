
import { useRef, useState, type KeyboardEvent } from "react";
import {
  Bot,
  Mic,
  Send,
  Sparkles,
  Loader2,
  Square,
  Volume2,
} from "lucide-react";

import { DashboardCard, CardHeader } from "./DashboardCard";
import ChatHistory, { type ChatMessage } from "./chat/ChatHistory";

// ======================================================
// ASK AI SECTION
// ======================================================

export function AskAISection() {
  // ====================================================
  // TEXT / RESPONSE STATES
  // ====================================================

  const [lang, setLang] = useState("English");
  const [q, setQ] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [messageId, setMessageId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // ====================================================
  // CONVERSATION HISTORY
  // ====================================================

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // ====================================================
  // VOICE STATES
  // ====================================================

  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioUrl, setAudioUrl] = useState("");

  // ====================================================
  // MEDIA RECORDER
  // ====================================================

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // ====================================================
  // BACKEND URL
  // ====================================================

  const API_BASE_URL =
    import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // ====================================================
  // LANGUAGE MAPPING
  // ====================================================

  const languageMapping: Record<string, string> = {
    English: "en-IN",
    Hindi: "hi-IN",
    Kannada: "kn-IN",
    Malayalam: "ml-IN",
    Telugu: "te-IN",
    Tamil: "ta-IN",
  };

  // ====================================================
  // GET MESSAGE ID
  // ====================================================

  const getMessageId = (data: any): string => {
    return (
      data?.message_id ??
      data?.messageId ??
      data?.id ??
      data?.result?.message_id ??
      data?.data?.message_id ??
      data?.data?.messageId ??
      ""
    );
  };

  // ====================================================
  // GET AI RESPONSE TEXT
  // ====================================================

  const getResponseText = (data: any): string => {
    const possibleResponse =
      data?.response ??
      data?.answer ??
      data?.advisory ??
      data?.translated_response ??
      data?.canonical_response ??
      data?.result?.response ??
      data?.result?.answer ??
      data?.result?.translated_response ??
      data?.data?.response ??
      data?.data?.answer ??
      data?.data?.translated_response ??
      "";

    return typeof possibleResponse === "string"
      ? possibleResponse.trim()
      : "";
  };

  // ====================================================
  // ADD USER MESSAGE
  // ====================================================

  const addUserMessage = (text: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "user",
        text: cleanText,
      },
    ]);
  };

  // ====================================================
  // ADD ASSISTANT MESSAGE
  // ====================================================

  const addAssistantMessage = (text: string, id: string) => {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        text: cleanText,
        id: id || undefined,
      },
    ]);
  };

  // ====================================================
  // SEND TEXT QUERY
  // ====================================================

  const sendTextQuery = async () => {
    const query = q.trim();

    if (!query || isLoading || isRecording) {
      return;
    }

    console.log("=================================");
    console.log("📤 SENDING TEXT QUERY");
    console.log("Query:", query);
    console.log("Language:", lang);
    console.log("=================================");

    // Show user question immediately.
    addUserMessage(query);

    // Clear input.
    setQ("");

    // Loading state.
    setIsLoading(true);
    setResponse(null);
    setMessageId("");

    try {
  const languageCode = languageMapping[lang] || "en-IN";

  const url = `${API_BASE_URL}/api/v1/query/text`;

  console.log("📤 Backend URL:", url);
  console.log("📤 Language code being sent:", languageCode);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: query,
      session_id: "farmer_001",
      preferred_language: languageCode,
    }),
  });

  console.log("📥 HTTP status:", res.status);

      const rawText = await res.text();

      console.log("========== BACKEND RAW RESPONSE ==========");
      console.log(rawText);
      console.log("===========================================");

      if (!res.ok) {
        throw new Error(
          `Request failed: ${res.status} ${rawText}`
        );
      }

      let data: any;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error("Backend returned invalid JSON.");
      }

      console.log("========== BACKEND JSON ==========");
      console.log(JSON.stringify(data, null, 2));
      console.log("==================================");

      // Get AI response.
      const assistantText = getResponseText(data);

      // Get real backend message ID.
      const assistantMessageId = getMessageId(data);

      console.log("🤖 AI response:", assistantText);
      console.log("🆔 Message ID:", assistantMessageId);

      if (!assistantText) {
        throw new Error(
          "Backend returned no AI response text."
        );
      }

      // Update current response.
      setResponse(assistantText);

      // Save message ID.
      setMessageId(assistantMessageId);

      // Add AI response to history.
      addAssistantMessage(
        assistantText,
        assistantMessageId
      );
    } catch (error) {
      console.error("❌ TEXT QUERY ERROR:", error);

      setResponse(
        "Sorry, I could not process your question. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================================
  // KEYBOARD HANDLER
  // ====================================================

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendTextQuery();
    }
  };

  // ====================================================
  // START RECORDING
  // ====================================================

  const startRecording = async () => {
    if (isRecording || isLoading) {
      return;
    }

    try {
      console.log("🎤 Starting microphone...");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      streamRef.current = stream;
      audioChunks.current = [];

      let mimeType = "";

      if (
        MediaRecorder.isTypeSupported(
          "audio/webm;codecs=opus"
        )
      ) {
        mimeType = "audio/webm;codecs=opus";
      } else if (
        MediaRecorder.isTypeSupported("audio/webm")
      ) {
        mimeType = "audio/webm";
      } else if (
        MediaRecorder.isTypeSupported("audio/mp4")
      ) {
        mimeType = "audio/mp4";
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
          })
        : new MediaRecorder(stream);

      mediaRecorder.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      recorder.onerror = (event) => {
        console.error(
          "❌ MediaRecorder error:",
          event
        );
      };

      recorder.start();

      setIsRecording(true);

      console.log("🎤 Recording started");
    } catch (error) {
      console.error("❌ Microphone error:", error);

      alert(
        "Microphone permission is required to use voice input."
      );
    }
  };

  // ====================================================
  // FINISH RECORDING
  // ====================================================

  const finishRecording = () => {
    const recorder = mediaRecorder.current;

    if (!recorder) {
      return;
    }

    if (recorder.state !== "recording") {
      return;
    }

    console.log("🛑 Stopping recording...");

    recorder.onstop = async () => {
      try {
        const mimeType =
          recorder.mimeType || "audio/webm";

        const audioBlob = new Blob(
          audioChunks.current,
          {
            type: mimeType,
          }
        );

        console.log(
          "🎤 Audio size:",
          audioBlob.size
        );

        // Stop microphone.
        streamRef.current
          ?.getTracks()
          .forEach((track) => {
            track.stop();
          });

        streamRef.current = null;
        mediaRecorder.current = null;
        audioChunks.current = [];

        await sendAudioToBackend(audioBlob);
      } catch (error) {
        console.error(
          "❌ Recording processing error:",
          error
        );

        setIsLoading(false);
        setIsRecording(false);
      }
    };

    recorder.stop();

    setIsRecording(false);
  };

  // ====================================================
  // SEND AUDIO TO BACKEND
  // ====================================================

  const sendAudioToBackend = async (audioBlob: Blob) => {
    try {
      setIsLoading(true);

      const endpoint =
        `${API_BASE_URL}/api/v1/query/audio`;

      console.log("=================================");
      console.log("📤 SENDING VOICE QUERY");
      console.log("Audio size:", audioBlob.size);
      console.log("Audio type:", audioBlob.type);
      console.log("Backend URL:", endpoint);
      console.log("=================================");

      // ---------------------------------------------
      // Create FormData
      // ---------------------------------------------

      const formData = new FormData();

      formData.append(
        "session_id",
        "farmer_001"
      );

      formData.append(
        "language_code",
        languageMapping[lang] || "en-IN"
      );

      // ---------------------------------------------
      // Convert Blob to File
      // ---------------------------------------------

      const extension =
        audioBlob.type.includes("mp4")
          ? "mp4"
          : "webm";

      const audioFile = new File(
        [audioBlob],
        `voice.${extension}`,
        {
          type:
            audioBlob.type ||
            "audio/webm",
        }
      );

      formData.append(
        "file",
        audioFile
      );

      // ---------------------------------------------
      // DEBUG FORMDATA
      // ---------------------------------------------

      console.log("📦 FormData contents:");

      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(
            key,
            "=>",
            value.name,
            value.type,
            value.size
          );
        } else {
          console.log(key, "=>", value);
        }
      }

      // ---------------------------------------------
      // SEND
      // ---------------------------------------------

      const res = await fetch(
        endpoint,
        {
          method: "POST",
          body: formData,
        }
      );

      console.log(
        "📥 Voice HTTP status:",
        res.status
      );

      const rawText = await res.text();

      console.log(
        "========== VOICE RESPONSE =========="
      );
      console.log(rawText);
      console.log(
        "===================================="
      );

      if (!res.ok) {
        throw new Error(
          `Voice request failed: ${res.status} ${rawText}`
        );
      }

      let data: any;

      try {
        data = JSON.parse(rawText);
      } catch {
        throw new Error(
          "Backend returned invalid JSON."
        );
      }

      console.log(
        "========== VOICE JSON =========="
      );
      console.log(
        JSON.stringify(data, null, 2)
      );
      console.log(
        "================================"
      );

      // ---------------------------------------------
      // GET RESPONSE
      // ---------------------------------------------

      const aiResponse =
        getResponseText(data);

      const voiceMessageId =
        getMessageId(data);

      if (!aiResponse) {
        throw new Error(
          "Backend returned no AI response."
        );
      }

      console.log(
        "🤖 Voice AI response:",
        aiResponse
      );

      console.log(
        "🆔 Voice Message ID:",
        voiceMessageId
      );

      // ---------------------------------------------
      // UPDATE CURRENT RESPONSE
      // ---------------------------------------------

      setResponse(aiResponse);

      setMessageId(voiceMessageId);

      // ---------------------------------------------
      // ADD USER TRANSCRIPT TO HISTORY
      // ---------------------------------------------

      const transcript =
        data?.canonical_query ??
        data?.query ??
        data?.transcript ??
        data?.transcription ??
        "";

      if (typeof transcript === "string" && transcript.trim()) {
        addUserMessage(transcript);
      }

      // ---------------------------------------------
      // ADD AI RESPONSE TO HISTORY
      // ---------------------------------------------

      addAssistantMessage(
        aiResponse,
        voiceMessageId
      );

      // ---------------------------------------------
      // PLAY TTS
      // ---------------------------------------------

      const base64Audio =
        data?.audio ??
        data?.audio_base64 ??
        data?.tts_audio ??
        "";

      if (base64Audio) {
        console.log(
          "🔊 Playing AI voice response..."
        );

        const audioSrc =
          `data:audio/wav;base64,${base64Audio}`;

        const audio = new Audio(audioSrc);

        audio.onplay = () => {
          console.log(
            "▶️ AI audio playback started"
          );

          setIsSpeaking(true);
        };

        audio.onended = () => {
          console.log(
            "⏹️ AI audio playback finished"
          );

          setIsSpeaking(false);
        };

        audio.onerror = (error) => {
          console.error(
            "❌ Audio playback error:",
            error
          );

          setIsSpeaking(false);
        };

        setAudioUrl(audioSrc);

        await audio.play();
      } else {
        console.warn(
          "⚠️ Backend returned no TTS audio."
        );
      }
    } catch (error) {
      console.error(
        "❌ VOICE QUERY ERROR:",
        error
      );

      setResponse(
        "Sorry, I could not process your voice query."
      );
    } finally {
      setIsLoading(false);
    }
  };

  // ====================================================
  // STOP AUDIO
  // ====================================================

  const stopSpeaking = () => {
    setIsSpeaking(false);

    const audioElements =
      document.querySelectorAll("audio");

    audioElements.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
  };

  // ====================================================
  // RENDER
  // ====================================================

  return (
    <DashboardCard className="overflow-hidden">
      <CardHeader
        title="Ask AI"
        description="Ask agricultural questions using text or your voice."
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="space-y-6 p-6">
        {/* ==================================================
            LANGUAGE SELECTOR
        ================================================== */}

        <div className="flex flex-wrap items-center gap-3">
          <label
            htmlFor="ai-language"
            className="text-sm font-medium"
          >
            Language
          </label>

          <select
            id="ai-language"
            value={lang}
            onChange={(event) =>
              setLang(event.target.value)
            }
            disabled={isLoading || isRecording}
            className="rounded-lg border bg-background px-3 py-2 text-sm outline-none"
          >
            {Object.keys(languageMapping).map(
              (language) => (
                <option
                  key={language}
                  value={language}
                >
                  {language}
                </option>
              )
            )}
          </select>
        </div>

        {/* ==================================================
            QUESTION INPUT
        ================================================== */}

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <input
              type="text"
              value={q}
              onChange={(event) =>
                setQ(event.target.value)
              }
              onKeyDown={handleKeyDown}
              disabled={isLoading || isRecording}
              placeholder="Ask about crops, diseases, fertilizer, weather..."
              className="w-full rounded-xl border bg-background px-4 py-3 pr-4 text-sm outline-none focus:ring-2"
            />
          </div>

          <button
            type="button"
            onClick={sendTextQuery}
            disabled={
              !q.trim() ||
              isLoading ||
              isRecording
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}

            Ask AI
          </button>
        </div>

        {/* ==================================================
            VOICE CONTROLS
        ================================================== */}

        <div className="flex flex-col items-center gap-4 rounded-2xl border p-6">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Mic className="h-4 w-4" />

            {isRecording
              ? "Listening..."
              : isSpeaking
                ? "AI is speaking..."
                : isLoading
                  ? "Processing..."
                  : "Speak your question"}
          </div>

          <button
            type="button"
            onClick={
              isRecording
                ? finishRecording
                : startRecording
            }
            disabled={isLoading && !isRecording}
            className="flex h-16 w-16 items-center justify-center rounded-full border-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={
              isRecording
                ? "Stop recording"
                : "Start recording"
            }
          >
            {isRecording ? (
              <Square className="h-6 w-6" />
            ) : isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </button>

          <p className="text-center text-xs opacity-70">
            {isRecording
              ? "Click the button to stop recording"
              : "Click the microphone and speak in your selected language"}
          </p>
        </div>

        {/* ==================================================
            CURRENT AI RESPONSE
        ================================================== */}

        {response && (
          <div className="rounded-2xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Bot className="h-5 w-5" />

                <span>AgriAI</span>
              </div>

              {isSpeaking && (
                <button
                  type="button"
                  onClick={stopSpeaking}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs"
                >
                  <Volume2 className="h-4 w-4" />
                  Stop voice
                </button>
              )}
            </div>

            <p className="whitespace-pre-wrap text-sm leading-6">
              {response}
            </p>

            {messageId && (
              <p className="mt-3 text-[10px] opacity-50">
                Message ID: {messageId}
              </p>
            )}
          </div>
        )}

        {/* ==================================================
            AUDIO PLAYER
        ================================================== */}

        {audioUrl && (
          <audio
            src={audioUrl}
            controls
            className="w-full"
          />
        )}

        {/* ==================================================
            CHAT HISTORY
        ================================================== */}

        {messages.length > 0 && (
          <div className="border-t pt-6">
            <div className="mb-4 flex items-center gap-2">
              <Bot className="h-5 w-5" />

              <h3 className="font-semibold">
                Conversation History
              </h3>
            </div>

            <ChatHistory messages={messages} />
          </div>
        )}
      </div>
    </DashboardCard>
  );
}

