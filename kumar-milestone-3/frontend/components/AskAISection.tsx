import { useState, useEffect } from "react";
import { Bot, Mic, Send, Sparkles, Loader2 } from "lucide-react";
import { DashboardCard, CardHeader } from "./DashboardCard";
import { languages } from "@/data/mock";
import { addAIResponse, getLatestAIResponse } from "@/lib/cache";
import { CachedDataBanner } from "./CachedDataBanner";

// 1. Declare TypeScript Props Interface
interface AskAISectionProps {
  selectedLanguage?: string;
  onLanguageChange?: (lang: string) => void;
  sharedResponse?: string | null;
}

export function AskAISection({
  selectedLanguage,
  onLanguageChange,
  sharedResponse,
}: AskAISectionProps) {
  // Local language fallback state in case props aren't passed
  const [localLang, setLocalLang] = useState<string>("English");
  
  // Offline status tracking
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      const goOnline = () => setIsOnline(true);
      const goOffline = () => setIsOnline(false);
      window.addEventListener("online", goOnline);
      window.addEventListener("offline", goOffline);
      return () => {
        window.removeEventListener("online", goOnline);
        window.removeEventListener("offline", goOffline);
      };
    }
  }, []);
  
  // Use parent prop if provided, otherwise fallback to local state
  const currentLang = selectedLanguage ?? localLang;

  const [q, setQ] = useState("");
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  // Phase 8: Cached AI response state (last successful advisory, non-sensitive)
  const [cachedAIResponse, setCachedAIResponse] = useState<string | null>(null);
  const [aiCachedAt, setAiCachedAt] = useState<number | null>(null);

  // Phase 8: Load the most recent cached AI response on mount
  useEffect(() => {
    getLatestAIResponse().then((record) => {
      if (record) {
        setCachedAIResponse(record.response);
        setAiCachedAt(record.cachedAt);
      }
    });
  }, []);

  // Determine what response to show:
  // • Live response (fresh submit) overrides everything
  // • When offline with no live response → show last cached advisory
  const shouldShowCached = !isOnline && !response && !sharedResponse && !!cachedAIResponse;
  const displayResponse = sharedResponse || response || (shouldShowCached ? cachedAIResponse : null);

  // Grab the local backend address from your .env configuration
  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  const submit = async () => {
    if (!q.trim() || isLoading) return;

    setIsLoading(true);
    setResponse(null);

    try {
      // 1. DUMMY CONTEXT LAYER 
      const mockContext = currentLang === "Hindi" 
        ? ["टमाटर की फसलों में डाउनी मिल्ड्यू का प्रबंधन साप्ताहिक रूप से तांबे-आधारित कवकनाशी (copper-based fungicides) लगाकर किया जाना चाहिए।"]
        : ["Downy mildew in tomato crops should be managed by applying copper-based fungicides weekly."];

      // 2. TARGET THE ADVISORY ENDPOINT
      const res = await fetch(`${API_BASE_URL}/api/advisory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: q.trim(),
          context: mockContext
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned status: ${res.status}`);
      }

      const data = await res.json();

      // 3. PARSE RESPONSE OBJECT CONTEXT (supports translated_response, response, or canonical_response)
      const finalOutput = data.translated_response || data.response || data.canonical_response;

      if (finalOutput) {
        setResponse(finalOutput);
        // Phase 8: Persist to AI ring-buffer (max 20 entries, no sensitive data)
        void addAIResponse(q.trim(), finalOutput, currentLang);
        setCachedAIResponse(finalOutput);
        setAiCachedAt(Date.now());
      } else {
        setResponse("Backend connection was successful, but no response engine text was returned.");
      }

    } catch (error) {
      console.error("FastAPI Connection Error:", error);
      setResponse(
        "Failed to reach the AI Advisory Server. Please verify that your Python local backend is active on port 8000!"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageSelect = (newLang: string) => {
    setLocalLang(newLang);
    if (onLanguageChange) {
      onLanguageChange(newLang);
    }
  };

  return (
    <DashboardCard>
      <CardHeader
        icon={<Bot className="h-5 w-5 text-leaf" />}
        title="Ask AI"
        subtitle="Ask anything about crops, diseases, fertilizers, irrigation, or farming."
      />

      {/* Phase 8: Show cached AI response banner when offline */}
      <CachedDataBanner isFromCache={shouldShowCached} cachedAt={aiCachedAt} />

      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <select
          value={currentLang}
          onChange={(e) => handleLanguageSelect(e.target.value)}
          disabled={isLoading || !isOnline}
          className="h-11 rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-leaf" />
          Powered by multilingual agricultural intelligence
        </div>
      </div>

      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        rows={4}
        disabled={isLoading || !isOnline}
        placeholder={isOnline ? "Ask your farming question..." : "Offline — reconnect to ask new questions."}
        className="mt-3 w-full resize-none rounded-xl border border-border bg-card p-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
      />

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          onClick={submit}
          disabled={isLoading || !isOnline}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-hero text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Thinking...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Ask AI
            </>
          )}
        </button>
        <button 
          disabled={isLoading || !isOnline}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-sky text-sm font-semibold text-sky-foreground shadow-soft transition hover:opacity-95 disabled:opacity-50"
        >
          <Mic className="h-4 w-4" />
          Speak
        </button>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Bot className="h-3.5 w-3.5" /> AI Response
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-leaf" />
              <span>Consulting the RAG engine...</span>
            </div>
          ) : displayResponse ? (
            <div className="flex gap-3">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf text-leaf-foreground">
                <Bot className="h-4 w-4" />
              </div>
              {/* whitespace-pre-wrap ensures line breaks (\n\n) and numbered lists format properly */}
              <p className="whitespace-pre-wrap leading-relaxed text-foreground/90">
                {displayResponse}
              </p>
            </div>
          ) : (
            <p className="text-muted-foreground">Waiting for your question...</p>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}
