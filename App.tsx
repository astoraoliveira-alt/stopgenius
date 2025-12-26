
import React, { useState, useEffect, useMemo } from 'react';
import { GameState, Category, Player, ValidationResult, Difficulty, RoomConfig } from './types';
import { processMultiplayerRound } from './services/geminiService';
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

const ROUND_OPTIONS = [3, 5, 10, 15];

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

// COMPONENTE REFATORADO: PLAYER CARD
const PlayerCard: React.FC<{
  player: Player;
  onRemove?: (player: Player) => void;
  onToggleDifficulty?: (id: string) => void;
  isSidebar?: boolean;
}> = ({ player, onRemove, onToggleDifficulty, isSidebar }) => {
  const difficultyLabel = player.difficulty === Difficulty.EASY ? 'Fácil' : player.difficulty === Difficulty.HARD ? 'Gênio' : 'Médio';
  const difficultyColor = player.difficulty === Difficulty.EASY ? 'text-emerald-400 border-emerald-500/30' : 
                         player.difficulty === Difficulty.HARD ? 'text-rose-400 border-rose-500/30' : 
                         'text-indigo-400 border-indigo-500/30';

  return (
    <div 
      className={`relative group overflow-hidden transition-all duration-500 
        ${isSidebar ? 'p-2 rounded-xl' : 'p-3 md:p-4 rounded-2xl'} 
        bg-white/[0.03] border border-white/10 hover:border-white/20 
        flex items-center justify-between shadow-xl mb-2 backdrop-blur-md`}
    >
      <div 
        className="absolute -right-4 -top-4 w-16 h-16 blur-2xl opacity-10 transition-opacity group-hover:opacity-30" 
        style={{ backgroundColor: player.color }}
      />
      
      <div className="flex items-center gap-3 md:gap-4 min-w-0 z-10">
        <div className="relative shrink-0">
          <div 
            className={`${isSidebar ? 'w-9 h-9 text-lg' : 'w-11 h-11 md:w-14 md:h-14 text-2xl md:text-3xl'} 
              rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl 
              transition-all duration-300 group-hover:scale-105 border border-white/10`} 
            style={{ 
              backgroundColor: player.color,
              boxShadow: `0 8px 24px -6px ${player.color}60`
            }}
          >
            {player.avatar}
          </div>
          {player.isBot && (
             <div className="absolute -top-1.5 -right-1.5 bg-slate-900 border border-white/20 w-5 h-5 rounded-full flex items-center justify-center text-[8px] shadow-lg">🤖</div>
          )}
        </div>

        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className={`${isSidebar ? 'text-xs' : 'text-sm md:text-base'} font-extrabold tracking-tight truncate text-slate-100`}>
              {player.name}
            </span>
            {player.isHost && (
              <span className="text-[7px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 px-1.5 py-0.5 rounded font-black uppercase shrink-0 tracking-tighter shadow-sm">Host</span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-1">
            {player.isBot ? (
              <button 
                onClick={() => onToggleDifficulty?.(player.id)}
                className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase border bg-black/40 hover:bg-black/60 transition-all ${difficultyColor}`}
              >
                NÍVEL: {difficultyLabel}
              </button>
            ) : (
              <div className="flex items-center gap-1 opacity-60">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Online</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isSidebar && (
        <div className="flex items-center gap-1 z-10">
          {onRemove && player.id !== 'me' && (
            <button 
              onClick={() => onRemove(player)} 
              className="text-slate-500 hover:text-rose-400 p-2 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
              title="Remover Jogador"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
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
  const [copiedLink, setCopiedLink] = useState(false);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentLetter, setCurrentLetter] = useState('');
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [timer, setTimer] = useState(60);

  const startRoomConfiguration = () => {
    setNewRoomName(generateRandomRoomName());
    setNewRoomMaxPlayers(10);
    setNewRoomPassword('');
    setIsConfiguringNewRoom(true);
  };

  const finalizeCreateRoom = () => {
    const id = generateRoomId();
    const config: RoomConfig = { 
      id, 
      name: newRoomName || generateRandomRoomName(), 
      maxPlayers: newRoomMaxPlayers, 
      isPrivate: newRoomPassword.length > 0, 
      password: newRoomPassword,
      hostId: 'me', 
      currentPlayers: 1 
    };
    const me: Player = { id: 'me', name: playerName, avatar: selectedAvatar, color: selectedColor, isBot: false, isHost: true, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting' };
    
    setRoomConfig(config);
    setPlayers([me]);
    setAvailableRooms(prev => [config, ...prev]);
    setIsConfiguringNewRoom(false);
    setGameState(GameState.LOBBY);
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
  };

  const addBot = () => {
    if (players.length >= (roomConfig?.maxPlayers || 10)) return;
    const t = BOT_TEMPLATES[Math.floor(Math.random() * BOT_TEMPLATES.length)];
    setPlayers([...players, { ...t, id: Date.now().toString(), isBot: true, isHost: false, isReady: true, answers: {}, roundScore: 0, totalScore: 0, status: 'waiting', difficulty: Difficulty.MEDIUM }]);
  };

  const toggleBotDifficulty = (id: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === id && p.isBot) {
        const next = p.difficulty === Difficulty.EASY ? Difficulty.MEDIUM : p.difficulty === Difficulty.MEDIUM ? Difficulty.HARD : Difficulty.EASY;
        return { ...p, difficulty: next };
      }
      return p;
    }));
  };

  const startRound = () => {
    setCurrentRound(prev => (currentRound >= totalRounds ? 1 : prev + 1));
    if (currentRound >= totalRounds) setPlayers(players.map(p => ({ ...p, totalScore: 0 })));
    const alphabet = 'ABCDEFGHIJKLMNOPRSTUV';
    setCurrentLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
    setMyAnswers({});
    setTimer(60);
    setGameState(GameState.PLAYING);
    setPlayers(prev => prev.map(p => ({ ...p, status: 'typing', answers: {}, roundScore: 0 })));
  };

  const handleStop = async () => {
    setGameState(GameState.JUDGING);
    const human = players.find(p => p.id === 'me')!;
    const answers: Record<string, string> = {};
    categories.forEach(c => answers[c.name] = myAnswers[c.id] || "");
    try {
      const data = await processMultiplayerRound(currentLetter, categories, human, answers, players.filter(p => p.isBot));
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
      console.error(e);
      setGameState(GameState.RESULTS); 
    }
  };

  const filteredRooms = useMemo(() => {
    const search = normalize(roomSearch);
    return availableRooms.filter(r => 
      normalize(r.name).includes(search) || normalize(r.id).includes(search)
    );
  }, [availableRooms, roomSearch]);

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.PLAYING && timer > 0) interval = setInterval(() => setTimer(t => t - 1), 1000);
    else if (timer === 0 && gameState === GameState.PLAYING) handleStop();
    return () => clearInterval(interval);
  }, [gameState, timer]);

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col selection:bg-indigo-500/30">
      {/* NAVBAR */}
      <nav className="glass sticky top-0 z-[110] px-4 md:px-6 py-2.5 flex justify-between items-center border-b border-white/5 shadow-2xl">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => {setGameState(GameState.START); setIsConfiguringNewRoom(false);}}>
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-base shadow-lg">S</div>
          <div>
            <h1 className="font-black text-xs md:text-lg uppercase tracking-tight leading-tight">Stop <span className="text-indigo-400">Genius AI</span></h1>
            <p className="text-[7px] font-bold text-slate-500 uppercase tracking-widest leading-none">Multiplayer Evolution</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowRulesModal(true)} className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="hidden sm:inline text-[8px] font-black uppercase tracking-widest">Regras</span>
          </button>
          <div className="text-right border-l border-white/10 pl-4">
            <span className="text-[6px] font-black uppercase text-slate-500 block leading-none mb-0.5">Pontos</span>
            <span className="text-base md:text-lg font-black text-indigo-400 leading-none">{players.find(p => p.id === 'me')?.totalScore || 0}</span>
          </div>
        </div>
      </nav>

      <main className="flex-1 overflow-y-auto px-4 py-4 md:py-6 custom-scrollbar pb-20">
        {/* IDENTIDADE E CONFIGURAÇÃO DE CRIAÇÃO */}
        {gameState === GameState.START && (
          <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
            {!isConfiguringNewRoom ? (
              <>
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-indigo-100">Quem é você?</h2>
                  <p className="text-slate-500 text-xs">Crie seu perfil e entre na arena.</p>
                </div>
                <div className="glass-heavy p-6 md:p-8 rounded-[2rem] border-white/10 space-y-6 shadow-2xl">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <div className="w-28 h-28 md:w-32 md:h-32 rounded-[2rem] flex items-center justify-center text-5xl md:text-6xl shadow-2xl transition-all duration-500 hover:rotate-2 border-2 border-white/10" style={{ backgroundColor: selectedColor, boxShadow: `0 15px 40px -15px ${selectedColor}80` }}>{selectedAvatar}</div>
                      <div className="absolute -bottom-2 -right-2 grid grid-cols-4 gap-1 bg-slate-900 p-1 rounded-xl border border-white/10">
                        {AVATAR_COLORS.map(color => (
                          <button key={color} onClick={() => setSelectedColor(color)} className={`w-4 h-4 rounded-full transition-all ${selectedColor === color ? 'scale-125 ring-1 ring-white/50' : 'opacity-40 hover:opacity-100'}`} style={{ backgroundColor: color }} />
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-8 gap-1.5 w-full max-h-[140px] overflow-y-auto pr-1 custom-scrollbar bg-black/20 p-2 rounded-xl border border-white/5">
                      {AVATARS.map(avatar => (
                        <button key={avatar} onClick={() => setSelectedAvatar(avatar)} className={`aspect-square rounded-lg flex items-center justify-center text-lg transition-all ${selectedAvatar === avatar ? 'bg-indigo-600 scale-105' : 'bg-white/5 opacity-40 hover:opacity-100 hover:scale-105'}`}>{avatar}</button>
                      ))}
                    </div>
                  </div>
                  <div className="max-w-sm mx-auto space-y-3">
                    <input type="text" value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Apelido..." className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-base font-bold text-center outline-none focus:border-indigo-500/50 transition-all" />
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={startRoomConfiguration} disabled={!playerName.trim()} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg transition-all">Criar Sala</button>
                        <button onClick={() => setGameState(GameState.BROWSER)} disabled={!playerName.trim()} className="bg-white/5 hover:bg-white/10 disabled:opacity-30 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/10 transition-all">Buscar Sala</button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="animate-pop space-y-6">
                <div className="text-center space-y-1">
                  <h2 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter">Configurar Nova Sala</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personalize sua arena antes de convidar</p>
                </div>
                <div className="glass-heavy p-6 md:p-8 rounded-[2rem] space-y-5 border-white/10 shadow-2xl max-w-md mx-auto">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Nome da Sala</label>
                    <input type="text" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-indigo-500/40" />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Limite de Jogadores ({newRoomMaxPlayers})</label>
                    <input type="range" min="2" max="10" value={newRoomMaxPlayers} onChange={e => setNewRoomMaxPlayers(parseInt(e.target.value))} className="w-full accent-indigo-500 h-1.5" />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 pl-1">Senha (opcional)</label>
                    <input 
                      type="text" 
                      value={newRoomPassword} 
                      onChange={e => setNewRoomPassword(e.target.value)} 
                      placeholder="Deixe vazio para sala pública"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-amber-500/40 text-center" 
                    />
                  </div>

                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button onClick={() => setIsConfiguringNewRoom(false)} className="bg-white/5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest border border-white/10">Voltar</button>
                    <button onClick={finalizeCreateRoom} className="bg-indigo-600 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg">Criar Sala</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BROWSER DE SALAS */}
        {gameState === GameState.BROWSER && (
          <div className="max-w-4xl mx-auto space-y-6 animate-pop">
            <div className="flex flex-col md:flex-row justify-between items-center gap-3 px-2">
              <div>
                <h2 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter leading-none">Salas Ativas</h2>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-1">Busque pelo nome ou ID</p>
              </div>
              <div className="w-full md:w-64 relative">
                <input 
                  type="text" 
                  value={roomSearch} 
                  onChange={e => setRoomSearch(e.target.value)} 
                  placeholder="Procurar..." 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-9 py-2.5 text-[11px] font-bold outline-none focus:border-indigo-500/50 transition-all"
                />
                <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              </div>
            </div>
            
            {filteredRooms.length === 0 ? (
                <div className="text-center py-12 glass rounded-2xl border-dashed border border-white/10">
                    <span className="text-2xl block mb-2">🔍</span>
                    <p className="text-slate-500 font-black uppercase text-[9px] tracking-widest">Nenhuma sala disponível</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredRooms.map(room => (
                    <div key={room.id} onClick={() => joinRoom(room)} className="glass-heavy p-4 rounded-2xl border-white/10 hover:border-indigo-500/40 cursor-pointer transition-all hover:translate-y-[-2px] group shadow-md">
                    <div className="flex justify-between items-start mb-2">
                        <div className="w-9 h-9 bg-white/5 rounded-lg flex items-center justify-center text-lg group-hover:bg-indigo-600/20 transition-colors">🚀</div>
                        {room.isPrivate && <span className="bg-amber-500/10 text-amber-500 p-1 rounded-md text-[8px]">🔒</span>}
                    </div>
                    <h3 className="font-bold text-sm mb-0.5 truncate">{room.name}</h3>
                    <p className="text-[7px] text-slate-500 font-bold uppercase tracking-widest mb-3">ID: {room.id}</p>
                    <div className="flex justify-between items-center text-[7px] font-black uppercase text-slate-400">
                        <span>{room.currentPlayers}/{room.maxPlayers} Jogadores</span>
                        <span className="text-indigo-400">ENTRAR →</span>
                    </div>
                    </div>
                ))}
                </div>
            )}
          </div>
        )}

        {/* LOBBY */}
        {gameState === GameState.LOBBY && (
          <div className="max-w-4xl mx-auto grid lg:grid-cols-12 gap-5 animate-pop">
            <div className="lg:col-span-4 space-y-4">
              <div className="glass p-4 rounded-2xl border-indigo-500/10 shadow-lg space-y-3">
                <div className="flex justify-between items-start">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-black text-indigo-400 uppercase tracking-tighter truncate leading-tight">{roomConfig?.name}</h2>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">ID: {roomConfig?.id}</p>
                    </div>
                    <button onClick={() => setShowInviteModal(true)} className="bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-emerald-600/20 transition-all shrink-0 text-xs">🔗</button>
                </div>
                {roomConfig?.isPrivate && (
                  <div className="text-[7px] font-black uppercase text-amber-500 flex items-center gap-1">
                    <span>🔒 Protegida por Senha</span>
                  </div>
                )}
                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[9px] font-bold text-slate-500">
                  <span>Jogadores</span>
                  <span className="text-white">{players.length}/{roomConfig?.maxPlayers}</span>
                </div>
              </div>
              
              <div className="space-y-1 overflow-y-auto max-h-[350px] pr-1 custom-scrollbar">
                {players.map(p => <PlayerCard key={p.id} player={p} onRemove={() => setPlayers(prev => prev.filter(x => x.id !== p.id))} onToggleDifficulty={toggleBotDifficulty} />)}
                {players.length < (roomConfig?.maxPlayers || 10) && (
                  <button onClick={addBot} className="w-full border border-dashed border-slate-800 p-3 rounded-xl text-slate-600 font-bold hover:text-indigo-400 hover:border-indigo-500/30 transition-all bg-transparent flex items-center justify-center gap-2 group">
                    <span className="text-base group-hover:rotate-90 transition-transform">+</span>
                    <span className="text-[9px] uppercase tracking-widest">Bot Inteligente</span>
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-8 glass-heavy p-5 md:p-6 rounded-[2rem] space-y-5 flex flex-col shadow-xl border-white/5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-purple-400 uppercase tracking-tight flex items-center gap-2">
                  <span className="w-1 h-5 bg-purple-500 rounded-full"></span>
                  Configurações da Partida
                </h3>
              </div>
              
              <div className="space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center pl-1">
                    <label className="text-[8px] font-black uppercase text-slate-500">Temas ({categories.length}/10)</label>
                  </div>
                  <div className="flex gap-1.5">
                    <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} onKeyDown={e => e.key === 'Enter' && (newCategoryName.trim() && setCategories([...categories, {id: Date.now().toString(), name: newCategoryName}]))} placeholder="Adicionar tema..." className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-indigo-500/40" />
                    <button onClick={() => { if(newCategoryName.trim()){setCategories([...categories, {id: Date.now().toString(), name: newCategoryName}]); setNewCategoryName('')} }} className="bg-indigo-600 px-3 rounded-lg font-black text-[9px] uppercase">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {categories.map(c => (
                      <span key={c.id} className="bg-white/5 border border-white/5 px-2 py-1 rounded-md text-[8px] font-bold uppercase flex items-center gap-1.5">
                        {c.name}
                        {roomConfig?.hostId === 'me' && (
                            <button onClick={() => setCategories(categories.filter(x => x.id !== c.id))} className="text-red-500/50 hover:text-red-500 transition-colors font-black">×</button>
                        )}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase text-slate-500 pl-1">Rodadas</label>
                    <div className="grid grid-cols-4 gap-1">
                      {ROUND_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => setTotalRounds(opt)} className={`py-1.5 rounded-md font-black text-[8px] transition-all ${totalRounds === opt ? 'bg-indigo-600 text-white shadow-md' : 'bg-white/5 text-slate-500 border border-white/5'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  {roomConfig?.hostId === 'me' && (
                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase text-slate-500 pl-1">Privacidade</label>
                      <div className="flex items-center gap-1.5">
                         <button 
                          onClick={() => setRoomConfig(prev => prev ? {...prev, isPrivate: !prev.isPrivate, password: !prev.isPrivate ? prev.password || '123' : ''} : null)}
                          className={`w-full py-1.5 rounded-md font-black text-[8px] uppercase transition-all border ${roomConfig.isPrivate ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/5 text-slate-400 border-white/10'}`}
                        >
                          {roomConfig.isPrivate ? 'Privada 🔒' : 'Pública 🔓'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {roomConfig?.hostId === 'me' && roomConfig.isPrivate && (
                  <div className="animate-pop space-y-1.5">
                    <label className="text-[8px] font-black uppercase text-slate-500 pl-1">Alterar Senha</label>
                    <input 
                      type="text" 
                      value={roomConfig.password || ''} 
                      onChange={e => setRoomConfig(prev => prev ? {...prev, password: e.target.value} : null)}
                      placeholder="Senha..."
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-[10px] font-bold outline-none focus:border-amber-500/40 text-center"
                    />
                  </div>
                )}
              </div>

              <button 
                onClick={startRound} 
                className="w-full bg-indigo-600 hover:bg-indigo-500 py-3.5 rounded-xl font-black text-sm md:text-base uppercase tracking-wider shadow-lg shadow-indigo-600/20 active:scale-95 transition-all relative overflow-hidden group mt-auto"
              >
                <span className="relative z-10">LANÇAR PARTIDA</span>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
              </button>
            </div>
          </div>
        )}

        {/* JOGO EM ANDAMENTO - FIX CORREÇÃO DE LAYOUT */}
        {gameState === GameState.PLAYING && (
          <div className="max-w-3xl mx-auto flex flex-col animate-pop">
            {/* CABEÇALHO DE JOGO REFINADO - SEM SOBREPOSIÇÃO */}
            <div className="glass p-4 md:p-5 rounded-2xl mb-6 border-indigo-500/20 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600/30 border border-indigo-500/50 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-3xl font-black text-indigo-400 animate-pulse-letter">{currentLetter}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em] leading-none mb-1">Tempo Restante</span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black font-mono leading-none ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>{timer}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">s</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleStop} 
                className="bg-red-600 hover:bg-red-500 px-6 py-2.5 rounded-xl font-black text-base md:text-lg uppercase tracking-widest shadow-xl border-b-4 border-red-800 active:translate-y-1 active:border-b-0 transition-all transform hover:scale-[1.02]"
              >
                STOP
              </button>
            </div>

            {/* ÁREA DE INPUTS COM MARGEM ADEQUADA */}
            <div className="grid md:grid-cols-2 gap-3 pb-8">
              {categories.map((cat, i) => (
                <div key={cat.id} className="glass-heavy p-4 rounded-2xl space-y-2 shadow-md border-white/5 group focus-within:border-indigo-500/30 transition-all">
                  <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest group-focus-within:text-white transition-colors">{cat.name}</label>
                  <input 
                    type="text" 
                    value={myAnswers[cat.id] || ''} 
                    onChange={e => setMyAnswers({...myAnswers, [cat.id]: e.target.value})} 
                    placeholder="Digite aqui..." 
                    autoFocus={i === 0} 
                    className="w-full bg-black/40 border border-white/5 rounded-xl px-4 py-3 text-xl font-black uppercase outline-none focus:ring-2 ring-indigo-500/10 text-center transition-all placeholder:text-slate-800 placeholder:text-sm" 
                  />
                </div>
              ))}
            </div>

            {/* GAUGE DE PROGRESSO NO RODAPÉ */}
            <div className="fixed bottom-0 left-0 right-0 h-1.5 bg-slate-900 z-[150] flex">
                <div 
                  className={`h-full transition-all duration-1000 ease-linear ${timer <= 10 ? 'bg-red-500' : 'bg-indigo-500'}`} 
                  style={{ width: `${(timer / 60) * 100}%`, boxShadow: `0 0 10px ${timer <= 10 ? '#ef4444' : '#6366f1'}` }}
                />
            </div>
          </div>
        )}

        {/* LOADING JULGAMENTO */}
        {gameState === GameState.JUDGING && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6 animate-slide-up text-center">
            <div className="relative">
              <div className="w-24 h-24 border-[8px] border-indigo-500/10 border-t-indigo-500 rounded-2xl animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">🧠</div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-indigo-100">Analisando Respostas</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px]">O Gênio está deliberando seu destino...</p>
            </div>
          </div>
        )}

        {/* RESULTADOS */}
        {gameState === GameState.RESULTS && (
          <div className="max-w-4xl mx-auto space-y-8 animate-pop">
            <div className="text-center">
              <h2 className="text-4xl font-black uppercase text-indigo-400 tracking-tighter leading-none mb-2">Placar</h2>
              <p className="text-slate-500 font-black uppercase text-[8px] tracking-[0.3em] bg-white/5 px-3 py-1 rounded-full inline-block">Rodada {currentRound} de {totalRounds}</p>
            </div>
            <div className="grid lg:grid-cols-12 gap-6">
              <div className="lg:col-span-4 space-y-3 sticky top-20">
                <h3 className="text-[10px] font-black uppercase text-purple-400 tracking-widest pl-1">Ranking</h3>
                {[...players].sort((a,b)=>b.totalScore-a.totalScore).map((p,i) => (
                  <div key={p.id} className={`glass p-3 rounded-xl flex items-center gap-3 border-white/5 ${i===0?'border-amber-400/30 bg-amber-400/5 shadow-lg scale-105':'opacity-80'}`}>
                    <div className={`text-xl font-black ${i===0?'text-amber-400':'text-slate-700'}`}>{i+1}º</div>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xl shadow-md shrink-0" style={{backgroundColor: p.color}}>{p.avatar}</div>
                    <div className="flex-1 min-w-0"><div className="font-bold text-xs truncate">{p.name}</div><div className="text-[7px] font-bold text-slate-500 uppercase">{p.totalScore} pts</div></div>
                    <div className={`text-base font-black ${p.roundScore > 0 ? 'text-indigo-400' : 'text-slate-800'}`}>+{p.roundScore}</div>
                  </div>
                ))}
                <button onClick={startRound} className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider shadow-lg transition-all relative overflow-hidden group border-b-4 ${currentRound >= totalRounds ? 'bg-amber-500 border-amber-800' : 'bg-indigo-600 border-indigo-900'}`}>
                  <span className="relative z-10">{currentRound >= totalRounds ? 'REINICIAR' : 'PRÓXIMA'}</span>
                </button>
              </div>
              <div className="lg:col-span-8 space-y-4">
                <h3 className="text-[10px] font-black uppercase text-purple-400 tracking-widest pl-1">Detalhes do Gênio</h3>
                {categories.map(cat => (
                  <div key={cat.id} className="glass-heavy rounded-2xl overflow-hidden border-white/5 shadow-md">
                    <div className="bg-indigo-500/10 px-4 py-2 font-black text-[9px] uppercase text-indigo-400 border-b border-white/5 flex justify-between items-center">
                      <span>{cat.name}</span>
                      <span className="text-[7px] opacity-30">LETRA {currentLetter}</span>
                    </div>
                    <div className="divide-y divide-white/5">
                      {players.map(p => {
                        const res = results.find(r => normalize(r.playerName).includes(normalize(p.name)) && normalize(r.categoryName) === normalize(cat.name));
                        return (
                          <div key={p.id} className="p-4 flex items-center justify-between gap-4 hover:bg-white/[0.01] transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xl shadow-md shrink-0" style={{backgroundColor: p.color}}>{p.avatar}</div>
                              <div className="min-w-0 flex-1">
                                <div className="text-[7px] font-black uppercase text-slate-500 mb-0.5">{p.name}</div>
                                <div className={`text-base font-black uppercase tracking-tight truncate leading-tight ${res?.isValid ? 'text-white' : 'text-slate-800 line-through decoration-red-500/40'}`}>{p.answers[cat.id] || '---'}</div>
                                <p className="mt-1 text-[8px] font-medium italic text-slate-500 line-clamp-2 leading-snug">"{res?.reason || 'Sem análise.'}"</p>
                              </div>
                            </div>
                            <div className={`text-2xl font-black shrink-0 ${res?.isValid ? (res.score === 10 ? 'text-emerald-400' : 'text-amber-400') : 'text-slate-900'}`}>{res?.score || 0}</div>
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

      {/* MODAL SENHA */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowPasswordModal(null)}></div>
          <div className="glass-heavy p-8 rounded-2xl w-full max-w-xs relative animate-pop space-y-5 border-indigo-500/20 shadow-2xl">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-black text-amber-500 uppercase tracking-tighter">Entrada Protegida</h2>
              <p className="text-[8px] font-bold uppercase tracking-widest text-slate-500">A sala {showPasswordModal.room.name} requer senha</p>
            </div>
            <input type="password" value={showPasswordModal.input} onChange={e => setShowPasswordModal({...showPasswordModal, input: e.target.value})} placeholder="Senha..." className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-lg font-black text-center outline-none focus:border-amber-500/40" />
            <button onClick={() => joinRoom(showPasswordModal.room)} className="w-full bg-amber-600 hover:bg-amber-500 py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all">Desbloquear</button>
          </div>
        </div>
      )}

      {/* MODAL CONVITE */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowInviteModal(false)}></div>
          <div className="glass-heavy p-6 rounded-2xl w-full max-w-sm relative animate-pop space-y-6 border-indigo-500/20 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-600/10 text-emerald-400 rounded-xl flex items-center justify-center text-2xl mx-auto mb-2">🔗</div>
              <h2 className="text-2xl font-black text-indigo-400 uppercase tracking-tighter leading-none">Convidar Amigos</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Mande os dados para começarem</p>
            </div>
            <div className="space-y-3 bg-black/40 border border-white/10 p-4 rounded-xl">
                <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-slate-500 uppercase">Nome</span>
                    <span className="text-white">{roomConfig?.name}</span>
                </div>
                <div className="flex justify-between items-center text-[9px] font-bold">
                    <span className="text-slate-500 uppercase">Código de Acesso</span>
                    <span className="text-indigo-400">{roomConfig?.id}</span>
                </div>
                <div className="mt-4">
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/join?room=${roomConfig?.id}`); setCopiedLink(true); setTimeout(()=>setCopiedLink(false), 2000); }} className={`w-full py-3 rounded-lg font-black text-[9px] uppercase transition-all ${copiedLink ? 'bg-emerald-600' : 'bg-indigo-600'}`}>{copiedLink ? 'Copiado!' : 'Copiar Link'}</button>
                </div>
            </div>
            <button onClick={() => setShowInviteModal(false)} className="w-full bg-white/5 py-2.5 rounded-lg font-black uppercase text-[8px] tracking-widest">Fechar</button>
          </div>
        </div>
      )}

      {/* MODAL REGRAS */}
      {showRulesModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" onClick={() => setShowRulesModal(false)}></div>
          <div className="glass-heavy p-8 rounded-[2rem] w-full max-w-md relative animate-pop space-y-6 border-indigo-500/10 shadow-2xl">
            <button onClick={() => setShowRulesModal(false)} className="absolute top-6 right-6 text-slate-500 hover:text-white text-2xl font-black transition-all">×</button>
            <div className="text-center">
              <h2 className="text-3xl font-black text-indigo-400 uppercase tracking-tighter leading-none">Guia Rápido</h2>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-1">Regras do Gênio AI</p>
            </div>
            <div className="space-y-4 text-[10px] md:text-[11px] text-slate-400 leading-relaxed max-h-[35vh] overflow-y-auto pr-3 custom-scrollbar font-medium">
              <div className="space-y-1">
                <h4 className="font-black text-indigo-300 uppercase">01. Objetivo</h4>
                <p>Palavras que começam com a letra sorteada. Seja rápido e criativo.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-purple-300 uppercase">02. Validação IA</h4>
                <p>Nossa IA avalia o contexto brasileiro. Erros de digitação leves podem ser aceitos se o sentido for claro.</p>
              </div>
              <div className="space-y-1">
                <h4 className="font-black text-amber-300 uppercase">03. Pontos</h4>
                <p>10 pontos para respostas únicas, 5 para repetidas e 0 para inválidas.</p>
              </div>
            </div>
            <button onClick={() => setShowRulesModal(false)} className="w-full bg-indigo-600 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">Entendi!</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
