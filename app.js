const placeupStorage = {
    user: 'placeup_user',
    mockAnswers: 'placeup_mock_answers',
    mockSubmitted: 'placeup_mock_submitted'
};
placeupStorage.history = 'placeup_history';

function getStoredUser() {
    try {
        const raw = localStorage.getItem(placeupStorage.user);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

function saveStoredUser(user) {
    try {
        localStorage.setItem(placeupStorage.user, JSON.stringify(user));
    } catch (error) {
        console.error('Could not save user data', error);
    }
}

function createNameFromEmail(email) {
    if (!email) {
        return 'Candidate';
    }
    const beforeAt = email.split('@')[0] || email;
    const parts = beforeAt
        .replace(/[._\-]/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1));
    return parts.length ? parts.join(' ') : 'Candidate';
}

function setTextById(id, text) {
    const el = document.getElementById(id);
    if (el) {
        el.textContent = text;
    }
}

function toggleVisibility(id, visible) {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = visible ? '' : 'none';
}

const themeStorageKey = 'placeupTheme';
const defaultTheme = 'dark';

function setTheme(name) {
    const theme = name === 'light' ? 'light' : 'dark';
    document.body.dataset.theme = theme;
    localStorage.setItem(themeStorageKey, theme);
    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
        themeToggle.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
}

function initTheme() {
    const saved = localStorage.getItem(themeStorageKey);
    setTheme(saved || defaultTheme);
}

function toggleTheme() {
    const current = document.body.dataset.theme || defaultTheme;
    setTheme(current === 'dark' ? 'light' : 'dark');
}

function initPageTransitions() {
    const overlay = document.getElementById('pageTransitionOverlay');
    document.querySelectorAll('a[data-nav]').forEach(link => {
        if (!link.href || link.href.startsWith('#')) return;
        const target = new URL(link.href, location.href);
        if (target.origin !== location.origin) return;
        link.addEventListener('click', event => {
            event.preventDefault();
            if (target.href === location.href) return;
            overlay?.classList.add('active');
            setTimeout(() => window.location.href = target.href, 320);
        });
    });

    const themeToggle = document.querySelector('[data-theme-toggle]');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    window.addEventListener('pageshow', () => overlay?.classList.remove('active'));
}

function updateSharedUI() {
    const user = getStoredUser();
    const signInLabel = document.querySelector('.signin-label');
    if (signInLabel) {
        signInLabel.textContent = user ? `Welcome, ${user.name}` : 'Sign in to your acc';
    }
    setTextById('heroGreeting', user ? `Ready for your next mock test, ${user.name}.` : '');
    toggleVisibility('heroGreeting', Boolean(user));
    if (user) {
        setTextById('dashboardName', user.name);
        setTextById('dashboardDesc', 'You’re signed in to your PlaceUp account. Keep preparing and tracking your interview progress.');
        setTextById('reportsName', user.name);
        setTextById('reportStatus', `Viewing personalized insights for ${user.name}.`);
    }
    // ensure dashboard stats are refreshed whenever shared UI updates
    try { renderDashboardStats(); } catch (e) { /* ignore if not on dashboard */ }
}

function initSigninModal() {
    const signInBtn = document.getElementById('signinBtn');
    const signInToggle = document.getElementById('signin-toggle');
    if (!signInBtn) {
        return;
    }

    signInBtn.addEventListener('click', () => {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        if (!emailInput || !passwordInput) {
            return;
        }

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        if (!email || !password) {
            alert('Please enter both email and password to continue.');
            return;
        }

        const user = {
            name: createNameFromEmail(email),
            email
        };
        saveStoredUser(user);
        updateSharedUI();

        if (signInToggle) {
            signInToggle.checked = false;
        }

        alert(`Signed in successfully as ${user.name}.`);
    });
}

function initDashboardPage() {
    const dashboardHeader = document.querySelector('.greeting');
    if (!dashboardHeader) {
        return;
    }

    const user = getStoredUser();
    setTextById('dashboardName', user ? user.name : 'Candidate');
    setTextById('dashboardDesc', user ? 'You’re signed in to your PlaceUp account. Keep preparing and tracking your interview progress.' : 'Sign in from the home page to personalize your dashboard.');
    renderDashboardStats();
    const signOutBtn = document.getElementById('signOutBtn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut();
        });
    }
    const resetBtn = document.getElementById('resetProgressBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Clear all local progress and history? This cannot be undone.')) {
                resetProgress();
            }
        });
    }
}

function initReportsPage() {
    const reportHeader = document.querySelector('.header-card');
    if (!reportHeader) {
        return;
    }
    const user = getStoredUser();
    setTextById('reportsName', user ? user.name : 'Candidate');
    setTextById('reportStatus', user ? `Viewing personalized insights for ${user.name}.` : 'Sign in on the home page to store your progress and personalize reports.');
}

function initMockTestPersistence() {
    const user = getStoredUser();
    const mockTestWelcome = document.getElementById('mockTestWelcome');
    if (mockTestWelcome) {
        mockTestWelcome.textContent = user ? `Hi ${user.name}, your mock test progress is saved in your browser.` : 'Your answers are saved locally while you complete this mock test.';
    }

    const resultSummary = document.getElementById('resultSummary');
    const resultText = document.getElementById('resultText');
    
    if (!resultSummary || !resultText) {
        return;
    }

    const storedSubmitted = localStorage.getItem('placeup_mock_submitted');
    const storedAnswers = localStorage.getItem('placeup_mock_answers');
    
    if (storedSubmitted === 'true' && storedAnswers) {
        try {
            const parsed = JSON.parse(storedAnswers);
            if (Array.isArray(parsed)) {
                const answeredCount = parsed.filter(a => a && a.length > 0).length;
                const total = parsed.length;
                const unansweredCount = total - answeredCount;
                resultSummary.style.display = 'block';
                resultText.innerHTML = `You completed the mock test successfully.<br><br>` +
                    `Answered questions: <strong>${answeredCount}</strong><br>` +
                    `Unanswered questions: <strong>${unansweredCount}</strong><br><br>` +
                    `Your responses are saved for review.`;
            }
        } catch (err) {
            console.error('Failed to load mock test state', err);
        }
    }
}

function saveMockResult(entry) {
    try {
        const raw = localStorage.getItem(placeupStorage.history);
        const arr = raw ? JSON.parse(raw) : [];
        arr.unshift(entry);
        // keep only last 50
        localStorage.setItem(placeupStorage.history, JSON.stringify(arr.slice(0, 50)));
    } catch (error) {
        console.error('Could not save history', error);
    }
}

function getHistory() {
    try {
        const raw = localStorage.getItem(placeupStorage.history);
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        return [];
    }
}

function renderDashboardStats() {
    const history = getHistory();
    const mocks = history.filter(h => h.type === 'mock');
    const interviewsDone = mocks.length;
    const savedSubmitted = localStorage.getItem(placeupStorage.mockSubmitted) === 'true';
    const savedAnswersRaw = localStorage.getItem(placeupStorage.mockAnswers);
    const hasSavedAnswers = Boolean(savedAnswersRaw);
    const hasStoredStats = interviewsDone > 0 || savedSubmitted || hasSavedAnswers;

    if (!hasStoredStats) {
        return;
    }

    const bestScore = mocks.reduce((max, m) => Math.max(max, Number(m.score || 0)), 0);
    const questionsSolved = mocks.reduce((sum, m) => sum + (Number(m.answered || 0)), 0);
    setTextById('interviewsDone', interviewsDone);
    setTextById('bestScore', bestScore ? `${bestScore}%` : '0%');
    setTextById('questionsSolved', questionsSolved);
    // practice hours is just simulated here
    setTextById('practiceHours', `${Math.min(200, interviewsDone * 2)}h`);

    if (interviewsDone === 0 && (savedSubmitted || hasSavedAnswers)) {
        try {
            const savedAnswers = savedAnswersRaw ? JSON.parse(savedAnswersRaw) : [];
            const answeredCount = Array.isArray(savedAnswers) ? savedAnswers.filter(a => a && a.toString().trim().length > 0).length : 0;
            const total = (Array.isArray(savedAnswers) && savedAnswers.length) || (window.questions && window.questions.length) || 0;
            const pct = total ? Math.round((answeredCount / total) * 100) : 0;
            setTextById('interviewsDone', savedSubmitted ? 1 : 0);
            setTextById('bestScore', pct ? `${pct}%` : '0%');
            setTextById('questionsSolved', answeredCount);
            setTextById('practiceHours', `${Math.min(200, savedSubmitted ? 2 : 0)}h`);
        } catch (err) {
            // ignore parse errors
        }
    }
}

function signOut() {
    localStorage.removeItem(placeupStorage.user);
    updateSharedUI();
    // reload to reflect changes on pages
    try { window.location = 'index.html'; } catch (e) { /* no-op */ }
}

function resetProgress() {
    localStorage.removeItem(placeupStorage.mockAnswers);
    localStorage.removeItem(placeupStorage.mockSubmitted);
    localStorage.removeItem(placeupStorage.history);
    updateSharedUI();
    renderDashboardStats();
    alert('Local progress and history cleared.');
}

window.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateSharedUI();
    initSigninModal();
    initDashboardPage();
    initReportsPage();
    initMockTestPersistence();
    initPageTransitions();
});
