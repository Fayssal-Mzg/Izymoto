// app/reserver/components/MapContainer.jsx
"use client";

import { GoogleMap, DirectionsRenderer } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "calc(100vh - 80px)",
};

const center = {
  lat: 48.8566,
  lng: 2.3522,
};

export default function MapContainer({ isLoaded, directions }) {
  if (!isLoaded) {
    return (
      <div
        style={containerStyle}
        className="flex items-center justify-center bg-gray-200"
      >
        <p>Chargement de la carte...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={11}
      options={{
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      }}
    >
      {directions && <DirectionsRenderer directions={directions} />}
    </GoogleMap>
  );
}
