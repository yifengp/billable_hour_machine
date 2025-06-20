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
    } else {
      clearInterval(timer);
      timer = null;
      const endTime = new Date();
      const record = saveSession(startTime, endTime, unitCount);
      updateLastSession(record);
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
    const todayDate = formatDate(start);
    const record = `Start: ${startStr}\nEnd: ${endStr}\nUnits: ${units}\n=====\n`;
    sessionHistory.push(record);

    chrome.storage.local.set({
      floating_counter_history: sessionHistory.join('')
    }, () => {
      const blob = new Blob([sessionHistory.join('')], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      chrome.downloads.download({
        url: url,
        filename: `${todayDate}-billable-hour.txt`,
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

  function updateLastSession(record) {
    const lastBox = document.getElementById('lastSessionInfo');
    lastBox.innerText = record;
  }

  function formatTime(t) {
    return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  }

  function formatDate(t) {
    return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,'0')}-${t.getDate().toString().padStart(2,'0')}`;
  }

  function restoreHistory() {
    chrome.storage.local.get(['floating_counter_history'], (result) => {
      if (result.floating_counter_history) {
        sessionHistory = result.floating_counter_history.split('=====\n').filter(s => s.trim().length > 0).map(s => s + '=====\n');
        if (sessionHistory.length > 0) {
          const lastRecord = sessionHistory[sessionHistory.length - 1];
          document.getElementById('lastSessionInfo').innerText = lastRecord;
        }
      }
    });
  }

  document.getElementById('viewHistoryButton').addEventListener('click', () => {
    const historyArea = document.getElementById('historyArea');
    if (historyArea.style.display === 'none') {
      chrome.storage.local.get(['floating_counter_history'], (result) => {
        const history = result.floating_counter_history || 'No Worklog';
        document.getElementById('historyDisplay').textContent = history;
      });
      historyArea.style.display = 'block';
      document.getElementById('viewHistoryButton').innerText = '📜 Close All Worklog';
    } else {
      historyArea.style.display = 'none';
      document.getElementById('viewHistoryButton').innerText = '📜 Show All Worklog';
    }
  });

  document.getElementById('clearHistoryButton').addEventListener('click', () => {
    sessionHistory = [];
    chrome.storage.local.remove(['floating_counter_history'], () => {
      document.getElementById('historyDisplay').textContent = '';
      document.getElementById('lastSessionInfo').textContent = '';
    });
  });

})();
