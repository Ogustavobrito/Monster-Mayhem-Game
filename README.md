# Monster Mayhem

Monster Mayhem is a simultaneous-turn, grid-based multiplayer strategy game. Players summon and control monsters with the goal of eliminating opponents and being the last one standing.

## 🕹️ Game Mechanics

### 🔁 Turn System

- Each round, **all players submit their moves at the same time**.
- The server collects and processes all actions **simultaneously**.
- Once resolved, the updated board is broadcast to all players.

### 🧟 Monster Placement & Movement

- On their turn, a player may **summon a Vampire, Werewolf, or Ghost** on **any square along their own edge** of the board.
  - Monsters **cannot move on the same turn they are summoned**.
- Players may move any monsters they already control on the board.
- Monsters can move:
  - **Any number of squares** horizontally or vertically.
  - **Up to 2 squares diagonally**.
- Monsters can **move over their own units**, but **not over opponent monsters**.

### ⚔️ Combat Resolution

If two or more monsters end their move on the same square, combat is resolved as follows:

- 🧛 Vampire vs. 🐺 Werewolf → **Werewolf is removed**
- 🐺 Werewolf vs. 👻 Ghost → **Ghost is removed**
- 👻 Ghost vs. 🧛 Vampire → **Vampire is removed**
- 🧛 vs. 🧛, 🐺 vs. 🐺, 👻 vs. 👻 → **Both monsters are removed**

### 🏆 Elimination & Victory

- A player's turn ends when they choose to finish it, or when they have no monsters left to move.
- A round ends once **all players have taken their turn**.
- A player is **eliminated** after **10 of their monsters have been removed**.
- The **last remaining player** wins the game.

## 🎮 Features

- Real-time gameplay with simultaneous turns
- Server-client communication via Socket.IO
- Grid-based board with combat logic
- Persistent tracking of wins/losses per player
- Player stats saved with MongoDB

## 🧰 Tech Stack

- Node.js
- Express
- Socket.IO
- MongoDB
- HTML/CSS/JS

## 🚀 How to Run the Project Locally

To run the project on your machine, follow these steps:

```bash
# 1. Clone this repository
git clone https://github.com/Ogustavobrito/Monster-Mayhem-game.git
cd Monster-Mayhem-game

# 2. Install dependencies
npm install

# 3. Start the server
npm start

#4. Open the 4 tabs on the browser and got to:
http://localhost:3000
```
