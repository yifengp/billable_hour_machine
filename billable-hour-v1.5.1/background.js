chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("window-full.html"),
    type: "popup",
    width: 450,
    height: 660,
    focused: true
  });
});
