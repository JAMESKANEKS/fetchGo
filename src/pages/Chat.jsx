import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, query, where, orderBy, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Chat.css";

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { user: customerUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [otherPartyName, setOtherPartyName] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Determine current user (customer or rider)
  const { rider } = useAuth();
  
  useEffect(() => {
    if (customerUser) {
      setCurrentUser(customerUser);
    } else if (rider) {
      setCurrentUser({
        id: rider.id,
        fullName: rider.fullName,
        isRider: true
      });
    } else {
      setCurrentUser(null);
    }
  }, [customerUser, rider]);

  useEffect(() => {
    if (orderId && currentUser) {
      fetchOrder();
      const unsubscribe = setupMessagesListener();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else if (orderId && !currentUser) {
      setLoading(false);
    }
  }, [orderId, currentUser]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchOrder = async () => {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (orderDoc.exists()) {
        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        setOrder(orderData);
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

  // Update other party name when order or currentUser changes
  useEffect(() => {
    if (order && currentUser) {
      // If user is the customer
      if (!currentUser.isRider && order.userId === currentUser.id) {
        setOtherPartyName(order.riderName || "Rider");
      } 
      // If user is the rider - always show customer name (for accepted orders)
      else if (currentUser.isRider) {
        // Show customer name if order has a rider assigned (accepted order)
        if (order.riderName && order.customerName) {
          setOtherPartyName(order.customerName);
        } else if (order.customerName) {
          setOtherPartyName(order.customerName);
        } else {
          setOtherPartyName("Customer");
        }
      }
    }
  }, [order, currentUser]);

  const setupMessagesListener = () => {
    if (!orderId) return null;

    const messagesRef = collection(db, "messages");
    
    // Query without orderBy first to avoid index issues, then sort in memory
    const q = query(
      messagesRef,
      where("orderId", "==", orderId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        // Convert Firestore Timestamp to ISO string for consistent handling
        let timestamp = data.timestamp;
        if (timestamp?.toDate) {
          timestamp = timestamp.toDate().toISOString();
        } else if (timestamp && typeof timestamp === 'string') {
          // Already an ISO string
          timestamp = timestamp;
        } else if (data.createdAt) {
          // Fallback to createdAt
          timestamp = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp: timestamp
        };
      });
      
      // Sort by timestamp (ascending - oldest first)
      messagesData.sort((a, b) => {
        const timeA = new Date(a.timestamp || 0).getTime();
        const timeB = new Date(b.timestamp || 0).getTime();
        return timeA - timeB;
      });
      
      setMessages(messagesData);
    }, (error) => {
      console.error("Error listening to messages:", error);
      alert("Failed to load messages. Please refresh the page.");
    });

    return unsubscribe;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUser || !orderId) return;

    try {
      const now = Timestamp.now();
      // Determine sender type more precisely
      let senderType = "customer"; // default
      if (currentUser.isRider) {
        // If current user is a rider, they're sending as rider
        senderType = "rider";
      } else if (order?.userId === currentUser.id) {
        // If current user's ID matches order's userId, they're the customer
        senderType = "customer";
      }
      
      await addDoc(collection(db, "messages"), {
        orderId: orderId,
        senderId: currentUser.id,
        senderName: currentUser.fullName || "User",
        senderType: senderType,
        message: newMessage.trim(),
        timestamp: now,
        createdAt: now
      });
      setNewMessage("");
    } catch (error) {
      console.error("Error sending message:", error);
      alert("Failed to send message. Please try again.");
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="chat-container">
        <div className="loading">Loading chat...</div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="chat-container">
        <div className="error-message">
          Please login as a customer or rider to access chat.
        </div>
        <button onClick={() => navigate(-1)} className="back-btn">
          Go Back
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="chat-container">
        <div className="error-message">Order not found.</div>
        <button onClick={() => navigate(-1)} className="back-btn">
          Go Back
        </button>
      </div>
    );
  }

  // Check if order is accepted (has rider)
  if (!order.riderName) {
    return (
      <div className="chat-container">
        <div className="error-message">
          Chat is only available after a rider accepts the order.
        </div>
        <button onClick={() => navigate(-1)} className="back-btn">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <div className="chat-header-info">
          <h2>Chat with {otherPartyName || (currentUser?.isRider ? (order?.customerName || "Customer") : (order?.riderName || "Rider"))}</h2>
          <p className="chat-order-info">Order #{orderId.substring(0, 8)}</p>
        </div>
        <div style={{ width: "60px" }}></div>
      </div>

      <div className="messages-container" ref={messagesContainerRef}>
        {messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            // Check if message is from current user
            let isOwnMessage = false;
            if (currentUser && order) {
              if (!currentUser.isRider) {
                // Customer: message is own if senderId matches AND senderType is "customer"
                isOwnMessage = (message.senderId === currentUser.id || 
                               (message.senderType === "customer" && order.userId === currentUser.id));
              } else {
                // Rider: message is own if:
                // 1. senderId matches (primary check), OR
                // 2. senderType is "rider" AND senderName matches current rider's name
                const senderIdMatches = message.senderId === currentUser.id;
                const senderNameMatches = message.senderName?.trim().toLowerCase() === currentUser.fullName?.trim().toLowerCase();
                const isRiderMessage = message.senderType === "rider";
                const orderRiderMatches = order.riderName?.trim().toLowerCase() === currentUser.fullName?.trim().toLowerCase();
                
                isOwnMessage = senderIdMatches || 
                               (isRiderMessage && senderNameMatches && orderRiderMatches);
              }
            }
            return (
              <div
                key={message.id}
                className={`message ${isOwnMessage ? "own-message" : "other-message"}`}
              >
                <div className="message-content">
                  <div className="message-sender">
                    {!isOwnMessage && <span>{message.senderName}</span>}
                  </div>
                  <div className="message-text">{message.message}</div>
                  <div className="message-time">
                    {message.timestamp 
                      ? new Date(message.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : message.createdAt
                      ? (message.createdAt?.toDate 
                          ? message.createdAt.toDate().toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : new Date(message.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            }))
                      : ""}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="chat-input"
          disabled={!currentUser}
        />
        <button type="submit" className="send-button" disabled={!newMessage.trim() || !currentUser}>
          Send
        </button>
      </form>
    </div>
  );
}

