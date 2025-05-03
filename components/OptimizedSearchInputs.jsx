import React, { useState } from 'react';
import { MapPin, Navigation, Locate, Train, Plane, ChevronDown, Plus, Menu } from 'lucide-react';

const MobileOptimizedSearchInputs = ({
  depart,
  setDepart,
  arrivee,
  setArrivee,
  autocompleteRefDepart,
  autocompleteRefArrivee,
  handleAirportSelect,
  handleStationSelect,
  getMyLocation,
  customInputClass = "",
}) => {
  // État pour gérer les dropdowns
  const [showDepartOptions, setShowDepartOptions] = useState(false);
  const [showArriveeOptions, setShowArriveeOptions] = useState(false);

  // Fonction pour simuler la géolocalisation
  const handleLocationClick = (lat, lng) => {
    // Simulation de la fonction onGetLocation de LocationButton
    alert("Utilisation de la géolocalisation");
    setShowDepartOptions(false);
  };

  return (
    <div className="w-full space-y-4">
      {/* Champ de départ avec dropdown */}
      <div className="w-full">
        <div className="relative">
          <div className="flex flex-col shadow-sm rounded-lg overflow-hidden">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <MapPin className="text-gray-500 h-5 w-5" />
              </div>
              <input
                type="text"
                id="departure-address"
                name="departure-address"
                placeholder="Adresse de départ"
                value={depart}
                onChange={(e) => setDepart(e.target.value)}
                className={`block w-full pl-10 pr-12 p-4 bg-gray-100 text-black rounded-lg outline-none focus:ring-2 focus:ring-black/10 transition ${customInputClass}`}
                aria-label="Adresse de départ"
              />
              <button
                onClick={() => setShowDepartOptions(!showDepartOptions)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gray-200 hover:bg-gray-300 rounded-full"
                aria-label="Options de départ"
              >
                <Menu size={18} className="text-gray-700" />
              </button>
            </div>
            
            {/* Dropdown pour les options de départ */}
            {showDepartOptions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-lg rounded-lg z-10 overflow-hidden">
                <div className="p-2 grid grid-cols-1 gap-2">
                  <button
                    onClick={handleLocationClick}
                    className="flex items-center space-x-2 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
                  >
                    <Locate size={20} className="text-gray-700" />
                    <span>Ma position actuelle</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAirportSelect("Aéroport Charles de Gaulle", "depart");
                      setShowDepartOptions(false);
                    }}
                    className="flex items-center space-x-2 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
                  >
                    <Plane size={20} className="text-gray-700" />
                    <span>Sélectionner un aéroport</span>
                  </button>
                  <button
                    onClick={() => {
                      handleStationSelect("Gare de Lyon", "depart");
                      setShowDepartOptions(false);
                    }}
                    className="flex items-center space-x-2 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
                  >
                    <Train size={20} className="text-gray-700" />
                    <span>Sélectionner une gare</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Champ d'arrivée avec dropdown */}
      <div className="w-full">
        <div className="relative">
          <div className="flex flex-col shadow-sm rounded-lg overflow-hidden">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Navigation className="text-gray-500 h-5 w-5" />
              </div>
              <input
                type="text"
                id="arrival-address"
                name="arrival-address"
                placeholder="Adresse d'arrivée"
                value={arrivee}
                onChange={(e) => setArrivee(e.target.value)}
                className={`block w-full pl-10 pr-12 p-4 bg-gray-100 text-black rounded-lg outline-none focus:ring-2 focus:ring-black/10 transition ${customInputClass}`}
                aria-label="Adresse d'arrivée"
              />
              <button
                onClick={() => setShowArriveeOptions(!showArriveeOptions)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-gray-200 hover:bg-gray-300 rounded-full"
                aria-label="Options d'arrivée"
              >
                <Menu size={18} className="text-gray-700" />
              </button>
            </div>
            
            {/* Dropdown pour les options d'arrivée */}
            {showArriveeOptions && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-lg rounded-lg z-10 overflow-hidden">
                <div className="p-2 grid grid-cols-1 gap-2">
                  <button
                    onClick={() => {
                      handleAirportSelect("Aéroport d'Orly", "arrivee");
                      setShowArriveeOptions(false);
                    }}
                    className="flex items-center space-x-2 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
                  >
                    <Plane size={20} className="text-gray-700" />
                    <span>Sélectionner un aéroport</span>
                  </button>
                  <button
                    onClick={() => {
                      handleStationSelect("Gare du Nord", "arrivee");
                      setShowArriveeOptions(false);
                    }}
                    className="flex items-center space-x-2 p-3 hover:bg-gray-100 rounded-lg w-full text-left"
                  >
                    <Train size={20} className="text-gray-700" />
                    <span>Sélectionner une gare</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileOptimizedSearchInputs;