<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

<h1>SignBridge</h1>
<p><i>Bridging the communication gap between the Deaf and hearing communities using AI-powered SASL translation.</i></p>

[![License: MIT](https://img.shields.io/badge/License-MIT-magenta.svg)](https://opensource.org/licenses/MIT)
</div>

## 🌟 Vision
SignBridge is an accessibility tool designed to enable seamless, two-way communication between South African Sign Language (SASL) users and non-signers. By leveraging real-time computer vision and state-of-the-art Large Language Models, we turn complex hand gestures into spoken word and voice into visual animations.

## ✨ Key Features

### 🖐️ Sign Language to Text & Voice
*   **Real-time Gesture Tracking:** Uses MediaPipe Hands to capture precise hand landmarks.
*   **Neural Interpretation:** Integrates Google Gemini 1.5 Flash to understand the spatial relationships and motion of signs.
*   **Continuous Mode:** Automatically detects and interprets signs without manual triggers.
*   **Voice Relay:** Instantly converts interpreted text into speech for hearing participants.

### 🎙️ Voice to Sign Avatar
*   **Multilingual Support:** Supports English and Zulu voice capture.
*   **AI Avatar:** A 3D-style landmark avatar that "signs" back to the user based on spoken input.
*   **Hybrid Library:** Combines a local library of standard signs with Gemini-generated sequences for rare words.

### 🌍 Translation & Accessibility
*   **Cross-Language Bridge:** Translate between English and Zulu while converting to SASL.
*   **High Contrast UI:** Designed with a "Cyberpunk" aesthetic for high visibility and modern feel.

## 🛠️ Tech Stack
*   **Frontend:** React 18, Vite, Tailwind CSS
*   **AI/ML Frameworks:** MediaPipe (Hand Tracking), TensorFlow.js
*   **LLM:** Google Gemini 1.5 Flash (via Google AI SDK)
*   **Animations:** Framer Motion
*   **Icons:** Lucide React

## 🚀 Local Setup

### Prerequisites
*   **Node.js:** v18.0.0 or higher
*   **Webcam:** Required for Sign-to-Text functionality.
*   **Gemini API Key:** Obtain one for free at [AI Studio](https://aistudio.google.com/).

### Installation Steps

1.  **Clone and Navigate:**
    ```bash
    git clone <your-repo-url>
    cd visionguide-ai
    ```

2.  **Install Dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment:**
    Create a `.env` file in the root directory:
    ```env
    VITE_GEMINI_API_KEY=your_actual_api_key_here
    ```

4.  **Launch:**
    ```bash
    npm run dev
    ```
    Access the app at `http://localhost:3000`.

## 📖 Usage Guide

1.  **Grant Permissions:** When prompted, allow camera and microphone access.
2.  **Sign to Text Mode:** Position your hands in the camera frame. Ensure good lighting. Use "Continuous Interpretation" for a hands-free experience.
3.  **Voice to Sign Mode:** Click "Start Recording" and speak clearly. Watch the AI Avatar translate your words into hand landmarks.
4.  **Language Switching:** Use the language toggle to switch between English and Zulu interpretation.

## 📝 Important Notes
*   **Lighting:** MediaPipe hand tracking performs best in well-lit environments with a neutral background.
*   **SASL Focus:** While optimized for South African Sign Language, the underlying neural model is capable of understanding various regional gesture patterns through context.

## 📄 License
This project is licensed under the MIT License. See the LICENSE file for details.

---
*Built for the Isazi Hackathon.*