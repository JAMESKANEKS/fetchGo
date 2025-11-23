import { useAuth } from "../context/AuthContext";
import "./Menu.css";

export default function Menu() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  return (
    <div className="menu-container">
      <h1>Menu</h1>
      
      {user && (
        <div className="user-info-section">
          <div className="user-info-card">
            <div className="user-icon">👤</div>
            <div className="user-details">
              <h2>{user.fullName}</h2>
              <p>{user.phoneNumber}</p>
            </div>
          </div>
        </div>
      )}

      <div className="menu-options">
        <div className="menu-card">
          <div className="menu-icon">ℹ️</div>
          <h2>About</h2>
          <p>FetchGo Delivery App - Fast and reliable delivery service</p>
        </div>
      </div>

      {user && (
        <div className="logout-section">
          <button onClick={handleLogout} className="logout-button">
            <span className="logout-icon">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}

