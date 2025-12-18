import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import { Image, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Import the Sensor Logic (Ensure the path is correct based on your folder structure)
// If this file is in 'app/', use '../src/FluxSensor'
// If this file is in root, use './src/FluxSensor'
import { FluxSensor } from '../../src/FluxSensor';

export default function App() {
  // CONFIGURATION
  // ⚠️ REPLACE THIS WITH YOUR LAPTOP'S IP ADDRESS found via 'ipconfig'
  const WS_URL = 'ws://192.168.1.10:8080'; 

  // STATE
  const [log, setLog] = useState<string>("Initializing Flux...");
  const [aiMessage, setAiMessage] = useState<any>(null);
  
  // REFS
  const sensorRef = useRef<FluxSensor | null>(null);
  const ws = useRef<WebSocket | null>(null);
  
  const PRODUCT_NAME = "Sony Alpha A7 III";

  useEffect(() => {
    connectToBrain();
    
    // Initialize the Sensor System
    sensorRef.current = new FluxSensor((intent, data) => {
      handleIntent(intent, data);
    });

    return () => {
      ws.current?.close();
    };
  }, []);

  const connectToBrain = () => {
    setLog(`Connecting to ${WS_URL}...`);
    ws.current = new WebSocket(WS_URL);

    ws.current.onopen = () => {
      setLog("✅ Connected to Flux Brain");
      console.log("WebSocket Connected");
    };

    ws.current.onerror = (e: any) => {
      setLog(`❌ Connection Failed. Check IP.`);
      console.log("WebSocket Error:", e.message);
    };

    ws.current.onmessage = (e) => {
      // Handle response from Node.js Server
      try {
        const response = JSON.parse(e.data);
        if (response.type === 'AI_RESPONSE') {
          setAiMessage(response);
        }
      } catch (err) {
        console.error("Error parsing server msg");
      }
    };
  };

  const handleIntent = (intent: string, data: any) => {
    console.log(`⚡ Detected: ${intent}`);
    setLog(`⚡ SENT: ${intent}`);
    
    // Send to Node.js Backend
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: intent, ...data }));
    } else {
      setLog("⚠️ Offline: Backend unreachable");
    }
  };

  // Feature: Manually Trigger Copy for Comparison Trap
  const handleCopy = async () => {
    await Clipboard.setStringAsync(PRODUCT_NAME);
    // Manually trigger check because mobile OS doesn't always broadcast copy events globally
    sensorRef.current?.checkClipboard(PRODUCT_NAME);
  };

  // Feature: Visual Fit Check (Camera)
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5, // Keep it small for faster sending
      base64: true, // Required to send to AI
    });

    if (!result.canceled && result.assets && result.assets[0].base64) {
      // Send the image data to the backend
      handleIntent('UPLOAD_PHOTO', { image: result.assets[0].base64 });
    }
  };

  return (
    <View style={styles.container} onTouchEnd={() => sensorRef.current?.trackTap()}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>FLUX SHOP</Text>
        <View style={styles.statusDot} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* PRODUCT IMAGE */}
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1000&q=80' }} 
          style={styles.image} 
        />

        {/* PRODUCT DETAILS */}
        <View style={styles.details}>
          <Text style={styles.label}>BEST SELLER</Text>
          
          {/* THE COMPARISON TRAP TARGET */}
          <TouchableOpacity onLongPress={handleCopy} activeOpacity={0.6}>
             <Text style={styles.title} selectable>{PRODUCT_NAME}</Text>
          </TouchableOpacity>
          
          <Text style={styles.price}>$1,999.00</Text>
          
          <Text style={styles.desc}>
             Professional full-frame mirrorless camera. 
             <Text style={{fontWeight: 'bold', color: '#666'}}> (Try tapping fast, switching apps, or long-pressing the title!)</Text>
          </Text>

          {/* VISUAL FIT BUTTON */}
          <TouchableOpacity style={styles.btn} onPress={pickImage}>
            <Text style={styles.btnText}>📸 See in my Room</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* THE AI INTERCEPTOR (Popup) */}
      {aiMessage && (
        <View style={styles.aiSheet}>
          <View style={styles.aiHeader}>
            <Text style={styles.aiLabel}>✨ FLUX INTELLIGENCE</Text>
            <TouchableOpacity onPress={() => setAiMessage(null)} hitSlop={{top:10, bottom:10, left:10, right:10}}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.aiTitle}>{aiMessage.title}</Text>
          <Text style={styles.aiText}>{aiMessage.text}</Text>
        </View>
      )}

      {/* THE WAR ROOM LOG (Debug Overlay) */}
      <View style={styles.logBox}>
        <Text style={styles.logText}>{log}</Text>
      </View>
    </View>
  );
}

// STYLING
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', paddingTop: 40 },
  scroll: { paddingBottom: 100 },
  header: { padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#eee' },
  headerText: { fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2ecc71', marginLeft: 8 },
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  details: { padding: 25 },
  label: { color: '#6c5ce7', fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 10, color: '#2d3436' },
  price: { fontSize: 28, color: '#2ecc71', fontWeight: 'bold', marginBottom: 20 },
  desc: { fontSize: 16, color: '#636e72', lineHeight: 24, marginBottom: 25 },
  btn: { backgroundColor: '#2d3436', padding: 18, borderRadius: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  // AI Overlay Styles
  aiSheet: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#fff', padding: 20, borderRadius: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 20, elevation: 10, borderLeftWidth: 5, borderLeftColor: '#6c5ce7' },
  aiHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  aiLabel: { color: '#6c5ce7', fontWeight: 'bold', fontSize: 12, textTransform: 'uppercase' },
  closeBtn: { fontSize: 18, color: '#b2bec3', padding: 5, fontWeight: 'bold' },
  aiTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5, color: '#2d3436' },
  aiText: { fontSize: 15, color: '#636e72', lineHeight: 22 },
  
  // Log Styles
  logBox: { position: 'absolute', top: 50, right: 10, backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  logText: { color: '#00ff00', fontSize: 10, fontWeight: 'bold', fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }
});