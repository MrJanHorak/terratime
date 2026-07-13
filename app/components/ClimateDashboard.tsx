"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  TrendingUp,
  Image as ImageIcon,
  Upload,
  Calendar,
  CloudRain,
  Wind,
  Thermometer,
  MapPin,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Info
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";
import { LocationInfo, Contribution, HistoricalTrend, TrendAnalysisResult } from "../types";

interface ClimateDashboardProps {
  location: LocationInfo;
  contributions: Contribution[];
  onAddContribution: (newContrib: Contribution) => void;
  onClose: () => void;
}

export default function ClimateDashboard({
  location,
  contributions,
  onAddContribution,
  onClose
}: ClimateDashboardProps) {
  const [activeTab, setActiveTab] = useState<"trends" | "photos" | "upload">("trends");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [trendData, setTrendData] = useState<TrendAnalysisResult | null>(null);

  // Timeframe selector for trends
  const [timeframe, setTimeframe] = useState({ start: 1980, end: 2025 });

  // Photo uploads
  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    category: "Glacier Melt",
    author: "",
    imageFile: null as File | null,
    imagePreview: ""
  });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Before/After comparison state
  const [comparisonIndex, setComparisonIndex] = useState(0);
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderContainerRef = useRef<HTMLDivElement>(null);

  // Filter contributions by location proximity (within ~1.0 degree)
  const localContributions = contributions.filter(
    (c) =>
      Math.abs(c.lat - location.latitude) < 1.0 &&
      Math.abs(c.lng - location.longitude) < 1.0
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch and calculate climate trends
  useEffect(() => {
    const fetchTrends = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://archive-api.open-meteo.com/v1/archive?latitude=${location.latitude}&longitude=${location.longitude}&start_date=${timeframe.start}-01-01&end_date=${timeframe.end}-12-31&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&timezone=auto`
        );
        const data = await response.json();

        if (data.daily) {
          const daily = data.daily;
          const grouped: Record<number, { temps: number[]; precips: number[]; winds: number[] }> = {};

          // Group daily data by year
          for (let i = 0; i < daily.time.length; i++) {
            const dateStr = daily.time[i];
            const year = new Date(dateStr).getFullYear();
            if (!grouped[year]) {
              grouped[year] = { temps: [], precips: [], winds: [] };
            }

            const tempMax = daily.temperature_2m_max[i];
            const tempMin = daily.temperature_2m_min[i];
            if (tempMax !== undefined && tempMin !== undefined) {
              grouped[year].temps.push((tempMax + tempMin) / 2);
            }
            if (daily.precipitation_sum[i] !== undefined) {
              grouped[year].precips.push(daily.precipitation_sum[i]);
            }
            if (daily.wind_speed_10m_max[i] !== undefined) {
              grouped[year].winds.push(daily.wind_speed_10m_max[i]);
            }
          }

          // Compute yearly metrics
          const trends: HistoricalTrend[] = Object.keys(grouped).map((yrStr) => {
            const yr = parseInt(yrStr);
            const vals = grouped[yr];
            
            const avgTemp = vals.temps.length > 0 
              ? vals.temps.reduce((a, b) => a + b, 0) / vals.temps.length 
              : 0;
            const totalPrecip = vals.precips.length > 0 
              ? vals.precips.reduce((a, b) => a + b, 0) 
              : 0;
            const maxWind = vals.winds.length > 0 
              ? Math.max(...vals.winds) 
              : 0;

            return {
              year: yr,
              avgTemp: parseFloat(avgTemp.toFixed(2)),
              totalPrecip: parseFloat(totalPrecip.toFixed(1)),
              maxWind: parseFloat(maxWind.toFixed(1))
            };
          }).sort((a, b) => a.year - b.year);

          // Linear regression for temperature (warming slope)
          // y = mx + c
          const n = trends.length;
          let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
          let sumPrecipY = 0, sumPrecipXY = 0;

          trends.forEach((t) => {
            const x = t.year;
            sumX += x;
            sumY += t.avgTemp;
            sumPrecipY += t.totalPrecip;
            sumXY += x * t.avgTemp;
            sumPrecipXY += x * t.totalPrecip;
            sumXX += x * x;
          });

          const tempSlope = n > 1 
            ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) 
            : 0;
          const precipSlope = n > 1 
            ? (n * sumPrecipXY - sumX * sumPrecipY) / (n * sumXX - sumX * sumX) 
            : 0;

          setTrendData({
            trends,
            tempSlope: parseFloat(tempSlope.toFixed(4)),
            precipSlope: parseFloat(precipSlope.toFixed(4)),
            startYear: timeframe.start,
            endYear: timeframe.end
          });
        }
      } catch (error) {
        console.error("Error calculating trends:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTrends();
  }, [location, timeframe]);

  // Handle Before/After split image dragging
  const handleSplitMove = (clientX: number) => {
    if (!sliderContainerRef.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      handleSplitMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      handleSplitMove(e.clientX);
    }
  };

  // Image upload helpers
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadForm((prev) => ({
          ...prev,
          imageFile: file,
          imagePreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadForm.title || !uploadForm.imagePreview) return;

    setUploading(true);
    try {
      const response = await fetch("/api/contributions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadForm.title,
          description: uploadForm.description,
          date: uploadForm.date,
          lat: location.latitude,
          lng: location.longitude,
          imageBase64: uploadForm.imagePreview,
          imageName: uploadForm.imageFile?.name || "upload.jpg",
          category: uploadForm.category,
          author: uploadForm.author || "Anonymous"
        })
      });

      const result = await response.json();
      if (result.success) {
        onAddContribution(result.contribution);
        setUploadForm({
          title: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
          category: "Glacier Melt",
          author: "",
          imageFile: null,
          imagePreview: ""
        });
        setActiveTab("photos");
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const currentWarming = trendData 
    ? (trendData.tempSlope * (trendData.endYear - trendData.startYear)).toFixed(1) 
    : "0.0";

  return (
    <div className="w-full h-full flex flex-col glass-panel border-r border-panel-border overflow-hidden select-none">
      {/* Header */}
      <div className="p-4 border-b border-panel-border flex justify-between items-start">
        <div className="flex flex-col text-left">
          <h2 className="text-lg font-bold text-white flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-blue-500 shrink-0" />
            {location.name}
          </h2>
          <span className="text-[10px] text-gray-500 font-mono mt-0.5">
            COORD: {location.latitude.toFixed(4)}°N, {location.longitude.toFixed(4)}°E
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 active:bg-white/20 rounded-lg text-gray-400 hover:text-white transition-colors text-xs"
        >
          Close
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-panel-border bg-black/20 text-xs shrink-0">
        <button
          onClick={() => setActiveTab("trends")}
          className={`flex-1 py-3 text-center border-b-2 font-medium transition-all ${
            activeTab === "trends"
              ? "border-blue-500 text-blue-400 bg-white/5"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/2"
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5 inline mr-1.5" />
          Climate Trends
        </button>
        <button
          onClick={() => setActiveTab("photos")}
          className={`flex-1 py-3 text-center border-b-2 font-medium transition-all relative ${
            activeTab === "photos"
              ? "border-blue-500 text-blue-400 bg-white/5"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/2"
          }`}
        >
          <ImageIcon className="w-3.5 h-3.5 inline mr-1.5" />
          Photos ({localContributions.length})
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex-1 py-3 text-center border-b-2 font-medium transition-all ${
            activeTab === "upload"
              ? "border-blue-500 text-blue-400 bg-white/5"
              : "border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/2"
          }`}
        >
          <Upload className="w-3.5 h-3.5 inline mr-1.5" />
          Share Photo
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-left">
        
        {/* TAB 1: CLIMATE TRENDS */}
        {activeTab === "trends" && (
          <div className="flex flex-col gap-4">
            
            {/* Timeframe settings */}
            <div className="flex items-center justify-between text-xs glass-card p-2.5">
              <span className="text-gray-400">Analysis Range:</span>
              <div className="flex items-center gap-1">
                <select
                  value={timeframe.start}
                  onChange={(e) => setTimeframe(prev => ({ ...prev, start: parseInt(e.target.value) }))}
                  className="bg-transparent text-white border border-panel-border rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  {[1950, 1960, 1970, 1980, 1990, 2000].map(y => (
                    <option key={y} value={y} className="bg-background">{y}</option>
                  ))}
                </select>
                <ArrowRight className="w-3 h-3 text-gray-500 mx-1" />
                <select
                  value={timeframe.end}
                  onChange={(e) => setTimeframe(prev => ({ ...prev, end: parseInt(e.target.value) }))}
                  className="bg-transparent text-white border border-panel-border rounded px-1.5 py-0.5 outline-none cursor-pointer"
                >
                  {[2010, 2015, 2020, 2025, 2026].map(y => (
                    <option key={y} value={y} className="bg-background">{y}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-xs">Fetching and analyzing historical ERA5 records...</p>
              </div>
            ) : trendData ? (
              <div className="flex flex-col gap-5">
                
                {/* Stats Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass-card p-3 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-red-400" />
                      Temperature Shift
                    </span>
                    <span className="text-xl font-bold text-red-400">
                      {parseFloat(currentWarming) > 0 ? `+${currentWarming}` : currentWarming}°C
                    </span>
                    <span className="text-[9px] text-gray-500 leading-tight">
                      Warming slope: {(trendData.tempSlope * 10).toFixed(2)}°C per decade
                    </span>
                  </div>

                  <div className="glass-card p-3 flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-gray-400 flex items-center gap-1">
                      <CloudRain className="w-3.5 h-3.5 text-blue-400" />
                      Precipitation Slope
                    </span>
                    <span className="text-xl font-bold text-blue-400">
                      {(trendData.precipSlope * (trendData.endYear - trendData.startYear)).toFixed(0)} mm
                    </span>
                    <span className="text-[9px] text-gray-500 leading-tight">
                      Trend: {trendData.precipSlope > 0 ? "Wetter" : "Drier"} ({(trendData.precipSlope * 10).toFixed(1)}mm/decade)
                    </span>
                  </div>
                </div>

                {/* TEMPERATURE CHART */}
                <div className="glass-card p-3">
                  <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center justify-between">
                    <span>Average Annual Temperature</span>
                    <span className="text-[10px] text-gray-500 font-mono">ERA5 reanalysis</span>
                  </h3>
                  <div className="h-44 w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData.trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="year" stroke="#4b5563" fontSize={10} tickLine={false} />
                          <YAxis stroke="#4b5563" fontSize={10} domain={["auto", "auto"]} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,20,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                            labelClassName="text-[10px] text-gray-400"
                            itemStyle={{ fontSize: "12px", color: "#f87171" }}
                          />
                          <Line
                            type="monotone"
                            dataKey="avgTemp"
                            name="Temp"
                            stroke="#f87171"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* PRECIPITATION CHART */}
                <div className="glass-card p-3">
                  <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center justify-between">
                    <span>Annual Precipitation Sum</span>
                    <span className="text-[10px] text-gray-500 font-mono">millimeters (mm)</span>
                  </h3>
                  <div className="h-44 w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={trendData.trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="year" stroke="#4b5563" fontSize={10} tickLine={false} />
                          <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,20,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                            labelClassName="text-[10px] text-gray-400"
                            itemStyle={{ fontSize: "12px", color: "#60a5fa" }}
                          />
                          <Bar dataKey="totalPrecip" name="Rain/Snow" fill="#3b82f6" opacity={0.6} radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* WIND SPEED CHART */}
                <div className="glass-card p-3">
                  <h3 className="text-xs font-semibold text-gray-300 mb-2 flex items-center justify-between">
                    <span>Peak Annual Wind Velocity</span>
                    <span className="text-[10px] text-gray-500 font-mono">km/h</span>
                  </h3>
                  <div className="h-44 w-full">
                    {mounted && (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData.trends} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="year" stroke="#4b5563" fontSize={10} tickLine={false} />
                          <YAxis stroke="#4b5563" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "rgba(10,10,20,0.85)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }}
                            labelClassName="text-[10px] text-gray-400"
                            itemStyle={{ fontSize: "12px", color: "#34d399" }}
                          />
                          <Line type="monotone" dataKey="maxWind" name="Peak Wind" stroke="#34d399" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                <div className="glass-card p-3 flex gap-2.5 items-start bg-blue-950/20 text-xs border-blue-900/40">
                  <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <p className="text-gray-400 leading-normal">
                    This linear regression models localized climate variables from Copernicus ERA5 datasets. Slopes measure structural deviations since baseline years.
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-gray-500 text-xs">Failed to calculate trends.</div>
            )}
          </div>
        )}

        {/* TAB 2: LOCAL PHOTOS */}
        {activeTab === "photos" && (
          <div className="flex flex-col gap-4">
            {localContributions.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs flex flex-col items-center gap-2.5">
                <ImageIcon className="w-10 h-10 text-gray-600" />
                <p>No climate observation photos uploaded for this region yet.</p>
                <button
                  onClick={() => setActiveTab("upload")}
                  className="mt-2 text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors active:scale-95"
                >
                  Be the first to share
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                
                {/* BEFORE / AFTER COMPARISON SLIDER */}
                {localContributions.length >= 2 && (
                  <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-semibold text-gray-300">Before & After Climate Visualizer</h3>
                    
                    {/* Visualizer selector */}
                    <div className="flex justify-between items-center text-[10px] text-gray-400 bg-black/30 p-1.5 rounded-lg border border-panel-border">
                      <button
                        disabled={comparisonIndex === 0}
                        onClick={() => setComparisonIndex((prev) => prev - 1)}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-medium text-gray-300">
                        Pair {comparisonIndex + 1} of {Math.floor(localContributions.length / 2)}
                      </span>
                      <button
                        disabled={(comparisonIndex + 1) * 2 >= localContributions.length}
                        onClick={() => setComparisonIndex((prev) => prev + 1)}
                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Split Comparison Canvas */}
                    <div
                      ref={sliderContainerRef}
                      onMouseMove={handleMouseMove}
                      onTouchMove={handleTouchMove}
                      className="split-image-container aspect-video w-full relative cursor-ew-resize select-none border border-panel-border"
                    >
                      {/* AFTER Image (Background) */}
                      <img
                        src={localContributions[comparisonIndex * 2 + 1]?.imageUrl}
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                        alt="After state"
                      />
                      <div className="absolute bottom-2 right-2 bg-red-950/80 border border-red-500/20 px-1.5 py-0.5 rounded text-[8px] text-red-300 font-bold uppercase tracking-wider z-20">
                        {localContributions[comparisonIndex * 2 + 1]?.date.split("-")[0]} (After)
                      </div>

                      {/* BEFORE Image (Foreground clipped) */}
                      <div
                        className="absolute inset-0 overflow-hidden pointer-events-none"
                        style={{ width: `${sliderPosition}%` }}
                      >
                        <img
                          src={localContributions[comparisonIndex * 2]?.imageUrl}
                          className="absolute inset-0 w-full h-full object-cover max-w-none"
                          style={{ width: sliderContainerRef.current?.getBoundingClientRect().width }}
                          alt="Before state"
                        />
                        <div className="absolute bottom-2 left-2 bg-blue-950/80 border border-blue-500/20 px-1.5 py-0.5 rounded text-[8px] text-blue-300 font-bold uppercase tracking-wider z-20">
                          {localContributions[comparisonIndex * 2]?.date.split("-")[0]} (Before)
                        </div>
                      </div>

                      {/* Sliding Bar Divider */}
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white cursor-ew-resize shadow-[0_0_10px_rgba(255,255,255,0.8)] z-10"
                        style={{ left: `${sliderPosition}%` }}
                      >
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-black flex items-center justify-center text-xs font-bold shadow-lg border border-gray-300">
                          ↔
                        </div>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500 text-center leading-normal mt-0.5">
                      Drag the slider to compare environmental shift between <b>{localContributions[comparisonIndex * 2]?.date}</b> and <b>{localContributions[comparisonIndex * 2 + 1]?.date}</b>.
                    </p>
                  </div>
                )}

                {/* Chronological Grid */}
                <h3 className="text-xs font-semibold text-gray-300 mt-2">Regional Upload History</h3>
                <div className="flex flex-col gap-3">
                  {localContributions.map((contrib) => (
                    <div key={contrib.id} className="glass-card overflow-hidden flex flex-col md:flex-row gap-3 border border-panel-border p-2">
                      <img
                        src={contrib.imageUrl}
                        className="w-full md:w-28 h-20 object-cover rounded-lg border border-white/5 shrink-0"
                        alt={contrib.title}
                      />
                      <div className="flex flex-col gap-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs text-white truncate">{contrib.title}</h4>
                          <span className="text-[9px] bg-white/5 border border-white/10 px-1 py-0.5 rounded text-gray-400 whitespace-nowrap shrink-0">
                            {contrib.date}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-400 line-clamp-2 leading-relaxed">{contrib.description}</p>
                        <div className="flex justify-between items-center text-[9px] text-gray-500 mt-auto pt-1 border-t border-white/5">
                          <span>By: {contrib.author}</span>
                          <span className="text-blue-400 font-medium">{contrib.category}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SHARE OBSERVATION */}
        {activeTab === "upload" && (
          <form onSubmit={handleUploadSubmit} className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold text-gray-300">Contribute Climate Evidence</h3>
            <p className="text-[10px] text-gray-500 leading-normal -mt-1">
              Upload photos showing glacier melts, droughts, deforestation, flooding, or successful ecological reclamation. Tied to this location: ({location.latitude.toFixed(3)}°, {location.longitude.toFixed(3)}°).
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider">Photo Title *</label>
              <input
                type="text"
                required
                placeholder="e.g. Rhone Glacier Recession"
                value={uploadForm.title}
                onChange={(e) => setUploadForm(p => ({ ...p, title: e.target.value }))}
                className="bg-black/30 border border-panel-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Observation Date *</label>
                <input
                  type="date"
                  required
                  value={uploadForm.date}
                  onChange={(e) => setUploadForm(p => ({ ...p, date: e.target.value }))}
                  className="bg-black/30 border border-panel-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wider">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(p => ({ ...p, category: e.target.value }))}
                  className="bg-black/30 border border-panel-border rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="Glacier Melt" className="bg-background">Glacier Melt</option>
                  <option value="Drought" className="bg-background">Drought</option>
                  <option value="Deforestation" className="bg-background">Deforestation</option>
                  <option value="Flooding" className="bg-background">Flooding</option>
                  <option value="Reclamation" className="bg-background">Ecology Action</option>
                  <option value="Other" className="bg-background">Other</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider">Author Name / Credit</label>
              <input
                type="text"
                placeholder="e.g. Jean Dupont / NASA Archive"
                value={uploadForm.author}
                onChange={(e) => setUploadForm(p => ({ ...p, author: e.target.value }))}
                className="bg-black/30 border border-panel-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider">Description</label>
              <textarea
                placeholder="Add scientific context or details showing environmental changes..."
                rows={3}
                value={uploadForm.description}
                onChange={(e) => setUploadForm(p => ({ ...p, description: e.target.value }))}
                className="bg-black/30 border border-panel-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {/* Photo Picker */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wider">Upload Image *</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                ref={fileInputRef}
                className="hidden"
              />
              
              {uploadForm.imagePreview ? (
                <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-panel-border group">
                  <img src={uploadForm.imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  <button
                    type="button"
                    onClick={() => setUploadForm(p => ({ ...p, imageFile: null, imagePreview: "" }))}
                    className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold text-white"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-2 aspect-video w-full rounded-lg border-2 border-dashed border-panel-border bg-black/10 hover:bg-white/5 hover:border-blue-500/50 transition-all text-xs text-gray-500 cursor-pointer"
                >
                  <Plus className="w-6 h-6 text-gray-600" />
                  <span>Select climate evidence photograph</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={uploading || !uploadForm.title || !uploadForm.imagePreview}
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-[0.98] select-none"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Observation...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Submit Observation</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
