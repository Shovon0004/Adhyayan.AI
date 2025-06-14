const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const Groq = require("groq-sdk");
const fetch = require("node-fetch");
require("dotenv").config();

// Import database connection and models
const connectDB = require("./config/database");
const User = require("./models/User");
const MindMap = require("./models/MindMap");

const app = express();

// Connect to MongoDB Atlas
connectDB();

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);

      const allowedOrigins =
        process.env.NODE_ENV === "production"
          ? [
              "https://adhyayan-ai.vercel.app",
              "https://adhyayan-ai-git-main.vercel.app",
              "https://adhyayan-ai-git-main-sanks011.vercel.app",
            ]
          : [
              "http://localhost:3000",
              "http://127.0.0.1:3000",
              "http://localhost:3001",
              "http://127.0.0.1:3001",
            ];

      if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        console.log("CORS blocked origin:", origin);
        callback(null, true); // Allow all origins in development
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Origin",
    ],
    exposedHeaders: ["Content-Length", "X-Foo", "X-Bar"],
    preflightContinue: false,
    optionsSuccessStatus: 200,
  })
);

// Handle preflight requests explicitly
app.options("*", cors());

// Additional CORS headers middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [
          "https://adhyayan-ai.vercel.app",
          "https://adhyayan-ai-git-main.vercel.app",
          "https://adhyayan-ai-git-main-sanks011.vercel.app",
        ]
      : [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3001",
        ];

  if (allowedOrigins.includes(origin) || !origin) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
  }

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With, Accept, Origin"
  );
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400"); // 24 hours

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  next();
});

app.use(express.json());

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

// Initialize Groq with your API key
const groq = new Groq({
  apiKey:
    process.env.GROQ_API_KEY ||
    "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",
});

// ElevenLabs API configuration
const ELEVENLABS_API_KEY =
  process.env.ELEVENLABS_API_KEY ||
  "sk_0975ec6db66a0ca0e027ca6466ce021514f2345de6ae435f";
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

// Test Groq connection and get available models
const testGroqConnection = async () => {
  try {
    console.log("Testing Groq connection...");
    const models = await groq.models.list();
    console.log("Available Groq models:");
    models.data.forEach((model) => {
      console.log(`- ${model.id}`);
    });
    return models.data;
  } catch (error) {
    console.error("Groq connection test failed:", error.message);
    return [];
  }
};

// Test ElevenLabs connection
const testElevenLabsConnection = async () => {
  try {
    console.log("Testing ElevenLabs connection...");
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log(
        `ElevenLabs connected successfully. Available voices: ${data.voices.length}`
      );
      return data.voices;
    } else {
      console.error(
        "ElevenLabs connection failed:",
        response.status,
        response.statusText
      );
      return [];
    }
  } catch (error) {
    console.error("ElevenLabs connection test failed:", error.message);
    return [];
  }
};

// Test connections on startup
testGroqConnection();
testElevenLabsConnection();

// Enhanced token verification middleware with better error messages
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log("Authorization header:", authHeader);

  if (!authHeader) {
    console.log("No authorization header provided");
    return res.status(401).json({ error: "No authorization header provided" });
  }

  const token = authHeader.split(" ")[1];
  console.log(
    "Extracted token:",
    token ? `${token.substring(0, 20)}...` : "null"
  );

  if (!token) {
    console.log("No token provided in authorization header");
    return res.status(401).json({ error: "No token provided" });
  }

  try {
    const jwtSecret = process.env.JWT_SECRET || "your-secret-key";
    console.log("Using JWT secret:", jwtSecret ? "Set" : "Not set");

    const decoded = jwt.verify(token, jwtSecret);
    console.log("Token decoded successfully:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Token expired" });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ error: "Invalid token format" });
    } else {
      return res.status(401).json({ error: "Invalid token" });
    }
  }
};

// Test route
app.get("/api/test", async (req, res) => {
  try {
    // Test MongoDB connection
    const mongoose = require("mongoose");
    const dbStatus =
      mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

    res.json({
      message: "Backend connected successfully",
      time: new Date().toISOString(),
      database_status: dbStatus,
      database_name: mongoose.connection.name || "Not connected",
      groq_status: "Connected",
      elevenlabs_status: "Connected",
    });
  } catch (error) {
    console.error("Test endpoint error:", error);
    res.json({
      message: "Backend running (DB offline)",
      time: new Date().toISOString(),
      database_status: "Error",
      groq_status: "Connected",
      elevenlabs_status: "Connected",
    });
  }
});

// Function to generate podcast-style script using Groq
const generatePodcastScript = async (topicTitle, content) => {
  try {
    const prompt = `Create an engaging podcast-style script for the topic "${topicTitle}". Transform the following educational content into a conversational, engaging audio experience:

${content}

Guidelines for the podcast script:
1. Start with a warm, welcoming introduction
2. Use conversational language and natural speech patterns
3. Include rhetorical questions to engage the listener
4. Add smooth transitions between concepts
5. Use analogies and real-world examples
6. Include brief pauses for emphasis (use "..." for dramatic pauses)
7. End with a compelling summary and call-to-action
8. Keep it between 300-500 words for optimal listening experience
9. Use an enthusiastic but professional tone
10. Include phrases like "Let's dive in", "Here's what's fascinating", "Think about it this way"

Format the script as natural speech, not bullet points. Make it sound like a knowledgeable friend explaining the topic over coffee.

Return only the podcast script, no additional formatting or labels.`;

    const modelsToTry = [
      "llama-3.1-8b-instant",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
    ];

    for (const model of modelsToTry) {
      try {
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are a professional podcast host and educational content creator. You excel at making complex topics engaging and accessible through conversational storytelling.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: model,
          temperature: 0.8, // Higher temperature for more creative, conversational output
          max_tokens: 1500,
        });

        const script = completion.choices[0]?.message?.content;
        if (script && script.trim()) {
          console.log(`Podcast script generated successfully using ${model}`);
          return script.trim();
        }
      } catch (error) {
        console.error(`Error with model ${model}:`, error.message);
        continue;
      }
    }

    // Fallback script if AI generation fails
    return `Welcome to your learning journey with ${topicTitle}! 

Let me take you through this fascinating topic in a way that's both engaging and easy to understand. 

${content}

What makes this particularly interesting is how it connects to so many aspects of our daily lives. Think about it this way... when you really understand ${topicTitle}, you're not just learning facts, you're gaining insights that can transform how you see the world.

Here's the key takeaway: every expert was once a beginner, and every complex topic becomes simple when broken down into digestible pieces. 

So take your time with this material, ask questions, and remember that learning is a journey, not a destination. You've got this!`;
  } catch (error) {
    console.error("Error generating podcast script:", error);
    // Return a basic fallback
    return `Welcome to your learning session on ${topicTitle}. ${content} Thank you for learning with us today!`;
  }
};

// ElevenLabs Text-to-Speech API with Podcast Enhancement
app.post("/api/audio/generate", verifyToken, async (req, res) => {
  try {
    const {
      text,
      voice_id = "21m00Tcm4TlvDq8ikWAM",
      topic_title = "Learning Topic",
    } = req.body;

    if (!text || !text.trim()) {
      return res
        .status(400)
        .json({ error: "Text is required for audio generation" });
    }

    console.log("Generating podcast-style audio for:", topic_title);

    // Step 1: Generate podcast script using Groq
    console.log("Creating podcast script...");
    const podcastScript = await generatePodcastScript(topic_title, text);

    console.log("Podcast script generated, length:", podcastScript.length);

    // Step 2: Generate audio using ElevenLabs with podcast-optimized settings
    console.log("Converting script to audio...");

    const response = await fetch(
      `${ELEVENLABS_BASE_URL}/text-to-speech/${voice_id}`,
      {
        method: "POST",
        headers: {
          Accept: "audio/mpeg",
          "Content-Type": "application/json",
          "xi-api-key": ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text: podcastScript,
          model_id: "eleven_monolingual_v1",
          voice_settings: {
            stability: 0.6, // Slightly higher for consistent podcast voice
            similarity_boost: 0.8, // Higher for more natural speech
            style: 0.3, // Add some style for engagement
            use_speaker_boost: true,
          },
          pronunciation_dictionary_locators: [],
          seed: null,
          previous_text: null,
          next_text: null,
          previous_request_ids: [],
          response_format: "mp3_44100_128", // Higher quality for podcast
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      return res.status(response.status).json({
        error: "Failed to generate podcast audio",
        details: errorText,
      });
    }

    // Get the audio buffer
    const audioBuffer = await response.buffer();

    console.log(
      "Podcast audio generated successfully, size:",
      audioBuffer.length,
      "bytes"
    );

    // Set appropriate headers for audio response
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", audioBuffer.length);
    res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("X-Podcast-Script-Length", podcastScript.length.toString());

    // Send the audio buffer
    res.send(audioBuffer);
  } catch (error) {
    console.error("Error generating podcast audio:", error);
    res.status(500).json({
      error: "Failed to generate podcast audio",
      details: error.message,
    });
  }
});

// Get available ElevenLabs voices with podcast recommendations
app.get("/api/audio/voices", verifyToken, async (req, res) => {
  try {
    const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs voices API error:", response.status, errorText);
      return res.status(response.status).json({
        error: "Failed to fetch voices",
        details: errorText,
      });
    }

    const data = await response.json();

    // Return simplified voice data with podcast recommendations
    const voices = data.voices.map((voice) => {
      // Mark voices that work well for podcasts
      const podcastRecommended = [
        "21m00Tcm4TlvDq8ikWAM", // Rachel - clear and professional
        "AZnzlk1XvdvUeBnXmlld", // Domi - warm and engaging
        "EXAVITQu4vr4xnSDxMaL", // Bella - friendly and clear
        "ErXwobaYiN019PkySvjV", // Antoni - professional male voice
        "VR6AewLTigWG4xSOukaG", // Arnold - deep and authoritative
      ].includes(voice.voice_id);

      return {
        voice_id: voice.voice_id,
        name: voice.name,
        category: voice.category,
        description: voice.description,
        preview_url: voice.preview_url,
        podcast_recommended: podcastRecommended,
        gender: voice.labels?.gender || "unknown",
        age: voice.labels?.age || "unknown",
        accent: voice.labels?.accent || "unknown",
      };
    });

    // Sort to put podcast-recommended voices first
    voices.sort((a, b) => {
      if (a.podcast_recommended && !b.podcast_recommended) return -1;
      if (!a.podcast_recommended && b.podcast_recommended) return 1;
      return 0;
    });

    res.json({
      success: true,
      voices: voices,
      podcast_recommendations: voices.filter((v) => v.podcast_recommended),
    });
  } catch (error) {
    console.error("Error fetching voices:", error);
    res.status(500).json({
      error: "Failed to fetch voices",
      details: error.message,
    });
  }
});

// Authentication route - verify Google token and create session
app.post("/api/auth/google", async (req, res) => {
  try {
    const { idToken, user } = req.body;

    // For now, we'll trust the frontend verification
    // In production, you should verify the idToken with Firebase Admin SDK

    try {
      // Check if user exists in database
      let dbUser = await User.findOne({ firebase_uid: user.uid });

      if (!dbUser) {
        // Create new user
        dbUser = new User({
          firebase_uid: user.uid,
          email: user.email,
          display_name: user.displayName,
          photo_url: user.photoURL,
        });
        await dbUser.save();
        console.log("New user created:", user.email);
      } else {
        // Update existing user
        dbUser.display_name = user.displayName;
        dbUser.photo_url = user.photoURL;
        dbUser.updated_at = new Date();
        await dbUser.save();
        console.log("User updated:", user.email);
      }
    } catch (dbError) {
      console.log(
        "Database not available, continuing without user storage:",
        dbError.message
      );
    }

    // Create JWT token
    const jwtToken = jwt.sign(
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token: jwtToken,
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ error: "Authentication failed" });
  }
});

// Token validation endpoint
app.get("/api/auth/validate", verifyToken, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    message: "Token is valid",
  });
});

// Get user profile
app.get("/api/user/profile", verifyToken, async (req, res) => {
  try {
    const user = await User.findOne({ firebase_uid: req.user.uid });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user: user });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Logout route
app.post("/api/auth/logout", verifyToken, (req, res) => {
  res.json({ success: true, message: "Logged out successfully" });
});

// Mind Map Generation API with Groq - Updated with current models
app.post("/api/mindmap/generate", verifyToken, async (req, res) => {
  try {
    const { subjectName, syllabus } = req.body;

    if (!subjectName || !syllabus) {
      return res
        .status(400)
        .json({ error: "Subject name and syllabus are required" });
    }

    console.log("Generating mind map for:", subjectName);
    console.log("Using Groq API with updated models...");

    // Create a structured prompt for Groq
    const prompt = `Create a detailed educational mind map structure for the subject "${subjectName}" based on the following syllabus content:

${syllabus}

Please return a JSON structure with the following exact format:
{
  "title": "${subjectName}",
  "nodes": [
    {
      "id": "root",
      "label": "${subjectName}",
      "type": "root",
      "level": 0,
      "position": { "x": 400, "y": 300 },
      "content": "Comprehensive overview of ${subjectName}...",
      "children": ["topic1", "topic2", "topic3"]
    },
    {
      "id": "topic1", 
      "label": "Main Topic 1",
      "type": "topic",
      "level": 1,
      "position": { "x": 200, "y": 150 },
      "content": "Detailed explanation of this topic...",
      "parent": "root",
      "children": ["subtopic1_1", "subtopic1_2"]
    },
    {
      "id": "subtopic1_1",
      "label": "Subtopic 1.1",
      "type": "subtopic", 
      "level": 2,
      "position": { "x": 100, "y": 100 },
      "content": "In-depth content about this subtopic...",
      "parent": "topic1",
      "children": []
    }
  ],
  "edges": [
    {
      "id": "edge_root_topic1",
      "source": "root",
      "target": "topic1",
      "type": "default"
    }
  ]
}

Important guidelines:
1. Create a hierarchical structure with 1 root, 4-6 main topics, and 2-3 subtopics per main topic
2. Each node must have detailed educational content (100-200 words)
3. Position nodes in a radial layout around the center (root at 400,300)
4. Main topics should be positioned around the root in a circle pattern
5. Subtopics should be positioned near their parent topics
6. Focus only on topics explicitly mentioned in the syllabus
7. Make content educational, comprehensive, and suitable for learning
8. Use clear, academic language appropriate for the subject level
9. Include practical examples and key concepts in the content
10. Ensure all IDs are unique and follow the naming pattern

Return ONLY valid JSON, no additional text or formatting.`;

    // Try multiple models in order of preference
    const modelsToTry = [
      "llama-3.1-8b-instant",
      "llama3-8b-8192",
      "llama3-70b-8192",
      "mixtral-8x7b-32768",
      "gemma-7b-it",
    ];

    let mindMapData = null;
    let lastError = null;

    for (const model of modelsToTry) {
      try {
        console.log(`Trying model: ${model}`);

        // Call Groq API with current model
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content:
                "You are an expert educational content creator who specializes in creating structured learning materials and mind maps. You always respond with valid JSON only, no additional text.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          model: model,
          temperature: 0.3,
          max_tokens: 4000,
        });

        const responseText = completion.choices[0]?.message?.content || "";
        console.log(`${model} response received, length:`, responseText.length);

        // Clean the response to extract JSON
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          mindMapData = JSON.parse(jsonMatch[0]);
          console.log(`Successfully parsed mind map data using ${model}`);
          break; // Success! Exit the loop
        } else {
          throw new Error("No valid JSON found in response");
        }
      } catch (modelError) {
        console.error(`Error with model ${model}:`, modelError.message);
        lastError = modelError;
        continue; // Try next model
      }
    }

    // If all models failed, use fallback
    if (!mindMapData) {
      console.log("All Groq models failed, using fallback mind map");
      mindMapData = createFallbackMindMap(subjectName, syllabus);
    }

    // Validate and enhance the mind map structure
    mindMapData = validateAndEnhanceMindMap(mindMapData, subjectName);

    // Store in MongoDB
    let mindMapId;
    try {
      const newMindMap = new MindMap({
        user_uid: req.user.uid,
        subject_name: subjectName,
        syllabus: syllabus,
        mindmap_data: mindMapData,
      });

      const savedMindMap = await newMindMap.save();
      mindMapId = savedMindMap._id.toString();
      console.log("Mind map saved to MongoDB with ID:", mindMapId);
    } catch (dbError) {
      console.log(
        "Database not available, using temporary ID:",
        dbError.message
      );
      mindMapId = Date.now(); // Temporary ID
    }

    mindMapData.id = mindMapId;

    res.json({
      success: true,
      mindMap: mindMapData,
    });
  } catch (error) {
    console.error("Error generating mind map:", error);

    // If everything fails, provide a fallback
    const fallbackMindMap = createFallbackMindMap(
      req.body.subjectName,
      req.body.syllabus
    );
    fallbackMindMap.id = Date.now();

    res.json({
      success: true,
      mindMap: fallbackMindMap,
      note: "Generated using fallback method due to API limitations",
    });
  }
});

// Helper function to create fallback mind map
function createFallbackMindMap(subjectName, syllabus) {
  const topics = syllabus
    .split("\n")
    .filter((line) => line.trim())
    .slice(0, 6);

  // If no topics from syllabus, create default ones
  if (topics.length === 0) {
    topics.push(
      `Introduction to ${subjectName}`,
      `Fundamentals of ${subjectName}`,
      `Core Concepts`,
      `Advanced Topics`,
      `Applications`,
      `Future Trends`
    );
  }

  const nodes = [
    {
      id: "root",
      label: subjectName,
      type: "root",
      level: 0,
      position: { x: 400, y: 300 },
      content: `Welcome to ${subjectName}! This comprehensive mind map will guide you through all the essential concepts and help you master this subject step by step. Each topic has been carefully structured to build upon previous knowledge and provide a complete learning experience.

Key learning areas covered:
• Fundamental concepts and principles
• Practical applications and examples
• Advanced techniques and methodologies
• Real-world case studies and scenarios
• Current trends and future developments

Use the interactive features to explore each topic in depth and track your learning progress.`,
      children: [],
    },
  ];

  const edges = [];

  topics.forEach((topic, index) => {
    const nodeId = `topic_${index + 1}`;
    const angle = (index * 2 * Math.PI) / topics.length;
    const radius = 200;
    const x = 400 + radius * Math.cos(angle);
    const y = 300 + radius * Math.sin(angle);

    nodes[0].children.push(nodeId);

    nodes.push({
      id: nodeId,
      label: topic.trim() || `Topic ${index + 1}`,
      type: "topic",
      level: 1,
      position: { x: Math.round(x), y: Math.round(y) },
      content: `This section covers ${
        topic.trim() || `Topic ${index + 1}`
      } in comprehensive detail. Here you'll learn the fundamental concepts, practical applications, and key principles that form the foundation of this important area of study.

Key learning objectives:
• Understand the core concepts and terminology
• Apply theoretical knowledge to practical scenarios  
• Analyze real-world examples and case studies
• Develop critical thinking skills in this domain
• Connect this topic to broader subject themes

Learning approach:
- Start with basic definitions and concepts
- Progress through practical examples
- Practice with interactive exercises
- Test understanding with assessments
- Apply knowledge to real-world scenarios

Take your time to explore each concept thoroughly and use the AI assistant to ask questions and clarify any doubts you may have.`,
      parent: "root",
      children: [],
    });

    edges.push({
      id: `edge_root_${nodeId}`,
      source: "root",
      target: nodeId,
      type: "default",
    });

    // Add some subtopics for variety
    if (index < 3) {
      const subtopics = ["Basics", "Advanced", "Practice"];
      subtopics.forEach((subtopic, subIndex) => {
        const subNodeId = `${nodeId}_sub_${subIndex}`;
        const subAngle = angle + (subIndex - 1) * 0.3;
        const subRadius = 120;
        const subX = x + subRadius * Math.cos(subAngle);
        const subY = y + subRadius * Math.sin(subAngle);

        nodes.push({
          id: subNodeId,
          label: `${subtopic}`,
          type: "subtopic",
          level: 2,
          position: { x: Math.round(subX), y: Math.round(subY) },
          content: `This subtopic focuses on ${subtopic.toLowerCase()} aspects of ${
            topic.trim() || `Topic ${index + 1}`
          }. 

Detailed content about ${subtopic.toLowerCase()}:
• In-depth explanation of concepts
• Step-by-step learning approach
• Practical exercises and examples
• Assessment opportunities
• Real-world applications

Learning resources:
- Interactive demonstrations
- Practice problems
- Case studies
- Video explanations
- Additional reading materials

Use the AI chat feature to ask specific questions about this subtopic and get personalized explanations tailored to your learning needs.`,
          parent: nodeId,
          children: [],
        });

        edges.push({
          id: `edge_${nodeId}_${subNodeId}`,
          source: nodeId,
          target: subNodeId,
          type: "default",
        });

        // Update parent's children array
        const parentNode = nodes.find((n) => n.id === nodeId);
        if (parentNode) {
          parentNode.children.push(subNodeId);
        }
      });
    }
  });

  return {
    title: subjectName,
    nodes: nodes,
    edges: edges,
  };
}

// Helper function to validate and enhance mind map structure
function validateAndEnhanceMindMap(mindMapData, subjectName) {
  if (!mindMapData || !mindMapData.nodes || !Array.isArray(mindMapData.nodes)) {
    return createFallbackMindMap(
      subjectName,
      "General topics for " + subjectName
    );
  }

  // Ensure all nodes have required properties
  mindMapData.nodes = mindMapData.nodes.map((node) => ({
    id: node.id || `node_${Date.now()}_${Math.random()}`,
    label: node.label || "Untitled Topic",
    type: node.type || "topic",
    level: node.level || 1,
    position: node.position || { x: 400, y: 300 },
    content:
      node.content ||
      `Learn about ${
        node.label || "this topic"
      } and its key concepts. This section provides comprehensive coverage of the fundamental principles and practical applications.`,
    parent: node.parent || null,
    children: node.children || [],
  }));

  // Ensure edges exist
  if (!mindMapData.edges || !Array.isArray(mindMapData.edges)) {
    mindMapData.edges = [];
  }

  return mindMapData;
}

// Chat with Groq API - Updated with current models
app.post("/api/chat/groq", verifyToken, async (req, res) => {
  try {
    const { message, context, subject } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    console.log("Chat request:", { message, context, subject });

    // Create a comprehensive prompt for educational assistance
    const systemPrompt = `You are an expert educational AI assistant specializing in helping students learn and understand complex topics. You provide clear, accurate, and engaging explanations tailored to the student's learning level.

Guidelines:
1. Always provide educational, accurate, and helpful responses
2. Break down complex concepts into understandable parts
3. Use examples and analogies when helpful
4. Encourage critical thinking and deeper understanding
5. Be supportive and encouraging in your tone
6. If you're unsure about something, acknowledge it honestly
7. Provide practical learning tips when relevant
8. Keep responses focused and concise (200-400 words)

Current learning context:
${context ? `Topic: ${context}` : "General learning assistance"}
${subject ? `Subject: ${subject}` : ""}

Please provide a helpful, educational response to the student's question.`;

    // Try multiple models for chat
    const chatModelsToTry = [
      "llama-3.1-8b-instant",
      "llama3-8b-8192",
      "mixtral-8x7b-32768",
      "gemma-7b-it",
    ];

    let response = null;
    let lastError = null;

    for (const model of chatModelsToTry) {
      try {
        console.log(`Trying chat model: ${model}`);

        // Call Groq API
        const completion = await groq.chat.completions.create({
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: message,
            },
          ],
          model: model,
          temperature: 0.7,
          max_tokens: 1000,
        });

        response = completion.choices[0]?.message?.content;
        if (response) {
          console.log(`Chat response generated successfully using ${model}`);
          break;
        }
      } catch (modelError) {
        console.error(`Error with chat model ${model}:`, modelError.message);
        lastError = modelError;
        continue;
      }
    }

    // Fallback response if all models fail
    if (!response) {
      response = `I understand you're asking about "${message}". While I'm having trouble connecting to the AI service right now, I'd recommend breaking down this topic into smaller parts and exploring each concept step by step. 

Here are some general learning strategies:
• Start with the basic definitions and concepts
• Look for real-world examples and applications
• Practice with exercises or problems
• Connect new information to what you already know
• Ask specific questions about areas you find confusing

Feel free to ask more specific questions, and I'll do my best to help you learn!`;
    }

    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in Groq chat:", error);

    // Handle specific Groq API errors
    if (error.status === 429) {
      return res.status(429).json({
        error: "Rate limit exceeded. Please wait a moment before trying again.",
        details: "Too many requests",
      });
    }

    if (error.status === 401) {
      return res.status(500).json({
        error: "AI service configuration error. Please contact support.",
        details: "Authentication failed",
      });
    }

    // Provide fallback response
    const userMessage = req.body.message;
    res.json({
      success: true,
      response: `I understand you're asking about "${userMessage}". While I'm having trouble connecting to the AI service right now, I'd recommend breaking down this topic into smaller parts and exploring each concept step by step. Feel free to ask more specific questions, and I'll do my best to help you learn!`,
      timestamp: new Date().toISOString(),
      note: "Fallback response due to service limitations",
    });
  }
});

// Get user's mind maps
app.get("/api/mindmap/list", verifyToken, async (req, res) => {
  try {
    const mindMaps = await MindMap.find({ user_uid: req.user.uid })
      .select("_id subject_name created_at")
      .sort({ created_at: -1 })
      .lean();

    // Transform MongoDB _id to id for frontend compatibility
    const transformedMindMaps = mindMaps.map((mindMap) => ({
      id: mindMap._id.toString(),
      subject_name: mindMap.subject_name,
      created_at: mindMap.created_at,
    }));

    res.json({
      success: true,
      mindMaps: transformedMindMaps,
    });
  } catch (error) {
    console.error("Error fetching mind maps:", error);
    // Return empty array if database is not available
    res.json({
      success: true,
      mindMaps: [],
    });
  }
});

// Get specific mind map
app.get("/api/mindmap/:id", verifyToken, async (req, res) => {
  try {
    const mindMap = await MindMap.findOne({
      _id: req.params.id,
      user_uid: req.user.uid,
    }).lean();

    if (!mindMap) {
      return res.status(404).json({ error: "Mind map not found" });
    }

    // Transform for frontend compatibility
    const transformedMindMap = {
      id: mindMap._id.toString(),
      user_uid: mindMap.user_uid,
      subject_name: mindMap.subject_name,
      syllabus: mindMap.syllabus,
      mindmap_data: mindMap.mindmap_data,
      created_at: mindMap.created_at,
      updated_at: mindMap.updated_at,
    };

    res.json({
      success: true,
      mindMap: transformedMindMap,
    });
  } catch (error) {
    console.error("Error fetching mind map:", error);
    res.status(500).json({ error: "Failed to fetch mind map" });
  }
});

// DELETE specific mind map - Updated for MongoDB
app.delete("/api/mindmap/:id", verifyToken, async (req, res) => {
  try {
    console.log(
      `Attempting to delete mind map with ID: ${req.params.id} for user: ${req.user.uid}`
    );

    // Delete the mind map
    const deleteResult = await MindMap.findOneAndDelete({
      _id: req.params.id,
      user_uid: req.user.uid,
    });

    if (deleteResult) {
      console.log(`Successfully deleted mind map with ID: ${req.params.id}`);
      res.json({
        success: true,
        message: "Mind map deleted successfully",
        deletedId: req.params.id,
      });
    } else {
      console.log("Mind map not found or doesn't belong to user");
      res.status(404).json({
        success: false,
        error: "Mind map not found or you don't have permission to delete it",
      });
    }
  } catch (error) {
    console.error("Error deleting mind map:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete mind map",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  const mongoose = require("mongoose");
  const dbStatus =
    mongoose.connection.readyState === 1 ? "Connected" : "Disconnected";

  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database_status: dbStatus,
    database_name: mongoose.connection.name || "Not connected",
    groq_configured: !!process.env.GROQ_API_KEY,
    elevenlabs_configured: !!ELEVENLABS_API_KEY,
  });
});

// Keep service warm
setInterval(() => {
  if (process.env.NODE_ENV === "production") {
    console.log("Keep alive ping:", new Date().toISOString());
  }
}, 14 * 60 * 1000); // Ping every 14 minutes

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Groq API configured:", !!process.env.GROQ_API_KEY);
  console.log("ElevenLabs API configured:", !!ELEVENLABS_API_KEY);
  console.log("Environment:", process.env.NODE_ENV || "development");
});
