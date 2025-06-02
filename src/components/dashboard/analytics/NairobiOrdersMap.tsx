
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
  const [mapboxToken, setMapboxToken] = useState('pk.eyJ1IjoiamVmMjUiLCJhIjoiY21iZHp1bTIzMHVhdTJqcW5rZGJmMmphcyJ9.PekGHROecq3wkVAerCwfXw');
  const [isTokenSet, setIsTokenSet] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { mapContainer, initializeMap } = useMapboxMap();

  // Process order locations
  const locationData = useMemo(() => processOrderLocations(orders), [orders]);

  const handleTokenSubmit = async () => {
    setIsLoading(true);
    
    const success = await initializeMap(mapboxToken, locationData);
    if (success) {
      setIsTokenSet(true);
    }
    
    setIsLoading(false);
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
          <MapTokenInput
            mapboxToken={mapboxToken}
            setMapboxToken={setMapboxToken}
            onSubmit={handleTokenSubmit}
            isLoading={isLoading}
            locationData={locationData}
          />
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
