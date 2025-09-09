
import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapIcon as MapIconLucide } from 'lucide-react';
import { useMapboxMap } from '@/hooks/useMapboxMap';
import { processOrderLocations, Order } from '@/utils/nairobiMapUtils';

interface NairobiOrdersMapProps {
  orders: Order[];
}

const getMapboxToken = (): string => {
  // First check environment variable
  const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
  if (envToken && envToken.trim()) {
    return envToken.trim();
  }
  
  // Default working token
  return 'pk.eyJ1IjoiamVmMjUiLCJhIjoiY21iZTBram5lMXoweDJtczl1eWRkZ2dvbSJ9.ENpvIUyFAxCR1Q9nL0O9jg';
};

const NairobiOrdersMap: React.FC<NairobiOrdersMapProps> = ({ orders = [] }) => {
  const [isLoading, setIsLoading] = useState(true);

  const { mapContainer, initializeMap } = useMapboxMap();

  // Process order locations
  const locationData = useMemo(() => {
    console.log('Processing orders:', orders.length);
    const processed = processOrderLocations(orders);
    console.log('Processed locations:', processed);
    return processed;
  }, [orders]);

  // Auto-initialize map when location data is available
  useEffect(() => {
    const initMap = async () => {
      if (locationData.length > 0) {
        setIsLoading(true);
        
        try {
          // Wait a bit for DOM to update
          await new Promise(resolve => setTimeout(resolve, 100));
          
          const mapboxToken = getMapboxToken();
          console.log('Initializing map with token and location data:', locationData.length, 'locations');
          
          const success = await initializeMap(mapboxToken, locationData);
          
          if (!success) {
            console.log('Map initialization failed');
          } else {
            console.log('Map initialization successful');
          }
        } catch (error) {
          console.error('Error initializing map:', error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    initMap();
  }, [locationData, initializeMap]);

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
        <div className="relative h-[400px] w-full">
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading map...</p>
              </div>
            </div>
          )}
          {locationData.length > 0 ? (
            <div ref={mapContainer} className="h-full w-full rounded-lg border" style={{ minHeight: '400px' }} />
          ) : (
            <div className="h-full w-full rounded-lg border flex items-center justify-center bg-gray-50">
              <p className="text-sm text-muted-foreground">No order location data available</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NairobiOrdersMap;
