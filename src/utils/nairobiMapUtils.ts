
export interface LocationData {
  address: string;
  orders: any[];
  totalValue: number;
  count: number;
}

export interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  profiles: {
    address: string;
    full_name: string;
  };
}

// Nairobi area coordinates (approximate)
export const nairobiAreas: Record<string, [number, number]> = {
  'westlands': [-1.2672, 36.8107],
  'karen': [-1.3197, 36.6859],
  'kilimani': [-1.2921, 36.7874],
  'kasarani': [-1.2258, 36.8956],
  'embakasi': [-1.3185, 36.8951],
  'cbd': [-1.2841, 36.8155],
  'runda': [-1.2108, 36.8047],
  'lavington': [-1.2833, 36.7681],
  'upperhill': [-1.2972, 36.8194],
  'gigiri': [-1.2387, 36.7935]
};

export const processOrderLocations = (orders: Order[]): LocationData[] => {
  const locationMap: Map<string, LocationData> = new Map();
  
  orders.forEach(order => {
    const address = order.profiles?.address;
    if (address && address.toLowerCase().includes('nairobi')) {
      const key = address.toLowerCase();
      const existing = locationMap.get(key) || { 
        address, 
        orders: [], 
        totalValue: 0, 
        count: 0 
      };
      
      existing.orders.push(order);
      existing.totalValue += Number(order.total_amount);
      existing.count += 1;
      locationMap.set(key, existing);
    }
  });
  
  return Array.from(locationMap.values());
};

export const getCoordinatesForLocation = (address: string): [number, number] => {
  // Try to find coordinates for the area
  let coordinates: [number, number] = [36.8219, -1.2921]; // Default to Nairobi center
  
  const areaName = Object.keys(nairobiAreas).find(area => 
    address.toLowerCase().includes(area)
  );
  
  if (areaName) {
    const coords = nairobiAreas[areaName];
    coordinates = [coords[1], coords[0]]; // Swap lat/lng for mapbox
  } else {
    // Add some random offset for areas we don't have exact coordinates
    coordinates = [
      36.8219 + (Math.random() - 0.5) * 0.1,
      -1.2921 + (Math.random() - 0.5) * 0.1
    ];
  }
  
  return coordinates;
};
