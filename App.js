import React, { useState } from 'react';
import { View, Button, Alert, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
import Tesseract from 'tesseract.js';
import { parseRouteSheet } from './parseRouteSheet';
import MapView, { Marker, UrlTile } from 'react-native-maps'; // Added for react-native-maps

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  // Removed viewport state, MapView will use initialRegion

  const geocodeAddress = async (address) => {
    try {
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
    try {
      // Request media library permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant media library access to pick an image.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setLoading(true);
        setStops([]); // Clear previous stops

        // Perform OCR
        const { data: { text } } = await Tesseract.recognize(
          result.assets[0].uri,
          'eng', // English language
          { logger: m => console.log(m) } // Optional: log OCR progress
        );

        const parsedStops = parseRouteSheet(text);

        // Geocode addresses
        const geocodedStops = await Promise.all(
          parsedStops.map(async (stop) => {
            const geo = await geocodeAddress(stop.address);
            return {
              ...stop,
              latitude: geo ? geo.lat : null,
              longitude: geo ? geo.lng : null,
            };
          })
        );
        setStops(geocodedStops.filter(stop => stop.latitude !== null));
        setLoading(false);
      }
    } catch (error) {
      console.error('Error picking image or performing OCR:', error);
      Alert.alert('Error', 'Failed to process image.');
      setLoading(false);
    }
  };

  const getPinColor = (status) => {
    switch (status) {
      case 'active': return 'blue';
      case 'delivered': return 'green';
      case 'failed': return 'red';
      case 'skipped': return 'orange';
      case 'completed': return 'purple';
      default: return 'gray';
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

      {/* Map using react-native-maps */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 37.7749, // Default center
          longitude: -122.4194, // Default center
          latitudeDelta: 0.0922, // Zoom level
          longitudeDelta: 0.0421, // Zoom level
        }}
        provider={null} // Use default provider (Google Maps on Android, Apple Maps on iOS) or specify 'google'
      >
        {/* UrlTile for custom tile layers like OpenStreetMap */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {stops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }} // Correct format for react-native-maps Marker
          >
            <View style={[
              styles.marker,
              { backgroundColor: getPinColor(stop.status) }
            ]} />
          </Marker>
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
});
