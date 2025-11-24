import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { OrderProvider } from "./context/OrderContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Rider from "./pages/Rider";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import RiderLogin from "./pages/RiderLogin";
import RiderSignup from "./pages/RiderSignup";
import LocationPicker from "./pages/LocationPicker";
import OrderMapView from "./pages/OrderMapView";
import CustomerChat from "./pages/customer/CustomerChat";
import RiderChat from "./pages/rider/RiderChat";
import Navigation from "./components/Navigation";
import "./index.css";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div style={{ padding: "20px", textAlign: "center" }}>Loading...</div>;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppContent() {
  const location = useLocation();
  const isRiderPage = location.pathname === "/rider";
  const isAuthPage = location.pathname === "/login" || 
                     location.pathname === "/signup" || 
                     location.pathname === "/rider-login" || 
                     location.pathname === "/rider-signup";
  const isLocationPicker = location.pathname === "/location-picker";
  const isOrderMapView = location.pathname === "/order-map";
  const isChatPage = location.pathname === "/chat" || location.pathname === "/rider-chat";

  return (
    <div className="app-wrapper">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/rider-login" element={<RiderLogin />} />
        <Route path="/rider-signup" element={<RiderSignup />} />
        <Route 
          path="/location-picker" 
          element={
            <ProtectedRoute>
              <LocationPicker />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/order-map" 
          element={<OrderMapView />} 
        />
        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <CustomerChat />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/rider-chat" 
          element={<RiderChat />} 
        />
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/orders" 
          element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/menu" 
          element={
            <ProtectedRoute>
              <Menu />
            </ProtectedRoute>
          } 
        />
        <Route path="/rider" element={<Rider />} />
      </Routes>
      {!isRiderPage && !isAuthPage && !isLocationPicker && !isOrderMapView && !isChatPage && <Navigation />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <OrderProvider>
        <Router>
          <AppContent />
        </Router>
      </OrderProvider>
    </AuthProvider>
  );
}
