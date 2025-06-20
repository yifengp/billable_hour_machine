chrome.action.onClicked.addListener(() => {
  chrome.windows.create({
    url: chrome.runtime.getURL("window-small.html"),
    type: "popup",
    width: 295,
    height: 295,
    focused: true
  });
});
