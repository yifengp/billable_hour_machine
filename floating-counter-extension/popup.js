let timer = null;
let startTime = null;
let unitCount = 0;

document.getElementById('startStopButton').addEventListener('click', () => {
  if (!timer) {
    // Start timing
    startTime = new Date();
    timer = setInterval(updateUnits, 60000); // 每分钟更新一次
    document.getElementById('startStopButton').innerText = 'Stop';
  } else {
    // Stop timing
    clearInterval(timer);
    timer = null;
    const endTime = new Date();
    saveSession(startTime, endTime, unitCount);
    unitCount = 0;
    document.getElementById('unitDisplay').innerText = 'Units: 0';
    document.getElementById('startStopButton').innerText = 'Start';
  }
});

function updateUnits() {
  const elapsedMs = new Date() - startTime;
  const elapsedMinutes = Math.floor(elapsedMs / 60000);
  unitCount = Math.floor(elapsedMinutes / 6);
  document.getElementById('unitDisplay').innerText = `Units: ${unitCount}`;
}

function saveSession(start, end, units) {
  const startStr = `${start.getHours().toString().padStart(2, '0')}:${start.getMinutes().toString().padStart(2, '0')}`;
  const endStr = `${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`;
  const dateStr = `${end.getFullYear()}-${(end.getMonth()+1).toString().padStart(2, '0')}-${end.getDate().toString().padStart(2, '0')}`;
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

document.getElementById('viewHistoryButton').addEventListener('click', () => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  chrome.storage.local.get([dateStr], (result) => {
    const history = result[dateStr] || '没有记录';
    document.getElementById('historyDisplay').textContent = history;
  });
});

document.getElementById('clearHistoryButton').addEventListener('click', () => {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${(today.getMonth()+1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

  chrome.storage.local.remove([dateStr], () => {
    document.getElementById('historyDisplay').textContent = '记录已清空';
  });
});
