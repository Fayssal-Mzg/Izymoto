// app/reserver/components/SearchForm.jsx
"use client";

import { aeroports, gares } from "../utils/constants";
import AirportButton from "@/components/AirportButton";
import TrainStationButton from "@/components/TrainStationButton";
import { Autocomplete } from "@react-google-maps/api";
import { MapPin, Locate, Plane, Train, Euro } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function SearchForm({
  isLoaded,
  depart,
  setDepart,
  arrivee,
  setArrivee,
  prix,
  distance,
  duree,
  calculateRoute,
}) {
  const [showAeroportsDepart, setShowAeroportsDepart] = useState(false);
  const [showGaresDepart, setShowGaresDepart] = useState(false);
  const [showAeroportsArrivee, setShowAeroportsArrivee] = useState(false);
  const [showGaresArrivee, setShowGaresArrivee] = useState(false);

  const autocompleteRefDepart = useRef(null);
  const autocompleteRefArrivee = useRef(null);

  // Géolocalisation
  const getMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Convertir les coordonnées en adresse lisible (géocodage inversé)
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === "OK" && results[0]) {
                setDepart(results[0].formatted_address);
              } else {
                console.error("Géocodage inversé échoué:", status);
              }
            }
          );
        },
        (error) => {
          console.error("Erreur de géolocalisation:", error);
          alert(
            "Impossible d'obtenir votre position. Veuillez vérifier les permissions."
          );
        }
      );
    } else {
      alert(
        "La géolocalisation n'est pas prise en charge par votre navigateur."
      );
    }
  };
  const handleAirportSelect = (address, type) => {
    if (type === "depart") {
      setDepart(address);
    } else {
      setArrivee(address);
    }
  };

  const handleStationSelect = (address, type) => {
    if (type === "depart") {
      setDepart(address);
    } else {
      setArrivee(address);
    }
  };
  // Fermer les listes déroulantes lorsqu'on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".dropdown-container")) {
        setShowAeroportsDepart(false);
        setShowGaresDepart(false);
        setShowAeroportsArrivee(false);
        setShowGaresArrivee(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="">
      <div className="">
        {/* Ligne de départ */}
        <div className="grid grid-cols-12 items-center mb-6">
          <div className="col-span-12 relative dropdown-container">
            {isLoaded && (
              <Autocomplete
                onLoad={(autocomplete) => {
                  autocompleteRefDepart.current = autocomplete;
                }}
                onPlaceChanged={() => {
                  if (autocompleteRefDepart.current) {
                    const place = autocompleteRefDepart.current.getPlace();
                    if (place && place.formatted_address) {
                      setDepart(place.formatted_address);
                    }
                  }
                }}
                options={{
                  componentRestrictions: { country: "fr" },
                  types: ["address"],
                  fields: ["formatted_address", "geometry", "name"],
                }}
              >
                <div className="relative flex">
                  <div className="relative flex-grow">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Adresse de départ"
                      value={depart}
                      onChange={(e) => setDepart(e.target.value)}
                      className="w-full p-3 pl-10 rounded-lg bg-gray-100 text-black outline-none"
                    />
                  </div>
                  <div className="flex ml-2">
                    <button
                      onClick={getMyLocation}
                      className="px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                      title="Ma position actuelle"
                    >
                      <Locate size={20} />
                    </button>
                    <AirportButton
                      onSelectAirport={handleAirportSelect}
                      type="depart"
                      className="px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition ml-2"
                    />
                    <TrainStationButton
                      onSelectStation={handleStationSelect}
                      type="depart"
                      className="px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition ml-2"
                    />
                  </div>

                  {/* Rest of the dropdown code remains the same */}
                </div>
              </Autocomplete>
            )}
          </div>
        </div>

        {/* Ligne d'arrivée (same modifications) */}
        <div className="grid grid-cols-12 items-center mb-6">
          <div className="col-span-12 relative dropdown-container">
            {isLoaded && (
              <Autocomplete
                onLoad={(autocomplete) => {
                  autocompleteRefArrivee.current = autocomplete;
                }}
                onPlaceChanged={() => {
                  if (autocompleteRefArrivee.current) {
                    const place = autocompleteRefArrivee.current.getPlace();
                    if (place && place.formatted_address) {
                      setArrivee(place.formatted_address);
                    }
                  }
                }}
                options={{
                  componentRestrictions: { country: "fr" },
                  types: ["address"],
                  fields: ["formatted_address", "geometry", "name"],
                }}
              >
                <div className="relative flex">
                  <div className="relative flex-grow">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                    <input
                      type="text"
                      placeholder="Adresse d'arrivée"
                      value={arrivee}
                      onChange={(e) => setArrivee(e.target.value)}
                      className="w-full p-3 pl-10 rounded-lg bg-gray-100 text-black outline-none"
                    />
                  </div>
                  <div className="flex ml-2">
                    <AirportButton
                      onSelectAirport={handleAirportSelect}
                      type="arrivee"
                      className="px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition ml-2"
                    />
                    <TrainStationButton
                      onSelectStation={handleStationSelect}
                      type="arrivee"
                      className="px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition ml-2"
                    />
                  </div>
                  {/* Dropdowns for Aeroports and Gares remain the same as in original code */}
                  {showAeroportsDepart && (
                    <div className="absolute bottom-12 right-0 w-64 bg-white rounded-md shadow-lg z-10">
                      <ul className="py-1 text-sm text-gray-800">
                        {aeroports.map((aeroport, index) => (
                          <li key={index}>
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-gray-100"
                              onClick={() => {
                                setDepart(aeroport.adresse);
                                setShowAeroportsDepart(false);
                              }}
                            >
                              {aeroport.nom}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {showGaresDepart && (
                    <div className="absolute bottom-12 right-0 w-64 bg-white rounded-md shadow-lg z-10">
                      <ul className="py-1 text-sm text-gray-800 max-h-80 overflow-y-auto">
                        {gares.map((gare, index) => (
                          <li key={index}>
                            <button
                              className="w-full px-4 py-2 text-left hover:bg-gray-100"
                              onClick={() => {
                                setDepart(gare.adresse);
                                setShowGaresDepart(false);
                              }}
                            >
                              {gare.nom}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </Autocomplete>
            )}
          </div>
        </div>
      </div>

      {/* Résultats et tarification */}
      {prix !== null && (
        <div className="bg-white/10 p-4 rounded-md mb-6 mx-auto max-w-3xl">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm">
                Distance:{" "}
                <span className="font-semibold">{distance.toFixed(1)} km</span>
              </p>
              <p className="text-sm">
                Durée estimée:{" "}
                <span className="font-semibold">
                  {Math.floor(duree / 60)}h
                  {duree % 60 > 0 ? ` ${duree % 60}min` : ""}
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Euro size={20} className="text-[#ffc107]" />
              <span className="text-[#ffc107] font-bold text-2xl">
                {Math.round(prix)}€
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Bouton de calcul centré à droite */}
      <div className="flex justify-center">
        {/* Bouton de calcul centré à gauche */}
        <div className="flex justify-start">
          <button
            onClick={calculateRoute}
            className="bg-black text-white py-3 px-8 rounded-lg font-semibold hover:bg-gray-800 transition flex items-center space-x-2"
          >
            <span>Calculer l'itinéraire</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
