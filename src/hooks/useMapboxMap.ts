
import { useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
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
      console.error('Map container not found - container ref:', mapContainer.current);
      toast({
        title: "Error",
        description: "Map container not ready. Please try again.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Starting map initialization...');
      console.log('Map container element:', mapContainer.current);
      console.log('Mapbox token:', mapboxToken);
      
      // Import mapbox-gl module
      const mapboxgl = (await import('mapbox-gl')).default;
      
      // Import CSS
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      console.log('Mapbox module loaded successfully');

      // Set access token
      mapboxgl.accessToken = mapboxToken;
      console.log('Access token set');
      
      // Clear any existing map
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      
      // Initialize map
      console.log('Creating new map instance...');
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/light-v11',
        center: [36.8219, -1.2921], // Nairobi center
        zoom: 11,
        pitch: 0,
      });

      console.log('Map instance created successfully');

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl(),
        'top-right'
      );

      // Return a promise that resolves when the map is loaded
      return new Promise((resolve) => {
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
          
          resolve(true);
        });

        map.current.on('error', (e: any) => {
          console.error('Mapbox error:', e);
          toast({
            title: "Map Error",
            description: `Failed to load map: ${e.error?.message || 'Unknown error'}`,
            variant: "destructive"
          });
          resolve(false);
        });
      });
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
