// fcp_v2_assets/main.js

// 1. นำเข้าข้อมูลภาษาจากไฟล์ languages.js
import { translations } from './languages.js';
import { getLeagueOptions } from './league-config.js';
// 1. นำเข้าโมดูล (สำหรับ Firebase v9+)
import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, update } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// --- DOM ELEMENTS ---
const $ = id => document.getElementById(id);
const elements = [
    "nameA", "nameB", "label1", "label2", "label3", "logoA", "logoB", "initialsA", "initialsB",
    "scoreA", "scoreB", "timerText", "halfText", "announcement-text", "matchID", 
    "colorA", "colorB", "colorA2", "colorB2",
    "languageSelector", "nameA-input", "nameB-input", "excelBtn", "loadBtn",
    "editBtnA", "okBtnA", "editBtnB", "okBtnB", "swapBtn", "scoreAPlusBtn", "scoreAMinusBtn",
    "scoreBPlusBtn", "scoreBMinusBtn", "resetScoreBtn", "halfBtn", "play1Btn", "play2Btn", "pauseBtn",
    "settingsBtn", "copyBtn", "helpBtn", "donateBtn",
    "toast-container", "popupOverlay", "detailsPopup", "helpPopup", "donatePopup", "detailsText",
    "saveDetailsBtn", "closeDetailsBtn", "closeHelpBtn", "closeDonateBtn",
    "timeSettingsPopup",
    "startTimeMinutes", "startTimeSeconds", "saveTimeSettingsBtn", "saveAndUpdateTimeBtn", "closeTimeSettingsBtn",
    "timeSettingsError", "changelogBtn", "changelogPopup", "closeChangelogBtn",
    "logoPathBtn", "logoPathPopup", "currentLogoPath", "logoPathInput", "editLogoPathBtn", "closeLogoPathBtn",
    "halfpauseBtn", "fullEndBtn", "matchSaveButtons", "hidetimer",
    "controlPanelBtn", "controlPanelPopup", "closeControlPanelBtn", "quickLeague", 
    "copyLeagueTableUrlBtn", "copyAllScoresUrlBtn", "copyLiveTickerUrlBtn",
    "leagueNameDisplay", "teamSelectPopup", "teamSelectTitle", "teamSelectSearch", "teamSelectList", "closeTeamSelectBtn",
    "manageDatabaseBtn", "manageDatabasePopup", "closeDatabasePopupBtn", "refreshDatabaseBtn",
    "databaseSearchInput", "databaseFilterDate", "databaseTableBody", "databaseLoadingStatus",
    "editMatchPopup", "editMatchDate", "editMatchTeamA", "editMatchScoreA", 
    "editMatchTeamB", "editMatchScoreB", "editMatchRound", "editMatchUrl",
    "saveMatchEditBtn", "cancelMatchEditBtn",
    "adjustTimeBtn", "presetTimePopup", "closePresetTimeBtn"
].reduce((acc, id) => {
    acc[id.replace(/-(\w)/g, (m, p1) => p1.toUpperCase())] = $(id);
    return acc;
}, {});

let teamSelectTarget = null;
let currentDatabaseMatches = [];
let currentEditingMatch = null;


// --- STATE VARIABLES ---
let sheetData = [];
let currentLogoA = '', currentLogoB = '';
let scoreA = 0, scoreB = 0;
let timer = 0, interval = null, half = '1st';
let currentLang = 'th';
let logoFolderPath = 'C:/OBSAssets/logos';
let excelMapping = {};
let matchSaveTargets = [];
let teamSheetData = []; // Team sheet data for colors
let countdownStartTime = 0; // Default start time in seconds

const EXCEL_FIELDS = [
    { key: 'matchId', label: 'Match ID', required: true, aliases: ['match', 'id', 'matchid', 'match id', 'no', 'no.', 'number', 'ลำดับ', 'ที่', 'แมตช์'] },
    { key: 'teamA', label: 'Team A', required: true, aliases: ['team_a', 'teama', 'team a', 'home', 'home team', 'team1', 'team 1', 'ทีมa', 'ทีม a', 'ทีมเหย้า'] },
    { key: 'teamB', label: 'Team B', required: true, aliases: ['team_b', 'teamb', 'team b', 'away', 'away team', 'team2', 'team 2', 'ทีมb', 'ทีม b', 'ทีมเยือน'] },
    { key: 'logoA', label: 'Logo A', aliases: ['team_a', 'logoa', 'logo a', 'home logo', 'logo1', 'โลโก้a', 'โลโก้ a'] },
    { key: 'logoB', label: 'Logo B', aliases: ['team_b', 'logob', 'logo b', 'away logo', 'logo2', 'โลโก้b', 'โลโก้ b'] },
    { key: 'colorA', label: 'Color A', aliases: [] },
    { key: 'colorB', label: 'Color B', aliases: [] },
    { key: 'colorA2', label: 'Color A 2', aliases: [] },
    { key: 'colorB2', label: 'Color B 2', aliases: [] },
    { key: 'label1', label: 'Label 1', aliases: ['label_1', 'label1', 'label 1', 'round', 'รอบ', 'ป้าย1'] },
    { key: 'label2', label: 'Label 2', aliases: ['label_2', 'label2', 'label 2', 'week', 'สัปดาห์', 'ป้าย2'] },
    { key: 'label3', label: 'Label 3', aliases: ['label_3', 'label3', 'label 3', 'field', 'สนาม', 'ป้าย3'] }
];

const FIREBASE_CONFIG_SHEET_NAME = 'FirebaseRealtimeDatabase';
const FIREBASE_CONFIG_KEYS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'];
const FIREBASE_REQUIRED_CONFIG_KEYS = ['apiKey', 'authDomain', 'databaseURL', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
const FIREBASE_META_KEYS = {
    name: ['name', 'league', 'leaguename', 'buttonlabel', 'savelabel', 'ชื่อลีก', 'ชื่อปุ่ม', 'ชื่อลีกleaguename', 'leaguenameชื่อลีก'],
    id: ['id', 'leagueid', 'slug', 'รหัสลีก', 'รหัสลีกleagueid', 'leagueidรหัสลีก']
};

const normalizeColumnName = (value) => String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.()[\]/\\]+/g, '');

const getHeaders = () => sheetData[0] || [];

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
    // Always use auto-detected mapping (ignore saved mapping)
    excelMapping = inferExcelMapping(headers);
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

const getTeamSheetName = (workbook) => {
    const preferredNames = ['team', 'teams'];
    return workbook.SheetNames.find(sheetName => preferredNames.includes(normalizeColumnName(sheetName)));
};

const loadTeamSheetWithColors = async (file) => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        
        // Check if ExcelJS is loaded
        if (typeof ExcelJS === 'undefined') {
            console.error('ExcelJS library not loaded');
            return [];
        }
        
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        
        console.log('ExcelJS workbook loaded, worksheets:', workbook.worksheets.map(w => w.name));
        
        // Find Team sheet
        const teamSheet = workbook.worksheets.find(sheet => 
            ['team', 'teams'].includes(normalizeColumnName(sheet.name))
        );
        
        if (!teamSheet) {
            console.log('No Team sheet found in:', workbook.worksheets.map(w => w.name));
            return [];
        }
        
        console.log('Found Team sheet:', teamSheet.name);
        
        // Excel theme colors mapping (common theme)
        const themeColors = [
            '#FFFFFF', // 0: White (background 1)
            '#000000', // 1: Black (text 1)
            '#E7E6E6', // 2: Light gray (background 2)
            '#44546A', // 3: Dark blue (text 2)
            '#4472C4', // 4: Blue (accent 1)
            '#ED7D31', // 5: Orange (accent 2)
            '#A5A5A5', // 6: Gray (accent 3)
            '#FFC000', // 7: Yellow (accent 4)
            '#5B9BD5', // 8: Light blue (accent 5)
            '#70AD47'  // 9: Green (accent 6)
        ];
        
        const teamData = [];
        let headerRow = null;
        let teamColIndex = -1;
        let color1ColIndex = -1;
        let color2ColIndex = -1;
        
        teamSheet.eachRow((row, rowNumber) => {
            // First row is header
            if (rowNumber === 1) {
                headerRow = row;
                
                // Find column indices
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    const headerValue = cell.value ? String(cell.value) : '';
                    const normalizedHeader = normalizeColumnName(headerValue);
                    
                    if (normalizedHeader.includes('team')) {
                        teamColIndex = colNumber;
                    } else if (normalizedHeader.includes('color_1') || normalizedHeader.includes('color1')) {
                        color1ColIndex = colNumber;
                    } else if (normalizedHeader.includes('color_2') || normalizedHeader.includes('color2')) {
                        color2ColIndex = colNumber;
                    }
                });
                
                console.log('Header row:', row.values);
                console.log('Column indices - Team:', teamColIndex, 'Color1:', color1ColIndex, 'Color2:', color2ColIndex);
                return;
            }
            
            if (teamColIndex < 0) return; // Can't process without team column
            
            const rowData = {
                rowNumber,
                team: '',
                color1: '',
                color2: ''
            };
            
            // Get team name
            const teamCell = row.getCell(teamColIndex);
            rowData.team = teamCell.value ? String(teamCell.value) : '';
            
            if (!rowData.team) return; // Skip empty rows
            
            // Get Color 1
            if (color1ColIndex > 0) {
                const cell = row.getCell(color1ColIndex);
                rowData.color1 = extractCellColor(cell, themeColors);
            }
            
            // Get Color 2
            if (color2ColIndex > 0) {
                const cell = row.getCell(color2ColIndex);
                rowData.color2 = extractCellColor(cell, themeColors);
            }
            
            console.log('Loaded team:', rowData);
            teamData.push(rowData);
        });
        
        console.log('Team data loaded with colors:', teamData);
        return teamData;
        
    } catch (err) {
        console.error('Error loading team colors:', err);
        return [];
    }
};

const extractCellColor = (cell, themeColors) => {
    if (!cell.fill) return '';
    
    const fill = cell.fill;
    
    // Pattern fill
    if (fill.type === 'pattern' && fill.fgColor) {
        // ARGB color
        if (fill.fgColor.argb) {
            const argb = String(fill.fgColor.argb).toUpperCase();
            if (argb.length === 8) {
                return '#' + argb.substring(2);
            } else if (argb.length === 6) {
                return '#' + argb;
            }
        }
        
        // Theme color
        if (typeof fill.fgColor.theme !== 'undefined') {
            const themeIndex = fill.fgColor.theme;
            if (themeIndex >= 0 && themeIndex < themeColors.length) {
                let color = themeColors[themeIndex];
                
                // Apply tint if exists
                if (fill.fgColor.tint) {
                    color = applyTint(color, fill.fgColor.tint);
                }
                
                return color;
            }
        }
        
        // Indexed color (legacy)
        if (typeof fill.fgColor.indexed !== 'undefined') {
            // Use theme colors as fallback
            const idx = fill.fgColor.indexed % themeColors.length;
            return themeColors[idx];
        }
    }
    
    return '';
};

const applyTint = (hexColor, tint) => {
    // Simple tint application (lighter/darker)
    if (!hexColor || tint === 0) return hexColor;
    
    const rgb = hexToRgb(hexColor);
    if (!rgb) return hexColor;
    
    if (tint > 0) {
        // Lighten
        rgb.r = Math.round(rgb.r + (255 - rgb.r) * tint);
        rgb.g = Math.round(rgb.g + (255 - rgb.g) * tint);
        rgb.b = Math.round(rgb.b + (255 - rgb.b) * tint);
    } else {
        // Darken
        rgb.r = Math.round(rgb.r * (1 + tint));
        rgb.g = Math.round(rgb.g * (1 + tint));
        rgb.b = Math.round(rgb.b * (1 + tint));
    }
    
    return rgbToHex(rgb.r, rgb.g, rgb.b);
};

const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
};

const rgbToHex = (r, g, b) => {
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
};

const getTeamColorsFromSheet = (teamName) => {
    if (!teamSheetData.length || !teamName) return { color1: '', color2: '' };
    
    // Find team by name (case-insensitive)
    const teamRow = teamSheetData.find(row => 
        normalizeColumnName(row.team) === normalizeColumnName(teamName)
    );
    
    if (!teamRow) {
        console.log('Team not found in sheet:', teamName);
        return { color1: '', color2: '' };
    }
    
    console.log('Found team colors:', teamRow);
    return {
        color1: teamRow.color1 || '',
        color2: teamRow.color2 || ''
    };
};

const isFirebaseBlockHeader = (value) => {
    const text = cleanExcelText(value);
    if (text.startsWith('//') || text.startsWith('#')) return false;
    const lower = text.toLowerCase();
    return lower.includes('firebase') && lower.includes('config');
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

const parseFirebaseConfigFromJSON = (jsonString) => {
    // ลองแปลง JSON string ให้เป็น object ก่อน
    try {
        const cleaned = jsonString.trim();
        if (cleaned.startsWith('{')) {
            const config = JSON.parse(cleaned);
            return config;
        }
    } catch (e) {
        // ไม่ใช่ JSON ถูกต้อง ให้ลองแยกจาก inline format
    }
    
    // แยกจาก inline format: apiKey: "xxx", authDomain: "yyy", ...
    const configObj = {};
    
    // แยกด้วย comma ที่ไม่อยู่ใน quotes
    const parts = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString[i];
        
        if ((char === '"' || char === "'" || char === '`') && (i === 0 || jsonString[i-1] !== '\\')) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            }
            current += char;
        } else if (char === ',' && !inQuotes) {
            if (current.trim()) {
                parts.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    
    // แยกแต่ละ part เป็น key: value
    parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex < 0) return;
        
        const key = part.substring(0, colonIndex).trim();
        let value = part.substring(colonIndex + 1).trim();
        
        // ลบ quotes ออก
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('`') && value.endsWith('`'))) {
            value = value.substring(1, value.length - 1);
        }
        
        // หา normalized key ที่ตรงกับ FIREBASE_CONFIG_KEYS
        const normalizedKey = FIREBASE_CONFIG_KEYS.find(k => 
            normalizeMetaKey(k) === normalizeMetaKey(key)
        );
        
        if (normalizedKey && value) {
            configObj[normalizedKey] = value;
        }
    });
    
    return Object.keys(configObj).length ? configObj : null;
};

const parseFirebaseSaveTargets = (workbook) => {
    const sheetName = workbook.SheetNames.find(isFirebaseConfigSheetName);
    if (!sheetName) return [];

    const rows = getSheetRows(workbook, sheetName);
    if (!rows.length) return [];

    // ตรวจสอบรูปแบบของ Excel
    const firstRow = rows[0];
    const firstCell = cleanExcelText(firstRow[0]);
    const secondCell = cleanExcelText(firstRow[1]);
    
    // ตรวจสอบว่าเป็นรูปแบบ "แต่ละ row เป็น 1 บรรทัดของ JavaScript code"
    const isMultilineFormat = (
        firstCell.includes('League Name') && 
        !secondCell && 
        rows.length > 3 &&
        rows.some(r => cleanExcelText(r[0]).includes('const') || cleanExcelText(r[0]).includes('firebaseConfig'))
    );
    
    if (isMultilineFormat) {
        // รูปแบบ: แต่ละ row เป็น 1 บรรทัด ต้องรวม rows เข้าด้วยกัน
        return parseFirebaseSaveTargetsMultilineFormat(rows);
    }
    
    // ตรวจสอบว่า row แรกเป็น header หรือเป็นข้อมูลเลย
    const firstCellNormalized = normalizeMetaKey(firstCell);
    const isHeaderRow = (
        firstCellNormalized === 'leaguename' ||
        firstCellNormalized === 'name' ||
        firstCellNormalized === 'league' ||
        (firstCellNormalized.includes('league') && firstCellNormalized.includes('name'))
    );
    
    const secondCellHasData = secondCell.includes('const') || 
                              secondCell.includes('firebase') || 
                              secondCell.includes('{') ||
                              secondCell.includes('apiKey');
    
    if (isHeaderRow && !secondCellHasData) {
        return parseFirebaseSaveTargetsNewFormat(rows);
    } else if (secondCellHasData) {
        return parseFirebaseSaveTargetsNewFormatNoHeader(rows);
    } else {
        return parseFirebaseSaveTargetsOldFormat(rows);
    }
};

const parseFirebaseSaveTargetsMultilineFormat = (rows) => {
    console.log('=== Parsing Firebase Config (Multiline Format) ===');
    console.log('Total rows:', rows.length);
    
    const targets = [];
    let currentLeague = null;
    let currentConfigLines = [];
    let inConfigBlock = false;
    
    for (let i = 0; i < rows.length; i++) {
        const line = cleanExcelText(rows[i][0]);
        
        // ข้าม row ว่างและ comments
        if (!line || line.startsWith('//') || line.startsWith('#')) {
            continue;
        }
        
        // ตรวจจับ League Name
        if (line.includes('League Name') && line.includes('"')) {
            // แยก League Name ออกมา: League Name "VAR SuperLeague 38+"
            const match = line.match(/["']([^"']+)["']/);
            console.log('League Name line:', line);
            console.log('Regex match:', match);
            if (match) {
                // ถ้ามี config block ก่อนหน้า ให้ประมวลผลก่อน
                if (currentLeague && currentConfigLines.length > 0) {
                    const config = parseFirebaseConfigFromMultiline(currentConfigLines);
                    if (config) {
                        const missingKeys = FIREBASE_REQUIRED_CONFIG_KEYS.filter(key => !config[key]);
                        if (missingKeys.length === 0) {
                            targets.push({
                                id: makeSaveTargetId(currentLeague, `firebase-${targets.length + 1}`),
                                index: targets.length,
                                name: currentLeague,
                                firebaseConfig: config
                            });
                            console.log('✓ Added target:', currentLeague);
                        } else {
                            console.log('⚠️ Skipped:', currentLeague, '- Missing keys:', missingKeys);
                        }
                    }
                }
                
                // เริ่ม league ใหม่
                currentLeague = match[1];
                currentConfigLines = [];
                inConfigBlock = false;
                console.log('\nFound league:', currentLeague);
            }
            continue;
        }
        
        // ตรวจจับจุดเริ่มต้น config block
        if (line.includes('const') && line.includes('firebaseConfig')) {
            inConfigBlock = true;
            currentConfigLines = [line];
            continue;
        }
        
        // รวบรวมบรรทัดของ config
        if (inConfigBlock) {
            currentConfigLines.push(line);
            
            // ตรวจจับจุดสิ้นสุด config block
            if (line.includes('};') || (line.includes('}') && line.includes(';'))) {
                inConfigBlock = false;
            }
        }
    }
    
    // ประมวลผล config block สุดท้าย
    if (currentLeague && currentConfigLines.length > 0) {
        const config = parseFirebaseConfigFromMultiline(currentConfigLines);
        if (config) {
            const missingKeys = FIREBASE_REQUIRED_CONFIG_KEYS.filter(key => !config[key]);
            if (missingKeys.length === 0) {
                targets.push({
                    id: makeSaveTargetId(currentLeague, `firebase-${targets.length + 1}`),
                    index: targets.length,
                    name: currentLeague,
                    firebaseConfig: config
                });
                console.log('✓ Added target:', currentLeague);
            } else {
                console.log('⚠️ Skipped:', currentLeague, '- Missing keys:', missingKeys);
            }
        }
    }
    
    console.log(`\n=== Total targets found: ${targets.length} ===\n`);
    return targets;
};

const parseFirebaseConfigFromMultiline = (lines) => {
    // รวมทุกบรรทัดเข้าด้วยกัน
    const fullText = lines.join('\n');
    
    // ใช้ฟังก์ชันที่มีอยู่แล้ว
    return parseFirebaseConfigFromJavaScript(fullText);
};

const parseFirebaseSaveTargetsNewFormatNoHeader = (rows) => {
    const targets = [];
    
    console.log('=== Parsing Firebase Config (No Header Format) ===');
    
    // วนลูปทุก row (ไม่มี header ดังนั้นเริ่มจาก 0)
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const leagueName = cleanExcelText(row[0]);
        const configText = cleanExcelText(row[1]);
        
        console.log(`\n--- Processing Row ${i + 1} ---`);
        console.log('League Name:', leagueName);
        console.log('Config Text (first 150 chars):', configText.substring(0, 150));
        
        if (!leagueName || !configText) {
            console.log('⚠️ Skipped: Empty league name or config');
            continue;
        }
        
        const config = parseFirebaseConfigFromJavaScript(configText);
        console.log('Parsed config keys:', config ? Object.keys(config) : 'null');
        
        if (!config) {
            console.log('⚠️ Skipped: Could not parse Firebase config');
            continue;
        }
        
        // ตรวจสอบว่ามี required fields ครบหรือไม่
        const missingKeys = FIREBASE_REQUIRED_CONFIG_KEYS.filter(key => !config[key]);
        const hasAllRequired = missingKeys.length === 0;
        
        if (!hasAllRequired) {
            console.log('⚠️ Skipped: Missing required keys:', missingKeys);
            continue;
        }
        
        const id = makeSaveTargetId(leagueName, `firebase-${i + 1}`);
        targets.push({
            id,
            index: i,
            name: leagueName,
            firebaseConfig: config
        });
        
        console.log('✓ Added target:', id);
    }
    
    console.log(`\n=== Total targets found: ${targets.length} ===\n`);
    return targets;
};

const parseFirebaseConfigFromJavaScript = (jsCode) => {
    // รูปแบบใน Excel: const firebaseConfig = { apiKey: "xxx", ... };
    
    // ลบ const, firebaseConfig, = ออก
    let cleaned = jsCode
        .replace(/const\s+/gi, '')
        .replace(/firebaseConfig\s*=/gi, '')
        .replace(/var\s+/gi, '')
        .replace(/let\s+/gi, '')
        .trim();
    
    // ลบ semicolon ตัวสุดท้าย
    if (cleaned.endsWith(';')) {
        cleaned = cleaned.substring(0, cleaned.length - 1).trim();
    }
    
    // ตอนนี้ควรเหลือแค่ { ... }
    // ลองแปลงเป็น JSON ก่อน
    try {
        // แปลง JavaScript object notation เป็น JSON
        // แทนที่ key ที่ไม่มี quotes ด้วย key ที่มี quotes
        const jsonString = cleaned.replace(/(\w+):/g, '"$1":');
        const config = JSON.parse(jsonString);
        return config;
    } catch (e) {
        console.log('JSON parse failed, trying manual extraction');
    }
    
    // ถ้า JSON.parse ไม่ได้ ให้แยกด้วยมือ
    // หา { และ }
    const startBrace = cleaned.indexOf('{');
    const endBrace = cleaned.lastIndexOf('}');
    
    if (startBrace < 0 || endBrace < 0) {
        console.log('No braces found in config text');
        return null;
    }
    
    const innerContent = cleaned.substring(startBrace + 1, endBrace);
    
    const configObj = {};
    const parts = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    let depth = 0;
    
    // แยกด้วย comma แต่ไม่แยกถ้าอยู่ใน quotes หรือ nested braces
    for (let i = 0; i < innerContent.length; i++) {
        const char = innerContent[i];
        
        if ((char === '"' || char === "'" || char === '`') && (i === 0 || innerContent[i-1] !== '\\')) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
                quoteChar = '';
            }
            current += char;
        } else if ((char === '{' || char === '[') && !inQuotes) {
            depth++;
            current += char;
        } else if ((char === '}' || char === ']') && !inQuotes) {
            depth--;
            current += char;
        } else if (char === ',' && !inQuotes && depth === 0) {
            if (current.trim()) {
                parts.push(current.trim());
            }
            current = '';
        } else {
            current += char;
        }
    }
    if (current.trim()) {
        parts.push(current.trim());
    }
    
    // แยกแต่ละ part เป็น key: value
    parts.forEach(part => {
        const colonIndex = part.indexOf(':');
        if (colonIndex < 0) return;
        
        let key = part.substring(0, colonIndex).trim();
        let value = part.substring(colonIndex + 1).trim();
        
        // ลบ quotes ออกจาก key
        if ((key.startsWith('"') && key.endsWith('"')) ||
            (key.startsWith("'") && key.endsWith("'"))) {
            key = key.substring(1, key.length - 1);
        }
        
        // ลบ quotes ออกจาก value
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('`') && value.endsWith('`'))) {
            value = value.substring(1, value.length - 1);
        }
        
        // ลบ comma ตัวสุดท้าย (ถ้ามี)
        if (value.endsWith(',')) {
            value = value.substring(0, value.length - 1).trim();
        }
        
        // หา normalized key ที่ตรงกับ FIREBASE_CONFIG_KEYS
        const normalizedKey = FIREBASE_CONFIG_KEYS.find(k => 
            normalizeMetaKey(k) === normalizeMetaKey(key)
        );
        
        if (normalizedKey && value) {
            configObj[normalizedKey] = value;
        }
    });
    
    return Object.keys(configObj).length ? configObj : null;
};

const parseFirebaseSaveTargetsNewFormat = (rows) => {
    const headers = rows[0].map(cell => cleanExcelText(cell));
    
    // หา index ของ League Name และ Firebase config columns
    let nameColIndex = -1;
    let configColIndex = -1;
    
    headers.forEach((header, index) => {
        const normalized = normalizeMetaKey(header);
        // เพิ่มการตรวจสอบ "league" และ "name" แยกกัน
        if (normalized.includes('league') && normalized.includes('name')) {
            nameColIndex = index;
        } else if (normalized.includes('leaguename') || normalized === 'name' || normalized === 'league') {
            if (nameColIndex < 0) nameColIndex = index;
        }
        
        // เพิ่มการตรวจสอบ "firebase" และ "config" แยกกัน
        if (normalized.includes('firebase') && normalized.includes('config')) {
            configColIndex = index;
        } else if (normalized.includes('firebaseconfig') || normalized === 'firebase' || normalized === 'config') {
            if (configColIndex < 0) configColIndex = index;
        }
    });

    if (nameColIndex < 0 || configColIndex < 0) {
        console.warn('ไม่พบคอลัมน์ League Name หรือ Firebase config');
        console.warn('Headers found:', headers);
        console.warn('Normalized:', headers.map(h => normalizeMetaKey(h)));
        return [];
    }

    const targets = [];
    
    // วนลูป data rows (เริ่มจาก index 1)
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const leagueName = cleanExcelText(row[nameColIndex]);
        const configText = cleanExcelText(row[configColIndex]);
        
        console.log(`\n--- Processing Row ${i} ---`);
        console.log('League Name:', leagueName);
        console.log('Config Text (first 100 chars):', configText.substring(0, 100));
        
        if (!leagueName || !configText) {
            console.log('⚠️ Skipped: Empty league name or config');
            continue;
        }
        
        const config = parseFirebaseConfigFromJSON(configText);
        console.log('Parsed config keys:', config ? Object.keys(config) : 'null');
        
        if (!config) {
            console.log('⚠️ Skipped: Could not parse Firebase config');
            continue;
        }
        
        // ตรวจสอบว่ามี required fields ครบหรือไม่
        const missingKeys = FIREBASE_REQUIRED_CONFIG_KEYS.filter(key => !config[key]);
        const hasAllRequired = missingKeys.length === 0;
        
        if (!hasAllRequired) {
            console.log('⚠️ Skipped: Missing required keys:', missingKeys);
            continue;
        }
        
        const id = makeSaveTargetId(leagueName, `firebase-${i}`);
        targets.push({
            id,
            index: i - 1,
            name: leagueName,
            firebaseConfig: config
        });
        
        console.log('✓ Added target:', id);
    }
    
    console.log(`\n=== Total targets found: ${targets.length} ===\n`);
    return targets;
};

const parseFirebaseSaveTargetsOldFormat = (rows) => {
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

// --- Hotkey bridge จาก OBS Hotkeys ผ่าน BroadcastCustomEvent ---
const HOTKEY_ACTION_TO_BUTTON = {
    play1: 'play1Btn',
    halfpause: 'halfpauseBtn',
    play2: 'play2Btn',
    fullend: 'fullEndBtn',
    swap: 'swapBtn',
    scoreAplus: 'scoreAPlusBtn',
    scoreAminus: 'scoreAMinusBtn',
    scoreBplus: 'scoreBPlusBtn',
    scoreBminus: 'scoreBMinusBtn',
    hidetimer: 'hidetimer'
};

// ลงทะเบียน event listener สำหรับ CustomEvent
obs.on('CustomEvent', (eventData) => {
    console.log('[Hotkey Bridge] Raw event received:', eventData);
    
    // obs-websocket v5 ส่งมาเป็น { eventData: { ... } }
    const data = eventData.eventData || eventData;
    console.log('[Hotkey Bridge] Extracted data:', data);
    
    const action = data.action;
    console.log('[Hotkey Bridge] Action:', action);
    
    const btnId = HOTKEY_ACTION_TO_BUTTON[action];
    console.log('[Hotkey Bridge] Button ID:', btnId);
    
    if (btnId) {
        const btn = document.getElementById(btnId);
        console.log('[Hotkey Bridge] Button element:', btn);
        if (btn) {
            console.log('[Hotkey Bridge] Clicking button:', btnId);
            btn.click();
        } else {
            console.error('[Hotkey Bridge] Button not found:', btnId);
        }
    } else {
        console.warn('[Hotkey Bridge] Unknown action:', action, 'from data:', data);
    }
});
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
    if (elements.teamSelectPopup) elements.teamSelectPopup.style.display = 'none';
    if (elements.manageDatabasePopup) elements.manageDatabasePopup.style.display = 'none';
    if (elements.editMatchPopup) elements.editMatchPopup.style.display = 'none';
    if (elements.presetTimePopup) elements.presetTimePopup.style.display = 'none';
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

    // Try to get colors from Team sheet first, then fallback to saved or default
    const teamASheetColors = getTeamColorsFromSheet(teamAName);
    const teamBSheetColors = getTeamColorsFromSheet(teamBName);
    
    const savedA = getTeamColors(teamAName);
    const savedB = getTeamColors(teamBName);
    
    // Priority: Team Sheet > Saved > Default
    const colorA1 = teamASheetColors.color1 || savedA.color1 || '#ffffff';
    const colorB1 = teamBSheetColors.color1 || savedB.color1 || '#ffffff';
    const colorA2 = teamASheetColors.color2 || savedA.color2 || '#000000';
    const colorB2 = teamBSheetColors.color2 || savedB.color2 || '#000000';

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
    timer = 0; // Always start at 0:00 for first half
    if (interval) return;
    interval = setInterval(() => {
        timer++;
        updateTimerDisplay();
    }, 1000);
};

const startTimer2 = () => {
    half = '2nd';
    elements.halfText.textContent = half;
    setText('half_text', half);
    timer = countdownStartTime; // Start at preset time for second half
    if (interval) return;
    interval = setInterval(() => {
        timer++;
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
    timer = 0; 
    updateTimerDisplay();
};

const resetToZero = () => {
    stopTimer();
    timer = 0;
    updateTimerDisplay();
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
        button.title = `${target.name}\n${target.firebaseConfig.databaseURL || ''}`;
        button.append(`บันทึกข้อมูลแมทต์ ${target.name}`);
        icon.className = 'fas fa-save';
        button.appendChild(icon);
        button.addEventListener('click', () => saveMatchResult(target));
        elements.matchSaveButtons.appendChild(button);
    });
};


const openTimeSettings = () => {
    // Function removed - Time settings no longer available
};

const validateAndGetTime = () => {
    // Function removed - Time settings no longer available
    return null;
}

const saveTimeSettings = () => {
    // Function removed - Time settings no longer available
};

const saveAndUpdateTime = () => {
    // Function removed - Time settings no longer available
}


const toggleHalf = () => {
    half = half === '1st' ? '2nd' : '1st';
    elements.halfText.textContent = half;
    setText('half_text', half);
};

// --- PRESET TIME FUNCTIONS ---
const openPresetTimePopup = () => {
    openPopup(elements.presetTimePopup);
};

const handlePresetTimeSelect = (seconds) => {
    // Save to localStorage
    localStorage.setItem('countdownStartTime', seconds);
    countdownStartTime = seconds;
    
    // Calculate minutes for display
    const minutes = Math.floor(seconds / 60);
    const displayText = minutes === 0 ? '0 นาที' : `${minutes} นาที`;
    
    // Close popup
    closeAllPopups();
    
    // Show toast notification
    showToast(`ตั้งเวลาเริ่มต้นเป็น ${displayText} แล้ว`, 'success');
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

const buildOverlayUrl = (view = 'table', date = 'all') => {
    const selectedLeague = getSelectedQuickLeague();
    const url = new URL('overlay.html', window.location.href);
    url.searchParams.set('league', selectedLeague?.id || 'var');
    url.searchParams.set('view', view);

    if (selectedLeague?.source === 'excel') {
        url.searchParams.set('title', selectedLeague.name);
        url.searchParams.set('fb', encodeFirebaseConfigParam(selectedLeague.firebaseConfig));
    }

    if (date && date !== 'all') url.searchParams.set('date', date);
    return url.href;
};

const openControlPanelPopup = () => {
    const savedLeague = localStorage.getItem('quickOverlayLeague');
    populateQuickSetup(savedLeague);
    openPopup(elements.controlPanelPopup);
};

const copyLeagueTableUrl = () => {
    const url = buildOverlayUrl('table', 'all');
    navigator.clipboard.writeText(url)
        .then(() => showToast(translations[currentLang].toastCopied || 'Copied!', 'info'))
        .catch(() => showToast(translations[currentLang].toastCopyFailed || 'Copy failed!', 'error'));
};

const copyAllScoresUrl = () => {
    const url = buildOverlayUrl('results', 'all');
    navigator.clipboard.writeText(url)
        .then(() => showToast(translations[currentLang].toastCopied || 'Copied!', 'info'))
        .catch(() => showToast(translations[currentLang].toastCopyFailed || 'Copy failed!', 'error'));
};

const copyLiveTickerUrl = () => {
    const url = buildOverlayUrl('ticker', 'today');
    navigator.clipboard.writeText(url)
        .then(() => showToast(translations[currentLang].toastCopied || 'Copied!', 'info'))
        .catch(() => showToast(translations[currentLang].toastCopyFailed || 'Copy failed!', 'error'));
};

const handleExcel = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls';
    input.onchange = async e => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            // Use XLSX for main data
            const reader = new FileReader();
            reader.onload = async event => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = getMatchDataSheetName(workbook);
                    sheetData = getSheetRows(workbook, sheetName);
                    mergeExcelMapping(getHeaders());
                    
                    matchSaveTargets = parseFirebaseSaveTargets(workbook);

                    // Get league name from Excel Firebase target or fallback to Excel file name
                    console.log('Match Save Targets:', matchSaveTargets);
                    
                    let leagueName;
                    if (matchSaveTargets.length > 0) {
                        if (matchSaveTargets.length === 1) {
                            leagueName = matchSaveTargets[0].name;
                        } else {
                            leagueName = `${matchSaveTargets[0].name} (+${matchSaveTargets.length - 1} more)`;
                        }
                        console.log('Selected league name:', leagueName);
                    } else {
                        leagueName = file.name.replace(/\.[^/.]+$/, "");
                    }
                    
                    if (elements.leagueNameDisplay) {
                        elements.leagueNameDisplay.textContent = leagueName;
                    }
                    document.title = `${leagueName} - Scoreboard Controller`;

                    renderMatchSaveButtons(matchSaveTargets.length ? undefined : 'ไม่พบ Firebase config ใน Excel');
                    populateQuickSetup(localStorage.getItem('quickOverlayLeague'));
                    
                    const saveTargetMessage = matchSaveTargets.length
                        ? `สร้างปุ่มบันทึก ${matchSaveTargets.length} ลีกแล้ว`
                        : `ไม่พบชีต ${FIREBASE_CONFIG_SHEET_NAME}`;
                    showToast(`${translations[currentLang].toastSuccess} - Excel mapping is ready - ${saveTargetMessage}`, matchSaveTargets.length ? 'success' : 'info');
                } catch (err) {
                    showToast(err.message, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
            
            // Use ExcelJS for Team sheet colors (runs in parallel)
            teamSheetData = await loadTeamSheetWithColors(file);
            
            // Auto load/apply the match after Team sheet is loaded
            setTimeout(() => applyMatch(), 100);
            
        } catch (err) {
            showToast(err.message, 'error');
        }
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


const getSheetValue = (row, header, fieldKey) => {
    const columnName = excelMapping[fieldKey];
    if (!columnName) return '';
    const index = header.indexOf(columnName);
    return index >= 0 ? (row[index] ?? '') : '';
};

const getTeamsFromExcel = () => {
    if (!sheetData.length) return [];
    const header = sheetData[0].map(cell => String(cell || '').trim());
    const teams = new Map();

    const addTeam = (row, side) => {
        const name = String(getSheetValue(row, header, `team${side}`)).trim();
        if (!name) return;

        const key = name.toLocaleLowerCase();
        const current = teams.get(key) || { name, logo: '', color1: '', color2: '' };
        
        const logo = String(getSheetValue(row, header, `logo${side}`)).trim();
        const color1 = String(getSheetValue(row, header, `color${side}`)).trim();
        const color2 = String(getSheetValue(row, header, `color${side}2`)).trim();

        teams.set(key, {
            name: current.name,
            logo: current.logo || logo,
            color1: current.color1 || color1,
            color2: current.color2 || color2
        });
    };

    sheetData.slice(1).forEach(row => {
        addTeam(row, 'A');
        addTeam(row, 'B');
    });

    return Array.from(teams.values()).sort((a, b) => a.name.localeCompare(b.name, 'th'));
};

const renderTeamSelectList = () => {
    const query = elements.teamSelectSearch.value.trim().toLocaleLowerCase();
    const teams = getTeamsFromExcel().filter(team => team.name.toLocaleLowerCase().includes(query));
    
    elements.teamSelectList.innerHTML = '';

    if (!teams.length) {
        const empty = document.createElement('div');
        empty.className = 'team-select-empty';
        empty.textContent = query ? 'ไม่พบทีมที่ค้นหา' : 'ไม่พบรายชื่อทีมในไฟล์ Excel';
        elements.teamSelectList.appendChild(empty);
        return;
    }

    teams.forEach(teamInfo => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'team-select-item';

        const logo = document.createElement('span');
        logo.className = 'team-select-logo';
        logo.textContent = getTeamInitials(teamInfo.name);

        if (teamInfo.logo) {
            const hasExt = /\.(png|jpe?g|gif|webp)$/i.test(teamInfo.logo);
            const img = document.createElement('img');
            img.src = `file:///${logoFolderPath}/${teamInfo.logo}${hasExt ? '' : '.png'}`;
            img.onerror = () => { img.style.display = 'none'; };
            img.onload = () => { logo.textContent = ''; };
            logo.appendChild(img);
        }

        const name = document.createElement('span');
        name.className = 'team-select-name';
        name.textContent = teamInfo.name;

        btn.append(logo, name);
        btn.addEventListener('click', () => applyTeamSelection(teamSelectTarget, teamInfo));
        elements.teamSelectList.appendChild(btn);
    });
};

const applyTeamSelection = (target, teamInfo) => {
    const previousLogo = target === 'A' ? currentLogoA : currentLogoB;
    const logoFile = teamInfo.logo || previousLogo;

    if (target === 'A') {
        currentLogoA = logoFile;
    } else {
        currentLogoB = logoFile;
    }

    updateTeamUI(
        target,
        teamInfo.name,
        logoFile,
        teamInfo.color1 || '#ffffff',
        teamInfo.color2 || '#000000'
    );

    closeAllPopups();
    showToast(`เลือกทีม ${teamInfo.name} แล้ว`, 'success');
};

const openTeamSelector = (target) => {
    if (!elements.teamSelectPopup) {
        enterEditMode(target);
        return;
    }

    if (!sheetData.length) {
        showToast(translations[currentLang].toastLoadFileFirst, 'error');
        return;
    }

    teamSelectTarget = target;
    elements.teamSelectTitle.textContent = target === 'A' ? 'เลือกทีม A' : 'เลือกทีม B';
    elements.teamSelectSearch.value = '';
    renderTeamSelectList();
    openPopup(elements.teamSelectPopup);
    setTimeout(() => elements.teamSelectSearch.focus(), 0);
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

// --- DATABASE MANAGEMENT ---
const openManageDatabasePopup = () => {
    openPopup(elements.manageDatabasePopup);
    loadDatabaseMatches();
};

const loadDatabaseMatches = () => {
    const selectedLeague = getSelectedQuickLeague();
    if (!selectedLeague) {
        showToast('กรุณาเลือก League ก่อน', 'error');
        return;
    }

    elements.databaseLoadingStatus.style.display = 'block';
    elements.databaseTableBody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center;">กำลังโหลด...</td></tr>';

    try {
        const targetDatabase = getDatabase(getOrCreateFirebaseApp(selectedLeague));
        const matchesRef = ref(targetDatabase, 'matches');

        onValue(matchesRef, (snapshot) => {
            const data = snapshot.val();
            currentDatabaseMatches = [];

            if (data) {
                Object.keys(data).forEach(key => {
                    currentDatabaseMatches.push({
                        id: key,
                        ...data[key]
                    });
                });
            }

            // Sort by date (newest first)
            currentDatabaseMatches.sort((a, b) => {
                const dateA = new Date(a.date || '1970-01-01');
                const dateB = new Date(b.date || '1970-01-01');
                return dateB - dateA;
            });

            elements.databaseLoadingStatus.style.display = 'none';
            renderDatabaseTable();
        }, (error) => {
            elements.databaseLoadingStatus.style.display = 'none';
            showToast('เกิดข้อผิดพลาด: ' + error.message, 'error');
            elements.databaseTableBody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: var(--danger-color);">เกิดข้อผิดพลาด: ${error.message}</td></tr>`;
        });
    } catch (err) {
        elements.databaseLoadingStatus.style.display = 'none';
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
        elements.databaseTableBody.innerHTML = `<tr><td colspan="6" style="padding: 30px; text-align: center; color: var(--danger-color);">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
};

const renderDatabaseTable = () => {
    const searchTerm = elements.databaseSearchInput.value.toLowerCase().trim();
    const filterDate = elements.databaseFilterDate.value;

    let filteredMatches = [...currentDatabaseMatches];

    // Filter by search term
    if (searchTerm) {
        filteredMatches = filteredMatches.filter(match => {
            const teamA = (match.teamA || '').toLowerCase();
            const teamB = (match.teamB || '').toLowerCase();
            const round = (match.roundLabel || '').toLowerCase();
            return teamA.includes(searchTerm) || teamB.includes(searchTerm) || round.includes(searchTerm);
        });
    }

    // Filter by date
    if (filterDate !== 'all') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        filteredMatches = filteredMatches.filter(match => {
            const matchDate = new Date(match.date || '1970-01-01');
            matchDate.setHours(0, 0, 0, 0);

            if (filterDate === 'today') {
                return matchDate.getTime() === today.getTime();
            } else if (filterDate === 'week') {
                const weekAgo = new Date(today);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return matchDate >= weekAgo && matchDate <= today;
            } else if (filterDate === 'month') {
                const monthAgo = new Date(today);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return matchDate >= monthAgo && matchDate <= today;
            }
            return true;
        });
    }

    if (filteredMatches.length === 0) {
        elements.databaseTableBody.innerHTML = '<tr><td colspan="6" style="padding: 30px; text-align: center; color: var(--text-muted-color);">ไม่พบข้อมูล</td></tr>';
        return;
    }

    elements.databaseTableBody.innerHTML = filteredMatches.map(match => {
        const date = match.date ? new Date(match.date).toLocaleDateString('th-TH') : '-';
        const teamA = match.teamA || '-';
        const teamB = match.teamB || '-';
        const scoreA = match.scoreA ?? '-';
        const scoreB = match.scoreB ?? '-';
        const round = match.roundLabel || '-';

        return `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px;">${date}</td>
                <td style="padding: 10px;">${teamA}</td>
                <td style="padding: 10px; text-align: center; font-weight: bold; font-size: 1.1rem;">${scoreA} - ${scoreB}</td>
                <td style="padding: 10px;">${teamB}</td>
                <td style="padding: 10px; text-align: center;">${round}</td>
                <td style="padding: 10px; text-align: center;">
                    <button class="btn-primary" style="padding: 4px 8px; margin-right: 5px;" onclick="editDatabaseMatch('${match.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-danger" style="padding: 4px 8px;" onclick="deleteDatabaseMatch('${match.id}', '${teamA}', '${teamB}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
};

window.editDatabaseMatch = (matchId) => {
    const match = currentDatabaseMatches.find(m => m.id === matchId);
    if (!match) return;

    currentEditingMatch = match;

    elements.editMatchDate.value = match.date || '';
    elements.editMatchTeamA.value = match.teamA || '';
    elements.editMatchScoreA.value = match.scoreA ?? 0;
    elements.editMatchTeamB.value = match.teamB || '';
    elements.editMatchScoreB.value = match.scoreB ?? 0;
    elements.editMatchRound.value = match.roundLabel || '';
    elements.editMatchUrl.value = match.url || '';

    openPopup(elements.editMatchPopup);
};

window.deleteDatabaseMatch = (matchId, teamA, teamB) => {
    if (!confirm(`ต้องการลบแมตช์ ${teamA} vs ${teamB} ใช่หรือไม่?`)) return;

    const selectedLeague = getSelectedQuickLeague();
    if (!selectedLeague) return;

    try {
        const targetDatabase = getDatabase(getOrCreateFirebaseApp(selectedLeague));
        const matchRef = ref(targetDatabase, `matches/${matchId}`);

        remove(matchRef)
            .then(() => {
                showToast('ลบข้อมูลสำเร็จ', 'success');
                loadDatabaseMatches();
            })
            .catch(err => {
                showToast('ลบข้อมูลไม่สำเร็จ: ' + err.message, 'error');
            });
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
};

const saveMatchEdit = () => {
    if (!currentEditingMatch) return;

    const selectedLeague = getSelectedQuickLeague();
    if (!selectedLeague) return;

    const updatedData = {
        date: elements.editMatchDate.value,
        teamA: elements.editMatchTeamA.value,
        scoreA: parseInt(elements.editMatchScoreA.value, 10) || 0,
        teamB: elements.editMatchTeamB.value,
        scoreB: parseInt(elements.editMatchScoreB.value, 10) || 0,
        roundLabel: elements.editMatchRound.value,
        url: elements.editMatchUrl.value
    };

    try {
        const targetDatabase = getDatabase(getOrCreateFirebaseApp(selectedLeague));
        const matchRef = ref(targetDatabase, `matches/${currentEditingMatch.id}`);

        update(matchRef, updatedData)
            .then(() => {
                showToast('บันทึกข้อมูลสำเร็จ', 'success');
                closeAllPopups();
                openPopup(elements.manageDatabasePopup);
                loadDatabaseMatches();
            })
            .catch(err => {
                showToast('บันทึกข้อมูลไม่สำเร็จ: ' + err.message, 'error');
            });
    } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
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
    // Injury Time, Reset, and Countdown buttons removed
    elements.settingsBtn.addEventListener('click', () => { elements.detailsText.value = localStorage.getItem('detailsText') || ''; openPopup(elements.detailsPopup); });
    elements.copyBtn.addEventListener('click', copyDetails);
    elements.helpBtn.addEventListener('click', () => openPopup(elements.helpPopup));
    elements.donateBtn.addEventListener('click', () => openPopup(elements.donatePopup));
    elements.changelogBtn.addEventListener('click', () => openPopup(elements.changelogPopup));
    elements.controlPanelBtn.addEventListener('click', openControlPanelPopup);
    elements.popupOverlay.addEventListener('click', closeAllPopups);

    // Database Management
    if (elements.manageDatabaseBtn) {
        elements.manageDatabaseBtn.addEventListener('click', openManageDatabasePopup);
    }
    if (elements.closeDatabasePopupBtn) {
        elements.closeDatabasePopupBtn.addEventListener('click', closeAllPopups);
    }
    if (elements.refreshDatabaseBtn) {
        elements.refreshDatabaseBtn.addEventListener('click', loadDatabaseMatches);
    }
    if (elements.databaseSearchInput) {
        elements.databaseSearchInput.addEventListener('input', renderDatabaseTable);
    }
    if (elements.databaseFilterDate) {
        elements.databaseFilterDate.addEventListener('change', renderDatabaseTable);
    }
    if (elements.saveMatchEditBtn) {
        elements.saveMatchEditBtn.addEventListener('click', saveMatchEdit);
    }
    if (elements.cancelMatchEditBtn) {
        elements.cancelMatchEditBtn.addEventListener('click', () => {
            closeAllPopups();
            openPopup(elements.manageDatabasePopup);
        });
    }

    // Preset Time
    if (elements.adjustTimeBtn) {
        elements.adjustTimeBtn.addEventListener('click', openPresetTimePopup);
    }
    if (elements.closePresetTimeBtn) {
        elements.closePresetTimeBtn.addEventListener('click', closeAllPopups);
    }
    // Add event listeners for all preset time buttons
    document.querySelectorAll('.preset-time-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const seconds = parseInt(e.currentTarget.getAttribute('data-seconds'), 10);
            handlePresetTimeSelect(seconds);
        });
    });

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
    
    // Control Panel - Copy URL Buttons
    elements.copyLeagueTableUrlBtn.addEventListener('click', copyLeagueTableUrl);
    elements.copyAllScoresUrlBtn.addEventListener('click', copyAllScoresUrl);
    elements.copyLiveTickerUrlBtn.addEventListener('click', copyLiveTickerUrl);
    
    // Time Settings
    elements.saveTimeSettingsBtn.addEventListener('click', saveTimeSettings);
    elements.saveAndUpdateTimeBtn.addEventListener('click', saveAndUpdateTime);

    // Edit Name
    elements.editBtnA.addEventListener('click', () => openTeamSelector('A'));
    elements.okBtnA.addEventListener('click', () => exitEditMode('A', true));
    elements.editBtnB.addEventListener('click', () => openTeamSelector('B'));
    elements.okBtnB.addEventListener('click', () => exitEditMode('B', true));

    // Team Select Popup
    if (elements.teamSelectSearch) {
        elements.teamSelectSearch.addEventListener('input', renderTeamSelectList);
    }
    if (elements.closeTeamSelectBtn) {
        elements.closeTeamSelectBtn.addEventListener('click', closeAllPopups);
    }
    
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
    const savedPath = localStorage.getItem('logoFolderPath');
    if (savedPath) {
        logoFolderPath = savedPath;
    }
    elements.logoPathInput.value = logoFolderPath;
    elements.currentLogoPath.textContent = logoFolderPath;

    // Load saved countdown start time
    const savedTime = localStorage.getItem('countdownStartTime');
    if (savedTime) {
        countdownStartTime = parseInt(savedTime, 10);
        console.log('Loaded preset time:', countdownStartTime, 'seconds');
    }

    setupEventListeners();
    setLanguage(savedLang);
    renderMatchSaveButtons();
    resetToZero(); 
    resetScore();
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
