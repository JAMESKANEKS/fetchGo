import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, query, orderBy, where, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import "./Rider.css";

// Rider access password - Change this to your desired password
const RIDER_ACCESS_PASSWORD = "rider123"; // You can change this password

export default function Rider() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("available"); // available, accepted, in_progress, delivered
  const [riderName, setRiderName] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    // Check if rider is already authenticated
    const riderAuth = localStorage.getItem("riderAuthenticated");
    if (riderAuth === "true") {
      setIsAuthenticated(true);
      
      // Set rider name from localStorage or prompt
      const savedRiderName = localStorage.getItem("riderName");
      if (savedRiderName) {
        setRiderName(savedRiderName);
      } else {
        const name = prompt("Enter your rider name:");
        if (name) {
          setRiderName(name);
          localStorage.setItem("riderName", name);
        }
      }
    }
  }, []);

  useEffect(() => {
    // Set up real-time listener for orders only when authenticated
    if (!isAuthenticated) {
      return;
    }

    const ordersRef = collection(db, "orders");
    const q = query(ordersRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching orders:", error);
      alert("Failed to load orders.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (password === RIDER_ACCESS_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem("riderAuthenticated", "true");
      setPasswordError("");
      
      // Set rider name from localStorage or prompt
      const savedRiderName = localStorage.getItem("riderName");
      if (savedRiderName) {
        setRiderName(savedRiderName);
      } else {
        const name = prompt("Enter your rider name:");
        if (name) {
          setRiderName(name);
          localStorage.setItem("riderName", name);
        }
      }
    } else {
      setPasswordError("Incorrect password. Access denied.");
      setPassword("");
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      setIsAuthenticated(false);
      localStorage.removeItem("riderAuthenticated");
      setPassword("");
      setRiderName("");
      localStorage.removeItem("riderName");
    }
  };

  const handleAcceptOrder = async (orderId) => {
    if (!riderName) {
      alert("Please set your rider name first.");
      return;
    }

    if (!window.confirm("Are you sure you want to accept this order?")) {
      return;
    }

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "accepted",
        riderName: riderName,
        acceptedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert("Order accepted successfully!");
    } catch (error) {
      console.error("Error accepting order:", error);
      alert("Failed to accept order.");
    }
  };

  const handleStartDelivery = async (orderId) => {
    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "in_progress",
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert("Delivery started! You're now on the way.");
    } catch (error) {
      console.error("Error starting delivery:", error);
      alert("Failed to start delivery.");
    }
  };

  const handleCompleteDelivery = async (orderId) => {
    if (!window.confirm("Mark this order as delivered?")) {
      return;
    }

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        status: "delivered",
        deliveredAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      alert("Order marked as delivered!");
    } catch (error) {
      console.error("Error completing delivery:", error);
      alert("Failed to complete delivery.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "#ffc107";
      case "accepted":
        return "#17a2b8";
      case "in_progress":
        return "#007bff";
      case "delivered":
        return "#28a745";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  const getFilteredOrders = () => {
    switch (activeTab) {
      case "available":
        return orders.filter(order => order.status === "pending");
      case "accepted":
        return orders.filter(order => order.status === "accepted" && order.riderName === riderName);
      case "in_progress":
        return orders.filter(order => order.status === "in_progress" && order.riderName === riderName);
      case "delivered":
        return orders.filter(order => order.status === "delivered" && order.riderName === riderName);
      default:
        return [];
    }
  };

  const filteredOrders = getFilteredOrders();

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="rider-login-container">
        <div className="rider-login-box">
          <div className="login-icon">🚴</div>
          <h1>Rider Access</h1>
          <p className="login-subtitle">Enter password to access rider dashboard</p>
          <form onSubmit={handlePasswordSubmit} className="login-form">
            <input
              type="password"
              placeholder="Enter access password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              className="password-input"
              autoFocus
            />
            {passwordError && <p className="password-error">{passwordError}</p>}
            <button type="submit" className="login-btn">
              Access Dashboard
            </button>
          </form>
          <p className="login-hint">Default password: rider123</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rider-container">
        <div className="rider-header">
          <h1>🚴 Rider Dashboard</h1>
        </div>
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="rider-container">
      <div className="rider-header">
        <h1>🚴 Rider Dashboard</h1>
        <div className="rider-header-actions">
          {riderName && (
            <div className="rider-info">
              <span className="rider-name">Rider: {riderName}</span>
              <button 
                onClick={() => {
                  const newName = prompt("Enter new rider name:", riderName);
                  if (newName) {
                    setRiderName(newName);
                    localStorage.setItem("riderName", newName);
                  }
                }}
                className="change-rider-btn"
              >
                Change Name
              </button>
            </div>
          )}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="rider-tabs">
        <button
          className={`tab-btn ${activeTab === "available" ? "active" : ""}`}
          onClick={() => setActiveTab("available")}
        >
          Available ({orders.filter(o => o.status === "pending").length})
        </button>
        <button
          className={`tab-btn ${activeTab === "accepted" ? "active" : ""}`}
          onClick={() => setActiveTab("accepted")}
        >
          Accepted ({orders.filter(o => o.status === "accepted" && o.riderName === riderName).length})
        </button>
        <button
          className={`tab-btn ${activeTab === "in_progress" ? "active" : ""}`}
          onClick={() => setActiveTab("in_progress")}
        >
          In Progress ({orders.filter(o => o.status === "in_progress" && o.riderName === riderName).length})
        </button>
        <button
          className={`tab-btn ${activeTab === "delivered" ? "active" : ""}`}
          onClick={() => setActiveTab("delivered")}
        >
          Delivered ({orders.filter(o => o.status === "delivered" && o.riderName === riderName).length})
        </button>
      </div>

      {filteredOrders.length === 0 ? (
        <div className="no-orders">
          <p>
            {activeTab === "available" && "No available orders at the moment."}
            {activeTab === "accepted" && "You haven't accepted any orders yet."}
            {activeTab === "in_progress" && "No orders in progress."}
            {activeTab === "delivered" && "No delivered orders yet."}
          </p>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div className="order-status" style={{ backgroundColor: getStatusColor(order.status) }}>
                  {order.status?.toUpperCase().replace("_", " ") || "PENDING"}
                </div>
                <div className="order-date">
                  {new Date(order.createdAt).toLocaleString()}
                </div>
              </div>

              <div className="order-info">
                <div className="info-row">
                  <span className="info-label">📍 Pickup:</span>
                  <span className="info-value">{order.pickup?.address || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">🎯 Destination:</span>
                  <span className="info-value">{order.destination?.address || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📦 Delivery Details:</span>
                  <span className="info-value">{order.deliveryDetails || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">📏 Distance:</span>
                  <span className="info-value">{order.distance} km</span>
                </div>
                <div className="info-row">
                  <span className="info-label">💰 Price:</span>
                  <span className="info-value price">₱{order.price?.toLocaleString()}</span>
                </div>
                {order.riderName && (
                  <div className="info-row">
                    <span className="info-label">🚴 Assigned Rider:</span>
                    <span className="info-value">{order.riderName}</span>
                  </div>
                )}
                {order.acceptedAt && (
                  <div className="info-row">
                    <span className="info-label">✅ Accepted At:</span>
                    <span className="info-value">{new Date(order.acceptedAt).toLocaleString()}</span>
                  </div>
                )}
                {order.startedAt && (
                  <div className="info-row">
                    <span className="info-label">🚀 Started At:</span>
                    <span className="info-value">{new Date(order.startedAt).toLocaleString()}</span>
                  </div>
                )}
                {order.deliveredAt && (
                  <div className="info-row">
                    <span className="info-label">🎉 Delivered At:</span>
                    <span className="info-value">{new Date(order.deliveredAt).toLocaleString()}</span>
                  </div>
                )}
              </div>

              <div className="order-actions">
                {order.status === "pending" && (
                  <button
                    onClick={() => handleAcceptOrder(order.id)}
                    className="accept-btn"
                  >
                    Accept Order
                  </button>
                )}
                {order.status === "accepted" && order.riderName === riderName && (
                  <button
                    onClick={() => handleStartDelivery(order.id)}
                    className="start-btn"
                  >
                    Start Delivery
                  </button>
                )}
                {order.status === "in_progress" && order.riderName === riderName && (
                  <button
                    onClick={() => handleCompleteDelivery(order.id)}
                    className="complete-btn"
                  >
                    Mark as Delivered
                  </button>
                )}
                {order.status === "delivered" && (
                  <div className="delivered-badge">✓ Delivered</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

