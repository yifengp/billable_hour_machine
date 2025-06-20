chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("window-full.html"),
    type: "popup",
    width: 420,
    height: 600,
    focused: true
  });
});
