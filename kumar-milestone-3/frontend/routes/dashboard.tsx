import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/Hero";
import { StatCards } from "@/components/DashboardCard";
import { AskAISection } from "@/components/AskAISection";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { WeatherCard } from "@/components/WeatherCard";
import { MarketPriceTable } from "@/components/MarketPriceTable";
import { SchemesGrid } from "@/components/SchemeCard";
import { DiseaseUpload } from "@/components/DiseaseUpload";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  // Phase 8: Restore language preference from localStorage (lazy initializer = no flash)
  const [selectedLanguage, setSelectedLanguage] = useState<string>(
    () => localStorage.getItem("agri_preferred_language") ?? "Malayalam"
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
          <VoiceAssistant
            selectedLanguage={selectedLanguage}
            onResponseReceived={(response) => setVoiceAiResponse(response)}
          />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <WeatherCard />
          <MarketPriceTable />
        </div>
        <DiseaseUpload />
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold">Government Schemes</h3>
              <p className="text-sm text-muted-foreground">Programs you may be eligible for.</p>
            </div>
          </div>
          <SchemesGrid />
        </div>
      </div>
    </AppShell>
  );
}