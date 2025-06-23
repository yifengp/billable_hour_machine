=========================
Billable Hour Machine - Floating Window
=========================

Structure:

floating-counter-window-version/
├── manifest.json
├── background.js
├── window-small.html / .js / .css  ← square window
├── window-full.html / .js / .css   ← full window
├── icon.png
├── README.txt

Usage:

✅ Click the plugin icon → open "square" window
✅ Click "Expand" → open "full" window
✅ Keeps running even when switching tabs or browser pages

功能：

✅ 点击插件图标 → 小方块窗口
✅ 点击 Expand → 打开大窗口
✅ 计时不会因为切换标签页停止
✅ 类似「桌面宠物」风格小工具

Icon:

Replace **icon.png** in the folder (120x120 or 128x128)

How to edit time unit:

In **window-small.js** and **window-full.js** → find:

```js
unitCount = Math.max(1, Math.floor(elapsedMinutes / 6) + 1);
=========================
Billable Hour Machine - Floating Window
=========================

Structure:

floating-counter-window-version/
├── manifest.json
├── background.js
├── window-small.html / .js / .css  ← square window
├── window-full.html / .js / .css   ← full window
├── icon.png
├── README.txt

Usage:

✅ Click the plugin icon → open "square" window
✅ Click "Expand" → open "full" window
✅ Keeps running even when switching tabs or browser pages

功能：

✅ 点击插件图标 → 小方块窗口
✅ 点击 Expand → 打开大窗口
✅ 计时不会因为切换标签页停止
✅ 类似「桌面宠物」风格小工具

Icon:

Replace **icon.png** in the folder (120x120 or 128x128)

How to edit time unit:

In **window-small.js** and **window-full.js** → find:

```js
unitCount = Math.max(1, Math.floor(elapsedMinutes / 6) + 1);
