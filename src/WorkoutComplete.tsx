// src/WorkoutComplete.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { useRoute } from "@react-navigation/native";
import type { LngLatTimestamp } from "./MapScreen";
import { haversine } from "./utils/haversine";

// ---
// Types & constants (with units)
//
// Summary.path: array of raw GPS points from MapScreen
// each has latitude (decimal degrees), longitude (°), and timestamp (UNIX time in **ms**)
//
type Summary = {
  path: LngLatTimestamp[]; // timestamp in milliseconds (ms)
};

type Split = {
  km: number;                 // full kilometers completed
  durationSec: number;       // time in seconds (s) taken for that split
};

// Detect stationary segments: if elapsed time ≥ 5 s and segment distance / time < 0.3 m/s ⇒ stationary
// 0.3 m/s threshold is widely used to detect standing still or sitting (i.e., paused) :contentReference[oaicite:3]{index=3}
const isStationary = (
  segmentDist: number,     // in meters (m)
  timeDeltaSec: number,    // in seconds (s)
  speedThreshold = 0.3,    // m/s
  pauseThresholdSec = 5    // seconds (s)
): boolean => {
  if (timeDeltaSec >= pauseThresholdSec) {
    const speed = segmentDist / timeDeltaSec; // in m/s
    return speed < speedThreshold;             // true if below threshold
  }
  return false;
};

// --- Main component ---
const WorkoutComplete: React.FC = () => {
  const route = useRoute();
  const { summary } = route.params as { summary: Summary };

  // State variables (units in comments)
  const [distance, setDistance] = useState<number>(0);          // total moving distance in meters (m)
  const [movingTime, setMovingTime] = useState<number>(0);      // total time spent moving in seconds (s)
  const [totalTime, setTotalTime] = useState<number>(0);        // elapsed time from start to end in seconds (s)
  const [averageSpeed, setAverageSpeed] = useState<number>(0);  // average moving speed in meters/second (m/s)
  const [pausedSections, setPausedSections] = useState<number>(0); // count of detected pause segments
  const [splits, setSplits] = useState<Split[]>([]);            // split durations per km
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    if (!summary.path || summary.path.length < 2) {
      Alert.alert("Error", "Insufficient path data provided.");
      return;
    }
    calculateStats();
  }, []);

  const calculateStats = () => {
    const path = summary.path;
    const splitsArr: Split[] = [];

    let cumDist = 0;                   // cumulative moving distance in meters (m)
    let lastSplitKm = 0;              // index of last full kilometer
    let splitStartTime = path[0].timestamp; // ms
    let accruedMovingTime = 0;        // total moving time in seconds (s)
    let accruedPausedTime = 0;        // total paused time in seconds (s)
    let pauseCount = 0;               // number of paused segments

    for (let i = 1; i < path.length; i++) {
      const prev = path[i - 1];
      const curr = path[i];

      // segmentDist in meters (m)
      const dist = haversine(
        prev.latitude, prev.longitude,
        curr.latitude, curr.longitude
      );

      // deltaT in seconds
      const deltaT = (curr.timestamp - prev.timestamp) / 1000;

      const paused = isStationary(dist, deltaT);

      if (paused) {
        pauseCount++;
        accruedPausedTime += deltaT; // seconds (s)
      } else {
        cumDist += dist;             // accumulate meters (m)
        accruedMovingTime += deltaT; // accumulate seconds (s)

        const kmNow = Math.floor(cumDist / 1000);
        if (kmNow > lastSplitKm) {
          const splitDur = (curr.timestamp - splitStartTime) / 1000; // seconds
          splitsArr.push({
            km: lastSplitKm + 1,
            durationSec: splitDur
          });
          lastSplitKm = kmNow;
          // estimate new splitStartTime aligned proportionally within this segment
          const overshootMeters = cumDist % 1000;
          const fracOfSegment = overshootMeters / dist;
          splitStartTime = curr.timestamp - fracOfSegment * deltaT * 1000;
        }
      }
    }

    // elapsed time from start to end in seconds (s)
    const totalElapsedSec =
      (path[path.length - 1].timestamp - path[0].timestamp) / 1000;

    // set state (with units)
    setDistance(cumDist);                  // meters (m)
    setMovingTime(accruedMovingTime);     // seconds (s)
    setTotalTime(totalElapsedSec);         // seconds (s)
    setPausedSections(pauseCount);         // count
    setSplits(splitsArr);
    setAverageSpeed(
      accruedMovingTime > 0
        ? cumDist / accruedMovingTime      // m/s
        : 0
    );
    setReady(true);
  };

  const renderContent = () => {
    if (!ready) {
      return <ActivityIndicator size="large" />;
    }

    // format values for display
    const avgKmh = (averageSpeed * 3.6).toFixed(2); // km/h
    const distKm = (distance / 1000).toFixed(2);    // km
    const elapsedMin = (totalTime / 60).toFixed(1); // minutes
    const movingMin = (movingTime / 60).toFixed(1); // minutes

    return (
      <>
        <Text style={styles.header}>🏁 Summary</Text>
        <Text style={styles.label}>Distance: {distKm} km</Text>
        <Text style={styles.label}>Elapsed: {elapsedMin} min</Text>
        <Text style={styles.label}>Moving: {movingMin} min</Text>
        <Text style={styles.label}>Avg Speed: {avgKmh} km/h</Text>
        <Text style={styles.label}>Auto‑pauses: {pausedSections}</Text>
        <Text style={styles.subHeader}>📍 Splits (per km)</Text>
        {splits.length === 0 ? (
          <Text style={styles.label}>No full kilometers completed.</Text>
        ) : null}
      </>
    );
  };

  return (
    <FlatList
      ListHeaderComponent={renderContent}
      data={splits}
      keyExtractor={(item) => item.km.toString()}
      renderItem={({ item }) => (
        <Text style={styles.split}>
          KM {item.km}: {(item.durationSec / 60).toFixed(1)} min
        </Text>
      )}
      contentContainerStyle={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff"
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16
  },
  subHeader: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 24,
    marginBottom: 8
  },
  label: {
    fontSize: 16,
    marginVertical: 4
  },
  split: {
    fontSize: 15,
    paddingVertical: 2
  }
});

export default WorkoutComplete;
