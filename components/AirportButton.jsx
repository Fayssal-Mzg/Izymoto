"use client";

import { aeroports } from "@/app/reserver/utils/constants";
import { Plane } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function AirportButton({
  onSelectAirport,
  type = "depart", // 'depart' or 'arrivee'
  className = "px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition",
}) {
  const [showAirports, setShowAirports] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowAirports(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleAirportSelect = (airport) => {
    onSelectAirport(airport.adresse, type);
    setShowAirports(false);
  };

  return (
    <div className="relative dropdown-container" ref={dropdownRef}>
      <button
        onClick={() => setShowAirports(!showAirports)}
        className={className}
        title="Aéroports"
      >
        <Plane size={20} />
      </button>

      {showAirports && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4 text-center">
              Sélectionnez un aéroport de{" "}
              {type === "depart" ? "départ" : "arrivée"}
            </h3>
            <ul className="max-h-64 overflow-y-auto">
              {aeroports.map((aeroport, index) => (
                <li key={index}>
                  <button
                    className="w-full px-4 py-2 text-left hover:bg-gray-100 rounded-md"
                    onClick={() => handleAirportSelect(aeroport)}
                  >
                    {aeroport.nom}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
