
import { useRef, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { LocationData, getCoordinatesForLocation } from '@/utils/nairobiMapUtils';

export const useMapboxMap = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);

  const initializeMap = useCallback(async (mapboxToken: string, locationData: LocationData[]) => {
    console.log('=== MAP INITIALIZATION START ===');
    console.log('Token received:', mapboxToken);
    console.log('Token length:', mapboxToken.length);
    console.log('Token starts with pk.:', mapboxToken.startsWith('pk.'));
    
    if (!mapboxToken.trim() || !mapboxToken.startsWith('pk.')) {
      console.error('Invalid token format');
      toast({
        title: "Error",
        description: "Please enter a valid Mapbox public token (should start with 'pk.')",
        variant: "destructive"
      });
      return false;
    }

    if (!mapContainer.current) {
      console.error('Map container not found');
      toast({
        title: "Error",
        description: "Map container not ready. Please try again.",
        variant: "destructive"
      });
      return false;
    }

    try {
      console.log('Loading mapbox-gl module...');
      
      // Dynamic import of mapbox-gl
      const mapboxgl = await import('mapbox-gl');
      console.log('Mapbox-gl module loaded:', !!mapboxgl.default);
      
      // Import CSS
      await import('mapbox-gl/dist/mapbox-gl.css');
      console.log('Mapbox CSS loaded');

      // Set access token BEFORE creating map
      mapboxgl.default.accessToken = mapboxToken.trim();
      console.log('Access token set to mapboxgl');
      
      // Clear any existing map
      if (map.current) {
        console.log('Removing existing map');
        map.current.remove();
        map.current = null;
      }
      
      console.log('Creating new map with container:', mapContainer.current);
      
      // Create map with error handling
      map.current = new mapboxgl.default.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12', // Changed to a more reliable style
        center: [36.8219, -1.2921], // Nairobi center
        zoom: 11,
      });

      console.log('Map instance created');

      // Add navigation controls
      map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
      console.log('Navigation controls added');

      // Return promise that resolves when map loads
      return new Promise((resolve) => {
        const handleLoad = () => {
          console.log('Map loaded successfully, adding markers...');
          
          // Add markers for each location
          locationData.forEach((location: LocationData, index: number) => {
            const coordinates = getCoordinatesForLocation(location.address);
            console.log(`Adding marker ${index + 1}:`, location.address, coordinates);

            new mapboxgl.default.Marker({
              color: '#0EA5E9',
              scale: Math.min(2, 0.5 + (location.count / 5))
            })
              .setLngLat(coordinates)
              .setPopup(
                new mapboxgl.default.Popup({ offset: 25 })
                  .setHTML(`
                    <div style="padding: 8px;">
                      <h3 style="font-weight: bold; margin: 0 0 4px 0;">${location.address}</h3>
                      <p style="margin: 0; font-size: 14px;">Orders: ${location.count}</p>
                      <p style="margin: 0; font-size: 14px;">Total Value: $${location.totalValue.toFixed(2)}</p>
                    </div>
                  `)
              )
              .addTo(map.current);
          });

          console.log(`Successfully added ${locationData.length} markers`);
          
          toast({
            title: "Success",
            description: "Map loaded successfully!",
          });
          
          resolve(true);
        };

        const handleError = (e: any) => {
          console.error('Map error details:', e);
          console.error('Error type:', e.error?.type);
          console.error('Error message:', e.error?.message);
          
          let errorMessage = 'Unknown error occurred';
          if (e.error?.message?.includes('token')) {
            errorMessage = 'Invalid Mapbox token. Please check your token is correct.';
          } else if (e.error?.message?.includes('network')) {
            errorMessage = 'Network error. Please check your internet connection.';
          } else if (e.error?.message) {
            errorMessage = e.error.message;
          }
          
          toast({
            title: "Map Error",
            description: errorMessage,
            variant: "destructive"
          });
          resolve(false);
        };

        map.current.on('load', handleLoad);
        map.current.on('error', handleError);
        
        // Add a timeout as fallback
        setTimeout(() => {
          if (!map.current.loaded()) {
            console.error('Map loading timeout');
            toast({
              title: "Timeout Error",
              description: "Map took too long to load. Please try again.",
              variant: "destructive"
            });
            resolve(false);
          }
        }, 15000);
      });

    } catch (error) {
      console.error('Initialization error:', error);
      const errorMessage = (error as Error).message;
      
      let userMessage = 'Failed to initialize map';
      if (errorMessage.includes('token') || errorMessage.includes('Unauthorized')) {
        userMessage = 'Invalid Mapbox token. Please verify your token is correct.';
      } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
        userMessage = 'Network error. Please check your connection.';
      }
      
      toast({
        title: "Initialization Error",
        description: userMessage,
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
