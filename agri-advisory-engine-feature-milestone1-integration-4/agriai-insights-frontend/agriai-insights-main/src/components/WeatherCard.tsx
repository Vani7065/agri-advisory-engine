import { CloudRain, CloudSun, Droplets, MapPin, Sun, Wind } from "lucide-react";
import { DashboardCard, CardHeader } from "./DashboardCard";
import { weather } from "@/data/mock";

const iconFor = (c: string) =>
  c === "sun" ? Sun : c === "rain" ? CloudRain : CloudSun;

export function WeatherCard() {
  return (
    <DashboardCard>
      <CardHeader
        icon={<CloudSun className="h-5 w-5 text-sky" />}
        title="Weather"
        subtitle={
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3 w-3" /> {weather.location}
          </span>
        }
      />

      <div className="rounded-2xl bg-gradient-to-br from-sky/15 to-leaf/10 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-5xl font-bold tracking-tight">{weather.temperature}°C</div>
            <div className="mt-1 text-sm font-medium text-muted-foreground">
              {weather.condition}
            </div>
          </div>
          <CloudSun className="h-20 w-20 text-sky" />
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            { icon: Droplets, label: "Humidity", value: `${weather.humidity}%` },
            { icon: CloudRain, label: "Rainfall", value: `${weather.rainfall}mm` },
            { icon: Wind, label: "Wind", value: `${weather.wind} km/h` },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-card/70 p-3 backdrop-blur">
              <s.icon className="h-4 w-4 text-leaf" />
              <div className="mt-1 text-sm font-semibold">{s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-5 gap-2">
        {weather.forecast.map((f) => {
          const I = iconFor(f.c);
          return (
            <div key={f.day} className="rounded-xl border border-border p-2.5 text-center">
              <div className="text-[11px] font-medium text-muted-foreground">{f.day}</div>
              <I className="mx-auto my-1 h-4 w-4 text-sky" />
              <div className="text-xs font-semibold">{f.t}°</div>
            </div>
          );
        })}
      </div>
    </DashboardCard>
  );
}
