# Civic App — iPhone Setup Guide

A complete guide for getting this app running on your iPhone.
No prior iOS development experience needed.

---

## What you need

- A Mac or Windows PC
- Your iPhone
- A free Expo account (you'll create one below)
- Your Supabase project URL and anon key

---

## Step 1 — Install Node.js

If you already set up the scraper backend, Node.js is already installed. Skip to Step 2.

Otherwise, go to https://nodejs.org and download the LTS version. Install it like any normal app.

Verify it worked by opening Terminal and running:
```
node --version
```
You should see a version number.

---

## Step 2 — Install Expo Go on your iPhone

Expo Go is a free app that lets you run your app on your phone without going through the App Store.

1. Open the App Store on your iPhone
2. Search for **Expo Go**
3. Install it (it's free, made by Expo)

---

## Step 3 — Create a free Expo account

Go to https://expo.dev and click "Sign Up". You need this to connect your phone to your computer.

---

## Step 4 — Set up the project on your computer

Open Terminal (Mac) or Command Prompt (Windows).

```bash
# Navigate into the civic-app folder
cd path/to/civic-app

# Install all dependencies
npm install
```

This will take a minute or two and creates a node_modules/ folder.

---

## Step 5 — Add your Supabase keys

Open the file:  lib/supabase.ts

Find these two lines near the top:
```
const SUPABASE_URL = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
```

Replace them with your real values. To find them:
1. Go to https://supabase.com and open your project
2. Click "Settings" in the left sidebar
3. Click "API"
4. Copy the "Project URL" → paste as SUPABASE_URL
5. Copy the "anon / public" key → paste as SUPABASE_ANON_KEY

IMPORTANT: Use the ANON key (not the service key) in the app.
The anon key is safe to use in a mobile app. The service key is not.

Save the file.

---

## Step 6 — Start the app

In Terminal, from inside the civic-app folder:

```bash
npm start
```

This starts the Expo development server. You'll see a QR code in the terminal.

---

## Step 7 — Open on your iPhone

1. Make sure your iPhone and computer are on the same WiFi network
2. Open the Camera app on your iPhone
3. Point it at the QR code in the terminal
4. Tap the notification that appears
5. Expo Go will open and your app will load

That's it! The app will update automatically as you make changes.

---

## Troubleshooting

**"Cannot connect to Metro" error**
Your phone and computer are on different networks. Make sure both are on the same WiFi.

**App loads but shows "Couldn't load items"**
Your Supabase keys are wrong or haven't been saved. Double-check Step 5.

**App shows items but no summaries**
The AI enrichment didn't run yet. Run `npm run backfill` in your civic-scraper folder.

**QR code doesn't scan**
In the terminal where npm start is running, press "w" to open a web version,
or press "s" to switch to Expo Go tunnel mode which works across different networks.

---

## Making it permanent on your iPhone (optional, later)

Right now the app only works when your computer is running npm start.
To make it always available on your phone, you have two options:

Option A — Expo EAS Build (easiest, free tier available):
  Run: npx eas build --platform ios
  This builds a real .ipa file you can install directly on your phone.
  You'll need a free Apple Developer account (https://developer.apple.com).

Option B — TestFlight:
  For distributing to a small group. Requires Apple Developer account ($99/year).

For now, just keep using Expo Go — it's perfect for personal use.

---

## File structure reference

```
civic-app/
├── app/
│   ├── _layout.tsx       ← Tab bar (purple nav)
│   ├── index.tsx         ← Feed screen
│   ├── upcoming.tsx      ← Upcoming events screen
│   └── starred.tsx       ← Starred items screen
├── components/
│   ├── CivicCard.tsx      ← The main feed card
│   └── PurpleHeader.tsx   ← Purple top header
├── hooks/
│   └── useCivicItems.ts   ← Supabase data fetching
├── lib/
│   ├── supabase.ts        ← PUT YOUR KEYS HERE
│   └── theme.ts           ← Colors and theme
├── package.json
└── app.json
```
