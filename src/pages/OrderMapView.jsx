import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import "./OrderMapView.css";

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

// Custom icons for pickup and destination
const PickupIcon = L.icon({
  iconUrl,
  shadowUrl: iconShadow,
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [0, -46],
  shadowSize: [46, 46],
  shadowAnchor: [15, 46],
});

const DestinationIcon = L.divIcon({
  className: 'custom-marker destination-marker',
  html: '<div style="background-color: #dc3545; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 15],
  popupAnchor: [0, -15],
});

// Custom icon for user's current location (blue dot)
const CurrentLocationIcon = L.divIcon({
  className: 'current-location-marker',
  html: '<div style="background-color: #007bff; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 0 10px rgba(0, 123, 255, 0.8);"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10],
});

// Get route from OSRM routing service
async function getRoute(startLat, startLng, endLat, endLng) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]);
      return coordinates;
    }
    return null;
  } catch (error) {
    console.error("Error fetching route:", error);
    return null;
  }
}

// Component to handle map controls and track user location
function MapControls({ userLocation, onCenterToUser }) {
  const map = useMap();

  useEffect(() => {
    // Add custom button to center on user location
    const button = L.control({ position: 'topright' });
    button.onAdd = () => {
      const div = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
      div.style.backgroundColor = 'white';
      div.style.width = '40px';
      div.style.height = '40px';
      div.style.borderRadius = '4px';
      div.style.border = '2px solid #ccc';
      div.style.cursor = 'pointer';
      div.innerHTML = '📍';
      div.style.lineHeight = '40px';
      div.style.textAlign = 'center';
      div.style.fontSize = '20px';
      
      L.DomEvent.disableClickPropagation(div);
      div.addEventListener('click', onCenterToUser);
      
      return div;
    };
    button.addTo(map);

    return () => {
      button.remove();
    };
  }, [map, onCenterToUser]);

  return null;
}

export default function OrderMapView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [route, setRoute] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.3779, 123.6386]);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Get user's current location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Use default center if geolocation fails
        }
      );
    }
  }, []);

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
  }, [orderId]);

  const fetchOrder = async () => {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (orderDoc.exists()) {
        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        setOrder(orderData);
        
        // Set map center to midpoint between pickup and destination
        if (orderData.pickup && orderData.destination) {
          const centerLat = (orderData.pickup.lat + orderData.destination.lat) / 2;
          const centerLng = (orderData.pickup.lng + orderData.destination.lng) / 2;
          setMapCenter([centerLat, centerLng]);
          
          // Fetch route
          const routeData = await getRoute(
            orderData.pickup.lat,
            orderData.pickup.lng,
            orderData.destination.lat,
            orderData.destination.lng
          );
          setRoute(routeData);
        }
      } else {
        alert("Order not found.");
        navigate(-1);
      }
    } catch (error) {
      console.error("Error fetching order:", error);
      alert("Failed to load order.");
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleCenterToUser = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 16);
    }
  };

  if (loading) {
    return (
      <div className="order-map-view-container">
        <div className="loading">Loading map...</div>
      </div>
    );
  }

  if (!order || !order.pickup || !order.destination) {
    return (
      <div className="order-map-view-container">
        <div className="error-message">Order location data not available.</div>
      </div>
    );
  }

  return (
    <div className="order-map-view-container">
      <div className="map-view-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h2>Order Route</h2>
        <div style={{ width: "60px" }}></div>
      </div>

      <div className="map-info-bar">
        <div className="map-info-item">
          <span className="map-info-label">📍 Pickup:</span>
          <span className="map-info-value">{order.pickup.address || "N/A"}</span>
        </div>
        <div className="map-info-item">
          <span className="map-info-label">🎯 Destination:</span>
          <span className="map-info-value">{order.destination.address || "N/A"}</span>
        </div>
        {order.distance && (
          <div className="map-info-item">
            <span className="map-info-label">📏 Distance:</span>
            <span className="map-info-value">{order.distance} km</span>
          </div>
        )}
      </div>

      <div className="map-view-wrapper">
        <MapContainer
          center={mapCenter}
          zoom={13}
          scrollWheelZoom={true}
          style={{ width: "100%", height: "100%" }}
          ref={mapRef}
        >
          <TileLayer 
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
          />
          <MapControls userLocation={userLocation} onCenterToUser={handleCenterToUser} />
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
          {userLocation && (
            <Marker 
              position={[userLocation.lat, userLocation.lng]}
              icon={CurrentLocationIcon}
              title="Your Current Location"
            />
          )}
          <Marker 
            position={[order.pickup.lat, order.pickup.lng]}
            icon={PickupIcon}
          >
            <Popup>
              <div>
                <strong>📍 Pickup</strong><br />
                {order.pickup.address}
              </div>
            </Popup>
          </Marker>
          <Marker 
            position={[order.destination.lat, order.destination.lng]}
            icon={DestinationIcon}
          >
            <Popup>
              <div>
                <strong>🎯 Destination</strong><br />
                {order.destination.address}
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>
    </div>
  );
}




