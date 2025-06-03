
import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapIcon as MapIconLucide } from 'lucide-react';
import { useMapboxMap } from '@/hooks/useMapboxMap';
import { processOrderLocations, Order } from '@/utils/nairobiMapUtils';

interface NairobiOrdersMapProps {
  orders: Order[];
}

const NairobiOrdersMap: React.FC<NairobiOrdersMapProps> = ({ orders = [] }) => {
  // Use your specific Mapbox token
  const [mapboxToken] = useState('pk.eyJ1Ijoia2lnZW4yOSIsImEiOiJjbWJnYWxvZzQwaHUwMmxzaGd2czZldjlhIn0.xuT1VouYkYI5xxW6V_wgdw');
  const [isLoading, setIsLoading] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  const { mapContainer, initializeMap } = useMapboxMap();

  // Process order locations
  const locationData = useMemo(() => {
    console.log('Processing orders:', orders.length);
    const processed = processOrderLocations(orders);
    console.log('Processed locations:', processed);
    return processed;
  }, [orders]);

  // Auto-initialize map when component mounts
  useEffect(() => {
    const loadMap = async () => {
      if (!mapboxToken.trim() || locationData.length === 0) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setMapError(null);
      
      try {
        // Wait a bit for DOM to update
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log('Auto-initializing map...');
        const success = await initializeMap(mapboxToken, locationData);
        
        if (!success) {
          setMapError('Failed to load map. Please check your internet connection.');
        }
      } catch (error) {
        console.error('Error in auto map initialization:', error);
        setMapError('Map initialization failed.');
      } finally {
        setIsLoading(false);
      }
    };

    loadMap();
  }, [mapboxToken, locationData, initializeMap]);

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
          
          {mapError && (
            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center rounded-lg border">
              <div className="text-center p-4">
                <p className="text-sm text-red-600 mb-2">{mapError}</p>
                <p className="text-xs text-gray-500">Check console for more details</p>
              </div>
            </div>
          )}
          
          {locationData.length === 0 && !isLoading && (
            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center rounded-lg border">
              <div className="text-center p-4">
                <p className="text-sm text-gray-600">No orders with Nairobi addresses found</p>
              </div>
            </div>
          )}
          
          <div ref={mapContainer} className="h-full w-full rounded-lg border" style={{ minHeight: '400px' }} />
        </div>
      </CardContent>
    </Card>
  );
};

export default NairobiOrdersMap;
