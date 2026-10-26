// --- CONFIGURATION ---
// PASTE YOUR OPENWEATHER API KEY BELOW
const API_KEY = "582cf1c3904942f1a030d0033b2145bb"; 
const BASE_URL = "https://api.openweathermap.org/data/2.5";

// State Management
let currentUnit = "metric"; // 'metric' for Celsius, 'imperial' for Fahrenheit
let isMetric = true;
let lastSearchedCity = "";

// DOM Elements
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn");
const locationBtn = document.getElementById("location-btn");
const themeToggle = document.getElementById("theme-toggle");
const unitToggle = document.getElementById("unit-toggle");

const loadingState = document.getElementById("loading-state");
const errorState = document.getElementById("error-state");
const emptyState = document.getElementById("empty-state");
const weatherDashboard = document.getElementById("weather-dashboard");
const errorMessage = document.getElementById("error-message");

// Event Listeners
searchBtn.addEventListener("click", () => handleSearch(searchInput.value));
searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleSearch(searchInput.value);
});
locationBtn.addEventListener("click", getUserLocation);
themeToggle.addEventListener("click", toggleTheme);
unitToggle.addEventListener("click", toggleUnit);

// UI State Management Functions
function showLoading() {
    emptyState.classList.add("hidden");
    errorState.classList.add("hidden");
    weatherDashboard.classList.add("hidden");
    loadingState.classList.remove("hidden");
}

function showError(msg) {
    loadingState.classList.add("hidden");
    emptyState.classList.add("hidden");
    weatherDashboard.classList.add("hidden");
    errorState.classList.remove("hidden");
    errorMessage.textContent = msg;
}

function showDashboard() {
    loadingState.classList.add("hidden");
    emptyState.classList.add("hidden");
    errorState.classList.add("hidden");
    weatherDashboard.classList.remove("hidden");
}

// Fetch Weather API Functions
async function handleSearch(city) {
    if (!city.trim()) return;
    if (API_KEY === "YOUR_API_KEY_HERE") {
        showError("Please add your API Key in script.js");
        return;
    }
    
    lastSearchedCity = city;
    showLoading();
    
    try {
        // Fetch Current Weather & Forecast concurrently
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?q=${city}&units=${currentUnit}&appid=${API_KEY}`),
            fetch(`${BASE_URL}/forecast?q=${city}&units=${currentUnit}&appid=${API_KEY}`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) {
            throw new Error("City not found or API issue");
        }

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        updateCurrentWeather(currentData);
        updateForecasts(forecastData);
        showDashboard();
    } catch (error) {
        showError(error.message);
    }
}

async function handleLocationSearch(lat, lon) {
    if (API_KEY === "YOUR_API_KEY_HERE") {
        showError("Please add your API Key in script.js");
        return;
    }
    showLoading();
    try {
        const [currentRes, forecastRes] = await Promise.all([
            fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`),
            fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&units=${currentUnit}&appid=${API_KEY}`)
        ]);

        if (!currentRes.ok || !forecastRes.ok) throw new Error("Location data unavailable");

        const currentData = await currentRes.json();
        const forecastData = await forecastRes.json();

        lastSearchedCity = currentData.name;
        searchInput.value = ""; // Clear input if location used
        
        updateCurrentWeather(currentData);
        updateForecasts(forecastData);
        showDashboard();
    } catch (error) {
        showError(error.message);
    }
}

// Geolocation Handling
function getUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                handleLocationSearch(position.coords.latitude, position.coords.longitude);
            },
            (err) => {
                showError("Location access denied or unavailable.");
            }
        );
    } else {
        showError("Geolocation is not supported by your browser.");
    }
}

// Update UI Data Functions
function updateCurrentWeather(data) {
    document.getElementById("city-name").textContent = `${data.name}, ${data.sys.country}`;
    
    // Date Formatting (Local time approx based on timezone offset)
    const d = new Date((data.dt + data.timezone) * 1000);
    const options = { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' };
    document.getElementById("current-date").textContent = d.toLocaleDateString('en-US', options);
    
    // Temperature and description
    document.getElementById("current-temp").textContent = `${Math.round(data.main.temp)}°`;
    document.getElementById("temp-max").textContent = `${Math.round(data.main.temp_max)}°`;
    document.getElementById("temp-min").textContent = `${Math.round(data.main.temp_min)}°`;
    document.getElementById("feels-like").textContent = `${Math.round(data.main.feels_like)}°`;
    
    document.getElementById("weather-desc").textContent = data.weather[0].description;
    const iconCode = data.weather[0].icon;
    document.getElementById("weather-icon").src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    // Grid Details
    document.getElementById("humidity").textContent = `${data.main.humidity}%`;
    
    // Speed conversion: API returns m/s for metric, mph for imperial. Convert m/s to km/h if metric.
    const speed = isMetric ? (data.wind.speed * 3.6).toFixed(1) + " km/h" : data.wind.speed.toFixed(1) + " mph";
    document.getElementById("wind-speed").textContent = speed;
    
    document.getElementById("pressure").textContent = `${data.main.pressure} hPa`;
    document.getElementById("visibility").textContent = `${(data.visibility / 1000).toFixed(1)} km`;

    // Sunrise / Sunset
    const sr = new Date((data.sys.sunrise + data.timezone) * 1000);
    const ss = new Date((data.sys.sunset + data.timezone) * 1000);
    document.getElementById("sunrise").textContent = sr.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
    document.getElementById("sunset").textContent = ss.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function updateForecasts(data) {
    // OpenWeather free 5-day forecast returns data every 3 hours (40 items total).
    
    // 1. Update 24-Hour (Next 8 items = 24 hours)
    const hourlyContainer = document.getElementById("hourly-container");
    hourlyContainer.innerHTML = "";
    
    for(let i = 0; i < 8; i++) {
        const item = data.list[i];
        const time = new Date((item.dt + data.city.timezone) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', timeZone: 'UTC' });
        
        hourlyContainer.innerHTML += `
            <div class="hourly-item">
                <span>${time}</span>
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="icon">
                <strong>${Math.round(item.main.temp)}°</strong>
            </div>
        `;
    }

    // 2. Update 5-Day Forecast (Group by Day)
    const dailyContainer = document.getElementById("daily-container");
    dailyContainer.innerHTML = "";
    
    const dailyData = {};
    
    data.list.forEach(item => {
        // Extract YYYY-MM-DD local to the searched city
        const dateStr = new Date((item.dt + data.city.timezone) * 1000).toISOString().split('T')[0];
        
        if(!dailyData[dateStr]) {
            dailyData[dateStr] = {
                min: item.main.temp_min,
                max: item.main.temp_max,
                icon: item.weather[0].icon,
                dt: item.dt
            };
        } else {
            if(item.main.temp_min < dailyData[dateStr].min) dailyData[dateStr].min = item.main.temp_min;
            if(item.main.temp_max > dailyData[dateStr].max) dailyData[dateStr].max = item.main.temp_max;
        }
    });

    const days = Object.keys(dailyData).slice(0, 5); // Take up to 5 days
    
    days.forEach(dayStr => {
        const dayInfo = dailyData[dayStr];
        const dayName = new Date(dayStr).toLocaleDateString('en-US', { weekday: 'short' });
        
        dailyContainer.innerHTML += `
            <div class="daily-item">
                <span class="daily-day">${dayName}</span>
                <img class="daily-icon" src="https://openweathermap.org/img/wn/${dayInfo.icon}.png" alt="icon">
                <span class="daily-temps">
                    <strong>${Math.round(dayInfo.max)}°</strong> / <span style="opacity:0.7">${Math.round(dayInfo.min)}°</span>
                </span>
            </div>
        `;
    });
}

// Interactivity Toggles
function toggleTheme() {
    document.body.classList.toggle("dark-mode");
    document.body.classList.toggle("light-mode");
    
    const themeIcon = themeToggle.querySelector("i");
    if (document.body.classList.contains("dark-mode")) {
        themeIcon.className = "fa-solid fa-sun";
    } else {
        themeIcon.className = "fa-solid fa-moon";
    }
}

function toggleUnit() {
    isMetric = !isMetric;
    currentUnit = isMetric ? "metric" : "imperial";
    unitToggle.textContent = isMetric ? "°C" : "°F";
    
    // Refresh weather with new units if a city is already searched
    if (lastSearchedCity) {
        handleSearch(lastSearchedCity);
    }
}