// --- CSV・フォルダ生成ロジック ---
const csvState = {
	csvData: [], headers: [], hiddenColumns: new Set(), filenameColumns: [],
	filenameOrder: [], currentIndex: 0, generatedFiles: [], deleteLogs: [],
	tags: [], categoryHistory: new Set(), deletedUrls: {},
	editedFiles: {}, // プレビューで手動編集された内容を保持するオブジェクト
	addedFiles: {},  // ドラッグ＆ドロップで追加されたファイルを保持するオブジェクト
	settings: {
		useFolderNumber: true,
		useUrlDomain: true,
		readmeHeadingStyle: 'bracket'
	}
};

// 親フレーム(index.html)からの設定受信
window.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'updateCsvSettings') {
		csvState.settings = event.data.settings;
		// 設定が変わったらプレビューを更新
		updateCsvPreview();
	}
});

const csvFileInput = document.getElementById('csv-file');

const csvRowSelect = document.getElementById('csv-row-select');
const csvPrevBtn = document.getElementById('csv-prev-btn');
const csvNextBtn = document.getElementById('csv-next-btn');
const csvTagInput = document.getElementById('csv-tag-input');
const csvColumnCheckboxes = document.getElementById('csv-column-checkboxes');
const csvFilenameCheckboxes = document.getElementById('csv-filename-checkboxes');
const csvPreviewContent = document.getElementById('csv-preview-content');
const csvPreviewFolderName = document.getElementById('csv-preview-folder-name');
const csvTreeContainer = document.getElementById('csv-tree-container');
const csvDownloadBtn = document.getElementById('csv-download-btn');
const csvControls = document.getElementById('csv-controls');
const csvDownloadArea = document.getElementById('csv-download-area');
const csvAccordionBtn = document.getElementById('csv-filename-accordion-btn');
const csvAccordionContent = document.getElementById('csv-filename-accordion-content');
const csvAccordionIcon = document.getElementById('csv-filename-accordion-icon');

// URL表記方法のセレクトボックス
const csvUrlFormatSelect = document.getElementById('csv-url-format');
if (csvUrlFormatSelect) {
	csvUrlFormatSelect.addEventListener('change', () => {
		updateCsvPreview();
	});
}

csvAccordionBtn.addEventListener('click', () => {
	csvAccordionContent.classList.toggle('hidden');
	if (csvAccordionContent.classList.contains('hidden')) csvAccordionIcon.style.transform = 'rotate(0deg)';
	else csvAccordionIcon.style.transform = 'rotate(180deg)';
});

// --- 修正：CSV読み込み処理の共通関数化 ---
function loadCsvFile(file) {
	if (!file) return;
	Papa.parse(file, {
		header: true, skipEmptyLines: true,
		complete: (results) => {
			csvState.csvData = results.data;
			csvState.headers = results.meta.fields || [];
			csvState.filenameOrder = [...csvState.headers];
			csvState.hiddenColumns.clear();
			csvState.deleteLogs = [];
			csvState.tags = new Array(results.data.length).fill("");
			csvState.deletedUrls = {};
			csvState.editedFiles = {}; // リセット（前回追加分）
			csvState.addedFiles = {};  // リセット（前回追加分）
			csvState.categoryHistory.clear();

			csvState.headers.forEach(h => {
				if (
					h.includes('タイムスタンプ') ||
					h.includes('【連絡先】') ||
					h.includes('連絡先') ||
					h.includes('送信確認用の名前') ||
					h.includes('質問など')
				) {
					csvState.hiddenColumns.add(h);
				}
			});
			const titleCol = csvState.headers.find(h => h.includes('タイトル'));
			if (titleCol) csvState.filenameColumns = [titleCol];
			else if (csvState.headers.length > 0) csvState.filenameColumns = [csvState.headers[0]];
			else csvState.filenameColumns = [];
			csvState.currentIndex = 0;

			if (csvState.csvData.length > 0) {
				csvControls.classList.remove('hidden');
				csvDownloadArea.classList.remove('hidden');
				const hint = document.getElementById('csv-empty-hint');
				if (hint) hint.style.display = 'none';

				renderCsvCheckboxes();
				updateCategoryHistory();
				updateCsvRowSelect();
				updateCsvPreview();
			}
		}
	});
}

// クリックによるファイル選択時の処理
csvFileInput.addEventListener('change', (e) => {
	loadCsvFile(e.target.files[0]);
});

// 追加：ドラッグ＆ドロップによるCSV読み込み処理
const csvUploadDropzone = document.getElementById('csv-upload-dropzone');
if (csvUploadDropzone) {
	csvUploadDropzone.addEventListener('dragover', (e) => {
		e.preventDefault();
		csvUploadDropzone.classList.add('drag-over');
	});
	csvUploadDropzone.addEventListener('dragleave', () => {
		csvUploadDropzone.classList.remove('drag-over');
	});
	csvUploadDropzone.addEventListener('drop', (e) => {
		e.preventDefault();
		csvUploadDropzone.classList.remove('drag-over');
		const file = e.dataTransfer.files[0];
		if (file && file.name.toLowerCase().endsWith('.csv')) {
			loadCsvFile(file);
		} else {
			alert('CSVファイルを選択してください。');
		}
	});
}

csvPrevBtn.addEventListener('click', () => {
	if (csvState.currentIndex > 0) { csvState.currentIndex--; csvRowSelect.value = csvState.currentIndex; updateCsvPreview(); }
});
csvNextBtn.addEventListener('click', () => {
	if (csvState.currentIndex < csvState.csvData.length - 1) { csvState.currentIndex++; csvRowSelect.value = csvState.currentIndex; updateCsvPreview(); }
});

// カテゴリ設定の更新と履歴整理
function updateCategoryHistory() {
	const activeTags = csvState.tags.filter(t => t && t.trim() !== "");
	csvState.categoryHistory = new Set(activeTags);
	renderCategoryHistory();
}

// カテゴリ設定（入力）イベント
csvTagInput.addEventListener('change', (e) => {
	const val = e.target.value.trim();
	csvState.tags[csvState.currentIndex] = val;
	updateCategoryHistory();
	updateCsvRowSelect();
	updateCsvPreview();
});

// カテゴリ履歴の描画
function renderCategoryHistory() {
	const container = document.getElementById('category-history-container');
	container.innerHTML = '';
	csvState.categoryHistory.forEach(cat => {
		const span = document.createElement('span');
		span.textContent = cat;
		span.style.cssText = "font-size: 11px; padding: 4px 10px; background-color: #e0f2ec; color: #007b5e; border-radius: 12px; cursor: pointer; border: 1px solid #b0d4c8; transition: all 0.2s;";
		span.onmouseover = () => { span.style.backgroundColor = '#A7E0CF'; };
		span.onmouseout = () => { span.style.backgroundColor = '#e0f2ec'; };
		span.addEventListener('click', () => {
			csvTagInput.value = cat;
			csvState.tags[csvState.currentIndex] = cat;
			updateCategoryHistory();
			updateCsvRowSelect();
			updateCsvPreview();
		});
		container.appendChild(span);
	});
}

function renderCsvCheckboxes() {
	csvColumnCheckboxes.innerHTML = csvState.headers.map(col => {
		const isHidden = csvState.hiddenColumns.has(col);
		const btnClass = isHidden ? 'csv-check-item-hidden' : 'csv-check-item-default';
		const icon = isHidden ? 'eye-off' : 'eye';
		const textStyle = isHidden ? 'text-decoration: line-through;' : '';
		return `
					<label class="csv-check-item ${btnClass}">
						<span style="${textStyle}">${col}</span>
						<i data-lucide="${icon}" style="width:16px; height:16px;"></i>
						<input type="checkbox" value="${col}" class="csv-hidden-cb hidden" ${isHidden ? 'checked' : ''}>
					</label>
				`;
	}).join('');

	csvFilenameCheckboxes.innerHTML = csvState.filenameOrder.map((col, index) => {
		const isChecked = csvState.filenameColumns.includes(col);
		const btnClass = isChecked ? 'csv-check-item-active' : 'csv-check-item-default';
		const icon = isChecked ? 'check-circle-2' : 'circle';
		return `
					<label draggable="true" data-index="${index}" class="csv-check-item csv-drag-item ${btnClass}">
						<div style="display:flex; align-items:center; gap:8px;">
							<i data-lucide="grip-vertical" style="width:14px; height:14px; color:#999;"></i>
							<span>${col}</span>
						</div>
						<i data-lucide="${icon}" style="width:16px; height:16px;"></i>
						<input type="checkbox" value="${col}" class="csv-filename-cb hidden" ${isChecked ? 'checked' : ''}>
					</label>
				`;
	}).join('');

	lucide.createIcons({ root: csvColumnCheckboxes });
	lucide.createIcons({ root: csvFilenameCheckboxes });
	attachCsvCheckboxEvents(); attachCsvDragAndDropEvents();
}

function attachCsvCheckboxEvents() {
	document.querySelectorAll('.csv-hidden-cb').forEach(cb => {
		cb.addEventListener('change', (e) => {
			if (e.target.checked) csvState.hiddenColumns.add(e.target.value);
			else csvState.hiddenColumns.delete(e.target.value);
			renderCsvCheckboxes(); updateCsvPreview();
		});
	});
	document.querySelectorAll('.csv-filename-cb').forEach(cb => {
		cb.addEventListener('change', (e) => {
			const val = e.target.value;
			if (e.target.checked) csvState.filenameColumns.push(val);
			else csvState.filenameColumns = csvState.filenameColumns.filter(c => c !== val);
			csvState.filenameColumns.sort((a, b) => csvState.filenameOrder.indexOf(a) - csvState.filenameOrder.indexOf(b));
			renderCsvCheckboxes(); updateCsvRowSelect(); updateCsvPreview();
		});
	});
}

function attachCsvDragAndDropEvents() {
	let dragStartIndex = null;
	const items = document.querySelectorAll('.csv-drag-item');
	items.forEach(item => {
		item.addEventListener('dragstart', (e) => {
			dragStartIndex = parseInt(item.getAttribute('data-index'));
			e.dataTransfer.effectAllowed = 'move';
			setTimeout(() => item.style.opacity = '0.5', 0);
		});
		item.addEventListener('dragend', () => { item.style.opacity = '1'; dragStartIndex = null; });
		item.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; });
		item.addEventListener('drop', (e) => {
			e.preventDefault(); const dropElement = e.target.closest('.csv-drag-item');
			if (!dropElement) return;
			const dragEndIndex = parseInt(dropElement.getAttribute('data-index'));
			if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
				const movedItem = csvState.filenameOrder.splice(dragStartIndex, 1)[0];
				csvState.filenameOrder.splice(dragEndIndex, 0, movedItem);
				csvState.filenameColumns.sort((a, b) => csvState.filenameOrder.indexOf(a) - csvState.filenameOrder.indexOf(b));
				renderCsvCheckboxes(); updateCsvRowSelect(); updateCsvPreview();
			}
		});
	});
}

function updateCsvRowSelect() {
	csvRowSelect.innerHTML = csvState.csvData.map((row, i) => {
		let title = generateCsvFolderName(row);
		if (title.length > 15) title = title.substring(0, 15) + '...';
		const tag = csvState.tags[i] || "";
		const folderPrefix = tag ? `【#${tag}】` : "";
		return `<option value="${i}">${folderPrefix}${String(i + 1).padStart(3, '0')} - ${title}</option>`;
	}).join('');
	csvRowSelect.value = csvState.currentIndex;
	csvRowSelect.onchange = (e) => { csvState.currentIndex = Number(e.target.value); updateCsvPreview(); };
}

function generateCsvFolderName(row) {
	const parts = csvState.filenameColumns.map(col => row[col]).filter(Boolean);
	return parts.length > 0 ? parts.join('-') : 'データ';
}

function processCsvTextAndExtractUrls(text, startIndex) {
	if (typeof text !== 'string') return { text, urls: [], nextIndex: startIndex };
	const urlRegex = /(https?:\/\/(?:(?![;；,，]\s*https?:\/\/)[^\s])+)/g;
	const urls = []; let currentCount = startIndex;

	// セレクトボックスからURL表記方法を取得（初期値は'number'）
	const urlFormat = csvUrlFormatSelect ? csvUrlFormatSelect.value : 'number';

	const replacedText = text.replace(urlRegex, (match) => {
		const cleanUrl = match.replace(/[;；,，]+$/, ''); const trailing = match.substring(cleanUrl.length);
		let domainStr = 'unknown';
		try { const urlObj = new URL(cleanUrl); domainStr = urlObj.hostname.replace(/\./g, '-'); } catch (e) { }

		let baseId = `URL-${String(currentCount).padStart(2, '0')}`;
		let fileId = baseId;
		let displayText = '';

		// READMEの表記とファイル名をセレクトボックスの内容に応じて切り替える
		if (urlFormat === 'domain') {
			fileId = `${baseId}__${domainStr}`;
			displayText = `[${fileId}]`;
		} else if (urlFormat === 'number') {
			fileId = baseId;
			displayText = `[${baseId}]`;
		} else if (urlFormat === 'none') {
			fileId = `${baseId}__${domainStr}`;
			displayText = cleanUrl; // URLを伏せ字にせずそのまま表示
		}

		urls.push({ id: fileId, url: cleanUrl, displayText: displayText }); currentCount++;
		return `${displayText}${trailing}`;
	});
	return { text: replacedText, urls, nextIndex: currentCount };
}

function formatCsvRowData(row) {
	let infoText = ""; let extractedUrls = []; let globalUrlCount = 1;
	let editedColData = null;
	const currentEditedText = csvState.editedFiles[csvState.currentIndex]?.['readme'];
	if (currentEditedText) {
		editedColData = {};
		const positions = [];
		csvState.headers.forEach(h => {
			let headingText = "";
			switch (csvState.settings.readmeHeadingStyle) {
				case 'bracket': headingText = `【${h}】`; break;
				case 'line': headingText = `―― ${h} ――`; break;
				case 'none': headingText = `${h}\n`; break;
				case 'hash': default: headingText = `# ${h}`; break;
			}
			const idx = currentEditedText.indexOf(headingText);
			if (idx !== -1) positions.push({ header: h, index: idx, headingText });
		});
		positions.sort((a, b) => a.index - b.index);

		for (let i = 0; i < positions.length; i++) {
			const start = positions[i].index + positions[i].headingText.length;
			const end = (i + 1 < positions.length) ? positions[i + 1].index : currentEditedText.length;
			// 前後の余分な改行をトリムして保存
			let val = currentEditedText.substring(start, end).replace(/^\s*\n/, '').replace(/\n\s*$/, '');
			editedColData[positions[i].header] = val;
		}
	}
	csvState.headers.forEach(header => {
		const { text, urls, nextIndex } = processCsvTextAndExtractUrls(row[header], globalUrlCount);
		extractedUrls = [...extractedUrls, ...urls]; globalUrlCount = nextIndex;
		if (!csvState.hiddenColumns.has(header)) {
			let headingText = "";
			switch (csvState.settings.readmeHeadingStyle) {
				case 'bracket': headingText = `【${header}】\n`; break;
				case 'line': headingText = `―― ${header} ――\n`; break;
				case 'none': headingText = `${header}\n`; break;
				case 'hash':
				default: headingText = `# ${header}\n`; break;
			}
			let contentText = text;
			if (editedColData && editedColData[header] !== undefined) {
				contentText = editedColData[header];
			}
			infoText += `${headingText}${contentText}\n\n`;
		}
	});
	return { infoText, extractedUrls };
}

function attachCsvTreeClickEvents(folderPath) {
	const treeItems = csvTreeContainer.querySelectorAll('.csv-tree-item');
	treeItems.forEach(item => {
		item.addEventListener('click', () => {
			treeItems.forEach(el => el.classList.remove('active')); item.classList.add('active');
			const fileIndex = parseInt(item.getAttribute('data-index'));
			const fileData = csvState.generatedFiles[fileIndex];
			updateCsvPreviewContent(fileData);
		});
	});
}

let currentFileId = null; // 現在表示中のファイルID（'readme' や 'URL-01' など）を保持

function updateCsvPreviewContent(fileData) {
	currentFileId = fileData.id;

	// 追加：データ表示時は pre-wrap を有効にする
	csvPreviewContent.classList.add('is-loaded');

	// 手動でドロップされた追加ファイルの場合
	if (fileData.isAdded) {
		csvPreviewContent.setAttribute('contenteditable', 'false'); // 追加ファイルは編集不可

		if (fileData.type.startsWith('image/')) {
			// 画像ファイルの場合はプレビュー表示
			const blob = new Blob([fileData.content], { type: fileData.type });
			const url = URL.createObjectURL(blob);
			csvPreviewContent.innerHTML = `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
		} else if (fileData.type.startsWith('text/')) {
			// テキストファイルの場合
			const decoder = new TextDecoder('utf-8');
			csvPreviewContent.textContent = decoder.decode(fileData.content);
		} else {
			// その他バイナリファイル等
			csvPreviewContent.textContent = `※配信モードで表示確認をしてください\nファイル名: ${fileData.name}`;
		}
		return;
	}

	// 既存ファイル（READMEやURL）の場合は編集可能にする
	csvPreviewContent.setAttribute('contenteditable', 'true');

	// 編集履歴があるかチェック
	const editedContent = csvState.editedFiles[csvState.currentIndex]?.[fileData.id];

	if (editedContent !== undefined) {
		// 編集履歴がある場合は、そのテキストを表示
		csvPreviewContent.innerText = editedContent;
	} else {
		// 編集履歴がない場合は初期表示
		if (fileData.isUrl) {
			csvPreviewContent.innerHTML = `<a href="${fileData.content}" target="_blank" rel="noopener noreferrer" style="color: #007b5e; text-decoration: underline; word-break: break-all;">${fileData.content}</a>`;
		} else {
			csvPreviewContent.textContent = fileData.content;
		}
	}
}

// プレビュー内容が直接編集されたら csvState に保存する
csvPreviewContent.addEventListener('input', () => {
	if (currentFileId !== null && csvPreviewContent.getAttribute('contenteditable') === 'true') {
		if (!csvState.editedFiles[csvState.currentIndex]) {
			csvState.editedFiles[csvState.currentIndex] = {};
		}
		// innerText を使うことで、画面上の改行をそのままZIPにも反映できるようにする
		csvState.editedFiles[csvState.currentIndex][currentFileId] = csvPreviewContent.innerText;
	}
});

// リセットボタンの処理
const csvResetBtn = document.getElementById('csv-reset-btn');
if (csvResetBtn) {
	csvResetBtn.addEventListener('click', () => {
		if (currentFileId !== null && csvState.editedFiles[csvState.currentIndex]) {
			// 編集履歴を削除して再描画（初期状態に戻す）
			delete csvState.editedFiles[csvState.currentIndex][currentFileId];
			const fileData = csvState.generatedFiles.find(f => f.id === currentFileId);
			if (fileData) {
				updateCsvPreviewContent(fileData);
			}
		}
	});
}

function updateCsvPreview() {
	if (csvState.csvData.length === 0) return;
	const row = csvState.csvData[csvState.currentIndex];
	const { infoText, extractedUrls } = formatCsvRowData(row);
	if (csvState.editedFiles[csvState.currentIndex] && csvState.editedFiles[csvState.currentIndex]['readme']) {
		csvState.editedFiles[csvState.currentIndex]['readme'] = infoText.trim();
	}
	const formattedRowNum = String(csvState.currentIndex + 1).padStart(3, '0');
	const folderTitle = generateCsvFolderName(row);
	const safeTitle = folderTitle.replace(/[\\/:*?"<>|]/g, '_');

	// カテゴリの反映
	const tag = csvState.tags[csvState.currentIndex] || "";
	const folderPrefix = tag ? `【#${tag}】` : "";
	const numberPrefix = csvState.settings.useFolderNumber ? `${formattedRowNum}-` : "";
	const folderPath = `${folderPrefix}${numberPrefix}${safeTitle}`;

	if (document.activeElement !== csvTagInput) {
		csvTagInput.value = tag;
	}

	// 削除されたURLの処理
	const deleted = csvState.deletedUrls[csvState.currentIndex] || [];
	let readmeContent = infoText.trim();
	extractedUrls.forEach(urlObj => {
		if (deleted.includes(urlObj.id)) {
			// displayText（表示されている文字列そのまま）を対象に検閲置換を行う
			readmeContent = readmeContent.split(urlObj.displayText).join('[—検閲済み—]');
		}
	});

	csvState.generatedFiles = [];
	csvState.generatedFiles.push({ id: 'readme', name: `README-${safeTitle}.txt`, content: readmeContent, isUrl: false });
	extractedUrls.forEach(urlObj => {
		if (!deleted.includes(urlObj.id)) {
			csvState.generatedFiles.push({ id: urlObj.id, name: `${urlObj.id}.txt`, content: urlObj.url, isUrl: true });
		}
	});

	// 手動追加されたファイルを generatedFiles にマージ
	const addedFiles = csvState.addedFiles[csvState.currentIndex] || [];
	addedFiles.forEach(file => {
		csvState.generatedFiles.push({
			id: file.id,
			name: file.name,
			content: file.data, // ArrayBufferデータ
			isUrl: false,
			isAdded: true,
			type: file.type
		});
	});

	updateCsvPreviewContent(csvState.generatedFiles[0]);
	csvPreviewFolderName.textContent = `${folderPath}`;

	let treeHtml = `
				<div style="font-weight:bold; color:#333; margin-bottom:8px; display:flex; align-items:flex-start; gap:6px;">
					<i data-lucide="folder" style="width:16px; height:16px; color:#007b5e; margin-top:2px;"></i>
					<span style="flex-grow:1; word-break:break-all; line-height:1.4;">${folderPath}</span>
					<button id="dynamic-csv-delete-btn" class="csv-folder-delete-btn" title="この回答を丸ごと削除">
						<i data-lucide="trash-2" style="width:16px; height:16px; color:#999; transition: color 0.2s;"></i>
					</button>
				</div>
				<div style="padding-left:12px;">`;

	const sharedDomains = ['gigafile.nu', 'gigafile.jp', 'datadeliver.net', 'dtbn.jp', 'firestorage.jp', 'xfs.jp', 'xgf.nu', 'tenpu.me', 'ac-data.info', 'okurin.bitpark.co.jp', 'delifile.link'];
	let hasSharedLink = false;

	csvState.generatedFiles.forEach((file, index) => {
		const activeClass = index === 0 ? 'active' : '';
		let iconColor = "";
		if (file.isUrl) {
			const isShared = sharedDomains.some(domain => file.content.includes(domain));
			if (isShared) {
				iconColor = 'color: #e74c3c;';
				hasSharedLink = true;
			}
		}

		let deleteFileBtn = '';
		if (file.isUrl) {
			deleteFileBtn = `
					<button class="csv-file-delete-btn" data-file-id="${file.id}" data-file-url="${file.content}" title="このファイルを削除">
						<i data-lucide="trash-2" style="width:14px; height:14px; color:#999; transition: color 0.2s;"></i>
					</button>`;
		} else if (file.isAdded) {
			// 追加ファイル用の削除ボタン
			deleteFileBtn = `
					<button class="csv-added-delete-btn" data-file-id="${file.id}" title="この追加ファイルを削除">
						<i data-lucide="trash-2" style="width:14px; height:14px; color:#999; transition: color 0.2s;"></i>
					</button>`;
		}

		treeHtml += `<div class="csv-tree-item ${activeClass}" data-index="${index}" style="width: 100%;">
								<i data-lucide="${file.isAdded && file.type.startsWith('image/') ? 'image' : 'file-text'}" style="width:14px; height:14px; ${iconColor}"></i>
								<span style="flex-grow:1; overflow:hidden; text-overflow:ellipsis;">${file.name}</span>
								${deleteFileBtn}
							</div>`;
	});
	treeHtml += `</div>`;

	if (hasSharedLink) {
		treeHtml += `<p style="font-size: 11px; color: #e74c3c; margin: 10px 0 0 0; line-height: 1.4;"><i data-lucide="alert-triangle" style="width:12px; height:12px; margin-right: 2px;"></i>ダウンロード用URLの可能性があります。以下の手順をお試しください。1.URLからファイルをダウンロードする 2.URL.txtファイルを削除する 3.ZIPファイルをダウンロードし解凍する 4.フォルダにダウンロードしたファイルを保存する 5.データプレビュー(配信用機能)で読み込む</p>`;
	}

	csvTreeContainer.innerHTML = treeHtml;
	lucide.createIcons({ root: csvTreeContainer });
	attachCsvTreeClickEvents(folderPath);

	// 回答ごとの削除ボタン（フォルダ横）
	const dynamicDeleteBtn = document.getElementById('dynamic-csv-delete-btn');
	if (dynamicDeleteBtn) {
		dynamicDeleteBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (csvState.csvData.length === 0) return;
			if (confirm('この回答を削除しますか？\n（元のCSVファイル自体は変更されません。削除した内容は、LOG.txtとしてZIPファイルに記録されます）')) {
				const row = csvState.csvData[csvState.currentIndex];
				const now = new Date();
				const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				const rowValues = Object.values(row).join(', ');

				csvState.deleteLogs.push(`[${timeStr}] フォルダ削除: ${folderPath}\n内容: ${rowValues}\n`);

				csvState.csvData.splice(csvState.currentIndex, 1);
				csvState.tags.splice(csvState.currentIndex, 1);

				// 削除されたURLインデックスのズレ修正
				const newDeletedUrls = {};
				for (const key in csvState.deletedUrls) {
					const k = parseInt(key);
					if (k < csvState.currentIndex) newDeletedUrls[k] = csvState.deletedUrls[k];
					else if (k > csvState.currentIndex) newDeletedUrls[k - 1] = csvState.deletedUrls[k];
				}
				csvState.deletedUrls = newDeletedUrls;

				// 手動編集された内容のインデックスのズレ修正
				const newEditedFiles = {};
				for (const key in csvState.editedFiles) {
					const k = parseInt(key);
					if (k < csvState.currentIndex) newEditedFiles[k] = csvState.editedFiles[k];
					else if (k > csvState.currentIndex) newEditedFiles[k - 1] = csvState.editedFiles[k];
				}
				csvState.editedFiles = newEditedFiles;

				// ドラッグ＆ドロップ追加ファイルのインデックスのズレ修正
				const newAddedFiles = {};
				for (const key in csvState.addedFiles) {
					const k = parseInt(key);
					if (k < csvState.currentIndex) newAddedFiles[k] = csvState.addedFiles[k];
					else if (k > csvState.currentIndex) newAddedFiles[k - 1] = csvState.addedFiles[k];
				}
				csvState.addedFiles = newAddedFiles;

				if (csvState.csvData.length === 0) {
					// 全て削除された場合は初期状態に戻す
					csvControls.classList.add('hidden');
					csvDownloadArea.classList.add('hidden');
					document.getElementById('csv-empty-hint').style.display = 'block';
					csvPreviewFolderName.textContent = '未選択';

					// 追加：初期状態に戻す時は pre-wrap を無効化する
					csvPreviewContent.classList.remove('is-loaded');

					// 修正：テキストだけでなく、リンク付きの初期HTMLを入れ直す
					csvPreviewContent.innerHTML = `左側のメニューからCSVファイルをアップロードしてください<br><a target="_blank" style="color:#007b5e; text-decoration:underline; word-break:break-all; font-size:0.8rem;" href="https://drive.google.com/file/d/1JoGCsHNYkgiG49YZDgzf6DhyTRbQ9clW/view?usp=sharing">サンプルCSVはこちら(ダウンロードOK)<i data-lucide="external-link" style="width:14px; height:14px; margin-left: 2px; vertical-align: middle;"></i></a>`;

					csvPreviewContent.setAttribute('contenteditable', 'false');
					csvTreeContainer.innerHTML = 'CSVアップロード後に表示されます';
					csvTagInput.value = "";
					csvState.categoryHistory.clear();
					renderCategoryHistory();
					lucide.createIcons({ root: csvPreviewContent }); // リンク横のアイコン再描画
				} else {
					if (csvState.currentIndex >= csvState.csvData.length) {
						csvState.currentIndex = csvState.csvData.length - 1;
					}
					updateCategoryHistory();
					updateCsvRowSelect();
					updateCsvPreview();
				}
			}
		});
	}

	// URLごとの個別削除ボタン
	document.querySelectorAll('.csv-file-delete-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (confirm('このURLファイルを削除しますか？\n（README内の該当箇所は [—検閲済み—] と表記されます。削除した内容は、LOG.txtとしてZIPファイルに記録されます。）')) {
				const fileId = e.currentTarget.getAttribute('data-file-id');
				const fileUrl = e.currentTarget.getAttribute('data-file-url');

				if (!csvState.deletedUrls[csvState.currentIndex]) {
					csvState.deletedUrls[csvState.currentIndex] = [];
				}
				csvState.deletedUrls[csvState.currentIndex].push(fileId);

				const now = new Date();
				const timeStr = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
				csvState.deleteLogs.push(`[${timeStr}] ファイル削除: ${fileUrl} (対象フォルダ: ${folderPath})\n`);

				updateCsvPreview();
			}
		});
	});

	// 追加ファイルの個別削除ボタン
	document.querySelectorAll('.csv-added-delete-btn').forEach(btn => {
		btn.addEventListener('click', (e) => {
			e.stopPropagation();
			if (confirm('追加したこのファイルを削除しますか？')) {
				const fileId = e.currentTarget.getAttribute('data-file-id');
				csvState.addedFiles[csvState.currentIndex] = csvState.addedFiles[csvState.currentIndex].filter(f => f.id !== fileId);
				updateCsvPreview();
			}
		});
	});
}

// --- csv-tree-container へのドラッグ＆ドロップによるファイル追加 ---
csvTreeContainer.addEventListener('dragover', (e) => {
	e.preventDefault();
	csvTreeContainer.classList.add('drag-over');
});

csvTreeContainer.addEventListener('dragleave', () => {
	csvTreeContainer.classList.remove('drag-over');
});

csvTreeContainer.addEventListener('drop', (e) => {
	e.preventDefault();
	csvTreeContainer.classList.remove('drag-over');

	if (csvState.csvData.length === 0) return;

	const files = e.dataTransfer.files;
	if (files.length > 0) {
		if (!csvState.addedFiles[csvState.currentIndex]) {
			csvState.addedFiles[csvState.currentIndex] = [];
		}

		Array.from(files).forEach(file => {
			const reader = new FileReader();
			// ファイルをバイナリデータ(ArrayBuffer)として読み込む
			reader.onload = (event) => {
				csvState.addedFiles[csvState.currentIndex].push({
					id: 'added-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
					name: file.name,
					type: file.type,
					data: event.target.result,
					isAdded: true
				});
				updateCsvPreview(); // 読み込み完了後にプレビューを更新
			};
			reader.readAsArrayBuffer(file);
		});
	}
});

// ZIPのダウンロード
csvDownloadBtn.addEventListener('click', async () => {
	if (csvState.csvData.length === 0) return;
	const zip = new JSZip();
	csvState.csvData.forEach((row, index) => {
		const { infoText, extractedUrls } = formatCsvRowData(row);
		const formattedRowNum = String(index + 1).padStart(3, '0');
		const folderTitle = generateCsvFolderName(row);
		const safeTitle = folderTitle.replace(/[\\/:*?"<>|]/g, '_');

		const tag = csvState.tags[index] || "";
		const folderPrefix = tag ? `【#${tag}】` : "";
		const numberPrefix = csvState.settings.useFolderNumber ? `${formattedRowNum}-` : "";
		const folderName = `${folderPrefix}${numberPrefix}${safeTitle}`;

		const folder = zip.folder(folderName);

		const deleted = csvState.deletedUrls[index] || [];
		const edited = csvState.editedFiles[index] || {}; // 編集履歴を取得

		let readmeContent = infoText.trim();
		extractedUrls.forEach(urlObj => {
			if (deleted.includes(urlObj.id)) {
				readmeContent = readmeContent.split(urlObj.displayText).join('[—検閲済み—]');
			}
		});

		// READMEの書き込み（編集されていれば編集内容を優先）
		let finalReadmeContent = edited['readme'] !== undefined ? edited['readme'] : readmeContent;
		folder.file(`README-${safeTitle}.txt`, finalReadmeContent);

		extractedUrls.forEach(urlObj => {
			if (!deleted.includes(urlObj.id)) {
				// URLファイルも書き込み（編集されていれば編集内容を優先）
				let finalUrlContent = edited[urlObj.id] !== undefined ? edited[urlObj.id] : urlObj.url;
				folder.file(`${urlObj.id}.txt`, finalUrlContent);
			}
		});

		// 手動追加されたファイルをZIPに書き込む
		const addedFiles = csvState.addedFiles[index] || [];
		addedFiles.forEach(file => {
			// file.data は ArrayBuffer なのでそのまま JSZip に渡せる
			folder.file(file.name, file.data);
		});
	});

	if (csvState.deleteLogs.length > 0) {
		zip.file("LOG.txt", "=== 削除ログ ===\n" + csvState.deleteLogs.join('\n'));
	}

	const now = new Date();
	const mm = String(now.getMonth() + 1).padStart(2, '0');
	const dd = String(now.getDate()).padStart(2, '0');
	const hh = String(now.getHours()).padStart(2, '0');
	const min = String(now.getMinutes()).padStart(2, '0');
	const ss = String(now.getSeconds()).padStart(2, '0');
	const zipFileName = `ｺｯｹｺｯｺｰ!!!_${mm}${dd}${hh}${min}${ss}.zip`;

	const content = await zip.generateAsync({ type: 'blob' });
	saveAs(content, zipFileName);
});

// --- 追加：「ファイル追加」ボタンからの追加処理 ---
const csvAddFileInput = document.getElementById('csv-add-file-input');
if (csvAddFileInput) {
	csvAddFileInput.addEventListener('change', (e) => {
		if (csvState.csvData.length === 0) return;

		const files = e.target.files;
		if (files.length > 0) {
			if (!csvState.addedFiles[csvState.currentIndex]) {
				csvState.addedFiles[csvState.currentIndex] = [];
			}

			Array.from(files).forEach(file => {
				const reader = new FileReader();
				reader.onload = (event) => {
					csvState.addedFiles[csvState.currentIndex].push({
						id: 'added-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
						name: file.name,
						type: file.type,
						data: event.target.result,
						isAdded: true
					});
					updateCsvPreview();
				};
				reader.readAsArrayBuffer(file);
			});
			// 選択状態をリセット（同じファイルを再度追加できるようにする）
			e.target.value = '';
		}
	});
}

lucide.createIcons();