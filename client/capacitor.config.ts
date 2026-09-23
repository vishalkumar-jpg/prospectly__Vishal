/// <reference types="node" />
import { CapacitorConfig } from "@capacitor/cli";

// Environment-based configuration
const isDevelopment = process.env.NODE_ENV === "development";

const config: CapacitorConfig = {
  appId: "com.prospectly.app",
  appName: "Prospectly",
  webDir: "dist",
  server: {
    // Security: Allow cleartext (HTTP) in development, enforce HTTPS in production
    // Development needs HTTP for local dev server (http://127.0.0.1:5001)
    cleartext: isDevelopment,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#999999",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: true,
    },
  },
};

export default config;
