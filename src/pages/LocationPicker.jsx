import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import "./LocationPicker.css";

// Fix default Leaflet marker icons
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [0, -41],
  shadowSize: [41, 41],
  shadowAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Reverse geocoding using OpenStreetMap Nominatim
async function getAddressFromCoords(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
    );
    const data = await res.json();
    return data.display_name || `Lat: ${lat}, Lng: ${lng}`;
  } catch (error) {
    console.error("Error fetching address:", error);
    return `Lat: ${lat}, Lng: ${lng}`;
  }
}

// Component to handle map clicks
function ClickableMap({ onLocationSelect }) {
  useMapEvents({
    click: (e) => {
      onLocationSelect(e.latlng);
    },
  });
  return null;
}

export default function LocationPicker() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const type = searchParams.get("type"); // "pickup" or "destination"
  
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([10.3779, 123.6386]); // Default center

  useEffect(() => {
    // Get user's current location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude]);
        },
        () => {
          // Use default center if geolocation fails
        }
      );
    }
  }, []);

  const handleMapClick = async (latlng) => {
    setLoading(true);
    setSelectedLocation(latlng);
    const addr = await getAddressFromCoords(latlng.lat, latlng.lng);
    setAddress(addr);
    setLoading(false);
  };

  const handleDone = () => {
    if (selectedLocation && address) {
      // Pass location data back to Home page via navigation state
      navigate("/", {
        state: {
          location: selectedLocation,
          address: address,
          type: type
        }
      });
    } else {
      alert("Please select a location on the map first.");
    }
  };

  const handleCancel = () => {
    navigate("/");
  };

  const title = type === "pickup" ? "Select Pickup Location" : "Select Destination Location";

  return (
    <div className="location-picker-container">
      <div className="location-picker-header">
        <button onClick={handleCancel} className="back-button">
          ← Back
        </button>
        <h2>{title}</h2>
        <div style={{ width: "60px" }}></div> {/* Spacer for centering */}
      </div>

      <div className="map-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
        >
          <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          <ClickableMap onLocationSelect={handleMapClick} />
          {selectedLocation && (
            <Marker position={[selectedLocation.lat, selectedLocation.lng]} />
          )}
        </MapContainer>
      </div>

      <div className="location-picker-footer">
        <div className="address-display">
          {loading ? (
            <p className="address-text">Loading address...</p>
          ) : address ? (
            <div>
              <p className="address-label">
                {type === "pickup" ? "📍 Pickup Address:" : "🎯 Destination Address:"}
              </p>
              <p className="address-text">{address}</p>
            </div>
          ) : (
            <p className="address-text">Tap on the map to select a location</p>
          )}
        </div>
        <button 
          onClick={handleDone} 
          className="done-button"
          disabled={!selectedLocation || loading}
        >
          Done
        </button>
      </div>
    </div>
  );
}



