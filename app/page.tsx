"use client";

import React, { useState, useEffect } from "react";
import { 
  Globe, 
  MapPin, 
  Settings, 
  Sparkles, 
  UploadCloud, 
  Thermometer, 
  CloudRain, 
  Wind, 
  Layers,
  Check
} from "lucide-react";
import GlobeMap from "./components/GlobeMap";
import Timeline from "./components/Timeline";
import LocationSearch from "./components/LocationSearch";
import ClimateDashboard from "./components/ClimateDashboard";
import { LocationInfo, Contribution, ActiveLayers } from "./types";

const YEARS = [1900, 1910, 1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020, 2026];

export default function Home() {
  const [mapboxToken, setMapboxToken] = useState("");
  const [tokenInput, setTokenInput] = useState("");
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  
  // Application States
  const [currentYear, setCurrentYear] = useState(2026);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Default layers: temperature and wind particle paths enabled for stunning visual dynamics!
  const [activeLayers, setActiveLayers] = useState<ActiveLayers>({
    temperature: true,
    precipitation: false,
    wind: true
  });
  
  // Default Map style to Satellite as requested!
  const [mapStyle, setMapStyle] = useState<"satellite" | "dark">("satellite");
  const [showLayerMenu, setShowLayerMenu] = useState(false);

  // Default to Rhone Glacier, Switzerland
  const [selectedLocation, setSelectedLocation] = useState<LocationInfo | null>({
    name: "Rhone Glacier, Switzerland",
    latitude: 46.598,
    longitude: 8.384,
    country: "Switzerland"
  });

  // Photo Upload Coordinates Picker states
  const [isUploadMode, setIsUploadMode] = useState(false);
  const [uploadCoords, setUploadCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Initialize Mapbox Token
  useEffect(() => {
    const envToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
    if (envToken) {
      setMapboxToken(envToken);
      return;
    }

    const storedToken = localStorage.getItem("terratime_mapbox_token");
    if (storedToken) {
      setMapboxToken(storedToken);
    } else {
      setShowTokenModal(true);
    }
  }, []);

  // Fetch observations on load
  useEffect(() => {
    fetch("/api/contributions")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setContributions(data);
        }
      })
      .catch((err) => console.error("Error loading contributions:", err));
  }, []);

  const handleSaveToken = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;
    localStorage.setItem("terratime_mapbox_token", tokenInput.trim());
    setMapboxToken(tokenInput.trim());
    setShowTokenModal(false);
  };

  const handleSelectLocation = (loc: LocationInfo) => {
    setSelectedLocation(loc);
    setIsUploadMode(false);
  };

  const handleSelectLocationByClick = (lat: number, lng: number, name: string) => {
    setSelectedLocation({
      name,
      latitude: lat,
      longitude: lng
    });
  };

  const handleAddContribution = (newContrib: Contribution) => {
    setContributions((prev) => [...prev, newContrib]);
    setUploadCoords(null);
    setIsUploadMode(false);
  };

  const handleSelectContribution = (contrib: Contribution) => {
    setSelectedLocation({
      name: contrib.title,
      latitude: contrib.lat,
      longitude: contrib.lng
    });
  };

  const toggleLayer = (layer: keyof ActiveLayers) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-[#080810] font-sans">
      {/* 1. MAPBOX MAP CANVAS (Full Background) */}
      <div className="absolute inset-0 z-0">
        {mapboxToken ? (
          <GlobeMap
            mapboxToken={mapboxToken}
            currentYear={currentYear}
            selectedLocation={selectedLocation}
            onSelectLocationByClick={handleSelectLocationByClick}
            contributions={contributions}
            onSelectContribution={handleSelectContribution}
            isUploadMode={isUploadMode}
            onSetUploadCoords={(lat, lng) => setUploadCoords({ lat, lng })}
            uploadCoords={uploadCoords}
            activeLayers={activeLayers}
            mapStyle={mapStyle}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 gap-4">
            <Globe className="w-12 h-12 animate-pulse text-blue-500" />
            <p className="text-sm">Please configure your Mapbox Access Token to initialize the 3D globe.</p>
            <button
              onClick={() => setShowTokenModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg transition-all"
            >
              Configure Token
            </button>
          </div>
        )}
      </div>

      {/* 2. HEADER BAR (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 select-none pointer-events-none">
        <div className="glass-panel px-4 py-3 flex items-center gap-3 border border-panel-border pointer-events-auto">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]">
            <Globe className="w-5 h-5" />
          </div>
          <div className="flex flex-col text-left">
            <span className="font-black tracking-wider text-sm text-white text-left">TERRATIME</span>
            <span className="text-[9px] uppercase tracking-widest text-blue-400 font-semibold -mt-0.5 text-left">Climate Visualizer</span>
          </div>
        </div>
      </div>

      {/* 3. PIN PLACEMENT BAR (When adding a contribution) */}
      {isUploadMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 glass-panel border border-red-500/20 px-5 py-3.5 flex items-center gap-4 animate-in slide-in-from-top duration-300">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold text-white">Coordinate Selector Mode</span>
            <span className="text-[10px] text-gray-400 mt-0.5">
              {uploadCoords 
                ? `Pin dropped: ${uploadCoords.lat.toFixed(4)}°, ${uploadCoords.lng.toFixed(4)}°`
                : "Click anywhere on the globe to position your photo observation pin."
              }
            </span>
          </div>
          <div className="flex items-center gap-2">
            {uploadCoords && (
              <button
                onClick={() => {
                  if (selectedLocation) {
                    setSelectedLocation({
                      ...selectedLocation,
                      latitude: uploadCoords.lat,
                      longitude: uploadCoords.lng,
                      name: "Custom Coordinate Point"
                    });
                  }
                  setIsUploadMode(false);
                }}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-bold transition-all"
              >
                Confirm Location
              </button>
            )}
            <button
              onClick={() => {
                setIsUploadMode(false);
                setUploadCoords(null);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white rounded-lg text-[10px] font-bold transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 4. FLOATING LAYERS & OVERLAY MENU (Top Right) */}
      <div className="absolute top-16 right-4 z-20 flex flex-col items-end gap-2 text-left">
        <button
          onClick={() => setShowLayerMenu(!showLayerMenu)}
          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold glass-panel text-white hover:bg-white/15 transition-all shadow-md active:scale-95 border border-panel-border"
        >
          <Layers className="w-4 h-4 text-blue-400" />
          <span>Climate Layers</span>
        </button>

        {showLayerMenu && (
          <div className="glass-panel p-4 w-56 border border-panel-border shadow-2xl flex flex-col gap-3.5 animate-in fade-in slide-in-from-top-3 duration-200">
            {/* Style Selector */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Map Styling</span>
              <div className="grid grid-cols-2 gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                <button
                  onClick={() => setMapStyle("satellite")}
                  className={`py-1 text-[10px] font-medium rounded transition-all ${
                    mapStyle === "satellite"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Satellite
                </button>
                <button
                  onClick={() => setMapStyle("dark")}
                  className={`py-1 text-[10px] font-medium rounded transition-all ${
                    mapStyle === "dark"
                      ? "bg-blue-600 text-white font-bold"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  Dark Grid
                </button>
              </div>
            </div>

            {/* Overlays Selector */}
            <div className="flex flex-col gap-1.5 border-t border-panel-border pt-2.5">
              <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">Active Overlays</span>
              
              <div className="flex flex-col gap-1">
                {/* Temp */}
                <button
                  onClick={() => toggleLayer("temperature")}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                    activeLayers.temperature
                      ? "bg-red-500/10 text-red-400 border border-red-500/20"
                      : "bg-transparent text-gray-400 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Thermometer className={`w-4 h-4 ${activeLayers.temperature ? "text-red-400 animate-pulse" : "text-gray-500"}`} />
                    <span>Temperature</span>
                  </div>
                  {activeLayers.temperature && <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Precip */}
                <button
                  onClick={() => toggleLayer("precipitation")}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                    activeLayers.precipitation
                      ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      : "bg-transparent text-gray-400 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CloudRain className={`w-4 h-4 ${activeLayers.precipitation ? "text-blue-400 animate-bounce" : "text-gray-500"}`} />
                    <span>Precipitation</span>
                  </div>
                  {activeLayers.precipitation && <Check className="w-3.5 h-3.5" />}
                </button>

                {/* Wind */}
                <button
                  onClick={() => toggleLayer("wind")}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all ${
                    activeLayers.wind
                      ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                      : "bg-transparent text-gray-400 hover:bg-white/5 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Wind className={`w-4 h-4 ${activeLayers.wind ? "text-teal-400" : "text-gray-500"}`} />
                    <span>Wind Vectors</span>
                  </div>
                  {activeLayers.wind && <Check className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. SIDEBAR CONTAINER (Dashboard panel & Search) */}
      <div className="absolute top-4 bottom-28 left-4 w-[360px] md:w-[420px] flex flex-col gap-3 pointer-events-none z-10">
        <div className="h-14 shrink-0" />

        {/* Location Search Input */}
        <div className="pointer-events-auto shrink-0">
          <LocationSearch onSelectLocation={handleSelectLocation} />
        </div>

        {/* Selected Location / Stats Dashboard */}
        <div className="flex-1 pointer-events-auto overflow-hidden">
          {selectedLocation ? (
            <ClimateDashboard
              location={selectedLocation}
              contributions={contributions}
              onAddContribution={handleAddContribution}
              onClose={() => setSelectedLocation(null)}
            />
          ) : (
            <div className="w-full h-full glass-panel flex flex-col items-center justify-center p-6 text-center text-gray-400 gap-4 border border-panel-border select-none">
              <Sparkles className="w-8 h-8 text-blue-400 opacity-60 animate-pulse" />
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-white">No Location Inspected</h3>
                <p className="text-xs text-gray-500 max-w-[240px] leading-relaxed">
                  Search a location above or click anywhere on the globe to inspect temperature anomalies, rainfall metrics, wind speed, and community environmental observations.
                </p>
              </div>
              
              <div className="w-full border-t border-white/5 pt-4 flex flex-col gap-2">
                <button
                  onClick={() => setIsUploadMode(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl text-gray-300 hover:text-white border border-white/10 transition-all active:scale-[0.98]"
                >
                  <UploadCloud className="w-4 h-4 text-blue-400" />
                  Add Photo Observation
                </button>

                <button
                  onClick={() => setShowTokenModal(true)}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-transparent hover:bg-white/5 text-[10px] text-gray-500 hover:text-gray-400 rounded-lg transition-all"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Configure Mapbox API Token
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 6. TIMELINE BAR (Bottom) */}
      <div className="absolute bottom-4 left-4 right-4 z-10 pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto">
          <Timeline
            years={YEARS}
            currentYear={currentYear}
            onYearChange={setCurrentYear}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
          />
        </div>
      </div>

      {/* 7. CONFIGURE TOKEN DIALOG */}
      {showTokenModal && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md glass-panel p-6 border border-panel-border animate-in scale-in duration-200">
            <div className="flex items-start gap-4 text-left">
              <div className="p-3 bg-blue-950 rounded-xl text-blue-400 shrink-0">
                <Settings className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 w-full">
                <h3 className="text-base font-bold text-white">Configure Mapbox Access Token</h3>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Terratime uses Mapbox GL JS to render high-performance 3D globes and particle shaders. To get started, you can get a free token from your mapbox dashboard.
                </p>
                
                <form onSubmit={handleSaveToken} className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-gray-500">Mapbox Access Token</label>
                    <input
                      type="text"
                      required
                      placeholder="pk.eyJ1Ijo..."
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      className="w-full bg-black/50 border border-panel-border rounded-xl px-3 py-2 text-xs text-white placeholder:text-gray-700 outline-none focus:border-blue-500"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95"
                    >
                      Save Token
                    </button>
                    {mapboxToken && (
                      <button
                        type="button"
                        onClick={() => setShowTokenModal(false)}
                        className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
