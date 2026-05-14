/**
 * ClockAndWeather v1.3.1
 * Main Application Logic with Click-through & Hotkeys support
 */

// ================= КОНФИГУРАЦИЯ =================
let config = { 
  city: '', 
  timezone: 'auto', 
  format: '24', 
  alwaysOnTop: true, 
  opacity: 0.95, 
  minimal: false
};

function loadConfig() { 
  try { 
    const s = localStorage.getItem('widget-config'); 
    if (s) {
      const parsed = JSON.parse(s);
      config = { ...config, ...parsed };
    }
  } catch (e) { 
    console.warn('Failed to load config:', e); 
  } 
}

function saveConfig() { 
  localStorage.setItem('widget-config', JSON.stringify(config)); 
}

loadConfig();

// ================= УТИЛИТЫ =================
function safeBind(id, handler) {
  const el = document.getElementById(id);
  if(el) el.addEventListener('click', (e) => { e.stopPropagation(); e.preventDefault(); handler(); });
}

function recalculateWindowHeight() {
  if (!window.electronAPI || config.minimal) return;
  
  const widget = document.getElementById('widget');
  if (!widget) return;

  const contentHeight = widget.scrollHeight;
  const minHeight = 320; 
  const newHeight = Math.max(contentHeight, minHeight);
  
  window.electronAPI.requestResize(420, newHeight);
}

// ================= ЧАСЫ =================
const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const monthNames = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function getTimeInTimezone() {
  if (config.timezone === 'auto') return new Date();
  const now = new Date(); const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const m = config.timezone.match(/([+-])(\d{2}):(\d{2})/);
  if (m) { const sign = m[1] === '+' ? 1 : -1; const off = sign * (parseInt(m[2])*60 + parseInt(m[3])); return new Date(utc + off*60000); }
  return new Date();
}

function updateClock() {
  const now = getTimeInTimezone(); let h = now.getHours();
  const mm = now.getMinutes().toString().padStart(2,'0'), ss = now.getSeconds().toString().padStart(2,'0'), ap = h>=12?'PM':'AM';
  if(config.format==='12') h = h%12||12;
  document.getElementById('time').innerHTML = h.toString().padStart(2,'0')+':'+mm+`<span id="seconds">${ss}</span>`+(config.format==='12'?` <small style="font-size:14px;color:var(--accent)">${ap}</small>`:'');
  document.getElementById('date').textContent = `${dayNames[now.getDay()]}, ${now.getDate()} ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}
setInterval(updateClock, 1000); updateClock();

// ================= ПОГОДА =================
const WEATHER_CODES = {0:{d:'Ясно',i:'☀️'},1:{d:'Преим. ясно',i:'🌤️'},2:{d:'Облачно с проясн.',i:'⛅'},3:{d:'Пасмурно',i:'☁️'},45:{d:'Туман',i:'🌫️'},48:{d:'Изморозь',i:'🌫️'},51:{d:'Слабая морось',i:'🌦️'},53:{d:'Умер. морось',i:'🌦️'},55:{d:'Плотная морось',i:'🌧️'},61:{d:'Слабый дождь',i:'🌧️'},63:{d:'Умер. дождь',i:'🌧️'},65:{d:'Сильный дождь',i:'🌧️'},71:{d:'Слабый снег',i:'🌨️'},73:{d:'Умер. снег',i:'🌨️'},75:{d:'Сильный снег',i:'❄️'},80:{d:'Ливень слабый',i:'🌦️'},81:{d:'Ливень умер.',i:'🌧️'},82:{d:'Ливень сильн.',i:'⛈️'},85:{d:'Снегопад слаб.',i:'🌨️'},86:{d:'Снегопад сильн.',i:'❄️'},95:{d:'Гроза',i:'⛈️'},96:{d:'Гроза+град',i:'⛈️'},99:{d:'Гроза+сильн. град',i:'⛈️'}};

async function geocodeCity(c) { 
  const r=await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(c)}&count=1&language=ru&format=json`); 
  if(!r.ok) throw new Error('Геокодирование'); 
  const d=await r.json(); 
  if(!d.results?.[0]) throw new Error('Город не найден'); 
  const v=d.results[0]; 
  return {lat:v.latitude, lon:v.longitude, name:`${v.name}, ${v.country_code}`}; 
}

async function fetchWeather() {
  const inp = document.getElementById('city-input').value.trim();
  const city = inp || config.city || 'Moscow';
  try {
    document.getElementById('city-name').textContent = '⏳ Загрузка...';
    const {lat, lon, name} = await geocodeCity(city);
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,pressure_msl&timezone=auto`);
    if(!r.ok) throw new Error('Ошибка загрузки');
    const d = await r.json(), c = d.current, w = WEATHER_CODES[c.weather_code]||{d:'Неизвестно',i:'❓'};
    document.getElementById('weather-icon').innerHTML = `<div style="font-size:40px;line-height:1">${w.i}</div>`;
    document.getElementById('temperature').textContent = `${Math.round(c.temperature_2m)}°C`;
    document.getElementById('weather-desc').textContent = w.d;
    document.getElementById('city-name').textContent = `📍 ${name}`;
    document.getElementById('feels-like').textContent = `Ощущается как ${Math.round(c.apparent_temperature)}°C`;
    document.getElementById('weather-extra').innerHTML = `<span>💧 ${c.relative_humidity_2m}%</span><span>💨 ${c.wind_speed_10m} м/с</span><span>🌡 ${Math.round(c.pressure_msl*0.750062)} мм</span>`;
    if(!config.city && !inp) { config.city = name.split(',')[0]; saveConfig(); }
  } catch(e) { 
    document.getElementById('city-name').textContent = '❌ Ошибка'; 
    document.getElementById('weather-desc').textContent = e.message; 
  }
}

async function detectCity() { 
  try { 
    const r=await fetch('https://ipapi.co/json/'); 
    const d=await r.json(); 
    if(d.city) { document.getElementById('city-input').value=d.city; config.city=d.city; saveConfig(); fetchWeather(); } 
  } catch(e){} 
}

// ================= НАСТРОЙКИ =================
function populateTimezones() {
  const s = document.getElementById('timezone-select');
  [{l:'Москва (UTC+3)',v:'+03:00'},{l:'Калининград (UTC+2)',v:'+02:00'},{l:'Екатеринбург (UTC+5)',v:'+05:00'},{l:'Омск (UTC+6)',v:'+06:00'},{l:'Красноярск (UTC+7)',v:'+07:00'},{l:'Иркутск (UTC+8)',v:'+08:00'},{l:'Владивосток (UTC+10)',v:'+10:00'},{l:'Лондон (UTC+0)',v:'+00:00'},{l:'Берлин (UTC+1)',v:'+01:00'},{l:'Нью-Йорк (UTC-5)',v:'-05:00'},{l:'Токио (UTC+9)',v:'+09:00'},{l:'Дубай (UTC+4)',v:'+04:00'}].forEach(t=>{const o=document.createElement('option');o.value=t.v;o.textContent=t.l;s.appendChild(o);});
}

let wasMinimal = false;
function openSettings() {
  if(config.minimal) { 
    wasMinimal=true; 
    if(window.electronAPI) window.electronAPI.setWindowSize(false); 
    document.body.classList.remove('minimal'); 
  }
  
  document.getElementById('city-input').value = config.city||'';
  document.getElementById('timezone-select').value = config.timezone||'auto';
  document.getElementById('format-select').value = config.format||'24';
  document.getElementById('always-top').checked = config.alwaysOnTop;
  document.getElementById('minimal-mode').checked = config.minimal||false;
  document.getElementById('opacity-slider').value = config.opacity||0.95;
  document.getElementById('opacity-value').textContent = `${Math.round((config.opacity||0.95)*100)}%`;
  
  // 🔥 При открытии настроек ВСЕГДА выключаем сквозные клики
  document.getElementById('ignore-clicks-mode').checked = false;
  if(window.electronAPI) window.electronAPI.setIgnoreClicks(false);
  
  document.getElementById('settings-panel').classList.add('visible');
  document.getElementById('settings-panel').scrollTop = 0;
}

function closeSettings() {
  document.getElementById('settings-panel').classList.remove('visible');
  if(wasMinimal && config.minimal) { 
    if(window.electronAPI) window.electronAPI.setWindowSize(true); 
    document.body.classList.add('minimal'); 
    wasMinimal=false; 
  }
}

function applySettings() {
  config.city = document.getElementById('city-input').value.trim();
  config.timezone = document.getElementById('timezone-select').value;
  config.format = document.getElementById('format-select').value;
  config.alwaysOnTop = document.getElementById('always-top').checked;
  config.minimal = document.getElementById('minimal-mode').checked;
  config.opacity = parseFloat(document.getElementById('opacity-slider').value);
  config.theme = localStorage.getItem('widget-theme') || 'default';
  
  saveConfig();
  
  if(window.electronAPI) { 
    window.electronAPI.setAlwaysOnTop(config.alwaysOnTop); 
    window.electronAPI.setOpacity(config.opacity); 
    window.electronAPI.setWindowSize(config.minimal); 
  }
  document.body.classList.toggle('minimal', config.minimal);
  
  closeSettings(); 
  fetchWeather();
}

populateTimezones();

// ================= СОБЫТИЯ =================
safeBind('close-btn', () => window.electronAPI?.closeApp());
safeBind('settings-btn', openSettings);
safeBind('settings-close', closeSettings);
safeBind('btn-cancel', closeSettings);
safeBind('btn-save', applySettings);
safeBind('btn-auto-city', async () => { 
  const btn = document.getElementById('btn-auto-city'); 
  btn.textContent='⏳ Определяю...'; 
  await detectCity(); 
  btn.textContent='📍 Авто-город'; 
});

document.getElementById('opacity-slider').addEventListener('input', e=>{ 
  const v=parseFloat(e.target.value); 
  document.getElementById('opacity-value').textContent=`${Math.round(v*100)}%`; 
  if(window.electronAPI) window.electronAPI.setOpacity(v); 
});

// 🔥 Обработчик чекбокса "Сквозные клики"
const ignoreClicksCheckbox = document.getElementById('ignore-clicks-mode');
if (ignoreClicksCheckbox) {
  ignoreClicksCheckbox.addEventListener('change', function() {
    const ignore = this.checked;
    if(window.electronAPI) {
      window.electronAPI.setIgnoreClicks(ignore);
    }
    // Если включили - закрываем настройки
    if (ignore) {
      closeSettings();
    }
  });
}

// 🔥 Слушаем сигнал от Main Process (когда нажали Ctrl+O)
if (window.electronAPI) {
  window.electronAPI.openSettings(()=>openSettings());
  window.electronAPI.refreshWeather(()=>fetchWeather());
  window.electronAPI.setOpacity(config.opacity||0.95);
  window.electronAPI.onResize((event, isMinimal) => {
    document.body.classList.toggle('minimal', isMinimal);
    const widget = document.getElementById('widget');
    if(widget) {
      widget.style.transform = 'scale(0.999)';
      widget.offsetHeight;
      widget.style.transform = '';
    }
    if (!isMinimal) setTimeout(recalculateWindowHeight, 100);
  });
  
  // Обновление состояния чекбокса из Main Process
  window.electronAPI.onUpdateIgnoreClicks((event, value) => {
     const checkbox = document.getElementById('ignore-clicks-mode');
     if(checkbox) checkbox.checked = value;
  });

  if(config.minimal) { 
    window.electronAPI.setWindowSize(true); 
    document.body.classList.add('minimal'); 
  }
}

// 🔥 Показать подсказку о горячих клавишах при первом запуске
function showHotkeyHint() {
  const hasSeenHint = localStorage.getItem('has-seen-hotkey-hint');
  if (!hasSeenHint) {
    const hint = document.createElement('div');
    hint.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--bg-panel);
      border: 1px solid var(--accent);
      border-radius: 8px;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--text);
      z-index: 1000;
      box-shadow: 0 4px 20px var(--shadow-color);
      animation: slideIn 0.3s ease;
      max-width: 280px;
    `;
    hint.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 6px; color: var(--accent);">⌨️ Горячие клавиши</div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span style="color: var(--text-secondary);">Настройки</span>
        <span style="font-family: monospace; color: var(--accent);">Ctrl + O</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin: 4px 0;">
        <span style="color: var(--text-secondary);">Выход</span>
        <span style="font-family: monospace; color: var(--accent);">Ctrl + E</span>
      </div>
      <div style="margin-top: 8px; text-align: right;">
        <button onclick="this.parentElement.parentElement.remove()" style="
          background: var(--accent);
          border: none;
          color: #000;
          padding: 4px 12px;
          border-radius: 4px;
          font-size: 11px;
          cursor: pointer;
        ">Понял</button>
      </div>
    `;
    document.body.appendChild(hint);
    
    // Авто-скрытие через 10 секунд
    setTimeout(() => { if (hint.parentElement) hint.remove(); }, 10000);
    
    // Запоминаем что показали
    localStorage.setItem('has-seen-hotkey-hint', 'true');
  }
}

// Анимация появления
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(style);

// Запускаем после загрузки
setTimeout(showHotkeyHint, 2000);

// Инициализация
fetchWeather(); 
setInterval(fetchWeather, 600000);