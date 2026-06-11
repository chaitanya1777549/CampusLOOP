import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.campusloop.app',
  appName: 'Campus Loop',
  webDir: 'out',
  bundledWebRuntime: false,
  server: {
    // For development with live reload — remove for production build
    // url: 'http://YOUR_LOCAL_IP:3000',
    // cleartext: true,
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#17120d',
  },
  ios: {
    backgroundColor: '#17120d',
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#17120d',
      showSpinner: false,
    },
  },
}

export default config