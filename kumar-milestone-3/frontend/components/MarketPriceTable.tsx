import { useState, useEffect, FormEvent } from "react";
import { getCacheEntry, setCacheEntry, TTL } from "@/lib/cache";
import { useOnlineSync } from "@/hooks/use-online-sync";
import { CachedDataBanner } from "./CachedDataBanner";
import { TrendingDown, TrendingUp, MapPin, Search } from "lucide-react";
import { DashboardCard, CardHeader } from "./DashboardCard";
import { cn } from "@/lib/utils";

interface MandiPrice {
  crop: string;
  market: string;
  price: number | string;
  unit?: string;
  change?: number;
  trend?: string;
}

interface MarketPriceTableProps {
  location?: string;
  onLocationChange?: (newLocation: string) => void;
}

export function MarketPriceTable({
  location: initialLocation = "Delhi",
  onLocationChange,
}: MarketPriceTableProps) {
  // Active location state
  const [activeLocation, setActiveLocation] = useState(initialLocation);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [inputLocation, setInputLocation] = useState(initialLocation);

  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [loading, setLoading] = useState(true);
  // Phase 8: Cache state
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [mandiCachedAt, setMandiCachedAt] = useState<number | null>(null);
  const [syncTrigger, setSyncTrigger] = useState<number>(0);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

  // Keep internal state updated if parent prop changes
  useEffect(() => {
    setActiveLocation(initialLocation);
    setInputLocation(initialLocation);
  }, [initialLocation]);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    setLoading(true);

    // 1. Fetch live rates for active location with an extended 8s timeout
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(`${API_BASE_URL}/api/v1/mandi/dashboard?location=${encodeURIComponent(activeLocation)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch market prices");
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          const rawItems = Array.isArray(data) ? data : data.data || [];
          if (rawItems.length > 0) {
            // Normalize items so field structures align seamlessly
            const normalizedItems: MandiPrice[] = rawItems.map((item: MandiPrice) => ({
              ...item,
              unit: item.unit || "INR/Quintal",
              change: item.change ?? (item.trend === "up" ? 1.5 : item.trend === "down" ? -1.5 : 0),
            }));

            setPrices(normalizedItems);
            setIsFromCache(false);                                            // Phase 8
            setMandiCachedAt(null);                                           // Phase 8
            // Phase 8: Save successful response to IndexedDB
            void setCacheEntry(`mandi:${activeLocation}`, normalizedItems, TTL.MANDI);
          } else {
            setPrices([]);
          }
        }
      })
      .catch(async (err) => {                                                // Phase 8: async catch
        if (err.name === "AbortError") {
          console.warn(`Mandi API fetch timed out for ${activeLocation}`);
        } else {
          console.error("Error fetching live mandi prices:", err);
        }
        // Phase 8: Restore from IndexedDB on network failure
        if (isMounted) {
          const idbResult = await getCacheEntry<MandiPrice[]>(`mandi:${activeLocation}`);
          if (idbResult && !idbResult.isExpired && isMounted) {
            setPrices(idbResult.data);
            setIsFromCache(true);
            setMandiCachedAt(idbResult.cachedAt);
          }
        }
      })
      .finally(() => {
        clearTimeout(timeoutId);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [activeLocation, API_BASE_URL, syncTrigger]); // Phase 8: syncTrigger re-triggers on reconnect

  // Phase 8: Fire syncTrigger when connectivity returns
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

  const formatUnit = (unitStr?: string) => {
    if (!unitStr) return "/ quintal";
    const cleaned = unitStr.replace(/INR|\/|\s/gi, "").toLowerCase();
    return cleaned ? `/ ${cleaned}` : "/ quintal";
  };

  return (
    <DashboardCard className="flex flex-col justify-between">
      <div>
        <CardHeader
          icon={<TrendingUp className="h-5 w-5 text-emerald-600" />}
          title="Market Prices"
          subtitle={`Live mandi rates for ${activeLocation} and nearby markets.`}
          action={
            isEditingLocation ? (
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-border/80 bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                <span>{activeLocation}</span>
              </button>
            )
          }
        />

        {/* Phase 8: Cached data indicator */}
        <CachedDataBanner isFromCache={isFromCache} cachedAt={mandiCachedAt} />

        <div className="-mx-2 overflow-x-auto">
          {loading ? (
            /* Skeleton Loading State */
            <div className="space-y-3 p-3 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-border/40">
                  <div className="h-4 w-20 rounded bg-muted/40" />
                  <div className="h-4 w-28 rounded bg-muted/30" />
                  <div className="h-4 w-16 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : prices.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No market prices available for {activeLocation}.
            </div>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 pb-2.5 text-left">Crop</th>
                  <th className="px-3 pb-2.5 text-left">Market</th>
                  <th className="px-3 pb-2.5 text-right">Price</th>
                  <th className="px-3 pb-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {prices.slice(0, 6).map((r, idx) => {
                  const hasChange = r.change !== undefined && r.change !== null && r.change !== 0;
                  const changeVal = r.change ?? 0;
                  const up = changeVal >= 0;

                  return (
                    <tr key={r.crop || idx} className="transition hover:bg-muted/30">
                      <td className="px-3 py-2.5 text-left font-semibold text-foreground">
                        {r.crop}
                      </td>
                      <td className="px-3 py-2.5 text-left text-xs text-muted-foreground">
                        {r.market || `${activeLocation} Mandi`}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-foreground whitespace-nowrap">
                        {typeof r.price === "number" ? `₹${r.price.toLocaleString("en-IN")}` : r.price}
                        <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                          {formatUnit(r.unit)}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {hasChange ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium",
                              up
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                : "bg-destructive/10 text-destructive"
                            )}
                          >
                            {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            {up ? "+" : ""}{changeVal}%
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Live Rate
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </DashboardCard>
  );
}