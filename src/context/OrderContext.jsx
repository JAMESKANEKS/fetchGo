import { createContext, useContext, useState } from "react";

const OrderContext = createContext(undefined);

export function OrderProvider({ children }) {
  const [canSubmit, setCanSubmit] = useState(false);
  const [onSubmit, setOnSubmit] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryDetails, setDeliveryDetails] = useState("");
  const [pickup, setPickup] = useState(null);
  const [destination, setDestination] = useState(null);

  const value = {
    canSubmit, 
    setCanSubmit, 
    onSubmit, 
    setOnSubmit, 
    isSubmitting, 
    setIsSubmitting,
    deliveryDetails,
    setDeliveryDetails,
    pickup,
    setPickup,
    destination,
    setDestination
  };

  return (
    <OrderContext.Provider value={value}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrder() {
  const context = useContext(OrderContext);
  if (context === undefined) {
    throw new Error("useOrder must be used within an OrderProvider");
  }
  return context;
}

