import React, { useRef, useState } from "react";
import {
  View,
  Button,
  Alert,
  Platform,
  StyleSheet
} from "react-native";
import MapView, { Marker, Polyline, Region } from "react-native-maps";
import Geolocation, { GeoPosition } from "react-native-geolocation-service";
import { request, PERMISSIONS, RESULTS, openSettings } from "react-native-permissions";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

export type LngLatTimestamp = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

const INITIAL_REGION: Region = {
  latitude: 51.4,
  longitude: -0.3,
  latitudeDelta: 0.01,
  longitudeDelta: 0.01
};

export default function MapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const mapRef = useRef<MapView>(null);
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const [route, setRoute] = useState<LngLatTimestamp[]>([]);
  const [tracking, setTracking] = useState(false);
  const watchId = useRef<number | null>(null);

  const requestPermission = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      const status = await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
      return status === RESULTS.GRANTED;
    }
    const status = await request(PERMISSIONS.IOS.LOCATION_WHEN_IN_USE);
    return status === RESULTS.GRANTED;
  };

  const startTracking = async () => {
    const ok = await requestPermission();
    if (!ok) {
      Alert.alert(
        "Permission required",
        "Enable location in Settings.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: openSettings }
        ]
      );
      return;
    }

    setRoute([]);
    setTracking(true);
    Geolocation.requestAuthorization("whenInUse");

    const id = Geolocation.watchPosition(
      (pos: GeoPosition) => {
        const { latitude, longitude } = pos.coords;
        const t = pos.timestamp ?? Date.now();
        const point = { latitude, longitude, timestamp: t };

        setRoute(r => {
          const next = [...r, point];
          return next;
        });

        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: region.latitudeDelta,
          longitudeDelta: region.longitudeDelta
        };

        // Option A: Implicit follow
        mapRef.current?.animateToRegion(newRegion, 500);

        // Option B: controlled region
        setRegion(newRegion);
      },
      err => {
        Alert.alert("Location error", err.message);
        stopTracking();
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 1,
        interval: 1000,
        fastestInterval: 500
      }
    );
    watchId.current = id;
  };

  const stopTracking = () => {
    if (watchId.current != null) {
      Geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setTracking(false);
  };

  const finishTracking = () => {
    stopTracking();
    if (route.length < 2) {
      Alert.alert("Not enough data for route");
      return;
    }
    navigation.navigate("WorkoutComplete", { summary: { path: route } });
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.container}
        showsUserLocation
        initialRegion={INITIAL_REGION}
        region={region}           // Controlled map position
        onRegionChangeComplete={r => setRegion(r)}
        loadingEnabled
        mapType="standard"
      >
        {route.length > 0 && (
          <>
            <Marker
              coordinate={route[0]}
              title="Start"
              pinColor="green"
            />

            <Polyline
              coordinates={route.map(p => ({
                latitude: p.latitude,
                longitude: p.longitude
              }))}
              strokeWidth={4}
              strokeColor="#007AFF"
            />
          </>
        )}
      </MapView>

      <View style={styles.btn}>
        {!tracking ? (
          <Button title="Start" onPress={startTracking} />
        ) : (
          <Button title="Stop & Review" onPress={finishTracking} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: StyleSheet.absoluteFillObject,
  btn: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20
  }
});
