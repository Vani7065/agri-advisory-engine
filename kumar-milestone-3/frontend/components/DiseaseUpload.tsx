import { useRef, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImagePlus, Leaf, ScanSearch, Upload, X, Loader2, Globe, AlertCircle } from "lucide-react";
import { DashboardCard, CardHeader } from "./DashboardCard";
import { useOfflineCache } from "@/hooks/use-offline-cache";
import { TTL } from "@/lib/cache";
import { CachedDataBanner } from "./CachedDataBanner";

export function DiseaseUpload() {
  const [preview, setPreview] = useState<string | null>(null);
  
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<null | { name: string; conf: number; care: string }>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Phase 8: Preload latest cached diagnosis from IndexedDB
  type DiagnosisResult = { name: string; conf: number; care: string };
  const {
    cachedData: cachedDiagnosis,
    cachedAt: diagnosisCachedAt,
    saveToCache: saveDiagnosisToCache,
  } = useOfflineCache<DiagnosisResult>("disease-result", TTL.DISEASE);

  // Phase 8: Derived — show cached result when offline and no fresh result exists
  const displayResult = result ?? (!isOnline ? cachedDiagnosis : null);
  const isShowingFromCache = !result && !isOnline && !!cachedDiagnosis;

  const onFile = (f?: File | null) => {
    if (!f) return;
    setSelectedFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setErrorMsg(null);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    setSelectedFile(null);
    setResult(null);
    setErrorMsg(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      setErrorMsg("Please upload an image first.");
      return;
    }

    setLoading(true);
    setResult(null);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/api/v1/diagnose?language=${encodeURIComponent(selectedLanguage)}`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok) {
        const diagResult = {
          name: data.disease,
          conf: data.confidence,
          care: data.treatment,
        };
        setResult(diagResult);
        // Phase 8: Persist successful diagnosis to IndexedDB cache
        saveDiagnosisToCache(diagResult);
      } else {
        setErrorMsg(data.detail || "Failed to analyze image. Please try again.");
      }
    } catch (error) {
      console.error("Network Error:", error);
      setErrorMsg("Cannot connect to FastAPI backend. Ensure server is running at http://127.0.0.1:8000");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardCard>
      <CardHeader
        icon={<Leaf className="h-5 w-5 text-leaf" />}
        title="Crop Disease Diagnosis"
        subtitle="Upload a leaf photo to get an instant AI diagnosis."
      />

      {/* Language Selector Bar (Only 5 Languages) */}
      <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-card p-2.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <Globe className="h-4 w-4 text-leaf" />
          <span>Language:</span>
        </div>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
          disabled={loading || !isOnline}
          className="rounded-lg border border-border bg-background px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
        >
          <option value="English">English</option>
          <option value="Hindi">हिंदी (Hindi)</option>
          <option value="Malayalam">മലയാളം (Malayalam)</option>
          <option value="Tamil">தமிழ் (Tamil)</option>
          <option value="Telugu">తెలుగు (Telugu)</option>
        </select>
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (isOnline) onFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => { if (isOnline) inputRef.current?.click(); }}
        className={cn(
          "group relative flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition",
          isOnline ? "cursor-pointer hover:border-primary hover:bg-accent/40" : "cursor-not-allowed opacity-50"
        )}
      >
        {preview ? (
          <>
            <img src={preview} alt="Preview" className="max-h-56 rounded-xl object-cover" />
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-background shadow-soft transition hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-leaf/15 text-leaf">
              <ImagePlus className="h-6 w-6" />
            </div>
            <div className="text-sm font-semibold">
              {isOnline ? "Drag & drop a leaf image" : "Offline — reconnect to ask new questions."}
            </div>
            {isOnline && <div className="text-xs text-muted-foreground">or click to browse · PNG, JPG</div>}
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </div>

      {/* Action Buttons */}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => { if (isOnline) inputRef.current?.click(); }}
          disabled={!isOnline}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-semibold transition hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Upload className="h-4 w-4" /> Upload
        </button>
        <button
          type="button"
          disabled={!preview || loading || !isOnline}
          onClick={handleAnalyze}
          className="flex h-11 items-center justify-center gap-2 rounded-xl bg-gradient-hero text-sm font-semibold text-primary-foreground shadow-glow transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing...
            </>
          ) : (
            <>
              <ScanSearch className="h-4 w-4" /> Analyze
            </>
          )}
        </button>
      </div>

      {/* Visible Error Display Box */}
      {errorMsg && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs font-medium text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Phase 8: Cached data indicator — shown above result when offline */}
      {isShowingFromCache && (
        <CachedDataBanner isFromCache={isShowingFromCache} cachedAt={diagnosisCachedAt} />
      )}

      {/* Result Display Box */}
      {displayResult && (
        <div className="mt-4 rounded-xl border border-leaf/30 bg-leaf/10 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">{displayResult.name}</div>
            <div className="rounded-full bg-leaf px-2.5 py-0.5 text-xs font-semibold text-leaf-foreground">
              {displayResult.conf}% match
            </div>
          </div>
          <p className="mt-2 text-sm text-foreground/80">{displayResult.care}</p>
        </div>
      )}
    </DashboardCard>
  );
}