import { useState, useEffect } from "react";
import { collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import "./Orders.css";

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingOrder, setEditingOrder] = useState(null);
  const [editDetails, setEditDetails] = useState("");

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const ordersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData);
    } catch (error) {
      console.error("Error fetching orders:", error);
      alert("Failed to load orders.");
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
                  {order.status?.toUpperCase() || "PENDING"}
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
              </div>

              <div className="order-actions">
                {editingOrder !== order.id && (
                  <>
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

