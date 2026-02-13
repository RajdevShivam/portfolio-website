// ============================================================
// TEXAS HOLD'EM POKER — All game logic
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

    function dealFrom(deck, n) {
        return deck.splice(0, n);
    }

    return { SUITS, RANKS, SYMBOLS, COLORS, createDeck, shuffle, dealFrom };
})();

// ========== RENDER CARD ==========
function renderCard(card, faceDown = false) {
    if (faceDown) return '<div class="card card-back"></div>';
    return `<div class="card ${card.color} deal-anim">
        <div class="corner"><span class="rank">${card.rank}</span><span class="suit">${card.sym}</span></div>
        <div class="center-pip">${card.sym}</div>
        <div class="corner corner-br"><span class="rank">${card.rank}</span><span class="suit">${card.sym}</span></div>
    </div>`;
}

// ========== SOUND MANAGER ==========
const Sound = (() => {
    let on = true;
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
        click() { tone(1500, 0.02, 'square'); },
        chips() { tone(600, 0.03, 'square'); setTimeout(() => tone(900, 0.03, 'square'), 40); },
        win() { tone(523, 0.1); setTimeout(() => tone(659, 0.1), 100); setTimeout(() => tone(784, 0.15), 200); },
        fold() { tone(300, 0.06, 'triangle'); },
        allIn() { tone(440, 0.08); setTimeout(() => tone(880, 0.15), 80); setTimeout(() => tone(1320, 0.2), 180); }
    };
})();

// ========== POKER HAND EVALUATOR ==========
const Poker = (() => {
    const RANK_VAL = {'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,'J':11,'Q':12,'K':13,'A':14};
    const HAND_NAMES = ['High Card','One Pair','Two Pair','Three of a Kind','Straight','Flush','Full House','Four of a Kind','Straight Flush','Royal Flush'];

    function evaluate(cards) {
        const sorted = [...cards].sort((a, b) => RANK_VAL[b.rank] - RANK_VAL[a.rank]);
        const vals = sorted.map(c => RANK_VAL[c.rank]);
        const suits = sorted.map(c => c.suit);
        const isFlush = suits.every(s => s === suits[0]);
        const isSeq = v => { for (let i = 1; i < v.length; i++) if (v[i-1] - v[i] !== 1) return false; return true; };
        const isWheel = vals[0] === 14 && vals[1] === 5 && isSeq(vals.slice(1));
        const isStraight = isSeq(vals) || isWheel;
        const freq = {};
        for (const v of vals) freq[v] = (freq[v] || 0) + 1;
        const counts = Object.entries(freq).sort((a, b) => b[1] - a[1] || b[0] - a[0]);
        const c0 = counts[0][1], c1 = counts.length > 1 ? counts[1][1] : 0;
        const kickers = counts.map(([v, n]) => ({ v: +v, n }));
        kickers.sort((a, b) => b.n - a.n || b.v - a.v);
        const k = kickers.map(x => x.v);

        if (isStraight && isFlush && vals[0] === 14 && vals[4] === 10) return { rank: 9, name: 'Royal Flush', k };
        if (isStraight && isFlush) return { rank: 8, name: 'Straight Flush', k: isWheel ? [5,4,3,2,1] : k };
        if (c0 === 4) return { rank: 7, name: 'Four of a Kind', k };
        if (c0 === 3 && c1 === 2) return { rank: 6, name: 'Full House', k };
        if (isFlush) return { rank: 5, name: 'Flush', k };
        if (isStraight) return { rank: 4, name: 'Straight', k: isWheel ? [5,4,3,2,1] : k };
        if (c0 === 3) return { rank: 3, name: 'Three of a Kind', k };
        if (c0 === 2 && c1 === 2) return { rank: 2, name: 'Two Pair', k };
        if (c0 === 2) return { rank: 1, name: 'One Pair', k };
        return { rank: 0, name: 'High Card', k };
    }

    function combos(arr, k) {
        if (k === 0) return [[]];
        if (arr.length < k) return [];
        const [first, ...rest] = arr;
        return [...combos(rest, k - 1).map(c => [first, ...c]), ...combos(rest, k)];
    }

    function bestHand(seven) {
        let best = null;
        for (const combo of combos(seven, 5)) {
            const e = evaluate(combo);
            e.cards = combo;
            if (!best || compare(e, best) > 0) best = e;
        }
        return best;
    }

    function compare(a, b) {
        if (a.rank !== b.rank) return a.rank - b.rank;
        for (let i = 0; i < Math.min(a.k.length, b.k.length); i++)
            if (a.k[i] !== b.k[i]) return a.k[i] - b.k[i];
        return 0;
    }

    return { RANK_VAL, HAND_NAMES, evaluate, bestHand, compare, combos };
})();

// ========== PREFLOP RANGES ==========
const Preflop = (() => {
    const TIERS = {
        premium: ['AA','KK','QQ','AKs'],
        strong: ['JJ','TT','AKo','AQs','AQo','AJs','KQs'],
        playable: ['99','88','ATs','A9s','KJs','KTs','QJs','QTs','JTs','AJo','KQo'],
        marginal: ['77','66','A8s','A7s','A6s','A5s','A4s','A3s','A2s','K9s','Q9s','J9s','T9s','98s','87s','76s','KJo','QJo','JTo'],
        speculative: ['55','44','33','22','K8s','K7s','K6s','K5s','K4s','K3s','K2s','Q8s','J8s','T8s','97s','86s','75s','65s','54s','ATo','A9o','KTo','QTo']
    };

    function notation(c1, c2) {
        const v1 = Poker.RANK_VAL[c1.rank], v2 = Poker.RANK_VAL[c2.rank];
        const hi = v1 >= v2 ? c1 : c2, lo = v1 >= v2 ? c2 : c1;
        const r1 = hi.rank === '10' ? 'T' : hi.rank, r2 = lo.rank === '10' ? 'T' : lo.rank;
        if (r1 === r2) return r1 + r2;
        return r1 + r2 + (hi.suit === lo.suit ? 's' : 'o');
    }

    function tier(hand) {
        for (const [t, hands] of Object.entries(TIERS)) if (hands.includes(hand)) return t;
        return 'unplayable';
    }

    function recommend(c1, c2, pos) {
        const n = notation(c1, c2);
        const t = tier(n);
        const POS = {
            UTG: { open: [...TIERS.premium, ...TIERS.strong, '99','88','ATs','KQs'] },
            MP:  { open: [...TIERS.premium, ...TIERS.strong, ...TIERS.playable.slice(0,6)] },
            CO:  { open: [...TIERS.premium, ...TIERS.strong, ...TIERS.playable, ...TIERS.marginal.slice(0,8)] },
            BTN: { open: [...TIERS.premium, ...TIERS.strong, ...TIERS.playable, ...TIERS.marginal, ...TIERS.speculative.slice(0,10)] },
            SB:  { open: [...TIERS.premium, ...TIERS.strong, ...TIERS.playable, ...TIERS.marginal.slice(0,5)] },
            BB:  { open: [...TIERS.premium, ...TIERS.strong, ...TIERS.playable, ...TIERS.marginal, ...TIERS.speculative] }
        };
        const posData = POS[pos];
        if (posData && posData.open.includes(n)) return { action: 'RAISE', tier: t, notation: n };
        return { action: 'FOLD', tier: t, notation: n };
    }

    function grid() {
        const R = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
        return R.map((r1, i) => R.map((r2, j) => i === j ? r1+r2 : j > i ? r1+r2+'s' : r2+r1+'o'));
    }

    return { TIERS, notation, tier, recommend, grid };
})();

// ========== POT ODDS ==========
const PotOdds = (() => {
    const DRAWS = [
        { name: 'Flush draw (9 outs)', outs: 9, eqTurn: 0.191, eqRiver: 0.350 },
        { name: 'Open-ended straight (8 outs)', outs: 8, eqTurn: 0.170, eqRiver: 0.315 },
        { name: 'Gutshot straight (4 outs)', outs: 4, eqTurn: 0.085, eqRiver: 0.168 },
        { name: 'Two overcards (6 outs)', outs: 6, eqTurn: 0.128, eqRiver: 0.245 },
        { name: 'Flush + gutshot (12 outs)', outs: 12, eqTurn: 0.255, eqRiver: 0.450 },
        { name: 'Flush + OESD (15 outs)', outs: 15, eqTurn: 0.319, eqRiver: 0.543 },
        { name: 'One overcard (3 outs)', outs: 3, eqTurn: 0.064, eqRiver: 0.128 },
        { name: 'Set to full house (7 outs)', outs: 7, eqTurn: 0.149, eqRiver: 0.280 },
    ];
    function scenario() {
        const pot = (Math.floor(Math.random() * 20) + 5) * 10;
        const bet = (Math.floor(Math.random() * 10) + 2) * 10;
        const draw = DRAWS[Math.floor(Math.random() * DRAWS.length)];
        const streets = Math.random() > 0.5 ? 2 : 1;
        const eq = streets === 2 ? draw.eqRiver : draw.eqTurn;
        const po = bet / (pot + bet);
        return { pot, bet, draw: draw.name, outs: draw.outs, equity: eq, streets, potOdds: po, correct: eq >= po ? 'CALL' : 'FOLD' };
    }
    return { DRAWS, scenario };
})();

// ========== POSTFLOP SCENARIOS ==========
const PostflopData = (() => {
    function c(r, s) {
        const SYMS = { s: '\u2660', h: '\u2665', d: '\u2666', c: '\u2663' };
        const COLS = { s: 'black', h: 'red', d: 'red', c: 'black' };
        return { rank: r, suit: s === 's' ? 'spades' : s === 'h' ? 'hearts' : s === 'd' ? 'diamonds' : 'clubs', sym: SYMS[s], color: COLS[s] };
    }
    const SCENARIOS = [
        { hole: [c('A','s'),c('K','s')], community: [c('A','h'),c('7','d'),c('2','c')], street:'Flop', pot:120, bet:60, pos:'BTN', villain:'Villain bets $60', correct:'BET', explain:'Top pair, top kicker on a dry board. Raise for value.' },
        { hole: [c('J','h'),c('10','h')], community: [c('9','h'),c('3','h'),c('K','c')], street:'Flop', pot:80, bet:40, pos:'CO', villain:'Villain bets $40', correct:'CALL', explain:'Flush draw (9 outs) + gutshot (3 outs) = 12 outs ~45% equity. Pot odds 33%. Easy call.' },
        { hole: [c('Q','s'),c('Q','d')], community: [c('J','c'),c('8','s'),c('3','d')], street:'Flop', pot:60, bet:0, pos:'BTN', villain:'Checked to you', correct:'BET', explain:'Overpair on a dry board. Bet for value and protection against overcards.' },
        { hole: [c('7','s'),c('6','s')], community: [c('A','h'),c('K','d'),c('2','c')], street:'Flop', pot:100, bet:75, pos:'BB', villain:'Villain bets $75', correct:'FOLD', explain:'No pair, no draw, facing a large bet on a dry board. Clear fold.' },
        { hole: [c('A','d'),c('5','d')], community: [c('K','d'),c('8','d'),c('3','s')], street:'Flop', pot:90, bet:45, pos:'CO', villain:'Villain bets $45', correct:'CALL', explain:'Nut flush draw with 9 outs. ~35% equity on flop. Pot odds ~33%. Profitable call.' },
        { hole: [c('10','c'),c('10','h')], community: [c('A','s'),c('K','h'),c('J','d')], street:'Flop', pot:80, bet:60, pos:'UTG', villain:'Villain bets $60', correct:'FOLD', explain:'Pocket tens with 3 overcards and a possible straight. Too many scare cards. Fold.' },
        { hole: [c('A','h'),c('A','c')], community: [c('7','s'),c('7','h'),c('2','d')], street:'Flop', pot:100, bet:0, pos:'BTN', villain:'Checked to you', correct:'BET', explain:'Aces full-potential. Bet for value on a paired board.' },
        { hole: [c('K','s'),c('Q','s')], community: [c('J','s'),c('10','h'),c('4','c')], street:'Flop', pot:70, bet:35, pos:'CO', villain:'Villain bets $35', correct:'CALL', explain:'Open-ended straight draw with 8 outs (~32%). Pot odds ~33%. Borderline but implied odds make it a call.' },
        { hole: [c('9','d'),c('9','c')], community: [c('Q','h'),c('J','s'),c('3','d'),c('5','c')], street:'Turn', pot:150, bet:100, pos:'BTN', villain:'Villain bets $100', correct:'FOLD', explain:'Underpair on a Q-J board facing turn aggression. Likely beaten by Qx or Jx. Fold.' },
        { hole: [c('A','s'),c('K','d')], community: [c('A','c'),c('8','h'),c('5','s'),c('2','d')], street:'Turn', pot:200, bet:0, pos:'BTN', villain:'Checked to you', correct:'BET', explain:'Top pair top kicker on turn. Bet for value to build the pot.' },
        { hole: [c('6','h'),c('5','h')], community: [c('4','h'),c('3','h'),c('K','c')], street:'Flop', pot:60, bet:30, pos:'BB', villain:'Villain bets $30', correct:'CALL', explain:'Flush draw + open-ended straight draw = monster combo draw (~54% equity). Easy call, could even raise.' },
        { hole: [c('J','c'),c('J','d')], community: [c('J','s'),c('8','h'),c('4','d')], street:'Flop', pot:80, bet:0, pos:'CO', villain:'Checked to you', correct:'BET', explain:'Set of jacks on a dry board. Bet for value.' },
        { hole: [c('K','h'),c('10','h')], community: [c('Q','c'),c('9','s'),c('3','d')], street:'Flop', pot:70, bet:35, pos:'BTN', villain:'Villain bets $35', correct:'CALL', explain:'Open-ended straight draw (8 outs ~32%). Good pot odds at 33%. Call and reassess turn.' },
        { hole: [c('A','c'),c('2','c')], community: [c('K','c'),c('J','c'),c('7','s'),c('4','h')], street:'Turn', pot:180, bet:90, pos:'CO', villain:'Villain bets $90', correct:'CALL', explain:'Nut flush draw on the turn. 9 outs with 1 card = ~20%. Strong implied odds if flush hits.' },
        { hole: [c('8','s'),c('8','d')], community: [c('A','h'),c('A','s'),c('K','c'),c('Q','d'),c('J','h')], street:'River', pot:300, bet:200, pos:'BB', villain:'Villain bets $200 on river', correct:'FOLD', explain:'River with AAKQJ on board and pocket 8s. Any Ace, King, Queen, Jack, or Ten beats you. Clear fold.' },
        { hole: [c('A','d'),c('Q','h')], community: [c('Q','s'),c('9','d'),c('4','c'),c('2','h'),c('7','s')], street:'River', pot:250, bet:0, pos:'BTN', villain:'Checked to you on river', correct:'BET', explain:'Top pair good kicker on a blank river. Value bet against weaker queens and pairs.' },
        { hole: [c('K','c'),c('K','d')], community: [c('A','h'),c('10','s'),c('5','c'),c('3','d')], street:'Turn', pot:120, bet:80, pos:'MP', villain:'Villain bets $80 on turn', correct:'CALL', explain:'Kings with one overcard. Often still best. Villain could be bluffing or have a ten. Call.' },
        { hole: [c('5','s'),c('4','s')], community: [c('A','c'),c('K','h'),c('Q','d')], street:'Flop', pot:50, bet:50, pos:'BB', villain:'Villain bets pot ($50)', correct:'FOLD', explain:'No pair, no draw, board completely missed. Pot-sized bet = fold.' },
    ];
    function get() { return SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)]; }
    return { SCENARIOS, get };
})();

// ========== TRAINER STATS ==========
const TrainerStats = (() => {
    const KEY = 'pokerTrainerStats';
    function defaults() {
        return {
            rankings: { correct: 0, total: 0, streak: 0, bestStreak: 0 },
            preflop:  { correct: 0, total: 0, streak: 0, bestStreak: 0 },
            potodds:  { correct: 0, total: 0, streak: 0, bestStreak: 0 },
            postflop: { correct: 0, total: 0, streak: 0, bestStreak: 0 }
        };
    }
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
    return { load, save, record, reset };
})();

// ========== POKER STATS ==========
const PokerStats = (() => {
    const KEY = 'pokerHoldemStats';
    function defaults() {
        return {
            handsPlayed: 0, handsWon: 0, totalProfit: 0,
            peakStack: 1000, currentStack: 1000, biggestPot: 0,
            rollingWindow: []
        };
    }
    function load() {
        try { const s = localStorage.getItem(KEY); return s ? { ...defaults(), ...JSON.parse(s) } : defaults(); }
        catch { return defaults(); }
    }
    function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }
    function recordHand(won, profit, potSize) {
        const s = load();
        s.handsPlayed++;
        if (won) s.handsWon++;
        s.totalProfit += profit;
        s.currentStack += profit;
        if (s.currentStack > s.peakStack) s.peakStack = s.currentStack;
        if (potSize > s.biggestPot) s.biggestPot = potSize;
        s.rollingWindow.push(won ? 1 : (profit < 0 ? -1 : 0));
        if (s.rollingWindow.length > 30) s.rollingWindow.shift();
        save(s);
        return s;
    }
    function getWinRate() {
        const s = load();
        const w = s.rollingWindow;
        if (w.length < 5) return 0.5;
        return w.filter(x => x > 0).length / w.length;
    }
    function reset() { localStorage.removeItem(KEY); }
    return { load, save, recordHand, getWinRate, reset, defaults };
})();

// ========== AI PERSONALITY PROFILES ==========
const AIPersonality = (() => {
    const PROFILES = {
        beginner: {
            name: 'Beginner', vpip: 0.65, pfr: 0.10, aggression: 0.15,
            bluffFreq: 0.05, foldToBet: 0.60, foldToRaise: 0.80,
            positionAware: 0.1, potOddsAware: 0.2, overbetFreq: 0.0,
            checkRaiseFreq: 0.02, slowplayFreq: 0.30
        },
        intermediate: {
            name: 'TAG', vpip: 0.22, pfr: 0.18, aggression: 0.55,
            bluffFreq: 0.20, foldToBet: 0.35, foldToRaise: 0.50,
            positionAware: 0.6, potOddsAware: 0.7, overbetFreq: 0.05,
            checkRaiseFreq: 0.08, slowplayFreq: 0.10
        },
        shark: {
            name: 'Shark', vpip: 0.26, pfr: 0.22, aggression: 0.70,
            bluffFreq: 0.35, foldToBet: 0.25, foldToRaise: 0.30,
            positionAware: 0.95, potOddsAware: 0.95, overbetFreq: 0.12,
            checkRaiseFreq: 0.15, slowplayFreq: 0.05
        },
        maniac: {
            name: 'Maniac', vpip: 0.80, pfr: 0.55, aggression: 0.90,
            bluffFreq: 0.55, foldToBet: 0.10, foldToRaise: 0.15,
            positionAware: 0.3, potOddsAware: 0.3, overbetFreq: 0.40,
            checkRaiseFreq: 0.25, slowplayFreq: 0.02
        },
        rock: {
            name: 'Rock', vpip: 0.12, pfr: 0.10, aggression: 0.40,
            bluffFreq: 0.03, foldToBet: 0.55, foldToRaise: 0.70,
            positionAware: 0.5, potOddsAware: 0.6, overbetFreq: 0.0,
            checkRaiseFreq: 0.03, slowplayFreq: 0.15
        }
    };

    const NAMES = {
        beginner: ['Lucky Lucy', 'Casual Carl', 'Newbie Nick', 'Chill Charlie'],
        intermediate: ['Steady Steve', 'Solid Sarah', 'Method Mike', 'Balanced Beth'],
        shark: ['Sammy Shark', 'Pro Priya', 'GTO Greg', 'Sharp Shane'],
        maniac: ['Wild Wendy', 'Crazy Craig', 'Chaos Chris', 'Reckless Rex'],
        rock: ['Tight Tim', 'Patient Pat', 'Granite Gary', 'Stony Stan']
    };

    function getProfile(key) { return { ...PROFILES[key] }; }
    function getRandomName(key) {
        const names = NAMES[key];
        return names[Math.floor(Math.random() * names.length)];
    }

    return { PROFILES, NAMES, getProfile, getRandomName };
})();

// ========== AI DECISION ENGINE ==========
const AIDecision = (() => {
    const TIER_STRENGTH = { premium: 0.90, strong: 0.75, playable: 0.55, marginal: 0.35, speculative: 0.20, unplayable: 0.08 };

    function handStrength(holeCards, communityCards, numOpponents) {
        if (communityCards.length === 0) {
            const n = Preflop.notation(holeCards[0], holeCards[1]);
            const t = Preflop.tier(n);
            return TIER_STRENGTH[t] || 0.08;
        }

        const usedKeys = new Set([...holeCards, ...communityCards].map(c => c.rank + c.suit));
        const remaining = CardEngine.createDeck().filter(c => !usedKeys.has(c.rank + c.suit));
        let wins = 0, ties = 0;
        const trials = 150;

        for (let i = 0; i < trials; i++) {
            const shuffled = CardEngine.shuffle(remaining);
            let pos = 0;
            const simBoard = [...communityCards];
            while (simBoard.length < 5) simBoard.push(shuffled[pos++]);
            const myBest = Poker.bestHand([...holeCards, ...simBoard]);
            let beaten = false, tied = false;
            for (let o = 0; o < numOpponents; o++) {
                const oppCards = [shuffled[pos++], shuffled[pos++]];
                const oppBest = Poker.bestHand([...oppCards, ...simBoard]);
                const cmp = Poker.compare(myBest, oppBest);
                if (cmp < 0) { beaten = true; break; }
                if (cmp === 0) tied = true;
            }
            if (!beaten) { if (tied) ties++; else wins++; }
        }
        return (wins + ties * 0.5) / trials;
    }

    function decide(player, gameState) {
        const profile = player.personality;
        const hole = player.holeCards;
        const community = gameState.communityCards;
        const pot = gameState.pot;
        const toCall = gameState.currentBet - player.currentBet;
        const stack = player.stack;
        const activePlayers = gameState.activePlayers;

        // Hand strength
        let hs = handStrength(hole, community, Math.max(1, activePlayers - 1));

        // Position adjustment
        const posOrder = ['UTG', 'UTG1', 'MP', 'CO', 'BTN', 'SB', 'BB'];
        const posIndex = Math.min(player.positionIndex || 0, posOrder.length - 1);
        const posBonus = posIndex >= 4 ? 0.15 : (posIndex <= 1 ? -0.15 : 0);
        hs = Math.max(0, Math.min(1, hs + posBonus * profile.positionAware));

        // Thresholds
        const foldThreshold = 0.25 + (1 - profile.vpip) * 0.30;
        const callThreshold = foldThreshold + 0.15;
        const raiseThreshold = callThreshold + 0.10 + profile.aggression * 0.10;

        // Pot odds adjustment
        if (toCall > 0 && profile.potOddsAware > 0.5) {
            const potOdds = toCall / (pot + toCall);
            if (hs > potOdds) hs += 0.05;
        }

        let action, amount = 0;

        // Base decision
        if (toCall === 0) {
            // Can check
            if (hs >= raiseThreshold) {
                if (hs > 0.85 && Math.random() < profile.slowplayFreq) {
                    action = 'check';
                } else {
                    action = 'raise';
                }
            } else {
                action = 'check';
            }
        } else {
            // Must call or fold
            if (hs >= raiseThreshold) action = 'raise';
            else if (hs >= callThreshold) action = 'call';
            else if (hs >= foldThreshold) action = Math.random() < 0.5 ? 'call' : 'fold';
            else action = 'fold';
        }

        // Bluff override
        if (action === 'fold' && Math.random() < profile.bluffFreq) {
            action = Math.random() < 0.4 ? 'raise' : 'call';
        }
        if (action === 'check' && hs < 0.4 && Math.random() < profile.bluffFreq * 0.5) {
            action = 'raise';
        }

        // Fold to heavy aggression
        if (toCall > 0 && action !== 'fold') {
            const betRatio = toCall / Math.max(pot, 1);
            if (betRatio > 0.5 && Math.random() < profile.foldToBet * betRatio) {
                action = 'fold';
            }
        }

        // Check-raise (set flag for future — for now just raise)
        if (action === 'check' && hs > 0.80 && Math.random() < profile.checkRaiseFreq) {
            action = 'check'; // Will check-raise on next opportunity
        }

        // Jitter: 8% chance to shift action
        if (Math.random() < 0.08) {
            if (action === 'fold' && toCall < pot * 0.3) action = 'call';
            else if (action === 'call') action = Math.random() < 0.5 ? 'raise' : 'fold';
            else if (action === 'raise') action = 'call';
        }

        // Bet sizing
        if (action === 'raise') {
            const minRaise = gameState.minRaise || gameState.bigBlind;
            if (Math.random() < profile.overbetFreq) {
                amount = Math.floor(pot * (1.5 + Math.random()));
            } else {
                amount = Math.floor(pot * (0.5 + Math.random() * 0.5));
            }
            amount = Math.max(amount, minRaise);
            amount = Math.min(amount, stack);
            if (amount >= stack * 0.9) {
                action = 'allIn';
                amount = stack;
            }
        }

        if (action === 'call') {
            amount = Math.min(toCall, stack);
            if (amount >= stack) {
                action = 'allIn';
                amount = stack;
            }
        }

        return { action, amount };
    }

    return { handStrength, decide, TIER_STRENGTH };
})();

// ========== SHOCK SYSTEM ==========
const ShockSystem = (() => {
    let meter = 0;
    const WINDOW = 20;
    let results = [];
    let activeShifts = [];
    let badBeatCooldown = 0;

    const SHIFT_MAP = { rock: 'maniac', intermediate: 'maniac', beginner: 'shark', maniac: 'rock', shark: 'beginner' };

    const COOLER_TEMPLATES = [
        {
            player: [{rank:'A',suit:'hearts'},{rank:'K',suit:'hearts'}],
            ai: [{rank:'9',suit:'diamonds'},{rank:'9',suit:'clubs'}],
            board: [{rank:'9',suit:'hearts'},{rank:'7',suit:'hearts'},{rank:'3',suit:'hearts'},{rank:'7',suit:'spades'},{rank:'2',suit:'clubs'}],
            desc: 'Nut flush vs full house'
        },
        {
            player: [{rank:'J',suit:'clubs'},{rank:'10',suit:'diamonds'}],
            ai: [{rank:'5',suit:'spades'},{rank:'8',suit:'spades'}],
            board: [{rank:'Q',suit:'spades'},{rank:'9',suit:'spades'},{rank:'8',suit:'clubs'},{rank:'3',suit:'spades'},{rank:'K',suit:'hearts'}],
            desc: 'Straight vs flush'
        },
        {
            player: [{rank:'K',suit:'spades'},{rank:'K',suit:'diamonds'}],
            ai: [{rank:'A',suit:'hearts'},{rank:'A',suit:'clubs'}],
            board: [{rank:'K',suit:'hearts'},{rank:'A',suit:'spades'},{rank:'5',suit:'diamonds'},{rank:'8',suit:'clubs'},{rank:'2',suit:'hearts'}],
            desc: 'Set of kings vs set of aces'
        },
        {
            player: [{rank:'A',suit:'diamonds'},{rank:'K',suit:'diamonds'}],
            ai: [{rank:'6',suit:'clubs'},{rank:'6',suit:'spades'}],
            board: [{rank:'6',suit:'hearts'},{rank:'K',suit:'clubs'},{rank:'A',suit:'clubs'},{rank:'9',suit:'diamonds'},{rank:'3',suit:'hearts'}],
            desc: 'Top two pair vs set of sixes'
        },
        {
            player: [{rank:'Q',suit:'hearts'},{rank:'J',suit:'hearts'}],
            ai: [{rank:'K',suit:'hearts'},{rank:'10',suit:'hearts'}],
            board: [{rank:'9',suit:'hearts'},{rank:'8',suit:'hearts'},{rank:'2',suit:'clubs'},{rank:'4',suit:'diamonds'},{rank:'7',suit:'spades'}],
            desc: 'Queen-high flush vs king-high flush'
        },
        {
            player: [{rank:'J',suit:'spades'},{rank:'J',suit:'diamonds'}],
            ai: [{rank:'Q',suit:'clubs'},{rank:'Q',suit:'hearts'}],
            board: [{rank:'J',suit:'clubs'},{rank:'Q',suit:'spades'},{rank:'5',suit:'hearts'},{rank:'2',suit:'diamonds'},{rank:'8',suit:'clubs'}],
            desc: 'Set of jacks vs set of queens'
        },
        {
            player: [{rank:'A',suit:'clubs'},{rank:'Q',suit:'clubs'}],
            ai: [{rank:'7',suit:'diamonds'},{rank:'7',suit:'hearts'}],
            board: [{rank:'7',suit:'clubs'},{rank:'Q',suit:'diamonds'},{rank:'A',suit:'diamonds'},{rank:'6',suit:'spades'},{rank:'10',suit:'hearts'}],
            desc: 'Top two pair vs hidden set'
        },
        {
            player: [{rank:'10',suit:'diamonds'},{rank:'9',suit:'diamonds'}],
            ai: [{rank:'J',suit:'clubs'},{rank:'8',suit:'clubs'}],
            board: [{rank:'Q',suit:'hearts'},{rank:'J',suit:'diamonds'},{rank:'8',suit:'diamonds'},{rank:'7',suit:'spades'},{rank:'3',suit:'clubs'}],
            desc: 'Queen-high straight vs lower two pair'
        },
        {
            player: [{rank:'K',suit:'clubs'},{rank:'Q',suit:'clubs'}],
            ai: [{rank:'A',suit:'spades'},{rank:'A',suit:'hearts'}],
            board: [{rank:'K',suit:'hearts'},{rank:'Q',suit:'diamonds'},{rank:'3',suit:'clubs'},{rank:'9',suit:'spades'},{rank:'4',suit:'hearts'}],
            desc: 'Two pair vs aces overpair'
        },
        {
            player: [{rank:'8',suit:'hearts'},{rank:'8',suit:'spades'}],
            ai: [{rank:'5',suit:'diamonds'},{rank:'5',suit:'clubs'}],
            board: [{rank:'8',suit:'diamonds'},{rank:'5',suit:'hearts'},{rank:'K',suit:'clubs'},{rank:'5',suit:'spades'},{rank:'2',suit:'hearts'}],
            desc: 'Full house eights vs quads fives'
        },
        {
            player: [{rank:'A',suit:'spades'},{rank:'J',suit:'spades'}],
            ai: [{rank:'10',suit:'hearts'},{rank:'10',suit:'spades'}],
            board: [{rank:'10',suit:'clubs'},{rank:'J',suit:'diamonds'},{rank:'A',suit:'hearts'},{rank:'3',suit:'clubs'},{rank:'7',suit:'diamonds'}],
            desc: 'Top two pair vs hidden set of tens'
        },
        {
            player: [{rank:'K',suit:'hearts'},{rank:'J',suit:'clubs'}],
            ai: [{rank:'Q',suit:'spades'},{rank:'10',suit:'clubs'}],
            board: [{rank:'A',suit:'diamonds'},{rank:'K',suit:'diamonds'},{rank:'Q',suit:'hearts'},{rank:'J',suit:'spades'},{rank:'9',suit:'hearts'}],
            desc: 'Ace-high straight vs broadway straight (split? no — both have A-high straight, but 10 makes it)'
        },
        {
            player: [{rank:'A',suit:'diamonds'},{rank:'9',suit:'diamonds'}],
            ai: [{rank:'3',suit:'diamonds'},{rank:'2',suit:'diamonds'}],
            board: [{rank:'K',suit:'diamonds'},{rank:'Q',suit:'diamonds'},{rank:'6',suit:'hearts'},{rank:'4',suit:'diamonds'},{rank:'8',suit:'clubs'}],
            desc: 'Ace-high flush vs sneaky low flush'
        },
        {
            player: [{rank:'Q',suit:'clubs'},{rank:'Q',suit:'diamonds'}],
            ai: [{rank:'K',suit:'spades'},{rank:'K',suit:'clubs'}],
            board: [{rank:'Q',suit:'hearts'},{rank:'K',suit:'hearts'},{rank:'4',suit:'spades'},{rank:'7',suit:'diamonds'},{rank:'2',suit:'clubs'}],
            desc: 'Set of queens vs set of kings'
        },
        {
            player: [{rank:'A',suit:'hearts'},{rank:'K',suit:'spades'}],
            ai: [{rank:'2',suit:'hearts'},{rank:'2',suit:'diamonds'}],
            board: [{rank:'A',suit:'clubs'},{rank:'K',suit:'clubs'},{rank:'2',suit:'clubs'},{rank:'9',suit:'hearts'},{rank:'6',suit:'diamonds'}],
            desc: 'Top two pair vs sneaky set of deuces'
        },
        {
            player: [{rank:'J',suit:'hearts'},{rank:'10',suit:'hearts'}],
            ai: [{rank:'A',suit:'clubs'},{rank:'5',suit:'clubs'}],
            board: [{rank:'Q',suit:'spades'},{rank:'9',suit:'clubs'},{rank:'8',suit:'hearts'},{rank:'3',suit:'clubs'},{rank:'2',suit:'clubs'}],
            desc: 'Straight vs runner-runner flush'
        },
        {
            player: [{rank:'A',suit:'spades'},{rank:'A',suit:'diamonds'}],
            ai: [{rank:'7',suit:'clubs'},{rank:'6',suit:'clubs'}],
            board: [{rank:'5',suit:'clubs'},{rank:'4',suit:'clubs'},{rank:'3',suit:'hearts'},{rank:'8',suit:'clubs'},{rank:'K',suit:'hearts'}],
            desc: 'Pocket aces vs straight flush draw that got there'
        },
        {
            player: [{rank:'K',suit:'diamonds'},{rank:'10',suit:'spades'}],
            ai: [{rank:'A',suit:'diamonds'},{rank:'3',suit:'diamonds'}],
            board: [{rank:'K',suit:'clubs'},{rank:'10',suit:'diamonds'},{rank:'6',suit:'diamonds'},{rank:'8',suit:'diamonds'},{rank:'2',suit:'spades'}],
            desc: 'Two pair kings and tens vs ace-high flush'
        },
        {
            player: [{rank:'J',suit:'diamonds'},{rank:'J',suit:'clubs'}],
            ai: [{rank:'4',suit:'hearts'},{rank:'4',suit:'spades'}],
            board: [{rank:'J',suit:'spades'},{rank:'4',suit:'diamonds'},{rank:'4',suit:'clubs'},{rank:'9',suit:'hearts'},{rank:'2',suit:'diamonds'}],
            desc: 'Full house jacks over fours vs quad fours'
        },
        {
            player: [{rank:'A',suit:'clubs'},{rank:'K',suit:'clubs'}],
            ai: [{rank:'9',suit:'spades'},{rank:'8',suit:'spades'}],
            board: [{rank:'10',suit:'spades'},{rank:'J',suit:'spades'},{rank:'Q',suit:'spades'},{rank:'3',suit:'hearts'},{rank:'6',suit:'diamonds'}],
            desc: 'Ace-high straight vs straight flush'
        }
    ];

    function addSuitsToTemplate(card) {
        return { ...card, sym: CardEngine.SYMBOLS[card.suit], color: CardEngine.COLORS[card.suit] };
    }

    function recordResult(outcome) {
        results.push(outcome);
        if (results.length > WINDOW) results.shift();
        const wins = results.filter(r => r > 0).length;
        const played = results.filter(r => r !== 0).length;
        const winRate = played > 0 ? wins / played : 0.5;
        if (winRate > 0.50) {
            meter = Math.min(1.0, meter + (winRate - 0.50) * 0.3);
        } else {
            meter = Math.max(0.0, meter - 0.05);
        }
        if (badBeatCooldown > 0) badBeatCooldown--;
    }

    function shouldTriggerShock() {
        return Math.random() < meter * 0.40;
    }

    function getShockType() {
        if (badBeatCooldown > 0) return 'style_shift';
        return Math.random() < 0.60 ? 'bad_beat' : 'style_shift';
    }

    function rigDeal() {
        const template = COOLER_TEMPLATES[Math.floor(Math.random() * COOLER_TEMPLATES.length)];
        badBeatCooldown = 10;
        return {
            playerCards: template.player.map(addSuitsToTemplate),
            aiCards: template.ai.map(addSuitsToTemplate),
            board: template.board.map(addSuitsToTemplate),
            desc: template.desc
        };
    }

    function triggerStyleShift(aiPlayers) {
        const active = aiPlayers.filter(p => !p.busted && p.stack > 0);
        if (active.length === 0) return null;
        const target = active[Math.floor(Math.random() * active.length)];
        const newKey = SHIFT_MAP[target.personalityKey] || 'intermediate';
        const shift = {
            playerIndex: target.seatIndex,
            original: target.personalityKey,
            newKey,
            handsRemaining: 5 + Math.floor(Math.random() * 6)
        };
        activeShifts.push(shift);
        target.personalityKey = newKey;
        target.personality = AIPersonality.getProfile(newKey);
        return shift;
    }

    function tickShifts(aiPlayers) {
        for (let i = activeShifts.length - 1; i >= 0; i--) {
            activeShifts[i].handsRemaining--;
            if (activeShifts[i].handsRemaining <= 0) {
                const shift = activeShifts[i];
                const target = aiPlayers.find(p => p.seatIndex === shift.playerIndex);
                if (target) {
                    target.personalityKey = shift.original;
                    target.personality = AIPersonality.getProfile(shift.original);
                }
                activeShifts.splice(i, 1);
            }
        }
    }

    function getMeter() { return meter; }
    function reset() { meter = 0; results = []; activeShifts = []; badBeatCooldown = 0; }

    return { recordResult, shouldTriggerShock, getShockType, rigDeal, triggerStyleShift, tickShifts, getMeter, reset };
})();

// ========== ADAPTIVE DIFFICULTY ==========
const AdaptiveDifficulty = (() => {
    let handsSinceAdjust = 0;
    const ADJUST_INTERVAL = 15;

    function shouldAdjust() {
        handsSinceAdjust++;
        if (handsSinceAdjust >= ADJUST_INTERVAL) {
            handsSinceAdjust = 0;
            return true;
        }
        return false;
    }

    function adjust(aiPlayers) {
        const winRate = PokerStats.getWinRate();
        const strengthOrder = ['beginner', 'intermediate', 'rock', 'maniac', 'shark'];

        if (winRate > 0.55) {
            // Player dominating: upgrade weakest AI
            const weakest = aiPlayers
                .filter(p => !p.busted)
                .sort((a, b) => strengthOrder.indexOf(a.personalityKey) - strengthOrder.indexOf(b.personalityKey))[0];
            if (weakest && weakest.personalityKey !== 'shark') {
                const idx = strengthOrder.indexOf(weakest.personalityKey);
                const newKey = strengthOrder[Math.min(idx + 2, strengthOrder.length - 1)];
                weakest.personalityKey = newKey;
                weakest.personality = AIPersonality.getProfile(newKey);
                weakest.name = AIPersonality.getRandomName(newKey);
                return { type: 'upgrade', player: weakest.name, from: strengthOrder[idx], to: newKey };
            }
        } else if (winRate < 0.30) {
            // Player struggling: downgrade strongest AI
            const strongest = aiPlayers
                .filter(p => !p.busted)
                .sort((a, b) => strengthOrder.indexOf(b.personalityKey) - strengthOrder.indexOf(a.personalityKey))[0];
            if (strongest && strongest.personalityKey !== 'beginner') {
                const idx = strengthOrder.indexOf(strongest.personalityKey);
                const newKey = strengthOrder[Math.max(idx - 2, 0)];
                strongest.personalityKey = newKey;
                strongest.personality = AIPersonality.getProfile(newKey);
                strongest.name = AIPersonality.getRandomName(newKey);
                return { type: 'downgrade', player: strongest.name, from: strengthOrder[idx], to: newKey };
            }
        }
        return null;
    }

    function reset() { handsSinceAdjust = 0; }
    return { shouldAdjust, adjust, reset };
})();

// ========== HOLDEM ENGINE ==========
const HoldemEngine = (() => {
    let state = {
        phase: 'IDLE',
        players: [],
        deck: [],
        communityCards: [],
        pot: 0,
        sidePots: [],
        currentBet: 0,
        minRaise: 0,
        dealerIndex: 0,
        smallBlind: 5,
        bigBlind: 10,
        activePlayerIndex: -1,
        lastRaiserIndex: -1,
        handNumber: 0
    };

    let onUpdate = null;
    let resolveHumanAction = null;

    function init(config) {
        state.players = config.players;
        state.smallBlind = config.smallBlind || 5;
        state.bigBlind = config.bigBlind || 10;
        state.dealerIndex = 0;
        state.handNumber = 0;
    }

    function setUpdateCallback(cb) { onUpdate = cb; }

    function getState() { return state; }

    function getActivePlayers() {
        return state.players.filter(p => !p.folded && !p.busted && p.stack > 0);
    }

    function getPlayersInHand() {
        return state.players.filter(p => !p.folded && !p.busted);
    }

    function nextActiveIndex(fromIndex) {
        for (let i = 1; i <= state.players.length; i++) {
            const idx = (fromIndex + i) % state.players.length;
            const p = state.players[idx];
            if (!p.folded && !p.busted && !p.allIn) return idx;
        }
        return -1;
    }

    function postBlinds() {
        const sb = (state.dealerIndex + 1) % state.players.length;
        const bb = (state.dealerIndex + 2) % state.players.length;
        const sbPlayer = state.players[sb];
        const bbPlayer = state.players[bb];

        const sbAmount = Math.min(state.smallBlind, sbPlayer.stack);
        sbPlayer.stack -= sbAmount;
        sbPlayer.currentBet = sbAmount;
        sbPlayer.totalInvested = sbAmount;
        if (sbPlayer.stack === 0) sbPlayer.allIn = true;

        const bbAmount = Math.min(state.bigBlind, bbPlayer.stack);
        bbPlayer.stack -= bbAmount;
        bbPlayer.currentBet = bbAmount;
        bbPlayer.totalInvested = bbAmount;
        if (bbPlayer.stack === 0) bbPlayer.allIn = true;

        state.pot = sbAmount + bbAmount;
        state.currentBet = bbAmount;
        state.minRaise = state.bigBlind;
    }

    function dealHoleCards(riggedDeal) {
        if (riggedDeal) {
            // Rigged deal: set specific cards for player and one AI
            const usedCards = new Set();
            const allRiggedCards = [...riggedDeal.playerCards, ...riggedDeal.aiCards, ...riggedDeal.board];
            allRiggedCards.forEach(c => usedCards.add(c.rank + c.suit));

            const remainingDeck = CardEngine.shuffle(
                CardEngine.createDeck().filter(c => !usedCards.has(c.rank + c.suit))
            );
            let pos = 0;

            // Find the strongest AI to receive the cooler hand
            const aiIndices = state.players
                .map((p, i) => ({ p, i }))
                .filter(x => !x.p.isHuman && !x.p.busted);
            const coolerTarget = aiIndices[Math.floor(Math.random() * aiIndices.length)];

            for (const p of state.players) {
                if (p.busted) continue;
                if (p.isHuman) {
                    p.holeCards = riggedDeal.playerCards;
                } else if (p.seatIndex === coolerTarget.i) {
                    p.holeCards = riggedDeal.aiCards;
                } else {
                    p.holeCards = [remainingDeck[pos++], remainingDeck[pos++]];
                }
            }
            state.deck = remainingDeck.slice(pos);
            state._riggedBoard = riggedDeal.board;
        } else {
            state.deck = CardEngine.shuffle(CardEngine.createDeck());
            for (const p of state.players) {
                if (p.busted) continue;
                p.holeCards = CardEngine.dealFrom(state.deck, 2);
            }
            state._riggedBoard = null;
        }
    }

    function dealCommunity(count) {
        if (state._riggedBoard && state.communityCards.length === 0 && count >= 3) {
            // Use rigged board
            state.communityCards = [...state._riggedBoard.slice(0, count)];
        } else if (state._riggedBoard && state.communityCards.length < state._riggedBoard.length) {
            const needed = state.communityCards.length + count;
            while (state.communityCards.length < needed && state.communityCards.length < state._riggedBoard.length) {
                state.communityCards.push(state._riggedBoard[state.communityCards.length]);
            }
        } else {
            const cards = CardEngine.dealFrom(state.deck, count);
            state.communityCards.push(...cards);
        }
    }

    function resetForNewHand() {
        // Bug 4 fix: increment hand number BEFORE the hand starts
        state.handNumber++;
        for (const p of state.players) {
            p.holeCards = [];
            p.currentBet = 0;
            p.totalInvested = 0;
            p.folded = false;
            p.allIn = false;
            p.showCards = false;
            p.lastAction = null;
            if (p.stack <= 0 && !p.busted) p.busted = true;
        }
        state.communityCards = [];
        state.pot = 0;
        state.sidePots = [];
        state.currentBet = 0;
        state.minRaise = state.bigBlind;
        state._riggedBoard = null;
    }

    function advanceDealer() {
        for (let i = 1; i <= state.players.length; i++) {
            const idx = (state.dealerIndex + i) % state.players.length;
            if (!state.players[idx].busted) {
                state.dealerIndex = idx;
                return;
            }
        }
    }

    function assignPositions() {
        const posLabels = ['BTN', 'SB', 'BB', 'UTG', 'UTG1', 'MP'];
        let posIdx = 0;
        for (let i = 0; i < state.players.length; i++) {
            const idx = (state.dealerIndex + i) % state.players.length;
            const p = state.players[idx];
            if (!p.busted) {
                p.position = posLabels[posIdx] || 'MP';
                p.positionIndex = posIdx;
                posIdx++;
            }
        }
    }

    async function bettingRound(startIdx) {
        state.phase = state.communityCards.length === 0 ? 'PREFLOP' :
                      state.communityCards.length === 3 ? 'FLOP' :
                      state.communityCards.length === 4 ? 'TURN' : 'RIVER';

        let currentIdx = startIdx;
        let lastRaiser = -1;
        let actedSet = new Set();
        const maxIterations = state.players.length * 4;
        let iterations = 0;

        // Count non-allIn players who can still act
        function countCanAct() {
            return getPlayersInHand().filter(p => !p.allIn).length;
        }

        if (countCanAct() === 0) return;

        while (iterations++ < maxIterations) {
            const player = state.players[currentIdx];

            if (player.folded || player.busted || player.allIn) {
                currentIdx = (currentIdx + 1) % state.players.length;
                continue;
            }

            // Exit: we've looped back to the last raiser
            if (lastRaiser >= 0 && currentIdx === lastRaiser) break;

            // Exit: everyone who can act has acted, and no one raised
            if (lastRaiser === -1 && actedSet.size >= countCanAct()) break;

            // Exit: last raiser went allIn so can't be reached, but everyone
            // else who can act has acted since the raise
            if (lastRaiser >= 0 && state.players[lastRaiser].allIn &&
                actedSet.size >= countCanAct()) break;

            state.activePlayerIndex = currentIdx;
            if (onUpdate) onUpdate({ type: 'turn', playerIndex: currentIdx });

            let action;
            if (player.isHuman) {
                action = await waitForHumanAction(player);
            } else {
                await delay(800 + Math.random() * 1200);
                action = AIDecision.decide(player, {
                    communityCards: state.communityCards,
                    pot: state.pot,
                    currentBet: state.currentBet,
                    minRaise: state.minRaise,
                    bigBlind: state.bigBlind,
                    activePlayers: getPlayersInHand().length
                });
            }

            const prevCurrentBet = state.currentBet;
            applyAction(currentIdx, action);
            if (onUpdate) onUpdate({ type: 'action', playerIndex: currentIdx, action });

            // Only reopen action if the bet actually increased. A short all-in
            // that doesn't meet/exceed the current bet should NOT reopen action.
            const betIncreased = action.action === 'raise' ||
                (action.action === 'allIn' && player.currentBet >= prevCurrentBet + state.minRaise);
            if (betIncreased) {
                lastRaiser = currentIdx;
                actedSet = new Set([currentIdx]);
            } else {
                actedSet.add(currentIdx);
            }

            // Check if only one player remains
            if (getPlayersInHand().length <= 1) break;

            // If no non-allIn players can act, no further betting is possible
            if (countCanAct() === 0) break;

            currentIdx = (currentIdx + 1) % state.players.length;
        }
        state.activePlayerIndex = -1;
    }

    function applyAction(playerIdx, action) {
        const player = state.players[playerIdx];
        player.lastAction = action.action;

        switch (action.action) {
            case 'fold':
                player.folded = true;
                Sound.fold();
                break;
            case 'check':
                Sound.click();
                break;
            case 'call': {
                const callAmount = Math.min(state.currentBet - player.currentBet, player.stack);
                player.stack -= callAmount;
                player.currentBet += callAmount;
                player.totalInvested += callAmount;
                state.pot += callAmount;
                if (player.stack === 0) player.allIn = true;
                Sound.chips();
                break;
            }
            case 'raise': {
                const raiseTotal = Math.min(action.amount + (state.currentBet - player.currentBet), player.stack);
                const actualBet = state.currentBet - player.currentBet + raiseTotal;
                player.stack -= raiseTotal;
                player.currentBet += raiseTotal;
                player.totalInvested += raiseTotal;
                state.pot += raiseTotal;
                state.currentBet = player.currentBet;
                state.minRaise = Math.max(state.minRaise, raiseTotal);
                if (player.stack === 0) player.allIn = true;
                Sound.chips();
                break;
            }
            case 'allIn': {
                const allInAmount = player.stack;
                player.currentBet += allInAmount;
                player.totalInvested += allInAmount;
                state.pot += allInAmount;
                player.stack = 0;
                player.allIn = true;
                if (player.currentBet > state.currentBet) {
                    state.currentBet = player.currentBet;
                }
                Sound.allIn();
                break;
            }
        }
    }

    function waitForHumanAction(player) {
        return new Promise(resolve => {
            resolveHumanAction = resolve;
        });
    }

    function submitHumanAction(action) {
        if (resolveHumanAction) {
            resolveHumanAction(action);
            resolveHumanAction = null;
        }
    }

    function resetBets() {
        for (const p of state.players) {
            p.currentBet = 0;
        }
        state.currentBet = 0;
        state.minRaise = state.bigBlind;
    }

    function calculateSidePots() {
        const players = state.players.filter(p => !p.folded && !p.busted);
        const allInAmounts = [...new Set(players.filter(p => p.allIn).map(p => p.totalInvested))].sort((a, b) => a - b);

        if (allInAmounts.length === 0) {
            state.sidePots = [{ amount: state.pot, eligible: players.map(p => p.seatIndex) }];
            return;
        }

        const pots = [];
        let prevLevel = 0;
        const allPlayers = state.players.filter(p => !p.busted);

        for (const level of allInAmounts) {
            if (level <= prevLevel) continue;
            const pot = { amount: 0, eligible: [] };
            for (const p of allPlayers) {
                const contrib = Math.min(p.totalInvested, level) - prevLevel;
                if (contrib > 0) {
                    pot.amount += contrib;
                    if (!p.folded) pot.eligible.push(p.seatIndex);
                }
            }
            if (pot.amount > 0) pots.push(pot);
            prevLevel = level;
        }

        // Remaining bets above highest all-in
        const remaining = { amount: 0, eligible: [] };
        for (const p of allPlayers) {
            if (p.totalInvested > prevLevel) {
                remaining.amount += (p.totalInvested - prevLevel);
                if (!p.folded) remaining.eligible.push(p.seatIndex);
            }
        }
        if (remaining.amount > 0) pots.push(remaining);

        state.sidePots = pots.length > 0 ? pots : [{ amount: state.pot, eligible: players.map(p => p.seatIndex) }];
    }

    function evaluateShowdown() {
        calculateSidePots();
        const results = [];
        const allCards = {};

        for (const p of state.players) {
            if (!p.folded && !p.busted) {
                allCards[p.seatIndex] = Poker.bestHand([...p.holeCards, ...state.communityCards]);
            }
        }

        for (const pot of state.sidePots) {
            let bestHandResult = null;
            let winners = [];

            for (const seatIdx of pot.eligible) {
                const hand = allCards[seatIdx];
                if (!hand) continue;
                if (!bestHandResult) {
                    bestHandResult = hand;
                    winners = [seatIdx];
                } else {
                    const cmp = Poker.compare(hand, bestHandResult);
                    if (cmp > 0) {
                        bestHandResult = hand;
                        winners = [seatIdx];
                    } else if (cmp === 0) {
                        winners.push(seatIdx);
                    }
                }
            }

            const share = Math.floor(pot.amount / winners.length);
            const remainder = pot.amount - share * winners.length;

            for (let i = 0; i < winners.length; i++) {
                const player = state.players[winners[i]];
                player.stack += share + (i === 0 ? remainder : 0);
                results.push({
                    playerIndex: winners[i],
                    playerName: player.name,
                    amount: share + (i === 0 ? remainder : 0),
                    hand: allCards[winners[i]]
                });
            }
        }

        return results;
    }

    async function playHand(riggedDeal) {
        resetForNewHand();
        advanceDealer();
        assignPositions();

        state.phase = 'DEALING';
        if (onUpdate) onUpdate({ type: 'phase', phase: 'DEALING' });

        postBlinds();
        dealHoleCards(riggedDeal);

        if (onUpdate) onUpdate({ type: 'dealt' });
        await delay(600);

        // Preflop betting (starts after BB)
        const preflopStart = (state.dealerIndex + 3) % state.players.length;
        await bettingRound(preflopStart);

        if (getPlayersInHand().length <= 1) {
            return finishHand();
        }

        // Flop
        resetBets();
        dealCommunity(3);
        state.phase = 'FLOP_DEAL';
        if (onUpdate) onUpdate({ type: 'phase', phase: 'FLOP' });
        await delay(400);

        const postflopStart = nextActiveIndex(state.dealerIndex);
        if (postflopStart >= 0) await bettingRound(postflopStart);

        if (getPlayersInHand().length <= 1) {
            return finishHand();
        }

        // Turn
        resetBets();
        dealCommunity(1);
        state.phase = 'TURN_DEAL';
        if (onUpdate) onUpdate({ type: 'phase', phase: 'TURN' });
        await delay(400);

        const turnStart = nextActiveIndex(state.dealerIndex);
        if (turnStart >= 0) await bettingRound(turnStart);

        if (getPlayersInHand().length <= 1) {
            return finishHand();
        }

        // River
        resetBets();
        dealCommunity(1);
        state.phase = 'RIVER_DEAL';
        if (onUpdate) onUpdate({ type: 'phase', phase: 'RIVER' });
        await delay(400);

        const riverStart = nextActiveIndex(state.dealerIndex);
        if (riverStart >= 0) await bettingRound(riverStart);

        // Showdown
        state.phase = 'SHOWDOWN';
        if (onUpdate) onUpdate({ type: 'phase', phase: 'SHOWDOWN' });

        const results = evaluateShowdown();
        if (onUpdate) onUpdate({ type: 'showdown', results });

        await delay(2000);
        return finishHand(results);
    }

    function finishHand(showdownResults) {
        const inHand = getPlayersInHand();

        if (!showdownResults || showdownResults.length === 0) {
            // Everyone folded to one player
            if (inHand.length === 1) {
                const winner = inHand[0];
                winner.stack += state.pot;
                const result = [{
                    playerIndex: winner.seatIndex,
                    playerName: winner.name,
                    amount: state.pot,
                    hand: null
                }];
                state.phase = 'HAND_COMPLETE';
                if (onUpdate) onUpdate({ type: 'handComplete', results: result });
                return result;
            }
        }

        state.phase = 'HAND_COMPLETE';
        if (onUpdate) onUpdate({ type: 'handComplete', results: showdownResults });
        return showdownResults;
    }

    function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    return {
        init, setUpdateCallback, getState, playHand, submitHumanAction,
        getActivePlayers, getPlayersInHand, delay
    };
})();

// ========== HOLDEM UI ==========
const HoldemUI = (() => {
    let root = null;
    let actionResolve = null;

    const SEAT_POSITIONS = [
        { top: '50%', left: '0%' },       // Seat 0: left middle
        { top: '0%', left: '28%' },       // Seat 1: top left
        { top: '0%', left: '72%' },       // Seat 2: top right
        { top: '50%', left: '100%' },     // Seat 3: right middle
        { top: '100%', left: '72%' },     // Seat 4: bottom right
        { top: '100%', left: '28%' }      // Seat 5: bottom left (HUMAN)
    ];

    function buildTableHTML() {
        let seats = '';
        for (let i = 0; i < 6; i++) {
            const pos = SEAT_POSITIONS[i];
            const style = Object.entries(pos).map(([k,v]) => `${k}:${v}`).join(';');
            seats += `
            <div class="seat" id="seat-${i}" style="${style}">
                <div class="seat-info">
                    <span class="seat-name" id="seat-name-${i}"></span>
                    <span class="seat-personality" id="seat-type-${i}"></span>
                    <span class="seat-stack" id="seat-stack-${i}"></span>
                </div>
                <div class="seat-cards" id="seat-cards-${i}"></div>
                <div class="seat-bet" id="seat-bet-${i}"></div>
                <div class="seat-action" id="seat-action-${i}"></div>
                <div class="dealer-btn" id="dealer-${i}" style="display:none">D</div>
            </div>`;
        }

        return `
        <div class="poker-table-container">
            <div class="poker-mode-tabs" id="poker-mode-tabs">
                <button class="active" data-mode="play">Play</button>
                <button data-mode="rankings">Hand Rankings</button>
                <button data-mode="preflop">Pre-flop</button>
                <button data-mode="potodds">Pot Odds</button>
                <button data-mode="postflop">Post-flop</button>
            </div>
            <div id="poker-play-mode">
            <div id="poker-info-bar-wrap">
            <div class="poker-info-bar">
                <div class="hand-number" id="hand-number">Hand #0</div>
                <div class="shock-meter" id="shock-meter" title="Shock meter">
                    <div class="shock-fill" id="shock-fill"></div>
                </div>
                <div class="stats-display">
                    <span id="stats-profit">Profit: $0</span>
                    <span id="stats-record">0W / 0L</span>
                </div>
                <button class="sound-btn" id="sound-toggle" title="Toggle sound">🔊</button>
            </div>
            </div>
            <div class="poker-table" id="poker-table">
                <div class="table-felt">
                    ${seats}
                    <div class="community-area">
                        <div class="pot-display" id="pot-display">Pot: $0</div>
                        <div class="community-cards" id="community-cards"></div>
                    </div>
                </div>
                <div class="shock-overlay" id="shock-overlay"></div>
            </div>
            <div class="action-bar" id="action-bar" style="display:none">
                <button class="action-btn btn-fold" id="btn-fold">Fold</button>
                <button class="action-btn btn-check" id="btn-check">Check</button>
                <button class="action-btn btn-call" id="btn-call">Call $0</button>
                <button class="action-btn btn-raise" id="btn-raise">Raise</button>
                <div class="raise-controls" id="raise-controls" style="display:none">
                    <div class="raise-presets">
                        <button class="raise-preset-btn" id="raise-half-pot">1/2 Pot</button>
                        <button class="raise-preset-btn" id="raise-three-quarter">3/4 Pot</button>
                        <button class="raise-preset-btn" id="raise-pot">Pot</button>
                    </div>
                    <div class="raise-slider-wrap">
                        <input type="range" id="raise-slider" min="0" max="1000" value="20">
                        <span class="raise-amount" id="raise-amount">$20</span>
                    </div>
                    <button class="action-btn btn-confirm-raise" id="btn-confirm-raise">Raise $20</button>
                </div>
                <button class="action-btn btn-allin" id="btn-allin">All-In</button>
            </div>
            <div class="result-overlay" id="result-overlay" style="display:none">
                <div class="result-text" id="result-text"></div>
                <button class="action-btn btn-next" id="btn-next">Next Hand</button>
            </div>
            <div class="start-screen" id="start-screen">
                <h1>Texas Hold'em</h1>
                <p>Play against 5 AI opponents with adaptive difficulty</p>
                <button class="action-btn btn-start" id="btn-start">Start Game</button>
                <button class="action-btn btn-reset-stats" id="btn-reset-stats">Reset Stats</button>
            </div>
            </div>
            <div class="trainer-panel" id="trainer-rankings"></div>
            <div class="trainer-panel" id="trainer-preflop"></div>
            <div class="trainer-panel" id="trainer-potodds"></div>
            <div class="trainer-panel" id="trainer-postflop"></div>
        </div>`;
    }

    function init(rootEl) {
        root = rootEl;
        root.innerHTML = buildTableHTML();

        // Sound toggle
        document.getElementById('sound-toggle').addEventListener('click', () => {
            const on = Sound.toggle();
            document.getElementById('sound-toggle').textContent = on ? '🔊' : '🔇';
        });

        // Raise slider
        const slider = document.getElementById('raise-slider');
        function updateRaiseDisplay(val) {
            slider.value = val;
            document.getElementById('raise-amount').textContent = `$${val}`;
            document.getElementById('btn-confirm-raise').textContent = `Raise $${val}`;
        }
        slider.addEventListener('input', () => updateRaiseDisplay(parseInt(slider.value)));

        // Preset bet buttons
        document.getElementById('raise-half-pot').addEventListener('click', () => {
            const pot = HoldemEngine.getState().pot;
            const val = Math.max(parseInt(slider.min), Math.min(Math.floor(pot * 0.5), parseInt(slider.max)));
            updateRaiseDisplay(val);
        });
        document.getElementById('raise-three-quarter').addEventListener('click', () => {
            const pot = HoldemEngine.getState().pot;
            const val = Math.max(parseInt(slider.min), Math.min(Math.floor(pot * 0.75), parseInt(slider.max)));
            updateRaiseDisplay(val);
        });
        document.getElementById('raise-pot').addEventListener('click', () => {
            const pot = HoldemEngine.getState().pot;
            const val = Math.max(parseInt(slider.min), Math.min(pot, parseInt(slider.max)));
            updateRaiseDisplay(val);
        });

        // Action buttons
        document.getElementById('btn-fold').addEventListener('click', () => {
            if (actionResolve) { actionResolve({ action: 'fold', amount: 0 }); actionResolve = null; hideActionBar(); }
        });
        document.getElementById('btn-check').addEventListener('click', () => {
            if (actionResolve) { actionResolve({ action: 'check', amount: 0 }); actionResolve = null; hideActionBar(); }
        });
        document.getElementById('btn-call').addEventListener('click', () => {
            const amt = parseInt(document.getElementById('btn-call').dataset.amount || '0');
            if (actionResolve) { actionResolve({ action: 'call', amount: amt }); actionResolve = null; hideActionBar(); }
        });
        document.getElementById('btn-raise').addEventListener('click', () => {
            const controls = document.getElementById('raise-controls');
            controls.style.display = controls.style.display === 'none' ? 'flex' : 'none';
        });
        document.getElementById('btn-confirm-raise').addEventListener('click', () => {
            const amt = parseInt(document.getElementById('raise-slider').value);
            if (actionResolve) { actionResolve({ action: 'raise', amount: amt }); actionResolve = null; hideActionBar(); }
        });
        document.getElementById('btn-allin').addEventListener('click', () => {
            if (actionResolve) { actionResolve({ action: 'allIn', amount: 0 }); actionResolve = null; hideActionBar(); }
        });
    }

    function renderSeat(index, player) {
        const nameEl = document.getElementById(`seat-name-${index}`);
        const typeEl = document.getElementById(`seat-type-${index}`);
        const stackEl = document.getElementById(`seat-stack-${index}`);
        const cardsEl = document.getElementById(`seat-cards-${index}`);
        const seatEl = document.getElementById(`seat-${index}`);

        if (!nameEl) return;

        if (player.busted) {
            seatEl.classList.add('busted');
            nameEl.textContent = player.name;
            typeEl.textContent = '';
            stackEl.textContent = 'Busted';
            cardsEl.innerHTML = '';
            return;
        }

        seatEl.classList.remove('busted');
        seatEl.classList.toggle('folded', !!player.folded);
        seatEl.classList.toggle('active-turn', index === HoldemEngine.getState().activePlayerIndex);

        nameEl.textContent = player.name;
        typeEl.textContent = player.isHuman ? 'You' : player.personality.name;
        stackEl.textContent = `$${player.stack}`;

        // Cards
        if (player.holeCards.length > 0) {
            if (player.isHuman || player.showCards) {
                cardsEl.innerHTML = player.holeCards.map(c => renderCard(c)).join('');
            } else {
                cardsEl.innerHTML = player.holeCards.map(() => renderCard(null, true)).join('');
            }
        } else {
            cardsEl.innerHTML = '';
        }
    }

    function renderAllSeats(players) {
        players.forEach((p, i) => renderSeat(i, p));
    }

    function renderCommunity(cards) {
        const el = document.getElementById('community-cards');
        el.innerHTML = cards.map(c => renderCard(c)).join('');
    }

    function renderPot(pot) {
        document.getElementById('pot-display').textContent = `Pot: $${pot}`;
    }

    function renderBets(players) {
        players.forEach((p, i) => {
            const el = document.getElementById(`seat-bet-${i}`);
            if (p.currentBet > 0 && !p.busted) {
                el.textContent = `$${p.currentBet}`;
                el.style.display = 'block';
            } else {
                el.style.display = 'none';
            }
        });
    }

    function showActionBar(options) {
        const bar = document.getElementById('action-bar');
        bar.style.display = 'flex';
        document.getElementById('raise-controls').style.display = 'none';

        const checkBtn = document.getElementById('btn-check');
        const callBtn = document.getElementById('btn-call');

        if (options.canCheck) {
            checkBtn.style.display = 'inline-block';
            callBtn.style.display = 'none';
        } else {
            checkBtn.style.display = 'none';
            callBtn.style.display = 'inline-block';
            callBtn.textContent = `Call $${options.callAmount}`;
            callBtn.dataset.amount = options.callAmount;
        }

        const slider = document.getElementById('raise-slider');
        slider.min = options.minRaise;
        slider.max = options.maxRaise;
        slider.value = options.minRaise;
        document.getElementById('raise-amount').textContent = `$${options.minRaise}`;
        document.getElementById('btn-confirm-raise').textContent = `Raise to $${options.minRaise}`;

        document.getElementById('btn-allin').textContent = `All-In ($${options.stack})`;
    }

    function hideActionBar() {
        document.getElementById('action-bar').style.display = 'none';
    }

    function waitForAction(options) {
        showActionBar(options);
        return new Promise(resolve => { actionResolve = resolve; });
    }

    // Bug 6 fix: track timeouts to prevent stale action badges
    const actionTimeouts = {};
    function showActionText(seatIndex, text) {
        const el = document.getElementById(`seat-action-${seatIndex}`);
        // Clear any previous timeout for this seat
        if (actionTimeouts[seatIndex]) {
            clearTimeout(actionTimeouts[seatIndex]);
        }
        el.textContent = text;
        el.classList.add('show');
        actionTimeouts[seatIndex] = setTimeout(() => {
            el.classList.remove('show');
            el.textContent = '';
            delete actionTimeouts[seatIndex];
        }, 2000);
    }

    function clearAllActionText() {
        for (let i = 0; i < 6; i++) {
            const el = document.getElementById(`seat-action-${i}`);
            if (el) {
                el.classList.remove('show');
                el.textContent = '';
            }
            if (actionTimeouts[i]) {
                clearTimeout(actionTimeouts[i]);
                delete actionTimeouts[i];
            }
        }
    }

    function revealCards(seatIndex) {
        const player = HoldemEngine.getState().players[seatIndex];
        if (player && player.holeCards.length > 0) {
            player.showCards = true;
            renderSeat(seatIndex, player);
        }
    }

    function updateDealerButton(dealerIndex) {
        for (let i = 0; i < 6; i++) {
            document.getElementById(`dealer-${i}`).style.display = i === dealerIndex ? 'flex' : 'none';
        }
    }

    function showResult(text) {
        const overlay = document.getElementById('result-overlay');
        document.getElementById('result-text').textContent = text;
        overlay.style.display = 'flex';
    }

    function hideResult() {
        document.getElementById('result-overlay').style.display = 'none';
    }

    function showStartScreen() {
        document.getElementById('start-screen').style.display = 'flex';
        document.getElementById('poker-table').style.display = 'none';
        document.getElementById('poker-info-bar-wrap').style.display = 'none';
    }

    function hideStartScreen() {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('poker-table').style.display = '';
        document.getElementById('poker-info-bar-wrap').style.display = '';
    }

    function updateShockMeter(value) {
        document.getElementById('shock-fill').style.width = `${value * 100}%`;
    }

    function showShockEffect(type) {
        const overlay = document.getElementById('shock-overlay');
        overlay.classList.add(type === 'bad_beat' ? 'shock-bad-beat' : 'shock-style-shift');
        setTimeout(() => overlay.classList.remove('shock-bad-beat', 'shock-style-shift'), 2000);
    }

    function updateStats(stats) {
        document.getElementById('stats-profit').textContent = `Profit: $${stats.totalProfit}`;
        document.getElementById('stats-record').textContent = `${stats.handsWon}W / ${stats.handsPlayed - stats.handsWon}L`;
        document.getElementById('hand-number').textContent = `Hand #${HoldemEngine.getState().handNumber}`;
    }

    return {
        buildTableHTML, init, renderSeat, renderAllSeats, renderCommunity,
        renderPot, renderBets, showActionBar, hideActionBar, waitForAction,
        showActionText, clearAllActionText, revealCards, updateDealerButton, showResult, hideResult,
        showStartScreen, hideStartScreen, updateShockMeter, showShockEffect, updateStats
    };
})();

// ========== TRAINER UI HELPERS ==========
function trainerRenderCard(card, faceDown) {
    if (faceDown) return '<div class="card-back"></div>';
    return `<div class="card ${card.color} deal-anim">
        <div class="corner"><span class="rank">${card.rank}</span><span class="suit">${card.sym}</span></div>
        <div class="center-pip">${card.sym}</div>
        <div class="corner corner-br"><span class="rank">${card.rank}</span><span class="suit">${card.sym}</span></div>
    </div>`;
}

function trainerRenderHand(cards, elId) {
    const el = document.getElementById(elId);
    if (el) el.innerHTML = cards.map(c => trainerRenderCard(c)).join('');
}

function trainerShowFeedback(elId, correct, msg) {
    const el = document.getElementById(elId);
    el.className = `trainer-feedback show ${correct ? 'correct' : 'incorrect'}`;
    el.innerHTML = `<span class="icon">${correct ? '\u2713' : '\u2717'}</span> ${msg}`;
}

function trainerHideFeedback(elId) {
    const el = document.getElementById(elId);
    if (el) { el.className = 'trainer-feedback'; el.innerHTML = ''; }
}

function trainerUpdateStats(prefix, stats) {
    const pct = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
    const acc = document.getElementById(`${prefix}-accuracy`);
    const str = document.getElementById(`${prefix}-streak`);
    if (acc) acc.textContent = `${stats.correct}/${stats.total} (${pct}%)`;
    if (str) str.textContent = stats.streak;
}

// ========== TRAINER: MODE SWITCHER ==========
const TrainerUI = (() => {
    function init() {
        document.querySelectorAll('#poker-mode-tabs button').forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.mode));
        });
    }

    function switchMode(mode) {
        // Update tab active state
        document.querySelectorAll('#poker-mode-tabs button').forEach(b => b.classList.remove('active'));
        document.querySelector(`#poker-mode-tabs [data-mode="${mode}"]`).classList.add('active');

        // Show/hide play mode
        const playEl = document.getElementById('poker-play-mode');
        if (playEl) playEl.style.display = mode === 'play' ? '' : 'none';

        // Show/hide trainer panels
        document.querySelectorAll('.trainer-panel').forEach(p => p.classList.remove('active'));
        if (mode !== 'play') {
            const panel = document.getElementById(`trainer-${mode}`);
            if (panel) panel.classList.add('active');
        }
    }

    return { init, switchMode };
})();

// ========== TRAINER: HAND RANKINGS ==========
const RankingsTrainer = (() => {
    let currentHand, waiting = false;

    function init() {
        const el = document.getElementById('trainer-rankings');
        el.innerHTML = `
            <div class="trainer-felt">
                <div style="text-align:center;">
                    <div class="hand-label" id="tr-rankings-prompt">What hand is this?</div>
                    <div class="hand-area" id="tr-rankings-hand" style="justify-content:center;"></div>
                </div>
            </div>
            <div class="trainer-action-bar" id="tr-rankings-actions"></div>
            <div class="trainer-feedback" id="tr-rankings-feedback"></div>
            <div class="trainer-stats-bar">
                <span>Accuracy: <strong id="tr-rankings-accuracy">0/0 (0%)</strong></span>
                <span>Streak: <strong id="tr-rankings-streak">0</strong></span>
            </div>`;
        renderButtons();
        deal();
        const s = TrainerStats.load().rankings;
        trainerUpdateStats('tr-rankings', s);
    }

    function renderButtons() {
        const container = document.getElementById('tr-rankings-actions');
        container.innerHTML = Poker.HAND_NAMES.map(name =>
            `<button class="action-btn btn-trainer-secondary" data-ranking="${name}">${name}</button>`
        ).join('');
        container.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => answer(btn.dataset.ranking));
        });
    }

    function deal() {
        trainerHideFeedback('tr-rankings-feedback');
        const deck = CardEngine.shuffle(CardEngine.createDeck());
        const targetRank = Math.floor(Math.random() * 10);
        const hand = generateHand(deck, targetRank);
        currentHand = hand;
        trainerRenderHand(hand.cards, 'tr-rankings-hand');
        waiting = true;
        Sound.deal();
    }

    function generateHand(deck, target) {
        for (let attempt = 0; attempt < 200; attempt++) {
            const shuffled = CardEngine.shuffle(deck);
            const five = shuffled.slice(0, 5);
            const ev = Poker.evaluate(five);
            if (ev.rank === target) return { cards: five, eval: ev };
        }
        const five = deck.slice(0, 5);
        return { cards: five, eval: Poker.evaluate(five) };
    }

    function answer(ranking) {
        if (!waiting) return;
        waiting = false;
        const correct = ranking === currentHand.eval.name;
        const stats = TrainerStats.record('rankings', correct);
        if (correct) {
            trainerShowFeedback('tr-rankings-feedback', true, `Correct! It's a ${currentHand.eval.name}.`);
            Sound.correct();
        } else {
            trainerShowFeedback('tr-rankings-feedback', false, `Wrong. It's a ${currentHand.eval.name}, not ${ranking}.`);
            Sound.incorrect();
        }
        trainerUpdateStats('tr-rankings', stats);
        setTimeout(deal, 2000);
    }

    return { init };
})();

// ========== TRAINER: PRE-FLOP ==========
const PreflopTrainer = (() => {
    let card1, card2, position, waiting = false;
    const POSITIONS = ['UTG', 'MP', 'CO', 'BTN', 'SB', 'BB'];

    function init() {
        const el = document.getElementById('trainer-preflop');
        el.innerHTML = `
            <div class="trainer-felt">
                <div style="text-align:center;">
                    <div class="trainer-info">
                        <div><div class="label">Position</div><div class="value" id="tr-preflop-position">--</div></div>
                        <div><div class="label">Situation</div><div class="value">Open (first in)</div></div>
                    </div>
                    <div class="hand-label">Your Hole Cards</div>
                    <div class="hand-area" id="tr-preflop-hand" style="justify-content:center;"></div>
                </div>
            </div>
            <div class="trainer-action-bar">
                <button class="action-btn" data-pf="RAISE" style="background:#e67e22; color:#fff;">Raise <kbd>R</kbd></button>
                <button class="action-btn btn-call" data-pf="CALL">Call <kbd>C</kbd></button>
                <button class="action-btn btn-fold" data-pf="FOLD">Fold <kbd>F</kbd></button>
            </div>
            <div class="trainer-feedback" id="tr-preflop-feedback"></div>
            <div class="trainer-stats-bar">
                <span>Accuracy: <strong id="tr-preflop-accuracy">0/0 (0%)</strong></span>
                <span>Streak: <strong id="tr-preflop-streak">0</strong></span>
            </div>
            <button class="chart-toggle" id="tr-range-toggle">Show Range Chart</button>
            <div class="chart-container hidden" id="tr-range-chart"></div>`;

        // Wire action buttons
        el.querySelectorAll('[data-pf]').forEach(btn => {
            btn.addEventListener('click', () => answer(btn.dataset.pf));
        });

        // Range chart toggle
        const chartBtn = document.getElementById('tr-range-toggle');
        const chartContainer = document.getElementById('tr-range-chart');
        chartBtn.addEventListener('click', () => {
            chartContainer.classList.toggle('hidden');
            chartBtn.textContent = chartContainer.classList.contains('hidden') ? 'Show Range Chart' : 'Hide Range Chart';
            if (!chartContainer.classList.contains('hidden') && !chartContainer.innerHTML) buildRangeChart();
        });

        deal();
        const s = TrainerStats.load().preflop;
        trainerUpdateStats('tr-preflop', s);
    }

    function deal() {
        trainerHideFeedback('tr-preflop-feedback');
        const deck = CardEngine.shuffle(CardEngine.createDeck());
        card1 = deck[0]; card2 = deck[1];
        position = POSITIONS[Math.floor(Math.random() * POSITIONS.length)];
        trainerRenderHand([card1, card2], 'tr-preflop-hand');
        document.getElementById('tr-preflop-position').textContent = position;
        waiting = true;
        Sound.deal();
    }

    function answer(action) {
        if (!waiting) return;
        waiting = false;
        const rec = Preflop.recommend(card1, card2, position);
        let correct = false;
        if (rec.action === 'RAISE' && action === 'RAISE') correct = true;
        else if (rec.action === 'FOLD' && action === 'FOLD') correct = true;
        else if (rec.action === 'RAISE' && action === 'CALL') correct = true;

        const stats = TrainerStats.record('preflop', correct);
        const tierName = rec.tier === 'unplayable' ? 'not in range' : rec.tier;
        if (correct) {
            trainerShowFeedback('tr-preflop-feedback', true, `Correct! ${rec.notation} from ${position}: ${rec.action} (${tierName})`);
            Sound.correct();
        } else {
            trainerShowFeedback('tr-preflop-feedback', false, `Incorrect. ${rec.notation} from ${position}: ${rec.action} (${tierName}). You chose ${action}.`);
            Sound.incorrect();
        }
        trainerUpdateStats('tr-preflop', stats);
        setTimeout(deal, 2200);
    }

    function buildRangeChart() {
        const g = Preflop.grid();
        const R = ['A','K','Q','J','T','9','8','7','6','5','4','3','2'];
        let html = '<h3>Pre-flop Hand Ranges (BTN open)</h3>';
        html += `<div class="chart-legend">
            <span><span class="legend-box" style="background:rgba(239,68,68,0.4)"></span> Premium</span>
            <span><span class="legend-box" style="background:rgba(251,191,36,0.4)"></span> Strong</span>
            <span><span class="legend-box" style="background:rgba(34,197,94,0.35)"></span> Playable</span>
            <span><span class="legend-box" style="background:rgba(96,165,250,0.3)"></span> Marginal</span>
        </div>`;
        html += '<table class="range-grid"><tr><th></th>';
        R.forEach(r => html += `<th>${r}</th>`);
        html += '</tr>';
        g.forEach((row, i) => {
            html += `<tr><th>${R[i]}</th>`;
            row.forEach(hand => {
                const t = Preflop.tier(hand);
                html += `<td class="range-${t}" title="${hand} (${t})">${hand}</td>`;
            });
            html += '</tr>';
        });
        html += '</table>';
        document.getElementById('tr-range-chart').innerHTML = html;
    }

    return { init };
})();

// ========== TRAINER: POT ODDS ==========
const PotOddsTrainer = (() => {
    let current, waiting = false;

    function init() {
        const el = document.getElementById('trainer-potodds');
        el.innerHTML = `
            <div class="scenario-box">
                <div class="scenario-label">Scenario</div>
                <div id="tr-potodds-scenario" style="font-size:0.9rem; line-height:1.6;"></div>
            </div>
            <div class="pot-odds-display">
                <div style="color:var(--pk-text-muted); font-size:0.75rem;">POT ODDS</div>
                <div class="big-number" id="tr-potodds-ratio">--</div>
                <div style="color:var(--pk-text-muted); font-size:0.75rem; margin-top:0.4rem;">Do you have enough equity to call?</div>
            </div>
            <div class="trainer-action-bar">
                <button class="action-btn btn-call" data-potodds="CALL">Call (Profitable) <kbd>C</kbd></button>
                <button class="action-btn btn-fold" data-potodds="FOLD">Fold (Unprofitable) <kbd>F</kbd></button>
            </div>
            <div class="trainer-feedback" id="tr-potodds-feedback"></div>
            <div class="trainer-stats-bar">
                <span>Accuracy: <strong id="tr-potodds-accuracy">0/0 (0%)</strong></span>
                <span>Streak: <strong id="tr-potodds-streak">0</strong></span>
            </div>
            <button class="btn-trainer-secondary" id="tr-next-potodds">Next Scenario <kbd>N</kbd></button>
            <div class="scenario-box" style="margin-top:0.75rem;">
                <div class="scenario-label">Common Draw Equities (Reference)</div>
                <table class="equity-ref-table">
                    <tr><td>Flush draw (9 outs)</td><td>~19% turn, ~35% river</td></tr>
                    <tr><td>Open-ended straight (8 outs)</td><td>~17% turn, ~32% river</td></tr>
                    <tr><td>Gutshot straight (4 outs)</td><td>~9% turn, ~17% river</td></tr>
                    <tr><td>Two overcards (6 outs)</td><td>~13% turn, ~24% river</td></tr>
                    <tr><td>Flush + open-ended (15 outs)</td><td>~32% turn, ~54% river</td></tr>
                    <tr><td>One overcard (3 outs)</td><td>~6% turn, ~13% river</td></tr>
                </table>
            </div>`;

        el.querySelectorAll('[data-potodds]').forEach(btn => {
            btn.addEventListener('click', () => answer(btn.dataset.potodds));
        });
        document.getElementById('tr-next-potodds').addEventListener('click', newScenario);

        newScenario();
        const s = TrainerStats.load().potodds;
        trainerUpdateStats('tr-potodds', s);
    }

    function newScenario() {
        trainerHideFeedback('tr-potodds-feedback');
        current = PotOdds.scenario();
        const streetsText = current.streets === 2 ? '2 streets remaining (flop)' : '1 street remaining (turn)';
        document.getElementById('tr-potodds-scenario').innerHTML =
            `<strong>Pot:</strong> $${current.pot} | <strong>Villain bets:</strong> $${current.bet}<br>
            <strong>Your draw:</strong> ${current.draw} (${current.outs} outs)<br>
            <strong>Streets remaining:</strong> ${streetsText}<br>
            <strong>Your equity:</strong> ~${(current.equity * 100).toFixed(1)}%`;
        document.getElementById('tr-potodds-ratio').textContent = `${(current.potOdds * 100).toFixed(1)}%`;
        waiting = true;
    }

    function answer(action) {
        if (!waiting) return;
        waiting = false;
        const correct = action === current.correct;
        const stats = TrainerStats.record('potodds', correct);
        const explain = `Pot odds: ${(current.potOdds * 100).toFixed(1)}% | Your equity: ${(current.equity * 100).toFixed(1)}% | ${current.equity >= current.potOdds ? 'Equity > pot odds = CALL' : 'Equity < pot odds = FOLD'}`;
        if (correct) {
            trainerShowFeedback('tr-potodds-feedback', true, `Correct! ${explain}`);
            Sound.correct();
        } else {
            trainerShowFeedback('tr-potodds-feedback', false, `Wrong. ${explain}`);
            Sound.incorrect();
        }
        trainerUpdateStats('tr-potodds', stats);
    }

    return { init, newScenario };
})();

// ========== TRAINER: POST-FLOP ==========
const PostflopTrainer = (() => {
    let current, waiting = false;

    function init() {
        const el = document.getElementById('trainer-postflop');
        el.innerHTML = `
            <div class="trainer-felt">
                <div style="text-align:center;">
                    <div class="trainer-info">
                        <div><div class="label">Position</div><div class="value" id="tr-postflop-position">--</div></div>
                        <div><div class="label">Pot</div><div class="value" id="tr-postflop-pot">--</div></div>
                        <div><div class="label">Street</div><div class="value" id="tr-postflop-street">--</div></div>
                    </div>
                    <div class="hand-label">Community Cards</div>
                    <div class="trainer-community" id="tr-postflop-community"></div>
                    <div class="hand-label">Your Hole Cards</div>
                    <div class="hand-area" id="tr-postflop-hole" style="justify-content:center;"></div>
                </div>
            </div>
            <div class="scenario-box">
                <div class="scenario-label">Situation</div>
                <div id="tr-postflop-situation"></div>
            </div>
            <div class="trainer-action-bar">
                <button class="action-btn" data-post="BET" style="background:var(--pk-accent); color:#fff;">Bet/Raise <kbd>R</kbd></button>
                <button class="action-btn" data-post="CALL" style="background:#22c55e; color:#fff;">Call/Check <kbd>C</kbd></button>
                <button class="action-btn btn-fold" data-post="FOLD">Fold <kbd>F</kbd></button>
            </div>
            <div class="trainer-feedback" id="tr-postflop-feedback"></div>
            <div class="trainer-stats-bar">
                <span>Accuracy: <strong id="tr-postflop-accuracy">0/0 (0%)</strong></span>
                <span>Streak: <strong id="tr-postflop-streak">0</strong></span>
            </div>
            <button class="btn-trainer-secondary" id="tr-next-postflop">Next Scenario <kbd>N</kbd></button>`;

        el.querySelectorAll('[data-post]').forEach(btn => {
            btn.addEventListener('click', () => answer(btn.dataset.post));
        });
        document.getElementById('tr-next-postflop').addEventListener('click', newScenario);

        newScenario();
        const s = TrainerStats.load().postflop;
        trainerUpdateStats('tr-postflop', s);
    }

    function newScenario() {
        trainerHideFeedback('tr-postflop-feedback');
        current = PostflopData.get();
        trainerRenderHand(current.hole, 'tr-postflop-hole');
        trainerRenderHand(current.community, 'tr-postflop-community');
        document.getElementById('tr-postflop-position').textContent = current.pos;
        document.getElementById('tr-postflop-pot').textContent = `$${current.pot}`;
        document.getElementById('tr-postflop-street').textContent = current.street;
        document.getElementById('tr-postflop-situation').innerHTML =
            `${current.villain}${current.bet ? ` ($${current.bet} to call)` : ''}`;
        waiting = true;
        Sound.deal();
    }

    function answer(action) {
        if (!waiting) return;
        waiting = false;
        const correct = action === current.correct;
        const stats = TrainerStats.record('postflop', correct);
        if (correct) {
            trainerShowFeedback('tr-postflop-feedback', true, `Correct! ${current.explain}`);
            Sound.correct();
        } else {
            trainerShowFeedback('tr-postflop-feedback', false, `Wrong — correct answer: ${current.correct}. ${current.explain}`);
            Sound.incorrect();
        }
        trainerUpdateStats('tr-postflop', stats);
    }

    return { init, newScenario };
})();

// ========== TRAINER KEYBOARD SHORTCUTS ==========
const TrainerKeyboard = (() => {
    function init() {
        document.addEventListener('keydown', e => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const key = e.key.toLowerCase();

            // Only handle keys when a trainer panel is active
            const activePanel = document.querySelector('.trainer-panel.active');
            if (!activePanel) return;
            const panelId = activePanel.id;

            if (panelId === 'trainer-preflop') {
                if (key === 'r') activePanel.querySelector('[data-pf="RAISE"]')?.click();
                else if (key === 'c') activePanel.querySelector('[data-pf="CALL"]')?.click();
                else if (key === 'f') activePanel.querySelector('[data-pf="FOLD"]')?.click();
            } else if (panelId === 'trainer-potodds') {
                if (key === 'c') activePanel.querySelector('[data-potodds="CALL"]')?.click();
                else if (key === 'f') activePanel.querySelector('[data-potodds="FOLD"]')?.click();
                else if (key === 'n') PotOddsTrainer.newScenario();
            } else if (panelId === 'trainer-postflop') {
                if (key === 'r') activePanel.querySelector('[data-post="BET"]')?.click();
                else if (key === 'c') activePanel.querySelector('[data-post="CALL"]')?.click();
                else if (key === 'f') activePanel.querySelector('[data-post="FOLD"]')?.click();
                else if (key === 'n') PostflopTrainer.newScenario();
            }
        });
    }
    return { init };
})();

// ========== APP (Main Game Loop) ==========
const App = (() => {
    let running = false;

    function createPlayer(seatIndex, name, personalityKey, isHuman = false) {
        return {
            seatIndex, name, isHuman,
            personalityKey: isHuman ? null : personalityKey,
            personality: isHuman ? null : AIPersonality.getProfile(personalityKey),
            stack: 1000,
            holeCards: [],
            currentBet: 0,
            totalInvested: 0,
            folded: false,
            allIn: false,
            busted: false,
            showCards: false,
            lastAction: null,
            position: '',
            positionIndex: 0
        };
    }

    function createDefaultTable() {
        return [
            createPlayer(0, AIPersonality.getRandomName('beginner'), 'beginner'),
            createPlayer(1, AIPersonality.getRandomName('intermediate'), 'intermediate'),
            createPlayer(2, AIPersonality.getRandomName('shark'), 'shark'),
            createPlayer(3, AIPersonality.getRandomName('maniac'), 'maniac'),
            createPlayer(4, AIPersonality.getRandomName('rock'), 'rock'),
            createPlayer(5, 'You', null, true)
        ];
    }

    function onEngineUpdate(event) {
        const state = HoldemEngine.getState();

        switch (event.type) {
            case 'phase':
                // Bug 6 fix: clear stale action badges at start of each new deal
                if (event.phase === 'DEALING') {
                    HoldemUI.clearAllActionText();
                }
                HoldemUI.renderCommunity(state.communityCards);
                HoldemUI.renderPot(state.pot);
                HoldemUI.renderAllSeats(state.players);
                HoldemUI.renderBets(state.players);
                HoldemUI.updateDealerButton(state.dealerIndex);
                break;

            case 'dealt':
                HoldemUI.renderAllSeats(state.players);
                HoldemUI.renderBets(state.players);
                HoldemUI.renderPot(state.pot);
                HoldemUI.updateDealerButton(state.dealerIndex);
                // Bug 4 fix: update hand number display when hand starts
                document.getElementById('hand-number').textContent = `Hand #${state.handNumber}`;
                for (const p of state.players) {
                    if (p.holeCards.length > 0 && !p.busted) Sound.deal();
                }
                break;

            case 'turn': {
                const player = state.players[event.playerIndex];
                HoldemUI.renderAllSeats(state.players);
                if (player.isHuman) {
                    const toCall = state.currentBet - player.currentBet;
                    const canCheck = toCall === 0;
                    // Bug 3 fix: min raise must be call + at least one raise increment on top
                    const raiseIncrement = Math.max(state.minRaise, state.bigBlind);
                    const minRaiseTotal = toCall + raiseIncrement;
                    HoldemUI.waitForAction({
                        canCheck,
                        callAmount: toCall,
                        minRaise: Math.min(minRaiseTotal, player.stack),
                        maxRaise: player.stack,
                        stack: player.stack
                    }).then(action => {
                        HoldemEngine.submitHumanAction(action);
                    });
                }
                break;
            }

            case 'action': {
                const p = state.players[event.playerIndex];
                const a = event.action;
                let text = a.action.charAt(0).toUpperCase() + a.action.slice(1);
                if (a.action === 'call') text += ` $${a.amount}`;
                if (a.action === 'raise') text = `Raise $${a.amount}`;
                if (a.action === 'allIn') text = 'ALL-IN!';
                HoldemUI.showActionText(event.playerIndex, text);
                HoldemUI.renderBets(state.players);
                HoldemUI.renderPot(state.pot);
                HoldemUI.renderAllSeats(state.players);
                break;
            }

            case 'showdown':
                // Reveal all remaining players' cards
                for (const p of state.players) {
                    if (!p.folded && !p.busted) {
                        HoldemUI.revealCards(p.seatIndex);
                    }
                }
                HoldemUI.renderCommunity(state.communityCards);
                break;

            case 'handComplete': {
                const results = event.results || [];
                const humanResult = results.find(r => state.players[r.playerIndex].isHuman);
                const humanPlayer = state.players.find(p => p.isHuman);
                const invested = humanPlayer.totalInvested;

                let won = false;
                let profit = -invested;

                if (humanResult) {
                    won = true;
                    profit = humanResult.amount - invested;
                }

                const stats = PokerStats.recordHand(won, profit, state.pot);
                ShockSystem.recordResult(won ? 1 : -1);
                HoldemUI.updateStats(stats);
                HoldemUI.updateShockMeter(ShockSystem.getMeter());

                if (won) Sound.win();
                else Sound.incorrect();

                // Build result message
                let msg = '';
                if (results.length > 0) {
                    const winner = results[0];
                    if (winner.hand) {
                        msg = `${winner.playerName} wins $${winner.amount} with ${winner.hand.name}`;
                    } else {
                        msg = `${winner.playerName} wins $${winner.amount}`;
                    }
                }
                HoldemUI.showResult(msg);
                HoldemUI.renderAllSeats(state.players);
                break;
            }
        }
    }

    async function gameLoop() {
        running = true;
        while (running) {
            const state = HoldemEngine.getState();
            const aiPlayers = state.players.filter(p => !p.isHuman);
            const humanPlayer = state.players.find(p => p.isHuman);

            // Check for rebuy
            if (humanPlayer.busted || humanPlayer.stack <= 0) {
                humanPlayer.stack = 1000;
                humanPlayer.busted = false;
                HoldemUI.showResult('You busted! Rebuying for $1000...');
                await HoldemEngine.delay(2000);
                HoldemUI.hideResult();
            }

            // Rebuy busted AIs
            for (const p of aiPlayers) {
                if (p.busted || p.stack <= 0) {
                    p.stack = 1000;
                    p.busted = false;
                }
            }

            // Adaptive difficulty
            if (AdaptiveDifficulty.shouldAdjust()) {
                const adj = AdaptiveDifficulty.adjust(aiPlayers);
                if (adj) {
                    HoldemUI.renderAllSeats(state.players);
                }
            }

            // Shock system
            ShockSystem.tickShifts(aiPlayers);
            let riggedDeal = null;
            if (ShockSystem.shouldTriggerShock()) {
                const shockType = ShockSystem.getShockType();
                if (shockType === 'bad_beat') {
                    riggedDeal = ShockSystem.rigDeal();
                    HoldemUI.showShockEffect('bad_beat');
                } else {
                    ShockSystem.triggerStyleShift(aiPlayers);
                    HoldemUI.showShockEffect('style_shift');
                }
            }

            // Play hand
            await HoldemEngine.playHand(riggedDeal);

            // Wait for player to click "Next Hand"
            await new Promise(resolve => {
                document.getElementById('btn-next').onclick = () => {
                    HoldemUI.hideResult();
                    resolve();
                };
            });
        }
    }

    function init() {
        const rootEl = document.getElementById('poker-app');
        if (!rootEl) return;

        HoldemUI.init(rootEl);
        HoldemUI.showStartScreen();

        // Initialize trainer system
        TrainerUI.init();
        RankingsTrainer.init();
        PreflopTrainer.init();
        PotOddsTrainer.init();
        PostflopTrainer.init();
        TrainerKeyboard.init();

        // Bug 8 fix: reset stats button clears localStorage
        document.getElementById('btn-reset-stats').addEventListener('click', () => {
            PokerStats.reset();
            ShockSystem.reset();
            AdaptiveDifficulty.reset();
            const freshStats = PokerStats.load();
            HoldemUI.updateStats(freshStats);
        });

        document.getElementById('btn-start').addEventListener('click', () => {
            HoldemUI.hideStartScreen();
            const players = createDefaultTable();
            HoldemEngine.init({ players, smallBlind: 5, bigBlind: 10 });
            HoldemEngine.setUpdateCallback(onEngineUpdate);

            const stats = PokerStats.load();
            HoldemUI.updateStats(stats);

            gameLoop();
        });
    }

    document.addEventListener('DOMContentLoaded', init);
    document.addEventListener('astro:page-load', init);

    return { init };
})();
