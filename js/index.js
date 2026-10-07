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

// --- LocalStorageによる設定の保存と復元 ---
function saveSettings() {
	let settings = {};
	try {
		const saved = localStorage.getItem('kokekokkoAppSettings');
		if (saved) settings = JSON.parse(saved);
	} catch (e) { }

	if (document.getElementById('setting-readme-font-size')) settings.readmeFontSize = document.getElementById('setting-readme-font-size').value;
	if (document.getElementById('setting-readme-bg')) settings.readmeBg = document.getElementById('setting-readme-bg').value;
	if (document.getElementById('setting-readme-font')) settings.readmeFont = document.getElementById('setting-readme-font').value;
	if (document.getElementById('setting-mosaic-below')) settings.mosaicBelow = document.getElementById('setting-mosaic-below').checked;

	localStorage.setItem('kokekokkoAppSettings', JSON.stringify(settings));
}

function loadSettings() {
	const saved = localStorage.getItem('kokekokkoAppSettings');
	if (saved) {
		try {
			const settings = JSON.parse(saved);
			if (settings.readmeFontSize !== undefined && document.getElementById('setting-readme-font-size')) document.getElementById('setting-readme-font-size').value = settings.readmeFontSize;
			if (settings.readmeBg !== undefined && document.getElementById('setting-readme-bg')) document.getElementById('setting-readme-bg').value = settings.readmeBg;
			if (settings.readmeFont !== undefined && document.getElementById('setting-readme-font')) document.getElementById('setting-readme-font').value = settings.readmeFont;
			if (settings.mosaicBelow !== undefined && document.getElementById('setting-mosaic-below')) {
				document.getElementById('setting-mosaic-below').checked = settings.mosaicBelow;
			}
		} catch (e) {
			console.error("設定の復元に失敗しました", e);
		}
	}
}

// --- 画面切り替え制御 ---
const navCsvBtn = document.getElementById('nav-csv-btn');
const navPreviewBtn = document.getElementById('nav-preview-btn');
const navSetlistBtn = document.getElementById('nav-setlist-btn');
const frameCsv = document.getElementById('frame-csv');
const framePreview = document.getElementById('frame-preview');
const frameSetlist = document.getElementById('frame-setlist');

navCsvBtn.addEventListener('click', () => {
	navCsvBtn.classList.add('active');
	navPreviewBtn.classList.remove('active');
	navSetlistBtn.classList.remove('active');
	frameCsv.style.display = 'block';
	framePreview.style.display = 'none';
	frameSetlist.style.display = 'none';
});

navPreviewBtn.addEventListener('click', () => {
	navPreviewBtn.classList.add('active');
	navCsvBtn.classList.remove('active');
	navSetlistBtn.classList.remove('active');
	frameCsv.style.display = 'none';
	framePreview.style.display = 'block';
	frameSetlist.style.display = 'none';
});

navSetlistBtn.addEventListener('click', () => {
	navSetlistBtn.classList.add('active');
	navCsvBtn.classList.remove('active');
	navPreviewBtn.classList.remove('active');
	frameCsv.style.display = 'none';
	framePreview.style.display = 'none';
	frameSetlist.style.display = 'block';

	if (frameSetlist.contentWindow) {
		frameSetlist.contentWindow.postMessage('tabOpened', '*');
	}
});

// --- 初期設定モーダル制御 ---
const globalSettingsBtn = document.getElementById('global-settings-btn');
const globalSettingsModalOverlay = document.getElementById('global-settings-modal-overlay');
const globalCloseSettingsBtn = document.getElementById('global-close-settings-btn');

globalSettingsBtn.addEventListener('click', () => {
	globalSettingsModalOverlay.classList.add('show');
	const previewTabContent = document.getElementById('help-preview');
	if (previewTabContent) previewTabContent.classList.add('active');
});

globalCloseSettingsBtn.addEventListener('click', () => { globalSettingsModalOverlay.classList.remove('show'); });
globalSettingsModalOverlay.addEventListener('click', (e) => { if (e.target === globalSettingsModalOverlay) globalSettingsModalOverlay.classList.remove('show'); });


// --- プレビュー設定の連携 (iframe への送信) ---
const readmeFontSizeInput = document.getElementById('setting-readme-font-size');
const readmeBgInput = document.getElementById('setting-readme-bg');
const readmeFontSelect = document.getElementById('setting-readme-font');
const resetReadmeBtn = document.getElementById('reset-readme-btn');

function sendSettingsToPreviewFrame() {
	if (framePreview && framePreview.contentWindow) {
		framePreview.contentWindow.postMessage({
			type: 'updatePreviewSettings',
			settings: {
				readmeFontSize: readmeFontSizeInput ? (parseInt(readmeFontSizeInput.value) || 20) : 20,
				readmeBgColor: readmeBgInput ? readmeBgInput.value : '#fdfbf7',
				readmeFontFamily: readmeFontSelect ? readmeFontSelect.value : "'Sawarabi Gothic', sans-serif",
				mosaicBelow: document.getElementById('setting-mosaic-below') ? document.getElementById('setting-mosaic-below').checked : false
			}
		}, '*');
	}
}

if (readmeFontSizeInput) readmeFontSizeInput.addEventListener('input', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (readmeBgInput) readmeBgInput.addEventListener('input', () => { saveSettings(); sendSettingsToPreviewFrame(); });
if (readmeFontSelect) readmeFontSelect.addEventListener('change', () => { saveSettings(); sendSettingsToPreviewFrame(); });

if (resetReadmeBtn) {
	resetReadmeBtn.addEventListener('click', () => {
		if (readmeFontSizeInput) readmeFontSizeInput.value = 20;
		if (readmeBgInput) readmeBgInput.value = '#fdfbf7';
		if (readmeFontSelect) readmeFontSelect.value = "'Sawarabi Gothic', sans-serif";
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}

framePreview.addEventListener('load', sendSettingsToPreviewFrame);

document.addEventListener('DOMContentLoaded', () => {
	loadSettings();
	sendSettingsToPreviewFrame();
});

const mosaicBelowCheck = document.getElementById('setting-mosaic-below');
if (mosaicBelowCheck) {
	mosaicBelowCheck.addEventListener('change', () => {
		saveSettings();
		sendSettingsToPreviewFrame();
	});
}

lucide.createIcons();