// fcp_v2_assets/main.js

// 1. นำเข้าข้อมูลภาษาจากไฟล์ languages.js
import { translations } from './languages.js';
import { getLeagueOptions } from './league-config.js';
// 1. นำเข้าโมดูล (สำหรับ Firebase v9+)
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// --- DOM ELEMENTS ---
const $ = id => document.getElementById(id);
const elements = [
    "nameA", "nameB", "label1", "label2", "label3", "logoA", "logoB", "initialsA", "initialsB",
    "scoreA", "scoreB", "timerText", "halfText", "announcement-text", "matchID", 
    "colorA", "colorB", "colorA2", "colorB2",
    "countdownCheck", "languageSelector", "nameA-input", "nameB-input", "excelBtn", "loadBtn",
    "editBtnA", "okBtnA", "editBtnB", "okBtnB", "swapBtn", "scoreAPlusBtn", "scoreAMinusBtn",
    "scoreBPlusBtn", "scoreBMinusBtn", "resetScoreBtn", "halfBtn", "play1Btn", "play2Btn", "pauseBtn",
    "resetToStartBtn", "editTimeBtn", "settingsBtn", "copyBtn", "helpBtn", "donateBtn",
    "toast-container", "popupOverlay", "detailsPopup", "helpPopup", "donatePopup", "detailsText",
    "saveDetailsBtn", "closeDetailsBtn", "closeHelpBtn", "closeDonateBtn", "injuryTimeDisplay",
    "injuryTimePlusBtn", "injuryTimeMinusBtn", "resetToZeroBtn", "timeSettingsPopup",
    "startTimeMinutes", "startTimeSeconds", "saveTimeSettingsBtn", "saveAndUpdateTimeBtn", "closeTimeSettingsBtn",
    "timeSettingsError", "changelogBtn", "changelogPopup", "closeChangelogBtn",
    "logoPathBtn", "logoPathPopup", "currentLogoPath", "logoPathInput", "editLogoPathBtn", "closeLogoPathBtn",
    "halfpauseBtn", "fullEndBtn", "matchSaveButtons", "hidetimer",
    "controlPanelBtn", "controlPanelPopup", "closeControlPanelBtn", "quickLeague", "quickFirebaseDatabaseUrl", "quickOverlayView",
    "quickOverlayDate", "generatedOverlayUrl", "copyOverlayUrlBtn", "excelMappingBtn", "excelMappingPopup",
    "excelMappingStatus", "excelMappingFields", "saveExcelMappingBtn", "resetExcelMappingBtn", "closeExcelMappingBtn"
].reduce((acc, id) => {
    acc[id.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())] = $(id);
    return acc;
}, {});


// --- STATE VARIABLES ---
let sheetData = [];
let currentLogoA = '', currentLogoB = '';
let scoreA = 0, scoreB = 0;
let timer = 0, interval = null, half = '1st';
let injuryTime = 0;
let isCountdown = false;
let countdownStartTime = 2700; // 45 minutes default
let currentLang = 'th';
let logoFolderPath = 'C:/OBSAssets/logos';
let excelMapping = {};
let matchSaveTargets = [];

const EXCEL_MAPPING_KEY = 'scoreboardExcelMapping';
const EXCEL_FIELDS = [
    { key: 'matchId', label: 'Match ID', required: true, aliases: ['id', 'match', 'matchid', 'match id', 'no', 'no.', 'number', 'ลำดับ', 'ที่', 'แมตช์'] },
    { key: 'teamA', label: 'Team A', required: true, aliases: ['teama', 'team a', 'home', 'home team', 'team1', 'team 1', 'ทีมa', 'ทีม a', 'ทีมเหย้า'] },
    { key: 'teamB', label: 'Team B', required: true, aliases: ['teamb', 'team b', 'away', 'away team', 'team2', 'team 2', 'ทีมb', 'ทีม b', 'ทีมเยือน'] },
    { key: 'logoA', label: 'Logo A', aliases: ['logoa', 'logo a', 'home logo', 'logo1', 'โลโก้a', 'โลโก้ a'] },
    { key: 'logoB', label: 'Logo B', aliases: ['logob', 'logo b', 'away logo', 'logo2', 'โลโก้b', 'โลโก้ b'] },
    { key: 'colorA', label: 'Color A', aliases: ['colora', 'color a', 'home color', 'สีa', 'สี a'] },
    { key: 'colorB', label: 'Color B', aliases: ['colorb', 'color b', 'away color', 'สีb', 'สี b'] },
    { key: 'colorA2', label: 'Color A 2', aliases: ['colora2', 'color a2', 'color a 2', 'secondary color a', 'สีa2'] },
    { key: 'colorB2', label: 'Color B 2', aliases: ['colorb2', 'color b2', 'color b 2', 'secondary color b', 'สีb2'] },
    { key: 'label1', label: 'Label 1', aliases: ['label1', 'label 1', 'round', 'รอบ', 'ป้าย1'] },
    { key: 'label2', label: 'Label 2', aliases: ['label2', 'label 2', 'week', 'สัปดาห์', 'ป้าย2'] },
    { key: 'label3', label: 'Label 3', aliases: ['label3', 'label 3', 'field', 'สนาม', 'ป้าย3'] }
];

const FIREBASE_CONFIG_SHEET_NAME = 'FirebaseRealtimeDatabase';
const FIREBASE_CONFIG_KEYS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
const FIREBASE_REQUIRED_CONFIG_KEYS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const FIREBASE_META_KEYS = {
    name: ['name', 'league', 'leaguename', 'buttonlabel', 'savelabel', 'ชื่อลีก', 'ชื่อปุ่ม'],
    id: ['id', 'leagueid', 'slug', 'รหัสลีก']
};

const normalizeColumnName = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.()[\]/\\]+/g, '');

const getHeaders = () => sheetData[0] || [];

const loadSavedExcelMapping = () => {
    try {
        return JSON.parse(localStorage.getItem(EXCEL_MAPPING_KEY) || '{}');
    } catch (err) {
        return {};
    }
};

const inferExcelMapping = (headers) => {
    const normalizedHeaders = headers.map(normalizeColumnName);
    return EXCEL_FIELDS.reduce((mapping, field) => {
        const aliases = [field.key, field.label, ...field.aliases].map(normalizeColumnName);
        const matchIndex = normalizedHeaders.findIndex(header => aliases.includes(header));
        mapping[field.key] = matchIndex >= 0 ? headers[matchIndex] : '';
        return mapping;
    }, {});
};

const isValidMappedColumn = (headers, columnName) => !columnName || headers.includes(columnName);

const mergeExcelMapping = (headers) => {
    const inferred = inferExcelMapping(headers);
    const saved = loadSavedExcelMapping();
    excelMapping = EXCEL_FIELDS.reduce((mapping, field) => {
        mapping[field.key] = isValidMappedColumn(headers, saved[field.key]) ? saved[field.key] : inferred[field.key];
        return mapping;
    }, {});
};

const getMappedValue = (row, fieldKey) => {
    const headers = getHeaders();
    const columnName = excelMapping[fieldKey];
    const index = headers.indexOf(columnName);
    if (index < 0) return '';
    return row[index] ?? '';
};

const getMatchIdValue = (row) => {
    const mapped = getMappedValue(row, 'matchId');
    if (mapped !== '') return mapped;
    return row[0] ?? '';
};

const cleanExcelText = (value) => String(value ?? '').trim();

const cleanFirebaseValue = (value) => cleanExcelText(value)
    .replace(/^['"`]+/, '')
    .replace(/[,;'"`]+$/, '')
    .trim();

const normalizeFirebaseKey = (value) => cleanExcelText(value)
    .replace(/[:：]\s*$/, '')
    .trim();

const normalizeMetaKey = (value) => normalizeFirebaseKey(value)
    .toLowerCase()
    .replace(/[\s_\-.()[\]/\\:：]+/g, '');

const isFirebaseConfigSheetName = (sheetName) => {
    const normalized = normalizeColumnName(sheetName);
    return normalized === normalizeColumnName(FIREBASE_CONFIG_SHEET_NAME)
        || (normalized.includes('firebase') && normalized.includes('database'));
};

const getSheetRows = (workbook, sheetName) => XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false
});

const getMatchDataSheetName = (workbook) => {
    const preferredNames = ['matching', 'matches', 'match'];
    const preferred = workbook.SheetNames.find(sheetName => preferredNames.includes(normalizeColumnName(sheetName)));
    if (preferred) return preferred;
    return workbook.SheetNames.find(sheetName => !isFirebaseConfigSheetName(sheetName)) || workbook.SheetNames[0];
};

const isFirebaseBlockHeader = (value) => {
    const text = cleanExcelText(value).toLowerCase();
    return text.includes('firebase') && text.includes('config');
};

const isExampleFirebaseBlock = (value) => /(exam|example|sample|ตัวอย่าง)/i.test(cleanExcelText(value));

const getFirebaseMetaField = (key) => {
    const normalized = normalizeMetaKey(key);
    return Object.keys(FIREBASE_META_KEYS).find(field => FIREBASE_META_KEYS[field].includes(normalized));
};

const getFirebaseConfigField = (key) => {
    const normalized = normalizeMetaKey(key);
    return FIREBASE_CONFIG_KEYS.find(configKey => normalizeMetaKey(configKey) === normalized);
};

const parseFirebaseKeyValue = (row) => {
    const first = cleanExcelText(row[0]);
    const second = cleanFirebaseValue(row[1]);
    if (!first && !second) return null;

    if (second) {
        return {
            key: normalizeFirebaseKey(first),
            value: second
        };
    }

    const inlineMatch = first.match(/^([A-Za-z][A-Za-z0-9_]*|[\u0E00-\u0E7F\s]+)\s*[:：]\s*['"`]?(.+?)['"`]?,?$/);
    if (!inlineMatch) return null;

    return {
        key: normalizeFirebaseKey(inlineMatch[1]),
        value: cleanFirebaseValue(inlineMatch[2])
    };
};

const makeSaveTargetId = (value, fallback) => {
    const id = cleanExcelText(value)
        .toLowerCase()
        .replace(/[^a-z0-9ก-๙]+/gi, '-')
        .replace(/^-+|-+$/g, '');
    return id || fallback;
};

const makeFirebaseAppName = (target) => `ExcelLeague_${String(target.id || target.index)
    .replace(/[^A-Za-z0-9_]/g, '_')}_${target.index}`;

const buildFirebaseSaveTarget = (block, index) => {
    const name = block.metadata.name || block.config.projectId || `Firebase League ${index + 1}`;
    const id = makeSaveTargetId(block.metadata.id || block.config.projectId, `firebase-${index + 1}`);
    return {
        id,
        index,
        name,
        firebaseConfig: { ...block.config }
    };
};

const parseFirebaseSaveTargets = (workbook) => {
    const sheetName = workbook.SheetNames.find(isFirebaseConfigSheetName);
    if (!sheetName) return [];

    const rows = getSheetRows(workbook, sheetName);
    const blocks = [];
    let current = null;

    const startBlock = (label = '') => ({
        config: {},
        metadata: {},
        skip: isExampleFirebaseBlock(label)
    });

    const commitBlock = () => {
        if (!current) return;
        const hasAnyConfig = FIREBASE_CONFIG_KEYS.some(key => current.config[key]);
        if (hasAnyConfig) blocks.push(current);
        current = null;
    };

    rows.forEach(row => {
        const first = cleanExcelText(row[0]);
        const second = cleanExcelText(row[1]);

        if (!first && !second) {
            commitBlock();
            return;
        }

        if (isFirebaseBlockHeader(first)) {
            commitBlock();
            current = startBlock(first);
            return;
        }

        const pair = parseFirebaseKeyValue(row);
        if (!pair) return;

        if (!current) current = startBlock();

        const configField = getFirebaseConfigField(pair.key);
        if (configField) {
            current.config[configField] = pair.value;
            return;
        }

        const metaField = getFirebaseMetaField(pair.key);
        if (metaField && pair.value) {
            current.metadata[metaField] = pair.value;
        }
    });

    commitBlock();

    const completeBlocks = blocks.filter(block => FIREBASE_REQUIRED_CONFIG_KEYS.every(key => block.config[key]));
    const realBlocks = completeBlocks.filter(block => !block.skip);
    const usableBlocks = realBlocks.length ? realBlocks : completeBlocks;
    return usableBlocks.map(buildFirebaseSaveTarget);
};

const getOrCreateFirebaseApp = (target) => {
    const appName = makeFirebaseAppName(target);
    return getApps().some(app => app.name === appName)
        ? getApp(appName)
        : initializeApp(target.firebaseConfig, appName);
};

// --- OBS ---
const obs = new OBSWebSocket();
const setText = (source, text) => obs.call('SetInputSettings', { inputName: source, inputSettings: { text: String(text) } }).catch(err => {});
const setImage = (sourceName, filename) => {
    if (!filename) {
        obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { file: "" } }).catch(err => {});
        return;
    };
    const hasExt = /\.(png|jpe?g|gif|webp)$/i.test(filename);
    const filePath = `${logoFolderPath}/${filename}${hasExt ? '' : '.png'}`;
    obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { file: filePath } }).catch(err => {});
};
const setSourceColor = (sourceName, hexColor) => {
    const hexToObsColor = (hex) => {
        const cleanHex = hex.substring(1);
        const r = cleanHex.substring(0, 2);
        const g = cleanHex.substring(2, 4);
        const b = cleanHex.substring(4, 6);
        return parseInt("FF" + b + g + r, 16);
    };
    obs.call('SetInputSettings', { inputName: sourceName, inputSettings: { color: hexToObsColor(hexColor) } }).catch(err => {});
};

// --- UI & Language ---
const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
};

const openPopup = (popup) => {
    elements.popupOverlay.style.display = 'block';
    popup.style.display = 'block';
};

const closeAllPopups = () => {
    elements.popupOverlay.style.display = 'none';
    elements.detailsPopup.style.display = 'none';
    elements.helpPopup.style.display = 'none';
    elements.donatePopup.style.display = 'none';
    elements.timeSettingsPopup.style.display = 'none';
    elements.changelogPopup.style.display = 'none';
    elements.logoPathPopup.style.display = 'none';
    if (elements.controlPanelPopup) elements.controlPanelPopup.style.display = 'none';
    if (elements.excelMappingPopup) elements.excelMappingPopup.style.display = 'none';
    elements.timeSettingsError.style.display = 'none';
};

const populateDynamicLists = (lang) => {
    const trans = translations[lang] || translations.en;
    // Details Popup
    const detailsListContainer = elements.detailsPopup.querySelector('.item-list');
    detailsListContainer.querySelectorAll('.item-list-item').forEach(item => item.remove());
    if (trans.tagsList) {
        trans.tagsList.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'item-list-item';
            listItem.innerHTML = `<code>${item.code}</code> <span>${item.desc}</span>`;
            detailsListContainer.appendChild(listItem);
        });
    }
    // Help Popup
    const helpListContainer = elements.helpPopup.querySelector('.item-list');
    helpListContainer.querySelectorAll('.item-list-item').forEach(item => item.remove());
    if (trans.sourcesList) {
        trans.sourcesList.forEach(item => {
            const listItem = document.createElement('div');
            listItem.className = 'item-list-item';
            listItem.innerHTML = `<code>${item.code}</code> <span>${item.desc}</span>`;
            helpListContainer.appendChild(listItem);
        });
    }
};

const setLanguage = (lang) => {
    currentLang = lang;
    localStorage.setItem('scoreboardLang', lang);
    elements.languageSelector.value = lang;
    document.documentElement.lang = lang;
    const trans = translations[lang] || translations.en;
    document.querySelectorAll('[data-lang]').forEach(el => {
        const key = el.getAttribute('data-lang');
        if (trans[key]) el.textContent = trans[key];
    });
    document.querySelectorAll('[data-lang-title]').forEach(el => {
        const key = el.getAttribute('data-lang-title');
        if (trans[key]) el.title = trans[key];
    });
    document.querySelectorAll('[data-lang-html]').forEach(el => {
        const key = el.getAttribute('data-lang-html');
        if (trans[key]) el.innerHTML = trans[key];
    });

    // Update specific buttons that change text
    const editLogoPathBtnSpan = elements.editLogoPathBtn.querySelector('span');
    if (elements.logoPathInput.disabled) {
        editLogoPathBtnSpan.textContent = trans.edit;
    } else {
        editLogoPathBtnSpan.textContent = trans.save;
    }
    
    populateDynamicLists(lang);
};


// --- Scoreboard Logic ---
const getTeamInitials = (name) => name ? (name.split(' ').filter(Boolean).length >= 2 ? (name.split(' ')[0][0] + name.split(' ')[1][0]) : name.substring(0, 2)).toUpperCase() : '';

const updateTeamUI = (team, name, logoFile, color1, color2) => {
    const isA = team === 'A';
    const nameEl = isA ? elements.nameA : elements.nameB;
    const logoEl = isA ? elements.logoA : elements.logoB;
    const initialsEl = isA ? elements.initialsA : elements.initialsB;
    const colorEl1 = isA ? elements.colorA : elements.colorB;
    const colorEl2 = isA ? elements.colorA2 : elements.colorB2;

    const obsNameSource = isA ? 'name_team_a' : 'name_team_b';
    const obsLogoSource = isA ? 'logo_team_a' : 'logo_team_b';
    const obsColorSource1 = isA ? 'Color_Team_A' : 'Color_Team_B';
    const obsColorSource2 = isA ? 'Color_Team_A_2' : 'Color_Team_B_2';

    // โหลดสีที่เคยบันทึกไว้ ถ้ามี
    const savedColors = getTeamColors(name);
    const useColor1 = savedColors.color1 || color1;
    const useColor2 = savedColors.color2 || color2;

    nameEl.innerHTML = name.replace(/\//g, '<br>');
    colorEl1.value = useColor1;
    colorEl2.value = useColor2;
    initialsEl.textContent = getTeamInitials(name);
    logoEl.style.display = 'none';
    initialsEl.style.display = 'block';

    if (logoFile) {
        const hasExt = /\.(png|jpe?g|gif|webp)$/i.test(logoFile);
        logoEl.src = `file:///${logoFolderPath}/${logoFile}${hasExt ? '' : '.png'}`;
    }

    setText(obsNameSource, name.replace(/\//g, '\n'));
    setImage(obsLogoSource, logoFile);
    setSourceColor(obsColorSource1, useColor1);
    setSourceColor(obsColorSource2, useColor2);
};

const applyMatch = () => {
    if (!sheetData.length) return showToast(translations[currentLang].toastLoadFileFirst, 'error');
    const id = parseInt(elements.matchID.value);
    if (!Object.keys(excelMapping).length) mergeExcelMapping(getHeaders());
    const match = sheetData.slice(1).find(r => parseInt(getMatchIdValue(r)) === id);
    if (!match) return showToast(`${translations[currentLang].toastMatchNotFound} ${id}`, 'error');
    
    const get = key => getMappedValue(match, key) || '';
    
    const teamAName = get('teamA') || translations[currentLang].teamA;
    const teamBName = get('teamB') || translations[currentLang].teamB;

    // โหลดสีที่เคยบันทึกไว้ ถ้ามี
    const savedA = getTeamColors(teamAName);
    const savedB = getTeamColors(teamBName);
    const colorA1 = savedA.color1 || get('colorA') || '#ffffff';
    const colorB1 = savedB.color1 || get('colorB') || '#ffffff';
    const colorA2 = savedA.color2 || get('colorA2') || '#000000';
    const colorB2 = savedB.color2 || get('colorB2') || '#000000';

    currentLogoA = get('logoA');
    currentLogoB = get('logoB');

    elements.label1.textContent = get('label1');
    elements.label2.textContent = get('label2');
    elements.label3.textContent = get('label3');
    
    updateTeamUI('A', teamAName, currentLogoA, colorA1, colorA2);
    updateTeamUI('B', teamBName, currentLogoB, colorB1, colorB2);

    setText('label_1', get('label1'));
    setText('label_2', get('label2'));
    setText('label_3', get('label3'));
    
    showToast(`${translations[currentLang].toastLoaded} ${id}`, 'success');
    resetToZero(); 
    resetScore();
    half = '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);



};

const swapTeams = () => {
    //const [nameA, nameB] = [elements.nameA.innerHTML.replace(/<br\s*\/?>/gi, '/'), elements.nameB.innerHTML.replace(/<br\s*\/?>/gi, '/')];
    
    function decodeEntities(html) {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value;
    }

    const [nameA, nameB] = [elements.nameA.innerHTML, elements.nameB.innerHTML]
    .map(html => decodeEntities(html.replace(/<br\s*\/?>/gi, '/')));

    [scoreA, scoreB] = [scoreB, scoreA];
    [currentLogoA, currentLogoB] = [currentLogoB, currentLogoA];

    // โหลดสีที่เคยบันทึกไว้ ถ้ามี
    const savedA = getTeamColors(nameB);
    const savedB = getTeamColors(nameA);
    const colorA1 = savedA.color1 || '#ffffff';
    const colorA2 = savedA.color2 || '#000000';
    const colorB1 = savedB.color1 || '#ffffff';
    const colorB2 = savedB.color2 || '#000000';

    updateTeamUI('A', nameB, currentLogoA, colorA1, colorA2);
    updateTeamUI('B', nameA, currentLogoB, colorB1, colorB2);

    elements.scoreA.textContent = scoreA;
    setText('score_team_a', scoreA);
    elements.scoreB.textContent = scoreB;
    setText('score_team_b', scoreB);

    showToast(translations[currentLang].toastSwapped, 'info');
};

const changeScore = (team, delta) => {
    if (team === 'A') {
        scoreA = Math.max(0, scoreA + delta);
        elements.scoreA.textContent = scoreA;
        setText('score_team_a', scoreA);
    } else {
        scoreB = Math.max(0, scoreB + delta);
        elements.scoreB.textContent = scoreB;
        setText('score_team_b', scoreB);
    }
};

const resetScore = () => {
    scoreA = scoreB = 0;
    elements.scoreA.textContent = '0';
    elements.scoreB.textContent = '0';
    setText('score_team_a', '0');
    setText('score_team_b', '0');
    showToast(translations[currentLang].toastScoreReset, 'info');
    setText('half_text', "");
};

const updateTimerDisplay = () => {
    const m = String(Math.floor(timer / 60)).padStart(2, '0');
    const s = String(timer % 60).padStart(2, '0');
    const timeString = `${m}:${s}`;
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
};

const hidetimer_1 = () => {
    elements.timerText.textContent = "";
    setText('time_counter', "");
    stopTimer();
};

const startTimer1 = () => {
    half = '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);
    timer = 0;
    if (interval) return;
    interval = setInterval(() => {
        if (isCountdown) {
            if (timer > 0) timer--;
            else stopTimer();
        } else {
            timer++;
        }
        updateTimerDisplay();
    }, 1000);
};

const startTimer2 = () => {
    half = '2nd';
    elements.halfText.textContent = half;
    setText('half_text', half);
    timer = 900;
    if (interval) return;
    interval = setInterval(() => {
        if (isCountdown) {
            if (timer > 0) timer--;
            else stopTimer();
        } else {
            timer++;
        }
        updateTimerDisplay();
    }, 1000);
};

const stopTimer = () => { 
    clearInterval(interval);
    interval = null;
};

const halfpause = () => {
    const timeString = "HT";
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
    elements.halfText.textContent = "";
    setText('half_text', "");
    stopTimer();
};

const fulltime = () => {
    const timeString = "FT";
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
    elements.halfText.textContent = "";
    setText('half_text', "");
    stopTimer();
};


const resetToStartTime = () => {
    stopTimer();
    timer = countdownStartTime; 
    injuryTime = 0;
    updateTimerDisplay();
    updateInjuryTimeDisplay();
};

const resetToZero = () => {
    stopTimer();
    timer = 0;
    injuryTime = 0;
    updateTimerDisplay();
    updateInjuryTimeDisplay();
    const timeString = "00:00";
    elements.timerText.textContent = timeString;
    setText('time_counter', timeString);
}

const buildMatchInfo = () => {
    const now = Date.now();
    return {
        teamA: elements.nameA.innerText,
        teamB: elements.nameB.innerText,
        scoreA: parseInt(scoreA, 10),
        scoreB: parseInt(scoreB, 10),
        roundLabel: elements.label2.innerText,
        date: new Date(now).toISOString().slice(0, 10),
        url: ""
    };
};

const saveMatchResult = (target) => {
    const confirmSave = confirm(`${target.name} แน่นะ !! ??`);
    if (!confirmSave) return;

    try {
        const targetDatabase = getDatabase(getOrCreateFirebaseApp(target));
        push(ref(targetDatabase, 'matches'), buildMatchInfo())
            .then(() => alert(`บันทึกคะแนน ${target.name} เรียบร้อยแล้ว`))
            .catch(err => alert('บันทึกไม่สำเร็จ: ' + err.message));
    } catch (err) {
        alert('บันทึกไม่สำเร็จ: ' + err.message);
    }
};

const renderMatchSaveButtons = (emptyMessage = 'โหลด Excel เพื่อสร้างปุ่มบันทึก') => {
    if (!elements.matchSaveButtons) return;
    elements.matchSaveButtons.innerHTML = '';

    if (!matchSaveTargets.length) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'btn btn-primary';
        button.disabled = true;
        button.textContent = emptyMessage;
        elements.matchSaveButtons.appendChild(button);
        return;
    }

    matchSaveTargets.forEach(target => {
        const button = document.createElement('button');
        const icon = document.createElement('i');
        button.type = 'button';
        button.id = `match-save-${target.id}`;
        button.className = 'btn btn-primary';
        button.title = target.firebaseConfig.databaseURL || target.name;
        button.append(`บันทึกข้อมูลแมทต์ ${target.name}`);
        icon.className = 'fas fa-save';
        button.appendChild(icon);
        button.addEventListener('click', () => saveMatchResult(target));
        elements.matchSaveButtons.appendChild(button);
    });
};


const openTimeSettings = () => {
    const minutes = Math.floor(countdownStartTime / 60);
    const seconds = countdownStartTime % 60;
    elements.startTimeMinutes.value = minutes;
    elements.startTimeSeconds.value = seconds;
    openPopup(elements.timeSettingsPopup);
};

const validateAndGetTime = () => {
    const trans = translations[currentLang] || translations.en;
    const minutes = parseInt(elements.startTimeMinutes.value, 10);
    const seconds = parseInt(elements.startTimeSeconds.value, 10);

    if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds < 0 || seconds > 59) {
        elements.timeSettingsError.textContent = trans.toastInvalidTime;
        elements.timeSettingsError.style.display = 'block';
        return null;
    }
    return (minutes * 60) + seconds;
}

const saveTimeSettings = () => {
    const newTime = validateAndGetTime();
    if (newTime === null) return;
    
    countdownStartTime = newTime;
    localStorage.setItem('countdownStartTime', countdownStartTime);
    closeAllPopups();
    showToast(translations[currentLang].toastSaved, 'success');
};

const saveAndUpdateTime = () => {
    const newTime = validateAndGetTime();
    if (newTime === null) return;

    countdownStartTime = newTime;
    localStorage.setItem('countdownStartTime', countdownStartTime);
    
    timer = newTime;
    updateTimerDisplay();

    closeAllPopups();
    showToast(translations[currentLang].toastTimeSet, 'success');
}


const toggleHalf = () => {
    half = half === '1st' ? '2nd' : '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);
};

const updateInjuryTimeDisplay = () => {
    const displayString = injuryTime > 0 ? `+${injuryTime}` : '+0';
    elements.injuryTimeDisplay.textContent = displayString;
    setText('injury_time_text', displayString);
};

const changeInjuryTime = (delta) => {
    injuryTime = Math.max(0, injuryTime + delta);
    updateInjuryTimeDisplay();
};

const buildExcelMappingControls = () => {
    if (!elements.excelMappingFields) return;
    const headers = getHeaders();
    elements.excelMappingFields.innerHTML = '';
    elements.excelMappingStatus.textContent = headers.length
        ? `Detected ${headers.length} columns. Required fields: Match ID, Team A, Team B.`
        : 'Please import an Excel file first.';

    EXCEL_FIELDS.forEach(field => {
        const row = document.createElement('div');
        row.className = 'field-row';

        const label = document.createElement('label');
        label.htmlFor = `excel-map-${field.key}`;
        label.textContent = `${field.label}${field.required ? ' *' : ''}`;

        const select = document.createElement('select');
        select.id = `excel-map-${field.key}`;
        select.dataset.field = field.key;

        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = field.required ? 'Select column' : 'Not used';
        select.appendChild(emptyOption);

        headers.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = header;
            select.appendChild(option);
        });

        select.value = excelMapping[field.key] || '';
        row.append(label, select);
        elements.excelMappingFields.appendChild(row);
    });
};

const openExcelMappingPopup = () => {
    if (!sheetData.length) {
        showToast(translations[currentLang].toastLoadFileFirst, 'error');
        return;
    }
    mergeExcelMapping(getHeaders());
    buildExcelMappingControls();
    openPopup(elements.excelMappingPopup);
};

const saveExcelMapping = () => {
    const nextMapping = {};
    elements.excelMappingFields.querySelectorAll('select[data-field]').forEach(select => {
        nextMapping[select.dataset.field] = select.value;
    });

    const missingRequired = EXCEL_FIELDS
        .filter(field => field.required && !nextMapping[field.key])
        .map(field => field.label);

    if (missingRequired.length) {
        showToast(`Missing required mapping: ${missingRequired.join(', ')}`, 'error');
        return;
    }

    excelMapping = nextMapping;
    localStorage.setItem(EXCEL_MAPPING_KEY, JSON.stringify(excelMapping));
    closeAllPopups();
    showToast('Excel mapping saved', 'success');
};

const resetExcelMapping = () => {
    excelMapping = inferExcelMapping(getHeaders());
    localStorage.setItem(EXCEL_MAPPING_KEY, JSON.stringify(excelMapping));
    buildExcelMappingControls();
    showToast('Auto mapping applied', 'info');
};

const encodeUrlSafeBase64 = (value) => btoa(value)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

const encodeFirebaseConfigParam = (firebaseConfig) => encodeUrlSafeBase64(JSON.stringify(firebaseConfig));

const getQuickLeagueOptions = () => {
    const excelOptions = matchSaveTargets.map(target => ({
        value: `excel:${target.id}`,
        id: target.id,
        name: target.name,
        source: 'excel',
        firebaseConfig: target.firebaseConfig
    }));

    if (excelOptions.length) return excelOptions;

    return getLeagueOptions().map(league => ({
        value: league.id,
        id: league.id,
        name: league.name,
        source: 'static',
        firebaseConfig: league.firebaseConfig
    }));
};

const getSelectedQuickLeague = () => {
    const options = getQuickLeagueOptions();
    return options.find(league => league.value === elements.quickLeague.value) || options[0] || null;
};

const updateQuickFirebasePreview = (league) => {
    if (!elements.quickFirebaseDatabaseUrl) return;
    elements.quickFirebaseDatabaseUrl.value = league?.firebaseConfig?.databaseURL || '';
};

const populateQuickSetup = (preferredLeagueValue = elements.quickLeague?.value) => {
    if (!elements.quickLeague) return;
    const options = getQuickLeagueOptions();
    elements.quickLeague.innerHTML = '';
    options.forEach(league => {
        const option = document.createElement('option');
        option.value = league.value;
        option.textContent = league.source === 'excel'
            ? `${league.name} (Excel Firebase)`
            : league.name;
        elements.quickLeague.appendChild(option);
    });

    const nextValue = options.some(league => league.value === preferredLeagueValue)
        ? preferredLeagueValue
        : options[0]?.value;
    if (nextValue) elements.quickLeague.value = nextValue;
    updateQuickFirebasePreview(getSelectedQuickLeague());
};

const updateGeneratedOverlayUrl = () => {
    if (!elements.generatedOverlayUrl) return;
    const selectedLeague = getSelectedQuickLeague();
    const url = new URL('overlay.html', window.location.href);
    url.searchParams.set('league', selectedLeague?.id || 'var');
    url.searchParams.set('view', elements.quickOverlayView.value || 'table');

    if (selectedLeague?.source === 'excel') {
        url.searchParams.set('title', selectedLeague.name);
        url.searchParams.set('fb', encodeFirebaseConfigParam(selectedLeague.firebaseConfig));
    }

    const date = elements.quickOverlayDate.value.trim();
    if (date && date !== 'all') url.searchParams.set('date', date);
    updateQuickFirebasePreview(selectedLeague);
    elements.generatedOverlayUrl.value = url.href;
};

const openControlPanelPopup = () => {
    const savedLeague = localStorage.getItem('quickOverlayLeague');
    const savedView = localStorage.getItem('quickOverlayView');
    const savedDate = localStorage.getItem('quickOverlayDate');
    populateQuickSetup(savedLeague);
    if (savedView) elements.quickOverlayView.value = savedView;
    if (savedDate) elements.quickOverlayDate.value = savedDate;
    updateGeneratedOverlayUrl();
    openPopup(elements.controlPanelPopup);
};

const saveQuickSetupState = () => {
    localStorage.setItem('quickOverlayLeague', elements.quickLeague.value);
    localStorage.setItem('quickOverlayView', elements.quickOverlayView.value);
    localStorage.setItem('quickOverlayDate', elements.quickOverlayDate.value.trim() || 'all');
    updateGeneratedOverlayUrl();
};

const copyGeneratedOverlayUrl = () => {
    saveQuickSetupState();
    navigator.clipboard.writeText(elements.generatedOverlayUrl.value)
        .then(() => showToast(translations[currentLang].toastCopied, 'info'))
        .catch(() => showToast(translations[currentLang].toastCopyFailed, 'error'));
};

const handleExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = e => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = event => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = getMatchDataSheetName(workbook);
                sheetData = getSheetRows(workbook, sheetName);
                mergeExcelMapping(getHeaders());
                matchSaveTargets = parseFirebaseSaveTargets(workbook);
                renderMatchSaveButtons(matchSaveTargets.length ? undefined : 'ไม่พบ Firebase config ใน Excel');
                populateQuickSetup(localStorage.getItem('quickOverlayLeague'));
                updateGeneratedOverlayUrl();

                const saveTargetMessage = matchSaveTargets.length
                    ? `สร้างปุ่มบันทึก ${matchSaveTargets.length} ลีกแล้ว`
                    : `ไม่พบชีต ${FIREBASE_CONFIG_SHEET_NAME}`;
                showToast(`${translations[currentLang].toastSuccess} - Excel mapping is ready - ${saveTargetMessage}`, matchSaveTargets.length ? 'success' : 'info');
            } catch (err) {
                showToast(err.message, 'error');
            }
        };
        reader.readAsArrayBuffer(file);
    };
    input.click();
};

// คืนค่าวันที่ในรูปแบบ "วัน<ชื่อวัน>ที่ <วัน> <ชื่อเดือน> <พ.ศ.>"
const getThaiDateString = () => {
  const now = new Date();
  // ใช้ Intl กับ Buddhist calendar เพื่อได้ปีเป็น พ.ศ.
  const dateStr = now.toLocaleDateString('th-TH-u-ca-buddhist', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  // ใส่คำว่า "ที่" ระหว่างชื่อวันกับเลขวัน
  return dateStr.replace(' ', ' ');
};


const copyDetails = () => {
    const template = localStorage.getItem('detailsText') || '';
    if (!template.trim()) return showToast(translations[currentLang].toastNoTextToCopy, 'error');

    const decodeAmp = s => s.replace(/<br\s*\/?>/gi, ' ')
                        .replace(/&amp;/g, '&');

    let teamAName = decodeAmp(elements.nameA.innerHTML);
    let teamBName = decodeAmp(elements.nameB.innerHTML);

    const thaiDate = getThaiDateString();

    const filled = template
        .replace(/<TeamA>/gi, teamAName)
        .replace(/<TeamB>/gi, teamBName)
        .replace(/<label1>/gi, elements.label1.textContent)
        .replace(/<label2>/gi, elements.label2.textContent)
        .replace(/<label3>/gi, elements.label3.textContent)
        .replace(/<score_team_a>/gi, scoreA)
        .replace(/<score_team_b>/gi, scoreB)
        .replace(/<thai_date>/gi, thaiDate)
        .replace(/<time_counter>/gi, elements.timerText.textContent)
        .replace(/<half_text>/gi, elements.halfText.textContent);
        
    navigator.clipboard.writeText(filled).then(()=>showToast(translations[currentLang].toastCopied,'info')).catch(err=>showToast(translations[currentLang].toastCopyFailed,'error'));
};


const enterEditMode = (team) => {
    const isA = team === 'A';
    const nameDiv = isA ? elements.nameA : elements.nameB;
    const nameInput = isA ? elements.nameAInput : elements.nameBInput;
    const editBtn = isA ? elements.editBtnA : elements.editBtnB;
    const okBtn = isA ? elements.okBtnA : elements.okBtnB;
    nameDiv.style.display = 'none';
    editBtn.style.display = 'none';
    nameInput.value = nameDiv.innerHTML.replace(/<br\s*\/?>/gi, '/');
    nameInput.style.display = 'block';
    okBtn.style.display = 'inline-flex';
    nameInput.focus();
};

const exitEditMode = (team, applyChanges) => {
    const isA = team === 'A';
    const nameDiv = isA ? elements.nameA : elements.nameB;
    const nameInput = isA ? elements.nameAInput : elements.nameBInput;
    const editBtn = isA ? elements.editBtnA : elements.editBtnB;
    const okBtn = isA ? elements.okBtnA : elements.okBtnB;
    if (applyChanges) {
        const newName = nameInput.value;
        const obsSourceName = isA ? 'name_team_a' : 'name_team_b';
        nameDiv.innerHTML = newName.replace(/\//g, '<br>');
        setText(obsSourceName, newName.replace(/\//g, '\n'));
        const initialsEl = isA ? elements.initialsA : elements.initialsB;
        initialsEl.textContent = getTeamInitials(newName.replace(/\//g, ' '));
        // โหลดสีที่เคยบันทึกไว้ ถ้ามี
        const savedColors = getTeamColors(newName);
        const colorEl1 = isA ? elements.colorA : elements.colorB;
        const colorEl2 = isA ? elements.colorA2 : elements.colorB2;
        colorEl1.value = savedColors.color1 || '#ffffff';
        colorEl2.value = savedColors.color2 || '#000000';
        setSourceColor(isA ? 'Color_Team_A' : 'Color_Team_B', colorEl1.value);
        setSourceColor(isA ? 'Color_Team_A_2' : 'Color_Team_B_2', colorEl2.value);
    }
    nameDiv.style.display = 'block';
    editBtn.style.display = 'inline-flex';
    nameInput.style.display = 'none';
    okBtn.style.display = 'none';
};

const setupEventListeners = () => {
    elements.languageSelector.addEventListener('change', (e) => setLanguage(e.target.value));
    elements.excelBtn.addEventListener('click', handleExcel);
    elements.loadBtn.addEventListener('click', applyMatch);
    // Previous/Next Match Buttons
    if (!elements.prevMatchBtn) {
        const prevBtn = document.createElement('button');
        prevBtn.textContent = translations[currentLang]?.prev || 'ก่อนหน้า';
        prevBtn.type = 'button';
        prevBtn.id = 'prev-match-btn';
        elements.matchID.parentNode.appendChild(prevBtn);
        elements.prevMatchBtn = prevBtn;
    }
    if (!elements.nextMatchBtn) {
        const nextBtn = document.createElement('button');
        nextBtn.textContent = translations[currentLang]?.next || 'ต่อไป';
        nextBtn.type = 'button';
        nextBtn.id = 'next-match-btn';
        elements.matchID.parentNode.appendChild(nextBtn);
        elements.nextMatchBtn = nextBtn;
    }

    elements.prevMatchBtn.addEventListener('click', () => {
        let id = parseInt(elements.matchID.value, 10) || 0;
        if (id > 1) {
            elements.matchID.value = id - 1;
            applyMatch();
        }
    });
    elements.nextMatchBtn.addEventListener('click', () => {
        let id = parseInt(elements.matchID.value, 10) || 0;
        elements.matchID.value = id + 1;
        applyMatch();
    });
    
    elements.swapBtn.addEventListener('click', swapTeams);
    elements.scoreAPlusBtn.addEventListener('click', () => changeScore('A', 1));
    elements.scoreAMinusBtn.addEventListener('click', () => changeScore('A', -1));
    elements.scoreBPlusBtn.addEventListener('click', () => changeScore('B', 1));
    elements.scoreBMinusBtn.addEventListener('click', () => changeScore('B', -1));
    elements.resetScoreBtn.addEventListener('click', resetScore);
    elements.halfBtn.addEventListener('click', toggleHalf);
    elements.hidetimer.addEventListener('click', hidetimer_1);
    elements.play1Btn.addEventListener('click', startTimer1);
    elements.play2Btn.addEventListener('click', startTimer2);
    elements.halfpauseBtn.addEventListener('click', halfpause);
    elements.fullEndBtn.addEventListener('click', fulltime);
    // elements.pauseBtn.addEventListener('click', stopTimer);
    elements.resetToStartBtn.addEventListener('click', resetToStartTime); 
    // elements.resetToZeroBtn.addEventListener('click', resetToZero);     
    elements.editTimeBtn.addEventListener('click', openTimeSettings);
    elements.countdownCheck.addEventListener('change', () => { isCountdown = elements.countdownCheck.checked; });
    elements.settingsBtn.addEventListener('click', () => { elements.detailsText.value = localStorage.getItem('detailsText') || ''; openPopup(elements.detailsPopup); });
    elements.copyBtn.addEventListener('click', copyDetails);
    elements.helpBtn.addEventListener('click', () => openPopup(elements.helpPopup));
    elements.donateBtn.addEventListener('click', () => openPopup(elements.donatePopup));
    elements.changelogBtn.addEventListener('click', () => openPopup(elements.changelogPopup));
    elements.controlPanelBtn.addEventListener('click', openControlPanelPopup);
    elements.excelMappingBtn.addEventListener('click', openExcelMappingPopup);
    elements.popupOverlay.addEventListener('click', closeAllPopups);

    // Details Popup
    elements.saveDetailsBtn.addEventListener('click', () => { localStorage.setItem('detailsText', elements.detailsText.value); closeAllPopups(); showToast(translations[currentLang].toastSaved, 'success'); });
    elements.closeDetailsBtn.addEventListener('click', closeAllPopups);
    
    // Other Popups Close Buttons
    elements.closeHelpBtn.addEventListener('click', closeAllPopups);
    elements.closeDonateBtn.addEventListener('click', closeAllPopups);
    elements.closeChangelogBtn.addEventListener('click', closeAllPopups);
    elements.closeTimeSettingsBtn.addEventListener('click', closeAllPopups);
    elements.closeLogoPathBtn.addEventListener('click', closeAllPopups);
    elements.closeControlPanelBtn.addEventListener('click', closeAllPopups);
    elements.closeExcelMappingBtn.addEventListener('click', closeAllPopups);
    elements.saveExcelMappingBtn.addEventListener('click', saveExcelMapping);
    elements.resetExcelMappingBtn.addEventListener('click', resetExcelMapping);
    elements.copyOverlayUrlBtn.addEventListener('click', copyGeneratedOverlayUrl);
    [elements.quickLeague, elements.quickOverlayView, elements.quickOverlayDate].forEach(control => {
        control.addEventListener('input', saveQuickSetupState);
        control.addEventListener('change', saveQuickSetupState);
    });
    
    // Time Settings
    elements.saveTimeSettingsBtn.addEventListener('click', saveTimeSettings);
    elements.saveAndUpdateTimeBtn.addEventListener('click', saveAndUpdateTime);

    // Edit Name
    elements.editBtnA.addEventListener('click', () => enterEditMode('A'));
    elements.okBtnA.addEventListener('click', () => exitEditMode('A', true));
    elements.editBtnB.addEventListener('click', () => enterEditMode('B'));
    elements.okBtnB.addEventListener('click', () => exitEditMode('B', true));
    
    // Colors
    elements.colorA.addEventListener('input', (e) => {
        setSourceColor('Color_Team_A', e.target.value);
    });
    elements.colorA2.addEventListener('input', (e) => {
        setSourceColor('Color_Team_A_2', e.target.value);
    });
    elements.colorB.addEventListener('input', (e) => {
        setSourceColor('Color_Team_B', e.target.value);
    });
    elements.colorB2.addEventListener('input', (e) => {
        setSourceColor('Color_Team_B_2', e.target.value);
    });

    // Save Color Buttons
    // Create save buttons if not exist
    if (!elements.colorASaveBtn) {
        const saveBtnA = document.createElement('button');
        saveBtnA.textContent = 'บันทึกชุด A';
        saveBtnA.type = 'button';
        saveBtnA.id = 'colorA-save-btn';
        elements.colorA.parentNode.appendChild(saveBtnA);
        elements.colorASaveBtn = saveBtnA;
    }
    if (!elements.colorBSaveBtn) {
        const saveBtnB = document.createElement('button');
        saveBtnB.textContent = 'บันทึกชุด B';
        saveBtnB.type = 'button';
        saveBtnB.id = 'colorB-save-btn';
        elements.colorB.parentNode.appendChild(saveBtnB);
        elements.colorBSaveBtn = saveBtnB;
    }

    elements.colorASaveBtn.addEventListener('click', () => {
        // ใช้ innerText แทน innerHTML เพื่อให้ได้ชื่อทีมที่ไม่มี tag หรือ encode
        const teamAName = elements.nameA.innerText.trim();
        setTeamColors(teamAName, {
            color1: elements.colorA.value,
            color2: elements.colorA2.value
        });
        showToast(translations[currentLang]?.toastSaved || 'Saved', 'success');
    });

    elements.colorBSaveBtn.addEventListener('click', () => {
        const teamBName = elements.nameB.innerText.trim();
        setTeamColors(teamBName, {
            color1: elements.colorB.value,
            color2: elements.colorB2.value
        });
        showToast(translations[currentLang]?.toastSaved || 'Saved', 'success');
    });
    
    // Injury Time
    elements.injuryTimePlusBtn.addEventListener('click', () => changeInjuryTime(1));
    elements.injuryTimeMinusBtn.addEventListener('click', () => changeInjuryTime(-1));
    
    // Logo Path Settings
    elements.logoPathBtn.addEventListener('click', () => openPopup(elements.logoPathPopup));
    elements.editLogoPathBtn.addEventListener('click', () => {
        const trans = translations[currentLang] || translations.en;
        const btnSpan = elements.editLogoPathBtn.querySelector('span');

        if (elements.logoPathInput.disabled) { // Enter edit mode
            elements.logoPathInput.disabled = false;
            elements.logoPathInput.focus();
            btnSpan.textContent = trans.save;
        } else { // Save changes
            const newPath = elements.logoPathInput.value.trim();
            logoFolderPath = newPath;
            localStorage.setItem('logoFolderPath', newPath);
            elements.currentLogoPath.textContent = newPath;
            elements.logoPathInput.disabled = true;
            btnSpan.textContent = trans.edit;
            showToast(trans.toastSaved, 'success');
        }
    });
};


// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Load saved settings from localStorage
    const savedLang = localStorage.getItem('scoreboardLang') || 'th';
    const savedTime = localStorage.getItem('countdownStartTime');
    if (savedTime) {
        countdownStartTime = parseInt(savedTime, 10);
    }
    const savedPath = localStorage.getItem('logoFolderPath');
    if (savedPath) {
        logoFolderPath = savedPath;
    }
    elements.logoPathInput.value = logoFolderPath;
    elements.currentLogoPath.textContent = logoFolderPath;

    setupEventListeners();
    setLanguage(savedLang);
    renderMatchSaveButtons();
    resetToZero(); 
    resetScore();
    updateInjuryTimeDisplay();
    obs.connect('ws://localhost:4455').catch(err => showToast(translations[currentLang].toastObsError, 'error'));
});

// --- TEAM COLOR MEMORY ---
const TEAM_COLOR_KEY = 'teamColors';
function getTeamColors(teamName) {
    if (!teamName) return {};
    const all = JSON.parse(localStorage.getItem(TEAM_COLOR_KEY) || '{}');
    // ใช้ encodeURIComponent เพื่อรองรับชื่อทีมที่มีอักขระพิเศษ
    return all[encodeURIComponent(teamName)] || {};
}
function setTeamColors(teamName, colors) {
    if (!teamName) return;
    const all = JSON.parse(localStorage.getItem(TEAM_COLOR_KEY) || '{}');
    // ใช้ encodeURIComponent เพื่อรองรับชื่อทีมที่มีอักขระพิเศษ
    all[encodeURIComponent(teamName)] = { ...all[encodeURIComponent(teamName)], ...colors };
    localStorage.setItem(TEAM_COLOR_KEY, JSON.stringify(all));
}


document.querySelectorAll('.quick-color_B').forEach(el => {
    el.addEventListener('click', function() {
        document.getElementById('colorB').value = this.dataset.color;
        document.getElementById('colorB').dispatchEvent(new Event('input', { bubbles: true }));
    });
});
 document.querySelectorAll('.quick-color_A').forEach(el => {
    el.addEventListener('click', function() {
        document.getElementById('colorA').value = this.dataset.color;
        document.getElementById('colorA').dispatchEvent(new Event('input', { bubbles: true }));
    });
});



// function realtime scoreboard update --------------------------------------------------
