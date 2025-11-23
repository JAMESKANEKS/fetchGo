import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { OrderProvider } from "./context/OrderContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Rider from "./pages/Rider";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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
  const isAuthPage = location.pathname === "/login" || location.pathname === "/signup";

  return (
    <div className="app-wrapper">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
      {!isRiderPage && !isAuthPage && <Navigation />}
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
