import React, { useState } from 'react';
import { View, Button, Alert, Text, Image, ActivityIndicator, StyleSheet } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MapView, { Marker } from 'react-native-maps';
import { parseRouteSheet } from './utils/parseRouteSheet';
import Tesseract from 'tesseract.js';

// Replace this with your OpenCage API key
const OPENCAGE_API_KEY = '164d3314dc4041418021ce63c8095c81';

export default function App() {
  const [image, setImage] = useState(null);
  const [stops, setStops] = useState([]);
  const [loading, setLoading] = useState(false);
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  const geocodeAddress = async (address) => {
    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(
        address
      )}&key=${OPENCAGE_API_KEY}&limit=1`;
      const res = await fetch(url);
      const data = await res.json();
      if (
        data.results &&
        data.results.length > 0 &&
        data.results[0].geometry
      ) {
        return {
          latitude: data.results[0].geometry.lat,
          longitude: data.results[0].geometry.lng,
        };
      }
    } catch (e) {
      console.warn('Geocoding error:', e);
    }
    return null;
  };

  const handlePickImage = async () => {
    setLoading(true);
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (!result.canceled) {
      const uri = result.assets?.[0]?.uri || result.uri;
      setImage(uri);

      try {
        const {
          data: { text },
        } = await Tesseract.recognize(uri, 'eng', { logger: () => {} });

        const parsedStops = parseRouteSheet(text) || [];

        const stopsWithCoords = [];
        for (const stop of parsedStops) {
          const coords = await geocodeAddress(stop.address);
          stopsWithCoords.push({ ...stop, ...coords });
        }

        setStops(stopsWithCoords);

        if (stopsWithCoords.length > 0 && stopsWithCoords[0].latitude) {
          setRegion({
            latitude: stopsWithCoords[0].latitude,
            longitude: stopsWithCoords[0].longitude,
            latitudeDelta: 0.1,
            longitudeDelta: 0.1,
          });
        }

        Alert.alert('OCR Text', text);
      } catch (e) {
        Alert.alert('OCR Error', e.message);
      }
    }
    setLoading(false);
  };

  const getPinColor = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'green';
      case 'suspended':
        return 'red';
      default:
        return 'blue';
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'center', padding: 10 }}>
        <Button title="📸 Scan Route Sheet" onPress={handlePickImage} />
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Processing OCR and Geocoding...</Text>
        </View>
      )}

      {image && (
        <Image
          source={{ uri: image }}
          style={{ width: '100%', height: 200, resizeMode: 'contain' }}
        />
      )}

      <MapView style={{ flex: 1 }} region={region}>
        {stops.map((stop, idx) =>
          stop.latitude && stop.longitude ? (
            <Marker
              key={idx}
              coordinate={{ latitude: stop.latitude, longitude: stop.longitude }}
              pinColor={getPinColor(stop.status)}
              title={stop.address}
              description={stop.notes}
            />
          ) : null
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
});
