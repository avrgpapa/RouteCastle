import React, { useState } from 'react';
import { View, Button, Alert, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Constants from 'expo-constants';
// import Tesseract from 'tesseract.js'; // Temporarily removed for debugging
import { parseRouteSheet } from './utils/parseRouteSheet';
import MapView, { Marker, UrlTile, PROVIDER_OSMDROID } from 'react-native-maps'; // Added for react-native-maps

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);

  const geocodeAddress = async (address) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&key=${Constants.expoConfig?.extra?.opencageApiKey || 'YOUR_OPENCAGE_API_KEY_HERE'}`
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

  const handleProcessImage = async (uri) => {
    setLoading(true);
    try {
      // Tesseract.js related code temporarily removed for debugging
      // const { data: { text } } = await Tesseract.recognize(uri, 'eng');
      // console.log('OCR Result:', text);
      // const parsedData = parseRouteSheet(text);
      // console.log('Parsed Data:', parsedData);

      // Placeholder for parsed data without Tesseract
      const parsedData = {
        stops: [
          { address: "1600 Amphitheatre Parkway, Mountain View, CA", latitude: 37.4221, longitude: -122.0841, status: "pending" },
          { address: "1 Infinite Loop, Cupertino, CA", latitude: 37.3318, longitude: -122.0312, status: "completed" }
        ],
        summary: "Dummy data for testing without OCR"
      };

      const stopsWithCoords = await Promise.all(
        parsedData.stops.map(async (stop) => {
          if (!stop.latitude || !stop.longitude) {
            const coords = await geocodeAddress(stop.address);
            return {
              ...stop,
              latitude: coords ? coords.lat : null,
              longitude: coords ? coords.lng : null,
            };
          }
          return stop;
        })
      );
      setStops(stopsWithCoords.filter(stop => stop.latitude && stop.longitude));
    } catch (error) {
      console.error('Image processing or OCR failed:', error);
      Alert.alert('Error', 'Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission required', 'Please grant access to your photo library to select images.');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setImage(result.assets[0].uri);
        handleProcessImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const getPinColor = (status) => {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'completed':
        return 'green';
      case 'failed':
        return 'red';
      default:
        return 'blue';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RouteCastle</Text>
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

      <MapView
        style={styles.map}
        provider={PROVIDER_OSMDROID} // Explicitly use OSMDroid
        initialRegion={{
          latitude: 37.7749, // Default center
          longitude: -122.4194, // Default center
          latitudeDelta: 0.0922, // Zoom level
          longitudeDelta: 0.0421, // Zoom level
        }}
      >
        {/* UrlTile will now overlay on the OSMDroid base map */}
        <UrlTile
          urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
        />
        {stops.map((stop, index) => (
          <Marker
            key={`stop-${index}`}
            coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  marker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
});
