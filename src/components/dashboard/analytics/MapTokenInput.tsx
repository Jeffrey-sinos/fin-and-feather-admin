
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin } from 'lucide-react';
import { LocationData } from '@/utils/nairobiMapUtils';

interface MapTokenInputProps {
  mapboxToken: string;
  setMapboxToken: (token: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  locationData: LocationData[];
}

const MapTokenInput: React.FC<MapTokenInputProps> = ({
  mapboxToken,
  setMapboxToken,
  onSubmit,
  isLoading,
  locationData
}) => {
  return (
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
          <Button onClick={onSubmit} size="sm" disabled={isLoading}>
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
  );
};

export default MapTokenInput;
