
import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapIcon as MapIconLucide, MapPin } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

interface Order {
  id: string;
  total_amount: number;
  created_at: string;
  profiles: {
    address: string;
    full_name: string;
  };
}

interface LocationData {
  address: string;
  orders: Order[];
  totalValue: number;
  count: number;
}

interface NairobiOrdersMapProps {
  orders: Order[];
}

const NairobiOrdersMap: React.FC<NairobiOrdersMapProps> = ({ orders = [] }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const [mapboxToken, setMapboxToken] = useState('pk.eyJ1IjoiamVmMjUiLCJhIjoiY21iZHp1bTIzMHVhdTJqcW5rZGJmMmphcyJ9.PekGHROecq3wkVAerCwfXw');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Process order locations
  const locationData = React.useMemo(() => {
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
  }, [orders]);

  // Nairobi area coordinates (approximate)
  const nairobiAreas: Record<string, [number, number]> = {
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

  const handleTokenSubmit = async () => {
    if (!mapboxToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Mapbox token",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      // Import mapbox-gl CSS first
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      // Then import the mapbox-gl module
      const mapboxgl = await import('mapbox-gl');
      
      if (!mapContainer.current) {
        setIsLoading(false);
        return;
      }

      console.log('Mapbox module loaded:', mapboxgl);
      console.log('Setting access token:', mapboxToken);

      // Set access token on the default export
      mapboxgl.default.accessToken = mapboxToken;
      
      console.log('Creating map...');
      
      // Initialize map
      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [36.8219, -1.2921], // Nairobi center
        zoom: 11,
        pitch: 0,
      });

      console.log('Map created:', map.current);

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.default.NavigationControl(),
        'top-right'
      );

      map.current.on('load', () => {
        console.log('Map loaded successfully');
        
        // Add markers for each location
        locationData.forEach((location: LocationData) => {
          // Try to find coordinates for the area
          let coordinates: [number, number] = [36.8219, -1.2921]; // Default to Nairobi center
          
          const areaName = Object.keys(nairobiAreas).find(area => 
            location.address.toLowerCase().includes(area)
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

          console.log('Adding marker for:', location.address, 'at:', coordinates);

          // Create a marker
          const marker = new mapboxgl.default.Marker({
            color: '#0EA5E9',
            scale: Math.min(2, 0.5 + (location.count / 5))
          })
            .setLngLat(coordinates)
            .setPopup(
              new mapboxgl.default.Popup({ offset: 25 })
                .setHTML(`
                  <div class="p-2">
                    <h3 class="font-bold">${location.address}</h3>
                    <p class="text-sm">Orders: ${location.count}</p>
                    <p class="text-sm">Total Value: $${location.totalValue.toFixed(2)}</p>
                  </div>
                `)
            )
            .addTo(map.current);
        });

        setIsTokenSet(true);
        setIsLoading(false);
        toast({
          title: "Success",
          description: "Map loaded successfully!",
        });
      });

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e);
        setIsLoading(false);
        toast({
          title: "Error",
          description: "Failed to load map. Please check your Mapbox token.",
          variant: "destructive"
        });
      });

    } catch (error) {
      console.error('Error loading map:', error);
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to initialize map. Error: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">Nairobi Orders Distribution</CardTitle>
          <MapIconLucide className="h-4 w-4 text-blue-500" />
        </div>
        <CardDescription>Geographic distribution of orders across Nairobi</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        {!isTokenSet ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Setup Required</h4>
              <p className="text-sm text-blue-700 mb-3">
                To view the Nairobi orders map, please enter your Mapbox public token. 
                You can get one for free at <a href="https://mapbox.com" target="_blank" rel="noopener noreferrer" className="underline">mapbox.com</a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Enter your Mapbox public token..."
                  value={mapboxToken}
                  onChange={(e) => setMapboxToken(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleTokenSubmit} size="sm" disabled={isLoading}>
                  {isLoading ? "Loading..." : "Load Map"}
                </Button>
              </div>
            </div>
            
            {/* Show location summary without map */}
            <div className="space-y-2">
              <h4 className="font-medium">Order Locations Summary:</h4>
              {locationData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {locationData.map((location: LocationData, index: number) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">{location.address}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {location.count} orders (${location.totalValue.toFixed(2)})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No order location data available.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-[400px] w-full">
            <div ref={mapContainer} className="h-full w-full rounded-lg" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NairobiOrdersMap;
