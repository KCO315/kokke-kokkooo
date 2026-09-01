// --- データプレビュー制御 ---
let ytPlayer = null;
let isYtApiReady = false;
let audioCtx = null; // ★ Web Audio API用コンテキスト

if (window.YT && window.YT.Player) {
	isYtApiReady = true;
} else {
	window.onYouTubeIframeAPIReady = function () { isYtApiReady = true; };
}

const folderInput = document.getElementById('folder-input');
const loadBtn = document.getElementById('load-btn');
const listContainer = document.getElementById('list-container');
const presentationArea = document.getElementById('presentation-area');
const zoomWrapper = document.getElementById('zoom-wrapper');
const contentLayer = document.getElementById('content-layer');
const emptyMessage = document.getElementById('empty-message');
const presentationControls = document.getElementById('presentation-controls');

const externalLinkBtn = document.getElementById('external-link-btn');
const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
const sidebar = document.getElementById('sidebar');
const sizeSelector = document.getElementById('size-selector');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const chromakeyBtn = document.getElementById('chromakey-btn');

let userSelectedWidth = 1280;
let userSelectedHeight = 720;
let userSelectedPreset = "1280x720";
let isProgrammaticResize = false;

const canvas = document.getElementById('drawing-canvas');
const ctx = canvas.getContext('2d');
const activateDrawingBtn = document.getElementById('activate-drawing-btn');
const drawingSidebar = document.getElementById('drawing-sidebar');
const toolPenBtn = document.getElementById('tool-pen-btn');
const toolEraserBtn = document.getElementById('tool-eraser-btn');
const toolClearBtn = document.getElementById('tool-clear-btn');
const toolThickMd = document.getElementById('tool-thick-md');
const toolThickLg = document.getElementById('tool-thick-lg');
const toolDoneBtn = document.getElementById('tool-done-btn');

let isDrawingMode = false;
let isDrawing = false;
let currentMode = 'pen';
let currentThickness = 3;
let drawingHistory = [];
let currentStroke = null;

let isPanning = false;
let startPanX, startPanY, startScrollLeft, startScrollTop;

let currentZoom = 1.0;
const zoomSlider = document.getElementById('zoom-slider');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const zoomResetBtn = document.getElementById('zoom-reset-btn');
const zoomLevelText = document.getElementById('zoom-level-text');

const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
// README サイズ設定（モーダル操作）
const readmeSettingsBtn = document.getElementById('readme-settings-btn');

const globalSettings = {
	readmeAuto: true,
	readmeWidth: 1024,
	readmeHeight: 768,
	readmeFontSize: 20,
	readmeBgColor: '#fdfbf7',
	readmeFontFamily: "'Sawarabi Gothic', sans-serif"
};

let alarmSettings = {
	time: 0,
	vol: 0.5,
	sound: 'se/call_niwatori.mp3'
};

const volumeIconWrapper = document.getElementById('volume-icon-wrapper');
const volumeSlider = document.getElementById('volume-slider');
const rewindBtn = document.getElementById('rewind-btn');
const forwardBtn = document.getElementById('forward-btn');
const playPauseBtn = document.getElementById('play-pause-btn');
let isPlaying = false;

const timerDisplayContainer = document.getElementById('timer-display-container');
const toggleTimerInlineBtn = document.getElementById('toggle-timer-inline-btn');
const timerText = document.getElementById('timer-text');
const secondHand = document.getElementById('second-hand');

let timerInterval = null;
let secondsElapsed = 0;
let activeGroupName = "";
let isMuted = false;
let previousVolume = 1.0; // デフォルト1.0に変更

// --- MP3によるアラーム再生処理 ---
let alarmAudio = new Audio('se/call_niwatori.mp3');

function playAlarm(overrideVol) {
	let masterVol = overrideVol !== undefined ? overrideVol : alarmSettings.vol;
	if (masterVol <= 0) return;

	alarmAudio.src = alarmSettings.sound || 'se/call_niwatori.mp3';
	alarmAudio.currentTime = 0;
	alarmAudio.volume = masterVol;

	alarmAudio.play().catch(e => {
		console.error("音声の再生に失敗しました:", e);
	});
}

function getTextColorForBackground(hexColor) {
	let hex = hexColor.replace('#', '');
	if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]; // 短縮形の対応
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);
	// 輝度（YIQ）を計算して文字色を判定
	const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
	return (yiq >= 128) ? '#333333' : '#ffffff';
}

window.addEventListener('DOMContentLoaded', () => {
	// フォルダ読み込み前はプレビュー枠をHDに固定
	userSelectedWidth = 1280; userSelectedHeight = 720; userSelectedPreset = "1280x720";
	applySize(userSelectedWidth, userSelectedHeight, userSelectedPreset);

	const sidebarEl = document.getElementById('sidebar');
	const sidebarScrollArea = document.getElementById('sidebar-scroll-area');
	if (sidebarEl) {
		sidebarEl.style.height = '100vh';
		sidebarEl.style.maxHeight = '100vh';
	}
	if (sidebarScrollArea) {
		sidebarScrollArea.style.flex = '1 1 0px';
		sidebarScrollArea.style.minHeight = '0';
		sidebarScrollArea.style.overflowY = 'auto';
	}
});

// --- index.htmlからの設定受信 ---
window.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'updatePreviewSettings') {
		const s = event.data.settings;
		if (s.readmeAuto !== undefined) globalSettings.readmeAuto = s.readmeAuto;
		if (s.readmeWidth !== undefined) globalSettings.readmeWidth = s.readmeWidth;
		if (s.readmeHeight !== undefined) globalSettings.readmeHeight = s.readmeHeight;
		if (s.readmeFontSize !== undefined) globalSettings.readmeFontSize = s.readmeFontSize;
		if (s.readmeBgColor !== undefined) globalSettings.readmeBgColor = s.readmeBgColor;
		if (s.readmeFontFamily !== undefined) globalSettings.readmeFontFamily = s.readmeFontFamily;
		if (s.alarmTime !== undefined) alarmSettings.time = s.alarmTime;
		if (s.alarmVol !== undefined) alarmSettings.vol = s.alarmVol;
		if (s.alarmSound !== undefined) alarmSettings.sound = s.alarmSound;

		// ▼ モザイク設定の判定をこのブロック内に配置する ▼
		if (s.mosaicBelow !== undefined) {
			const listContainer = document.getElementById('list-container');
			if (listContainer) {
				if (s.mosaicBelow) {
					listContainer.classList.add('enable-mosaic-below');
				} else {
					listContainer.classList.remove('enable-mosaic-below');
				}
			}
		}

		// 現在READMEを表示中であれば即時反映
		const activeItem = document.querySelector('.list-item.active');
		if (activeItem && activeItem.textContent.toLowerCase().includes('readme')) {
			if (globalSettings.readmeAuto) {
				applySize(globalSettings.readmeWidth, globalSettings.readmeHeight, `${globalSettings.readmeWidth}x${globalSettings.readmeHeight}`);
			} else {
				restoreUserSize();
			}
			// フォント・背景も即時反映
			const pre = contentLayer.querySelector('.text-preview-content');
			if (pre) {
				pre.style.backgroundColor = globalSettings.readmeBgColor;
				pre.style.color = getTextColorForBackground(globalSettings.readmeBgColor);
				pre.style.fontFamily = globalSettings.readmeFontFamily;
				pre.style.fontSize = globalSettings.readmeFontSize + 'px';
			}
		}
	}
});

function applySize(w, h, preset) {
	isProgrammaticResize = true;
	presentationArea.style.width = w + 'px';
	presentationArea.style.height = h + 'px';
	inputWidth.value = w;
	inputHeight.value = h;
	if (preset) {
		const opt = Array.from(sizeSelector.options).find(o => o.value === preset);
		if (opt) sizeSelector.value = preset;
	}
	setTimeout(() => { isProgrammaticResize = false; }, 100);
}

function restoreUserSize() {
	applySize(userSelectedWidth, userSelectedHeight, userSelectedPreset);
}

// README 自動サイズは globalSettings.readmeAuto を使用

sizeSelector.addEventListener('change', (e) => {
	const [w, h] = e.target.value.split('x');
	applySize(w, h, e.target.value);
	userSelectedWidth = w;
	userSelectedHeight = h;
	userSelectedPreset = e.target.value;
});

function updateSizeFromInput() {
	const w = inputWidth.value;
	const h = inputHeight.value;
	applySize(w, h, null);
	userSelectedWidth = w;
	userSelectedHeight = h;
	const matchingOption = Array.from(sizeSelector.options).find(opt => opt.value === `${w}x${h}`);
	userSelectedPreset = matchingOption ? matchingOption.value : "custom";
}
inputWidth.addEventListener('change', updateSizeFromInput);
inputHeight.addEventListener('change', updateSizeFromInput);

const resizeObserver = new ResizeObserver(entries => {
	for (let entry of entries) {
		const width = presentationArea.offsetWidth;

		const contentWidth = Math.round(entry.contentRect.width);
		const contentHeight = Math.round(entry.contentRect.height);

		canvas.width = contentWidth;
		canvas.height = contentHeight;
		redrawCanvas();

		if (!isProgrammaticResize && width > 0 && contentHeight > 0) {
			const matchingOption = Array.from(sizeSelector.options).find(opt => opt.value === `${contentWidth}x${contentHeight}`);
			if (matchingOption) sizeSelector.value = matchingOption.value;

			userSelectedWidth = contentWidth;
			userSelectedHeight = contentHeight;
			userSelectedPreset = matchingOption ? matchingOption.value : "custom";

			inputWidth.value = contentWidth;
			inputHeight.value = contentHeight;
		}
	}
});
resizeObserver.observe(presentationArea);

chromakeyBtn.addEventListener('click', () => {
	document.body.classList.toggle('chromakey-mode');
	if (document.body.classList.contains('chromakey-mode')) {
		if (emptyMessage) emptyMessage.style.display = 'none';
		chromakeyBtn.innerHTML = '<i data-lucide="user"></i>解除';
		chromakeyBtn.setAttribute('title', 'クロマキー背景を解除する');
		chromakeyBtn.style.backgroundColor = '#00FF00';
		chromakeyBtn.style.color = '#333';
		chromakeyBtn.style.borderColor = '#00FF00';
	} else {
		if (emptyMessage) emptyMessage.style.display = 'block';
		chromakeyBtn.innerHTML = '<i data-lucide="image"></i>クロマキー';
		chromakeyBtn.setAttribute('title', 'クロマキー背景で表示する');
		chromakeyBtn.style.backgroundColor = '';
		chromakeyBtn.style.color = '';
		chromakeyBtn.style.borderColor = '';
	}
	lucide.createIcons({ root: chromakeyBtn });
});

function applyZoom(oldZoom, newZoom) {
	const rect = presentationArea.getBoundingClientRect();
	const centerX = presentationArea.scrollLeft + rect.width / 2;
	const centerY = presentationArea.scrollTop + rect.height / 2;
	const ratio = newZoom / oldZoom;

	zoomWrapper.style.transform = `scale(${newZoom})`;
	zoomLevelText.innerText = `${Math.round(newZoom * 100)}%`;
	zoomSlider.value = newZoom;

	presentationArea.scrollLeft = centerX * ratio - rect.width / 2;
	presentationArea.scrollTop = centerY * ratio - rect.height / 2;

	if (newZoom <= 1.0) presentationArea.classList.remove('can-pan');
	else presentationArea.classList.add('can-pan');
}

zoomSlider.addEventListener('input', (e) => {
	const newZoom = parseFloat(e.target.value);
	applyZoom(currentZoom, newZoom);
	currentZoom = newZoom;
});
zoomInBtn.addEventListener('click', () => {
	const newZoom = Math.min(currentZoom + 0.1, 3.0);
	applyZoom(currentZoom, newZoom);
	currentZoom = newZoom;
});
zoomOutBtn.addEventListener('click', () => {
	const newZoom = Math.max(currentZoom - 0.1, 0.5);
	applyZoom(currentZoom, newZoom);
	currentZoom = newZoom;
});
zoomResetBtn.addEventListener('click', () => {
	applyZoom(currentZoom, 1.0);
	currentZoom = 1.0;
});

presentationArea.addEventListener('mousedown', (e) => {
	if (isDrawingMode || currentZoom <= 1.0) return;
	isPanning = true;
	startPanX = e.clientX;
	startPanY = e.clientY;
	startScrollLeft = presentationArea.scrollLeft;
	startScrollTop = presentationArea.scrollTop;
});
window.addEventListener('mousemove', (e) => {
	if (!isPanning || isDrawingMode) return;
	e.preventDefault();
	const walkX = e.clientX - startPanX;
	const walkY = e.clientY - startPanY;
	presentationArea.scrollLeft = startScrollLeft - walkX;
	presentationArea.scrollTop = startScrollTop - walkY;
});
window.addEventListener('mouseup', () => { if (isPanning) isPanning = false; });

function applyCurrentMode() {
	ctx.lineCap = 'round';
	ctx.lineJoin = 'round';
	if (currentMode === 'eraser') {
		ctx.globalCompositeOperation = 'destination-out';
		ctx.lineWidth = 20;
	} else {
		ctx.globalCompositeOperation = 'source-over';
		ctx.strokeStyle = '#e74c3c';
		ctx.lineWidth = currentThickness;
	}
}

function redrawCanvas() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	const centerX = canvas.width / 2;
	const centerY = canvas.height / 2;

	drawingHistory.forEach(stroke => {
		if (stroke.points.length === 0) return;
		ctx.beginPath();
		ctx.lineCap = 'round'; ctx.lineJoin = 'round';
		if (stroke.mode === 'eraser') {
			ctx.globalCompositeOperation = 'destination-out'; ctx.lineWidth = 20;
		} else {
			ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#e74c3c'; ctx.lineWidth = stroke.thickness || 3;
		}
		const firstPt = stroke.points[0];
		ctx.moveTo(firstPt.x + centerX, firstPt.y + centerY);
		for (let i = 1; i < stroke.points.length; i++) {
			const pt = stroke.points[i];
			ctx.lineTo(pt.x + centerX, pt.y + centerY);
		}
		ctx.stroke();
	});
}

function toggleDrawingMode(forceState) {
	isDrawingMode = forceState !== undefined ? forceState : !isDrawingMode;
	if (isDrawingMode) {
		canvas.classList.add('active');
		presentationArea.style.cursor = 'crosshair';
		activateDrawingBtn.style.backgroundColor = '#e74c3c';
		activateDrawingBtn.style.color = '#fff';
		activateDrawingBtn.style.borderColor = '#e74c3c';
		drawingSidebar.style.display = 'flex';
		currentMode = 'pen';
		toolPenBtn.classList.add('active-tool');
		toolEraserBtn.classList.remove('active-tool');
	} else {
		canvas.classList.remove('active');
		presentationArea.style.cursor = '';
		activateDrawingBtn.style.backgroundColor = '';
		activateDrawingBtn.style.color = '';
		activateDrawingBtn.style.borderColor = '';
		drawingSidebar.style.display = 'none';
	}
}

activateDrawingBtn.addEventListener('click', () => toggleDrawingMode());
toolDoneBtn.addEventListener('click', () => toggleDrawingMode(false));
toolPenBtn.addEventListener('click', () => { currentMode = 'pen'; toolPenBtn.classList.add('active-tool'); toolEraserBtn.classList.remove('active-tool'); });
toolEraserBtn.addEventListener('click', () => { currentMode = 'eraser'; toolEraserBtn.classList.add('active-tool'); toolPenBtn.classList.remove('active-tool'); });
toolThickMd.addEventListener('click', () => { currentThickness = 3; toolThickMd.classList.add('active-tool'); toolThickLg.classList.remove('active-tool'); });
toolThickLg.addEventListener('click', () => { currentThickness = 8; toolThickLg.classList.add('active-tool'); toolThickMd.classList.remove('active-tool'); });
toolClearBtn.addEventListener('click', () => { drawingHistory = []; redrawCanvas(); });

function getMousePos(evt) {
	const rect = canvas.getBoundingClientRect();
	return { x: (evt.clientX - rect.left) / currentZoom, y: (evt.clientY - rect.top) / currentZoom };
}

canvas.addEventListener('mousedown', (e) => {
	if (!isDrawingMode) return;
	isDrawing = true;
	const pos = getMousePos(e);
	const centerX = canvas.width / 2; const centerY = canvas.height / 2;
	currentStroke = { mode: currentMode, thickness: currentThickness, points: [{ x: pos.x - centerX, y: pos.y - centerY }] };
	drawingHistory.push(currentStroke);
	ctx.beginPath(); applyCurrentMode(); ctx.moveTo(pos.x, pos.y);
});
canvas.addEventListener('mousemove', (e) => {
	if (!isDrawing || !isDrawingMode) return;
	const pos = getMousePos(e);
	const centerX = canvas.width / 2; const centerY = canvas.height / 2;
	currentStroke.points.push({ x: pos.x - centerX, y: pos.y - centerY });
	ctx.lineTo(pos.x, pos.y); ctx.stroke();
});
canvas.addEventListener('mouseup', () => { if (isDrawing) { ctx.closePath(); isDrawing = false; } });
canvas.addEventListener('mouseout', () => { if (isDrawing) { ctx.closePath(); isDrawing = false; } });

// ★ 音量最大300%対応（Web Audio API の GainNode と連動）
function applyVolume() {
	const rawVol = parseFloat(volumeSlider.value); // 0.0 ~ 3.0
	const actualVol = rawVol; // スライダーの値をそのまま音量とする（最大300%）

	const media = contentLayer.querySelector('video, audio');
	if (media) {
		if (media.audioRouted && media.gainNode) {
			media.volume = 1.0; // 本体音量は1.0に固定し、GainNodeで増幅する
			media.gainNode.gain.value = actualVol;
		} else {
			media.volume = Math.min(1.0, actualVol); // ルーティング前は100%を上限にする
		}
	}
	if (ytPlayer && typeof ytPlayer.setVolume === 'function') {
		ytPlayer.setVolume(Math.min(100, actualVol * 100)); // YouTubeは最大100%
	}
}

function updateVolumeIcon(rawVol) {
	let iconName = 'volume-2';
	if (rawVol === 0) iconName = 'volume-x';
	else if (rawVol <= 0.5) iconName = 'volume-1';
	volumeIconWrapper.innerHTML = `<i data-lucide="${iconName}"></i>`;
	lucide.createIcons({ root: volumeIconWrapper });
}

volumeIconWrapper.addEventListener('click', () => {
	isMuted = !isMuted;
	if (isMuted) {
		previousVolume = volumeSlider.value;
		volumeSlider.value = 0;
	} else {
		volumeSlider.value = previousVolume > 0 ? previousVolume : 1.0;
	}
	applyVolume();
	updateVolumeIcon(parseFloat(volumeSlider.value));
});

volumeSlider.addEventListener('input', () => {
	isMuted = volumeSlider.value == 0;
	applyVolume();
	updateVolumeIcon(parseFloat(volumeSlider.value));
});

rewindBtn.addEventListener('click', () => {
	const media = contentLayer.querySelector('video, audio');
	if (media) media.currentTime = Math.max(0, media.currentTime - 5);
	if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function') ytPlayer.seekTo(Math.max(0, ytPlayer.getCurrentTime() - 5), true);
});
forwardBtn.addEventListener('click', () => {
	const media = contentLayer.querySelector('video, audio');
	if (media) media.currentTime = Math.min(media.duration || Infinity, media.currentTime + 5);
	if (ytPlayer && typeof ytPlayer.getCurrentTime === 'function' && typeof ytPlayer.getDuration === 'function') ytPlayer.seekTo(Math.min(ytPlayer.getDuration(), ytPlayer.getCurrentTime() + 5), true);
});

function updatePlayPauseUI(playing) {
	isPlaying = playing;
	if (isPlaying) {
		playPauseBtn.innerHTML = '<i data-lucide="pause"></i>';
		playPauseBtn.title = '停止';
	} else {
		playPauseBtn.innerHTML = '<i data-lucide="play"></i>';
		playPauseBtn.title = '再生';
	}
	lucide.createIcons({ root: playPauseBtn });
}

playPauseBtn.addEventListener('click', () => {
	const media = contentLayer.querySelector('video, audio');
	if (isPlaying) {
		if (media) media.pause();
		if (ytPlayer && typeof ytPlayer.pauseVideo === 'function') ytPlayer.pauseVideo();
		updatePlayPauseUI(false);
	} else {
		if (media) media.play();
		if (ytPlayer && typeof ytPlayer.playVideo === 'function') ytPlayer.playVideo();
		updatePlayPauseUI(true);
	}
});

function startTimer() {
	clearInterval(timerInterval);
	secondsElapsed = 0;
	updateTimerDisplay();

	const startTimeMs = Date.now();
	let alarmTriggered = false;

	timerInterval = setInterval(() => {
		// バックグラウンドでタブが休止状態になっても正確に時間を測るため Date.now() を使用
		secondsElapsed = Math.floor((Date.now() - startTimeMs) / 1000);
		updateTimerDisplay();

		// アラーム機能
		if (alarmSettings.time > 0 && !alarmTriggered) {
			const targetSeconds = alarmSettings.time * 60;
			if (secondsElapsed >= targetSeconds) {
				playAlarm();
				alarmTriggered = true;
			}
		}
	}, 1000);
}

function updateTimerDisplay() {
	const minutes = Math.floor(secondsElapsed / 60);
	timerText.innerText = `${minutes}分`;
	const degrees = secondsElapsed * 6;
	secondHand.style.transform = `translateX(-50%) rotate(${degrees}deg)`;
}
toggleTimerInlineBtn.addEventListener('click', () => {
	timerDisplayContainer.classList.toggle('timer-hidden');
	if (timerDisplayContainer.classList.contains('timer-hidden')) { toggleTimerInlineBtn.innerHTML = '<i data-lucide="eye-off"></i>'; toggleTimerInlineBtn.title = 'タイマーを表示'; }
	else { toggleTimerInlineBtn.innerHTML = '<i data-lucide="eye"></i>'; toggleTimerInlineBtn.title = 'タイマーを隠す'; }
	lucide.createIcons({ root: toggleTimerInlineBtn });
});

toggleSidebarBtn.addEventListener('click', () => {
	sidebar.classList.toggle('collapsed');
	if (sidebar.classList.contains('collapsed')) {
		toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-right" id="sidebar-chevron"></i><span class="toggle-text" style="display:none;">閉じる</span>'; toggleSidebarBtn.title = 'サイドバーを展開する';
	} else {
		toggleSidebarBtn.innerHTML = '<i data-lucide="chevron-left" id="sidebar-chevron"></i><span class="toggle-text">閉じる</span>'; toggleSidebarBtn.title = 'サイドバーを縮小する';
	}
	lucide.createIcons({ root: toggleSidebarBtn });
});

fullscreenBtn.addEventListener('click', () => {
	if (presentationArea.requestFullscreen) presentationArea.requestFullscreen();
	else if (presentationArea.webkitRequestFullscreen) presentationArea.webkitRequestFullscreen();
});

function navigateList(direction) {
	const items = Array.from(document.querySelectorAll('.list-item'));
	if (items.length === 0) return;
	const activeIndex = items.findIndex(btn => btn.classList.contains('active'));
	let targetIndex = 0;
	if (activeIndex !== -1) {
		targetIndex = activeIndex + direction;
		if (targetIndex < 0) targetIndex = items.length - 1;
		if (targetIndex >= items.length) targetIndex = 0;
	}
	items[targetIndex].click();
	// ★ block: 'start' に変更
	items[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
}
prevBtn.addEventListener('click', () => navigateList(-1));
nextBtn.addEventListener('click', () => navigateList(1));

function updateGroupNumbers() {
	const groups = Array.from(listContainer.querySelectorAll('.group-container'));
	groups.forEach((group, index) => {
		const numStr = `${index + 1}`;
		const fullNumSpan = group.querySelector('.group-number');
		if (fullNumSpan) fullNumSpan.innerText = numStr;
	});
}

if (loadBtn && folderInput) {
	loadBtn.addEventListener('dragover', () => {
		loadBtn.classList.add('drag-over');
	});

	loadBtn.addEventListener('dragleave', () => {
		loadBtn.classList.remove('drag-over');
	});

	loadBtn.addEventListener('drop', () => {
		loadBtn.classList.remove('drag-over');
	});
}

folderInput.addEventListener('change', (event) => {
	const files = Array.from(event.target.files);
	listContainer.innerHTML = '';
	activeGroupName = "";
	clearInterval(timerInterval); secondsElapsed = 0; updateTimerDisplay();

	const validFiles = files.filter(file => !file.name.startsWith('.') && file.name.toLowerCase() !== 'log.txt');

	// ★ display: 'flex' に変更
	if (validFiles.length > 0) document.getElementById('drag-hint-text').style.display = 'flex';
	else document.getElementById('drag-hint-text').style.display = 'none';

	validFiles.sort((a, b) => {
		const pathA = a.webkitRelativePath || a.name; const pathB = b.webkitRelativePath || b.name;
		const dirA = pathA.includes('/') ? pathA.substring(0, pathA.lastIndexOf('/')) : '';
		const dirB = pathB.includes('/') ? pathB.substring(0, pathB.lastIndexOf('/')) : '';
		if (dirA !== dirB) return dirA.localeCompare(dirB);
		const nameA = a.name; const nameB = b.name;
		const isReadmeTxtA = /^README\d{3}/i.test(nameA) && nameA.toLowerCase().endsWith('.txt');
		const isReadmeTxtB = /^README\d{3}/i.test(nameB) && nameB.toLowerCase().endsWith('.txt');
		if (isReadmeTxtA && !isReadmeTxtB) return -1;
		if (!isReadmeTxtA && isReadmeTxtB) return 1;
		return nameA.localeCompare(nameB);
	});

	const groupsMap = new Map();
	const groupOrder = [];
	validFiles.forEach(file => {
		const pathStr = file.webkitRelativePath || file.name;
		const pathParts = pathStr.split('/');
		let mainGroupName = "その他"; let subGroupName = ""; let isStandaloneFile = false;
		if (pathParts.length === 2) { mainGroupName = file.name; isStandaloneFile = true; }
		else if (pathParts.length > 2) { mainGroupName = pathParts[1]; if (pathParts.length > 3) subGroupName = pathParts.slice(2, -1).join(' / '); }
		else if (pathParts.length === 1) { mainGroupName = file.name; isStandaloneFile = true; }

		const key = mainGroupName;
		if (!groupsMap.has(key)) {
			groupsMap.set(key, { files: [], mainGroupName, isStandaloneFile });
			groupOrder.push(key);
		}
		let fileIcon = "file"; let iconColorStyle = "";
		const fileName = file.name.toLowerCase();
		if (fileName.endsWith('.mp4')) fileIcon = "film";
		else if (fileName.match(/\.(mp3|wav|m4a)$/)) fileIcon = "music";
		else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) fileIcon = "image";
		else if (fileName.match(/\.(txt|pdf)$/)) fileIcon = "file";
		else if (fileName.match(/\.(html|htm)$/)) fileIcon = "globe";
		else { fileIcon = "file"; iconColorStyle = "color: #e74c3c;"; }

		groupsMap.get(key).files.push({ file, fileIcon, iconColorStyle, subGroupName });
	});

	groupOrder.forEach(key => {
		const groupInfo = groupsMap.get(key);
		const mainGroupName = groupInfo.mainGroupName;
		const isStandaloneFile = groupInfo.isStandaloneFile;
		const currentGroupContainer = document.createElement('div');
		currentGroupContainer.className = 'group-container'; currentGroupContainer.draggable = true;
		const match = mainGroupName.match(/【#(.+?)】/);
		if (match) {
			currentGroupContainer.setAttribute('data-overlay-text', match[1]);
		}
		const shortName = mainGroupName.substring(0, 3);
		const groupTitle = document.createElement('h4'); groupTitle.className = 'group-title';
		let groupIcon = isStandaloneFile ? groupInfo.files[0].fileIcon : "folder";
		let groupIconStyle = isStandaloneFile ? groupInfo.files[0].iconColorStyle : "";

		// ★ アイコン内に数字を重ねるマークアップに変更
		groupTitle.innerHTML = `
			<span class="group-title-full">
				<span class="group-icon-wrapper">
					<i data-lucide="${groupIcon}" style="width:22px; height:22px; ${groupIconStyle}"></i>
					<span class="group-number"></span>
				</span>
				${mainGroupName}
			</span>
			<span class="group-title-short">${shortName}</span>
			<button class="group-toggle-btn"><i data-lucide="chevron-up"></i></button>
		`;

		const toggleBtn = groupTitle.querySelector('.group-toggle-btn');
		toggleBtn.addEventListener('click', (e) => {
			e.stopPropagation(); const container = e.target.closest('.group-container');
			if (container) {
				container.classList.toggle('collapsed-group');
				if (container.classList.contains('collapsed-group')) toggleBtn.innerHTML = '<i data-lucide="chevron-down"></i>';
				else toggleBtn.innerHTML = '<i data-lucide="chevron-up"></i>';
				lucide.createIcons({ root: toggleBtn });
			}
		});

		// ▼ 閉じている状態で見出しをクリックした際に最初のリストを選択する処理 ▼
		groupTitle.addEventListener('click', (e) => {
			// 開閉ボタン（トグル）自体をクリックした場合はスキップ
			if (e.target.closest('.group-toggle-btn')) return;

			// グループが閉じている時のみ発火させる
			if (currentGroupContainer.classList.contains('collapsed-group')) {
				const firstItem = currentGroupContainer.querySelector('.list-item');
				if (firstItem) {
					firstItem.click(); // リスト本体をクリックした時と同じ表示処理を実行
				}
			}
		});

		currentGroupContainer.appendChild(groupTitle);
		currentGroupContainer.appendChild(groupTitle);
		setupGroupDragAndDrop(currentGroupContainer);

		groupInfo.files.sort((a, b) => {
			if (a.subGroupName !== b.subGroupName) return a.subGroupName.localeCompare(b.subGroupName);
			const aReadme = a.file.name.toLowerCase().startsWith('readme');
			const bReadme = b.file.name.toLowerCase().startsWith('readme');
			if (aReadme && !bReadme) return -1;
			if (!aReadme && bReadme) return 1;
			return a.file.name.localeCompare(b.file.name);
		});

		let currentSubGroup = null;

		groupInfo.files.forEach(({ file, fileIcon, iconColorStyle, subGroupName }) => {
			if (subGroupName && subGroupName !== currentSubGroup) {
				const subGroupTitle = document.createElement('div');
				subGroupTitle.className = 'sub-group-title';
				subGroupTitle.innerHTML = `<i data-lucide="corner-down-right" style="width:14px;height:14px;"></i> ${subGroupName}`;

				const warningNode = currentGroupContainer.querySelector('.group-warnings');
				if (warningNode) {
					currentGroupContainer.insertBefore(subGroupTitle, warningNode);
				} else {
					currentGroupContainer.appendChild(subGroupTitle);
				}
				currentSubGroup = subGroupName;
			}

			createListButton(file, currentGroupContainer, mainGroupName, subGroupName, fileIcon, iconColorStyle);
		});
		listContainer.appendChild(currentGroupContainer);
	});
	updateGroupNumbers(); folderInput.value = "";
	lucide.createIcons({ root: listContainer });
});

// グループ同士のドラッグ＆ドロップ処理
function setupGroupDragAndDrop(group) {
	group.addEventListener('dragstart', (e) => {
		if (e.target !== group && !e.target.classList.contains('group-title')) { return; }
		group.classList.add('dragging');
		e.dataTransfer.effectAllowed = 'move';
	});
	group.addEventListener('dragend', () => { group.classList.remove('dragging'); });

	group.addEventListener('dragover', (e) => {
		const draggingGroup = document.querySelector('.group-container.dragging');
		if (draggingGroup) {
			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
		}
	});

	group.addEventListener('drop', (e) => {
		const draggingGroup = document.querySelector('.group-container.dragging');
		if (draggingGroup && draggingGroup !== group) {
			e.preventDefault(); e.stopPropagation();
			const allGroups = Array.from(listContainer.querySelectorAll('.group-container'));
			const draggingIndex = allGroups.indexOf(draggingGroup); const dropIndex = allGroups.indexOf(group);
			if (draggingIndex < dropIndex) group.after(draggingGroup); else group.before(draggingGroup);
			updateGroupNumbers();
		}
	});
}

function getHostFromUrl(urlString) {
	try {
		const url = new URL(urlString);
		return url.hostname;
	} catch (e) {
		return "";
	}
}

// リストアイテム（ボタン）の生成とドラッグ＆ドロップ処理
function createListButton(file, container, folderName, subGroupName = "", fileIcon = "file", iconColorStyle = "") {
	const button = document.createElement('button');
	button.className = 'list-item';
	if (subGroupName !== "") button.classList.add('is-sub-item');
	button.setAttribute('data-subgroup', subGroupName);

	button.innerHTML = `<span class="item-icon"><i data-lucide="${fileIcon}" style="width:18px;height:18px; ${iconColorStyle}"></i></span><span class="item-text">${file.name}</span>
 <a href="#" target="_blank" class="item-action" title="新規タブで開く" style="display: none;" onclick="event.stopPropagation();"><i data-lucide="external-link" style="width:16px;height:16px;"></i></a>`;
	button.title = file.name;

	const addGroupWarning = (text) => {
		try {
			const groupEl = container.closest('.group-container') || container;
			if (!groupEl) return;

			let warningEl = groupEl.querySelector('.group-warnings');
			if (!warningEl) {
				warningEl = document.createElement('details');
				warningEl.className = 'group-warnings';
				warningEl.style.cssText = 'font-size:11px; color:rgb(102, 102, 102); margin:4px 12px 6px 12px; line-height:1.4;';
				warningEl.innerHTML = '<summary style="cursor:pointer; outline:none; user-select:none;">指示コメ</summary><ul style="margin:4px 0 0 0; padding-left:16px;"></ul>';
			}
			groupEl.appendChild(warningEl);

			const list = warningEl.querySelector('ul');
			const warningText = `[${file.name}] ${text}`;

			let exists = false;
			list.querySelectorAll('li').forEach(li => {
				if (li.textContent === warningText) exists = true;
			});

			if (!exists) {
				const li = document.createElement('li');
				li.textContent = warningText;
				list.appendChild(li);
			}
			lucide.createIcons({ root: warningEl });
		} catch (err) { console.error(err); }
	};

	const fileName = file.name.toLowerCase();

	const isOffice = fileName.match(/\.(pptx|ppt|xlsx|xls|docx|doc)$/);
	const isPreviewable = fileName.match(/\.(mp4|mp3|wav|m4a|jpg|jpeg|png|gif|webp|txt|pdf|html|htm)$/);

	if (isOffice) {
		addGroupWarning('OfficeファイルはGoogleドライブにアップロードしたら見れるかも知れないね💦😉.txtファイルに共有リンクを貼ったらどうかな…？🤔✨');
	} else if (!isPreviewable) {
		addGroupWarning('このファイルは見れないんじゃないかなぁ💦もしかしたらGoogleドライブにアップロードしたら見れるかもよ〜🤭.txtファイルに共有リンク貼ったらいいのにねっ👍✨');
	}

	if (fileName.endsWith('.txt')) {
		const reader = new FileReader();
		reader.onload = function (e) {
			const text = e.target.result.trim();
			const iconSpan = button.querySelector('.item-icon');
			const actionBtn = button.querySelector('.item-action');
			const sharedDomains = ['gigafile.nu', 'gigafile.jp', 'xgf.nu', 'datadeliver.net', 'dtbn.jp', 'firestorage.jp', 'xfs.jp', 'tenpu.me', 'ac-data.info', 'okurin.bitpark.co.jp', 'delifile.link'];

			const host = getHostFromUrl(text);
			const isDriveFolder = host === 'drive.google.com' && text.includes('/folders/');
			const containsTransfer = sharedDomains.some(d => host === d || host.endsWith('.' + d));

			const isKnownEmbeddable = (host === 'docs.google.com' && /\/(presentation|spreadsheets|document)\/d\//.test(text)) ||
				(host === 'sharepoint.com' || host.endsWith('.sharepoint.com')) ||
				(host === '1drv.ms' || host.endsWith('.1drv.ms')) ||
				(((host === 'youtube.com' || host.endsWith('.youtube.com')) || host === 'youtu.be') && isYtApiReady) ||
				(host === 'drive.google.com' && /\/(file|open)\//.test(text));

			if (/^https?:\/\/\S+$/.test(text)) {
				if (actionBtn) { actionBtn.href = text; actionBtn.style.display = 'flex'; }
			}
			if (iconSpan) {
				if (isDriveFolder || containsTransfer) {
					iconSpan.innerHTML = '<i data-lucide="link" style="width:18px;height:18px;color:#e74c3c;"></i>';
				} else {
					if (/^https?:\/\/\S+$/.test(text) && !isKnownEmbeddable) {
						iconSpan.innerHTML = '<i data-lucide="globe" style="width:18px;height:18px;color:#f39c12;"></i>';
					} else if (isKnownEmbeddable) {
						iconSpan.innerHTML = '<i data-lucide="link" style="width:18px;height:18px;color:#333;"></i>';
					} else {
						iconSpan.innerHTML = '<i data-lucide="file" style="width:18px;height:18px;color:#333;"></i>';
					}
				}
				lucide.createIcons({ root: iconSpan });
			}

			if (containsTransfer) {
				addGroupWarning('ダウンロード用URLの可能性があるから😃💦チョット手間だけどURLからファイルをDLして😃📁このtxtファイルは削除（ぽいっ🗑️）したらDLしたデータをフォルダに保存して😉💖再度フォルダを読み込んでみてネッ❗✨🙏ヨロシクね〜〜ッッ😜👍❗✨笑');
			} else {
				if (/^https?:\/\/\S+$/.test(text) && !isKnownEmbeddable) {
					addGroupWarning('ﾔﾊｯ😃❗❗一部のサイトちゃんは、プレビュー表示ができないみたいんだよね〜😅💦申し訳ないんだけど💦「新規タブ」で見ちゃってほしいナ〜〜ッッ😉👍チョット手間に感じちゃうかもだけどイジワルしないでね😜ナンチャッテ❗✨🙏');
				}
			}
		};
		reader.readAsText(file);
	}

	button.onclick = () => {
		// ★ 親グループのアクティブクラス（has-active-item）切り替え処理
		document.querySelectorAll('.group-container').forEach(group => group.classList.remove('has-active-item'));
		const parentGroup = button.closest('.group-container');
		if (parentGroup) parentGroup.classList.add('has-active-item');

		document.querySelectorAll('.list-item').forEach(btn => btn.classList.remove('active'));
		button.classList.add('active');

		const isReadme = file.name.toLowerCase().startsWith('readme');

		if (isReadme && globalSettings.readmeAuto) {
			applySize(globalSettings.readmeWidth, globalSettings.readmeHeight, `${globalSettings.readmeWidth}x${globalSettings.readmeHeight}`);
		} else {
			restoreUserSize();
		}

		showContent(file);
		if (activeGroupName !== folderName) {
			activeGroupName = folderName;
			startTimer();
			volumeSlider.value = 1;
			isMuted = false;
			applyVolume();
			updateVolumeIcon(1);
		}
	};

	button.draggable = true;
	button.addEventListener('dragstart', (e) => {
		e.stopPropagation();
		button.classList.add('dragging');
		e.dataTransfer.effectAllowed = 'move';
	});
	button.addEventListener('dragend', () => { button.classList.remove('dragging'); });

	const handleItemDragOverEnter = (e) => {
		const draggingItem = document.querySelector('.list-item.dragging');
		if (draggingItem) {
			e.stopPropagation();
			const dragSubgroup = draggingItem.getAttribute('data-subgroup');
			const dropSubgroup = button.getAttribute('data-subgroup');

			if (dragSubgroup !== dropSubgroup) {
				e.dataTransfer.dropEffect = 'none';
				return;
			}

			e.preventDefault();
			e.dataTransfer.dropEffect = 'move';
		}
	};

	button.addEventListener('dragenter', handleItemDragOverEnter);
	button.addEventListener('dragover', handleItemDragOverEnter);

	button.addEventListener('drop', (e) => {
		const draggingItem = document.querySelector('.list-item.dragging');
		if (draggingItem && draggingItem !== button) {
			e.stopPropagation();
			const dragSubgroup = draggingItem.getAttribute('data-subgroup');
			const dropSubgroup = button.getAttribute('data-subgroup');
			if (dragSubgroup !== dropSubgroup) return;

			e.preventDefault();
			const groupChildren = Array.from(container.children);
			const draggingIndex = groupChildren.indexOf(draggingItem); const dropIndex = groupChildren.indexOf(button);
			if (draggingIndex !== -1) { if (draggingIndex < dropIndex) button.after(draggingItem); else button.before(draggingItem); }
			else button.before(draggingItem);
		}
	});

	const warningNode = container.querySelector('.group-warnings');
	if (warningNode) {
		container.insertBefore(button, warningNode);
	} else {
		container.appendChild(button);
	}
}

function showContent(file) {
	updatePlayPauseUI(false);
	contentLayer.innerHTML = '';
	externalLinkBtn.style.display = 'none';
	drawingHistory = []; redrawCanvas();
	applyZoom(currentZoom, 1.0); currentZoom = 1.0;
	if (ytPlayer) { ytPlayer.destroy(); ytPlayer = null; }

	// デフォルトでスライダーの最大値を3（300%）に戻す
	volumeSlider.max = "3";

	const fileURL = URL.createObjectURL(file);
	const fileName = file.name.toLowerCase();

	if (fileName.match(/\.(mp4|mp3|wav|m4a)$/)) {
		setControlsEnabled(true);
		const isAudio = fileName.match(/\.(mp3|wav|m4a)$/);
		const media = document.createElement(isAudio ? 'audio' : 'video');
		media.src = fileURL;
		media.controls = true;

		if (isAudio) {
			media.style.width = '60%';
			media.style.height = '50px';
			media.style.outline = 'none';
		}

		contentLayer.appendChild(media);

		media.addEventListener('play', () => updatePlayPauseUI(true));
		media.addEventListener('pause', () => updatePlayPauseUI(false));
		media.addEventListener('ended', () => updatePlayPauseUI(false));

		media.addEventListener('play', () => {
			if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
			if (audioCtx.state === 'suspended') audioCtx.resume();

			if (!media.audioRouted) {
				try {
					const source = audioCtx.createMediaElementSource(media);
					const gainNode = audioCtx.createGain();
					source.connect(gainNode);
					gainNode.connect(audioCtx.destination);
					media.audioRouted = true;
					media.gainNode = gainNode;
					applyVolume();
				} catch (e) {
					console.error("Web Audio API routing error:", e);
				}
			}
		}, { once: true });

		applyVolume();

	} else if (fileName.match(/\.(html|htm)$/)) {
		setControlsEnabled(true);
		const iframe = document.createElement('iframe'); iframe.src = fileURL; iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none';
		contentLayer.appendChild(iframe);
	} else if (fileName.match(/\.pdf$/)) {
		setControlsEnabled(false);
		const iframe = document.createElement('iframe'); iframe.src = fileURL; iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none';
		contentLayer.appendChild(iframe);
	} else if (fileName.endsWith('.txt')) {
		const reader = new FileReader();
		reader.onload = function (e) {
			let text = e.target.result.trim();

			const ytMatch = text.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);

			if (ytMatch) {
				setControlsEnabled(true);

				// YouTubeの場合は最大値を1（100%）に制限する
				volumeSlider.max = "1";
				if (parseFloat(volumeSlider.value) > 1) {
					volumeSlider.value = "1";
					applyVolume();
					updateVolumeIcon(1);
				}

				externalLinkBtn.href = text; externalLinkBtn.style.display = 'flex';
				const videoId = ytMatch[1];

				if (isYtApiReady) {
					contentLayer.innerHTML = '<div id="yt-player-container"></div>';
					ytPlayer = new YT.Player('yt-player-container', {
						videoId: videoId, playerVars: { 'autoplay': 0, 'rel': 0, 'widget_referrer': 'http://localhost/' },
						events: {
							'onReady': function (event) { event.target.setVolume(Math.min(100, parseFloat(volumeSlider.value) * 100)); },
							'onStateChange': function (event) {
								if (event.data === YT.PlayerState.PLAYING) {
									updatePlayPauseUI(true);
								} else if (event.data === YT.PlayerState.PAUSED || event.data === YT.PlayerState.ENDED) {
									updatePlayPauseUI(false);
								}
							}
						}
					});
				} else {
					const embedUrl = `https://www.youtube.com/embed/${videoId}?rel=0`;
					contentLayer.innerHTML = `<div style="width:100%; height:100%; position:relative; background-color: #ffffff;"><iframe src="${embedUrl}" style="width:100%; height:100%; border:none; display: block;" allowfullscreen allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
				}
				return;
			}

			if (text.toLowerCase().startsWith('<iframe')) {
				setControlsEnabled(true);
				contentLayer.innerHTML = text; const iframe = contentLayer.querySelector('iframe');
				if (iframe) { iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none'; if (iframe.hasAttribute('allow')) iframe.setAttribute('allow', iframe.getAttribute('allow').replace(/autoplay;?\s*/i, '')); }
			} else if (/^https?:\/\/\S+$/.test(text)) {
				let iframeSrc = text;
				const host = getHostFromUrl(text);

				const driveFileMatch = text.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([a-zA-Z0-9_-]+)/);
				if (driveFileMatch) {
					setControlsEnabled(false);
					const fileId = driveFileMatch[1];
					iframeSrc = `https://drive.google.com/file/d/${fileId}/preview`;

					contentLayer.innerHTML = `<div style="width:100%; height:100%; position:relative; background-color: #ffffff;"><iframe src="${iframeSrc}" style="width:100%; height:100%; border:none; display: block;" allowfullscreen allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;

					externalLinkBtn.href = text;
					externalLinkBtn.style.display = 'flex';
					return;
				}

				setControlsEnabled(true);

				if (host === 'docs.google.com' && text.match(/\/(presentation|spreadsheets|document)\/d\//)) {
					const typeMatch = text.match(/\/(presentation|spreadsheets|document)\/d\//);
					const docType = typeMatch[1];

					if (text.includes('/pub')) {
						if (docType === 'presentation') {
							iframeSrc = text.replace(/\/pub.*/, '/embed?rm=minimal');
						} else if (docType === 'spreadsheets') {
							iframeSrc = text.includes('/pubhtml')
								? text.replace(/\/pubhtml.*/, '/pubhtml?widget=true&headers=false')
								: text.replace(/\/pub.*/, '/pubhtml?widget=true&headers=false');
						} else if (docType === 'document') {
							iframeSrc = text.replace(/\/pub.*/, '/pub?embedded=true');
						}
					} else if (!text.includes('/embed') && !text.includes('/preview')) {
						const match = text.match(/\/d\/([a-zA-Z0-9_-]+)/);
						if (match && match[1] !== 'e') {
							if (docType === 'presentation') {
								iframeSrc = `https://docs.google.com/presentation/d/${match[1]}/embed?rm=minimal`;
							} else {
								iframeSrc = `https://docs.google.com/${docType}/d/${match[1]}/preview`;
							}
						}
					}
				}
				else if ((host === 'sharepoint.com' || host.endsWith('.sharepoint.com')) || (host === '1drv.ms' || host.endsWith('.1drv.ms'))) {
					try { const urlObj = new URL(text); urlObj.searchParams.set('action', 'embedview'); urlObj.searchParams.set('wdAr', '1.7777777777777777'); iframeSrc = urlObj.toString(); } catch (e) { console.error(e); }
				}

				contentLayer.innerHTML = `<div style="width:100%; height:100%; position:relative; background-color: #ffffff;"><iframe src="${iframeSrc}" style="width:100%; height:100%; border:none; display: block;" allowfullscreen allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>`;
				externalLinkBtn.href = text; externalLinkBtn.style.display = 'flex';
			} else {
				setControlsEnabled(false);
				const pre = document.createElement('pre'); pre.className = 'text-preview-content'; pre.textContent = text; contentLayer.appendChild(pre);
				if (fileName.startsWith('readme')) {
					pre.style.fontSize = (globalSettings.readmeFontSize || 20) + 'px';
					pre.style.backgroundColor = globalSettings.readmeBgColor || '#fdfbf7';
					pre.style.color = getTextColorForBackground(globalSettings.readmeBgColor || '#fdfbf7');
					pre.style.fontFamily = globalSettings.readmeFontFamily || "'Sawarabi Gothic', sans-serif";
					if (globalSettings.readmeAuto) {
						applySize(globalSettings.readmeWidth, globalSettings.readmeHeight, `${globalSettings.readmeWidth}x${globalSettings.readmeHeight}`);
					}
				}
			}
		};
		reader.readAsText(file);
	} else if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
		setControlsEnabled(false);
		const img = document.createElement('img'); img.src = fileURL; contentLayer.appendChild(img);
	} else if (fileName.match(/\.(pptx|ppt|xlsx|xls|docx|doc)$/)) {
		setControlsEnabled(false);
		const extMatch = file.name.match(/\.[^.]+$/); const fileExt = extMatch ? extMatch[0] : "";
		contentLayer.innerHTML = `<div style="text-align: center; color: #888; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;"><i data-lucide="alert-circle" style="width:56px;height:56px; margin-bottom:12px; color:#e74c3c;"></i><p style="font-weight: bold; font-size: 18px; margin: 0; color: #555;">Officeファイルはプレビューできません</p><p style="font-size: 14px; margin-top: 8px; color: #666; line-height: 1.6;">左メニューの「指示コメ」を参照ください</strong></p><p style="font-size: 12px; margin-top: 15px; word-break: break-all; background: #f0f0f0; padding: 5px 10px; border-radius: 4px;">ファイル形式：${fileExt}</p></div>`;
		lucide.createIcons({ root: contentLayer });
	} else {
		setControlsEnabled(false);
		const extMatch = file.name.match(/\.[^.]+$/); const fileExt = extMatch ? extMatch[0] : "不明";
		contentLayer.innerHTML = `<div style="text-align: center; color: #888; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;"><i data-lucide="alert-circle" style="width:56px;height:56px; margin-bottom:12px; color:#e74c3c;"></i><p style="font-weight: bold; font-size: 18px; margin: 0; color: #555;">このファイルはプレビューできません</p><p style="font-size: 14px; margin-top: 8px; color: #666; line-height: 1.6;">左メニューの「指示コメ」を参照ください</p><p style="font-size: 12px; margin-top: 15px; word-break: break-all; background: #f0f0f0; padding: 5px 10px; border-radius: 4px;">ファイル形式：${fileExt}</p></div>`;
		lucide.createIcons({ root: contentLayer });
	}
}

// ★ 「すべて閉じる（開く）」のトグルイベントを追加
let allGroupsCollapsed = false;
document.addEventListener('click', (e) => {
	if (e.target && e.target.id === 'toggle-all-groups-btn') {
		allGroupsCollapsed = !allGroupsCollapsed;
		const groups = document.querySelectorAll('.group-container');

		groups.forEach(container => {
			const toggleBtn = container.querySelector('.group-toggle-btn');
			if (allGroupsCollapsed) {
				container.classList.add('collapsed-group');
				if (toggleBtn) toggleBtn.innerHTML = '<i data-lucide="chevron-down"></i>';
			} else {
				container.classList.remove('collapsed-group');
				if (toggleBtn) toggleBtn.innerHTML = '<i data-lucide="chevron-up"></i>';
			}
		});
		lucide.createIcons();
		e.target.textContent = allGroupsCollapsed ? 'すべて開く' : 'すべて閉じる';
	}
});

// コントローラーの有効化 / 無効化（グレーアウト）を制御する関数
function setControlsEnabled(enabled) {
	// メディア操作関連がまとまっているコンテナだけを取得
	const volumeContainer = document.querySelector('.volume-container');

	if (!volumeContainer) return;

	if (enabled) {
		// 動画・音声・YouTubeの場合は操作可能に
		volumeContainer.classList.remove('control-disabled');
	} else {
		// それ以外（画像、テキスト、PDF、ドライブ動画等）はメディア操作部分のみグレーアウト
		volumeContainer.classList.add('control-disabled');
	}
}

lucide.createIcons();