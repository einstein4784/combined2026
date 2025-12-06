"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  temperature: number;
  windspeed: number;
  time: string;
  code: number;
};

function describeWeather(code: number) {
  // Simplified mapping for Open-Meteo weather codes
  if ([0].includes(code)) return { label: "Clear sky", icon: "☀️" };
  if ([1, 2, 3].includes(code)) return { label: "Partly cloudy", icon: "⛅️" };
  if ([45, 48].includes(code)) return { label: "Foggy", icon: "🌫️" };
  if ([51, 53, 55, 56, 57].includes(code)) return { label: "Drizzle", icon: "🌦️" };
  if ([61, 63, 65].includes(code)) return { label: "Rain", icon: "🌧️" };
  if ([66, 67].includes(code)) return { label: "Freezing rain", icon: "🌧️" };
  if ([71, 73, 75, 77].includes(code)) return { label: "Snow", icon: "❄️" };
  if ([80, 81, 82].includes(code)) return { label: "Showers", icon: "🌧️" };
  if ([85, 86].includes(code)) return { label: "Snow showers", icon: "🌨️" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", icon: "⛈️" };
  return { label: "Weather", icon: "🌤️" };
}

export function WeatherPanel() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Castries, St. Lucia approx lat/lon
        const res = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=14.0101&longitude=-60.9875&current_weather=true",
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error("Weather unavailable");
        const data = await res.json();
        if (data?.current_weather) {
          setWeather({
            temperature: data.current_weather.temperature,
            windspeed: data.current_weather.windspeed,
            time: data.current_weather.time,
            code: data.current_weather.weathercode,
          });
        } else {
          setError("Weather unavailable");
        }
      } catch (e) {
        setError("Weather unavailable");
      }
    };
    fetchWeather();
  }, []);

  const now = new Date();
  const formatted = now.toLocaleString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const weatherMeta = weather ? describeWeather(weather.code) : null;

  return (
    <div className="rounded-xl border border-[var(--ic-gray-200)] bg-white p-5 text-[var(--ic-gray-800)] shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[var(--ic-gray-500)]">Local info</p>
          <p className="text-sm font-semibold text-[var(--ic-navy)]">Date & Time</p>
          <p className="text-sm text-[var(--ic-gray-700)]">{formatted}</p>
        </div>
        <div className="text-4xl" aria-hidden="true">
          {weatherMeta?.icon ?? "🌤️"}
        </div>
      </div>
      <div className="mt-4 rounded-lg bg-[var(--ic-gray-50)] p-4 border border-[var(--ic-gray-200)]">
        <p className="text-sm font-semibold text-[var(--ic-navy)]">Weather (Castries)</p>
        {weather ? (
          <p className="text-sm text-[var(--ic-gray-700)]">
            {weatherMeta?.label ?? "Weather"} · {weather.temperature}°C · Wind {weather.windspeed} km/h
          </p>
        ) : error ? (
          <p className="text-sm text-[var(--ic-gray-600)]">{error}</p>
        ) : (
          <p className="text-sm text-[var(--ic-gray-600)]">Loading weather…</p>
        )}
      </div>
    </div>
  );
}

