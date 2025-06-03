
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapIcon as MapIconLucide } from 'lucide-react';
import { useMapboxMap } from '@/hooks/useMapboxMap';
import { processOrderLocations, Order } from '@/utils/nairobiMapUtils';
import MapTokenInput from './MapTokenInput';

interface NairobiOrdersMapProps {
  orders: Order[];
}

const NairobiOrdersMap: React.FC<NairobiOrdersMapProps> = ({ orders = [] }) => {
  const [mapboxToken, setMapboxToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapInitialized, setMapInitialized] = useState(false);

  const { mapContainer, initializeMap } = useMapboxMap();

  // Process order locations
  const locationData = useMemo(() => {
    console.log('Processing orders:', orders.length);
    const processed = processOrderLocations(orders);
    console.log('Processed locations:', processed);
    return processed;
  }, [orders]);

  const handleLoadMap = async () => {
    if (!mapboxToken.trim() || locationData.length === 0) {
      setMapError('Please enter a valid Mapbox token and ensure there are orders to display.');
      return;
    }
    
    setIsLoading(true);
    setMapError(null);
    
    try {
      console.log('Manual map initialization...');
      const success = await initializeMap(mapboxToken, locationData);
      
      if (success) {
        setMapInitialized(true);
      } else {
        setMapError('Failed to load map. Please check your token and internet connection.');
      }
    } catch (error) {
      console.error('Error in manual map initialization:', error);
      setMapError('Map initialization failed.');
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
        <div className="relative h-[400px] w-full">
          {!mapInitialized ? (
            <MapTokenInput
              mapboxToken={mapboxToken}
              setMapboxToken={setMapboxToken}
              onSubmit={handleLoadMap}
              isLoading={isLoading}
              locationData={locationData}
            />
          ) : (
            <>
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
              
              <div ref={mapContainer} className="h-full w-full rounded-lg border" style={{ minHeight: '400px' }} />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default NairobiOrdersMap;
