# 🏃‍♂️ Edge GPS Tracker - Take Home Test

Welcome to the Edge take-home test! This challenge is designed to simulate a real-world feature we might build in the
Edge app. It focuses on mobile location tracking and front-end feature implementation.

---

## 📦 Overview

Your task is to build a **basic GPS activity tracker**. Users should
be able to:

1. Start a workout session that tracks their GPS location.
2. View their route on a live map.
3. Stop the session and move to the next screen.
4. (Bonus) View metrics like time, distance.

---

## 🧠 What We're Looking For

This test is not about pixel-perfect UI + design — we care about:

- Code clarity and structure
- Realistic handling of location tracking
- Practical decision-making
- Communication (via README/comments)

---

## 🚀 Requirements

### 📱 Frontend (React Native + TypeScript)

- Request foreground location permissions from the user
- Start and stop GPS location tracking
- Display the route in real-time using a map

---

## ✅ Bonus Ideas (Optional)

- Track and display total distance using Haversine formula
- Calculate and display average speed
- Handle permission errors gracefully
- Store a backup of location data locally in case of crash
- Auto-pause tracking when the user is stationary / auto-resume when moving
- Break down of split times (e.g., every km)
- Any other features you think would be useful

---

## 🧪 Project Setup

### 1. Frontend

```bash
cd location-tracker
cd ios && pod install && cd ..
npm run ios

npm install
npm run start
npm run android
npx react-native log-android
adb logcat *:E
```
