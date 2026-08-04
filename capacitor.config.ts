import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.qerberos.dc34nav',
  appName: 'DC34 NAV',
  webDir: 'dist',
  // Matches the app header so the native status-bar strip blends in.
  backgroundColor: '#123b3e'
};

export default config;
