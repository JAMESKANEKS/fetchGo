import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function RiderSignup() {
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [driverLicenceNumber, setDriverLicenceNumber] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { riderSignup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim() || !phoneNumber.trim() || !plateNumber.trim() || 
        !driverLicenceNumber.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const result = await riderSignup(
      fullName.trim(), 
      phoneNumber.trim(), 
      plateNumber.trim(),
      driverLicenceNumber.trim(),
      password
    );
    setLoading(false);

    if (result.success) {
      navigate("/rider");
    } else {
      setError(result.error || "Signup failed. Please try again.");
    }
  };

  return (
    <div className="auth-container">
      <header>
        <h1>Fetch<span>Go</span> - Rider App</h1>
      </header>

      <div className="container2">
        <div className="auth-box">
          <div className="auth-icon">🚴</div>
          <h1>Rider Sign Up</h1>
          <p className="auth-subtitle">Create your rider account</p>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="phoneNumber">Phone Number</label>
              <input
                id="phoneNumber"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="plateNumber">Plate Number</label>
              <input
                id="plateNumber"
                type="text"
                placeholder="Enter your vehicle plate number"
                value={plateNumber}
                onChange={(e) => setPlateNumber(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="driverLicenceNumber">Driver Licence Number</label>
              <input
                id="driverLicenceNumber"
                type="text"
                placeholder="Enter your driver licence number"
                value={driverLicenceNumber}
                onChange={(e) => setDriverLicenceNumber(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>
          
          <p className="auth-link">
            Already have an account? <Link to="/rider-login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

