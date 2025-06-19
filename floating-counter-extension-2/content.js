(function() {
  if (document.getElementById('floatingCounter')) return;

  const iconURL = chrome.runtime.getURL('icon.png');

  const container = document.createElement('div');
  container.id = 'floatingCounter';
  container.innerHTML = `
    <div id="currentTime">--</div>
    <button id="startStopButton">
      <img id="buttonIcon" src="${iconURL}" />
      <span id="buttonLabel">Start</span>
      <div id="overlay"></div>
    </button>
    <div id="unitDisplay">Units: 1</div>
    <hr style="margin: 12px 0;" />
    <button id="viewHistoryButton">查看历史记录</button>
    <button id="clearHistoryButton">清空历史记录</button>
    <pre id="historyDisplay"></pre>
    <div id="sessionInfo"></div>
  `;
  document.body.appendChild(container);

  let timer = null;
  let clockTimer = null;
  let startTime = null;
  let unitCount = 1;  // 起始为 1

  startClock();

  document.getElementById('startStopButton').addEventListener('click', () => {
    if (!timer) {
      startTime = new Date();
      timer = setInterval(updateUnits, 60000);
      document.getElementById('buttonLabel').innerText = 'Stop';
      showOverlay('Start!');
    } else {
      clearInterval(timer);
      timer = null;
      const endTime = new Date();
      saveSession(startTime, endTime, unitCount);
      updateSessionInfo(startTime, endTime, unitCount);

      unitCount = 1;
      document.getElementById('unitDisplay').innerText = `Units: ${unitCount}`;
      document.getElementById('buttonLabel').innerText = 'Start';
      showOverlay('End');
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
    const dateStr = formatDate(start);
    const newRecord = `Start: ${startStr}, End: ${endStr}, Units: ${units}\n=====\n`;

    chrome.storage.local.get([dateStr], (result) => {
      let existingContent = result[dateStr] || '';
      let updatedContent = existingContent + newRecord;

      chrome.storage.local.set({ [dateStr]: updatedContent }, () => {
        const blob = new Blob([updatedContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
          url: url,
          filename: `floating-counter-${dateStr}.txt`,
          conflictAction: 'overwrite'
        });
      });
    });
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
  }

  function updateClock() {
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = dayNames[now.getDay()];
    const dateStr = `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}-${now.getDate().toString().padStart(2,'0')}`;
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    document.getElementById('currentTime').innerText = `${day}, ${dateStr} ${timeStr}`;
  }

  function updateSessionInfo(start, end, units) {
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    const info = `Session:\nStart: ${startStr}\nEnd: ${endStr}\nUnits: ${units}`;
    document.getElementById('sessionInfo').innerText = info;
  }

  function formatTime(t) {
    return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  }

  function formatDate(t) {
    return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,'0')}-${t.getDate().toString().padStart(2,'0')}`;
  }

  document.getElementById('viewHistoryButton').addEventListener('click', () => {
    const today = new Date();
    const dateStr = formatDate(today);

    chrome.storage.local.get([dateStr], (result) => {
      const history = result[dateStr] || '没有记录';
      document.getElementById('historyDisplay').textContent = history;
    });
  });

  document.getElementById('clearHistoryButton').addEventListener('click', () => {
    const today = new Date();
    const dateStr = formatDate(today);

    chrome.storage.local.remove([dateStr], () => {
      document.getElementById('historyDisplay').textContent = '记录已清空';
    });
  });
})();
