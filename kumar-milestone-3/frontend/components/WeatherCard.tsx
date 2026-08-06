import { useState, useEffect } from "react";
import { getCacheEntry, setCacheEntry, TTL } from "@/lib/cache";
import { useOnlineSync } from "@/hooks/use-online-sync";
import { CachedDataBanner } from "./CachedDataBanner";
import { 
  CloudRain, 
  CloudSun, 
  Droplets, 
  MapPin, 
  Sun, 
  Wind, 
  RefreshCw, 
  Search, 
  Navigation,
  Check,
  X
} from "lucide-react";
import { DashboardCard, CardHeader } from "./DashboardCard";

interface WeatherData {
  temperature: number;
  humidity: number;
  weather: string;
  rainfall: number;
  wind_speed?: number;
}

const DEFAULT_FORECAST = [
  { day: "Today", c: "sun", t: 28 },
  { day: "Wed", c: "rain", t: 26 },
  { day: "Thu", c: "cloud", t: 27 },
  { day: "Fri", c: "sun", t: 29 },
  { day: "Sat", c: "sun", t: 30 },
];

const iconFor = (c: string) =>
  c === "sun" ? Sun : c === "rain" ? CloudRain : CloudSun;

export function WeatherCard() {
  const [location, setLocation] = useState<string>("Kottayam");
  const [isEditingLocation, setIsEditingLocation] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>("");
  
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  // Phase 8: Cache state
  const [isFromCache, setIsFromCache] = useState<boolean>(false);
  const [weatherCachedAt, setWeatherCachedAt] = useState<number | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
  const CACHE_KEY = `cached_weather_${location}`;

  const loadWeather = async (targetLocation: string, isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    setIsError(false);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/v1/weather?location=${encodeURIComponent(targetLocation)}`
      );

      if (!res.ok) {
        throw new Error(`Weather service status: ${res.status}`);
      }

      const data: WeatherData = await res.json();
      setWeatherData(data);
      setIsFromCache(false);
      setWeatherCachedAt(null);
      // Phase 1–7: existing localStorage write (unchanged)
      localStorage.setItem(`cached_weather_${targetLocation}`, JSON.stringify(data));
      // Phase 8: IndexedDB write with TTL + version
      void setCacheEntry(`weather:${targetLocation}`, data, TTL.WEATHER);
    } catch (err) {
      console.error("Failed to load weather data:", err);
      // Phase 8: Attempt IndexedDB fallback before showing error
      const idbResult = await getCacheEntry<WeatherData>(`weather:${targetLocation}`);
      if (idbResult && !idbResult.isExpired) {
        setWeatherData(idbResult.data);
        setIsFromCache(true);
        setWeatherCachedAt(idbResult.cachedAt);
      } else if (!weatherData) {
        setIsError(true);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // Phase 8: Re-fetch and update cache when connectivity returns
  useOnlineSync(() => { void loadWeather(location); });

  useEffect(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setWeatherData(JSON.parse(cached));
        setIsLoading(false);
      } catch (e) {
        console.error("Failed parsing weather cache", e);
      }
    } else {
      setIsLoading(true);
    }

    loadWeather(location);
  }, [location]);

  // Handle Manual City / District Search Submission
  const handleLocationSubmit = () => {
    if (searchInput.trim()) {
      const formattedLocation = searchInput.trim();
      setLocation(formattedLocation);
      setIsEditingLocation(false);
      setSearchInput("");
    }
  };

  // Handle Browser GPS Auto-Detection
  const handleGpsDetect = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser.");
      return;
    }

    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          // Free Geocoding API to resolve coordinates into a City/District name
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          const geoData = await geoRes.json();
          const detectedCity =
            geoData.address?.district ||
            geoData.address?.city ||
            geoData.address?.town ||
            geoData.address?.village ||
            geoData.address?.state ||
            "My Location";

          setLocation(detectedCity);
        } catch (e) {
          console.error("Failed to reverse geocode GPS location:", e);
          // Fallback location string if reverse geocoding API is unreachable
          setLocation(`${latitude.toFixed(2)},${longitude.toFixed(2)}`);
        } finally {
          setIsDetectingGps(false);
        }
      },
      (error) => {
        console.warn("GPS Permission denied or unavailable:", error);
        alert("Unable to retrieve your location. Please check browser permissions.");
        setIsDetectingGps(false);
      }
    );
  };

  const getAgriAdvisory = (data: WeatherData) => {
    if (data.rainfall > 5.0 || data.weather.toLowerCase().includes("rain")) {
      return "Heavy rain detected: Postpone chemical spraying & clear field drainage channels.";
    }
    if (data.humidity > 80) {
      return "High humidity alert: Inspect crops for fungal infections like late blight or mildew.";
    }
    if (data.temperature > 32) {
      return "High heat detected: Ensure early morning or late evening drip irrigation.";
    }
    return "Weather conditions optimal for fertilizer application and general crop management.";
  };

  return (
    <DashboardCard className="flex flex-col justify-between">
      <div>
        {/* Phase 8: Cached data indicator */}
        <CachedDataBanner isFromCache={isFromCache} cachedAt={weatherCachedAt} />
        <CardHeader
          icon={<CloudSun className="h-5 w-5 text-sky-500" />}
          title="Weather Advisory"
          subtitle={
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0" />

              {isEditingLocation ? (
                /* Editable Search Bar Mode */
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Enter city or district..."
                    autoFocus
                    className="h-6 w-36 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
                    onKeyDown={(e) => e.key === "Enter" && handleLocationSubmit()}
                  />
                  <button
                    onClick={handleLocationSubmit}
                    className="p-1 text-emerald-600 hover:text-emerald-700"
                    title="Apply Location"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingLocation(false);
                      setSearchInput("");
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground"
                    title="Cancel"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* Display Location Mode */
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setSearchInput(location);
                      setIsEditingLocation(true);
                    }}
                    className="group flex items-center gap-1 font-medium text-foreground hover:underline"
                    title="Click to search district or city"
                  >
                    <span>{location}</span>
                    <Search className="h-3 w-3 text-muted-foreground transition group-hover:text-foreground" />
                  </button>

                  {/* Auto-detect GPS Location Button */}
                  <button
                    onClick={handleGpsDetect}
                    disabled={isDetectingGps}
                    className="ml-1 p-0.5 text-muted-foreground hover:text-emerald-600 disabled:opacity-50"
                    title="Detect current location via GPS"
                  >
                    <Navigation
                      className={`h-3 w-3 ${isDetectingGps ? "animate-spin text-emerald-600" : ""}`}
                    />
                  </button>
                </div>
              )}
            </div>
          }
          action={
            <button
              onClick={() => loadWeather(location, true)}
              disabled={isRefreshing}
              className="p-1 text-muted-foreground transition hover:text-foreground disabled:opacity-50"
              title="Refresh weather"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          }
        />

        {isLoading && !weatherData ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-32 rounded-2xl bg-muted/40" />
            <div className="h-10 rounded-xl bg-muted/30" />
            <div className="grid grid-cols-5 gap-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-muted/20" />
              ))}
            </div>
          </div>
        ) : isError || !weatherData ? (
          <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-2xl bg-destructive/10 text-xs text-destructive">
            <span>Failed to load live weather for "{location}".</span>
            <button
              onClick={() => loadWeather(location, true)}
              className="rounded-lg bg-card px-3 py-1 font-medium shadow-sm hover:bg-muted text-foreground"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Main Temp Hero Banner */}
            <div className="rounded-2xl bg-gradient-to-br from-sky-500/10 via-emerald-500/5 to-transparent p-4 border border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-4xl font-bold tracking-tight text-foreground">
                    {weatherData.temperature}°C
                  </div>
                  <div className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {weatherData.weather}
                  </div>
                </div>
                <CloudSun className="h-14 w-14 text-sky-500 shrink-0" />
              </div>

              {/* Glassmorphic Metrics Row */}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-xl bg-card/60 p-2.5 backdrop-blur-sm border border-border/40">
                  <Droplets className="h-3.5 w-3.5 text-emerald-600" />
                  <div className="mt-1 text-xs font-bold text-foreground">{weatherData.humidity}%</div>
                  <div className="text-[10px] text-muted-foreground">Humidity</div>
                </div>

                <div className="rounded-xl bg-card/60 p-2.5 backdrop-blur-sm border border-border/40">
                  <CloudRain className="h-3.5 w-3.5 text-emerald-600" />
                  <div className="mt-1 text-xs font-bold text-foreground">{weatherData.rainfall} mm</div>
                  <div className="text-[10px] text-muted-foreground">Rainfall</div>
                </div>

                <div className="rounded-xl bg-card/60 p-2.5 backdrop-blur-sm border border-border/40">
                  <Wind className="h-3.5 w-3.5 text-emerald-600" />
                  <div className="mt-1 text-xs font-bold text-foreground">
                    {weatherData.wind_speed ? `${weatherData.wind_speed} km/h` : "12 km/h"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">Wind</div>
                </div>
              </div>
            </div>

            {/* Agronomic Insight Box */}
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs leading-relaxed text-foreground">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                Agronomic Insight:{" "}
              </span>
              {getAgriAdvisory(weatherData)}
            </div>

            {/* 5-Day Forecast Grid */}
            <div className="grid grid-cols-5 gap-1.5 pt-1">
              {DEFAULT_FORECAST.map((f) => {
                const I = iconFor(f.c);
                return (
                  <div
                    key={f.day}
                    className="rounded-xl border border-border/50 bg-card p-2 text-center"
                  >
                    <div className="text-[10px] font-medium text-muted-foreground">
                      {f.day}
                    </div>
                    <I className="mx-auto my-1 h-3.5 w-3.5 text-sky-500" />
                    <div className="text-xs font-semibold text-foreground">{f.t}°</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
