<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/03ca2bae-9fc9-4228-99a9-b85b4edb38f5

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`


   To run the SignBridge project locally after downloading it, follow these steps:
# 1. Extract and Navigate
First, extract the downloaded ZIP file and open your terminal or command prompt. Navigate into the project directory:
code

Bash
# 2. Install Dependencies
Install all the required packages (React, Vite, TensorFlow, MediaPipe, etc.) using npm:
code
Bash
npm install

# 3. Set Up Environment Variables
The app requires a Gemini API key to power the sign interpretation and AI avatar features.
Create a new file named .env in the root directory.
Copy the content from .env.example into .env.
Add your Gemini API key (you can get one for free at ai.google.dev):
code
Env
GEMINI_API_KEY=your_actual_api_key_here

# 4. Run the Development Server
Start the local development server:
code
Bash
npm run dev

# 5. Access the App
Once the server is running, open your browser and go to:
http://localhost:3000
Key Scripts Summary:
npm run dev: Starts the app in development mode (with hot-reloading).
npm run build: Creates a production-ready build in the dist/ folder.
npm run lint: Checks the project for TypeScript errors.

Note: Since the app uses your camera for sign language detection and object detection, make sure to grant camera permissions in your browser when prompted!

