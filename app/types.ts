export interface LocationInfo {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  admin1?: string;
}

export interface DailyWeatherData {
  time: string[];
  temperature_2m_max: number[];
  temperature_2m_min: number[];
  precipitation_sum: number[];
  wind_speed_10m_max: number[];
}

export interface WeatherResponse {
  daily: DailyWeatherData;
}

export interface Contribution {
  id: string;
  title: string;
  description: string;
  date: string;
  lat: number;
  lng: number;
  imageUrl: string;
  category: string;
  author: string;
}

export interface ClimateGridData {
  latitudes: number[];
  longitudes: number[];
  years: number[];
  tempGrid: Record<string, number[]>;
  precipGrid: Record<string, number[]>;
  windGrid: Record<string, number[]>;
}

export interface ActiveLayers {
  temperature: boolean;
  precipitation: boolean;
  wind: boolean;
}

export interface HistoricalTrend {
  year: number;
  avgTemp: number;
  totalPrecip: number;
  maxWind: number;
}

export interface TrendAnalysisResult {
  trends: HistoricalTrend[];
  tempSlope: number; // °C warming per year
  precipSlope: number; // mm change per year
  startYear: number;
  endYear: number;
}
