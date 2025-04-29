"use client";

import { aeroports } from "@/app/reserver/utils/constants";
import { Plane, X, Search } from "lucide-react";
import { useState, useEffect, useRef } from "react";

export default function AirportButton({
  onSelectAirport,
  type = "depart", // 'depart' or 'arrivee'
  className = "px-4 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition",
}) {
  const [showAirports, setShowAirports] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

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

  // Focus search input when modal opens
  useEffect(() => {
    if (showAirports && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showAirports]);

  const handleAirportSelect = (airport) => {
    onSelectAirport(airport.adresse, type);
    setShowAirports(false);
    setSearchTerm('');
  };

  // Filter airports based on search term
  const filteredAirports = searchTerm.trim() === '' 
    ? aeroports 
    : aeroports.filter(airport => 
        airport.nom.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="relative dropdown-container" ref={dropdownRef}>
      <button
        onClick={() => setShowAirports(!showAirports)}
        className={className}
        title="Aéroports"
        aria-label="Sélectionner un aéroport"
        type="button"
      >
        <Plane size={20} />
      </button>

      {showAirports && (
        <>
          {/* Overlay backdrop */}
          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={() => setShowAirports(false)}
          ></div>
          
          {/* Modal dialog */}
          <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-md bg-white rounded-xl shadow-2xl border border-gray-100 animate-fadeIn">
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">
                  Aéroports de {type === "depart" ? "départ" : "arrivée"}
                </h3>
                <button 
                  onClick={() => setShowAirports(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 transition-all"
                  aria-label="Fermer"
                  type="button"
                >
                  <X size={20} />
                </button>
              </div>
              
              {/* Search input */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  ref={searchInputRef}
                  type="search"
                  id={`airport-search-${type}`}
                  name={`airport-search-${type}`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher un aéroport..."
                  className="pl-10 pr-4 py-2.5 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-black transition-all"
                />
              </div>
              
              <div className="max-h-64 overflow-y-auto pr-1">
                {filteredAirports.length > 0 ? (
                  <ul className="space-y-1">
                    {filteredAirports.map((aeroport, index) => (
                      <li key={index}>
                        <button
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-3"
                          onClick={() => handleAirportSelect(aeroport)}
                          type="button"
                        >
                          <Plane size={18} className="text-gray-500 flex-shrink-0" />
                          <span>{aeroport.nom}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center py-4 text-gray-500">Aucun aéroport trouvé</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}