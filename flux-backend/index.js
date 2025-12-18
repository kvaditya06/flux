const express = require('express');
const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// CONFIGURATION
const PORT = 8080;
const API_KEY = "AIzaSyD9Uv7lvdU79Tg6T_sNU1McKU96n6Bzp8g"; // <--- PASTE KEY HERE

// Initialize Gemini
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Vision capable

const app = express();
const server = app.listen(PORT, () => console.log(`🧠 Real AI Brain listening on ${PORT}`));
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📱 Mobile Connected');

  ws.on('message', async (message) => {
    const event = JSON.parse(message);
    console.log('⚡ Processing Event:', event.type);

    try {
      let aiResponse = { title: "Flux AI", text: "Processing..." };

      // SCENARIO 1: COMPARISON TRAP (Text)
      if (event.type === 'INTENT_COMPARE') {
        const prompt = `User is shopping for "Sony Alpha A7 III" and just copied the text "${event.text}" to check prices elsewhere. 
        You represent the current store. 
        Write a short, punchy (max 15 words) "Price Match Guarantee" notification to stop them from leaving. 
        Be confident. Mention a specific dollar amount saved (e.g. $15).`;
        
        const result = await model.generateContent(prompt);
        aiResponse = { title: "Price Match Alert", text: result.response.text() };
      }

      // SCENARIO 2: RAGE CLICK (Frustration)
      else if (event.type === 'INTENT_RAGE') {
        const prompt = `User is angrily tapping the screen. They are frustrated.
        Write a short, empathetic (max 12 words) apology offering to "Auto-Add to Cart" for them.`;
        
        const result = await model.generateContent(prompt);
        aiResponse = { title: "Trouble Tapping?", text: result.response.text() };
      }

      // SCENARIO 3: VISUAL FIT CHECK (Image Analysis)
      else if (event.type === 'UPLOAD_PHOTO') {
        console.log("Processing Image...");
        // Convert base64 to Google's format
        const imagePart = {
          inlineData: {
            data: event.image,
            mimeType: "image/jpeg",
          },
        };
        
        const prompt = `Analyze this room's interior design style (e.g. Minimalist, Industrial, Boho). 
        Then, explain in 1 sentence why a "Charcoal Grey Sony Camera" fits this aesthetic perfectly.`;
        
        const result = await visionModel.generateContent([prompt, imagePart]);
        aiResponse = { title: "Visual Fit Check", text: result.response.text() };
      }

      // SCENARIO 4: GHOST SWITCH (Competitor Check)
      else if (event.type === 'INTENT_GHOST') {
         // Keep this one fast/hardcoded or use AI if you want
         aiResponse = { title: "Welcome Back!", text: "We verified our prices while you were gone. You're still getting the best deal." };
      }

      // Send the Real AI response back
      ws.send(JSON.stringify({ type: 'AI_RESPONSE', ...aiResponse }));

    } catch (error) {
      console.error("AI Error:", error);
      ws.send(JSON.stringify({ type: 'AI_RESPONSE', title: "Error", text: "AI Brain Overload." }));
    }
  });
});