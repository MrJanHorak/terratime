"use client";

import React, { useState, useEffect, useRef } from "react";
import { Search, MapPin, Loader2, X } from "lucide-react";
import { LocationInfo } from "../types";

interface LocationSearchProps {
  onSelectLocation: (location: LocationInfo) => void;
}

export default function LocationSearch({ onSelectLocation }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Close suggestions dropdown when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=6&language=en&format=json`
        );
        const data = await response.json();
        
        if (data.results) {
          const formattedSuggestions: LocationInfo[] = data.results.map((item: any) => ({
            name: item.name,
            latitude: item.latitude,
            longitude: item.longitude,
            country: item.country,
            admin1: item.admin1,
          }));
          setSuggestions(formattedSuggestions);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Geocoding fetch error:", error);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const handleSelect = (loc: LocationInfo) => {
    onSelectLocation(loc);
    setQuery(`${loc.name}${loc.country ? `, ${loc.country}` : ""}`);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative w-full z-50">
      <div className="relative flex items-center w-full h-11 rounded-xl glass-card px-3 focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all duration-300">
        <Search className="w-5 h-5 text-gray-400 mr-2 shrink-0" />
        
        <input
          type="text"
          className="w-full h-full bg-transparent text-sm text-foreground outline-none placeholder:text-gray-500"
          placeholder="Search location (e.g., Tokyo, Svalbard, Paris)..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        
        {loading && <Loader2 className="w-4 h-4 text-blue-500 animate-spin ml-2 shrink-0" />}
        
        {!loading && query && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
            }}
            className="p-1 hover:bg-white/10 rounded-full transition-colors ml-1"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-2 bg-panel-bg backdrop-blur-xl border border-panel-border rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 z-50">
          {suggestions.map((loc, idx) => (
            <li
              key={`${loc.latitude}-${loc.longitude}-${idx}`}
              onClick={() => handleSelect(loc)}
              className="flex items-center px-4 py-3 hover:bg-white/10 cursor-pointer transition-colors duration-200 text-sm group"
            >
              <MapPin className="w-4 h-4 text-blue-400 mr-3 group-hover:text-blue-300 transition-colors" />
              <div className="flex flex-col text-left">
                <span className="font-medium text-gray-200">{loc.name}</span>
                <span className="text-xs text-gray-400 mt-0.5">
                  {[loc.admin1, loc.country].filter(Boolean).join(", ")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
