import React, { useState, useEffect, useRef } from 'react';
import { Button, View, PermissionsAndroid, Platform, StyleSheet, Alert } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import { request, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define a type for latitude and longitude points
type LngLat = { latitude: number; longitude: number };

const MapScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  
  // State to track whether user is currently recording their route
  const [tracking, setTracking] = useState(false);
  
  // Array to store the route points
  const [route, setRoute] = useState<LngLat[]>([]);
  
  // Reference to store the watchId for location updates
  const watchId = useRef<number | null>(null);
  
  // Reference to the MapView to control map animations
  const mapRef = useRef<MapView>(null);

  // Function to stop tracking and clear location updates
  const stopTracking = () => {
    if (watchId.current != null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
  };

  // Function to request location permission based on platform
  const requestPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
        return status === RESULTS.GRANTED;
      }
    } catch (e) {
      console.warn('Permission request failed:', e);
      return false;
    }
  };

  // useEffect runs when component mounts, requesting necessary permissions
  useEffect(() => {
    (async () => {
      if (Platform.OS === 'ios') {
        await Geolocation.requestAuthorization('whenInUse');
      }
      await requestPermission();
    })();
    // Cleanup function to stop tracking if component unmounts
    return () => stopTracking();
  }, []);

  // Function to start location tracking
  const startTracking = async () => {
    const hasPermission = await requestPermission();
    if (!hasPermission) {
      // If no permission, prompt user to enable in settings
      Alert.alert(
        'Permission required',
        'Please enable location permissions in settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => openSettings() },
        ]
      );
      return;
    }

    // Reset route and set tracking to true
    setRoute([]);
    setTracking(true);

    // Start watching location updates
    watchId.current = Geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        const newPoint: LngLat = { latitude, longitude };
        // Add new point to route
        setRoute(prevRoute => [...prevRoute, newPoint]);

        // Animate map to follow user's current position
        mapRef.current?.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      },
      error => {
        // Handle errors, stop tracking if needed
        Alert.alert('Location error', error.message);
        stopTracking();
      },
      { enableHighAccuracy: true, distanceFilter: 1, interval: 1000, fastestInterval: 500 }
    );
  };

  // Function to calculate total distance traveled based on route points
  const calculateDistance = (coords: LngLat[]) => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const R = 6371e3; // Earth's radius in meters

    let distance = 0;
    for (let i = 1; i < coords.length; i++) {
      const prev = coords[i - 1];
      const curr = coords[i];
      const dLat = toRad(curr.latitude - prev.latitude);
      const dLon = toRad(curr.longitude - prev.longitude);

      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(prev.latitude)) * Math.cos(toRad(curr.latitude)) * Math.sin(dLon / 2) ** 2;
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance += R * c; // Add segment distance
    }
    return distance; // Total distance in meters
  };

  // Function called when user stops tracking, calculates distance and navigates
  const finishTracking = () => {
    stopTracking();
    try {
      const distance = calculateDistance(route);
      // Pass the route summary to the next screen
      navigation.navigate('WorkoutComplete', {
        summary: { distance, duration: route.length, path: route },
      });
    } catch (e) {
      Alert.alert('Error', 'Failed to calculate summary');
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* MapView displays the user's location and route */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        loadingEnabled
        initialRegion={{
          latitude: 51.4,
          longitude: -0.3,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {/* Show start marker and route polyline if route exists */}
        {route.length > 0 && (
          <>
            <Marker coordinate={route[0]} title="Start" />
            <Polyline coordinates={route} strokeWidth={4} />
          </>
        )}
      </MapView>

      {/* Button toggles between starting and stopping tracking */}
      <View style={styles.btn}>
        {!tracking ? (
          <Button title="Start" onPress={startTracking} />
        ) : (
          <Button title="Stop & Save" onPress={finishTracking} />
        )}
      </View>
    </SafeAreaView>
  );
};

export default MapScreen;

// Styles for the button container
const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
  },
});