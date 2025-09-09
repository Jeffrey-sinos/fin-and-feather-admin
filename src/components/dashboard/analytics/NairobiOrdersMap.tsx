
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapIcon as MapIconLucide } from 'lucide-react';
import { useMapboxMap } from '@/hooks/useMapboxMap';
import { processOrderLocations, Order } from '@/utils/nairobiMapUtils';
import MapTokenInput from './MapTokenInput';

interface NairobiOrdersMapProps {
  orders: Order[];
}

const getMapboxToken = (): string => {
  // First check environment variable
  const envToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN;
  if (envToken && envToken.trim()) {
    return envToken.trim();
  }
  
  // Then check localStorage
  const storedToken = localStorage.getItem('mapbox_token');
  if (storedToken && storedToken.trim()) {
    return storedToken.trim();
  }
  
  return '';
};

const NairobiOrdersMap: React.FC<NairobiOrdersMapProps> = ({ orders = [] }) => {
  const [mapboxToken, setMapboxToken] = useState(getMapboxToken());
  const [showMap, setShowMap] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { mapContainer, initializeMap } = useMapboxMap();

  // Process order locations
  const locationData = useMemo(() => {
    console.log('Processing orders:', orders.length);
    const processed = processOrderLocations(orders);
    console.log('Processed locations:', processed);
    return processed;
  }, [orders]);

  // Auto-initialize map if token is available
  useEffect(() => {
    if (mapboxToken && mapboxToken.trim() && !showMap && locationData.length > 0) {
      handleTokenSubmit();
    }
  }, [mapboxToken, locationData]);

  const handleTokenSubmit = async () => {
    console.log('=== BUTTON CLICKED ===');
    console.log('Token to use:', mapboxToken);
    console.log('Location data:', locationData);
    
    if (!mapboxToken.trim()) {
      console.error('Empty token');
      return;
    }
    
    // Store token in localStorage for future use
    localStorage.setItem('mapbox_token', mapboxToken.trim());
    
    setIsLoading(true);
    setShowMap(true);
    
    try {
      // Wait a bit for DOM to update
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Starting map initialization...');
      const success = await initializeMap(mapboxToken, locationData);
      
      if (!success) {
        console.log('Map initialization failed, hiding map');
        setShowMap(false);
      } else {
        console.log('Map initialization successful');
      }
    } catch (error) {
      console.error('Error in handleTokenSubmit:', error);
      setShowMap(false);
    } finally {
      setIsLoading(false);
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
        {!showMap ? (
          <MapTokenInput
            mapboxToken={mapboxToken}
            setMapboxToken={setMapboxToken}
            onSubmit={handleTokenSubmit}
            isLoading={isLoading}
            locationData={locationData}
          />
        ) : (
          <div className="relative h-[400px] w-full">
            {isLoading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
            <div ref={mapContainer} className="h-full w-full rounded-lg border" style={{ minHeight: '400px' }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NairobiOrdersMap;
