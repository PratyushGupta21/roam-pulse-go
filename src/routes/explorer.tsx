import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Clock,
  Compass,
  FileImage,
  Globe,
  HelpCircle,
  ImageIcon,
  Info,
  Loader2,
  MapPin,
  RefreshCw,
  Sparkles,
  Upload,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { Button } from "@/components/ui/button";
import { identifyPlace, type ExplorerIdentificationResult } from "@/lib/explorer.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/explorer")({
  head: () => ({
    meta: [
      { title: "Explorer Mode (SnapToTrip) — RoamPulse" },
      {
        name: "description",
        content:
          "Upload or paste travel screenshots from Instagram, Reels, or TikTok to instantly identify landmarks and plan itineraries.",
      },
    ],
  }),
  component: ExplorerPage,
});

// Preset travel sample screenshots for immediate 1-click testing
const PRESET_SAMPLES = [
  {
    id: "eiffel",
    title: "Paris Skyline",
    location: "Paris, France",
    image:
      "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=600&q=80",
    sampleResult: {
      placeName: "Eiffel Tower",
      city: "Paris",
      country: "France",
      confidence: "HIGH" as const,
      visualReasoning: [
        "Lattice wrought-iron tower structure",
        "Champ de Mars gardens greenery",
        "Classic Parisian Haussmann rooftop architecture",
        "Golden hour lighting on metalwork",
      ],
      suggestedBestTimeToVisit: "Sunset (18:00 - 20:00) for golden light & glittering lights",
      coordinates: { lat: 48.8584, lng: 2.2945 },
    },
  },
  {
    id: "amber",
    title: "Fortress Ramparts",
    location: "Jaipur, India",
    image:
      "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80",
    sampleResult: {
      placeName: "Amber Fort & Palace",
      city: "Jaipur",
      country: "India",
      confidence: "HIGH" as const,
      visualReasoning: [
        "Pale yellow & pink sandstone battlements",
        "Maota Lake reflection in foreground",
        "Traditional Rajasthani chhatris and archways",
        "Serpentine hilltop fortification walls",
      ],
      suggestedBestTimeToVisit: "Early Morning (08:00 - 10:30) to avoid afternoon heat",
      coordinates: { lat: 26.9855, lng: 75.8513 },
    },
  },
  {
    id: "colosseum",
    title: "Ancient Amphitheatre",
    location: "Rome, Italy",
    image:
      "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=600&q=80",
    sampleResult: {
      placeName: "Colosseum (Flavian Amphitheatre)",
      city: "Rome",
      country: "Italy",
      confidence: "HIGH" as const,
      visualReasoning: [
        "Travertine stone vaulted arcade arches",
        "Multi-tiered exterior structural facade",
        "Hypogeum underground chamber ruins",
        "Roman pine trees in backdrop",
      ],
      suggestedBestTimeToVisit: "First entry slot (08:30) or late afternoon",
      coordinates: { lat: 41.8902, lng: 12.4922 },
    },
  },
  {
    id: "fushimi",
    title: "Torii Gates Path",
    location: "Kyoto, Japan",
    image:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=80",
    sampleResult: {
      placeName: "Fushimi Inari Taisha Shrine",
      city: "Kyoto",
      country: "Japan",
      confidence: "HIGH" as const,
      visualReasoning: [
        "Vibrant vermilion orange Senbon Torii gates",
        "Dense mountain forest foliage background",
        "Traditional Japanese stone lanterns",
        "Wood-carved black foundation bases",
      ],
      suggestedBestTimeToVisit: "At sunrise (06:00 - 07:30) before crowds arrive",
      coordinates: { lat: 34.9671, lng: 135.7727 },
    },
  },
];

function ExplorerPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExplorerIdentificationResult | null>(null);

  // Global Clipboard Paste Listener (Ctrl+V / Cmd+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item && item.type.indexOf("image") !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (JPEG, PNG, WEBP).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("Image file size exceeds 10MB limit. Please select a smaller screenshot.");
      return;
    }

    setError(null);
    setLoading(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target?.result as string;
      setImagePreview(base64Data);
      await analyzeImage(base64Data, file.type);
    };
    reader.readAsDataURL(file);
  };

  const analyzeImage = async (base64: string, mimeType: string) => {
    try {
      // Call server function identifyPlace
      const res = await identifyPlace({ data: { image: base64, mimeType } });
      setResult(res);
    } catch (err: unknown) {
      console.error("[Explorer] Image analysis error:", err);
      const msg = err instanceof Error ? err.message : "Failed to identify place from image.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSelect = (preset: (typeof PRESET_SAMPLES)[number]) => {
    setError(null);
    setImagePreview(preset.image);
    setLoading(true);
    setResult(null);

    // Simulate identification scan for preset samples
    setTimeout(() => {
      setResult(preset.sampleResult);
      setLoading(false);
    }, 1200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handlePlanItinerary = () => {
    if (!result) return;
    const dest = encodeURIComponent(result.city || result.placeName);
    const highlight = encodeURIComponent(result.placeName);
    navigate({
      to: "/",
      search: {
        destination: result.city,
        highlight: result.placeName,
      },
    });
  };

  const resetExplorer = () => {
    setImagePreview(null);
    setResult(null);
    setError(null);
    setLoading(false);
  };

  return (
    <MarketingLayout transparentHeader>
      <div className="relative isolate min-h-screen bg-slate-950 text-slate-100 pb-24 pt-20">
        {/* Background Ambient Glow */}
        <div
          className="absolute inset-x-0 top-0 -z-10 h-[500px] overflow-hidden blur-3xl"
          aria-hidden="true"
        >
          <div
            className="mx-auto h-[400px] w-[800px] bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 opacity-40"
            style={{
              clipPath:
                "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
            }}
          />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          {/* Header Section */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-cyan-300 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 animate-pulse text-cyan-400" />
              RoamPulse Vision Engine · SnapToTrip
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Turn Any Travel Screenshot Into An{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
                Itinerary
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-400">
              Found a dream location on Instagram, Reels, or TikTok? Drop or paste (<kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-slate-300 border border-slate-700">Ctrl+V</kbd> / <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-xs font-mono text-slate-300 border border-slate-700">Cmd+V</kbd>) your screenshot here. AI Vision identifies the spot, reasons visually, and builds your custom trip.
            </p>
          </div>

          {/* Main Dropzone / Result Workspace */}
          <div className="mt-10">
            {!imagePreview ? (
              /* Dropzone Input Card */
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300",
                  "bg-slate-900/60 p-10 text-center backdrop-blur-xl",
                  isDragging
                    ? "border-cyan-400 bg-cyan-950/30 shadow-2xl shadow-cyan-500/20 scale-[1.01]"
                    : "border-slate-800 hover:border-cyan-500/60 hover:bg-slate-900/90 shadow-xl",
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processFile(e.target.files[0]);
                    }
                  }}
                />

                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 group-hover:scale-110 transition-transform duration-300">
                  <Upload className="h-10 w-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
                </div>

                <h3 className="mt-6 text-xl font-semibold text-white">
                  Drop screenshot here, or{" "}
                  <span className="text-cyan-400 underline underline-offset-4">browse files</span>
                </h3>
                <p className="mt-2 text-sm text-slate-400">
                  Supports Instagram posts, TikTok clips, Reels, or travel photos (PNG, JPG, WEBP)
                </p>

                <div className="mt-6 inline-flex items-center gap-3 rounded-full border border-slate-800 bg-slate-950/80 px-4 py-2 text-xs font-medium text-slate-300 shadow-inner">
                  <Zap className="h-4 w-4 text-amber-400" />
                  <span>Pro Tip: Press <kbd className="rounded bg-slate-800 px-1 py-0.5 font-mono text-cyan-300">Ctrl+V</kbd> anywhere on this page to paste directly from clipboard</span>
                </div>
              </div>
            ) : (
              /* Image Preview & Active Scan / Result View */
              <div className="grid gap-8 lg:grid-cols-12">
                {/* Image Column */}
                <div className="lg:col-span-5">
                  <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
                    <img
                      src={imagePreview}
                      alt="Travel Screenshot Preview"
                      className="h-full max-h-[480px] w-full object-cover"
                    />

                    {/* Scanning Animation overlay */}
                    {loading && (
                      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center">
                        <div className="scanner-line absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-scan" />
                        <div className="relative flex h-16 w-16 items-center justify-center">
                          <div className="absolute inset-0 rounded-full border-2 border-cyan-500/30 animate-ping" />
                          <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
                        </div>
                        <p className="mt-4 text-sm font-semibold tracking-wider text-cyan-300 uppercase animate-pulse">
                          Scanning Visual Landmarks...
                        </p>
                        <p className="mt-1 text-xs text-slate-400">Analyzing architecture, geography & spatial markers</p>
                      </div>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={resetExplorer}
                      className="absolute top-3 right-3 bg-slate-950/80 hover:bg-slate-900 text-slate-300 border border-slate-700/50 backdrop-blur-md"
                    >
                      <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                      Try Another Image
                    </Button>
                  </div>
                </div>

                {/* Identification Results Column */}
                <div className="lg:col-span-7 flex flex-col justify-between">
                  {loading ? (
                    <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 text-center backdrop-blur-xl">
                      <Sparkles className="h-10 w-10 text-cyan-400 animate-bounce" />
                      <h3 className="mt-4 text-xl font-semibold text-white">Gemini 3.5 Flash at work</h3>
                      <p className="mt-2 text-sm text-slate-400 max-w-sm">
                        Extracting place name, city, country, confidence metrics, and visual reasoning markers...
                      </p>
                    </div>
                  ) : result ? (
                    <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
                      <div>
                        {/* Top Header Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-300">
                            <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                            Spot Identified
                          </span>

                          {/* Confidence Level Badge */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">Confidence:</span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-bold tracking-wide border",
                                result.confidence === "HIGH" &&
                                  "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
                                result.confidence === "MEDIUM" &&
                                  "border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
                                result.confidence === "LOW" &&
                                  "border-rose-500/40 bg-rose-500/15 text-rose-300",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  result.confidence === "HIGH" && "bg-emerald-400 animate-pulse",
                                  result.confidence === "MEDIUM" && "bg-amber-400",
                                  result.confidence === "LOW" && "bg-rose-400",
                                )}
                              />
                              {result.confidence} CONFIDENCE
                            </span>
                          </div>
                        </div>

                        {/* Place Name & Location */}
                        <div className="mt-5">
                          <h2 className="text-2xl font-bold text-white sm:text-3xl">
                            {result.placeName}
                          </h2>
                          <div className="mt-2 flex items-center gap-2 text-slate-300 font-medium">
                            <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                            <span>
                              {result.city}
                              {result.country ? `, ${result.country}` : ""}
                            </span>
                            {result.coordinates && (
                              <span className="ml-2 rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-400 font-mono">
                                {result.coordinates.lat.toFixed(4)}°, {result.coordinates.lng.toFixed(4)}°
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Suggested Best Time to Visit */}
                        {result.suggestedBestTimeToVisit && (
                          <div className="mt-4 flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                            <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-200">Recommended Visit Window: </span>
                              <span>{result.suggestedBestTimeToVisit}</span>
                            </div>
                          </div>
                        )}

                        {/* Visual Reasoning Tags */}
                        <div className="mt-6">
                          <h4 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                            AI Visual Reasoning Tags ({result.visualReasoning.length})
                          </h4>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {result.visualReasoning.map((tag, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 rounded-full border border-slate-700/80 bg-slate-800/80 px-3 py-1 text-xs font-medium text-cyan-200 shadow-xs hover:border-cyan-500/50 transition-colors"
                              >
                                <Sparkles className="h-3 w-3 text-cyan-400" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Primary CTA Button */}
                      <div className="mt-8 border-t border-slate-800/80 pt-6">
                        <Button
                          size="lg"
                          onClick={handlePlanItinerary}
                          className="w-full bg-gradient-to-r from-cyan-500 via-teal-500 to-indigo-600 hover:from-cyan-400 hover:via-teal-400 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-cyan-500/25 transition-all text-base py-6 rounded-xl group"
                        >
                          <span>Plan Itinerary Around This Spot</span>
                          <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                        </Button>
                        <p className="mt-2.5 text-center text-xs text-slate-400">
                          Pre-fills destination wizard with <strong className="text-white">{result.city}</strong> & highlights <strong className="text-white">{result.placeName}</strong>
                        </p>
                      </div>
                    </div>
                  ) : error ? (
                    <div className="flex h-full flex-col justify-center rounded-2xl border border-rose-900/50 bg-rose-950/20 p-8 text-center backdrop-blur-xl">
                      <AlertTriangle className="mx-auto h-12 w-12 text-rose-400" />
                      <h3 className="mt-4 text-xl font-semibold text-white">Identification Error</h3>
                      <p className="mt-2 text-sm text-rose-300">{error}</p>
                      <Button
                        variant="secondary"
                        onClick={resetExplorer}
                        className="mx-auto mt-6 bg-slate-900 text-white hover:bg-slate-800"
                      >
                        Try Another Photo
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          {/* Sample Preset Screenshots for Fast 1-Click Testing */}
          <div className="mt-16 border-t border-slate-800/80 pt-12">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Camera className="h-5 w-5 text-cyan-400" />
                  Try With Sample Travel Screenshots
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Don't have a screenshot handy? Click any sample below to test AI Vision recognition instantly.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {PRESET_SAMPLES.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetSelect(preset)}
                  className="group relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-left transition-all duration-300 hover:border-cyan-500/60 hover:shadow-xl hover:shadow-cyan-500/10 hover:-translate-y-1 focus:outline-none"
                >
                  <div className="aspect-4/3 w-full overflow-hidden">
                    <img
                      src={preset.image}
                      alt={preset.title}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="p-3">
                    <h4 className="font-semibold text-sm text-white group-hover:text-cyan-300 transition-colors">
                      {preset.title}
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                      {preset.location}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
