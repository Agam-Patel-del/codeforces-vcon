# Codeforces-Vcon

**Codeforces-Vcon** is a browser extension for **Google Chrome** and **Mozilla Firefox** that integrates a dedicated virtual contest history and performance analytics interface directly into Codeforces. It enables competitive programmers to track, analyze, and visualize their performance across virtual and unrated practice contests with an authentic user interface.

---

## Features

* **Authentic Codeforces Interface:**
  * Injects a seamless `VIRTUALS` navigation tab into the Codeforces top navbar.

* **Simulated Live Rank:**
  * Evaluates your virtual submission timestamps, points, and attempt penalties, slotting your score directly into the **official live standings** among all contestants.

* **Performance Rating & Delta Engine:**
  * **Performance Rating ($R_{\text{perf}}$):** Determines the exact rating level at which you competed in each round (the rating where $\Delta = 0$).
  * **Rating Delta ($\Delta$):** Computes projected rating gains/losses using the official Elo win-probability formula with binary search seeds and multi-tier deflation adjustments.
  * *(For full mathematical formulas and derivation, see [CALCULATIONS.md](CALCULATIONS.md).)*

* **Interactive Performance Graph:**
  * Visualizes your performance rating progression over time.

* **Sidebar Statistics & Trend Analysis:**
  * **Peak Performance:** Highest performance rating achieved, displayed with official Codeforces rank colors and titles (e.g. *Candidate Master*, *Expert*).
  * **Last 5 Contests Average Performance & Rank:** Arithmetic mean of your 5 most recent contests with real-time trend indicators (`↗` / `↘`) comparing your recent form against your all-time historical baseline.

* **Progressive Page-Based Loading:**
  * Discovers all virtual participations and renders the table in under half a second.
  * Prioritizes rank and rating calculations for the currently visible page first, while background workers enrich remaining history without blocking user interaction.

* **Smart Filtering & Multi-Handle LRU Cache:**
  * Filter contests by Participation Type (*All*, *Virtual Only*, *Unrated Live Only*), Division (*Div. 1*, *Div. 2*, *Div. 3*, *Div. 4*, *Educational*, *Global*), Problems Solved, and Sort Order.
  * Multi-handle LRU cache supporting up to 25 accounts with permanent protection for your primary handle.

---

## Screenshots

<details>
<summary>Screenshot 1</summary>
<br>

![](assets/screenshots/ss1.png)
</details>

<details>
<summary>Screenshot 2</summary>
<br>

![](assets/screenshots/ss2.png)
</details>

<details>
<summary>Screenshot 3</summary>
<br>

![](assets/screenshots/ss3.png)
</details>

---

## Installation & Setup

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18 or higher recommended)
* [Git](https://git-scm.com/)

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/Agam-Patel-del/codeforces-vcon.git
cd codeforces-vcon
```

---

### Step 2: Build the Extension

Run the single-command build for your browser:

* **For Google Chrome (and Chromium browsers):**
  ```bash
  npm run vcon
  ```
  *(Automatically pulls latest updates, installs dependencies, and builds into `dist/chrome`)*

* **For Mozilla Firefox:**
  ```bash
  npm run vcon:f
  # or: npm run vcon:firefox
  ```
  *(Automatically pulls latest updates, installs dependencies, and builds into `dist/firefox`)*

* **Build Both Chrome & Firefox at once:**
  ```bash
  npm run build:all
  ```


---

### Step 3: Load into Your Browser

#### 🌐 Google Chrome & Chromium Browsers (Brave, Edge, Opera, Arc)
1. Open Chrome and navigate to `chrome://extensions/` (or `edge://extensions/`, `brave://extensions/`).
2. Enable **Developer mode** (toggle switch in the top-right corner).
3. Click the **Load unpacked** button.
4. Select the **`dist/chrome`** folder in your cloned repository.
5. Open [Codeforces](https://codeforces.com/) to see the new **VIRTUALS** tab in the top navigation bar!

#### 🦊 Mozilla Firefox
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click the **Load Temporary Add-on...** button.
3. Open the **`dist/firefox`** folder and select the `manifest.json` file.
4. Open [Codeforces](https://codeforces.com/) to see the new **VIRTUALS** tab in the top navigation bar!

---

### Development Mode
To start a live development server:
```bash
npm run dev
```



---

## Mathematical Specification

For a complete breakdown of scoring rules, seed evaluations, binary search root finding, and multi-tier rating adjustments, refer to **[CALCULATIONS.md](CALCULATIONS.md)**.

---

## Tech Stack

* **Frontend:** React 18, JSX
* **Build Tool:** Vite
* **Styling:** Vanilla CSS
* **API:** Official Codeforces REST API

---

## License

This project is open source and available under the [MIT License](LICENSE).
