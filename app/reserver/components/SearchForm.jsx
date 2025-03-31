// app/reserver/components/SearchForm.jsx
"use client";

import { aeroports, gares } from "../utils/constants";
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
    <div className="px-4 md:px-8 lg:px-16 xl:px-24">
      {/* Ligne de départ */}
      <div className="grid grid-cols-12 items-center mb-6">
        <div className="col-span-8 col-start-2 relative dropdown-container">
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
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Adresse de départ"
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  className="w-full p-3 pl-10 rounded-md bg-white/90 text-black outline-none"
                />
              </div>
            </Autocomplete>
          )}
        </div>

        <div className="px-2 col-span-3 flex">
          {/* Bouton Ma Géolocalisation */}
          <button
            onClick={getMyLocation}
            className="p-2 rounded-md bg-white/20 hover:bg-white/30 transition"
            title="Ma position actuelle"
          >
            <Locate size={20} />
          </button>

          {/* Bouton Aéroports */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowAeroportsDepart(!showAeroportsDepart);
                setShowGaresDepart(false);
              }}
              className="p-2 rounded-md bg-white/20 hover:bg-white/30 transition ml-2"
              title="Aéroports"
            >
              <Plane size={20} />
            </button>

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
          </div>

          {/* Bouton Gares */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowGaresDepart(!showGaresDepart);
                setShowAeroportsDepart(false);
              }}
              className="p-2 rounded-md bg-white/20 hover:bg-white/30 transition ml-2"
              title="Gares"
            >
              <Train size={20} />
            </button>

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
        </div>
      </div>

      {/* Ligne d'arrivée */}
      <div className="grid grid-cols-12 items-center mb-6">
        <div className="col-span-8 col-start-2 relative dropdown-container">
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
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Adresse d'arrivée"
                  value={arrivee}
                  onChange={(e) => setArrivee(e.target.value)}
                  className="w-full p-3 pl-10 rounded-md bg-white/90 text-black outline-none"
                />
              </div>
            </Autocomplete>
          )}
        </div>

        <div className="col-span-3 flex">
          {/* Espace vide pour l'alignement */}
          <div className="w-10"></div>

          {/* Bouton Aéroports */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowAeroportsArrivee(!showAeroportsArrivee);
                setShowGaresArrivee(false);
              }}
              className="p-2 rounded-md bg-white/20 hover:bg-white/30 transition ml-2"
              title="Aéroports"
            >
              <Plane size={20} />
            </button>

            {showAeroportsArrivee && (
              <div className="absolute bottom-12 right-0 w-64 bg-white rounded-md shadow-lg z-10">
                <ul className="py-1 text-sm text-gray-800">
                  {aeroports.map((aeroport, index) => (
                    <li key={index}>
                      <button
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => {
                          setArrivee(aeroport.adresse);
                          setShowAeroportsArrivee(false);
                        }}
                      >
                        {aeroport.nom}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Bouton Gares */}
          <div className="relative dropdown-container">
            <button
              onClick={() => {
                setShowGaresArrivee(!showGaresArrivee);
                setShowAeroportsArrivee(false);
              }}
              className="p-2 rounded-md bg-white/20 hover:bg-white/30 transition ml-2"
              title="Gares"
            >
              <Train size={20} />
            </button>

            {showGaresArrivee && (
              <div className="absolute bottom-12 right-0 w-64 bg-white rounded-md shadow-lg z-10">
                <ul className="py-1 text-sm text-gray-800 max-h-80 overflow-y-auto">
                  {gares.map((gare, index) => (
                    <li key={index}>
                      <button
                        className="w-full px-4 py-2 text-left hover:bg-gray-100"
                        onClick={() => {
                          setArrivee(gare.adresse);
                          setShowGaresArrivee(false);
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
        <div className="w-full max-w-3xl flex justify-end">
          <button
            onClick={calculateRoute}
            className="bg-[#ffc107] text-black py-3 px-8 rounded-md font-semibold hover:bg-yellow-500 transition flex items-center space-x-2"
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
