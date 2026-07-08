import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-app.js';
import {
    getDatabase,
    ref,
    onValue,
    query,
    orderByChild,
    equalTo,
    limitToLast
} from 'https://www.gstatic.com/firebasejs/9.22.1/firebase-database.js';

const params = new URLSearchParams(window.location.search);
const view = params.get('view') || params.get('type') || 'table';
document.body.classList.add(`view-${view}`);

const decodeUrlSafeBase64 = (value) => {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return atob(padded);
};

const parseFirebaseConfigParam = () => {
    const encoded = params.get('fb') || params.get('firebaseConfig');
    if (!encoded) return null;

    try {
        return JSON.parse(decodeUrlSafeBase64(encoded));
    } catch (err) {
        try {
            return JSON.parse(decodeURIComponent(encoded));
        } catch (fallbackErr) {
            return null;
        }
    }
};

const customFirebaseConfig = parseFirebaseConfigParam();

// Use only Excel-based Firebase config
if (!customFirebaseConfig) {
    document.body.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; 
                    font-family: sans-serif; text-align: center; padding: 20px; color: #ef4444;">
            <div>
                <h1 style="font-size: 2rem; margin-bottom: 1rem;">⚠️ ไม่พบ Firebase Config</h1>
                <p style="font-size: 1.2rem; color: #cbd5e1;">กรุณาใช้ URL ที่สร้างจาก Control Panel ใน index.html</p>
                <p style="font-size: 0.9rem; color: #94a3b8; margin-top: 1rem;">
                    URL ต้องมี parameter <code style="background: #1e293b; padding: 2px 6px; border-radius: 4px;">fb=...</code>
                </p>
            </div>
        </div>
    `;
    throw new Error('Firebase config is required');
}

const league = {
    id: params.get('league') || customFirebaseConfig.projectId || 'excel',
    name: params.get('title') || customFirebaseConfig.projectId || 'Excel League',
    logo: params.get('logo') || '',
    background: params.get('background') || '',
    firebaseConfig: customFirebaseConfig
};

const title = params.get('title') || league.name;
const dateParam = params.get('date');
const limit = Number.parseInt(params.get('limit') || '80', 10);
const showHeader = params.get('header') !== '0';
const defaultLogo = params.get('defaultLogo') || 'images/logo.png';

const header = document.getElementById('header');
const content = document.getElementById('content');

const appName = `overlay-${String(league.id).replace(/[^A-Za-z0-9_-]/g, '_')}-${Date.now()}`;
const app = initializeApp(league.firebaseConfig, appName);
const db = getDatabase(app);

const normalizeDate = (value) => {
    if (!value || value === 'all') return '';
    if (value === 'today') return new Date().toISOString().slice(0, 10);
    return value;
};

const selectedDate = normalizeDate(dateParam);

const clear = (node) => {
    while (node.firstChild) node.removeChild(node.firstChild);
};

const text = (value) => document.createTextNode(value == null ? '' : String(value));

const el = (tag, className, children = []) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    children.forEach((child) => {
        node.appendChild(typeof child === 'string' ? text(child) : child);
    });
    return node;
};

const logo = (teamName, className = 'logo') => {
    const img = document.createElement('img');
    img.className = className;
    img.alt = `${teamName || 'team'} logo`;
    img.src = `logos/${encodeURIComponent(teamName || '')}.png`;
    img.onerror = () => {
        img.onerror = null;
        img.src = defaultLogo;
    };
    return img;
};

const getMatchDate = (match) => match.date || 'ไม่ระบุวันที่';
const scoreNumber = (value) => Number.isFinite(Number(value)) ? Number(value) : 0;

const setHeader = () => {
    clear(header);
    header.style.display = showHeader ? 'flex' : 'none';
    if (!showHeader) return;

    if (league.logo) {
        const img = document.createElement('img');
        img.src = league.logo;
        img.alt = `${league.name} logo`;
        header.appendChild(img);
    }

    const h1 = document.createElement('h1');
    h1.textContent = title;
    header.appendChild(h1);
};

const setBackground = () => {
    if (!league.background || view === 'ticker') return;
    document.body.classList.add('with-bg');
    document.body.style.backgroundImage = `url("${league.background}")`;
};

const showStatus = (message) => {
    content.className = 'status';
    content.textContent = message;
};

const getMatchesRef = () => {
    const baseRef = ref(db, 'matches');
    if (view === 'ticker' && selectedDate) {
        return query(baseRef, orderByChild('date'), equalTo(selectedDate));
    }
    if (view === 'results' && Number.isFinite(limit) && limit > 0) {
        return query(baseRef, limitToLast(limit));
    }
    return baseRef;
};

const snapshotToMatches = (snapshot) => {
    const matches = [];
    snapshot.forEach((child) => {
        matches.push({ id: child.key, ...child.val() });
    });
    return matches;
};

const renderTable = (matches) => {
    const stats = {};

    matches.forEach((match) => {
        const teamA = (match.teamA || '').trim();
        const teamB = (match.teamB || '').trim();
        if (!teamA || !teamB) return;

        const scoreA = Number(match.scoreA);
        const scoreB = Number(match.scoreB);
        if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return;

        stats[teamA] ||= { team: teamA, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
        stats[teamB] ||= { team: teamB, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };

        const a = stats[teamA];
        const b = stats[teamB];

        a.P++;
        b.P++;
        a.GF += scoreA;
        a.GA += scoreB;
        b.GF += scoreB;
        b.GA += scoreA;

        if (scoreA > scoreB) {
            a.W++;
            a.Pts += 3;
            b.L++;
        } else if (scoreA < scoreB) {
            b.W++;
            b.Pts += 3;
            a.L++;
        } else {
            a.D++;
            b.D++;
            a.Pts++;
            b.Pts++;
        }
    });

    const rows = Object.values(stats)
        .map((row) => ({ ...row, GD: row.GF - row.GA }))
        .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team));

    if (!rows.length) return showStatus('ยังไม่มีข้อมูลการแข่งขัน');

    const table = el('table');
    const thead = el('thead');
    const headRow = el('tr');
    ['อันดับ', 'ทีม', 'แข่ง', 'ชนะ', 'เสมอ', 'แพ้', 'ได้', 'เสีย', 'ได้-เสีย', 'คะแนน'].forEach((label) => {
        headRow.appendChild(el('th', '', [label]));
    });
    thead.appendChild(headRow);

    const tbody = el('tbody');
    rows.forEach((row, index) => {
        const tr = el('tr');
        tr.appendChild(el('td', '', [String(index + 1)]));
        tr.appendChild(el('td', 'team-cell', [logo(row.team), text(row.team)]));
        ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].forEach((key) => {
            tr.appendChild(el('td', '', [String(row[key])]));
        });
        tbody.appendChild(tr);
    });

    table.append(thead, tbody);
    clear(content);
    content.className = '';
    content.appendChild(table);
};

const resultClass = (self, opponent) => {
    if (self > opponent) return 'win';
    if (self < opponent) return 'lose';
    return 'draw';
};

const renderResults = (matches) => {
    const filtered = selectedDate ? matches.filter((match) => getMatchDate(match) === selectedDate) : matches;
    if (!filtered.length) return showStatus('ยังไม่มีข้อมูลการแข่งขัน');

    // Group by date and week
    const groups = filtered.reduce((acc, match) => {
        const date = getMatchDate(match);
        let week = match.week || match.matchday || match.round;
        
        // If no week field, use date to determine week
        if (!week && match.date) {
            const uniqueDates = [...new Set(matches.map(m => m.date).filter(Boolean))].sort();
            const dateIndex = uniqueDates.indexOf(match.date);
            week = dateIndex >= 0 ? `${dateIndex + 1}` : '1';
        } else if (!week) {
            week = '1';
        }
        
        // Extract number from week string
        const weekNum = String(week).match(/\d+/)?.[0] || week;
        
        // Create a composite key: date + week
        const key = `${date}|||${weekNum}`;
        
        acc[key] ||= [];
        acc[key].push(match);
        return acc;
    }, {});

    const wrapper = el('section', 'results');

    // Sort by week number (ascending: 1, 2, 3...)
    Object.keys(groups).sort((a, b) => {
        const weekA = parseInt(a.split('|||')[1]) || 0;
        const weekB = parseInt(b.split('|||')[1]) || 0;
        if (weekA !== weekB) return weekA - weekB;
        // If same week, sort by date
        return a.split('|||')[0].localeCompare(b.split('|||')[0]);
    }).forEach((key) => {
        const [date, weekNum] = key.split('|||');
        const group = el('section', 'date-group');
        group.appendChild(el('div', 'date-title', [`วันที่ ${date} (WEEK#${weekNum})`]));

        groups[key].forEach((match) => {
            const scoreA = scoreNumber(match.scoreA);
            const scoreB = scoreNumber(match.scoreB);
            const row = el('div', 'match-row');
            row.appendChild(el('div', `team-side side-a ${resultClass(scoreA, scoreB)}`, [
                text(match.teamA || '-'),
                logo(match.teamA)
            ]));
            row.appendChild(el('div', 'score', [`${scoreA} - ${scoreB}`]));
            row.appendChild(el('div', `team-side side-b ${resultClass(scoreB, scoreA)}`, [
                logo(match.teamB),
                text(match.teamB || '-')
            ]));
            group.appendChild(row);
        });

        wrapper.appendChild(group);
    });

    clear(content);
    content.className = '';
    content.appendChild(wrapper);
};

const renderTicker = (matches) => {
    const filtered = selectedDate ? matches.filter((match) => getMatchDate(match) === selectedDate) : matches;
    if (!filtered.length) return showStatus('ยังไม่มีคะแนนสำหรับวันนี้');

    clear(header);
    header.style.display = 'none';

    const shell = el('section', 'ticker-shell');
    const ticker = el('div', 'ticker');
    const duration = Number.parseInt(params.get('speed') || '42', 10);
    ticker.style.setProperty('--ticker-duration', `${Number.isFinite(duration) ? duration : 42}s`);

    filtered.forEach((match) => {
        ticker.appendChild(logo(match.teamA));
        ticker.appendChild(text(match.teamA || '-'));
        ticker.appendChild(el('span', 'ticker-score', [`${scoreNumber(match.scoreA)} - ${scoreNumber(match.scoreB)}`]));
        ticker.appendChild(text(match.teamB || '-'));
        ticker.appendChild(logo(match.teamB));
        ticker.appendChild(text('                  ')); // 10 spaces before and after •
    });

    shell.appendChild(ticker);
    clear(content);
    content.className = '';
    content.appendChild(shell);
};

const renderStadium = (matches) => {
    // Calculate standings (total from all weeks)
    const stats = {};
    matches.forEach((match) => {
        const teamA = (match.teamA || '').trim();
        const teamB = (match.teamB || '').trim();
        if (!teamA || !teamB) return;

        const scoreA = Number(match.scoreA);
        const scoreB = Number(match.scoreB);
        if (!Number.isFinite(scoreA) || !Number.isFinite(scoreB)) return;

        stats[teamA] ||= { team: teamA, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };
        stats[teamB] ||= { team: teamB, P: 0, W: 0, D: 0, L: 0, GF: 0, GA: 0, GD: 0, Pts: 0 };

        const a = stats[teamA];
        const b = stats[teamB];

        a.P++;
        b.P++;
        a.GF += scoreA;
        a.GA += scoreB;
        b.GF += scoreB;
        b.GA += scoreA;

        if (scoreA > scoreB) {
            a.W++;
            a.Pts += 3;
            b.L++;
        } else if (scoreA < scoreB) {
            b.W++;
            b.Pts += 3;
            a.L++;
        } else {
            a.D++;
            b.D++;
            a.Pts++;
            b.Pts++;
        }
    });

    const rows = Object.values(stats)
        .map((row) => ({ ...row, GD: row.GF - row.GA }))
        .sort((a, b) => b.Pts - a.Pts || b.GD - a.GD || b.GF - a.GF || a.team.localeCompare(b.team));

    // Group matches by week/matchday
    const weekParam = params.get('week');
    
    // If no week field exists, group by date and convert to week
    const groupByWeek = matches.reduce((acc, match) => {
        let week = match.week || match.matchday || match.round;
        
        // If no week field, use date to determine week
        if (!week && match.date) {
            const uniqueDates = [...new Set(matches.map(m => m.date).filter(Boolean))].sort();
            const dateIndex = uniqueDates.indexOf(match.date);
            week = dateIndex >= 0 ? `สัปดาห์ ${dateIndex + 1}` : 'สัปดาห์ 1';
        } else if (!week) {
            week = 'สัปดาห์ 1';
        }
        
        acc[week] ||= [];
        acc[week].push(match);
        return acc;
    }, {});

    // Get weeks sorted
    const sortedWeeks = Object.keys(groupByWeek).sort((a, b) => {
        const numA = parseInt(String(a).match(/\d+/)?.[0] || '0');
        const numB = parseInt(String(b).match(/\d+/)?.[0] || '0');
        return numB - numA; // Latest first
    });

    // Get matches to display (specific week or latest)
    let filtered = [];
    let displayWeek = '';
    
    if (weekParam && groupByWeek[weekParam]) {
        filtered = groupByWeek[weekParam];
        displayWeek = weekParam;
    } else if (sortedWeeks.length > 0) {
        displayWeek = sortedWeeks[0];
        filtered = groupByWeek[displayWeek];
    }
    
    // Create stadium container
    const container = el('div', 'stadium-container');
    
    // Background
    const bg = el('div', 'stadium-bg');
    if (league.background) {
        bg.style.backgroundImage = `url("${league.background}")`;
    }
    container.appendChild(bg);
    
    // Overlay
    container.appendChild(el('div', 'stadium-overlay'));
    
    // Content
    const stadiumContent = el('div', 'stadium-content');
    
    // League title
    const titleSection = el('div', 'stadium-league-title');
    titleSection.appendChild(el('h1', '', [title]));
    stadiumContent.appendChild(titleSection);
    
    // Standings table
    if (rows.length > 0) {
        const tableWrapper = el('div', 'stadium-table');
        const table = el('table');
        const thead = el('thead');
        const headRow = el('tr');
        ['อันดับ', 'ทีม', 'แข่ง', 'ชนะ', 'เสมอ', 'แพ้', 'ได้', 'เสีย', 'ผลต่าง', 'คะแนน'].forEach((label) => {
            headRow.appendChild(el('th', '', [label]));
        });
        thead.appendChild(headRow);
        
        const tbody = el('tbody');
        rows.slice(0, 6).forEach((row, index) => {
            const tr = el('tr');
            tr.appendChild(el('td', '', [String(index + 1)]));
            tr.appendChild(el('td', 'team-cell', [logo(row.team), text(row.team)]));
            ['P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].forEach((key) => {
                tr.appendChild(el('td', '', [String(row[key])]));
            });
            tbody.appendChild(tr);
        });
        
        table.append(thead, tbody);
        tableWrapper.appendChild(table);
        stadiumContent.appendChild(tableWrapper);
    }
    
    // Matches section
    if (filtered.length > 0) {
        const matchesSection = el('div', 'stadium-matches');
        const card = el('div', 'matches-card');
        
        // Header with week/matchday
        const matchHeader = el('div', 'matches-header');
        matchHeader.appendChild(el('h2', 'matches-date', [displayWeek]));
        card.appendChild(matchHeader);
        
        // Matches list
        const matchesList = el('div', 'matches-list');
        filtered.slice(0, 3).forEach((match) => {
            const scoreA = scoreNumber(match.scoreA);
            const scoreB = scoreNumber(match.scoreB);
            
            const matchCard = el('div', 'match-card');
            
            // Team A
            matchCard.appendChild(el('div', `match-team left ${resultClass(scoreA, scoreB)}`, [
                text(match.teamA || '-'),
                logo(match.teamA)
            ]));
            
            // Score
            matchCard.appendChild(el('div', 'match-score', [`${scoreA} - ${scoreB}`]));
            
            // Team B
            matchCard.appendChild(el('div', `match-team right ${resultClass(scoreB, scoreA)}`, [
                logo(match.teamB),
                text(match.teamB || '-')
            ]));
            
            matchesList.appendChild(matchCard);
        });
        
        card.appendChild(matchesList);
        matchesSection.appendChild(card);
        stadiumContent.appendChild(matchesSection);
    }
    
    container.appendChild(stadiumContent);
    
    // Replace content
    clear(document.body);
    document.body.appendChild(container);
};

const render = (matches) => {
    if (view === 'stadium') return renderStadium(matches);
    if (view === 'results' || view === 'allscore') return renderResults(matches);
    if (view === 'ticker' || view === 'live') return renderTicker(matches);
    return renderTable(matches);
};

setHeader();
setBackground();

onValue(getMatchesRef(), (snapshot) => {
    render(snapshotToMatches(snapshot));
}, (error) => {
    showStatus(`โหลดข้อมูลไม่สำเร็จ: ${error.message}`);
});
