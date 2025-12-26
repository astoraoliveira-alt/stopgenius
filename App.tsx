
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, Category, Player, ValidationResult, Difficulty, RoomConfig } from './types';
import { processMultiplayerRound, getCategorySuggestions } from './services/geminiService';
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
  '🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐸', '🐵', '🦄', '🐙', '🦖',
  '🤖', '👽', '👻', '🤡', '👹', '💀', '🎃', '👾', '🔥', '💎', '🚀', '🌈',
  '🎮', '🎸', '🎨', '⚽', '🍕', '🍔', '🍦', '🍩', '🛹', '📸', '🎧', '🔭'
];

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#94a3b8'];

const BOT_TEMPLATES = [
  { name: 'Bot Inteligente', avatar: '🤖', color: '#8b5cf6' },
  { name: 'Bot Ligeirinho', avatar: '⚡', color: '#f59e0b' },
  { name: 'Bot Criativo', avatar: '🎨', color: '#ec4899' },
  { name: 'Bot Engraçado', avatar: '🤡', color: '#ef4444' }
];

const ADJECTIVES = ['Épica', 'Lendária', 'Mágica', 'Incrível', 'Veloz', 'Sábia', 'Caótica', 'Ninja', 'Suprema', 'Genial'];
const NOUNS = ['Arena', 'Mansão', 'Galáxia', 'Toca', 'Base', 'Fortaleza', 'Cidade', 'Academia', 'Nave', 'Ilha'];

const generateRandomRoomName = () => {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${noun} ${adj} ${Math.floor(Math.random() * 99)}`;
};

const INITIAL_MOCK_ROOMS: RoomConfig[] = [
  { id: 'ALPHA1', name: 'Arena Ninja 77', maxPlayers: 10, isPrivate: true, password: '123', hostId: 'bot1', currentPlayers: 3 },
  { id: 'GENIUS', name: 'Fortaleza Sábia 12', maxPlayers: 5, isPrivate: false, hostId: 'bot2', currentPlayers: 2 },
  { id: 'STOPIT', name: 'Galáxia Veloz 09', maxPlayers: 8, isPrivate: false, hostId: 'bot3', currentPlayers: 4 }
];

const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

const PlayerCard: React.FC<{
  player: Player;
  onRemove?: (player: Player) => void;
  onToggleDifficulty?: (id: string) => void;
}> = ({ player, onRemove, onToggleDifficulty }) => {
  const difficultyLabel = player.difficulty === Difficulty.EASY ? 'Fácil' : player.difficulty === Difficulty.HARD ? 'Gênio' : 'Médio';
  const difficultyColor = player.difficulty === Difficulty.EASY ? 'text-emerald-400 border-emerald-500/30' : 
                         player.difficulty === Difficulty.HARD ? 'text-rose-400 border-rose-500/30' : 
                         'text-indigo-400 border-indigo-500/30';

  return (
    <div className={`relative overflow-hidden p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between mb-2 backdrop-blur-md`}>
      <div className="flex items-center gap-3 min-w-0 z-10">
        <div className="relative shrink-0">
          <div 
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-xl sm:text-2xl shadow-lg border border-white/10" 
            style={{ backgroundColor: player.color }}
          >
            {player.avatar}
          </div>
          {player.isBot && (
             <div className="absolute -top-1 -right-1 bg-slate-900 border border-white/20 w-4 h-4 rounded-full flex items-center justify-center text-[7px] shadow-lg">🤖</div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold truncate text-slate-100">{player.name}</span>
            {player.isHost && <span className="text-[6px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1 py-0.5 rounded uppercase font-black tracking-tighter shrink-0">Host</span>}
          </div>
          {player.isBot ? (
            <button onClick={() => onToggleDifficulty?.(player.id)} className={`text-[7px] mt-1 px-1.5 py-0.5 rounded-md font-black uppercase border bg-black/40 ${difficultyColor}`}>NÍVEL: {difficultyLabel}</button>
          ) : (
            <span className="text-[7px] mt-1 font-bold text-slate-500 uppercase flex items-center gap-1"><div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"/> Online</span>
          )}
        </div>
      </div>
      {onRemove && player.id !== 'me' && (
        <button onClick={() => onRemove(player)} className="text-slate-500 hover:text-rose-400 p-2 rounded-xl transition-all">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [availableRooms, setAvailableRooms] = useState<RoomConfig[]>(INITIAL_MOCK_ROOMS);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [roomSearch, setRoomSearch] = useState('');
  
  const [isConfiguringNewRoom, setIsConfiguringNewRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomMaxPlayers, setNewRoomMaxPlayers] = useState(10);
  const [newRoomPassword, setNewRoomPassword] = useState('');

  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<{ room: RoomConfig; input: string } | null>(null);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentLetter, setCurrentLetter] = useState('');
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [timer, setTimer] = useState(60);
  const [specialGreeting, setSpecialGreeting] = useState<string | null>(null);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);

  const checkSpecialName = (name: string) => {
    const trimmed = name.trim().toLowerCase();
    const gislaineGreeting = "Oi Gislaine! Sua presença deixa a arena mais alegre. 😊";
    const greetings: Record<string, string> = {
      "junior": "Que bom te ver aqui, Junior! Bora jogar? ❤️",
      "gislaine": gislaineGreeting,
      "gi": gislaineGreeting,
      "miguel": "Miguel na área! Mostra pra esse gênio como se faz. 🚀",
      "vitoria": "Vitória chegou! Com esse nome, o destino já está traçado. ✨",
      "vitória": "Vitória chegou! Com esse nome, o destino já está traçado. ✨"
    };

    if (greetings[trimmed]) {
      setSpecialGreeting(greetings[trimmed]);
      setTimeout(() => setSpecialGreeting(null), 8000);
    }
  };

  const fetchSuggestions = async () => {
    setIsFetchingSuggestions(true);
    const suggestions = await getCategorySuggestions();
    if (suggestions.length > 0) {
      setCategories(prev => {
        const uniqueSuggestions = suggestions
          .filter(s => !prev.some(p => normalize(p.name) === normalize(s)))
          .map((s, i) => ({ id: `ai-${i}-${Date.now()}`, name: s, isAiSuggested: true }));
        return [...prev, ...uniqueSuggestions];
      });
    }
    setIsFetchingSuggestions(false);
  };

  useEffect(() => {
    if (gameState === GameState.LOBBY) {
      fetchSuggestions();
    }
  }, [gameState]);

  const startRoomConfiguration = () => {
    setNewRoomName(generateRandomRoomName());
    setNewRoomMaxPlayers(10);
    setNewRoomPassword('');
    setIsConfiguringNewRoom(true);
  };

  const finalizeCreateRoom = () => {
    const id = generateRoomId();
    const config: RoomConfig = { id, name: newRoomName || generateRandomRoomName(), maxPlayers: newRoomMaxPlayers, isPrivate: newRoomPassword.length > 0, password: newRoomPassword, hostId: 'me', currentPlayers: 1 };
    const me: Player = { id: 'me', name: playerName, avatar: selectedAvatar, color: selectedColor, isBot: false, isHost: true, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting' };
    setRoomConfig(config);
    setPlayers([me]);
    setGameState(GameState.LOBBY);
    checkSpecialName(playerName);
  };

  const joinRoom = (room: RoomConfig) => {
    if (room.isPrivate && (!showPasswordModal || showPasswordModal.input !== room.password)) {
      setShowPasswordModal({ room, input: '' });
      return;
    }
    setShowPasswordModal(null);
    const me: Player = { id: 'me', name: playerName, avatar: selectedAvatar, color: selectedColor, isBot: false, isHost: false, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting' };
    setRoomConfig(room);
    setPlayers([me]);
    setGameState(GameState.LOBBY);
    checkSpecialName(playerName);
  };

  const addBot = () => {
    if (players.length >= (roomConfig?.maxPlayers || 10)) return;
    const t = BOT_TEMPLATES[Math.floor(Math.random() * BOT_TEMPLATES.length)];
    setPlayers([...players, { ...t, id: Date.now().toString(), isBot: true, isHost: false, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting', difficulty: Difficulty.MEDIUM }]);
  };

  const toggleBotDifficulty = (id: string) => {
    setPlayers(prev => prev.map(p => (p.id === id && p.isBot) ? { ...p, difficulty: p.difficulty === Difficulty.EASY ? Difficulty.MEDIUM : p.difficulty === Difficulty.MEDIUM ? Difficulty.HARD : Difficulty.EASY } : p));
  };

  const startRound = () => {
    if (categories.length < 5) return;
    setCurrentRound(prev => (currentRound >= totalRounds ? 1 : prev + 1));
    const alphabet = 'ABCDEFGHIJKLMNOPRSTUV';
    setCurrentLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
    setMyAnswers({});
    setTimer(60);
    setGameState(GameState.PLAYING);
    setPlayers(prev => prev.map(p => ({ ...p, status: 'typing', answers: {}, roundScore: 0 })));
  };

  const handleStop = async () => {
    setGameState(GameState.JUDGING);
    const answers: Record<string, string> = {};
    categories.forEach(c => answers[c.name] = myAnswers[c.id] || "");
    try {
      const data = await processMultiplayerRound(currentLetter, categories, players.find(p => p.id === 'me')!, answers, players.filter(p => p.isBot));
      if (data?.judgments) {
        setResults(data.judgments);
        setPlayers(prev => prev.map(p => {
          const pJudgments = data.judgments.filter((j: any) => normalize(j.playerName).includes(normalize(p.name)));
          const score = pJudgments.reduce((acc: number, curr: any) => acc + (curr.score || 0), 0);
          return { ...p, roundScore: score, totalScore: p.totalScore + score, status: 'done' };
        }));
        setGameState(GameState.RESULTS);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
    } catch (e) { 
      setGameState(GameState.RESULTS); 
    }
  };

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.PLAYING && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && gameState === GameState.PLAYING) handleStop();
    return () => clearInterval(interval);
  }, [gameState, timer]);

  const shouldShowScore = gameState === GameState.PLAYING || gameState === GameState.JUDGING || gameState === GameState.RESULTS;

  return (
    <div className="flex-1 flex flex-col w-full max-w-screen-xl mx-auto">
      <nav className="glass sticky top-0 z-[110] px-4 py-4 sm:py-3 flex justify-between items-center border-b border-white/10 shadow-xl" style={{ paddingTop: 'calc(var(--safe-top) + 0.5rem)', paddingBottom: '0.75rem' }}>
        <div className="flex items-center gap-3 cursor-pointer shrink-0" onClick={() => setGameState(GameState.START)}>
          <div className="w-10 h-10 sm:w-8 sm:h-8 bg-indigo-600 rounded-xl sm:rounded-lg flex items-center justify-center font-black text-lg sm:text-sm shadow-indigo-500/20 shadow-lg">S</div>
          <h1 className="font-black text-xs sm:text-sm uppercase tracking-tighter leading-none">
            Stop <br className="sm:hidden" /> <span className="text-indigo-400">Genius AI</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={() => setShowRulesModal(true)} className="p-2 sm:p-2 text-slate-300 hover:text-white transition-all bg-white/5 rounded-xl border border-white/10">
            <svg className="w-6 h-6 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {shouldShowScore && (
            <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-xl border border-white/10 shadow-inner animate-pop">
              <div className="text-right">
                <span className="text-[8px] font-black uppercase text-slate-500 block leading-none mb-0.5">PTS</span>
                <span className="text-lg sm:text-sm font-black text-indigo-400 leading-none">{players.find(p => p.id === 'me')?.totalScore || 0}</span>
              </div>
            </div>
          )}
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto px-4 py-4 md:py-8 custom-scrollbar pb-24">
        {gameState === GameState.START && (
          <div className="max-w-md mx-auto space-y-8 animate-slide-up">
            {!isConfiguringNewRoom ? (
              <div className="glass-heavy p-6 rounded-3xl border-white/10 space-y-6 shadow-2xl">
                <div className="flex flex-col items-center gap-6">
                  <div className="relative">
                    <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl flex items-center justify-center text-5xl shadow-2xl transition-all duration-500 border-2 border-white/10" style={{ backgroundColor: selectedColor }}>{selectedAvatar}</div>
                    <div className="absolute -bottom-1 -left-16 grid grid-cols-4 gap-1.5 bg-slate-900/95 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl transition-all hover:scale-105">
                      {AVATAR_COLORS.map(color => (
                        <button key={color} onClick={() => setSelectedColor(color)} className={`w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full transition-all ${selectedColor === color ? 'scale-125 ring-2 ring-white shadow-lg z-10' : 'opacity-40 hover:opacity-80'}`} style={{ backgroundColor: color }} />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-6 gap-2 w-full max-h-[160px] overflow-y-auto pr-2 custom-scrollbar bg-black/20 p-3 rounded-2xl border border-white/5">
                    {AVATARS.map(avatar => (
                      <button key={avatar} onClick={() => setSelectedAvatar(avatar)} className={`aspect-square rounded-xl flex items-center justify-center text-lg transition-all ${selectedAvatar === avatar ? 'bg-indigo-600 scale-105 shadow-lg' : 'bg-white/5 opacity-40 hover:opacity-100'}`}>{avatar}</button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Como quer ser chamado?" className="w-full bg-slate-900 border border-white/10 rounded-2xl px-4 py-3.5 text-base font-bold text-center outline-none focus:border-indigo-500/50" />
                  <div className="grid gap-2">
                    <button onClick={startRoomConfiguration} disabled={!playerName.trim()} className="w-full bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg disabled:opacity-30">Criar Arena</button>
                    <button onClick={() => setGameState(GameState.BROWSER)} disabled={!playerName.trim()} className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-white/10 disabled:opacity-30">Entrar em Sala</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-heavy p-6 rounded-3xl space-y-6 border-white/10 shadow-2xl animate-pop">
                <h2 className="text-xl font-black text-indigo-400 text-center uppercase">Configurar Sala</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-slate-500 ml-1">Nome</label><input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold" /></div>
                  <div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-slate-500 ml-1">Jogadores ({newRoomMaxPlayers})</label><input type="range" min="2" max="10" value={newRoomMaxPlayers} onChange={e => setNewRoomMaxPlayers(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1" /></div>
                  <div className="space-y-1.5"><label className="text-[9px] font-black uppercase text-slate-500 ml-1">Senha (opcional)</label><input type="text" value={newRoomPassword} onChange={e => setNewRoomPassword(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm font-bold" /></div>
                </div>
                <div className="flex gap-2"><button onClick={() => setIsConfiguringNewRoom(false)} className="flex-1 bg-white/5 py-4 rounded-2xl font-black uppercase text-[10px]">Voltar</button><button onClick={finalizeCreateRoom} className="flex-1 bg-indigo-600 py-4 rounded-2xl font-black uppercase text-[10px]">Confirmar</button></div>
              </div>
            )}
          </div>
        )}

        {gameState === GameState.BROWSER && (
          <div className="max-w-2xl mx-auto space-y-6 animate-pop">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-black uppercase text-indigo-400">Arenas Disponíveis</h2>
              <button onClick={() => setGameState(GameState.START)} className="text-[10px] font-black uppercase text-slate-500 hover:text-white">Voltar</button>
            </div>
            <div className="relative">
              <input type="text" value={roomSearch} onChange={e => setRoomSearch(e.target.value)} placeholder="Pesquisar sala por nome ou ID..." className="w-full bg-slate-900 border border-white/10 rounded-2xl px-5 py-4 text-sm outline-none focus:border-indigo-500/50" />
            </div>
            <div className="grid gap-3">
              {availableRooms.filter(r => r.name.toLowerCase().includes(roomSearch.toLowerCase())).map(room => (
                <button key={room.id} onClick={() => joinRoom(room)} className="glass p-5 rounded-2xl flex items-center justify-between hover:bg-white/5 transition-all border-white/10 group">
                  <div className="text-left">
                    <div className="flex items-center gap-2"><span className="font-black text-sm uppercase">{room.name}</span>{room.isPrivate && <span className="text-xs">🔒</span>}</div>
                    <span className="text-[10px] font-bold text-slate-600 uppercase">Host: {room.hostId} • ID: {room.id}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-black text-indigo-400">{room.currentPlayers}/{room.maxPlayers}</span>
                    <div className="bg-indigo-600 group-hover:bg-indigo-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all shadow-lg">Entrar</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {gameState === GameState.LOBBY && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-pop">
            {specialGreeting && (
              <div className="w-full bg-indigo-600/10 border border-indigo-500/30 p-4 rounded-2xl text-center shadow-lg animate-pop relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-500/5 to-transparent animate-shimmer" />
                <p className="font-bold text-indigo-200 text-sm sm:text-base">{specialGreeting}</p>
              </div>
            )}
            
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-4">
                <div className="glass p-5 rounded-2xl space-y-4 shadow-lg">
                  <div className="flex justify-between items-start"><div className="min-w-0 flex-1"><h2 className="text-lg font-black text-indigo-400 truncate">{roomConfig?.name}</h2><p className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">ID: {roomConfig?.id}</p></div><button onClick={() => setShowInviteModal(true)} className="w-8 h-8 bg-emerald-600/10 text-emerald-400 rounded-lg flex items-center justify-center text-sm">🔗</button></div>
                  <div className="pt-3 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-slate-500"><span>Vagas</span><span>{players.length}/{roomConfig?.maxPlayers}</span></div>
                </div>
                <div className="space-y-1">{players.map(p => <PlayerCard key={p.id} player={p} onRemove={() => setPlayers(prev => prev.filter(x => x.id !== p.id))} onToggleDifficulty={toggleBotDifficulty} />)}{players.length < (roomConfig?.maxPlayers || 10) && <button onClick={addBot} className="w-full border border-dashed border-slate-800 p-4 rounded-xl text-slate-600 font-bold hover:text-indigo-400 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-widest">+ Adicionar Bot</button>}</div>
              </div>
              <div className="lg:col-span-8 glass-heavy p-6 rounded-3xl space-y-6 flex flex-col shadow-xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-purple-400 uppercase tracking-tight flex items-center gap-2"><span className="w-1 h-5 bg-purple-500 rounded-full"></span> Temas da Partida</h3>
                  {isFetchingSuggestions && <span className="text-[10px] font-black text-slate-500 animate-pulse uppercase">Gênio sugerindo temas...</span>}
                </div>
                <div className="space-y-4 flex-1">
                  <div className="flex gap-2"><input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Novo tema..." className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none" /><button onClick={() => { if(newCategoryName.trim()){setCategories([...categories, {id: Date.now().toString(), name: newCategoryName}]); setNewCategoryName('')} }} className="bg-indigo-600 px-5 rounded-xl font-black text-[10px] uppercase">Add</button></div>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(c => (
                      <span key={c.id} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase flex items-center gap-2 border transition-all ${c.isAiSuggested ? 'bg-indigo-600/10 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10'}`}>
                        {c.name}
                        {c.isAiSuggested && <span className="bg-indigo-600 text-white text-[7px] px-1 rounded">IA</span>}
                        {roomConfig?.hostId === 'me' && (
                          <button onClick={() => setCategories(categories.filter(x => x.id !== c.id))} className="text-red-500 hover:text-red-400 ml-1 text-base leading-none">×</button>
                        )}
                      </span>
                    ))}
                  </div>
                  {categories.length < 5 && (
                    <p className="text-rose-400 text-[10px] font-black uppercase tracking-wider animate-pulse">São necessárias pelo menos 5 categorias para começar.</p>
                  )}
                </div>
                <button 
                  onClick={startRound} 
                  disabled={categories.length < 5}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  Lançar Partida
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === GameState.PLAYING && (
          <div className="max-w-3xl mx-auto flex flex-col animate-pop">
            <div className="glass p-5 rounded-3xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl border-indigo-500/20">
              <div className="flex items-center gap-5 w-full sm:w-auto">
                <div className="w-16 h-16 bg-indigo-600/30 border border-indigo-500/50 rounded-2xl flex items-center justify-center shadow-xl shrink-0"><span className="text-4xl font-black text-indigo-400 animate-pulse-letter">{currentLetter}</span></div>
                <div className="flex-1 sm:flex-none">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest block mb-1">Tempo</span>
                  <div className="flex items-baseline gap-1"><span className={`text-3xl font-black font-mono leading-none ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}</span><span className="text-xs font-bold text-slate-400 uppercase">seg</span></div>
                </div>
              </div>
              <button onClick={handleStop} className="w-full sm:w-auto bg-red-600 hover:bg-red-500 px-10 py-4 rounded-2xl font-black text-xl uppercase tracking-widest shadow-xl border-b-4 border-red-800 active:translate-y-1 active:border-b-0 transition-all">STOP</button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat, i) => (
                <div key={cat.id} className="glass-heavy p-5 rounded-3xl space-y-2 border-white/5 focus-within:border-indigo-500/40 transition-all">
                  <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block ml-1">{cat.name}{cat.isAiSuggested && " (IA)"}</label>
                  <input type="text" value={myAnswers[cat.id] || ''} onChange={e => setMyAnswers({...myAnswers, [cat.id]: e.target.value})} placeholder="..." autoFocus={i === 0} className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-2xl font-black uppercase outline-none focus:ring-4 ring-indigo-500/5 transition-all text-center placeholder:text-slate-900" />
                </div>
              ))}
            </div>
            <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-slate-950/50 z-[150] pb-[var(--safe-bottom)]">
              <div className={`h-full transition-all duration-1000 ease-linear ${timer <= 10 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${(timer / 60) * 100}%` }} />
            </div>
          </div>
        )}

        {gameState === GameState.JUDGING && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-6 text-center animate-slide-up">
            <div className="relative"><div className="w-20 h-20 border-[6px] border-indigo-500/10 border-t-indigo-500 rounded-2xl animate-spin"></div><div className="absolute inset-0 flex items-center justify-center text-3xl animate-bounce">🧠</div></div>
            <div className="space-y-1"><h2 className="text-xl font-black text-indigo-100 uppercase">O Gênio está analisando...</h2><p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Validando semântica e vocabulário</p></div>
          </div>
        )}

        {gameState === GameState.RESULTS && (
          <div className="max-w-4xl mx-auto space-y-8 animate-pop">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-black uppercase text-indigo-400 tracking-tighter">Resultados</h2>
              <span className="text-[10px] bg-white/5 px-4 py-1.5 rounded-full font-black text-slate-500 uppercase tracking-widest">Rodada {currentRound} de {totalRounds}</span>
            </div>
            <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Placar Geral</h3>
                <div className="space-y-2">
                  {[...players].sort((a,b)=>b.totalScore-a.totalScore).map((p,i) => (
                    <div key={p.id} className={`glass p-4 rounded-2xl flex items-center gap-4 transition-all ${i===0?'border-amber-500/40 bg-amber-500/5':''}`}>
                      <span className={`text-xl font-black ${i===0?'text-amber-500':'text-slate-700'}`}>{i+1}º</span>
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-lg" style={{backgroundColor: p.color}}>{p.avatar}</div>
                      <div className="flex-1 min-w-0"><p className="font-bold text-sm truncate">{p.name}</p><p className="text-[8px] font-black text-slate-500 uppercase">{p.totalScore} TOTAL</p></div>
                      <div className="text-lg font-black text-indigo-400">+{p.roundScore}</div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setGameState(GameState.LOBBY)} className="w-full py-5 rounded-2xl font-black text-sm uppercase bg-indigo-600 hover:bg-indigo-500 transition-all shadow-xl">Continuar →</button>
              </div>
              <div className="lg:col-span-8 space-y-6">
                <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Detalhamento da Letra {currentLetter}</h3>
                {categories.map(cat => (
                  <div key={cat.id} className="glass-heavy rounded-3xl overflow-hidden shadow-xl">
                    <div className="bg-indigo-600/10 px-6 py-3 font-black text-xs text-indigo-400 flex justify-between uppercase"><span>{cat.name}{cat.isAiSuggested && " (IA)"}</span></div>
                    <div className="divide-y divide-white/5">
                      {players.map(p => {
                        const res = results.find(r => normalize(r.playerName).includes(normalize(p.name)) && normalize(r.categoryName) === normalize(cat.name));
                        return (
                          <div key={p.id} className="p-5 flex items-start gap-4">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl shrink-0" style={{backgroundColor: p.color}}>{p.avatar}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1"><span className="text-[8px] font-black text-slate-500 uppercase">{p.name}</span><span className={`text-xl font-black ${res?.isValid ? (res.score === 10 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-800'}`}>{res?.score || 0}</span></div>
                              <p className={`text-lg font-black uppercase truncate ${res?.isValid ? 'text-white' : 'text-slate-800 line-through'}`}>
                                {res?.answer || '---'}
                              </p>
                              {res?.reason && <p className="text-[10px] text-slate-500 italic mt-1.5 leading-snug">"{res.reason}"</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {showRulesModal && (
        <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowRulesModal(false)}></div>
          <div className="glass-heavy p-8 rounded-t-[2.5rem] sm:rounded-[2.5rem] w-full max-w-md relative animate-pop space-y-6 shadow-2xl">
            <button onClick={() => setShowRulesModal(false)} className="absolute top-6 right-8 text-slate-500 text-3xl transition-all">×</button>
            <div className="text-center space-y-1"><h2 className="text-3xl font-black text-indigo-400 uppercase tracking-tighter">Guia Rápido</h2><p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.3em]">Regras do Stop Genius AI</p></div>
            <div className="space-y-4 text-slate-400 text-sm max-h-[40vh] overflow-y-auto pr-4 custom-scrollbar">
              <div className="space-y-1"><h4 className="font-black text-indigo-300 uppercase text-xs">01. Rapidez</h4><p>Responda antes do cronômetro zerar ou alguém apertar STOP.</p></div>
              <div className="space-y-1"><h4 className="font-black text-purple-300 uppercase text-xs">02. Pontuação</h4><p>10 pontos por resposta única. 5 se alguém repetir. 0 se o Gênio invalidar.</p></div>
              <div className="space-y-1"><h4 className="font-black text-emerald-300 uppercase text-xs">03. O Gênio</h4><p>Nossa IA valida o contexto e sugere temas épicos a cada rodada!</p></div>
            </div>
            <button onClick={() => setShowRulesModal(false)} className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Vamos lá!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
