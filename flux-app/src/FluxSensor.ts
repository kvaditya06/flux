import * as Battery from 'expo-battery';
import * as Clipboard from 'expo-clipboard';
import * as ScreenCapture from 'expo-screen-capture';
import { AppState } from 'react-native';

// Define what a callback looks like
type IntentCallback = (intent: string, data: any) => void;

export class FluxSensor {
  private onIntent: IntentCallback;
  private tapCount: number = 0;
  private lastTap: number = 0;
  private lastBackground: number = 0;

  constructor(callback: IntentCallback) {
    this.onIntent = callback;
    this.initSensors();
  }

  private async initSensors() {
    console.log("🧠 Flux Sensor Initializing...");

    // 1. Ghost Switch (App Backgrounding)
    AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState.match(/inactive|background/)) {
        this.lastBackground = Date.now();
      } else if (nextAppState === 'active') {
        const timeGone = Date.now() - this.lastBackground;
        // If gone for 2-20 seconds, they likely checked a competitor
        if (timeGone > 2000 && timeGone < 20000) { 
           this.onIntent('INTENT_GHOST', { duration: timeGone });
        }
      }
    });

    // 2. Screenshot Interceptor (FIXED)
    // We use the non-async listener here.
    ScreenCapture.addScreenshotListener(() => {
      this.onIntent('INTENT_SCREENSHOT', {});
    });

    // 3. Battery Rescue
    try {
      const level = await Battery.getBatteryLevelAsync();
      // If battery is below 20% and not charging (mock logic for demo)
      if (level < 0.20 && level > 0) {
        this.onIntent('INTENT_BATTERY_LOW', { level });
      }
    } catch (e) {
      console.log("Battery sensor not available on simulator");
    }
  }

  // 4. Rage Click Detector (Call this on screen tap)
  public trackTap() {
    const now = Date.now();
    // If taps are less than 400ms apart
    if (now - this.lastTap < 400) {
      this.tapCount++;
      if (this.tapCount >= 3) { // 3 rapid taps
        this.onIntent('INTENT_RAGE', {});
        this.tapCount = 0; // Reset
      }
    } else {
      this.tapCount = 1;
    }
    this.lastTap = now;
  }

  // 5. Comparison Trap (Check clipboard for specific text)
  public async checkClipboard(productTitle: string) {
    const content = await Clipboard.getStringAsync();
    // Case insensitive check
    if (content && content.toLowerCase().includes(productTitle.toLowerCase())) {
      this.onIntent('INTENT_COMPARE', { text: content });
    }
  }
}