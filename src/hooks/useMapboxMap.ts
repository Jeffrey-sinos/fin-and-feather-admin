
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

    try {
      // Import mapbox-gl CSS first
      await import('mapbox-gl/dist/mapbox-gl.css');
      
      // Then import the mapbox-gl module
      const mapboxgl = await import('mapbox-gl');
      
      if (!mapContainer.current) {
        return false;
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
          const coordinates = getCoordinatesForLocation(location.address);
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

        toast({
          title: "Success",
          description: "Map loaded successfully!",
        });
      });

      map.current.on('error', (e: any) => {
        console.error('Mapbox error:', e);
        toast({
          title: "Error",
          description: "Failed to load map. Please check your Mapbox token.",
          variant: "destructive"
        });
      });

      return true;
    } catch (error) {
      console.error('Error loading map:', error);
      toast({
        title: "Error",
        description: "Failed to initialize map. Error: " + (error as Error).message,
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
