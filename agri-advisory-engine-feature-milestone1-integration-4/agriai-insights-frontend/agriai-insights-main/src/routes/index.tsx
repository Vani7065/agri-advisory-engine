import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/layout/AppShell";
import { Hero } from "@/components/Hero";
import { StatsRow } from "@/components/StatsRow";
import { AskAISection } from "@/components/AskAISection";
import { VoiceAssistant } from "@/components/VoiceAssistant";
import { WeatherCard } from "@/components/WeatherCard";
import { MarketPriceTable } from "@/components/MarketPriceTable";
import { SchemesGrid } from "@/components/SchemeCard";
import { DiseaseUpload } from "@/components/DiseaseUpload";

export const Route = createFileRoute("/")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();

  return (
    <AppShell title={t("dashboard.title", "Dashboard")}>
      <div className="space-y-6">
        <Hero />
        <StatsRow />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <AskAISection />
          </div>
          <VoiceAssistant />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <WeatherCard />
          <MarketPriceTable />
        </div>
        <DiseaseUpload />
        <div>
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {t("schemes.title", "Government Schemes")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("schemes.subtitle", "Programs you may be eligible for.")}
              </p>
            </div>
          </div>
          <SchemesGrid />
        </div>
      </div>
    </AppShell>
  );
}