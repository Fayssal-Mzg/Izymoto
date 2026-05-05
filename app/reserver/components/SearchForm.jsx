"use client";

import { aeroports, gares } from "../utils/constants";
import AirportButton from "@/components/AirportButton";
import TrainStationButton from "@/components/TrainStationButton";
import { Autocomplete } from "@react-google-maps/api";
import {
  MapPin,
  Locate,
  Euro,
  Navigation,
  ArrowRight,
  Clock,
  Route,
  ChevronDown,
  RotateCcw,
  ChevronUp,
  RefreshCw,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";

export default function SearchForm({
  depart,
  setDepart,
  arrivee,
  setArrivee,
  prix,
  distance,
  duree,
  calculateRoute,
  customInputClass = "",
  customButtonClass = "",
  onReserverClick,
  resetRouteData,
}) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [inputsReady, setInputsReady] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(true);
  const [isResetting, setIsResetting] = useState(false);
  const [localPrix, setLocalPrix] = useState(null);

  const autocompleteRefDepart = useRef(null);
  const autocompleteRefArrivee = useRef(null);
  const inputDepartRef = useRef(null);
  const inputArriveeRef = useRef(null);

  useEffect(() => {
    if (prix !== null) {
      setLocalPrix(prix);
    }
  }, [prix]);

  useEffect(() => {
    if (depart && arrivee) {
      setInputsReady(true);
    } else {
      setInputsReady(false);
    }
  }, [depart, arrivee]);

  useEffect(() => {
    if (prix !== null && distance !== null) {
      setShowDetails(true);
      setDetailsExpanded(true);
      setLocalPrix(prix);
    }
  }, [prix, distance]);

  // Auto-calcul debouncé quand depart ET arrivee changent.
  // Remplace les setTimeout(..., 150) dans les autocompletes et boutons préset
  // qui capturaient une closure obsolète de calculateRoute → prix/map en retard
  // d'un cran à chaque modification d'adresse.
  useEffect(() => {
    if (isResetting) return;
    if (!depart || !arrivee) return;
    if (depart.length < 5 || arrivee.length < 5) return;
    // Les adresses Google formatées contiennent toujours une virgule. Filtre
    // les saisies en cours non finalisées.
    if (!depart.includes(",") || !arrivee.includes(",")) return;

    const handle = setTimeout(() => {
      setIsCalculating(true);
      calculateRoute();
      setTimeout(() => setIsCalculating(false), 800);
    }, 300);

    return () => clearTimeout(handle);
    // calculateRoute est volontairement omis : il est recréé à chaque render de
    // useReservation et l'effet capture la dernière version au moment où il
    // s'exécute (post-commit React), garantissant des closures fraîches.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depart, arrivee, isResetting]);

  const getMyLocation = () => {
    if (navigator.geolocation) {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results, status) => {
              if (status === "OK" && results[0]) {
                setDepart(results[0].formatted_address);
                // Le useEffect debouncé déclenche calculateRoute automatiquement.
              } else {
                alert("Impossible de déterminer votre adresse actuelle.");
              }
            }
          );
        },
        (error) => {
          console.error(
            "Erreur de géolocalisation:",
            error.code,
            error.message
          );
          alert(
            "Impossible d'obtenir votre position. Veuillez vérifier les permissions."
          );
        },
        options
      );
    } else {
      alert(
        "La géolocalisation n'est pas prise en charge par votre navigateur."
      );
    }
  };

  const handleAirportSelect = (address, type) => {
    if (type === "depart") setDepart(address);
    else setArrivee(address);
    // Le useEffect debouncé prend le relais.
  };

  const handleStationSelect = (address, type) => {
    if (type === "depart") setDepart(address);
    else setArrivee(address);
  };

  const handleCalculateRoute = () => {
    if (!depart || !arrivee) {
      return;
    }

    // Validation des adresses avant calcul
    if (depart.length < 5 || arrivee.length < 5) {
      console.warn("Adresses trop courtes");
      return;
    }

    setIsCalculating(true);
    calculateRoute();

    setTimeout(() => {
      setIsCalculating(false);
    }, 800);
  };

  const handleReset = () => {
    setIsResetting(true);
    setShowDetails(false);
    setDetailsExpanded(false);
    setLocalPrix(null);

    setTimeout(() => {
      setDepart("");
      setArrivee("");

      if (typeof resetRouteData === "function") {
        resetRouteData();
      }

      setTimeout(() => {
        if (
          inputDepartRef.current &&
          inputDepartRef.current.querySelector("input")
        ) {
          inputDepartRef.current.querySelector("input").focus();
        }
        setIsResetting(false);
      }, 100);
    }, 200);
  };

  const formatDuration = () => {
    if (!duree) return "0min";
    const hours = Math.floor(duree / 60);
    const minutes = duree % 60;
    if (hours === 0) return `${minutes}min`;
    return `${hours}h${minutes > 0 ? ` ${minutes}min` : ""}`;
  };

  const toggleDetails = () => {
    setDetailsExpanded(!detailsExpanded);
  };

  const onPlaceChangedDepart = () => {
    if (!autocompleteRefDepart.current) return;
    const place = autocompleteRefDepart.current.getPlace();
    if (
      place &&
      place.formatted_address &&
      place.geometry &&
      place.geometry.location &&
      place.formatted_address.length > 5
    ) {
      setDepart(place.formatted_address);
    }
    // Le useEffect debouncé déclenche le calcul quand depart + arrivee sont valides.
  };

  const onPlaceChangedArrivee = () => {
    if (!autocompleteRefArrivee.current) return;
    const place = autocompleteRefArrivee.current.getPlace();
    if (
      place &&
      place.formatted_address &&
      place.geometry &&
      place.geometry.location &&
      place.formatted_address.length > 5
    ) {
      setArrivee(place.formatted_address);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto relative">
      <div className="space-y-4">
        {/* Ligne de départ */}
        <div className="w-full" ref={inputDepartRef}>
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRefDepart.current = autocomplete;
            }}
            onPlaceChanged={onPlaceChangedDepart}
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
                  id="reservation-depart"
                  name="depart"
                  type="text"
                  autoComplete="street-address"
                  placeholder="Adresse de départ"
                  value={depart}
                  onChange={(e) => setDepart(e.target.value)}
                  className={`w-full p-3 pl-10 rounded-lg bg-gray-100 text-black outline-none ${customInputClass}`}
                  aria-label="Adresse de départ"
                />
              </div>
              <div className="flex ml-2">
                <button
                  onClick={getMyLocation}
                  className="px-2 py-3 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
                  title="Ma position actuelle"
                  type="button"
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
            </div>
          </Autocomplete>
        </div>

        {/* Ligne d'arrivée */}
        <div className="w-full" ref={inputArriveeRef}>
          <Autocomplete
            onLoad={(autocomplete) => {
              autocompleteRefArrivee.current = autocomplete;
            }}
            onPlaceChanged={onPlaceChangedArrivee}
            options={{
              componentRestrictions: { country: "fr" },
              types: ["address"],
              fields: ["formatted_address", "geometry", "name"],
            }}
          >
            <div className="relative flex">
              <div className="relative flex-grow">
                <Navigation className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-5 w-5" />
                <input
                  id="reservation-arrivee"
                  name="arrivee"
                  type="text"
                  autoComplete="off"
                  placeholder="Adresse d'arrivée"
                  value={arrivee}
                  onChange={(e) => setArrivee(e.target.value)}
                  className={`w-full p-3 pl-10 rounded-lg bg-gray-100 text-black outline-none ${customInputClass}`}
                  aria-label="Adresse d'arrivée"
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
            </div>
          </Autocomplete>
        </div>

        {/* État de chargement du calcul */}
        {isCalculating && (
          <div className="mt-4 flex justify-center items-center py-4 px-4 bg-gray-50 rounded-lg shadow-inner">
            <div className="animate-spin h-6 w-6 border-3 border-black border-t-transparent rounded-full mr-3"></div>
            <p className="text-gray-700 font-medium">Calcul en cours...</p>
          </div>
        )}

        {/* Résumé rapide des détails - Protection contre null */}
        {localPrix !== null &&
          distance !== null &&
          !isCalculating &&
          !isResetting && (
            <div className="bg-gray-50 p-4 rounded-lg shadow-sm mt-4 transition-all duration-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="text-gray-700 font-medium">
                    <span className="font-bold text-xl">
                      {Math.round(prix)}€
                    </span>
                    <span className="mx-2 text-gray-500">•</span>
                    <span>{distance.toFixed(1)} km</span>
                    <span className="mx-2 text-gray-500">•</span>
                    <span>{formatDuration()}</span>
                  </div>
                </div>
                <button
                  onClick={toggleDetails}
                  className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-200 transition-colors"
                  aria-label={
                    detailsExpanded
                      ? "Masquer les détails"
                      : "Afficher les détails"
                  }
                  type="button"
                >
                  {detailsExpanded ? (
                    <ChevronUp size={20} />
                  ) : (
                    <ChevronDown size={20} />
                  )}
                </button>
              </div>

              {/* Détails développés */}
              {detailsExpanded && (
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-gray-200 pt-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Navigation size={18} className="text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Distance
                      </p>
                      <p className="font-semibold">{distance.toFixed(1)} km</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Clock size={18} className="text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Temps estimé
                      </p>
                      <p className="font-semibold">{formatDuration()}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <Euro size={18} className="text-gray-700" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">
                        Prix
                      </p>
                      <p className="font-bold text-xl">{Math.round(prix)}€</p>
                    </div>
                  </div>

                  <div className="md:col-span-3 text-sm text-gray-500 bg-gray-100 p-3 rounded-lg">
                    <p>
                      Le prix affiché est indicatif et peut être soumis à des
                      majorations selon les horaires et jours.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        {/* Boutons d'action */}
        <div className="flex justify-center mt-4 space-x-3">
          {localPrix !== null && !isResetting && (
            <button
              onClick={handleReset}
              className="py-3 px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg shadow-sm hover:shadow transition-all duration-300 flex items-center"
              type="button"
            >
              <RotateCcw className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline">Nouvelle recherche</span>
              <span className="sm:hidden">Effacer</span>
            </button>
          )}

          {isResetting && (
            <button
              className="py-3 px-4 bg-gray-300 text-gray-500 rounded-lg shadow-sm flex items-center opacity-70 cursor-not-allowed"
              type="button"
              disabled
            >
              <RefreshCw className="animate-spin mr-2 h-5 w-5" />
              <span>Réinitialisation...</span>
            </button>
          )}

          {inputsReady && !isResetting && (
            <button
              onClick={localPrix ? onReserverClick : handleCalculateRoute}
              className={`py-3 px-6 bg-gray-900 hover:bg-black text-white rounded-lg shadow-sm hover:shadow transition-all duration-300 flex items-center space-x-2 flex-grow sm:flex-grow-0 ${customButtonClass}`}
              disabled={isCalculating}
              type="button"
            >
              {isCalculating ? (
                <>
                  <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  <span>Calcul en cours...</span>
                </>
              ) : localPrix ? (
                <>
                  <span>Réserver cette course</span>
                  <ArrowRight size={18} />
                </>
              ) : (
                <>
                  <Route size={18} className="mr-2" />
                  <span>Calculer l'itinéraire</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
