import { Link, useLocation } from "react-router-dom";
import { useOrder } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import "./Navigation.css";

export default function Navigation() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { deliveryDetails, setDeliveryDetails, pickup, destination, onSubmit, isSubmitting, canSubmit } = useOrder();

  const handleOrderClick = () => {
    if (onSubmit && canSubmit) {
      onSubmit();
    } else {
      alert("Please complete all required fields: Pickup location, Destination location, and Delivery Details.");
    }
  };

  return (
    <nav className="bottom-navigation">
      <Link 
        to="/" 
        className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
      >
        <span className="nav-icon">🏠</span>
        <span className="nav-label">Home</span>
      </Link>
      
      <div className="nav-delivery-section">
        <input
          type="text"
          placeholder="Delivery Details *"
          value={deliveryDetails || ""}
          onChange={(e) => setDeliveryDetails(e.target.value)}
          className="nav-delivery-input"
          disabled={!pickup || !destination}
        />
        <button
          onClick={handleOrderClick}
          className="nav-order-submit-button"
          disabled={!canSubmit || isSubmitting || !pickup || !destination}
        >
          {isSubmitting ? "Processing..." : "Order"}
        </button>
      </div>

      <Link 
        to="/orders" 
        className={`nav-item ${location.pathname === "/orders" ? "active" : ""}`}
      >
        <span className="nav-icon">📦</span>
        <span className="nav-label">Orders</span>
      </Link>
      
      <Link 
        to="/menu" 
        className={`nav-item ${location.pathname === "/menu" ? "active" : ""}`}
      >
        <span className="nav-icon">☰</span>
        <span className="nav-label">Menu</span>
      </Link>
      
      {user ? (
        <div className="nav-user-section">
          <span className="nav-user-name">{user.fullName?.split(" ")[0] || "User"}</span>
          <button onClick={logout} className="nav-logout-btn" title="Logout">
            🚪
          </button>
        </div>
      ) : (
        <Link 
          to="/login" 
          className={`nav-item ${location.pathname === "/login" ? "active" : ""}`}
        >
          <span className="nav-icon">🔐</span>
          <span className="nav-label">Login</span>
        </Link>
      )}
    </nav>
  );
}

