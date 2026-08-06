import { useEffect, useState, FormEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Sprout, Droplets, Activity, AlertTriangle, MapPin, Search } from "lucide-react";
import { CachedDataBanner } from "./CachedDataBanner";
import { useOnlineSync } from "@/hooks/use-online-sync";

export function DashboardCard({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/60 bg-card p-5 shadow-soft transition hover:shadow-elevated sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  icon,
  title,
  subtitle,
  action,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-accent-foreground">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold sm:text-lg">{title}</h3>
          {subtitle && <div className="mt-0.5 text-sm text-muted-foreground">{subtitle}</div>}
        </div>
      </div>
      {action}
    </div>
  );
}

interface StatCardsProps {
  location?: string;
  onLocationChange?: (newLocation: string) => void;
}

// Dynamic Stat Cards Grid Component
export function StatCards({
  location: initialLocation = "Delhi",
  onLocationChange,
}: StatCardsProps) {
  const [activeLocation, setActiveLocation] = useState(initialLocation);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [inputLocation, setInputLocation] = useState(initialLocation);

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    activeCropsCount: 1,
    soilCondition: "Good condition",
    waterUsageEstimate: "1.2k L",
    advisoryAlerts: 3,
  });
  // Phase 8: Cache state
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [metricsCachedAt, setMetricsCachedAt] = useState<number | null>(null);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);

  /** localStorage key for dashboard metrics — safe, non-sensitive computed values. */
  const DASHBOARD_METRICS_KEY = "agri_dashboard_metrics";

  // Keep internal state in sync with location props passed down
  useEffect(() => {
    setActiveLocation(initialLocation);
    setInputLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    let isMounted = true;

    async function calculateMetrics() {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (isMounted) setLoading(false);
          return;
        }

        const { data: farm, error } = await supabase
          .from("farm_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching farm profile:", error);
        }

        if (farm && isMounted) {
          // 1. Active Crops Count
          const cropsCount =
            Array.isArray(farm.active_crops) && farm.active_crops.length > 0
              ? farm.active_crops.length
              : 1;

          // 2. Calculated Water Usage based on acres and irrigation method
          const size = farm.farm_size_acres || 1;
          const multiplier = farm.irrigation_type === "Drip Irrigation" ? 400 : 800;
          const liters = Math.round(size * multiplier);
          const waterFormatted =
            liters >= 1000 ? `${(liters / 1000).toFixed(1)}k L` : `${liters} L`;

          // 3. Soil Condition based on soil type
          let soilCond = "Good condition";
          if (farm.soil_type === "Loam Soil" || farm.soil_type === "Black Soil") {
            soilCond = "Optimal (85%)";
          } else if (farm.soil_type === "Sandy Soil") {
            soilCond = "Needs Moisture";
          } else if (farm.soil_type === "Clay Soil") {
            soilCond = "High Retention";
          }

          const newMetrics = {
            activeCropsCount: cropsCount,
            soilCondition: soilCond,
            waterUsageEstimate: waterFormatted,
            advisoryAlerts: 3,
          };
          setMetrics(newMetrics);
          setIsFromCache(false);
          setMetricsCachedAt(null);
          // Phase 8: Persist computed metrics to localStorage (no tokens/secrets)
          try {
            localStorage.setItem(
              DASHBOARD_METRICS_KEY,
              JSON.stringify({ metrics: newMetrics, cachedAt: Date.now() })
            );
          } catch { /* Storage unavailable — silently ignore */ }
        }
      } catch (err) {
        console.error("Failed to load dashboard stat metrics:", err);
        // Phase 8: Restore from localStorage when Supabase is unreachable
        try {
          const saved = localStorage.getItem(DASHBOARD_METRICS_KEY);
          if (saved && isMounted) {
            const { metrics: savedMetrics, cachedAt: savedAt } = JSON.parse(saved) as {
              metrics: typeof metrics;
              cachedAt: number;
            };
            setMetrics(savedMetrics);
            setIsFromCache(true);
            setMetricsCachedAt(savedAt);
          }
        } catch { /* Corrupted storage — silently ignore */ }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    calculateMetrics();

    return () => {
      isMounted = false;
    };
  }, [activeLocation, syncTrigger]); // Phase 8: syncTrigger re-fires on reconnect

  // Phase 8: Re-fetch metrics when connectivity returns
  useOnlineSync(() => setSyncTrigger((t) => t + 1));

  const handleLocationSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = inputLocation.trim();
    if (trimmed && trimmed !== activeLocation) {
      setActiveLocation(trimmed);
      if (onLocationChange) {
        onLocationChange(trimmed);
      }
    }
    setIsEditingLocation(false);
  };

  return (
    <div className="space-y-3">
      {/* Phase 8: Cached metrics indicator */}
      <CachedDataBanner isFromCache={isFromCache} cachedAt={metricsCachedAt} />
      {/* Dynamic Location Bar Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Farm Overview
        </span>

        {isEditingLocation ? (
          <form onSubmit={handleLocationSubmit} className="flex items-center gap-1.5">
            <input
              type="text"
              value={inputLocation}
              onChange={(e) => setInputLocation(e.target.value)}
              placeholder="Enter location..."
              className="w-32 rounded-lg border border-border bg-background px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 sm:w-40"
              autoFocus
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 p-1.5 text-white transition hover:bg-emerald-700"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditingLocation(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground shadow-xs"
          >
            <MapPin className="h-3.5 w-3.5 text-emerald-600" />
            <span>{activeLocation}</span>
          </button>
        )}
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {/* Active Crops */}
        <DashboardCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Active Crops</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Sprout className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="mt-2 h-8 w-16 animate-pulse rounded bg-muted/40" />
          ) : (
            <h3 className="mt-2 text-2xl font-bold text-foreground">
              {metrics.activeCropsCount}
            </h3>
          )}
          <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Currently growing
          </p>
        </DashboardCard>

        {/* Soil Health */}
        <DashboardCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Soil Health</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="mt-2 h-8 w-28 animate-pulse rounded bg-muted/40" />
          ) : (
            <h3 className="mt-2 text-xl font-bold text-foreground sm:text-2xl truncate">
              {metrics.soilCondition}
            </h3>
          )}
          <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Based on farm profile
          </p>
        </DashboardCard>

        {/* Water Usage */}
        <DashboardCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Water Usage</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-blue-500/10 text-blue-600">
              <Droplets className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="mt-2 h-8 w-20 animate-pulse rounded bg-muted/40" />
          ) : (
            <h3 className="mt-2 text-2xl font-bold text-foreground">
              {metrics.waterUsageEstimate}
            </h3>
          )}
          <p className="mt-1 text-[11px] font-medium text-muted-foreground">
            Est. daily requirement
          </p>
        </DashboardCard>

        {/* Advisory Alerts */}
        <DashboardCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Advisory Alerts</p>
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          {loading ? (
            <div className="mt-2 h-8 w-12 animate-pulse rounded bg-muted/40" />
          ) : (
            <h3 className="mt-2 text-2xl font-bold text-foreground">
              {metrics.advisoryAlerts}
            </h3>
          )}
          <p className="mt-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            Updated today
          </p>
        </DashboardCard>
      </div>
    </div>
  );
}