import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/Hero";
import { StatCards } from "@/components/DashboardCard";
import { AskAISection } from "@/components/AskAISection";
import { useState, useEffect, lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy-load widgets to optimize initial paint and interaction times
const VoiceAssistant = lazy(() =>
  import("@/components/VoiceAssistant").then((m) => ({ default: m.VoiceAssistant }))
);
const WeatherCard = lazy(() =>
  import("@/components/WeatherCard").then((m) => ({ default: m.WeatherCard }))
);
const MarketPriceTable = lazy(() =>
  import("@/components/MarketPriceTable").then((m) => ({ default: m.MarketPriceTable }))
);
const SchemesGrid = lazy(() =>
  import("@/components/SchemeCard").then((m) => ({ default: m.SchemesGrid }))
);
const DiseaseUpload = lazy(() =>
  import("@/components/DiseaseUpload").then((m) => ({ default: m.DiseaseUpload }))
);

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  // Phase 8: Restore language preference from localStorage (lazy initializer = no flash, safe for SSR)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    () => {
      if (typeof window !== "undefined") {
        return localStorage.getItem("agri_preferred_language") ?? "Malayalam";
      }
      return "Malayalam";
    }
  );
  const [voiceAiResponse, setVoiceAiResponse] = useState<string | null>(null);

  // Phase 8: Persist language selection whenever it changes
  useEffect(() => {
    localStorage.setItem("agri_preferred_language", selectedLanguage);
  }, [selectedLanguage]);

  return (
    <AppShell title="Dashboard">
      <div className="space-y-6">
        <Hero />
        <StatCards />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AskAISection
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
              sharedResponse={voiceAiResponse}
            />
          </div>
          <Suspense fallback={<Skeleton className="h-[220px] w-full rounded-2xl animate-pulse bg-emerald-50/50" />}>
            <VoiceAssistant
              selectedLanguage={selectedLanguage}
              onResponseReceived={(response) => setVoiceAiResponse(response)}
            />
          </Suspense>
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<Skeleton className="h-[340px] w-full rounded-2xl animate-pulse bg-emerald-50/50" />}>
            <WeatherCard />
          </Suspense>
          <Suspense fallback={<Skeleton className="h-[340px] w-full rounded-2xl animate-pulse bg-emerald-50/50" />}>
            <MarketPriceTable />
          </Suspense>
        </div>
        <Suspense fallback={<Skeleton className="h-[180px] w-full rounded-2xl animate-pulse bg-emerald-50/50" />}>
          <DiseaseUpload />
        </Suspense>
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold">Government Schemes</h3>
              <p className="text-sm text-muted-foreground">Programs you may be eligible for.</p>
            </div>
          </div>
          <Suspense fallback={
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <Skeleton className="h-[120px] rounded-xl animate-pulse bg-emerald-50/50" />
              <Skeleton className="h-[120px] rounded-xl animate-pulse bg-emerald-50/50" />
              <Skeleton className="h-[120px] rounded-xl animate-pulse bg-emerald-50/50" />
            </div>
          }>
            <SchemesGrid />
          </Suspense>
        </div>
      </div>
    </AppShell>
  );
}