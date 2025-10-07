# Android packaging with Capacitor

Health2099 uses Capacitor to bundle the static web app into a native Android shell.

## Prerequisites

- Node.js 16+ and npm
- Android Studio + SDK platform tools

## Project setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy current web assets into the native project:
   ```bash
   npx cap copy
   ```
3. Open the Android project in Android Studio:
   ```bash
   npx cap open android
   ```
4. From Android Studio, build or run on an emulator/device. For CLI builds you can use:
   ```bash
   npx cap sync android
   ```

## Configuration notes

- `capacitor.config.json` sets `webDir` to the repository root so Capacitor serves the existing HTML files.
- Update the `appId` (`com.health2099.app`) and `appName` if you need a different package name.
- When you change any HTML, CSS, or JS files, rerun `npx cap copy` to refresh the native project assets.
