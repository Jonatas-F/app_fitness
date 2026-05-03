import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // ID do app no formato de pacote Java/Android
  appId: "br.com.shapecerto.app",
  appName: "Shape Certo",

  // Pasta de build do Vite
  webDir: "dist",

  // Servidor — em produção aponta para a URL real.
  // Em desenvolvimento, aponta para o servidor local para hot-reload.
  server: {
    // Descomente para apontar para o servidor local durante o desenvolvimento nativo:
    // url: "http://192.168.x.x:5173",
    // cleartext: true,
    androidScheme: "https",
  },

  plugins: {
    // Status bar escura (app dark theme)
    StatusBar: {
      style: "dark",
      backgroundColor: "#070708",
    },
    // Splash screen
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#070708",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    // Teclado não empurra o layout
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
  },

  android: {
    // Versão mínima: Android 7.0 (API 24)
    minWebViewVersion: 60,
    // Permite tráfego HTTP somente em dev — produção é sempre HTTPS
    allowMixedContent: false,
    // Back button nativo fecha o app na tela raiz
    overrideUserAgent:
      "ShapeCerto/1.0 (Android; Mobile) AppleWebKit/537.36",
    backgroundColor: "#070708",
  },

  ios: {
    contentInset: "always",
    backgroundColor: "#070708",
    overrideUserAgent:
      "ShapeCerto/1.0 (iOS; Mobile) AppleWebKit/537.36",
  },
};

export default config;
