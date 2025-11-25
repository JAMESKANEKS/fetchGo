import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { collection, addDoc, query, where, onSnapshot, doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase";
import { useAuth } from "../../context/AuthContext";
import "../Chat.css";

export default function RiderChat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const { rider } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  useEffect(() => {
    if (orderId && rider) {
      fetchOrder();
      const unsubscribe = setupMessagesListener();
      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else if (orderId && !rider) {
      setLoading(false);
    }
  }, [orderId, rider]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchOrder = async () => {
    try {
      const orderDoc = await getDoc(doc(db, "orders", orderId));
      if (orderDoc.exists()) {
        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        setOrder(orderData);
        
        // Verify this order is assigned to the current rider
        if (orderData.riderName?.trim().toLowerCase() !== rider.fullName?.trim().toLowerCase()) {
          alert("You don't have access to this order.");
          navigate(-1);
          return;
        }
        
        // Set customer name
        setCustomerName(orderData.customerName || "Customer");
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

  const setupMessagesListener = () => {
    if (!orderId) return null;

    const messagesRef = collection(db, "messages");
    const q = query(
      messagesRef,
      where("orderId", "==", orderId)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const messagesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        let timestamp = data.timestamp;
        if (timestamp?.toDate) {
          timestamp = timestamp.toDate().toISOString();
        } else if (timestamp && typeof timestamp === 'string') {
          timestamp = timestamp;
        } else if (data.createdAt) {
          timestamp = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
        }
        
        return {
          id: doc.id,
          ...data,
          timestamp: timestamp
        };
      });
      
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
    if (!newMessage.trim() || !rider || !orderId) return;

    try {
      const now = Timestamp.now();
      await addDoc(collection(db, "messages"), {
        orderId: orderId,
        senderId: rider.id,
        senderName: rider.fullName || "Rider",
        senderType: "rider",
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

  if (!rider) {
    return (
      <div className="chat-container">
        <div className="error-message">
          Please login as a rider to access chat.
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
          <h2>Chat with {customerName}</h2>
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
            // Rider's own messages are those with senderType "rider" and matching name
            const isOwnMessage = message.senderType === "rider" && 
                                 message.senderName?.trim().toLowerCase() === rider.fullName?.trim().toLowerCase();
            
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
          disabled={!rider}
        />
        <button type="submit" className="send-button" disabled={!newMessage.trim() || !rider}>
          Send
        </button>
      </form>
    </div>
  );
}



