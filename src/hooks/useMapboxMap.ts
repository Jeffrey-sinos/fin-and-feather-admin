
import { useRef, useCallback } from 'react';
import { toast } from '@/components/ui/use-toast';
import { LocationData, getCoordinatesForLocation } from '@/utils/nairobiMapUtils';

export const useMapboxMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  const initializeMap = useCallback(async (mapboxToken: string, locationData: LocationData[]) => {
    if (!mapboxToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid Mapbox token",
        variant: "destructive"
      });
      return false;
    }

    if (!mapContainer.current) {
      console.error('Map container not found');
      return false;
    }

    try {
      console.log('Starting map initialization...');
      console.log('Mapbox token:', mapboxToken);
      
      // Import mapbox-gl module
      const mapboxgl = (await import('mapbox-gl')).default;
      
      // Import CSS
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      console.log('Mapbox module loaded successfully');

      // Set access token
      mapboxgl.accessToken = mapboxToken;
      console.log('Access token set');
      
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [36.8219, -1.2921], // Nairobi center
        zoom: 11,
        pitch: 0,
      });

      console.log('Map instance created');

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Set up event listeners
      map.current.on('load', () => {
        console.log('Map loaded successfully, adding markers...');
        
        // Add markers for each location
        locationData.forEach((location: LocationData, index: number) => {
          const coordinates = getCoordinatesForLocation(location.address);
          console.log(`Adding marker ${index + 1} for:`, location.address, 'at:', coordinates);

          // Create a marker
          const marker = new mapboxgl.Marker({
            color: '#0EA5E9',
            scale: Math.min(2, 0.5 + (location.count / 5))
          })
            .setLngLat(coordinates)
            .setPopup(
              new mapboxgl.Popup({ offset: 25 })
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

        console.log(`Added ${locationData.length} markers to the map`);
        
        toast({
          title: "Success",
          description: "Map loaded successfully!",
        });
      });

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e);
        toast({
          title: "Map Error",
          description: `Failed to load map: ${e.error?.message || 'Unknown error'}`,
          variant: "destructive"
        });
      });

      map.current.on('styledata', () => {
        console.log('Map style loaded');
      });

      map.current.on('sourcedata', () => {
        console.log('Map source data loaded');
      });

      return true;
    } catch (error) {
      console.error('Error initializing map:', error);
      toast({
        title: "Initialization Error",
        description: `Failed to initialize map: ${(error as Error).message}`,
        variant: "destructive"
      });
      return false;
    }
  }, []);

  return {
    mapContainer,
    map,
    initializeMap
  };
};
