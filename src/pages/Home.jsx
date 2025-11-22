import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { useNavigate } from "react-router-dom";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useOrder } from "../context/OrderContext";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

// Fix default Leaflet marker icons with proper anchor points
const DefaultIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41], // Anchor at the bottom center (tip of the marker)
  popupAnchor: [0, -41], // Popup appears above the marker
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

// Get route from OSRM routing service
async function getRoute(startLat, startLng, endLat, endLng) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // Convert GeoJSON coordinates [lng, lat] to Leaflet format [lat, lng]
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      // Distance is in meters, convert to kilometers
      const distanceKm = (route.distance / 1000).toFixed(2);
      return {
        coordinates,
        distance: parseFloat(distanceKm)
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

// Component to handle map clicks
function ClickableMap({ onClick }) {
  useMapEvents({
    click: (e) => {
      onClick(e.latlng);
    },
  });
  return null;
}

export default function Home() {
  const navigate = useNavigate();
  const { 
    setCanSubmit, 
    setOnSubmit, 
    isSubmitting, 
    setIsSubmitting, 
    deliveryDetails, 
    setDeliveryDetails,
    pickup,
    setPickup,
    destination,
    setDestination
  } = useOrder();
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [settingPickup, setSettingPickup] = useState(false);
  const [settingDestination, setSettingDestination] = useState(false);
  const [route, setRoute] = useState(null);
  const [distance, setDistance] = useState(null);
  const [price, setPrice] = useState(null);

  // Fetch route when both pickup and destination are set
  useEffect(() => {
    const fetchRoute = async () => {
      if (pickup && destination) {
        const routeData = await getRoute(
          pickup.lat,
          pickup.lng,
          destination.lat,
          destination.lng
        );
        if (routeData) {
          setRoute(routeData.coordinates);
          setDistance(routeData.distance);
          // Calculate price: every 2 km costs P22, proportionally for less than 2km
          const calculatedPrice = (routeData.distance / 2) * 22;
          setPrice(Math.round(calculatedPrice * 100) / 100); // Round to 2 decimal places
        } else {
          setRoute(null);
          setDistance(null);
          setPrice(null);
        }
      } else {
        setRoute(null);
        setDistance(null);
        setPrice(null);
      }
    };
    fetchRoute();
  }, [pickup, destination]);

  // Update canSubmit state when form is valid
  useEffect(() => {
    const isValid = pickup && destination && deliveryDetails.trim().length > 0;
    setCanSubmit(isValid);
  }, [pickup, destination, deliveryDetails, setCanSubmit]);

  const handleMapClick = async (latlng) => {
    if (settingPickup) {
      setPickup(latlng);
      const address = await getAddressFromCoords(latlng.lat, latlng.lng);
      setPickupAddress(address);
      setSettingPickup(false);
    } else if (settingDestination) {
      setDestination(latlng);
      const address = await getAddressFromCoords(latlng.lat, latlng.lng);
      setDestinationAddress(address);
      setSettingDestination(false);
    }
  };

  const handleSubmit = async () => {
    if (!pickup || !destination) {
      alert("Please select both pickup and destination locations.");
      return;
    }
    if (!deliveryDetails.trim()) {
      alert("Please enter delivery details. This field is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      // Save order to Firestore
      const orderData = {
        pickup: {
          lat: pickup.lat,
          lng: pickup.lng,
          address: pickupAddress
        },
        destination: {
          lat: destination.lat,
          lng: destination.lng,
          address: destinationAddress
        },
        deliveryDetails: deliveryDetails.trim(),
        distance: distance,
        price: price,
        status: "pending",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, "orders"), orderData);
      
      // Reset form
      setPickup(null);
      setDestination(null);
      setPickupAddress("");
      setDestinationAddress("");
      setDeliveryDetails("");
      setRoute(null);
      setDistance(null);
      setPrice(null);
      
      // Navigate to orders page
      navigate("/orders");
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Failed to save order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Set the submit handler in context
  useEffect(() => {
    setOnSubmit(() => handleSubmit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickup, destination, deliveryDetails, distance, price, pickupAddress, destinationAddress]);

  return (
    <div className="container">
      <h1>FetchGo - Pick-up & Destination Selector</h1>

      <div className="address-inputs">
        <input
          type="text"
          placeholder={pickupAddress || "Pickup Address"}
          value={pickupAddress}
          readOnly
        />
        <input
          type="text"
          placeholder={destinationAddress || "Destination Address"}
          value={destinationAddress}
          readOnly
        />
      </div>

      <div className="buttons">
        <button
          onClick={() => {
            setSettingPickup(true);
            setSettingDestination(false);
            alert("Click on the map to set Pickup location.");
          }}
        >
          Set Pickup
        </button>

        <button
          onClick={() => {
            setSettingDestination(true);
            setSettingPickup(false);
            alert("Click on the map to set Destination location.");
          }}
        >
          Set Destination
        </button>
      </div>

      {distance !== null && price !== null && (
        <div className="route-details">
          <div className="detail-item">
            <span className="detail-label">Distance:</span>
            <span className="detail-value">{distance} km</span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Price:</span>
            <span className="detail-value">₱{price.toFixed(2)}</span>
          </div>
          <div className="detail-note">
            (₱22 per 2 km, calculated proportionally)
          </div>
        </div>
      )}

      <div className="map-container">
        <MapContainer
          center={[10.3779, 123.6386]}
          zoom={14}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%", minHeight: "300px" }}
        >
          <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          <ClickableMap onClick={handleMapClick} />
          {route && (
            <Polyline
              positions={route}
              pathOptions={{
                color: "#0066ff",
                weight: 5,
                opacity: 0.8,
              }}
            />
          )}
          {pickup && (
            <Marker 
              key={`pickup-${pickup.lat}-${pickup.lng}`}
              position={[pickup.lat, pickup.lng]}
            >
              <Popup>{pickupAddress}</Popup>
            </Marker>
          )}
          {destination && (
            <Marker 
              key={`destination-${destination.lat}-${destination.lng}`}
              position={[destination.lat, destination.lng]}
            >
              <Popup>{destinationAddress}</Popup>
            </Marker>
          )}
        </MapContainer>
      </div>

    </div>
  );
}

