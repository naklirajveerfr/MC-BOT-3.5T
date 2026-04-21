# 🤖 Minecraft AI Bot (Mineflayer-Based)

A fully automated Minecraft bot built using Mineflayer that can survive, fight, follow players, sleep, eat, and react intelligently to the environment.

---

## ⚙️ Features

### 🧭 Movement & Navigation
- Follow players in real time
- Pathfinding using mineflayer-pathfinder
- Auto-sprint while moving
- Escape from danger when low HP

### ⚔️ Combat System
- Kill mode to attack hostile mobs
- Automatically equips sword and shield
- Targets hostile mobs (zombies, skeletons, creepers, etc.)

### 🛡️ Survival AI
- Auto-flee when health is low
- Shields against nearby threats
- Continuous health monitoring

### 🍗 Hunger System
- Automatically eats food when hungry
- Warns when food is low

### 💤 Sleep System
- Detects night time
- Places and uses beds automatically
- Sleeps and wakes up safely

### 🎒 Inventory Management
- Auto-equips armor
- Equips best sword and shield
- Re-equips gear after pickup

### 🧠 Smart Awareness
- Tracks health, hunger, time
- Detects nearby mobs
- Reacts every tick in real time

### 💬 Chat Commands
- `come` → Follow player
- `follow_mode ON/OFF` → Toggle follow mode
- `kill_mode ON/OFF` → Toggle combat mode
- `stop` → Stop all actions
- `status` → Show bot stats

---

## 📦 Requirements

- Node.js 16+
- Minecraft server (tested on 1.21.1)

---

## 🚀 Setup

### 1. Clone the repository
```bash
git clone https://github.com/your-username/minecraft-bot.git
cd minecraft-bot
```
### 2. Install dependencies
```bash
npm install
```
### 3.Configure Settings 
Go to Settings.json and edit
```json
  "bot-account": {
    "username": "BOTNAME",
    "password": "",
    "type": "offline"
  },
  "server": {
    "ip": "ENTER SERVER IP",
    "port": ENTER SERVER PORT SET TO 25565 IF YOU DONT HAVE THE PORT,
    "version": "1.21.11"
  },
```

### 4.Run the Bot
```bash
node bot.js
```
