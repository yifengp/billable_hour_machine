(function() {
  const iconURL = chrome.runtime.getURL('icon.png');

  const startStopButton = document.getElementById('startStopButton');
  startStopButton.style.backgroundImage = `url('${iconURL}')`;

  let timer = null;
  let clockTimer = null;
  let startTime = null;
  let unitCount = 1;
  let sessionHistory = [];

  startClock();

  startStopButton.addEventListener('click', () => {
    if (!timer) {
      startTime = new Date();
      timer = setInterval(updateUnits, 60000);
      showOverlay('Start!');
      unitCount = 1;
      document.getElementById('unitDisplay').innerText = `Units: ${unitCount}`;
      document.getElementById('unitDisplay').style.display = 'block';
      document.getElementById('unitDisplay').style.backgroundColor = '#fffacd';
    } else {
      clearInterval(timer);
      timer = null;
      const endTime = new Date();
      const record = saveSession(startTime, endTime, unitCount);
      updateSessionInfo(record);
      showOverlay('End');
      document.getElementById('unitDisplay').style.display = 'none';
    }
  });

  function updateUnits() {
    const elapsedMs = new Date() - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    unitCount = Math.max(1, Math.floor(elapsedMinutes / 6) + 1);
    document.getElementById('unitDisplay').innerText = `Units: ${unitCount}`;
  }

  function saveSession(start, end, units) {
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    const record = `Start: ${startStr}, End: ${endStr}, Units: ${units}\n=====\n`;
    sessionHistory.push(record);

    chrome.storage.local.set({
      floating_counter_history: sessionHistory.join('')
    }, () => {
      const blob = new Blob([sessionHistory.join('')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: `floating-counter.txt`,
        conflictAction: 'overwrite'
      });
    });

    return record;
  }

  function showOverlay(text) {
    const overlay = document.getElementById('overlay');
    overlay.innerText = text;
    overlay.style.opacity = '1';
    setTimeout(() => {
      overlay.style.opacity = '0';
    }, 800);
  }

  function startClock() {
    updateClock();
    clockTimer = setInterval(updateClock, 1000);
    restoreHistory();
  }

  function updateClock() {
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = dayNames[now.getDay()];
    const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    document.getElementById('currentTime').innerText = `${day}, ${dateStr} ${timeStr}`;
  }

  function updateSessionInfo(record) {
    const infoBox = document.getElementById('sessionInfo');
    infoBox.innerText += record;
  }

  function formatTime(t) {
    return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  }

  function restoreHistory() {
    chrome.storage.local.get(['floating_counter_history'], (result) => {
      if (result.floating_counter_history) {
        sessionHistory = result.floating_counter_history.split('=====\n').filter(s => s.trim().length > 0).map(s => s + '=====\n');
        document.getElementById('sessionInfo').innerText = sessionHistory.join('');
      }
    });
  }

  document.getElementById('viewHistoryButton').addEventListener('click', () => {
    chrome.storage.local.get(['floating_counter_history'], (result) => {
      const history = result.floating_counter_history || '没有记录';
      document.getElementById('historyDisplay').textContent = history;
    });
  });

  document.getElementById('clearHistoryButton').addEventListener('click', () => {
    sessionHistory = [];
    chrome.storage.local.remove(['floating_counter_history'], () => {
      document.getElementById('historyDisplay').textContent = '记录已清空';
      document.getElementById('sessionInfo').textContent = '';
    });
  });

  // ----- 拖拽功能 -----
  const floatingCounter = document.getElementById('floatingCounter');
  const headerBar = document.getElementById('headerBar');

  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;

  headerBar.addEventListener('mousedown', function(e) {
    isDragging = true;
    offsetX = e.clientX - floatingCounter.offsetLeft;
    offsetY = e.clientY - floatingCounter.offsetTop;
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', function(e) {
    if (isDragging) {
      floatingCounter.style.left = (e.clientX - offsetX) + 'px';
      floatingCounter.style.top = (e.clientY - offsetY) + 'px';
    }
  });

  document.addEventListener('mouseup', function() {
    isDragging = false;
    document.body.style.userSelect = 'auto';
  });

})();
