import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { OrderProvider } from "./context/OrderContext";
import Home from "./pages/Home";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Navigation from "./components/Navigation";
import "./index.css";

export default function App() {
  return (
    <OrderProvider>
      <Router>
        <div className="app-wrapper">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/menu" element={<Menu />} />
          </Routes>
          <Navigation />
        </div>
      </Router>
    </OrderProvider>
  );
}
