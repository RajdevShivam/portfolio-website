// ============================================================
// BLACKJACK TRAINER — All modules
// ============================================================

// ========== CARD ENGINE ==========
const CardEngine = (() => {
    const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
    const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    const SYMBOLS = { spades: '\u2660', hearts: '\u2665', diamonds: '\u2666', clubs: '\u2663' };
    const COLORS = { spades: 'black', hearts: 'red', diamonds: 'red', clubs: 'black' };

    function createDeck(n = 1) {
        const deck = [];
        for (let d = 0; d < n; d++)
            for (const s of SUITS)
                for (const r of RANKS)
                    deck.push({ rank: r, suit: s, sym: SYMBOLS[s], color: COLORS[s] });
        return deck;
    }

    function shuffle(deck) {
        const d = [...deck];
        for (let i = d.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [d[i], d[j]] = [d[j], d[i]];
        }
        return d;
    }

    function value(card) {
        if (card.rank === 'A') return 11;
        if ('JQK'.includes(card.rank[0]) && card.rank.length <= 2) return 10;
        return parseInt(card.rank);
    }

    function createShoe(numDecks = 6) {
        const cards = shuffle(createDeck(numDecks));
        return { cards, pos: 0, cut: Math.floor(cards.length * 0.75), decks: numDecks };
    }

    function deal(shoe) {
        if (shoe.pos >= shoe.cards.length) return null;
        return shoe.cards[shoe.pos++];
    }

    function needsShuffle(shoe) { return shoe.pos >= shoe.cut; }
    function decksRemaining(shoe) { return (shoe.cards.length - shoe.pos) / 52; }

    return { SUITS, RANKS, SYMBOLS, COLORS, createDeck, shuffle, value, createShoe, deal, needsShuffle, decksRemaining };
})();

// ========== UI HELPERS ==========
function renderCard(card, faceDown) {
    if (faceDown) return '<div class="card-back"></div>';
    return `<div class="card ${card.color} bj-deal-anim">
        <div class="corner"><span class="rank">${card.rank}</span><span class="suit">${card.sym}</span></div>
        <div class="center-pip">${card.sym}</div>
        <div class="corner corner-br"><span class="rank">${card.rank}</span><span class="suit">${card.sym}</span></div>
    </div>`;
}

function renderHand(cards, elId, opts) {
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = cards.map((c, i) =>
        (opts && opts.hideIndex === i) ? renderCard(c, true) : renderCard(c)
    ).join('');
}

function showFeedback(elId, correct, msg) {
    const el = document.getElementById(elId);
    el.className = `bj-feedback show ${correct ? 'correct' : 'incorrect'}`;
    el.innerHTML = `<span class="icon">${correct ? '\u2713' : '\u2717'}</span> ${msg}`;
}

function hideFeedback(elId) {
    const el = document.getElementById(elId);
    if (el) { el.className = 'bj-feedback'; el.innerHTML = ''; }
}

function updateStatDisplay(prefix, stats) {
    const pct = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
    const acc = document.getElementById(`${prefix}-accuracy`);
    const str = document.getElementById(`${prefix}-streak`);
    const best = document.getElementById(`${prefix}-best`);
    if (acc) acc.textContent = `${stats.correct}/${stats.total} (${pct}%)`;
    if (str) str.textContent = stats.streak;
    if (best) best.textContent = stats.bestStreak;
}

// ========== SOUND ==========
const Sound = (() => {
    let on = false;
    let ctx = null;
    function getCtx() { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); return ctx; }
    function tone(freq, dur, type = 'sine') {
        if (!on) return;
        const c = getCtx(), o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = freq; g.gain.value = 0.08;
        o.connect(g).connect(c.destination);
        o.start(); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); o.stop(c.currentTime + dur);
    }
    return {
        toggle() { on = !on; return on; },
        isOn() { return on; },
        deal() { tone(800, 0.04, 'square'); },
        correct() { tone(523, 0.08); setTimeout(() => tone(659, 0.12), 80); },
        incorrect() { tone(200, 0.15, 'sawtooth'); },
        click() { tone(1500, 0.02, 'square'); }
    };
})();

// ========== STATS ==========
const Stats = (() => {
    const KEY = 'blackjackTrainerStats';
    const defaults = () => ({
        strategy: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
        counting: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
        game: { won: 0, played: 0, bankroll: 1000, peak: 1000 }
    });
    function load() {
        try { const s = localStorage.getItem(KEY); return s ? { ...defaults(), ...JSON.parse(s) } : defaults(); }
        catch { return defaults(); }
    }
    function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
    function record(section, correct) {
        const s = load();
        const sec = s[section];
        sec.total++;
        if (correct) { sec.correct++; sec.streak++; sec.bestStreak = Math.max(sec.bestStreak, sec.streak); }
        else { sec.streak = 0; }
        save(s);
        return sec;
    }
    function reset() { localStorage.removeItem(KEY); }
    return { load, save, record, reset, defaults };
})();

// ========== BLACKJACK ENGINE ==========
const BJ = (() => {
    function handValue(cards) {
        let t = 0, a = 0;
        for (const c of cards) { t += CardEngine.value(c); if (c.rank === 'A') a++; }
        while (t > 21 && a > 0) { t -= 10; a--; }
        return t;
    }
    function isSoft(cards) {
        let t = 0, a = 0;
        for (const c of cards) { t += CardEngine.value(c); if (c.rank === 'A') a++; }
        while (t > 21 && a > 0) { t -= 10; a--; }
        return a > 0;
    }
    function isPair(cards) { return cards.length === 2 && cards[0].rank === cards[1].rank; }
    function isBust(cards) { return handValue(cards) > 21; }
    function isBlackjack(cards) { return cards.length === 2 && handValue(cards) === 21; }
    return { handValue, isSoft, isPair, isBust, isBlackjack };
})();

// ========== BASIC STRATEGY ==========
const Strategy = (() => {
    function di(card) { return card.rank === 'A' ? 9 : CardEngine.value(card) - 2; }

    const HARD = [
        ['H','H','H','H','H','H','H','H','H','H'],
        ['H','H','H','H','H','H','H','H','H','H'],
        ['H','H','H','H','H','H','H','H','H','H'],
        ['H','H','H','H','H','H','H','H','H','H'],
        ['H','D','D','D','D','H','H','H','H','H'],
        ['D','D','D','D','D','D','D','D','H','H'],
        ['D','D','D','D','D','D','D','D','D','D'],
        ['H','H','S','S','S','H','H','H','H','H'],
        ['S','S','S','S','S','H','H','H','H','H'],
        ['S','S','S','S','S','H','H','H','H','H'],
        ['S','S','S','S','S','H','H','H','Rh','Rh'],
        ['S','S','S','S','S','H','H','Rh','Rh','Rh'],
        ['S','S','S','S','S','S','S','S','S','Rs'],
        ['S','S','S','S','S','S','S','S','S','S'],
        ['S','S','S','S','S','S','S','S','S','S'],
    ];
    const SOFT = [
        ['H','H','H','D','D','H','H','H','H','H'],
        ['H','H','H','D','D','H','H','H','H','H'],
        ['H','H','D','D','D','H','H','H','H','H'],
        ['H','H','D','D','D','H','H','H','H','H'],
        ['H','D','D','D','D','H','H','H','H','H'],
        ['Ds','Ds','Ds','Ds','Ds','S','S','H','H','H'],
        ['S','S','S','S','Ds','S','S','S','S','S'],
        ['S','S','S','S','S','S','S','S','S','S'],
    ];
    const PAIRS = [
        ['P','P','P','P','P','P','P','P','P','P'],
        ['Ph','Ph','P','P','P','P','H','H','H','H'],
        ['Ph','Ph','P','P','P','P','H','H','H','H'],
        ['H','H','H','Ph','Ph','H','H','H','H','H'],
        ['D','D','D','D','D','D','D','D','H','H'],
        ['Ph','P','P','P','P','H','H','H','H','H'],
        ['P','P','P','P','P','P','H','H','H','H'],
        ['P','P','P','P','P','P','P','P','P','Rp'],
        ['P','P','P','P','P','S','P','P','S','S'],
        ['S','S','S','S','S','S','S','S','S','S'],
    ];

    const ACTION_NAMES = {
        'H':'Hit','S':'Stand','D':'Double (or Hit)','Ds':'Double (or Stand)',
        'P':'Split','Ph':'Split (or Hit)','Rh':'Surrender (or Hit)',
        'Rs':'Surrender (or Stand)','Rp':'Surrender (or Split)'
    };

    function getOptimal(playerCards, dealerUp) {
        const d = di(dealerUp);
        if (BJ.isPair(playerCards)) {
            const v = playerCards[0].rank === 'A' ? 0 : (Math.min(CardEngine.value(playerCards[0]), 10) - 1);
            const idx = v === 0 ? 0 : (v <= 9 ? v : 9);
            return { action: PAIRS[idx][d], type: 'pair', label: `${playerCards[0].rank},${playerCards[1].rank}` };
        }
        if (BJ.isSoft(playerCards) && playerCards.length === 2) {
            const nonAce = playerCards[0].rank === 'A' ? playerCards[1] : playerCards[0];
            const nv = CardEngine.value(nonAce);
            if (nv >= 2 && nv <= 9) {
                return { action: SOFT[nv - 2][d], type: 'soft', label: `A,${nonAce.rank}` };
            }
        }
        const total = BJ.handValue(playerCards);
        const hi = Math.min(Math.max(total - 5, 0), 14);
        return { action: HARD[hi][d], type: 'hard', label: `Hard ${total}` };
    }

    function matches(playerAction, optimalCode) {
        const p = playerAction.toUpperCase();
        const code = optimalCode;
        if (p === code[0]) return true;
        if (code === 'D' && p === 'H') return false;
        if (code === 'Ds' && (p === 'D' || p === 'S')) return true;
        if (code === 'Ph' && (p === 'P' || p === 'H')) return true;
        if (code === 'Rh' && (p === 'H')) return true;
        if (code === 'Rs' && (p === 'S')) return true;
        if (code === 'Rp' && (p === 'P')) return true;
        return false;
    }

    return { HARD, SOFT, PAIRS, ACTION_NAMES, getOptimal, matches, di };
})();

// ========== CARD COUNTING ==========
const Counting = (() => {
    const HILO = { 'A':-1,'2':1,'3':1,'4':1,'5':1,'6':1,'7':0,'8':0,'9':0,'10':-1,'J':-1,'Q':-1,'K':-1 };
    function hiLo(card) { return HILO[card.rank]; }
    function runningCount(cards) { return cards.reduce((s, c) => s + hiLo(c), 0); }
    function trueCount(rc, decksRem) { return decksRem > 0 ? Math.round((rc / decksRem) * 10) / 10 : rc; }
    function betRec(tc, min = 10) {
        if (tc <= 1) return { amt: min, note: 'Min bet' };
        if (tc === 2) return { amt: min * 2, note: '2x - small edge' };
        if (tc === 3) return { amt: min * 4, note: '4x - good edge' };
        if (tc === 4) return { amt: min * 8, note: '8x - strong edge' };
        return { amt: min * 12, note: '12x - max spread' };
    }
    return { HILO, hiLo, runningCount, trueCount, betRec };
})();

// ================================================================
//                    APP CONTROLLERS
// ================================================================

// ========== TAB NAVIGATION ==========
function initTabs() {
    document.querySelectorAll('.bj-tabs button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.bj-tabs button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.querySelectorAll('.bj-panel').forEach(p => p.classList.remove('active'));
            document.getElementById(btn.dataset.panel).classList.add('active');
        });
    });
}

// ========== SOUND TOGGLE ==========
function initSoundToggle() {
    const btn = document.getElementById('bj-sound-btn');
    if (btn) btn.addEventListener('click', () => {
        const on = Sound.toggle();
        btn.textContent = on ? '\uD83D\uDD0A' : '\uD83D\uDD07';
        if (on) Sound.click();
    });
}

// ========== STRATEGY TRAINER ==========
const StrategyTrainer = (() => {
    let shoe, playerCards, dealerUp, waiting = false;

    function init() {
        shoe = CardEngine.createShoe(6);
        // Bind action buttons (re-bind on each init for view transitions)
        document.querySelectorAll('#bj-strat-actions .bj-action-btn').forEach(btn => {
            btn.onclick = () => answer(btn.dataset.action);
        });
        deal();
        const s = Stats.load().strategy;
        updateStatDisplay('bj-strat', s);
    }

    function deal() {
        if (CardEngine.needsShuffle(shoe)) shoe = CardEngine.createShoe(6);
        hideFeedback('bj-strat-feedback');
        playerCards = [CardEngine.deal(shoe), CardEngine.deal(shoe)];
        dealerUp = CardEngine.deal(shoe);
        renderHand([dealerUp], 'bj-strat-dealer-hand');
        renderHand(playerCards, 'bj-strat-player-hand');
        const v = BJ.handValue(playerCards);
        document.getElementById('bj-strat-player-value').textContent = v + (BJ.isSoft(playerCards) ? ' (soft)' : '');
        const splitBtn = document.querySelector('#bj-strat-actions [data-action="P"]');
        if (splitBtn) splitBtn.disabled = !BJ.isPair(playerCards);
        waiting = true;
        enableActions(true);
        Sound.deal();
    }

    function enableActions(en) {
        document.querySelectorAll('#bj-strat-actions .bj-action-btn').forEach(b => {
            if (b.dataset.action === 'P' && !BJ.isPair(playerCards)) b.disabled = true;
            else b.disabled = !en;
        });
    }

    function answer(action) {
        if (!waiting) return;
        waiting = false;
        enableActions(false);
        const opt = Strategy.getOptimal(playerCards, dealerUp);
        const correct = Strategy.matches(action, opt.action);
        const stats = Stats.record('strategy', correct);
        if (correct) {
            showFeedback('bj-strat-feedback', true, `Correct! ${opt.label} vs ${dealerUp.rank}: ${Strategy.ACTION_NAMES[opt.action]}`);
            Sound.correct();
        } else {
            showFeedback('bj-strat-feedback', false, `Wrong. ${opt.label} vs ${dealerUp.rank}: ${Strategy.ACTION_NAMES[opt.action]} (you chose ${Strategy.ACTION_NAMES[action] || action})`);
            Sound.incorrect();
        }
        updateStatDisplay('bj-strat', stats);
        setTimeout(deal, 1800);
    }

    return { init, answer };
})();

// ========== STRATEGY CHART ==========
function initStrategyChart() {
    const btn = document.getElementById('bj-chart-toggle');
    const container = document.getElementById('bj-strategy-chart');
    if (!btn || !container) return;
    container.innerHTML = '';
    container.classList.add('hidden');
    btn.textContent = 'Show Strategy Chart';
    btn.onclick = () => {
        container.classList.toggle('hidden');
        btn.textContent = container.classList.contains('hidden') ? 'Show Strategy Chart' : 'Hide Strategy Chart';
        if (!container.classList.contains('hidden') && !container.innerHTML) renderChart();
    };

    function renderChart() {
        const dealers = ['2','3','4','5','6','7','8','9','10','A'];
        function table(title, data, rowLabels) {
            let h = `<h3>${title}</h3><table class="bj-strategy-table"><tr><th></th>`;
            h += dealers.map(d => `<th>${d}</th>`).join('');
            h += '</tr>';
            data.forEach((row, i) => {
                h += `<tr><th>${rowLabels[i]}</th>`;
                row.forEach(cell => { h += `<td class="bj-cell-${cell[0] === 'R' ? cell : cell[0]}">${cell}</td>`; });
                h += '</tr>';
            });
            h += '</table>';
            return h;
        }
        const hardLabels = Array.from({length:15}, (_, i) => i + 5);
        const softLabels = ['A,2','A,3','A,4','A,5','A,6','A,7','A,8','A,9'];
        const pairLabels = ['A,A','2,2','3,3','4,4','5,5','6,6','7,7','8,8','9,9','10,10'];

        let html = `<div class="bj-chart-legend">
            <span><span class="bj-legend-box" style="background:rgba(239,68,68,0.5)"></span> H = Hit</span>
            <span><span class="bj-legend-box" style="background:rgba(34,197,94,0.5)"></span> S = Stand</span>
            <span><span class="bj-legend-box" style="background:rgba(251,191,36,0.5)"></span> D = Double</span>
            <span><span class="bj-legend-box" style="background:rgba(96,165,250,0.5)"></span> P = Split</span>
            <span><span class="bj-legend-box" style="background:rgba(156,163,175,0.4)"></span> R = Surrender</span>
        </div>`;
        html += table('Hard Totals', Strategy.HARD, hardLabels);
        html += table('Soft Totals', Strategy.SOFT, softLabels);
        html += table('Pairs', Strategy.PAIRS, pairLabels);
        container.innerHTML = html;
    }
}

// ========== COUNTING TRAINER ==========
const CountingTrainer = (() => {
    let shoe, dealtCards = [], timer;
    let speedSlider, speedLabel, countNumSlider, countNumLabel;

    function startDrill() {
        shoe = CardEngine.createShoe(6);
        dealtCards = [];
        hideFeedback('bj-count-feedback');
        document.getElementById('bj-count-input-area').style.display = 'none';
        const type = document.getElementById('bj-drill-type').value;
        const speed = parseInt(speedSlider.value);

        let numCards;
        if (type === 'single') numCards = 1;
        else if (type === 'pairs') numCards = 2;
        else numCards = parseInt(countNumSlider.value);

        const cards = [];
        for (let i = 0; i < numCards; i++) cards.push(CardEngine.deal(shoe));
        dealtCards = cards;

        let idx = 0;
        const display = document.getElementById('bj-counting-display');

        function showNext() {
            if (idx >= cards.length) {
                display.innerHTML = '<div style="text-align:center; color:rgba(255,255,255,0.6); font-size:1.1rem;">What is the running count?</div>';
                document.getElementById('bj-count-input-area').style.display = 'flex';
                document.getElementById('bj-rc-input').value = '';
                document.getElementById('bj-rc-input').focus();
                return;
            }
            display.innerHTML = renderCard(cards[idx]);
            Sound.deal();
            idx++;
            timer = setTimeout(showNext, speed);
        }
        showNext();
    }

    function checkCount() {
        const input = parseInt(document.getElementById('bj-rc-input').value);
        if (isNaN(input)) return;
        const actual = Counting.runningCount(dealtCards);
        const correct = input === actual;
        const stats = Stats.record('counting', correct);
        const breakdown = dealtCards.map(c => `${c.rank}${c.sym}(${Counting.hiLo(c) >= 0 ? '+' : ''}${Counting.hiLo(c)})`).join(' ');
        if (correct) {
            showFeedback('bj-count-feedback', true, `Correct! Running count = ${actual}. Cards: ${breakdown}`);
            Sound.correct();
        } else {
            showFeedback('bj-count-feedback', false, `Wrong. Actual count = ${actual} (you said ${input}). Cards: ${breakdown}`);
            Sound.incorrect();
        }
        updateStatDisplay('bj-count', stats);
        document.getElementById('bj-count-input-area').style.display = 'none';
    }

    function init() {
        // Re-bind elements and listeners (for view transitions)
        speedSlider = document.getElementById('bj-card-speed');
        speedLabel = document.getElementById('bj-speed-label');
        countNumSlider = document.getElementById('bj-card-count-num');
        countNumLabel = document.getElementById('bj-count-num-label');

        if (speedSlider) speedSlider.oninput = () => speedLabel.textContent = (speedSlider.value / 1000).toFixed(1) + 's';
        if (countNumSlider) countNumSlider.oninput = () => countNumLabel.textContent = countNumSlider.value;

        const startBtn = document.getElementById('bj-start-drill');
        const submitBtn = document.getElementById('bj-submit-count');
        const rcInput = document.getElementById('bj-rc-input');

        if (startBtn) startBtn.onclick = startDrill;
        if (submitBtn) submitBtn.onclick = checkCount;
        if (rcInput) rcInput.onkeydown = e => { if (e.key === 'Enter') checkCount(); };

        const s = Stats.load().counting;
        updateStatDisplay('bj-count', s);
    }

    return { init, startDrill, checkCount };
})();

// ========== BLACKJACK GAME ==========
const BJGame = (() => {
    let shoe, playerCards, dealerCards, currentBet = 10, phase = 'betting';
    let gameStats;

    function loadStats() {
        gameStats = Stats.load().game;
        updateDisplay();
    }

    function updateDisplay() {
        document.getElementById('bj-game-bankroll').textContent = `$${gameStats.bankroll}`;
        document.getElementById('bj-game-bet').textContent = `$${currentBet}`;
        document.getElementById('bj-game-wins').textContent = gameStats.won;
        document.getElementById('bj-game-total').textContent = gameStats.played;
        const rc = shoe ? Counting.runningCount(shoe.cards.slice(0, shoe.pos)) : 0;
        const dr = shoe ? CardEngine.decksRemaining(shoe) : 6;
        const tc = Counting.trueCount(rc, dr);
        const rec = Counting.betRec(tc);
        document.getElementById('bj-game-rc').textContent = rc;
        document.getElementById('bj-game-tc').textContent = tc.toFixed(1);
        document.getElementById('bj-game-rec-bet').textContent = `$${rec.amt} (${rec.note})`;
    }

    function init() {
        shoe = CardEngine.createShoe(6);
        loadStats();
        bindGameListeners();
        showBetting();
    }

    function bindGameListeners() {
        // Chips
        document.querySelectorAll('.bj-chip').forEach(chip => {
            chip.onclick = () => {
                currentBet = parseInt(chip.dataset.chip);
                document.getElementById('bj-game-bet').textContent = `$${currentBet}`;
                Sound.click();
            };
        });

        // Deal
        const dealBtn = document.getElementById('bj-deal-btn');
        if (dealBtn) dealBtn.onclick = () => {
            if (phase !== 'betting') return;
            if (currentBet < 10) currentBet = 10;
            if (currentBet > gameStats.bankroll) { alert('Not enough bankroll!'); return; }
            if (CardEngine.needsShuffle(shoe)) shoe = CardEngine.createShoe(6);

            playerCards = [CardEngine.deal(shoe), CardEngine.deal(shoe)];
            dealerCards = [CardEngine.deal(shoe), CardEngine.deal(shoe)];

            renderHand(playerCards, 'bj-game-player-hand');
            renderHand(dealerCards, 'bj-game-dealer-hand', { hideIndex: 1 });
            document.getElementById('bj-game-player-value').textContent = BJ.handValue(playerCards);
            document.getElementById('bj-game-dealer-value').textContent = dealerCards[0].rank;

            if (BJ.isBlackjack(playerCards)) { revealAndResolve(); return; }

            phase = 'playing';
            document.getElementById('bj-game-bet-controls').style.display = 'none';
            document.getElementById('bj-game-actions').style.display = 'flex';
            const splitBtn = document.querySelector('#bj-game-actions [data-action="split"]');
            if (splitBtn) splitBtn.disabled = !BJ.isPair(playerCards);
            showStrategyHint();
            Sound.deal();
            updateDisplay();
        };

        // Player actions
        document.querySelectorAll('#bj-game-actions .bj-action-btn').forEach(btn => {
            btn.onclick = () => {
                if (phase !== 'playing') return;
                const action = btn.dataset.action;
                if (action === 'hit') {
                    playerCards.push(CardEngine.deal(shoe));
                    renderHand(playerCards, 'bj-game-player-hand');
                    document.getElementById('bj-game-player-value').textContent = BJ.handValue(playerCards);
                    Sound.deal();
                    updateDisplay();
                    if (BJ.isBust(playerCards)) { revealAndResolve(); return; }
                    if (BJ.handValue(playerCards) === 21) { revealAndResolve(); return; }
                    showStrategyHint();
                } else if (action === 'stand') {
                    revealAndResolve();
                } else if (action === 'double') {
                    if (currentBet * 2 > gameStats.bankroll) { alert('Not enough to double!'); return; }
                    currentBet *= 2;
                    document.getElementById('bj-game-bet').textContent = `$${currentBet}`;
                    playerCards.push(CardEngine.deal(shoe));
                    renderHand(playerCards, 'bj-game-player-hand');
                    document.getElementById('bj-game-player-value').textContent = BJ.handValue(playerCards);
                    Sound.deal();
                    updateDisplay();
                    revealAndResolve();
                } else if (action === 'split') {
                    showFeedback('bj-game-feedback', true, 'Split not yet supported — coming soon!');
                }
            };
        });
    }

    function showBetting() {
        phase = 'betting';
        document.getElementById('bj-game-bet-controls').style.display = 'flex';
        document.getElementById('bj-game-actions').style.display = 'none';
        hideFeedback('bj-game-feedback');
        hideFeedback('bj-game-hint');
        document.getElementById('bj-game-dealer-hand').innerHTML = '';
        document.getElementById('bj-game-player-hand').innerHTML = '';
        document.getElementById('bj-game-dealer-value').textContent = '';
        document.getElementById('bj-game-player-value').textContent = '';
        updateDisplay();
    }

    function showStrategyHint() {
        const opt = Strategy.getOptimal(playerCards, dealerCards[0]);
        const hint = document.getElementById('bj-game-hint');
        hint.className = 'bj-feedback show hint';
        hint.innerHTML = `Strategy suggests: <strong>${Strategy.ACTION_NAMES[opt.action]}</strong> (${opt.label} vs ${dealerCards[0].rank})`;
    }

    function revealAndResolve() {
        phase = 'result';
        document.getElementById('bj-game-actions').style.display = 'none';
        hideFeedback('bj-game-hint');

        if (!BJ.isBust(playerCards) && !BJ.isBlackjack(playerCards)) {
            while (BJ.handValue(dealerCards) < 17) {
                dealerCards.push(CardEngine.deal(shoe));
            }
        }
        renderHand(dealerCards, 'bj-game-dealer-hand');
        document.getElementById('bj-game-dealer-value').textContent = BJ.handValue(dealerCards);

        const pv = BJ.handValue(playerCards), dv = BJ.handValue(dealerCards);
        const pBJ = BJ.isBlackjack(playerCards), dBJ = BJ.isBlackjack(dealerCards);
        let result, msg;

        if (pBJ && dBJ) { result = 'push'; msg = 'Push — both blackjack!'; }
        else if (pBJ) { result = 'blackjack'; msg = `Blackjack! You win $${Math.floor(currentBet * 1.5)}!`; }
        else if (dBJ) { result = 'lose'; msg = 'Dealer blackjack. You lose.'; }
        else if (pv > 21) { result = 'bust'; msg = `Bust! (${pv}) You lose $${currentBet}.`; }
        else if (dv > 21) { result = 'win'; msg = `Dealer busts! (${dv}) You win $${currentBet}!`; }
        else if (pv > dv) { result = 'win'; msg = `You win! (${pv} vs ${dv}) +$${currentBet}`; }
        else if (dv > pv) { result = 'lose'; msg = `Dealer wins. (${pv} vs ${dv}) -$${currentBet}`; }
        else { result = 'push'; msg = `Push. (${pv} vs ${dv}) Bet returned.`; }

        const s = Stats.load();
        s.game.played++;
        if (result === 'blackjack') { s.game.bankroll += Math.floor(currentBet * 1.5); s.game.won++; }
        else if (result === 'win') { s.game.bankroll += currentBet; s.game.won++; }
        else if (result === 'lose' || result === 'bust') { s.game.bankroll -= currentBet; }
        s.game.peak = Math.max(s.game.peak, s.game.bankroll);
        Stats.save(s);
        gameStats = s.game;

        const isWin = result === 'win' || result === 'blackjack';
        showFeedback('bj-game-feedback', isWin || result === 'push', msg);
        if (isWin) Sound.correct(); else if (result !== 'push') Sound.incorrect();

        currentBet = Math.min(currentBet > 10 ? currentBet / 2 : currentBet, gameStats.bankroll || 10);
        setTimeout(showBetting, 2500);
    }

    return { init };
})();

// ========== STATS MODAL ==========
function initStatsModal() {
    const btn = document.getElementById('bj-stats-btn');
    const modal = document.getElementById('bj-stats-modal');
    const closeBtn = document.getElementById('bj-stats-close');
    const resetBtn = document.getElementById('bj-reset-stats');

    if (btn) btn.onclick = () => {
        const s = Stats.load();
        const pctStrat = s.strategy.total ? Math.round(s.strategy.correct / s.strategy.total * 100) : 0;
        const pctCount = s.counting.total ? Math.round(s.counting.correct / s.counting.total * 100) : 0;
        document.getElementById('bj-stats-content').innerHTML = `
            <table style="width:100%; font-size:0.85rem;">
                <tr><td>Strategy Trainer</td><td>${s.strategy.correct}/${s.strategy.total} (${pctStrat}%) Best streak: ${s.strategy.bestStreak}</td></tr>
                <tr><td>Card Counting</td><td>${s.counting.correct}/${s.counting.total} (${pctCount}%) Best streak: ${s.counting.bestStreak}</td></tr>
                <tr><td>Game</td><td>${s.game.won} won / ${s.game.played} played | Bankroll: $${s.game.bankroll} (Peak: $${s.game.peak})</td></tr>
            </table>`;
        modal.classList.add('show');
    };
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove('show');
    if (resetBtn) resetBtn.onclick = () => {
        if (confirm('Reset all blackjack stats? This cannot be undone.')) {
            Stats.reset();
            modal.classList.remove('show');
        }
    };
}

// ========== KEYBOARD SHORTCUTS ==========
document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const key = e.key.toLowerCase();

    const stratActive = document.getElementById('bj-strategy-panel')?.classList.contains('active');
    const gameActive = document.getElementById('bj-game-panel')?.classList.contains('active');

    if (stratActive) {
        if (key === 'h') StrategyTrainer.answer('H');
        else if (key === 's') StrategyTrainer.answer('S');
        else if (key === 'd') StrategyTrainer.answer('D');
        else if (key === 'p') StrategyTrainer.answer('P');
    }
    if (gameActive) {
        const hitBtn = document.querySelector('#bj-game-actions [data-action="hit"]');
        if (key === 'h' && hitBtn && !hitBtn.disabled) hitBtn.click();
        else if (key === 's') document.querySelector('#bj-game-actions [data-action="stand"]')?.click();
        else if (key === 'd') document.querySelector('#bj-game-actions [data-action="double"]')?.click();
    }
});

// ========== INITIALIZE ==========
let bjInitialized = false;
function initBlackjack() {
    if (bjInitialized) return;
    if (!document.getElementById('bj-app')) return;
    bjInitialized = true;
    initTabs();
    initSoundToggle();
    initStrategyChart();
    initStatsModal();
    StrategyTrainer.init();
    CountingTrainer.init();
    BJGame.init();
}

// astro:page-load fires on both initial load and view-transition navigation
// (Astro's ClientRouter always dispatches it). This is the single init path.
document.addEventListener('astro:page-load', () => {
    bjInitialized = false;
    initBlackjack();
});

// Fallback for direct navigation without ClientRouter (e.g. hard refresh,
// opening the URL directly in a browser without JS transitions)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBlackjack);
} else {
    initBlackjack();
}
