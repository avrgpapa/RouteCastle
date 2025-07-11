import React, { useState } from 'react';
import { View, Button, Alert, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker, UrlTile } from 'react-native-maps'; // Updated import for UrlTile
import Constants from 'expo-constants';
import Tesseract from 'tesseract.js';
import { parseRouteSheet } from './parseRouteSheet';

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewport, setViewport] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const geocodeAddress = async (address) => {
    try {
      // You are currently using OpenCage, which is fine.
      // If you wanted a completely free geocoding alternative, you'd need another service
      // like Nominatim (based on OpenStreetMap), but it has usage policies.
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${Constants.expoConfig?.extra?.opencageApiKey || '164d3314dc4041418021ce63c8095c81'}`
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
        ));

        setStops(stopsWithCoords);
        if (stopsWithCoords[0]?.latitude) {
          setViewport({
            latitude: stopsWithCoords[0].latitude,
            longitude: stopsWithCoords[0].longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
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

      {/* OpenStreetMap View */}
      <MapView
        style={styles.map}
        region={viewport}
        onRegionChangeComplete={region => setViewport(region)}
        onPress={e => console.log('Map pressed:', e.nativeEvent.coordinate)}
      >
        <UrlTile
          [cite_start]urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png" // OpenStreetMap tile server [cite: 1]
          maximumZ={19} // OSM max zoom is 19
        />
        {stops.map((stop, index) => (
          stop.latitude && stop.longitude && (
            <Marker
              key={`stop-${index}`}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
            >
              <View style={[
                styles.marker,
                { backgroundColor: getPinColor(stop.status) }
              ]} />
            </Marker>
          )
        ))}
      </MapView>
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
