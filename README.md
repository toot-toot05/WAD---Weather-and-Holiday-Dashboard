# Local Weather & Holiday Dashboard

A simple dashboard that displays live weather, local time, and Namibian public holidays.

## Problem Statement

Users need a quick, one-page location to consult instant local weather and context-driven data (forecast, alerts, air quality) without switching between multiple platforms or relying on potentially inaccurate global information.

## Main Features

- Local time display  
- Live weather updates via API  
- Public holidays from a local JSON file  
- Countdown to the weekend widget  

## Tech Stack

- HTML – for the structure  
- CSS – for styling  
- JavaScript – to make the webpage interactive  
- APIs – to fetch real-time location-based weather data  

## System Requirements

- Any modern web browser (Chrome, Edge, Firefox, etc.)  
- Visual Studio Code for development  

## Installation & Setup

1. Extract the zipped folder in File Explorer.  
2. Open the folder in Visual Studio Code and click **Trust Authors**.  
3. Install the **Live Server** extension if you don’t have it already.  
4. Open the `index.html` file.  
5. Right-click on the `index.html` file and select **Open with Live Server** to view it in your browser.  

## Usage Guide

- When you open `index.html` in your browser, the dashboard will display:  
  - Local time  
  - Weather information  
  - Public holidays  
  - Countdown to the weekend  

- **Theme Toggle:** Click the theme button (☀️🌙) to switch between light and dark mode.  
- **Refresh:** Click the Refresh button to reload the webpage.  

## Security & Authentication

This dashboard does not include authentication features. It is designed for public viewing and does not store any user data.

## API Usage

We did not create our own API. The project consumes external APIs (weather, air quality, geocoding) and combines them with a local JSON file containing Namibian public holidays. Data is fetched dynamically using JavaScript’s `fetch()` function and displayed in real-time on the dashboard.

## Team & Contributions

All team members contributed equally to research, coding, testing, and documentation.

## Project Status / Future Work

This version of the project is fully functional. Future improvements include optimizing performance and expanding functionality.
