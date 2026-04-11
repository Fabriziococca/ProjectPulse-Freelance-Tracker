# ProjectPulse ⚡
> **Freelance Deadline Tracker with Adaptive Urgency Logic.**

ProjectPulse is a high-performance Progressive Web App (PWA) designed for freelancers to manage project deadlines with precision. Instead of simple reminders, it provides a visual "pulse" of your workload using adaptive time-consumption algorithms.

## 🚀 Why ProjectPulse?
Managing multiple clients on platforms like Workana, Fiver or Upwork requires more than just knowing a date. You need to know how much "breathing room" you actually have. 

This app calculates the exact delivery time based on acceptance dates and provides a **dynamic color-coded urgency system** based on the percentage of time remaining.

## ✨ Key Features
- **Adaptive Alert System:** Visual cues change from Green to Danger Red based on the percentage of time consumed, not just fixed days.
- **Precision Deadlines:** Automatic calculation of delivery dates and times from the moment of project acceptance.
- **Offline-First Architecture:** Data stays on your device. Zero latency, total privacy.
- **Robust Backup System:** Export and import your entire project history via JSON files.
- **PWA Ready:** Install it on your mobile device for instant access, just like a native app.

## 🛠️ Tech Stack
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Persistence:** LocalStorage API.
- **Architecture:** Progressive Web App (PWA) with Service Workers.
- **UI/UX:** Dark Mode optimized for high-focus work environments.

## 📦 Installation
Since this is a PWA, no store is needed:
1. Visit the [GitHub Pages link](https://fabriziococca.github.io/ProjectPulse/).
2. On Chrome (Mobile): Tap the three dots and select **"Install App"** or **"Add to Home Screen"**.
3. On Desktop: Click the install icon in the address bar.

## 📊 Urgency Logic
The "Pulse" bar changes color dynamically:
- **Green:** >50% time remaining (On track).
- **Yellow:** 20% - 50% time remaining (Steady progress needed).
- **Orange:** 5% - 20% time remaining (Priority focus).
- **Red:** <5% time remaining (Immediate delivery required).

---
Developed with 🧉 by **Fabrizio Cocca** - *Systems Information & Backend Architect.*