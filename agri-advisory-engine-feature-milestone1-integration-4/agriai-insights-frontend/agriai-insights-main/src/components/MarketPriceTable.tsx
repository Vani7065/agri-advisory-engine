import { TrendingDown, TrendingUp } from "lucide-react";
import { DashboardCard, CardHeader } from "./DashboardCard";
import { marketPrices } from "@/data/mock";
import { cn } from "@/lib/utils";

export function MarketPriceTable() {
  return (
    <DashboardCard>
      <CardHeader
        icon={<TrendingUp className="h-5 w-5 text-leaf" />}
        title="Market Prices"
        subtitle="Live mandi rates across major markets."
      />

      <div className="-mx-2 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 font-medium">Crop</th>
              <th className="px-3 py-2 font-medium">Market</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Trend</th>
            </tr>
          </thead>
          <tbody>
            {marketPrices.map((r) => {
              const up = r.change >= 0;
              return (
                <tr key={r.crop} className="border-t border-border/60 transition hover:bg-muted/40">
                  <td className="px-3 py-3 font-semibold">{r.crop}</td>
                  <td className="px-3 py-3 text-muted-foreground">{r.market}</td>
                  <td className="px-3 py-3 text-right font-medium">
                    ₹{r.price.toLocaleString()}
                    <span className="ml-1 text-xs text-muted-foreground">/{r.unit}</span>
                  </td>
                  <td className="px-3 py-3">
                    <div
                      className={cn(
                        "ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                        up
                          ? "bg-leaf/15 text-leaf"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {up ? "+" : ""}
                      {r.change}%
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  );
}
