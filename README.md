# 🌦️ Local Weather & Holiday Dashboard  

A simple, interactive dashboard that displays **live weather**, **local time**, and **Namibian public holidays** — all in one page.  

---

## 🧩 Problem Statement  
Users require a quick, one-page platform where they can instantly view **local weather**, **forecasts**, **alerts**, and **air quality data** without switching between multiple platforms or relying on potentially inaccurate global information.  

---

## 🚀 Main Features  
- 🕒 **Local time display**  
- 🌤️ **Live weather updates** via API  
- 🎉 **Public holidays** fetched from a local JSON file  
- ⏳ **Countdown to the weekend** widget  

---

## ✨ Additional Features  
- 🏙️ **City Search Functionality:**  
  Allows users to search for any city within Namibia to view that city’s **current weather** and **upcoming public holidays**.  

- 📅 **Public Holiday API Integration:**  
  Public holidays are fetched from the **Nager.Date API** based on the detected country.  
  If a country is unsupported, only **weather** and **air quality** data will be displayed.  

- 💨 **Air Quality Index (AQI) Display:**  
  Shows the **air quality level** for the selected city, helping users understand environmental conditions alongside the weather data.  

---

## 🧰 Tech Stack  
- **HTML** – Page structure  
- **CSS** – Styling and layout  
- **JavaScript** – Interactive functionality  
- **APIs** – For real-time, location-based weather and air quality data  

---

## 🖥️ System Requirements  
- Any modern web browser (Chrome, Edge, Firefox, etc.)  
- [Visual Studio Code](https://code.visualstudio.com/) for development  

---

## ⚙️ Installation & Setup  

> **Note:** Visual Studio Code is required!  

1. **Extract** the zipped project folder using File Explorer.  
2. **Open** the folder in Visual Studio Code and click **“Trust Authors.”**  
3. **Install** the **Live Server** extension (if not already installed).  
4. **Open** the `index.html` file.  
5. **Right-click** on `index.html` → Select **“Open with Live Server”** to launch the dashboard in your browser.  

---

## 🧭 Usage Guide  

When you open `index.html` in your browser, the dashboard will display:  
- Local time  
- Current weather  
- Public holidays  
- Countdown to the weekend  

### 🔍 City Search  
You can search for a **specific city** within Namibia — the dashboard will update to show that city’s **weather** and **air quality** information.  

### 🌗 Theme Toggle  
Click the theme button (☀️🌙) to switch between **light** and **dark** modes.  

### 🔄 Refresh  
Click the **Refresh** button to reload the webpage and fetch the latest data.  

---

## 🖼️ Screenshots  

> *(Insert screenshots here — e.g., default view, city search result, dark mode, refresh action, etc.)*  

---

## 🔒 Security & Authentication  
This dashboard does **not** include authentication features.  
It is designed for **public viewing** and does **not store any user data**.  

---

## 🌐 API Usage  
This project does **not** use a custom API.  
Instead, it integrates external APIs for:  
- **Weather**  
- **Air Quality**  
- **Geocoding**  

and combines these with a **local JSON file** containing Namibian public holidays.  

Data is fetched dynamically using JavaScript’s native `fetch()` function and updated in **real time** on the dashboard.  

---

## 👥 Team & Contributions  
All team members contributed equally to:  
- Research  
- Coding  
- Testing  
- Documentation  

---
