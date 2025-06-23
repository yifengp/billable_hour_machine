// extra function: order of the session
// extra function: show date of the time
// extra change the icon of running period
// extra function: enlarge the start and end button
// extra function： focus on the icon and instead of the head of the page 
// adjust the time unit to 6 minutes

(function() {
  const iconURL = chrome.runtime.getURL('icon.png');
  const modal = document.getElementById('inputModal');
  const clientInput = document.getElementById('clientInput');
  const notesInput = document.getElementById('notesInput');
  const confirmSaveButton = document.getElementById('confirmSaveButton');

  const startStopButton = document.getElementById('startStopButton');
  startStopButton.style.backgroundImage = `url('${iconURL}')`;

  let timer = null;
  let startTime = null;
  let unitCount = 1;
  let sessionHistory = [];
  let sessionIndex = 1; // 新增：记录序号

  startClock();

  // 新增：初始化序号
  function initSessionIndex() {
    chrome.storage.local.get(['floating_counter_history'], (result) => {
      if (result.floating_counter_history) {
        const records = result.floating_counter_history.split('=====\n').filter(s => s.trim().length > 0);
        sessionIndex = records.length + 1;
      } else {
        sessionIndex = 1;
      }
    });
  }
  initSessionIndex();

  startStopButton.addEventListener('click', () => {
    if (!timer) {
      startTime = new Date();
      timer = setInterval(updateUnits, 60000);
      showOverlay('Start!');
      unitCount = 1;
      document.getElementById('unitDisplay').innerText = `Running: ${unitCount} Units`;
      document.getElementById('unitDisplay').style.display = 'block';
    } else {
      clearInterval(timer);
      timer = null;

      // Show modal first instead of saving immediately:
      modal.style.display = 'flex';
    }
  });

  function updateUnits() {
    const elapsedMs = new Date() - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    unitCount = Math.max(1, Math.floor(elapsedMinutes / 6) + 1);
    document.getElementById('unitDisplay').innerText = `Running: ${unitCount} Units`;
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
    setInterval(updateClock, 1000);
    restoreHistory();
  }

  function updateClock() {
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = dayNames[now.getDay()];
    const dateStr = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}/${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    document.getElementById('dateLine').innerText = `${day} ${dateStr}`;
    document.getElementById('currentTime').innerText = `${timeStr}`;
  }

  function recordToTable(record) {
    const lines = record.replace(/={2,}/g, '').trim().split('\n');
    let html = '<table class="session-table"><tbody>';
    lines.forEach(line => {
      const [key, ...rest] = line.split(':');
      if (rest.length > 0) {
      let keyClass = "session-key";
      if (key.trim() === "Start") keyClass += " start-key";
      if (key.trim() === "End") keyClass += " end-key";
      html += `<tr><td class="${keyClass}">${key.trim()}</td><td class="session-value">${rest.join(':').trim()}</td></tr>`;
    }
  });
    html += '</tbody></table>';
    return html;
  }

  function updateLastSession(record) {
    const lastBox = document.getElementById('lastSessionInfo');
    lastBox.innerHTML = recordToTable(record);
  }

  function saveSession(start, end, units, clientText, notesText) {
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    const todayDate = formatDate(start);
    // 新增：加上序号
    const record = `No. ${sessionIndex}\nStart: ${startStr}\nEnd: ${endStr}\nUnits: ${units}\nClient / Project ID: ${clientText}\nNotes: ${notesText}\n=====\n`;

    chrome.storage.local.get(['floating_counter_history'], (result) => {
      let history = result.floating_counter_history || '';
      history += record;
      sessionHistory.push(record);
      chrome.storage.local.set({ floating_counter_history: history });
      sessionIndex++; // 新增：每次保存后序号+1
    });

    return record;
  }


  function restoreHistory() {
    chrome.storage.local.get(['floating_counter_history'], (result) => {
      if (result.floating_counter_history) {
        sessionHistory = result.floating_counter_history.split('=====\n').filter(s => s.trim().length > 0).map(s => s + '=====\n');
        if (sessionHistory.length > 0) {
          const lastRecord = sessionHistory[sessionHistory.length - 1];
          document.getElementById('lastSessionInfo').innerHTML = recordToTable(lastRecord);
        }
      }
    });
  }

  document.getElementById('viewHistoryButton').addEventListener('click', () => {
    const historyArea = document.getElementById('historyArea');
    if (historyArea.style.display === 'none') {
      chrome.storage.local.get(['floating_counter_history'], (result) => {
        const history = result.floating_counter_history || 'No Worklog History';
        const records = history.split('=====').filter(s => s.trim().length > 0);
        document.getElementById('historyDisplay').innerHTML = records.map(recordToTable).join('<hr/>');
      });
      historyArea.style.display = 'block';
      document.getElementById('viewHistoryButton').innerText = '📜 Close All History';
    } else {
      historyArea.style.display = 'none';
      document.getElementById('viewHistoryButton').innerText = '📜 Shou All History';
    }
  });

  document.getElementById('clearHistoryButton').addEventListener('click', () => {
    sessionHistory = [];
    chrome.storage.local.remove(['floating_counter_history'], () => {
      document.getElementById('historyDisplay').textContent = '';
      document.getElementById('lastSessionInfo').textContent = '';
      sessionIndex = 1; // 新增：清空时重置序号
    });
  });

  function formatTime(t) {
    return `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  }

  function formatDate(t) {
    return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,'0')}-${t.getDate().toString().padStart(2,'0')}`;
  }

  confirmSaveButton.addEventListener('click', () => {
    const endTime = new Date();
    const clientText = clientInput.value.trim();
    const notesText = notesInput.value.trim();
    
    const record = saveSession(startTime, endTime, unitCount, clientText, notesText);
    updateLastSession(record);

    // --- 修改这里：拼接所有历史记录 ---
    chrome.storage.local.get(['floating_counter_history'], (result) => {
        const allHistory = sessionHistory.join('');
        const blob = new Blob([allHistory], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        chrome.downloads.download({
            url: url,
            filename: `${formatDate(startTime)}-billable-hour.txt`,
            conflictAction: 'overwrite'
        });
    });
    // --- 结束修改 ---

    // Reset modal and hide
    clientInput.value = '';
    notesInput.value = '';
    modal.style.display = 'none';

    document.getElementById('unitDisplay').style.display = 'none';
    showOverlay('End');
    document.getElementById('unitDisplay').innerText = 'Idle'; // 新增：恢复Idle状态
    document.getElementById('unitDisplay').style.display = 'block'; // 显示Idle
    // ...existing code...
});
// ...existing code...


})();


