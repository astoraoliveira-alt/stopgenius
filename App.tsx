
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Category, Player, ValidationResult, Difficulty, RoomConfig } from './types';
import { processMultiplayerRound, getCategorySuggestions, getDailyChallenge } from './services/geminiService';
import confetti from 'canvas-confetti';

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'nome', name: 'Nome' },
  { id: 'animal', name: 'Animal' },
  { id: 'objeto', name: 'Objeto' },
  { id: 'fruta', name: 'Fruta' },
  { id: 'cor', name: 'Cor' }
];

const AVATARS = [
  '👤', '🧑‍🚀', '🥷', '🧙‍♂️', '🧛', '🧟', '🦸', '👸', '🤴', '🧚', '🕵️', '👷',
  '🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐸', '🐵', '🦄', '🐙', 'Rex',
  '🤖', '👽', '👻', '🤡', '👹', '💀', '🎃', '👾', '🔥', '💎', '🚀', '🌈',
  '🎮', '🎸', '🎨', '⚽', '🍕', '🍔', '🍦', '🍩', '🛹', '📸', '🎧', '🔭'
];

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#94a3b8'];
const REACTION_EMOJIS = ['😂', '🔥', '🤔', '🤡', '👏', '🚀', '😱', '💯'];
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

const ADJECTIVES = ['Épica', 'Lendária', 'Mágica', 'Incrível', 'Veloz', 'Sábia', 'Caótica', 'Ninja', 'Suprema', 'Genial'];
const NOUNS = ['Arena', 'Mansão', 'Galáxia', 'Toca', 'Base', 'Fortaleza', 'Cidade', 'Academia', 'Nave', 'Ilha'];

const generateRandomRoomName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${noun} ${adj} ${Math.floor(Math.random() * 99)}`;
};

const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

const spawnSpark = (e: React.FormEvent<HTMLInputElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const spark = document.createElement('div');
  spark.className = 'typing-spark';
  const x = rect.left + Math.random() * rect.width;
  const y = rect.top + rect.height / 2;
  
  spark.style.left = `${x}px`;
  spark.style.top = `${y}px`;
  spark.style.background = `hsl(${Math.random() * 360}, 70%, 60%)`;
  
  document.body.appendChild(spark);
  setTimeout(() => spark.remove(), 400);
};

interface FloatingReaction {
  id: string;
  emoji: string;
  x: number;
  y: number;
}

const TimerGauge: React.FC<{ time: number, max: number }> = ({ time, max }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (time / max) * circumference;
  const isWarning = time <= 10;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center shrink-0 bg-slate-900/40 rounded-full border border-white/5 shadow-inner">
      <svg className="w-full h-full -rotate-90 transform origin-center p-1" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className="text-white/5"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          strokeLinecap="round"
          style={{ 
            strokeDashoffset: offset,
            transition: 'stroke-dashoffset 1s linear, color 0.3s ease'
          }}
          className={isWarning ? 'text-red-500' : 'text-indigo-500'}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-black font-mono leading-none ${isWarning ? 'text-red-500 animate-pulse' : 'text-white'}`}>
          {time}
        </span>
        <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-0.5">seg</span>
      </div>
    </div>
  );
};

const OpponentGhost: React.FC<{ player: Player; totalCategories: number }> = ({ player, totalCategories }) => {
  return (
    <div className="flex flex-col items-center gap-1 opacity-40 transition-all duration-1000 shrink-0">
      <div className="relative">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm border border-white/20 shadow-lg" style={{ backgroundColor: player.color }}>
          {player.avatar}
        </div>
        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-slate-900 border border-white/20 rounded-full flex items-center justify-center text-[5px]">
          {player.status === 'done' ? '✅' : '⌨️'}
        </div>
      </div>
      <div className="flex gap-0.5">
        {Array.from({ length: totalCategories }).map((_, i) => (
          <div 
            key={i} 
            className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${i < (player.progress || 0) ? 'bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,1)]' : 'bg-white/10'}`} 
          />
        ))}
      </div>
    </div>
  );
};

const PlayerCard: React.FC<{ player: Player; onRemove?: (id: string) => void; onToggleDifficulty?: (id: string) => void; isHostView?: boolean }> = ({ player, onRemove, onToggleDifficulty, isHostView }) => {
  const difficultyLabel = player.difficulty === Difficulty.EASY ? 'Lento' : player.difficulty === Difficulty.HARD ? 'Gênio' : 'Médio';
  const difficultyColor = player.difficulty === Difficulty.EASY ? 'text-emerald-400 border-emerald-500/30' : 
                         player.difficulty === Difficulty.HARD ? 'text-rose-400 border-rose-500/30' : 
                         'text-indigo-400 border-indigo-500/30';

  return (
    <div className="relative overflow-hidden p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between animate-pop h-16 shadow-lg shadow-black/20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border border-white/10" style={{ backgroundColor: player.color }}>{player.avatar}</div>
          {player.isBot && <div className="absolute -top-1 -right-1 bg-slate-900 border border-white/20 w-4 h-4 rounded-full flex items-center justify-center text-[7px] shadow-lg">🤖</div>}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold truncate text-slate-100">{player.name}</span>
            {player.isHost && <span className="text-[6px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1 py-0.5 rounded uppercase font-black tracking-tighter shrink-0">Host</span>}
          </div>
          <span className="text-[7px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"/> {player.isBot ? 'Bot Ativo' : 'Online'}
          </span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {player.isBot && isHostView && (
          <button onClick={() => onToggleDifficulty?.(player.id)} className={`text-[7px] px-2 py-1 rounded-md font-black uppercase border bg-black/40 ${difficultyColor} hover:scale-105 transition-transform`}>
            {difficultyLabel}
          </button>
        )}
        {onRemove && (player.isBot || player.id !== 'me') && isHostView && (
          <button onClick={() => onRemove(player.id)} className="text-slate-500 hover:text-rose-400 p-1.5 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        )}
      </div>
    </div>
  );
};

const EmptySlot: React.FC<{ onClick?: () => void, isHost: boolean }> = ({ onClick, isHost }) => (
  <div 
    onClick={isHost ? onClick : undefined}
    className={`relative h-16 rounded-2xl border-2 border-dashed border-white/5 flex items-center justify-center transition-all bg-white/[0.01] animate-pulse ${isHost ? 'cursor-pointer hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:animate-none' : ''}`}
  >
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-slate-700 text-xs">+</div>
      <span className="text-[9px] font-black uppercase text-slate-700 tracking-widest">
        {isHost ? 'Adicionar Bot' : 'Aguardando Jogador'}
      </span>
    </div>
  </div>
);

const App: React.FC = () => {
  // Estados principais
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  const [newCatInput, setNewCatInput] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [excludedLetters, setExcludedLetters] = useState<Set<string>>(new Set());
  const [availableRooms, setAvailableRooms] = useState<RoomConfig[]>([
    { id: 'RYJN3W', name: 'Toca Suprema 96', maxPlayers: 10, maxRounds: 5, currentRound: 0, isPrivate: false, hostId: 'ia-host', currentPlayers: 1 },
    { id: 'ALPHA1', name: 'Arena Ninja 77', maxPlayers: 6, maxRounds: 10, currentRound: 0, isPrivate: true, hostId: 'bot1', currentPlayers: 3 },
    { id: 'GALAXY', name: 'Galáxia Sábia 12', maxPlayers: 10, maxRounds: 3, currentRound: 0, isPrivate: false, hostId: 'bot2', currentPlayers: 2 }
  ]);
  
  // UI States
  const [isConfiguringNewRoom, setIsConfiguringNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(5);
  const [newRoomMaxRounds, setNewRoomMaxRounds] = useState(5);
  const [newRoomPassword, setNewRoomPassword] = useState('');
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  // Gameplay States
  const [currentLetter, setCurrentLetter] = useState('');
  const [timer, setTimer] = useState(60);
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [roundCommentary, setRoundCommentary] = useState<string | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<{ letter: string, categories: string[] } | null>(null);

  const isHost = players.find(p => p.id === 'me')?.isHost;
  const shouldShowScore = players.length > 0 && ![GameState.START, GameState.BROWSER].includes(gameState);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    getDailyChallenge(today).then(setDailyChallenge);
  }, []);

  // Efeito aprimorado para garantir que a tela sempre role para o topo e lute contra o auto-focus
  useEffect(() => {
    const statesToScroll = [GameState.PLAYING, GameState.JUDGING, GameState.RESULTS, GameState.LOBBY];
    if (statesToScroll.includes(gameState)) {
      const forceScroll = () => {
        if (mainRef.current) mainRef.current.scrollTop = 0;
        window.scrollTo(0, 0);
      };

      // Tenta rolar imediatamente
      forceScroll();
      
      // Tenta novamente após um pequeno delay para sobrescrever o auto-focus do navegador
      const timeout = setTimeout(forceScroll, 50);
      const raf = requestAnimationFrame(forceScroll);

      return () => {
        clearTimeout(timeout);
        cancelAnimationFrame(raf);
      };
    }
  }, [gameState]);

  // Ghosting dos Bots
  useEffect(() => {
    let interval: any;
    if (gameState === GameState.PLAYING) {
      interval = setInterval(() => {
        setPlayers(prev => prev.map(p => {
          if (!p.isBot || p.status === 'done') return p;
          const currentProgress = p.progress || 0;
          if (currentProgress < categories.length) {
            const chanceToType = p.difficulty === Difficulty.EASY ? 0.04 : p.difficulty === Difficulty.HARD ? 0.15 : 0.08;
            if (Math.random() < chanceToType) {
              const newProgress = currentProgress + 1;
              return { ...p, progress: newProgress, status: newProgress === categories.length ? 'done' : 'typing' };
            }
          }
          return p;
        }));
      }, 500);
    }
    return () => clearInterval(interval);
  }, [gameState, categories.length]);

  const addReaction = (emoji: string) => {
    const id = Math.random().toString(36).substring(7);
    const x = 10 + Math.random() * 80;
    setFloatingReactions(prev => [...prev, { id, emoji, x, y: 80 }]);
    setTimeout(() => setFloatingReactions(prev => prev.filter(r => r.id !== id)), 2000);
  };

  const handleCreateRoom = () => {
    const me: Player = { id: 'me', name: playerName || 'Jogador', avatar: selectedAvatar, color: selectedColor, isBot: false, isHost: true, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting' };
    const id = generateRoomId();
    const newRoom: RoomConfig = { 
      id, 
      name: newRoomName || generateRandomRoomName(), 
      maxPlayers: newRoomMaxPlayers, 
      maxRounds: newRoomMaxRounds,
      currentRound: 0,
      isPrivate: newRoomPassword.length > 0, 
      password: newRoomPassword,
      hostId: 'me', 
      currentPlayers: 1 
    };
    
    setAvailableRooms(prev => [newRoom, ...prev]);
    setRoomConfig(newRoom);
    setPlayers([me]);
    setGameState(GameState.LOBBY);
    setIsConfiguringNewRoom(false);
    triggerHaptic(20);
  };

  const copyInviteLink = () => {
    const url = window.location.href + (roomConfig ? `?room=${roomConfig.id}` : '');
    navigator.clipboard.writeText(url);
    setCopyStatus('copied');
    triggerHaptic(50);
    setTimeout(() => setCopyStatus('idle'), 2000);
  };

  const joinRoom = (room: RoomConfig) => {
    const me: Player = { id: 'me', name: playerName || 'Jogador', avatar: selectedAvatar, color: selectedColor, isBot: false, isHost: false, isReady: false, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting' };
    setRoomConfig(room);
    setPlayers([
      { id: 'ia-host', name: 'Gênio Host', avatar: '🧠', color: '#6366f1', isBot: true, isHost: true, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting', difficulty: Difficulty.HARD },
      me
    ]);
    setGameState(GameState.LOBBY);
    triggerHaptic(20);
  };

  const startDailyChallenge = () => {
    if (!dailyChallenge) return;
    const me: Player = { id: 'me', name: playerName || 'Jogador', avatar: selectedAvatar, color: selectedColor, isBot: false, isHost: true, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting' };
    const challengeCategories: Category[] = dailyChallenge.categories.map((name, i) => ({ id: `daily-${i}`, name }));
    setCategories(challengeCategories);
    setCurrentLetter(dailyChallenge.letter);
    const bot: Player = { id: 'bot-genius', name: 'Gênio do Stop', avatar: '🧠', color: '#8b5cf6', isBot: true, isHost: false, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting', difficulty: Difficulty.HARD };
    setPlayers([me, bot]);
    setRoomConfig({ id: 'DAILY', name: 'Desafio Diário', maxPlayers: 10, maxRounds: 1, currentRound: 0, isPrivate: true, hostId: 'me', currentPlayers: 2, isDailyChallenge: true });
    setGameState(GameState.LOBBY);
    triggerHaptic([50, 50]);
  };

  const addBot = () => {
    if (players.length >= (roomConfig?.maxPlayers || 10)) return;
    const botNames = ['Bot Gênio', 'Bot Ligeiro', 'Bot Humano', 'Bot Errado', 'Bot Zueira', 'Bot Ninja', 'Bot Mestre', 'Bot Alpha'];
    const botName = botNames[Math.floor(Math.random() * botNames.length)] + ' ' + (players.length);
    const newBot: Player = {
      id: `bot-${Math.random()}`,
      name: botName,
      avatar: AVATARS[Math.floor(Math.random() * AVATARS.length)],
      color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      isBot: true,
      isHost: false,
      isReady: true,
      answers: {},
      roundScore: 0,
      totalScore: 0,
      status: 'waiting',
      difficulty: Math.random() > 0.5 ? Difficulty.MEDIUM : Difficulty.EASY
    };
    setPlayers(prev => [...prev, newBot]);
    
    if (roomConfig) {
      setAvailableRooms(prev => prev.map(r => r.id === roomConfig.id ? { ...r, currentPlayers: players.length + 1 } : r));
    }
    triggerHaptic(10);
  };

  const removePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
    if (roomConfig) {
      setAvailableRooms(prev => prev.map(r => r.id === roomConfig.id ? { ...r, currentPlayers: Math.max(1, players.length - 1) } : r));
    }
    triggerHaptic(10);
  };

  const toggleLetterExclusion = (letter: string) => {
    if (!isHost) return;
    const next = new Set(excludedLetters);
    if (next.has(letter)) {
      next.delete(letter);
    } else {
      if (next.size < ALPHABET.length - 1) {
        next.add(letter);
      }
    }
    setExcludedLetters(next);
    triggerHaptic(5);
  };

  const toggleDifficulty = (id: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === id) {
        const nextDiff = p.difficulty === Difficulty.EASY ? Difficulty.MEDIUM : 
                         p.difficulty === Difficulty.MEDIUM ? Difficulty.HARD : Difficulty.EASY;
        return { ...p, difficulty: nextDiff };
      }
      return p;
    }));
  };

  const addCategoryManual = () => {
    if (categories.length >= 10 || !newCatInput.trim()) return;
    setCategories(prev => [...prev, { id: Math.random().toString(), name: newCatInput.trim() }]);
    setNewCatInput('');
    triggerHaptic(5);
  };

  const removeCategory = (id: string) => {
    if (categories.length <= 3) return;
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const fetchAiSuggestions = async () => {
    setIsFetchingSuggestions(true);
    try {
      const suggestions = await getCategorySuggestions(categories.map(c => c.name));
      const newItems = suggestions.map(s => ({ 
        id: Math.random().toString(), 
        name: s, 
        isAiSuggested: true 
      }));
      setCategories(prev => [...prev, ...newItems].slice(0, 10));
      triggerHaptic(40);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const startRound = () => {
    if (categories.length < 3) return;
    if (!roomConfig?.isDailyChallenge) {
      const allowed = ALPHABET.filter(l => !excludedLetters.has(l));
      setCurrentLetter(allowed[Math.floor(Math.random() * allowed.length)]);
    }
    
    setRoomConfig(prev => prev ? ({ ...prev, currentRound: prev.currentRound + 1 }) : null);
    setMyAnswers({});
    setTimer(60);
    setGameState(GameState.PLAYING);
    setPlayers(prev => prev.map(p => ({ ...p, status: 'typing', answers: {}, roundScore: 0, progress: 0 })));
    triggerHaptic([100, 50]);
  };

  const handleStop = async () => {
    setGameState(GameState.JUDGING);
    triggerHaptic([200, 100]);
    const answers: Record<string, string> = {};
    categories.forEach(c => answers[c.name] = myAnswers[c.id] || "");
    try {
      const data = await processMultiplayerRound(currentLetter, categories, players.find(p => p.id === 'me')!, answers, players.filter(p => p.isBot));
      if (data?.judgments) {
        setResults(data.judgments);
        setRoundCommentary(data.commentary);
        setPlayers(prev => prev.map(p => {
          const pJudgments = data.judgments.filter((j: any) => normalize(j.playerName).includes(normalize(p.name)));
          const score = pJudgments.reduce((acc: number, curr: any) => acc + curr.score, 0);
          return { ...p, roundScore: score, totalScore: p.totalScore + score, status: 'done' };
        }));
        setGameState(GameState.RESULTS);
        confetti({ particleCount: 150, origin: { y: 0.6 } });
      }
    } catch (e) { setGameState(GameState.RESULTS); }
  };

  const exitGame = () => {
    setGameState(GameState.START);
    setRoomConfig(null);
    setPlayers([]);
    triggerHaptic(50);
  };

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.PLAYING && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && gameState === GameState.PLAYING) handleStop();
    return () => clearInterval(interval);
  }, [gameState, timer]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-[200]">
        {floatingReactions.map(r => (
          <div key={r.id} className="absolute text-4xl animate-reaction-float" style={{ left: `${r.x}%`, bottom: '20%' }}>{r.emoji}</div>
        ))}
      </div>

      <nav className="glass sticky top-0 z-[110] px-4 py-3 flex justify-between items-center border-b border-white/10 shadow-xl">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setGameState(GameState.START)}>
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-lg shadow-lg">S</div>
          <h1 className="font-black text-xs uppercase tracking-tighter leading-none">Stop <br/> <span className="text-indigo-400">Genius AI</span></h1>
        </div>
        
        {shouldShowScore && (
          <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner">
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-500 block leading-none">Rodada</span>
              <span className="text-sm font-black text-white leading-none">{roomConfig?.currentRound || 0} / {roomConfig?.maxRounds || '∞'}</span>
            </div>
            <div className="w-px h-6 bg-white/10 mx-1"></div>
            <div className="text-right">
              <span className="text-[8px] font-black uppercase text-slate-500 block leading-none">Total</span>
              <span className="text-sm font-black text-indigo-400 leading-none">{players.find(p => p.id === 'me')?.totalScore || 0}</span>
            </div>
          </div>
        )}
      </nav>

      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar pb-32">
        {gameState === GameState.START && !isConfiguringNewRoom && (
          <div className="max-w-md mx-auto space-y-6 animate-slide-up">
            <div className="glass-heavy p-6 rounded-3xl border-white/10 space-y-8 shadow-2xl">
              <div className="flex flex-col items-center gap-6">
                <div className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl shadow-2xl border-2 border-white/10 transition-all duration-300" style={{ backgroundColor: selectedColor }}>{selectedAvatar}</div>
                
                <div className="w-full space-y-4">
                  <div className="flex gap-2 flex-wrap justify-center bg-black/20 p-3 rounded-2xl border border-white/5">
                    {AVATAR_COLORS.map(c => (
                      <button 
                        key={c} 
                        onClick={() => setSelectedColor(c)} 
                        className={`w-6 h-6 rounded-full transition-transform ${selectedColor === c ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-40 hover:opacity-100'}`} 
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar p-1">
                    {AVATARS.map(a => (
                      <button 
                        key={a} 
                        onClick={() => setSelectedAvatar(a)} 
                        className={`aspect-square rounded-xl flex items-center justify-center text-xl transition-all ${selectedAvatar === a ? 'bg-indigo-600 scale-105 shadow-indigo-500/30 shadow-lg border border-white/20' : 'bg-white/5 opacity-50 hover:opacity-100 hover:bg-white/10'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={playerName} 
                  onChange={e => setPlayerName(e.target.value)} 
                  onInput={spawnSpark}
                  placeholder="Seu apelido..." 
                  className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-4 text-center font-bold text-lg outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600 shadow-inner" 
                />
                
                <div className="grid gap-3">
                  <button onClick={() => setIsConfiguringNewRoom(true)} className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all">Criar Arena</button>
                  <button onClick={() => setGameState(GameState.BROWSER)} className="w-full bg-white/5 py-4 rounded-2xl font-black uppercase text-xs border border-white/10 active:scale-95 hover:bg-white/10 transition-all">Entrar em Sala</button>
                  <button onClick={() => setShowRulesModal(true)} className="w-full bg-white/5 py-4 rounded-2xl font-black uppercase text-xs border border-white/10 active:scale-95 transition-all">Como Jogar</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {isConfiguringNewRoom && (
          <div className="max-w-md mx-auto space-y-6 animate-slide-up">
            <h2 className="text-xl font-black uppercase text-center text-indigo-400 tracking-tighter">Configurar Arena</h2>
            <div className="glass-heavy p-6 rounded-3xl border-white/10 space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nome da Sala</label>
                <input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} onInput={spawnSpark} placeholder={generateRandomRoomName()} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all" />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[9px] font-black uppercase text-slate-500">Limite de Jogadores</label>
                  <span className="text-xs font-black text-indigo-400">{newRoomMaxPlayers}</span>
                </div>
                <input type="range" min="2" max="10" value={newRoomMaxPlayers} onChange={e => setNewRoomMaxPlayers(parseInt(e.target.value))} className="w-full accent-indigo-600 bg-white/5 rounded-lg appearance-none h-1.5 cursor-pointer" />
              </div>

              <div className="space-y-2">
                <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Senha (Opcional)</label>
                <input type="password" value={newRoomPassword} onChange={e => setNewRoomPassword(e.target.value)} placeholder="Opcional" className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-indigo-500/30 transition-all" />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => setIsConfiguringNewRoom(false)} className="py-4 rounded-xl bg-white/5 font-black uppercase text-[9px] border border-white/10">Cancelar</button>
                <button onClick={handleCreateRoom} className="py-4 rounded-xl bg-indigo-600 font-black uppercase text-[9px] shadow-lg shadow-indigo-600/20">Criar Agora</button>
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.BROWSER && (
          <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black uppercase text-indigo-400 tracking-tighter">Salas Disponíveis</h2>
              <button onClick={() => setGameState(GameState.START)} className="text-[9px] font-black uppercase bg-white/5 px-4 py-2 rounded-xl border border-white/10">Voltar</button>
            </div>
            <div className="space-y-3">
              {availableRooms.map(room => (
                <div key={room.id} onClick={() => joinRoom(room)} className="glass p-5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-indigo-600/10 hover:border-indigo-500/40 transition-all border-white/5 shadow-lg group">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600/20 rounded-2xl flex items-center justify-center text-2xl border border-indigo-500/20 group-hover:scale-110 transition-transform">🏟️</div>
                    <div>
                      <h4 className="font-black text-base text-slate-100 uppercase tracking-tight">{room.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-indigo-400 uppercase font-black bg-indigo-500/10 px-2 py-0.5 rounded-full">{room.currentPlayers}/{room.maxPlayers} JOGADORES</span>
                        <span className="text-[9px] text-slate-500 font-bold uppercase">{room.maxRounds} RODADAS</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {room.isPrivate && <span className="text-lg">🔒</span>}
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === GameState.LOBBY && roomConfig && (
          <div className="max-w-6xl mx-auto space-y-8 animate-slide-up pb-20 px-4">
            <div className="text-center space-y-3">
              <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Lobby da Arena</span>
              <h2 className="text-4xl font-black uppercase text-white tracking-tighter leading-none">{roomConfig.name}</h2>
              <div className="flex items-center justify-center gap-2">
                <button onClick={copyInviteLink} className={`text-[8px] font-black uppercase px-3 py-1 rounded transition-all flex items-center gap-1 shadow-lg ${copyStatus === 'copied' ? 'bg-emerald-600 text-white shadow-emerald-900/40' : 'bg-indigo-600 text-white shadow-indigo-900/40 border border-white/10'}`}>
                  {copyStatus === 'copied' ? '✅ Link Copiado!' : '🔗 Convidar Amigos'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              <div className="lg:col-span-4 space-y-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 px-1">Jogadores ({players.length}/{roomConfig.maxPlayers})</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {players.map(p => <PlayerCard key={p.id} player={p} isHostView={isHost} onRemove={removePlayer} onToggleDifficulty={toggleDifficulty} />)}
                    {players.length < roomConfig.maxPlayers && <EmptySlot isHost={isHost || false} onClick={addBot} />}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black uppercase text-slate-500">Categorias</h3>
                    {isHost && <button onClick={fetchAiSuggestions} disabled={isFetchingSuggestions} className="text-[9px] bg-indigo-600 px-3 py-1.5 rounded-lg font-black uppercase shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2 transition-all">
                      {isFetchingSuggestions ? 'Gerando...' : '✨ Sugestão IA'}
                    </button>}
                  </div>
                  <div className="glass p-5 rounded-3xl space-y-4 border-white/5 shadow-xl shadow-black/30">
                    <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                        <div key={cat.id} className="group relative flex items-center gap-2 bg-white/5 border border-white/10 py-2 px-3 rounded-xl transition-all">
                          <span className="text-xs font-bold text-slate-200">{cat.name}</span>
                          {cat.isAiSuggested && <span className="text-[10px] text-indigo-400">✨</span>}
                          {isHost && categories.length > 3 && <button onClick={() => removeCategory(cat.id)} className="text-slate-500 hover:text-rose-400 font-black text-xs p-1">×</button>}
                        </div>
                      ))}
                    </div>
                    {isHost && categories.length < 10 && (
                      <div className="pt-2 flex gap-2">
                        <input type="text" value={newCatInput} onChange={(e) => setNewCatInput(e.target.value)} onInput={spawnSpark} placeholder="Personalizado..." onKeyDown={(e) => e.key === 'Enter' && addCategoryManual()} className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500/30 transition-all placeholder:text-slate-700" />
                        <button onClick={addCategoryManual} className="bg-indigo-600 px-4 rounded-xl font-black text-xl text-white shadow-lg">+</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-3 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-[10px] font-black uppercase text-slate-500">Letras em Jogo</h3>
                    {isHost && <span className="text-[8px] font-black text-slate-600 uppercase">Toque para Excluir</span>}
                  </div>
                  <div className="glass p-5 rounded-3xl border-white/5 shadow-xl">
                    <div className="grid grid-cols-5 gap-2">
                      {ALPHABET.map(l => (
                        <button 
                          key={l} 
                          onClick={() => toggleLetterExclusion(l)}
                          disabled={!isHost}
                          className={`aspect-square rounded-lg flex items-center justify-center font-black text-[10px] border transition-all ${
                            excludedLetters.has(l) 
                            ? 'bg-rose-500/10 border-rose-500/30 text-rose-500 opacity-40 line-through' 
                            : 'bg-indigo-600/10 border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white'
                          }`}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                    <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                       <span className="text-[8px] font-black uppercase text-slate-500">Disponíveis</span>
                       <span className="text-[10px] font-black text-indigo-400">{ALPHABET.length - excludedLetters.size}</span>
                    </div>
                  </div>
                </div>

                {isHost && (
                  <button onClick={startRound} className="w-full py-5 bg-indigo-600 rounded-2xl font-black uppercase tracking-widest text-sm shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">
                    Começar Partida
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="max-w-3xl mx-auto flex flex-col animate-pop pb-12">
            {/* Letra e Timer movidos para o topo absoluto da área de jogo */}
            <div className="glass p-6 rounded-[2.5rem] mb-8 flex flex-col sm:flex-row items-center justify-between gap-8 shadow-2xl border-indigo-500/20 bg-slate-950/40 relative overflow-hidden">
              <div className="flex items-center gap-8 w-full sm:w-auto z-10">
                <div className="relative group shrink-0">
                  <div className="absolute -inset-4 bg-indigo-500/20 blur-2xl rounded-full group-hover:bg-indigo-500/30 transition-all duration-500"></div>
                  <div className="relative w-28 h-28 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(79,70,229,0.4)] border-2 border-white/20 transform hover:scale-105 transition-transform duration-300">
                    <span className="text-7xl font-black text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.3)] animate-pulse-letter">{currentLetter}</span>
                  </div>
                </div>
                
                <TimerGauge time={timer} max={60} />
              </div>
              
              <button onClick={handleStop} className="z-10 w-full sm:w-auto bg-red-600 px-16 py-6 rounded-[2rem] font-black text-2xl uppercase tracking-widest shadow-[0_15px_40px_rgba(220,38,38,0.4)] border-b-8 border-red-800 active:translate-y-2 active:border-b-0 transition-all transform hover:scale-105">
                STOP!
              </button>
            </div>

            <div className="flex justify-center gap-4 mb-8 glass rounded-2xl p-4 border-white/5 overflow-x-auto custom-scrollbar no-scrollbar-at-mobile">
               <div className="flex gap-4 min-w-max px-2">
                 {players.filter(p => p.id !== 'me').map(p => <OpponentGhost key={p.id} player={p} totalCategories={categories.length} />)}
               </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat, i) => (
                <div key={cat.id} className="glass p-5 rounded-2xl space-y-2 border-white/5 transition-all focus-within:border-indigo-500/40 focus-within:shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest ml-1">{cat.name}</label>
                    {cat.isAiSuggested && <span className="text-[8px] bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded-full font-black uppercase">✨ IA</span>}
                  </div>
                  <input type="text" value={myAnswers[cat.id] || ''} onChange={e => { setMyAnswers({...myAnswers, [cat.id]: e.target.value}); triggerHaptic(5); }} onInput={spawnSpark} autoFocus={i === 0} placeholder="Começa com..." className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xl font-black uppercase outline-none focus:border-indigo-500/30 transition-all placeholder:text-slate-800" />
                </div>
              ))}
            </div>

            <div className="fixed bottom-4 left-4 right-4 h-2 bg-white/5 rounded-full overflow-hidden border border-white/10 shadow-2xl z-50">
              <div 
                className={`h-full transition-all duration-1000 ${timer <= 10 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]'}`}
                style={{ width: `${(timer / 60) * 100}%` }}
              />
            </div>
          </div>
        )}

        {gameState === GameState.JUDGING && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center animate-slide-up">
            <div className="relative"><div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-5xl font-black animate-bounce shadow-indigo-600/30 shadow-2xl">{currentLetter}</div><div className="absolute -inset-4 border-[6px] border-indigo-500/10 border-t-indigo-500 rounded-[2rem] animate-spin"></div></div>
            <h2 className="text-2xl font-black text-indigo-100 uppercase tracking-tighter">O Gênio está analisando...</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase animate-pulse tracking-widest">Detectando malandragem e erros humanos</p>
          </div>
        )}

        {gameState === GameState.RESULTS && (
          <div className="max-w-4xl mx-auto space-y-8 animate-pop pb-32">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black shadow-xl mx-auto mb-2 animate-pop">{currentLetter}</div>
              <h2 className="text-4xl font-black uppercase text-white tracking-tighter leading-none">Resultados</h2>
              <p className="text-[10px] font-black text-slate-500 uppercase">Fim da Rodada {roomConfig?.currentRound} de {roomConfig?.maxRounds}</p>
              {roundCommentary && <p className="text-sm italic text-indigo-300 max-w-lg mx-auto bg-indigo-600/10 px-4 py-2 rounded-xl border border-indigo-500/20">"{roundCommentary}"</p>}
            </div>

            <div className="grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 ml-1">Ranking Geral</h3>
                <div className="space-y-2">
                  {[...players].sort((a,b)=>b.totalScore-a.totalScore).map((p,i) => (
                    <div key={p.id} className={`glass p-4 rounded-2xl flex items-center gap-4 transition-all ${i===0?'border-amber-500/40 shadow-xl bg-amber-500/[0.03]':''}`}>
                      <span className={`text-xl font-black ${i===0?'text-amber-500':'text-slate-700'}`}>{i+1}º</span>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl border border-white/10" style={{backgroundColor: p.color}}>{p.avatar}</div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate text-white">{p.name}</p></div>
                      <div className="text-lg font-black text-indigo-400">+{p.roundScore}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-8 space-y-6">
                {categories.map(cat => (
                  <div key={cat.id} className="glass-heavy rounded-3xl overflow-hidden shadow-xl border-white/5">
                    <div className="bg-indigo-600/10 px-5 py-3 font-black text-[10px] text-indigo-400 uppercase tracking-widest border-b border-white/5 flex justify-between items-center">
                      <span>{cat.name}</span>
                      {cat.isAiSuggested && <span className="text-[8px] bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded">✨ IA</span>}
                    </div>
                    <div className="divide-y divide-white/5">
                      {players.map(p => {
                        const res = results.find(r => normalize(r.playerName).includes(normalize(p.name)) && normalize(r.categoryName) === normalize(cat.name));
                        return (
                          <div key={p.id} className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xl shadow-lg border border-white/10" style={{backgroundColor: p.color}}>{p.avatar}</div>
                            <div className="flex-1 min-w-0">
                               <div className="flex justify-between items-center mb-0.5"><span className="text-[8px] font-black text-slate-500 uppercase">{p.name}</span><span className={`text-sm font-black ${res?.isValid ? (res.score >= 10 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-800'}`}>{res?.score || 0}</span></div>
                               <div className="flex items-center gap-2">
                                <p className={`text-base font-black uppercase truncate ${res?.isValid ? 'text-white' : 'text-slate-800 line-through'}`}>{res?.answer || '---'}</p>
                                {res?.isGeniusChoice && <span className="text-[7px] bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded font-black border border-amber-500/30 shadow-sm">GENIAL</span>}
                                {res?.emoji && <span className="text-lg">{res.emoji}</span>}
                               </div>
                               {res?.reason && !res.isValid && <p className="text-[8px] text-rose-400/70 font-bold uppercase mt-1 italic leading-tight">! {res.reason}</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8">
              {roomConfig && roomConfig.currentRound < roomConfig.maxRounds ? (
                <button onClick={startRound} className="flex-1 py-5 rounded-2xl bg-indigo-600 font-black uppercase text-xs shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">Próxima Rodada</button>
              ) : (
                <button onClick={() => setGameState(GameState.LOBBY)} className="flex-1 py-5 rounded-2xl bg-indigo-600 font-black uppercase text-xs shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">Reiniciar Arena</button>
              )}
              <button onClick={exitGame} className="flex-1 py-5 rounded-2xl bg-white/5 border border-white/10 font-black uppercase text-xs hover:bg-white/10 transition-all">Encerrar Jogo</button>
            </div>
          </div>
        )}
      </main>

      {gameState === GameState.RESULTS && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 z-[210] flex justify-center gap-3 overflow-x-auto custom-scrollbar">
          {REACTION_EMOJIS.map(emoji => (
            <button key={emoji} onClick={() => { addReaction(emoji); triggerHaptic(10); }} className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-3xl active:scale-90 hover:bg-white/10 transition-all shadow-lg">{emoji}</button>
          ))}
        </div>
      )}

      {showRulesModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setShowRulesModal(false)}></div>
          <div className="glass-heavy p-8 rounded-[2.5rem] w-full max-md relative animate-pop space-y-6 border-indigo-500/20">
            <div className="text-center space-y-1"><h2 className="text-3xl font-black text-indigo-400 uppercase tracking-tighter">Guia do Gênio</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Domine a Rodada</p></div>
            <div className="space-y-6 text-slate-400 text-sm leading-relaxed max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-1">
                <h4 className="font-black text-indigo-300 uppercase text-xs">01. O Objetivo</h4>
                <p>Seja rápido! Preencha todas as categorias com a letra sorteada e aperte STOP antes dos outros.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-emerald-300 uppercase text-xs">02. Validação Realista</h4>
                <p>Nossa IA valida respostas como um humano faria: aceita erros de digitação óbvios, mas pune malandragem!</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-amber-300 uppercase text-xs">03. Pontuação Genial</h4>
                <p>Respostas óbvias dão 10 pontos. Respostas raras ou criativas dão bônus de "Genialidade" (15 ou 20 pontos).</p>
              </div>
            </div>
            <button onClick={() => setShowRulesModal(false)} className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase text-[10px] shadow-xl shadow-indigo-600/30 active:scale-95 transition-all">VAMOS JOGAR!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
