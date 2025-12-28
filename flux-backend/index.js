require('dotenv').config(); // Load secrets from .env

const express = require('express');
const { WebSocketServer } = require('ws');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Kafka } = require('kafkajs');

// --- 1. CONFIGURATION CHECKS ---
if (!process.env.GOOGLE_API_KEY || !process.env.CONFLUENT_BROKER) {
  console.error("❌ FATAL: Missing API Keys in .env file.");
  process.exit(1);
}

const TOPIC = process.env.CONFLUENT_TOPIC || "flux_events";
const PORT = process.env.PORT || 8080;

// --- 2. SETUP AI ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
// Use the model name that worked for you (gemini-flash-latest or gemini-pro)
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- 3. SETUP KAFKA ---
const kafka = new Kafka({
  clientId: 'flux-backend',
  brokers: [process.env.CONFLUENT_BROKER],
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.CONFLUENT_KEY,
    password: process.env.CONFLUENT_SECRET,
  },
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: 'flux-brain-group' });

// --- 4. START SERVER ---
const app = express();
const server = app.listen(PORT, () => 
  console.log(`🧠 Flux (Confluent Edition) listening on port ${PORT}`)
);
const wss = new WebSocketServer({ server });

// Map connections to reply to the correct phone
const connections = new Map();

async function start() {
  console.log("🔌 Connecting to Confluent Cloud...");
  try {
    await producer.connect();
    await consumer.connect();
    await consumer.subscribe({ topic: TOPIC, fromBeginning: false });
    console.log("✅ Connected to Confluent Stream.");
  } catch (err) {
    console.error("❌ Kafka Connection Failed:", err);
    process.exit(1);
  }

  // --- PART A: THE PRODUCER (Phone -> Kafka) ---
  wss.on('connection', (ws) => {
    const id = Date.now().toString();
    connections.set(id, ws);
    console.log(`📱 Phone Connected: ${id}`);

    ws.on('message', async (message) => {
      try {
        const event = JSON.parse(message);
        console.log(`➡️  PRODUCING to Kafka: ${event.type}`);

        // Send to Confluent
        await producer.send({
          topic: TOPIC,
          messages: [{ value: JSON.stringify({ ...event, connectionId: id }) }],
        });
      } catch (e) {
        console.error("Error processing message:", e);
      }
    });

    ws.on('close', () => connections.delete(id));
  });

  // --- PART B: THE CONSUMER (Kafka -> AI -> Phone) ---
  await consumer.run({
    eachMessage: async ({ message }) => {
      const event = JSON.parse(message.value.toString());
      console.log(`⬅️  CONSUMING from Kafka: ${event.type}`);

      // Generate AI Response
      const response = await generateAIResponse(event);

      // Send back to the specific phone
      const clientWs = connections.get(event.connectionId);
      if (clientWs && clientWs.readyState === 1) {
        clientWs.send(JSON.stringify({ type: 'AI_RESPONSE', ...response }));
      }
    },
  });
}

// AI LOGIC
async function generateAIResponse(event) {
  try {
    let prompt = "";
    
    if (event.type === 'INTENT_RAGE') {
      prompt = `User is angrily tapping. Write a 10-word apology offering help.`;
    } else if (event.type === 'INTENT_COMPARE') {
      prompt = `User copied "${event.text}" to check prices. Write a 10-word Price Match alert.`;
    } else if (event.type === 'UPLOAD_PHOTO') {
       // Visual processing simulation for the stream
       return { title: "Visual Fit", text: "Analyzing stream... The camera matches your room's aesthetic perfectly!" };
    } else {
       // Just a heartbeat or init message
       return { title: "Flux AI", text: "Event processed via Kafka." };
    }

    if (prompt) {
      const result = await model.generateContent(prompt);
      return { title: "Flux Intelligence", text: result.response.text() };
    }
    
    return { title: "Flux", text: "..." };

  } catch (e) {
    console.error("AI Error:", e.message);
    return { title: "Error", text: "AI Overload." };
  }
}

start().catch(console.error);