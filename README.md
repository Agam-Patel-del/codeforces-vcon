# Codeforces-Vcon

**Codeforces-Vcon** is a Chrome extension designed to seamlessly integrate a dedicated "Virtual Contests" interface directly into Codeforces. It allows competitive programmers to effortlessly track, filter, and visualize their performance in virtual contests with an authentic, pixel-perfect Codeforces UI.

## Features

* **Authentic Codeforces UI:** The extension injects a highly polished interface that perfectly mimics Codeforces' native CSS. From the `Cuprum` navigation font to the precise navbar spacing and colored user handles, it feels like an official Codeforces feature.
* **Smart Contest Filtering:** Easily toggle your contest history between **Virtuals**, **Official**, or **All** contests. 
* **Dynamic Performance Graph:** Visualizes your rating and performance trends over time. The graph instantly updates based on your active filter (defaulting to Virtuals).
* **Multi-Account Support & Caching:** Want to track a friend's progress? The extension manages an LRU (Least Recently Used) cache of up to 25 different user handles. Your primary handle acts as a protected "VIP" and will never be pushed out of the cache.
* **Fast & Responsive:** Built with React and bundled via Vite, the extension is heavily optimized for speed, leveraging cached API data so you aren't constantly waiting for network requests.

## Installation

Since this is a Chrome Extension, you can load it directly into your browser:

1. Clone or download this repository to your local machine.
2. If you are developing or pulling from source, build the extension using `npm install` and then `npm run build` (or `npx vite build`). The built files will be output to the `dist` folder.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Enable **Developer mode** (toggle switch in the top right corner).
5. Click **Load unpacked** and select the built `dist` folder from this repository.
6. The extension is now installed! Navigate to Codeforces and you will see the new "VIRTUALS" tab in the main navigation menu.

## Tech Stack

* **Frontend:** React, JSX
* **Styling:** Vanilla CSS (Strictly adheres to standard Codeforces styling rules and absolute `px` units for cross-context stability).
* **Build Tool:** Vite

## Usage

1. Open [Codeforces](https://codeforces.com/).
2. Look for the **VIRTUALS** tab in the top navigation bar (right next to "CONTESTS").
3. Click it to view your virtual contest history.
4. Use the built-in search/input bar to quickly switch to another user's handle and see their stats!

## License

This project is open-source and free to use.
