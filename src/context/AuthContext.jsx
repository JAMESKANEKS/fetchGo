import { createContext, useContext, useState, useEffect } from "react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";

const AuthContext = createContext(undefined);

// Simple hash function for password (in production, use Firebase Auth or proper hashing)
function hashPassword(password) {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString();
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in from localStorage
    const savedUser = localStorage.getItem("customerUser");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("customerUser");
      }
    }
    setLoading(false);
  }, []);

  const signup = async (fullName, phoneNumber, password) => {
    try {
      // Check if phone number already exists
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error("Phone number already registered. Please login instead.");
      }

      // Create new user
      const hashedPassword = hashPassword(password);
      const userData = {
        fullName,
        phoneNumber,
        password: hashedPassword,
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "users"), userData);
      
      const newUser = {
        id: docRef.id,
        ...userData
      };

      // Don't store password in user object
      delete newUser.password;
      setUser(newUser);
      localStorage.setItem("customerUser", JSON.stringify(newUser));
      
      return { success: true };
    } catch (error) {
      console.error("Signup error:", error);
      return { success: false, error: error.message };
    }
  };

  const login = async (phoneNumber, password) => {
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("phoneNumber", "==", phoneNumber));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        return { success: false, error: "Phone number not found. Please sign up first." };
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const hashedPassword = hashPassword(password);

      if (userData.password !== hashedPassword) {
        return { success: false, error: "Incorrect password." };
      }

      const user = {
        id: userDoc.id,
        fullName: userData.fullName,
        phoneNumber: userData.phoneNumber
      };

      setUser(user);
      localStorage.setItem("customerUser", JSON.stringify(user));
      
      return { success: true };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "Login failed. Please try again." };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("customerUser");
  };

  const value = {
    user,
    signup,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

