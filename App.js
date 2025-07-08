import React, { useState } from 'react';
import { View, Button, Alert, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapboxGL from '@react-native-mapbox-gl/maps';
import { parseRouteSheet } from './parseRouteSheet';

// Initialize Mapbox (no API key needed for basic usage)
MapboxGL.setAccessToken(null); // Optional for premium features

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    zoomLevel: 10,
  });

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${expo.config.extra.opencageApiKey}`
      );
      const data = await response.json();
      if (data.results?.length > 0) {
        return data.results[0].geometry;
      }
    } catch (error) {
      console.warn('Geocoding error:', error);
    }
    return null;
  };

  const handlePickImage = async () => {
    setLoading(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled) {
        const uri = result.assets?.[0]?.uri || result.uri;
        setImage(uri);

        // OCR Processing
        const { data: { text } } = await Tesseract.recognize(uri, 'eng');
        const parsedStops = parseRouteSheet(text);

        // Geocode addresses
        const stopsWithCoords = await Promise.all(
          parsedStops.map(async stop => ({
            ...stop,
            ...(await geocodeAddress(stop.address))
          })
        );

        setStops(stopsWithCoords);
        if (stopsWithCoords[0]?.latitude) {
          setViewport({
            latitude: stopsWithCoords[0].latitude,
            longitude: stopsWithCoords[0].longitude,
            zoomLevel: 12,
          });
        }
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const getPinColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active': return '#00FF00';
      case 'suspended': return '#FF0000';
      default: return '#0000FF';
    }
  };

  return (
    <View style={styles.container}>
      <Button title="📸 Scan Route Sheet" onPress={handlePickImage} />

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Processing...</Text>
        </View>
      )}

      {image && (
        <Image source={{ uri: image }} style={styles.previewImage} />
      )}

      <MapboxGL.MapView
        style={styles.map}
        styleURL="https://demotiles.maplibre.org/style.json" // Free tile server
        {...viewport}
        onPress={feature => console.log('Map pressed:', feature)}
      >
        {stops.map((stop, index) => (
          <MapboxGL.Marker
            key={`stop-${index}`}
            coordinate={[stop.longitude, stop.latitude]}
          >
            <View style={[
              styles.marker,
              { backgroundColor: getPinColor(stop.status) }
            ]} />
          </MapboxGL.Marker>
        ))}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
  },
  map: {
    flex: 1,
    marginTop: 10,
  },
  previewImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 10,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    zIndex: 100,
  },
});
