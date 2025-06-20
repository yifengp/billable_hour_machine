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

      // Show modal first instead of saving immediately:
      modal.style.display = 'flex';
    }
  });

  document.getElementById('expandButton').addEventListener('click', () => {
    chrome.windows.create({
      url: chrome.runtime.getURL("window-full.html"),
      type: "popup",
      width: 420,
      height: 600,
      focused: true
    });
  });

  function updateUnits() {
    const elapsedMs = new Date() - startTime;
    const elapsedMinutes = Math.floor(elapsedMs / 60000);
    unitCount = Math.max(1, Math.floor(elapsedMinutes / 6) + 1);
    document.getElementById('unitDisplay').innerText = `Units: ${unitCount}`;
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
  }

  function updateClock() {
    const now = new Date();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = dayNames[now.getDay()];
    const dateStr = `${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}/${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
    document.getElementById('currentTime').innerText = `${day} ${dateStr} ${timeStr}`;
  }

  function saveSession(start, end, units, clientText, notesText) {
    const startStr = formatTime(start);
    const endStr = formatTime(end);
    const todayDate = formatDate(start);
    const record = `Start: ${startStr}\nEnd: ${endStr}\nUnits: ${units}\nClient / Project ID: ${clientText}\nNotes: ${notesText}\n=====\n`;

    chrome.storage.local.get(['floating_counter_history'], (result) => {
      let history = result.floating_counter_history || '';
      history += record;
      sessionHistory.push(record);
      chrome.storage.local.set({ floating_counter_history: history });
    });

    return record;
}


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

    // Reset modal and hide
    clientInput.value = '';
    notesInput.value = '';
    modal.style.display = 'none';

    document.getElementById('unitDisplay').style.display = 'none';
    showOverlay('End');
});



})();

