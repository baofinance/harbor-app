"use client";

import React, { createContext, useContext } from"react";

interface Addresses {
 minter: string;
 priceOracle: string;
}

const AddressesContext = createContext<{ addresses: Addresses }>({
 addresses: {
 minter:"0x0000000000000000000000000000000000000000",
 priceOracle:"0x0000000000000000000000000000000000000000",
 },
});

export function AddressesProvider({ children }: { children: React.ReactNode }) {
 // In a real app, these addresses would come from a configuration file or environment variables
 const addresses: Addresses = {
 minter:"0x0000000000000000000000000000000000000000", // Replace with actual address
 priceOracle:"0x0000000000000000000000000000000000000000", // Replace with actual address
 };

 return (
 <AddressesContext.Provider value={{ addresses }}>
 {children}
 </AddressesContext.Provider>
 );
}

export function useAddresses() {
 const context = useContext(AddressesContext);
 if (!context) {
 throw new Error("useAddresses must be used within an AddressesProvider");
 }
 return context;
}
