// script.js - ES module (overwrite old)
const ELEMENTS = {};
const YEAR = new Date().getFullYear();
let fetching = false;

// PWA metadata prefix for localStorage
const PWA_META_PREFIX = 'ql_last_update:';

document.addEventListener("DOMContentLoaded", () => {
  cacheEls();
  bindUI();
  initTheme();
  initPWAHandlers();
  locateAndFetch();
});

function cacheEls(){
  ELEMENTS.themeToggle = document.getElementById("themeToggle");
  ELEMENTS.refreshBtn = document.getElementById("refreshBtn");
  ELEMENTS.searchInput = document.getElementById("searchInput");  
  ELEMENTS.searchBtn = document.getElementById("searchBtn");      
  ELEMENTS.temp = document.getElementById("temp");
  ELEMENTS.weatherDesc = document.getElementById("weatherDesc");
  ELEMENTS.locationName = document.getElementById("locationName");
  ELEMENTS.currentIcon = document.getElementById("currentIcon");
  ELEMENTS.wind = document.getElementById("wind");
  ELEMENTS.highLow = document.getElementById("highLow");
  ELEMENTS.precip = document.getElementById("precip");
  ELEMENTS.alertStrip = document.getElementById("alertStrip");
  ELEMENTS.aqIndex = document.getElementById("aqIndex");
  ELEMENTS.aqLabel = document.getElementById("aqLabel");
  ELEMENTS.aqAdvice = document.getElementById("aqAdvice");
  ELEMENTS.pm25 = document.getElementById("pm25");
  ELEMENTS.pm10 = document.getElementById("pm10");
  ELEMENTS.aqDetails = document.getElementById("aqDetails");
  ELEMENTS.forecastList = document.getElementById("forecastList");
  ELEMENTS.holidayList = document.getElementById("holidayList");
  ELEMENTS.lastUpdated = document.getElementById("lastUpdated"); // optional in-page element
}

function bindUI(){
  ELEMENTS.themeToggle.addEventListener("change", (e) => {
    const dark = e.target.checked;
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("ql_theme", dark ? "dark" : "light");
  });

  ELEMENTS.refreshBtn.addEventListener("click", locateAndFetch);
  ELEMENTS.searchBtn.addEventListener("click", handleSearch);
  ELEMENTS.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch();
  });
}

function initTheme(){
  const savedTheme = localStorage.getItem("ql_theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    ELEMENTS.themeToggle.checked = true;
  } else {
    ELEMENTS.themeToggle.checked = false;
  }
}

function initPWAHandlers(){
  const updateBanner = () => {
    if (!navigator.onLine) {
      const last = localStorage.getItem(PWA_META_PREFIX + 'global') || null;
      if (window.__QL_PWA) window.__QL_PWA.showOfflineBanner(true, last ? new Date(last).toLocaleString() : '-');
    } else {
      if (window.__QL_PWA) window.__QL_PWA.showOfflineBanner(false);
    }
  };
  window.addEventListener('online', updateBanner);
  window.addEventListener('offline', updateBanner);
  updateBanner();
}

// === SEARCH FUNCTION ===
async function handleSearch(){
  const query = ELEMENTS.searchInput.value.trim();
  if (!query) return;
  
  if (fetching) return;
  fetching = true;
  ELEMENTS.searchBtn.disabled = true;
  ELEMENTS.refreshBtn.disabled = true;
  resetUI();

  try {
    const coords = query.split(",").map(s=>s.trim());
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      await fetchAll(Number(coords[0]), Number(coords[1]));
    } else {
      const geo = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&limit=1`);
      if (geo && geo[0]) {
        await fetchAll(Number(geo[0].lat), Number(geo[0].lon));
      } else {
        ELEMENTS.locationName.textContent = `Couldn't find "${query}"`;
      }
    }
  } catch (err) {
    console.error("Search failed:", err);
    ELEMENTS.locationName.textContent = "Search failed. Try again.";
  } finally {
    fetching = false;
    ELEMENTS.searchBtn.disabled = false;
    ELEMENTS.refreshBtn.disabled = false;
  }
}

// === Location & Data orchestration ===
async function locateAndFetch(){
  if (fetching) return;
  fetching = true;
  ELEMENTS.refreshBtn.disabled = true;
  resetUI(); // keeps placeholders intact

  try {
    let pos = await getPosition({timeout:9000});
    const {latitude, longitude} = pos.coords;
    await fetchAll(latitude, longitude);
  } catch (err) {
    console.warn("geolocation failed:", err?.message || err);
    // fallback: IP-based
    try {
      const ipInfo = await fetchJson("https://ipapi.co/json/");
      if (ipInfo && ipInfo.latitude && ipInfo.longitude) {
        await fetchAll(Number(ipInfo.latitude), Number(ipInfo.longitude), ipInfo);
      } else {
        const q = prompt("Couldn't auto-detect location. Type a city name (e.g., London) or lat,lon:");
        if (!q) {
          ELEMENTS.locationName.textContent = "Location unknown - grant location or enter a city manually.";
          throw new Error("user canceled location");
        }
        const coords = q.split(",").map(s=>s.trim());
        if (coords.length===2 && !isNaN(coords[0])) {
          await fetchAll(Number(coords[0]), Number(coords[1]));
        } else {
          const geo = await fetchJson(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=jsonv2&limit=1`);
          if (geo && geo[0]) {
            await fetchAll(Number(geo[0].lat), Number(geo[0].lon));
          } else {
            ELEMENTS.locationName.textContent = "Couldn't locate that place.";
            throw new Error("geocode failed");
          }
        }
      }
    } catch (e2) {
      console.error("fallback failed", e2);
      // show minimal failure UI
    }
  } finally {
    fetching = false;
    ELEMENTS.refreshBtn.disabled = false;
  }
}

function getPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("Geolocation not supported"));
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

async function fetchAll(lat, lon, ipFallback = null){
  ELEMENTS.locationName.textContent = `Lat ${lat.toFixed(3)}, Lon ${lon.toFixed(3)}`;
  // run parallel
  const weatherPromise = fetchWeather(lat, lon).catch(e => { throw e; });
  const aqPromise = fetchAirQuality(lat, lon).catch(e => e);
  const reversePromise = reverseGeocode(lat, lon).catch(e => e);

  // Await weather first (primary) but let others resolve in parallel
  const weather = await weatherPromise;
  renderWeather(weather);

  // resolve rest as available
  try {
    const rev = await reversePromise;
    if (rev && !rev.error) ELEMENTS.locationName.textContent = makeLocationLabel(rev);
    else if (ipFallback && ipFallback.city) ELEMENTS.locationName.textContent = `${ipFallback.city}, ${ipFallback.region}, ${ipFallback.country_name}`;
  } catch (e) {}

  try {
    const aq = await aqPromise;
    if (!aq || aq instanceof Error) throw new Error("aq fetch failed");
    renderAQ(aq);
  } catch (e) {
    ELEMENTS.aqLabel.textContent = "Air quality unavailable";
  }

  // holidays
  let countryCode = null;
  try {
    const rev2 = await fetchJson(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`);
    countryCode = rev2?.address?.country_code?.toUpperCase();
  } catch (e) {}
  if (!countryCode && ipFallback) countryCode = ipFallback.country_code;
  if (countryCode) {
    fetchHolidays(countryCode).then(renderHolidays).catch(err => {
      ELEMENTS.holidayList.textContent = "Couldn't load holidays.";
    });
  } else {
    ELEMENTS.holidayList.textContent = "Country not found; holidays unavailable.";
  }
}

// === Fetchers ===
async function fetchWeather(lat, lon){
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&hourly=temperature_2m,precipitation,weathercode&timezone=auto&forecast_days=7`;
  return fetchJson(url);
}

async function fetchAirQuality(lat, lon){
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&hourly=pm10,pm2_5,us_aqi`;
  return fetchJson(url);
}

async function reverseGeocode(lat, lon){
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  return fetchJson(url);
}

async function fetchHolidays(countryCode){
  const url = `https://date.nager.at/api/v3/PublicHolidays/${YEAR}/${countryCode}`;
  return fetchJson(url);
}

/*
  fetchJson wrapper:
  - tries network first
  - on success stores a copy in Cache Storage (for SW / offline)
  - writes last-updated to localStorage under PWA_META_PREFIX + urlKey
  - on network failure, tries caches.match(url) and returns cached JSON if available
*/
async function fetchJson(url){
  const req = new Request(url, { method: 'GET' });
  const urlKey = btoa(url).slice(0,32); // short key
  const metaKey = PWA_META_PREFIX + urlKey;
  try {
    const res = await fetch(req);
    if (!res.ok) throw new Error('Network response not ok: ' + res.status);
    const clone = res.clone();

    // cache fallback: put into cache so SW can serve later
    if ('caches' in window) {
      try {
        const c = await caches.open('api-cache');
        c.put(req, clone.clone()).catch(()=>{});
      } catch (e) {}
    }

    // record last-updated
    const nowISO = new Date().toISOString();
    try {
      localStorage.setItem(metaKey, nowISO);
      localStorage.setItem(PWA_META_PREFIX + 'global', nowISO);
      if (ELEMENTS.lastUpdated) ELEMENTS.lastUpdated.textContent = 'Last updated: ' + new Date(nowISO).toLocaleString();
      if (window.__QL_PWA) window.__QL_PWA.showOfflineBanner(!navigator.onLine, new Date(nowISO).toLocaleString());
    } catch (e) {}

    return await res.json();
  } catch (networkErr) {
    // try cache
    if ('caches' in window) {
      try {
        const cached = await caches.match(req);
        if (cached) {
          const data = await cached.json();
          const last = localStorage.getItem(metaKey) || localStorage.getItem(PWA_META_PREFIX + 'global');
          if (ELEMENTS.lastUpdated && last) ELEMENTS.lastUpdated.textContent = 'Last updated: ' + new Date(last).toLocaleString();
          if (window.__QL_PWA) window.__QL_PWA.showOfflineBanner(true, last ? new Date(last).toLocaleString() : '-');
          return data;
        }
      } catch (cacheErr) {
        console.warn('cache read error', cacheErr);
      }
    }
    throw networkErr;
  }
}

// === Renderers ===
function renderWeather(data){
  const cw = data.current_weather;
  if (!cw) {
    ELEMENTS.weatherDesc.textContent = "No current weather";
    return;
  }
  const tempC = Math.round(cw.temperature);
  ELEMENTS.temp.textContent = `${tempC}°C`;
  const wc = cw.weathercode;
  const desc = weatherCodeToDesc(wc);
  ELEMENTS.weatherDesc.textContent = desc;
  ELEMENTS.currentIcon.innerHTML = weatherIconSVG(wc, 84);
  ELEMENTS.wind.textContent = `${Math.round(cw.windspeed)} km/h`;
  const max = data.daily.temperature_2m_max?.[0] ?? null;
  const min = data.daily.temperature_2m_min?.[0] ?? null;
  ELEMENTS.highLow.textContent = max != null && min != null ? `${Math.round(max)}° / ${Math.round(min)}°` : "- / -";
  const precip = data.daily.precipitation_sum?.[0] ?? 0;
  ELEMENTS.precip.textContent = `${Math.round(precip*10)/10} mm`;

  // update last-updated for weather fetch (global meta already saved in fetchJson)
  const globalLast = localStorage.getItem(PWA_META_PREFIX + 'global');
  if (globalLast && ELEMENTS.lastUpdated) {
    ELEMENTS.lastUpdated.textContent = 'Last updated: ' + new Date(globalLast).toLocaleString();
  }

  renderForecast(data.daily);
  const alerts = generateAlertsFromDaily(data.daily);
  if (alerts.length) {
    ELEMENTS.alertStrip.hidden = false;
    ELEMENTS.alertStrip.textContent = alerts.join(" • ");
  } else {
    ELEMENTS.alertStrip.hidden = true;
  }
}

function renderForecast(daily){
  ELEMENTS.forecastList.innerHTML = "";
  if (!daily || !daily.time) return;
  const n = daily.time.length;
  for (let i=0;i<n;i++){
    const dayISO = daily.time[i];
    const name = i===0 ? "Today" : new Date(dayISO).toLocaleDateString(undefined,{weekday:'short'});
    const code = daily.weathercode[i];
    const max = Math.round(daily.temperature_2m_max[i]);
    const min = Math.round(daily.temperature_2m_min[i]);
    const precip = Math.round((daily.precipitation_sum[i]||0)*10)/10;
    const div = document.createElement("div");
    div.className = "day-card";
    div.innerHTML = `
      <div class="d">${name}</div>
      <div class="icon">${weatherIconSVG(code, 36)}</div>
      <div class="t">${max}°</div>
      <div class="muted">${min}° • ${precip}mm</div>
    `;
    ELEMENTS.forecastList.appendChild(div);
  }
}

function renderAQ(aq){
  try {
    const hr = aq.hourly;
    if (!hr) throw new Error("no hourly");
    const times = hr.time;
    const nowISO = new Date().toISOString().slice(0,13);
    let idx = times.findIndex(t => t.startsWith(nowISO));
    if (idx === -1) idx = times.length-1;
    const pm25 = hr.pm2_5?.[idx] ?? null;
    const pm10 = hr.pm10?.[idx] ?? null;
    const us_aqi = hr.us_aqi?.[idx] ?? null;

    if (us_aqi != null) {
      ELEMENTS.aqIndex.textContent = Math.round(us_aqi);
      ELEMENTS.aqLabel.textContent = aqiToLabel(us_aqi);
      ELEMENTS.aqAdvice.textContent = aqiAdvice(us_aqi);
    } else if (pm25 != null) {
      ELEMENTS.pm25.textContent = Math.round(pm25*10)/10;
      const approxAQI = pm25ToUSAQI(pm25);
      ELEMENTS.aqIndex.textContent = Math.round(approxAQI);
      ELEMENTS.aqLabel.textContent = aqiToLabel(approxAQI);
      ELEMENTS.aqAdvice.textContent = aqiAdvice(approxAQI);
    } else {
      ELEMENTS.aqLabel.textContent = "No AQI";
      ELEMENTS.aqIndex.textContent = "-";
      ELEMENTS.aqAdvice.textContent = "Air quality data unavailable.";
    }

    if (pm25 != null) ELEMENTS.pm25.textContent = `${Math.round(pm25*10)/10}`;
    if (pm10 != null) ELEMENTS.pm10.textContent = `${Math.round(pm10*10)/10}`;
    ELEMENTS.aqDetails.hidden = false;
  } catch (err) {
    ELEMENTS.aqLabel.textContent = "AQ data error";
  }
}

function renderHolidays(list){
  if (!Array.isArray(list) || !list.length) {
    ELEMENTS.holidayList.textContent = "No holidays found for this year.";
    return;
  }
  const today = new Date().toISOString().slice(0,10);
  const upcoming = list.filter(h => h.date >= today).slice(0,8);
  if (!upcoming.length) {
    ELEMENTS.holidayList.textContent = "No more holidays this year.";
    return;
  }
  ELEMENTS.holidayList.innerHTML = "";
  upcoming.forEach(h => {
    const div = document.createElement("div");
    div.className = "holiday-item";
    div.innerHTML = `<div><strong>${h.localName}</strong><div style="font-size:12px;color:var(--muted)">${h.name}</div></div><div><small>${h.date}</small></div>`;
    ELEMENTS.holidayList.appendChild(div);
  });
}

// === Utilities ===
function makeLocationLabel(rev){
  const a = rev.address || {};
  const parts = [];
  if (a.city) parts.push(a.city);
  else if (a.town) parts.push(a.town);
  else if (a.village) parts.push(a.village);
  else if (a.county) parts.push(a.county);
  if (a.state) parts.push(a.state);
  if (a.country) parts.push(a.country);
  return parts.join(", ");
}

function weatherCodeToDesc(code){
  const map = {
    0: "Clear",1:"Mainly clear",2:"Partly cloudy",3:"Overcast",
    45:"Fog",48:"Depositing rime fog",
    51:"Light drizzle",53:"Moderate drizzle",55:"Dense drizzle",
    61:"Slight rain",63:"Moderate rain",65:"Heavy rain",
    71:"Light snow",73:"Moderate snow",75:"Heavy snow",
    80:"Showers",81:"Moderate showers",82:"Heavy showers",
    95:"Thunderstorm",96:"Thunderstorm w/ hail",99:"Severe thunderstorm"
  };
  return map[code] || "Weather";
}

function weatherIconSVG(code, size=64){
  const color = 'currentColor';
  const base = (inner) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  if (code === 0) return base(`<circle cx="12" cy="12" r="4" fill="${color}" />`);
  if ([1,2].includes(code)) return base(`<path d="M3 12a7 7 0 1011.9-4.9A5 5 0 103 12z" fill="${color}"/>`);
  if (code===3) return base(`<path d="M20 17.5A4.5 4.5 0 0015.5 13h-1A5.5 5.5 0 003 15.5 4 4 0 007 22h12a1 1 0 001-1.5z" fill="${color}"/>`);
  if ([45,48].includes(code)) return base(`<path d="M3 9h18v2H3zM3 13h18v2H3zM3 17h18v2H3z" fill="${color}"/>`);
  if ([51,53,55,61,63,65,80,81,82].includes(code)) return base(`<g fill="${color}"><path d="M16 13a4 4 0 10-8 0h8z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2" stroke="${color}" stroke-width="1" stroke-linecap="round"/></g>`);
  if ([71,73,75,85,86].includes(code)) return base(`<g fill="${color}"><path d="M12 3v18M3 12h18M5 5l14 14M19 5L5 19"/></g>`);
  if ([95,96,99].includes(code)) return base(`<g fill="${color}"><path d="M13 2L3 14h7l-1 8 10-12h-7z"/></g>`);
  return base(`<path d="M12 6a6 6 0 100 12 6 6 0 000-12z" fill="${color}" />`);
}

function generateAlertsFromDaily(daily){
  const alerts = [];
  const times = daily.time;
  for (let i=0;i<times.length;i++){
    const code = daily.weathercode[i];
    const precip = daily.precipitation_sum[i] ?? 0;
    const max = daily.temperature_2m_max[i] ?? 0;
    if ([95,96,99].includes(code)) alerts.push(i===0 ? "Thunderstorms expected today" : `Thunderstorms ${new Date(times[i]).toLocaleDateString()}`);
    if (precip >= 20) alerts.push(i===0 ? "Heavy rain likely today" : `Heavy rain ${new Date(times[i]).toLocaleDateString()}`);
    if (max >= 35) alerts.push(i===0 ? "Heat alert: very hot today" : `High ${Math.round(max)}° on ${new Date(times[i]).toLocaleDateString()}`);
    if ([71,73,75,85,86].includes(code) && precip>0) alerts.push(i===0 ? "Snow expected today" : `Snow ${new Date(times[i]).toLocaleDateString()}`);
  }
  return [...new Set(alerts)].slice(0,3);
}

function aqiToLabel(aqi){
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Moderate";
  if (aqi <= 150) return "Unhealthy for sensitive groups";
  if (aqi <= 200) return "Unhealthy";
  if (aqi <= 300) return "Very Unhealthy";
  return "Hazardous";
}
function aqiAdvice(aqi){
  if (aqi <= 50) return "Air quality is good.";
  if (aqi <= 100) return "Moderate - sensitive people may notice effects.";
  if (aqi <= 150) return "Sensitive groups should reduce prolonged exertion.";
  if (aqi <= 200) return "Limit outdoor activities.";
  if (aqi <= 300) return "Avoid outdoor exertion.";
  return "Serious health risk - follow official guidance.";
}
function pm25ToUSAQI(pm){
  if (pm <= 12) return (50/12)*pm;
  if (pm <= 35.4) return 50 + ((100-50)/(35.4-12.1))*(pm-12.1);
  if (pm <= 55.4) return 100 + ((150-100)/(55.4-35.5))*(pm-35.5);
  if (pm <= 150.4) return 150 + ((200-150)/(150.4-55.5))*(pm-55.5);
  return 300 + (pm-150.5)*1.5;
}

function resetUI(){
  ELEMENTS.temp.textContent = "-°C";
  ELEMENTS.weatherDesc.textContent = "Loading...";
  ELEMENTS.currentIcon.innerHTML = `<div class="icon-placeholder"></div>`;
  ELEMENTS.locationName.textContent = "Locating…";
  ELEMENTS.wind.textContent = "-";
  ELEMENTS.highLow.textContent = "- / -";
  ELEMENTS.precip.textContent = "-";
  ELEMENTS.aqIndex.textContent = "-";
  ELEMENTS.aqLabel.textContent = "Loading…";
  ELEMENTS.aqAdvice.textContent = "";
  ELEMENTS.pm25.textContent = "-";
  ELEMENTS.pm10.textContent = "-";
  ELEMENTS.aqDetails.hidden = true;
  ELEMENTS.forecastList.innerHTML = createForecastPlaceholders();
  ELEMENTS.holidayList.textContent = "Looking up holidays…";
  ELEMENTS.alertStrip.hidden = true;

  // show last-updated if available
  const global = localStorage.getItem(PWA_META_PREFIX + 'global');
  if (ELEMENTS.lastUpdated) ELEMENTS.lastUpdated.textContent = global ? 'Last updated: ' + new Date(global).toLocaleString() : 'Last updated: -';
  if (window.__QL_PWA) window.__QL_PWA.showOfflineBanner(!navigator.onLine, global ? new Date(global).toLocaleString() : '-');
}

// placeholders: keep consistent layout during fetch
function createForecastPlaceholders(){
  let html = "";
  for (let i=0;i<7;i++){
    html += `<div class="day-card"><div class="d">-</div><div class="icon"><div style="height:28px"></div></div><div class="t">-°</div><div class="muted">-</div></div>`;
  }
  return html;
}
