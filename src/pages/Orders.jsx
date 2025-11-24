import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Orders.css";

export default function Orders() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDetails, setEditDetails] = useState("");

  useEffect(() => {
    if (user) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user, location.pathname]); // Refresh when pathname changes (navigation)

  const fetchOrders = async () => {
    if (!user) return;
    
    try {
      // Try with orderBy first (requires composite index)
      const q = query(
        collection(db, "orders"), 
        where("userId", "==", user.id),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders with orderBy:", error);
      
      // Fallback: fetch without orderBy and sort in memory
      try {
        const fallbackQuery = query(
          collection(db, "orders"), 
          where("userId", "==", user.id)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const ordersData = fallbackSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Sort by createdAt in descending order (newest first)
        ordersData.sort((a, b) => {
          const dateA = new Date(a.createdAt || 0);
          const dateB = new Date(b.createdAt || 0);
          return dateB - dateA;
        });
        
        setOrders(ordersData);
      } catch (fallbackError) {
        console.error("Error fetching orders (fallback):", fallbackError);
        alert("Failed to load orders. Please refresh the page.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (order) => {
    setEditingOrder(order.id);
    setEditDetails(order.deliveryDetails);
  };

  const handleSaveEdit = async (orderId) => {
    if (!editDetails.trim()) {
      alert("Delivery details cannot be empty.");
      return;
    }

    try {
      const orderRef = doc(db, "orders", orderId);
      await updateDoc(orderRef, {
        deliveryDetails: editDetails.trim(),
        updatedAt: new Date().toISOString()
      });
      setEditingOrder(null);
      setEditDetails("");
      fetchOrders();
      alert("Order updated successfully!");
    } catch (error) {
      console.error("Error updating order:", error);
      alert("Failed to update order.");
    }
  };

  const handleCancelEdit = () => {
    setEditingOrder(null);
    setEditDetails("");
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "orders", orderId));
      fetchOrders();
      alert("Order cancelled successfully!");
    } catch (error) {
      console.error("Error cancelling order:", error);
      alert("Failed to cancel order.");
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
      case "confirmed":
        return "#28a745";
      case "cancelled":
        return "#dc3545";
      default:
        return "#6c757d";
    }
  };

  if (loading) {
    return (
      <div className="orders-container">
        <h1>My Orders</h1>
        <div className="loading">Loading orders...</div>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <h1>My Orders</h1>
      
      {orders.length === 0 ? (
        <div className="no-orders">
          <p>No orders yet. Create your first order from the Home page!</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
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
                  <span className="info-label">Pickup:</span>
                  <span className="info-value">{order.pickup?.address || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Destination:</span>
                  <span className="info-value">{order.destination?.address || "N/A"}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Distance:</span>
                  <span className="info-value">{order.distance} km</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Price:</span>
                  <span className="info-value price">₱{order.price?.toLocaleString()}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">Delivery Details:</span>
                  {editingOrder === order.id ? (
                    <div className="edit-section">
                      <input
                        type="text"
                        value={editDetails}
                        onChange={(e) => setEditDetails(e.target.value)}
                        className="edit-input"
                      />
                      <div className="edit-buttons">
                        <button onClick={() => handleSaveEdit(order.id)} className="save-btn">
                          Save
                        </button>
                        <button onClick={handleCancelEdit} className="cancel-edit-btn">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="info-value">{order.deliveryDetails || "N/A"}</span>
                  )}
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
                {editingOrder !== order.id && (
                  <>
                    {order.riderName && (
                      <button
                        onClick={() => navigate(`/chat?orderId=${order.id}`)}
                        className="chat-btn"
                      >
                        💬 Chat with Rider
                      </button>
                    )}
                    <button
                      onClick={() => handleEdit(order)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      className="cancel-btn"
                    >
                      Cancel Order
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

