// extra function: order of the session ---added
// extra function: show date of the time --added
// extra change the icon of running period --added
// extra function: enlarge the start and end button --added
// extra function： focus on the icon and instead of the head of the page 
// adjust the time unit to 6 minutes

(function() {
  // 变量区：所有 let/const 声明的地方，通常在函数(function(){...})的最上方
  const iconURL = chrome.runtime.getURL('icon1.png'); // 待机图片
  const iconCountingURL = chrome.runtime.getURL('icon2.png'); // 计时图片
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
  let unitLength = 6; // 新增：unit时长，默认6分钟

  // 读取本地存储的unitLength
  chrome.storage.local.get(['unitLength'], (result) => {
    if (result.unitLength) {
      unitLength = result.unitLength;
      const input = document.getElementById('unitLengthInput');
      if (input) input.value = unitLength;
    }
  });

  // 监听输入框变化
  document.addEventListener('DOMContentLoaded', function() {
    const input = document.getElementById('unitLengthInput');
    if (input) {
      input.addEventListener('change', (e) => {
        let val = parseInt(e.target.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 30) val = 30;
        unitLength = val;
        input.value = unitLength;
        chrome.storage.local.set({ unitLength: unitLength });
      });
    }
  });

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
      showOverlay('Start!', { fontSize: '32px', fontWeight: '900' }); // 高亮大字
      unitCount = 1;
      document.getElementById('unitDisplay').innerText = `Running: ${unitCount} Units`;
      document.getElementById('unitDisplay').style.display = 'block';
      showCurrentSessionTable(startTime, unitCount); // 新增
      document.getElementById('lastSessionTitle').innerText = 'Current Session'; // 新增
      startStopButton.style.backgroundImage = `url('${iconCountingURL}')`; // 计时图片
    } else {
      clearInterval(timer);
      timer = null;
      // Show modal first instead of saving immediately:
      modal.style.display = 'flex';
      startStopButton.style.backgroundImage = `url('${iconURL}')`; // 恢复待机图片
      showOverlay('End', { fontSize: '32px', fontWeight: '900' }); // 高亮大字
    }
  });

  function updateUnits() {
    const elapsedMs = new Date() - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    unitCount = Math.max(1, Math.floor(elapsedMinutes / unitLength) + 1); // 用unitLength
    document.getElementById('unitDisplay').innerText = `Running: ${unitCount} Units`;
    if (timer) {
    showCurrentSessionTable(startTime, unitCount);
    }
  }

  function showOverlay(text, options = {}) {
    const overlay = document.getElementById('overlay');
    overlay.innerText = text;
    // 新增：可选自定义字体大小和加粗
    if (options.fontSize) {
      overlay.style.fontSize = options.fontSize;
    } else {
      overlay.style.fontSize = '18px'; // 默认
    }
    if (options.fontWeight) {
      overlay.style.fontWeight = options.fontWeight;
    } else {
      overlay.style.fontWeight = 'bold';
    }
    overlay.style.opacity = '1';
    setTimeout(() => {
      overlay.style.opacity = '0';
      // 恢复默认
      overlay.style.fontSize = '18px';
      overlay.style.fontWeight = 'bold';
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

  function formatTimeWithDate(t) {
    // concise: yyyy-MM-dd HH:mm:ss
    return `${t.getFullYear()}-${(t.getMonth()+1).toString().padStart(2,'0')}-${t.getDate().toString().padStart(2,'0')} ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  }

  function formatTimeWithMonthDay(t) {
    // 紧凑格式 MM-dd HH:mm:ss
    return `${(t.getMonth()+1).toString().padStart(2,'0')}-${t.getDate().toString().padStart(2,'0')} ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  }

  function saveSession(start, end, units, clientText, notesText) {
    const startStr = formatTimeWithMonthDay(start); // 仅月日
    const endStr = formatTimeWithMonthDay(end); // 仅月日
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
    showOverlay('End', { fontSize: '32px', fontWeight: '900' }); // 高亮大字
    document.getElementById('unitDisplay').innerText = 'Idle'; // 新增：恢复Idle状态
    document.getElementById('unitDisplay').style.display = 'block'; // 显示Idle
    document.getElementById('lastSessionTitle').innerText = 'Last Session'; // 新增
    startStopButton.style.backgroundImage = `url('${iconURL}')`; // 恢复待机图片
});

function showCurrentSessionTable(start, units) {
  const startStr = formatTimeWithMonthDay(start);
  const html = `
    <table class="session-table current-session-table"><tbody>
      <tr><td class="session-key start-key">Start</td><td class="session-value">${startStr}</td></tr>
      <tr><td class="session-key end-key">End</td><td class="session-value"></td></tr>
      <tr><td class="session-key">Units</td><td class="session-value">${units}</td></tr>
    </tbody></table>
  `;
  document.getElementById('lastSessionInfo').innerHTML = html;
  document.getElementById('lastSessionTitle').innerText = 'Current Session';
}

})();


