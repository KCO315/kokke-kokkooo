// --- 背景色から文字色(白/黒)を判定する関数 ---
function getTextColorForBackground(hexColor) {
	let hex = hexColor.replace('#', '');
	if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
	const r = parseInt(hex.substr(0, 2), 16);
	const g = parseInt(hex.substr(2, 2), 16);
	const b = parseInt(hex.substr(4, 2), 16);
	// 輝度（YIQ）を計算して文字色を判定
	const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
	return (yiq >= 128) ? '#333333' : '#ffffff';
}

// --- モーダル内のミニプレビューとアスペクト比定規を更新する関数 ---
function updateMiniPreview() {
	const previewBox = document.getElementById('readme-mini-preview');
	const previewContainer = document.getElementById('readme-mini-preview-container');
	const rulerWidth = document.getElementById('preview-ruler-width');
	const rulerHeight = document.getElementById('preview-ruler-height');

	if (!previewBox) return;

	const bgColor = document.getElementById('setting-readme-bg').value;
	const fontFamily = document.getElementById('setting-readme-font').value;
	const fontSize = parseFloat(document.getElementById('setting-readme-font-size').value) || 20;
	const headingStyle = document.getElementById('setting-readme-heading').value;

	const widthInput = document.getElementById('setting-readme-width');
	const heightInput = document.getElementById('setting-readme-height');
	const presetSelect = document.getElementById('setting-readme-preset');

	const width = parseFloat(widthInput.value) || 1024;
	const height = parseFloat(heightInput.value) || 768;
	const isAuto = document.getElementById('setting-readme-auto').checked;

	let headingText = "【見出し】";
	if (headingStyle === "hash") headingText = "# 見出し";
	else if (headingStyle === "line") headingText = "―― 見出し ――";
	else if (headingStyle === "none") headingText = "見出し";

	previewBox.innerText = `${headingText}\nこれはREDME.txt（前置きテキスト）の表示プレビューです。\nプレビューサイズの変更や、フォント、背景色の反映状態を確認できます。`;

	previewBox.style.backgroundColor = bgColor;
	previewBox.style.color = getTextColorForBackground(bgColor);
	previewBox.style.fontFamily = fontFamily;

	if (previewContainer) {
		const containerWidth = 400; // HTML側で指定した最大幅
		let scale = 1;

		if (isAuto) {
			previewContainer.style.aspectRatio = `${width} / ${height}`;
			if (rulerWidth) rulerWidth.innerText = `${width}px`;
			if (rulerHeight) rulerHeight.innerText = `${height}px`;
			scale = containerWidth / width;
		} else {
			// AutoがOFFのとき、data-preview.html の input-width と input-height の値を取得する
			let currentPreviewW = 1280;
			let currentPreviewH = 720;
			const framePreview = document.getElementById('frame-preview');
			if (framePreview && framePreview.contentWindow) {
				try {
					const inputW = framePreview.contentWindow.document.getElementById('input-width');
					const inputH = framePreview.contentWindow.document.getElementById('input-height');
					if (inputW && inputH) {
						currentPreviewW = parseInt(inputW.value) || 1280;
						currentPreviewH = parseInt(inputH.value) || 720;
					}
				} catch (e) {
					console.error("プレビューサイズの取得に失敗しました", e);
				}
			}

			previewContainer.style.aspectRatio = `${currentPreviewW} / ${currentPreviewH}`;
			if (rulerWidth) rulerWidth.innerText = `${currentPreviewW}px`;
			if (rulerHeight) rulerHeight.innerText = `${currentPreviewH}px`;
			scale = containerWidth / currentPreviewW;
		}

		if (presetSelect) {
			const presetValue = `${widthInput.value}x${heightInput.value}`;
			const matchingOption = Array.from(presetSelect.options).find(opt => opt.value === presetValue);
			presetSelect.value = matchingOption ? presetValue : "";
		}

		const scaledFontSize = fontSize * scale;
		const scaledPadding = 40 * scale;

		previewBox.style.fontSize = scaledFontSize + 'px';
		previewBox.style.padding = scaledPadding + 'px';
	}
}


// --- LocalStorageによる設定の保存と復元 ---
function saveSettings() {
	const settings = {
		folderNumber: document.getElementById('setting-folder-number').checked,
		readmeHeading: document.getElementById('setting-readme-heading').value,
		readmeAuto: document.getElementById('setting-readme-auto').checked,
		readmeWidth: document.getElementById('setting-readme-width').value,
		readmeHeight: document.getElementById('setting-readme-height').value,
		readmeFontSize: document.getElementById('setting-readme-font-size').value,
		readmeBg: document.getElementById('setting-readme-bg').value,
		readmeFont: document.getElementById('setting-readme-font').value,
		alarmTime: document.getElementById('setting-alarm-time').value,
		alarmVol: document.getElementById('setting-alarm-vol').value,
		alarmSound: document.getElementById('setting-alarm-sound') ? document.getElementById('setting-alarm-sound').value : 'se/call_niwatori.mp3'
	};
	localStorage.setItem('kokekokkoAppSettings', JSON.stringify(settings));
}

function loadSettings() {
	const saved = localStorage.getItem('kokekokkoAppSettings');
	if (saved) {
		try {
			const settings = JSON.parse(saved);
			if (settings.folderNumber !== undefined && document.getElementById('setting-folder-number')) document.getElementById('setting-folder-number').checked = settings.folderNumber;
			if (settings.readmeHeading !== undefined && document.getElementById('setting-readme-heading')) document.getElementById('setting-readme-heading').value = settings.readmeHeading;
			if (settings.readmeAuto !== undefined && document.getElementById('setting-readme-auto')) document.getElementById('setting-readme-auto').checked = settings.readmeAuto;
			if (settings.readmeWidth !== undefined && document.getElementById('setting-readme-width')) document.getElementById('setting-readme-width').value = settings.readmeWidth;
			if (settings.readmeHeight !== undefined && document.getElementById('setting-readme-height')) document.getElementById('setting-readme-height').value = settings.readmeHeight;
			if (settings.readmeFontSize !== undefined && document.getElementById('setting-readme-font-size')) document.getElementById('setting-readme-font-size').value = settings.readmeFontSize;
			if (settings.readmeBg !== undefined && document.getElementById('setting-readme-bg')) document.getElementById('setting-readme-bg').value = settings.readmeBg;
			if (settings.readmeFont !== undefined && document.getElementById('setting-readme-font')) document.getElementById('setting-readme-font').value = settings.readmeFont;
			if (settings.alarmTime !== undefined && document.getElementById('setting-alarm-time')) document.getElementById('setting-alarm-time').value = settings.alarmTime;
			if (settings.alarmVol !== undefined && document.getElementById('setting-alarm-vol')) {
				document.getElementById('setting-alarm-vol').value = settings.alarmVol;
				document.getElementById('alarm-vol-display').innerText = Math.round(settings.alarmVol * 100) + '%';
			}
			if (settings.alarmSound !== undefined && document.getElementById('setting-alarm-sound')) {
				document.getElementById('setting-alarm-sound').value = settings.alarmSound;
			}
		} catch (e) {
			console.error("設定の復元に失敗しました", e);
		}
	}
}

// --- 画面切り替え制御 ---
const navCsvBtn = document.getElementById('nav-csv-btn');
const navPreviewBtn = document.getElementById('nav-preview-btn');
const frameCsv = document.getElementById('frame-csv');
const framePreview = document.getElementById('frame-preview');

navCsvBtn.addEventListener('click', () => {
	navCsvBtn.classList.add('active');
	navPreviewBtn.classList.remove('active');
	frameCsv.style.display = 'block';
	framePreview.style.display = 'none';
});

navPreviewBtn.addEventListener('click', () => {
	navPreviewBtn.classList.add('active');
	navCsvBtn.classList.remove('active');
	frameCsv.style.display = 'none';
	framePreview.style.display = 'block';
});

// --- モーダル制御 ---
const helpTabBtns = document.querySelectorAll('.help-tab-btn');
const helpTabContents = document.querySelectorAll('.help-tab-content');

helpTabBtns.forEach(btn => {
	btn.addEventListener('click', () => {
		helpTabBtns.forEach(b => b.classList.remove('active'));
		btn.classList.add('active');
		const targetId = btn.getAttribute('data-tab');
		helpTabContents.forEach(content => {
			if (content.id === targetId) content.classList.add('active');
			else content.classList.remove('active');
		});
	});
});

// --- 初期設定モーダル制御 ---
const globalSettingsBtn = document.getElementById('global-settings-btn');
const globalSettingsModalOverlay = document.getElementById('global-settings-modal-overlay');
const globalCloseSettingsBtn = document.getElementById('global-close-settings-btn');

globalSettingsBtn.addEventListener('click', () => {
	globalSettingsModalOverlay.classList.add('show');

	// モーダルを開くたびに最新の表示サイズを反映させる
	updateMiniPreview();

	const isCsvVisible = frameCsv.style.display !== 'none';

	helpTabBtns.forEach(b => b.classList.remove('active'));
	helpTabContents.forEach(c => c.classList.remove('active'));

	if (isCsvVisible) {
		const csvTabBtn = document.querySelector('.help-tab-btn[data-tab="help-csv"]');
		const csvTabContent = document.getElementById('help-csv');
		if (csvTabBtn) csvTabBtn.classList.add('active');
		if (csvTabContent) csvTabContent.classList.add('active');
	} else {
		const previewTabBtn = document.querySelector('.help-tab-btn[data-tab="help-preview"]');
		const previewTabContent = document.getElementById('help-preview');
		if (previewTabBtn) previewTabBtn.classList.add('active');
		if (previewTabContent) previewTabContent.classList.add('active');
	}
});
globalCloseSettingsBtn.addEventListener('click', () => { globalSettingsModalOverlay.classList.remove('show'); });
globalSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === globalSettingsModalOverlay) globalSettingsModalOverlay.classList.remove('show'); });


// --- 設定の連携 (iframe への送信) ---
const folderNumCheck = document.getElementById('setting-folder-number');
const readmeHeadingSelect = document.getElementById('setting-readme-heading');

function sendSettingsToCsvFrame() {
	if (frameCsv && frameCsv.contentWindow) {
		frameCsv.contentWindow.postMessage({
			type: 'updateCsvSettings',
			settings: {
				useFolderNumber: folderNumCheck ? folderNumCheck.checked : true,
				readmeHeadingStyle: readmeHeadingSelect ? readmeHeadingSelect.value : 'hash'
			}
		}, '*');
	}
}

if (folderNumCheck) folderNumCheck.addEventListener('change', () => { saveSettings(); sendSettingsToCsvFrame(); });
if (readmeHeadingSelect) readmeHeadingSelect.addEventListener('change', () => { saveSettings(); updateMiniPreview(); sendSettingsToCsvFrame(); });

frameCsv.addEventListener('load', sendSettingsToCsvFrame);

// --- プレビュー設定の連携 (iframe への送信) ---
const readmeAutoCheck = document.getElementById('setting-readme-auto');
const readmeWidthInput = document.getElementById('setting-readme-width');
const readmeHeightInput = document.getElementById('setting-readme-height');
const readmePresetSelect = document.getElementById('setting-readme-preset');
const readmeFontSizeInput = document.getElementById('setting-readme-font-size');
const readmeBgInput = document.getElementById('setting-readme-bg');
const readmeFontSelect = document.getElementById('setting-readme-font');
const resetReadmeBtn = document.getElementById('reset-readme-btn');

const alarmTimeInput = document.getElementById('setting-alarm-time');
const alarmVolInput = document.getElementById('setting-alarm-vol');
const alarmVolDisplay = document.getElementById('alarm-vol-display');
const testAlarmBtn = document.getElementById('test-alarm-btn');
const alarmSoundSelect = document.getElementById('setting-alarm-sound');

function sendSettingsToPreviewFrame() {
	if (framePreview && framePreview.contentWindow) {
		framePreview.contentWindow.postMessage({
			type: 'updatePreviewSettings',
			settings: {
				readmeAuto: readmeAutoCheck ? readmeAutoCheck.checked : true,
				readmeWidth: readmeWidthInput ? (parseInt(readmeWidthInput.value) || 1024) : 1024,
				readmeHeight: readmeHeightInput ? (parseInt(readmeHeightInput.value) || 768) : 768,
				readmeFontSize: readmeFontSizeInput ? (parseInt(readmeFontSizeInput.value) || 20) : 20,
				readmeBgColor: readmeBgInput ? readmeBgInput.value : '#fdfbf7',
				readmeFontFamily: readmeFontSelect ? readmeFontSelect.value : "'Sawarabi Gothic', sans-serif",
				alarmTime: alarmTimeInput ? (parseInt(alarmTimeInput.value) || 0) : 0,
				alarmVol: alarmVolInput ? (parseFloat(alarmVolInput.value) || 0.5) : 0.5,
				alarmSound: alarmSoundSelect ? alarmSoundSelect.value : 'se/call_niwatori.mp3'
			}
		}, '*');
	}
}

function updateReadmeSizeInputsState() {
	if (readmeAutoCheck && readmeWidthInput && readmeHeightInput) {
		const isAuto = readmeAutoCheck.checked;
		readmeWidthInput.disabled = !isAuto;
		readmeHeightInput.disabled = !isAuto;
		if (readmePresetSelect) readmePresetSelect.disabled = !isAuto;

		const sizeRow = document.getElementById('row-readme-size');
		if (sizeRow) {
			sizeRow.style.opacity = isAuto ? '1' : '0.5';
			sizeRow.style.pointerEvents = isAuto ? 'auto' : 'none';
		}
	}
}

if (readmeAutoCheck) {
	readmeAutoCheck.addEventListener('change', () => {
		updateReadmeSizeInputsState();
		saveSettings();
		updateMiniPreview();
		sendSettingsToPreviewFrame();
	});
}

if (readmePresetSelect) {
	readmePresetSelect.addEventListener('change', (e) => {
		if (!e.target.value) return;
		const [w, h] = e.target.value.split('x');
		if (readmeWidthInput) readmeWidthInput.value = w;
		if (readmeHeightInput) readmeHeightInput.value = h;
		saveSettings();
		updateMiniPreview();
		sendSettingsToPreviewFrame();
	});
}

if (readmeWidthInput) readmeWidthInput.addEventListener('input', () => { saveSettings(); updateMiniPreview(); sendSettingsToPreviewFrame(); });
if (readmeHeightInput) readmeHeightInput.addEventListener('input', () => { saveSettings(); updateMiniPreview(); sendSettingsToPreviewFrame(); });

if (readmeFontSizeInput) readmeFontSizeInput.addEventListener('input', () => { saveSettings(); updateMiniPreview(); sendSettingsToPreviewFrame(); });
if (readmeBgInput) readmeBgInput.addEventListener('input', () => { saveSettings(); updateMiniPreview(); sendSettingsToPreviewFrame(); });
if (readmeFontSelect) readmeFontSelect.addEventListener('change', () => { saveSettings(); updateMiniPreview(); sendSettingsToPreviewFrame(); });

if (alarmTimeInput) alarmTimeInput.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (alarmVolInput) {
	alarmVolInput.addEventListener('input', () => {
		alarmVolDisplay.innerText = Math.round(alarmVolInput.value * 100) + '%';
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}
if (alarmSoundSelect) {
	alarmSoundSelect.addEventListener('change', () => {
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}

// --- MP3によるアラーム再生処理 ---
let alarmAudio = new Audio('se/call_niwatori.mp3');

function playRoosterVoice() {
	let masterVol = parseFloat(alarmVolInput.value) || 0.5;
	if (masterVol <= 0) return;

	let soundSrc = alarmSoundSelect ? alarmSoundSelect.value : 'se/call_niwatori.mp3';
	alarmAudio.src = soundSrc;

	alarmAudio.currentTime = 0;
	alarmAudio.volume = masterVol;

	alarmAudio.play().catch(e => {
		console.error("音声の再生に失敗しました:", e);
	});
}

if (testAlarmBtn) {
	testAlarmBtn.addEventListener('click', () => {
		playRoosterVoice();
	});
}

if (resetReadmeBtn) {
	resetReadmeBtn.addEventListener('click', () => {
		if (readmeAutoCheck) readmeAutoCheck.checked = true;
		if (readmeWidthInput) readmeWidthInput.value = 1024;
		if (readmeHeightInput) readmeHeightInput.value = 768;
		if (readmePresetSelect) readmePresetSelect.value = "1024x768";
		if (readmeFontSizeInput) readmeFontSizeInput.value = 20;
		if (readmeBgInput) readmeBgInput.value = '#fdfbf7';
		if (readmeFontSelect) readmeFontSelect.value = "'Sawarabi Gothic', sans-serif";
		updateReadmeSizeInputsState();
		updateMiniPreview();
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}

framePreview.addEventListener('load', sendSettingsToPreviewFrame);

document.addEventListener('DOMContentLoaded', () => {
	loadSettings();
	updateReadmeSizeInputsState();
	updateMiniPreview();
});

lucide.createIcons();