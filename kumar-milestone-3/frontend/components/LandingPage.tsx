import { useState, useEffect } from "react";
import { 
  Sprout, 
  Mic, 
  Bot, 
  CloudSun, 
  TrendingUp, 
  ScanSearch, 
  Landmark, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles,
  ShieldCheck,
  Zap
} from "lucide-react";

interface LandingPageProps {
  onNavigateToLogin: () => void;
  onNavigateToRegister: () => void;
}

function CursorFollower({ isHovered }: { isHovered: boolean }) {
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed top-0 left-0 z-50 rounded-full bg-emerald-600/20 backdrop-blur-xs transition-transform duration-75 ease-out ${
        isHovered ? "h-14 w-14 -ml-7 -mt-7 border-2 border-emerald-600/50 scale-125" : "h-7 w-7 -ml-3.5 -mt-3.5 border border-emerald-600/30"
      }`}
      style={{
        transform: `translate3d(${cursorPos.x}px, ${cursorPos.y}px, 0)`,
      }}
    >
      <div className="h-full w-full rounded-full bg-emerald-500/30 animate-ping opacity-60" />
    </div>
  );
}

export function LandingPage({ onNavigateToLogin, onNavigateToRegister }: LandingPageProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-[#d8ecd8] via-[#eaf4ec] to-[#f4faf5] text-slate-900 antialiased selection:bg-emerald-600 selection:text-white">
      {/* 0. Custom Glowing Cursor Follower */}
      <CursorFollower isHovered={isHovered} />

      {/* 1. Rich Background Blend: Subtle Farm Texture + Glowing Aurora */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden select-none">
        {/* Soft Farm Field Image Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10 mix-blend-multiply"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1000&auto=format&fit=crop')`,
          }}
        />

        {/* Soft Aurora Glow Orbs */}
        <div className="absolute -top-32 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-emerald-400/25 via-teal-300/20 to-lime-300/25 blur-[120px]" />
        <div className="absolute top-1/4 -left-20 h-[400px] w-[400px] rounded-full bg-emerald-300/20 blur-[100px]" />
        <div className="absolute top-1/3 -right-20 h-[450px] w-[450px] rounded-full bg-teal-300/20 blur-[110px]" />

        {/* Topographic Field Contour Pattern */}
        <svg
          className="absolute inset-0 w-full h-full opacity-20 stroke-emerald-800/30"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="topo" width="180" height="180" patternUnits="userSpaceOnUse">
              <path d="M 0 90 Q 45 50 90 90 T 180 90" fill="none" strokeWidth="1" />
              <path d="M 0 45 Q 45 10 90 45 T 180 45" fill="none" strokeWidth="0.8" />
              <path d="M 0 135 Q 45 95 90 135 T 180 135" fill="none" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#topo)" />
        </svg>

        {/* Delicate Modern Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#084c2e0a_1px,transparent_1px),linear-gradient(to_bottom,#084c2e0a_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* 2. Sticky Glass Header */}
      <header className="sticky top-0 z-40 border-b border-emerald-900/10 bg-[#d8ecd8]/80 backdrop-blur-xl transition-all">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#084c2e] via-[#0d6e40] to-[#13884d] text-white shadow-md shadow-emerald-900/20 transition-transform duration-300 hover:scale-105">
              <Sprout className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-[#084c2e]">AgriAI</span>
              <span className="block text-[10px] font-bold tracking-widest text-emerald-800 uppercase">
                Smart Farming
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onNavigateToLogin}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-emerald-200/60 hover:text-[#084c2e] cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onNavigateToRegister}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="rounded-xl bg-gradient-to-r from-[#084c2e] to-[#13884d] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/20 transition duration-200 hover:opacity-95 active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* 3. Clean Hero Section */}
      <section className="relative px-6 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
        <div className="mx-auto max-w-4xl">
          {/* Badge */}
          <div className="mx-auto mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-700/30 bg-emerald-500/15 px-4 py-2 text-xs font-bold text-emerald-950 backdrop-blur-md shadow-xs">
            <Sparkles className="h-4 w-4 text-emerald-700" />
            <span>AI-Powered Agricultural Advisory Platform</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl lg:text-7xl text-slate-900 leading-[1.15]">
            Empowering Farmers with <br />
            <span className="bg-gradient-to-r from-[#084c2e] via-[#13884d] to-emerald-600 bg-clip-text text-transparent drop-shadow-xs">
              Smart Crop Intelligence
            </span>
          </h1>

          {/* Description */}
          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-700 font-medium leading-relaxed">
            Get instant crop disease diagnosis, real-time local mandi rates, hyper-local weather alerts, and government schemes — localized in your native tongue.
          </p>

          {/* Action Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={onNavigateToRegister}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#084c2e] to-[#13884d] px-8 py-4 text-base font-bold text-white shadow-xl shadow-emerald-900/25 transition duration-200 hover:scale-[1.02] sm:w-auto active:scale-95 cursor-pointer"
            >
              <span>Start Free Trial</span>
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              onClick={onNavigateToLogin}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-900/20 bg-white/80 backdrop-blur-md px-8 py-4 text-base font-bold text-slate-800 shadow-sm transition duration-200 hover:bg-white hover:border-emerald-900/40 sm:w-auto cursor-pointer"
            >
              <span>Sign In to Account</span>
            </button>
          </div>

          {/* Highlights Pills */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm font-bold text-slate-800">
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-900/15 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Multilingual Voice Assistant</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-900/15 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>AI Leaf Scanner</span>
            </div>
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-emerald-900/15 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-700" />
              <span>Live Mandi Price Sync</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Feature Cards Section */}
      <section className="relative py-20 bg-emerald-950/5 backdrop-blur-xl border-t border-emerald-900/10">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-16 text-center">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
              Everything your farm needs in one dashboard
            </h2>
            <p className="mt-3 text-base text-slate-700 font-medium">
              Built specifically for modern farmers and agricultural advisors.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group rounded-3xl border border-emerald-900/15 bg-white/80 backdrop-blur-md p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-600/40 hover:bg-white"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-[#084c2e] mb-5 transition duration-300 group-hover:scale-110 group-hover:bg-[#13884d] group-hover:text-white">
                <Mic className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Voice Assistant</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                Speak naturally in Malayalam or English. Ask questions about fertilizers, crop health, or irrigation easily.
              </p>
            </div>

            {/* Feature 2 */}
            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group rounded-3xl border border-emerald-900/15 bg-white/80 backdrop-blur-md p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-600/40 hover:bg-white"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-[#084c2e] mb-5 transition duration-300 group-hover:scale-110 group-hover:bg-[#13884d] group-hover:text-white">
                <ScanSearch className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Crop Disease Scanner</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                Snap a photo of infected leaves or stems. Get instant treatment and pesticide recommendations.
              </p>
            </div>

            {/* Feature 3 */}
            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group rounded-3xl border border-emerald-900/15 bg-white/80 backdrop-blur-md p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-600/40 hover:bg-white"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-[#084c2e] mb-5 transition duration-300 group-hover:scale-110 group-hover:bg-[#13884d] group-hover:text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Live Mandi Prices</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                Stay updated with daily crop prices across local mandis to sell your harvest at the best rates.
              </p>
            </div>

            {/* Feature 4 */}
            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group rounded-3xl border border-emerald-900/15 bg-white/80 backdrop-blur-md p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-600/40 hover:bg-white"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-[#084c2e] mb-5 transition duration-300 group-hover:scale-110 group-hover:bg-[#13884d] group-hover:text-white">
                <CloudSun className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Weather Forecasts</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                Receive accurate location-based rainfall alerts and daily temperature metrics to plan sowing.
              </p>
            </div>

            {/* Feature 5 */}
            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group rounded-3xl border border-emerald-900/15 bg-white/80 backdrop-blur-md p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-600/40 hover:bg-white"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-[#084c2e] mb-5 transition duration-300 group-hover:scale-110 group-hover:bg-[#13884d] group-hover:text-white">
                <Landmark className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Government Schemes</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                Discover subsidies, agricultural loans, and insurance schemes applicable directly to your region.
              </p>
            </div>

            {/* Feature 6 */}
            <div 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className="group rounded-3xl border border-emerald-900/15 bg-white/80 backdrop-blur-md p-7 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:border-emerald-600/40 hover:bg-white"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/15 text-[#084c2e] mb-5 transition duration-300 group-hover:scale-110 group-hover:bg-[#13884d] group-hover:text-white">
                <Bot className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Smart Advisory AI</h3>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                Powered by Groq & Sarvam translation models to give hyper-targeted agronomy insights 24/7.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Interactive Dashboard Sneak-Peek Card */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-5xl rounded-3xl border border-emerald-900/20 bg-white/85 backdrop-blur-2xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/15">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-500" />
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <div className="h-3 w-3 rounded-full bg-emerald-500" />
            </div>
            <span className="text-xs font-mono font-bold text-slate-500">agriai-dashboard.view</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <Zap className="h-6 w-6 text-emerald-800 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">AI Crop Diagnosis</h4>
              <p className="text-xs text-slate-700 mt-1">Upload leaf photos to catch disease early with 98% precision.</p>
            </div>
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck className="h-6 w-6 text-amber-800 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">Government Schemes</h4>
              <p className="text-xs text-slate-700 mt-1">Instantly match with eligible agricultural subsidies & loans.</p>
            </div>
            <div className="p-5 rounded-2xl bg-teal-500/10 border border-teal-500/20">
              <Sparkles className="h-6 w-6 text-teal-800 mb-2" />
              <h4 className="font-bold text-sm text-slate-900">Market Intelligence</h4>
              <p className="text-xs text-slate-700 mt-1">Real-time Mandi price tracking for maximum farm profit.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. CTA Banner */}
      <section className="px-6 py-16">
        <div className="relative overflow-hidden mx-auto max-w-5xl rounded-3xl bg-gradient-to-r from-[#084c2e] via-[#0d6e40] to-[#13884d] p-8 sm:p-14 text-center text-white shadow-2xl shadow-emerald-950/20">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl animate-pulse" />
          <h2 className="text-3xl font-extrabold sm:text-5xl">Ready to transform your farm?</h2>
          <p className="mx-auto mt-4 max-w-xl text-emerald-100 text-sm sm:text-base font-medium">
            Join thousands of farmers using AI to boost yield and protect crops.
          </p>
          <button
            onClick={onNavigateToRegister}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-[#084c2e] shadow-xl transition duration-200 hover:bg-emerald-50 hover:scale-105 active:scale-95 cursor-pointer"
          >
            <span>Create Your Account Now</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </section>

      {/* 7. Footer */}
      <footer className="border-t border-emerald-900/10 bg-white/80 backdrop-blur-md py-8 text-center text-xs font-semibold text-slate-600">
        <p>© 2026 AgriAI — Smart Farming Assistant. All rights reserved.</p>
      </footer>
    </div>
  );
}