"use client";

import { useLoadScript, GoogleMap, DirectionsRenderer, Marker } from "@react-google-maps/api";
import { useState, useEffect, useCallback, useRef } from "react";
import { MapPin, Maximize, Minimize, Navigation } from "lucide-react";

// Options par défaut de la carte
const mapOptions = {
  disableDefaultUI: true,
  zoomControl: true,
  scrollwheel: true,
  fullscreenControl: false,
  streetViewControl: false,
  mapTypeControl: false,
  styles: [
    {
      featureType: "poi",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "transit",
      elementType: "labels",
      stylers: [{ visibility: "off" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#f5f5f5" }],
    },
    {
      featureType: "road.arterial",
      elementType: "geometry",
      stylers: [{ color: "#e0e0e0" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#dadada" }],
    },
    {
      featureType: "landscape",
      elementType: "geometry",
      stylers: [{ color: "#f9f9f9" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#c9c9c9" }],
    },
  ],
};

// Centre par défaut sur Paris
const defaultCenter = { lat: 48.8566, lng: 2.3522 };

export default function MapContainer({ 
  directions, 
  userLocation = null,
  showFullScreen = false 
}) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [mapCenter, setMapCenter] = useState(userLocation || defaultCenter);
  const [activeMarker, setActiveMarker] = useState(null);
  const [zoom, setZoom] = useState(12);
  const mapRef = useRef(null);

  // Chargement des scripts Google Maps
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  // Mise à jour du centre de la carte si la localisation utilisateur change
  useEffect(() => {
    if (userLocation) {
      setMapCenter(userLocation);
      setZoom(14); // Zoom un peu plus proche si on a la localisation de l'utilisateur
    }
  }, [userLocation]);

  // Mise à jour de la carte lorsque les directions changent
  useEffect(() => {
    if (directions && mapRef.current) {
      // Ajuster les limites de la carte pour afficher l'itinéraire complet
      const bounds = new window.google.maps.LatLngBounds();
      
      // Récupérer la route et ses points
      const route = directions.routes[0];
      if (route && route.legs && route.legs.length > 0) {
        // Ajouter le point de départ
        bounds.extend(route.legs[0].start_location);
        
        // Ajouter le point d'arrivée
        bounds.extend(route.legs[0].end_location);
        
        // Ajouter tous les points intermédiaires
        const path = route.overview_path;
        path.forEach(point => bounds.extend(point));
        
        // Appliquer les limites à la carte
        mapRef.current.fitBounds(bounds);
      }
    }
  }, [directions]);

  // Gestionnaire pour le mode plein écran
  const toggleFullScreen = useCallback(() => {
    setIsFullScreen(!isFullScreen);
  }, [isFullScreen]);

  // Gestionnaires pour les markers
  const handleMarkerClick = (marker) => {
    setActiveMarker(marker);
  };

  // Fonction pour centrer la carte sur un point
  const centerMapOnPoint = (point) => {
    if (mapRef.current) {
      mapRef.current.panTo(point);
      setZoom(15);
    }
  };

  // Si les scripts ne sont pas chargés ou en erreur
  if (loadError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-200">
        <div className="text-center p-4">
          <p className="text-red-500">Erreur de chargement de Google Maps</p>
          <p className="text-sm text-gray-600 mt-2">Veuillez vérifier votre connexion internet et réessayer</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-gray-100">
        <div className="animate-spin h-10 w-10 border-4 border-black border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className={`relative h-full w-full ${isFullScreen ? 'fixed inset-0 z-50' : ''}`}>
      <GoogleMap
        mapContainerClassName="h-full w-full rounded-none md:rounded-lg"
        options={mapOptions}
        center={mapCenter}
        zoom={zoom}
        onLoad={(map) => {
          mapRef.current = map;
        }}
      >
        {/* Afficher l'itinéraire s'il est disponible */}
        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: false,
              polylineOptions: {
                strokeColor: "#000000",
                strokeWeight: 6,
                strokeOpacity: 0.8,
              },
            }}
          />
        )}

        {/* Afficher la position de l'utilisateur si disponible */}
        {userLocation && !directions && (
          <Marker
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "#ffffff",
              strokeWeight: 2,
            }}
            onClick={() => handleMarkerClick("user")}
          />
        )}

        {/* Bouton pour basculer en plein écran (uniquement si showFullScreen est activé) */}
        {showFullScreen && (
          <div className="absolute top-4 right-4 z-10">
            <button
              onClick={toggleFullScreen}
              className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
              aria-label={isFullScreen ? "Quitter le plein écran" : "Plein écran"}
            >
              {isFullScreen ? (
                <Minimize size={20} className="text-gray-800" />
              ) : (
                <Maximize size={20} className="text-gray-800" />
              )}
            </button>
          </div>
        )}

        {/* Boutons pour les points de départ et d'arrivée si un itinéraire est affiché */}
        {directions && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col space-y-2">
            <button
              onClick={() => {
                if (directions?.routes?.[0]?.legs?.[0]?.start_location) {
                  centerMapOnPoint(directions.routes[0].legs[0].start_location);
                }
              }}
              className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Aller au point de départ"
            >
              <MapPin size={20} className="text-black" />
            </button>
            <button
              onClick={() => {
                if (directions?.routes?.[0]?.legs?.[0]?.end_location) {
                  centerMapOnPoint(directions.routes[0].legs[0].end_location);
                }
              }}
              className="bg-white rounded-full p-2 shadow-md hover:bg-gray-100 transition-colors"
              aria-label="Aller au point d'arrivée"
            >
              <Navigation size={20} className="text-black" />
            </button>
          </div>
        )}

        {/* En mode plein écran, ajouter un bouton pour revenir */}
        {isFullScreen && (
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={toggleFullScreen}
              className="bg-black text-white rounded-lg px-4 py-2 shadow-md hover:bg-gray-800 transition-colors"
            >
              Revenir
            </button>
          </div>
        )}
      </GoogleMap>
    </div>
  );
}