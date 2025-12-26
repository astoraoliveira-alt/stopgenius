
import React, { useState, useEffect, useMemo, useRef } from 'react';
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

// Avatares categorizados e expandidos
const AVATARS = [
  // Personagens/Gente
  '👤', '🧑‍🚀', '🥷', '🧙‍♂️', '🧛', '🧟', '🦸', '👸', '🤴', '🧚', '🕵️', '👷',
  // Animais
  '🐱', '🐶', '🦊', '🦁', '🐯', '🐼', '🐨', '🐸', '🐵', '🦄', '🐙', '🦖',
  // Criaturas/Misc
  '🤖', '👽', '👻', '🤡', '👹', '💀', '🎃', '👾', '🔥', '💎', '🚀', '🌈',
  // Hobbies/Objetos
  '🎮', '🎸', '🎨', '⚽', '🍕', '🍔', '🍦', '🍩', '🛹', '📸', '🎧', '🔭'
];

const BOT_TEMPLATES = [
  { name: 'Bot Inteligente', avatar: '🤖', color: '#8b5cf6' },
  { name: 'Bot Ligeirinho', avatar: '⚡', color: '#f59e0b' },
  { name: 'Bot Criativo', avatar: '🎨', color: '#ec4899' },
  { name: 'Bot Engraçado', avatar: '🤡', color: '#ef4444' }
];

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#94a3b8'];

const ROUND_OPTIONS = [3, 5, 10, 15];

const normalize = (str: string) => 
  str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() : "";

const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// --- COMPONENTES AUXILIARES OTIMIZADOS ---

const PlayerCard: React.FC<{
  player: Player;
  onRemove?: (player: Player) => void;
  onToggleDifficulty?: (id: string) => void;
  isSidebar?: boolean;
}> = ({ player, onRemove, onToggleDifficulty, isSidebar }) => {
  return (
    <div 
      className={`relative group overflow-hidden transition-all duration-500 border-l-4 ${isSidebar ? 'p-3 md:p-4 rounded-2xl md:rounded-[2rem]' : 'p-4 md:p-5 rounded-2xl md:rounded-[2.2rem]'} glass border-white/5 hover:bg-white/[0.07] hover:scale-[1.02] active:scale-[0.98] flex items-center justify-between shadow-xl`}
      style={{ borderLeftColor: player.color, boxShadow: `0 10px 30px -10px ${player.color}30` }}
    >
      <div className="flex items-center gap-3 md:gap-5 min-w-0">
        <div 
          className={`${isSidebar ? 'w-10 h-10 md:w-12 md:h-12 text-lg md:text-2xl' : 'w-12 h-12 md:w-16 md:h-16 text-2xl md:text-4xl'} rounded-xl md:rounded-2xl flex items-center justify-center shadow-2xl transition-transform duration-700 group-hover:rotate-6 shrink-0`} 
          style={{ backgroundColor: player.color, boxShadow: `0 8px 20px -5px ${player.color}60` }}
        >
          {player.avatar}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-0.5 md:mb-1">
            <span className={`${isSidebar ? 'text-xs md:text-sm' : 'text-sm md:text-xl'} font-black tracking-tight truncate`}>
              {player.name}
            </span>
            {player.isHost && (
              <span className="text-[6px] md:text-[8px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.5)]">Host</span>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            {player.isBot ? (
              <button 
                onClick={() => onToggleDifficulty?.(player.id)}
                className={`text-[6px] md:text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border transition-all ${
                  player.difficulty === Difficulty.EASY ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                  player.difficulty === Difficulty.HARD ? 'bg-red-500/10 border-red-500/30 text-red-400' :
                  'bg-purple-500/10 border-purple-500/30 text-purple-400'
                }`}
              >
                {player.difficulty === Difficulty.EASY ? 'Fácil' : player.difficulty === Difficulty.HARD ? 'Gênio' : 'Médio'}
              </button>
            ) : (
              <span className="text-[6px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                {isSidebar ? (player.status === 'typing' ? <span className="flex gap-0.5"><span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce"></span><span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.2s]"></span><span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce [animation-delay:0.4s]"></span></span> : 'Aguardando') : 'Humano'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {!isSidebar && onRemove && (
          <button 
            onClick={() => onRemove(player)}
            className="w-8 h-8 md:w-11 md:h-11 rounded-xl bg-red-500/10 hover:bg-red-500/30 text-red-400 flex items-center justify-center transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
            title="Remover Jogador"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
        <div className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${player.status === 'done' ? 'bg-indigo-500' : 'bg-emerald-500 animate-pulse'} shadow-lg`} style={{ boxShadow: `0 0 10px ${player.status === 'done' ? '#6366f1' : '#10b981'}` }}></div>
      </div>
    </div>
  );
};

const PlayerSkeleton = () => (
  <div className="bg-white/[0.02] border border-white/5 p-4 md:p-5 rounded-2xl md:rounded-[2.2rem] flex items-center justify-between animate-pulse-soft">
    <div className="flex items-center gap-3 md:gap-4">
      <div className="w-10 h-10 md:w-16 md:h-16 bg-white/5 rounded-xl md:rounded-2xl overflow-hidden relative">
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
      </div>
      <div className="space-y-2">
        <div className="w-20 md:w-32 h-3 md:h-5 bg-white/5 rounded"></div>
        <div className="w-12 md:w-20 h-2 bg-white/5 rounded"></div>
      </div>
    </div>
    <div className="w-2 h-2 rounded-full bg-white/10"></div>
  </div>
);

const App: React.FC = () => {
  // Game States
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
  
  // UI States
  const [newCategoryName, setNewCategoryName] = useState('');
  const [roomPasswordInput, setRoomPasswordInput] = useState('');
  const [isCreatingPrivate, setIsCreatingPrivate] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [invitedRoomId, setInvitedRoomId] = useState<string | null>(null);
  
  // Match Configuration
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  
  // Gameplay States
  const [currentLetter, setCurrentLetter] = useState('');
  const [myAnswers, setMyAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [timer, setTimer] = useState(60);
  const [initialTime] = useState(60);
  const [judgingStep, setJudgingStep] = useState(0);
  
  // Config States
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Focus and Scroll Refs
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Check if current user is host
  const isMeHost = useMemo(() => players.find(p => p.id === 'me')?.isHost, [players]);

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio) {
        const keySelected = await (window as any).aistudio.hasSelectedApiKey();
        setHasApiKey(keySelected);
      }
    };
    checkKey();

    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room) {
      setInvitedRoomId(room);
    }
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [gameState]);

  const handleOpenKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasApiKey(true);
    }
  };

  const initRoom = (isHost: boolean, roomId?: string) => {
    if (!playerName.trim()) return;
    setIsProcessing(true);
    
    setTimeout(() => {
      const id = roomId || invitedRoomId || generateRoomId();
      const config: RoomConfig = {
        id,
        name: isHost ? `Sala de ${playerName}` : `Sala ${id}`,
        password: isCreatingPrivate ? roomPasswordInput : undefined,
        isPrivate: isCreatingPrivate || !!roomPasswordInput,
        maxPlayers: 5,
        hostId: isHost ? 'me' : 'other'
      };

      const me: Player = {
        id: 'me',
        name: playerName,
        avatar: selectedAvatar,
        color: selectedColor,
        isBot: false,
        isHost: isHost,
        isReady: true,
        answers: {},
        roundScore: 0,
        totalScore: 0,
        status: 'waiting'
      };

      setRoomConfig(config);
      setPlayers([me]);
      setGameState(GameState.LOBBY);
      setCurrentRound(0);
      setIsProcessing(false);
      setInvitedRoomId(null);
      window.history.replaceState({}, document.title, window.location.pathname);
    }, 800);
  };

  const getInviteUrl = () => {
    if (!roomConfig) return "";
    return `${window.location.origin}${window.location.pathname}?room=${roomConfig.id}`;
  };

  const copyInviteLink = () => {
    const url = getInviteUrl();
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShare = async () => {
    const url = getInviteUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Stop Genius AI',
          text: `Venha jogar Stop comigo! Sala: ${roomConfig?.id}`,
          url: url,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      copyInviteLink();
    }
  };

  const addBot = () => {
    if (players.length >= 5 || isAddingBot) return;
    setIsAddingBot(true);
    setTimeout(() => {
      const template = BOT_TEMPLATES[Math.floor(Math.random() * BOT_TEMPLATES.length)];
      const newBot: Player = { 
        id: `bot-${Date.now()}`, 
        name: `${template.name} #${Math.floor(Math.random() * 100)}`, 
        avatar: template.avatar, 
        color: template.color,
        isBot: true, 
        isHost: false,
        isReady: true, 
        answers: {}, 
        roundScore: 0, 
        totalScore: 0, 
        status: 'waiting',
        difficulty: Difficulty.MEDIUM
      };
      setPlayers(prev => [...prev, newBot]);
      setIsAddingBot(false);
    }, 600);
  };

  const handleRemovePlayer = (player: Player) => {
    if (!isMeHost) return;
    if (player.id === 'me') return;

    if (!player.isBot) {
      const confirmed = window.confirm(`Deseja realmente remover o jogador humano "${player.name}"?`);
      if (!confirmed) return;
    }

    setPlayers(prev => prev.filter(p => p.id !== player.id));
  };

  const updateBotDifficulty = (id: string) => {
    setPlayers(prev => prev.map(p => {
      if (p.id === id && p.isBot) {
        const nextDiff = {
          [Difficulty.EASY]: Difficulty.MEDIUM,
          [Difficulty.MEDIUM]: Difficulty.HARD,
          [Difficulty.HARD]: Difficulty.EASY,
        }[p.difficulty || Difficulty.MEDIUM];
        return { ...p, difficulty: nextDiff };
      }
      return p;
    }));
  };

  const addCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed || categories.length >= 10) return;
    if (categories.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    setCategories([...categories, { id: trimmed.toLowerCase().replace(/\s+/g, '-'), name: trimmed }]);
    setNewCategoryName('');
  };

  const removeCategory = (id: string) => {
    if (categories.length <= 1) return;
    setCategories(categories.filter(c => c.id !== id));
  };

  const startRound = () => {
    if (currentRound >= totalRounds) {
      setPlayers(players.map(p => ({ ...p, totalScore: 0 })));
      setCurrentRound(1);
    } else {
      setCurrentRound(prev => prev + 1);
    }
    
    const alphabet = 'ABCDEFGHIJKLMNOPRSTUV';
    setCurrentLetter(alphabet[Math.floor(Math.random() * alphabet.length)]);
    setMyAnswers({});
    setTimer(60);
    setErrorMsg(null);
    setGameState(GameState.PLAYING);
    // Simula bots começando a digitar em tempos diferentes
    setPlayers(prev => prev.map(p => ({ 
      ...p, 
      status: p.id === 'me' ? 'typing' : 'waiting', 
      answers: {}, 
      roundScore: 0 
    })));

    // Simulação visual de bots digitando
    players.forEach(p => {
      if (p.isBot) {
        setTimeout(() => {
          setPlayers(current => current.map(cp => cp.id === p.id ? {...cp, status: 'typing'} : cp));
        }, 1000 + Math.random() * 5000);
      }
    });
  };

  const handleStop = async () => {
    if (gameState === GameState.JUDGING || gameState === GameState.RESULTS) return;
    setGameState(GameState.JUDGING);
    setJudgingStep(0);

    const stepsInterval = setInterval(() => {
      setJudgingStep(s => (s < 3 ? s + 1 : s));
    }, 1500);

    const bots = players.filter(p => p.isBot);
    const human = players.find(p => p.id === 'me')!;
    
    const humanAnswersWithNames: Record<string, string> = {};
    categories.forEach(cat => { 
      humanAnswersWithNames[cat.name] = myAnswers[cat.id] || ""; 
    });

    try {
      const data = await processMultiplayerRound(currentLetter, categories, human, humanAnswersWithNames, bots);
      
      if (data && data.judgments) {
        clearInterval(stepsInterval);
        setJudgingStep(4);
        
        setTimeout(() => {
          setResults(data.judgments);
          const updatedPlayers = players.map(p => {
            const playerJudgments = data.judgments.filter((j: any) => 
              normalize(j.playerName) === normalize(p.name) || (p.id === 'me' && normalize(j.playerName).includes(normalize(p.name)))
            );
            
            const roundScore = playerJudgments.reduce((acc: number, curr: any) => acc + (Number(curr.score) || 0), 0);
            
            let finalAnswersMap: Record<string, string> = {};
            if (p.id === 'me') {
              finalAnswersMap = { ...myAnswers };
            } else {
              const botData = data.botAnswers.find((ba: any) => normalize(ba.botName) === normalize(p.name));
              if (botData) {
                categories.forEach(cat => {
                  const response = botData.responses.find((r: any) => normalize(r.category) === normalize(cat.name));
                  if (response) finalAnswersMap[cat.id] = response.answer;
                });
              }
            }
            return { ...p, answers: finalAnswersMap, roundScore, totalScore: p.totalScore + roundScore, status: 'done' as const };
          });
          
          setPlayers(updatedPlayers);
          if (updatedPlayers.find(p => p.id === 'me')?.roundScore! > 0) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
          setGameState(GameState.RESULTS);
        }, 800);
      }
    } catch (error: any) {
      clearInterval(stepsInterval);
      setErrorMsg(`Falha na validação: ${error.message || "Tente novamente!"}`);
      setGameState(GameState.RESULTS);
    }
  };

  useEffect(() => {
    let interval: any;
    if (gameState === GameState.PLAYING && timer > 0) {
      interval = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { clearInterval(interval); handleStop(); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState, timer]);

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-indigo-500/30 overflow-x-hidden" ref={mainContentRef}>
      {/* GAUGE DE TEMPO NO RODAPÉ */}
      {gameState === GameState.PLAYING && (
        <div className="fixed bottom-0 left-0 w-full h-1.5 md:h-3 z-[200] bg-white/5 overflow-hidden">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${timer <= 10 ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.4)]'}`}
            style={{ width: `${(timer / initialTime) * 100}%` }}
          ></div>
        </div>
      )}

      <nav className="glass sticky top-0 z-[110] px-4 md:px-8 py-3 md:py-5 flex justify-between items-center border-b border-white/5 shadow-xl">
        <div className="flex items-center gap-2 md:gap-4 cursor-pointer group" onClick={() => gameState !== GameState.PLAYING && setGameState(GameState.START)}>
          <div className="w-9 h-9 md:w-11 md:h-11 bg-indigo-600 rounded-xl md:rounded-2xl flex items-center justify-center font-black text-lg md:text-xl shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform duration-500">S</div>
          <div>
            <h1 className="font-black text-sm md:text-xl uppercase tracking-tight leading-none group-hover:text-indigo-400 transition-colors">Stop <span className="text-indigo-400 group-hover:text-white transition-colors">Genius AI</span></h1>
            <p className="text-[7px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-0.5 md:mt-1">Multiplayer Evolution</p>
          </div>
        </div>
        
        {roomConfig && (
          <div className="hidden sm:flex items-center gap-2 md:gap-3 bg-white/5 px-3 md:px-4 py-1.5 md:py-2 rounded-xl md:rounded-2xl border border-white/10 hover:border-indigo-500/30 transition-all duration-300">
            <span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase">Sala:</span>
            <span className="text-xs md:text-sm font-black text-indigo-400 tracking-widest">{roomConfig.id}</span>
          </div>
        )}

        <div className="flex items-center gap-3 md:gap-6">
           <button 
             onClick={() => setShowRulesModal(true)} 
             className="hidden md:flex items-center gap-2 text-slate-400 hover:text-white transition-colors group"
           >
             <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
             <span className="text-[10px] font-black uppercase tracking-widest">Regras</span>
           </button>
           
           {!hasApiKey && <div className="animate-pulse bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black uppercase">Offline</div>}
           <div className="text-right">
             <span className="text-[7px] md:text-[9px] font-black uppercase text-slate-500 block">Pontos</span>
             <span className="text-lg md:text-xl font-black text-indigo-400">{players.find(p => p.id === 'me')?.totalScore || 0}</span>
           </div>
        </div>
      </nav>

      <main className="pb-10 md:pb-20">
        {/* TELA DE INÍCIO */}
        {gameState === GameState.START && (
          <div className="max-w-4xl mx-auto py-8 md:py-12 px-4 md:px-6 flex flex-col gap-6 md:gap-8 animate-slide-up">
            <div className="text-center space-y-2 md:space-y-4">
              <h1 className="text-4xl md:text-6xl font-black bg-gradient-to-br from-indigo-300 to-indigo-600 bg-clip-text text-transparent uppercase tracking-tighter drop-shadow-2xl">
                {invitedRoomId ? "Bem-vindo!" : "Novo Herói"}
              </h1>
              <p className="text-slate-400 text-sm md:text-base">
                {invitedRoomId ? `Entre na sala ${invitedRoomId} para jogar.` : "Personalize sua identidade para o jogo."}
              </p>
            </div>

            <div className="glass-heavy p-6 md:p-10 rounded-3xl md:rounded-[3.5rem] space-y-8 md:space-y-12 shadow-2xl relative overflow-hidden border-white/15">
               {!hasApiKey ? (
                 <button onClick={handleOpenKey} className="w-full bg-red-600 hover:bg-red-500 py-4 md:py-6 rounded-xl md:rounded-2xl font-black uppercase tracking-widest transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-xl shadow-red-500/10 text-sm md:text-base">Configurar Chave API</button>
               ) : (
                 <div className="space-y-8 md:space-y-12">
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-center lg:items-start">
                      {/* PREVIEW DO AVATAR SELECIONADO */}
                      <div className="shrink-0 flex flex-col items-center gap-4">
                        <div 
                          className="w-32 h-32 md:w-44 md:h-44 rounded-[2.5rem] md:rounded-[3.5rem] flex items-center justify-center text-6xl md:text-8xl shadow-2xl transition-all duration-500 hover:rotate-3 relative group" 
                          style={{ 
                            backgroundColor: selectedColor, 
                            boxShadow: `0 25px 60px -15px ${selectedColor}90` 
                          }}
                        >
                          {selectedAvatar}
                          <div className="absolute inset-0 rounded-[inherit] border-4 border-white/20 group-hover:border-white/40 transition-colors"></div>
                        </div>
                        <div className="flex flex-wrap justify-center gap-2">
                          {AVATAR_COLORS.map(color => (
                            <button 
                              key={color} 
                              onClick={() => setSelectedColor(color)}
                              className={`w-8 h-8 md:w-10 md:h-10 rounded-full transition-all duration-300 border-2 ${selectedColor === color ? 'scale-110 ring-2 ring-white ring-offset-4 ring-offset-[#020617] border-transparent' : 'border-white/10 opacity-60 hover:opacity-100'}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>

                      {/* GRID DE AVATARES */}
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Escolha seu avatar</h3>
                          <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">{AVATARS.length} OPÇÕES</span>
                        </div>
                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-6 lg:grid-cols-6 gap-2 h-[200px] lg:h-[300px] overflow-y-auto pr-2 custom-scrollbar p-1">
                          {AVATARS.map(avatar => (
                            <button 
                              key={avatar} 
                              onClick={() => setSelectedAvatar(avatar)}
                              className={`aspect-square rounded-xl md:rounded-2xl flex items-center justify-center text-xl md:text-2xl transition-all duration-300 transform ${selectedAvatar === avatar ? 'bg-white/20 scale-100 ring-2 ring-indigo-500/80' : 'bg-white/5 opacity-40 hover:opacity-100 hover:scale-110 hover:bg-white/10'}`}
                            >
                              {avatar}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <input 
                        type="text" 
                        value={playerName} 
                        onChange={(e) => setPlayerName(e.target.value)} 
                        placeholder="Como quer ser chamado?" 
                        className="w-full bg-slate-900 border border-white/10 rounded-2xl md:rounded-3xl px-6 md:px-8 py-5 md:py-6 text-lg md:text-2xl font-black outline-none focus:border-indigo-500/50 text-center transition-all duration-300 focus:ring-4 focus:ring-indigo-500/5 placeholder:text-slate-700"
                      />
                      
                      <div className="flex flex-col gap-4">
                        {invitedRoomId ? (
                          <button 
                            disabled={!playerName.trim()} 
                            onClick={() => initRoom(false)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 py-5 md:py-8 rounded-2xl md:rounded-3xl font-black uppercase tracking-widest shadow-2xl transition-all duration-300 hover:scale-[1.02] active:scale-95 shadow-indigo-500/20 text-sm md:text-lg"
                          >
                            ENTRAR NA SALA
                          </button>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <button 
                              disabled={!playerName.trim()} 
                              onClick={() => initRoom(true)}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 py-5 md:py-8 rounded-2xl md:rounded-3xl font-black uppercase tracking-tight shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-95 text-xs md:text-lg"
                            >
                              Criar Sala
                            </button>
                            <button 
                              disabled={!playerName.trim()} 
                              onClick={() => initRoom(false)}
                              className="bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 py-5 md:py-8 rounded-2xl md:rounded-3xl font-black uppercase tracking-tight transition-all duration-300 hover:scale-[1.02] active:scale-95 text-xs md:text-lg"
                            >
                              Entrar Manual
                            </button>
                          </div>
                        )}
                        
                        <button 
                          onClick={() => setShowRulesModal(true)}
                          className="w-full bg-white/5 hover:bg-white/10 text-slate-400 py-3 rounded-xl font-bold uppercase text-[10px] tracking-widest border border-white/5 transition-all"
                        >
                          Como Jogar?
                        </button>
                      </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* LOBBY */}
        {gameState === GameState.LOBBY && roomConfig && (
          <div className="max-w-6xl mx-auto py-6 md:py-12 px-4 md:px-6 grid lg:grid-cols-2 gap-8 md:gap-12 animate-pop">
            <div className="space-y-6 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 md:gap-6">
                <div className="space-y-1 md:space-y-2">
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-indigo-400">Sala</h2>
                  <p className="text-slate-500 font-bold uppercase text-[8px] md:text-[10px] tracking-widest pl-1">Configure o jogo</p>
                </div>
                <button 
                  onClick={() => setShowInviteModal(true)} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 md:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-2 md:gap-3 group hover:scale-[1.02] active:scale-95"
                >
                  <svg className="w-4 h-4 md:w-5 md:h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  Convidar
                </button>
              </div>

              <div className="space-y-6 md:space-y-10">
                <div className="space-y-3 md:space-y-4">
                  <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Equipe ({players.length}/5)</h3>
                  <div className="space-y-3 md:space-y-4">
                    {players.map((p, i) => (
                      <PlayerCard 
                        key={p.id} 
                        player={p} 
                        onRemove={isMeHost && p.id !== 'me' ? handleRemovePlayer : undefined} 
                        onToggleDifficulty={isMeHost && p.isBot ? updateBotDifficulty : undefined}
                      />
                    ))}
                    {isAddingBot && <PlayerSkeleton />}
                    {players.length < 5 && (
                      <button onClick={addBot} className="w-full border-2 border-dashed border-slate-800 p-6 md:p-8 rounded-2xl md:rounded-[2.2rem] text-slate-600 hover:text-indigo-400 hover:border-indigo-500/30 transition-all duration-500 font-black uppercase text-[10px] md:text-xs flex flex-col items-center gap-1 md:gap-2 group hover:bg-white/[0.01]">
                        <span className="text-xl md:text-2xl group-hover:scale-125 transition-transform duration-300">+</span>
                        <span>Adicionar Bot</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* SELETOR DE RODADAS */}
                <div className="space-y-4">
                  <h3 className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 pl-4">Duração da Partida</h3>
                  <div className="grid grid-cols-4 gap-2 md:gap-4">
                    {ROUND_OPTIONS.map(opt => (
                      <button 
                        key={opt}
                        onClick={() => setTotalRounds(opt)}
                        className={`py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-xs md:text-base transition-all duration-300 ${totalRounds === opt ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 ring-2 ring-indigo-400' : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300 border border-white/5'}`}
                      >
                        {opt} <span className="block text-[7px] md:text-[9px] opacity-60 uppercase font-black">Rodadas</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-heavy p-6 md:p-10 rounded-3xl md:rounded-[4rem] border-white/20 space-y-6 md:space-y-8 flex flex-col shadow-2xl">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <h3 className="text-xl md:text-3xl font-black uppercase tracking-tighter text-purple-400">Categorias</h3>
                  <p className="text-[7px] md:text-[9px] font-bold text-slate-500 uppercase tracking-widest">Temas do jogo</p>
                </div>
                <div className="bg-purple-500/10 text-purple-400 px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[10px] font-black border border-purple-500/20">
                  {categories.length}/10
                </div>
              </div>
              
              <div className="space-y-4 md:space-y-6 flex-1">
                <div className="flex gap-2 md:gap-4 p-1.5 md:p-2 bg-black/20 rounded-xl md:rounded-[2rem] border border-white/5 focus-within:border-indigo-500/30 transition-all duration-300">
                  <input 
                    type="text" 
                    value={newCategoryName} 
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                    placeholder="Ex: Carros..."
                    className="flex-1 bg-transparent px-4 md:px-6 py-2 md:py-3 text-sm font-bold outline-none placeholder:text-slate-700 transition-all"
                  />
                  <button onClick={addCategory} className="bg-indigo-600 hover:bg-indigo-500 px-4 md:px-8 rounded-lg md:rounded-[1.5rem] font-black text-[10px] md:text-xs uppercase tracking-widest transition-all duration-300">ADD</button>
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-[200px] md:max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                  {categories.map(cat => (
                    <div key={cat.id} className="group glass-heavy bg-white/[0.04] pl-4 md:pl-5 pr-2 md:pr-3 py-2 md:py-3 rounded-xl md:rounded-2xl flex items-center gap-3 md:gap-4 border-white/10 transition-all duration-300 hover:translate-y-[-2px]">
                      <span className="text-[10px] md:text-xs font-black uppercase text-slate-200 tracking-tight">{cat.name}</span>
                      <button 
                        onClick={() => removeCategory(cat.id)} 
                        className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-lg bg-red-500/10 text-red-500 opacity-60 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 hover:bg-red-500 hover:text-white"
                      >
                        <svg className="w-2.5 h-2.5 md:w-3 md:h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-6 md:pt-8 border-t border-white/10">
                <button 
                  onClick={startRound} 
                  className="w-full bg-indigo-600 hover:bg-indigo-500 py-5 md:py-7 rounded-2xl md:rounded-[2.5rem] font-black text-xl md:text-3xl uppercase tracking-tighter shadow-2xl transition-all duration-500 hover:scale-[1.02] active:scale-95 relative overflow-hidden group"
                >
                  <span className="relative z-10">INICIAR PARTIDA</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* JOGO */}
        {gameState === GameState.PLAYING && (
          <div className="max-w-6xl mx-auto py-2 px-4 grid lg:grid-cols-12 gap-4 md:gap-8 animate-pop">
            <div className="lg:col-span-8 space-y-4 md:space-y-10">
              <div className="sticky top-[58px] md:top-[85px] z-[100] py-2 md:py-4 bg-[#020617]/95 backdrop-blur-xl border-b border-indigo-500/20 shadow-2xl -mx-4 px-4 transition-all duration-300">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-2 md:gap-8">
                  <div className="flex items-center gap-3 md:gap-8">
                    <div className="flex flex-col items-center">
                      <span className="text-[6px] md:text-[10px] uppercase text-slate-500 font-black tracking-widest mb-0.5 md:mb-1">Letra</span>
                      <div className="w-10 h-10 md:w-20 md:h-20 bg-indigo-600/20 rounded-xl md:rounded-2xl border border-indigo-500/40 flex items-center justify-center shadow-inner">
                        <span className="text-xl md:text-5xl font-black text-indigo-400 drop-shadow-glow animate-pulse-letter">{currentLetter}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="text-[6px] md:text-[10px] uppercase text-slate-500 font-black tracking-widest mb-0.5 md:mb-1">Rodada {currentRound}/{totalRounds}</span>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl md:text-7xl font-black font-mono tabular-nums leading-none ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                          {timer}
                        </span>
                        <span className="text-[10px] md:text-2xl font-black text-slate-600 uppercase">seg</span>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={handleStop} 
                    className="bg-red-600 hover:bg-red-500 px-5 md:px-16 py-3 md:py-7 rounded-xl md:rounded-[2.5rem] font-black text-xs md:text-3xl uppercase tracking-widest shadow-xl transition-all duration-300 active:scale-95 shadow-red-600/30 border-b-2 md:border-b-4 border-red-800"
                  >
                    STOP
                  </button>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3 md:gap-8 pt-2 md:pt-4">
                {categories.map((cat, i) => (
                  <div key={cat.id} className="glass-heavy p-4 md:p-10 rounded-2xl md:rounded-[3.5rem] flex flex-col gap-2 md:gap-6 border-white/10 animate-slide-up hover:border-indigo-500/40 transition-all duration-500 group shadow-lg" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] md:text-sm font-black uppercase text-indigo-400/70 tracking-[0.2em] pl-1">{cat.name}</label>
                      <div className="w-1.5 h-1.5 rounded-full bg-white/5 group-focus-within:bg-indigo-500 transition-colors"></div>
                    </div>
                    <input 
                      type="text" 
                      value={myAnswers[cat.id] || ''} 
                      onChange={(e) => setMyAnswers({...myAnswers, [cat.id]: e.target.value})}
                      placeholder="..."
                      autoFocus={i === 0}
                      className="bg-black/40 border border-white/5 rounded-xl md:rounded-3xl px-4 md:px-10 py-3 md:py-8 text-xl md:text-4xl font-black uppercase outline-none focus:ring-4 ring-indigo-500/20 transition-all duration-300 text-white placeholder:opacity-10 text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 space-y-4 md:space-y-6 hidden lg:block">
               <div className="sticky top-[180px]">
                 <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6 px-6">Status dos Jogadores</h3>
                 <div className="space-y-4">
                   {players.map(p => (
                     <PlayerCard 
                        key={p.id} 
                        player={p} 
                        isSidebar 
                     />
                   ))}
                 </div>
               </div>
            </div>
          </div>
        )}

        {/* JULGAMENTO */}
        {gameState === GameState.JUDGING && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] md:min-h-[75vh] gap-8 md:gap-12 animate-slide-up px-4">
            <div className="relative scale-75 md:scale-100">
              <div className="w-40 h-40 md:w-48 md:h-48 border-[16px] md:border-[20px] border-indigo-500/10 rounded-[3rem] md:rounded-[4rem]"></div>
              <div className="absolute inset-0 w-40 h-40 md:w-48 md:h-48 border-[16px] md:border-[20px] border-t-indigo-500 rounded-[3rem] md:rounded-[4rem] animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-6xl md:text-7xl animate-float">🧠</div>
            </div>
            <div className="text-center space-y-2 md:space-y-4">
              <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-indigo-100">O Gênio está validando</h2>
              <p className="text-slate-500 text-[10px] md:text-sm font-black uppercase tracking-widest px-4">Analisando gramática, semântica e contexto brasileiro...</p>
            </div>
          </div>
        )}

        {/* RESULTADOS */}
        {gameState === GameState.RESULTS && (
           <div className="max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6 grid lg:grid-cols-12 gap-10 md:gap-16 animate-pop">
              <div className="lg:col-span-4 space-y-6 md:space-y-10">
                 <div className="text-center md:text-left">
                   <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-indigo-400 leading-none">Placar</h2>
                   <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mt-2">Rodada {currentRound} de {totalRounds}</p>
                 </div>
                 
                 <div className="space-y-4 md:space-y-6">
                   {[...players].sort((a,b) => b.totalScore - a.totalScore).map((p, idx) => (
                     <div key={p.id} className={`glass p-5 md:p-8 rounded-3xl md:rounded-[3.5rem] flex items-center gap-4 md:gap-8 border-white/10 transition-all duration-500 ${idx === 0 ? 'winner-glow scale-[1.05] z-10' : ''}`}>
                       <div className="flex flex-col items-center shrink-0">
                        <span className={`text-xl md:text-4xl font-black ${idx === 0 ? 'text-amber-400' : 'text-slate-700'}`}>{idx+1}º</span>
                        {idx === 0 && <span className="text-xl animate-float">👑</span>}
                       </div>
                       <div className="w-14 h-14 md:w-20 md:h-20 rounded-2xl md:rounded-[2rem] flex items-center justify-center text-3xl md:text-5xl shadow-2xl shrink-0" style={{ backgroundColor: p.color }}>
                         {p.avatar}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="font-black text-lg md:text-2xl tracking-tighter truncate leading-none mb-1">{p.name}</div>
                          <div className="text-[9px] md:text-[11px] text-slate-500 font-black uppercase tracking-widest">Total: {p.totalScore} pts</div>
                       </div>
                       <div className={`text-2xl md:text-4xl font-black shrink-0 ${p.roundScore > 0 ? 'text-indigo-400' : 'text-slate-700'}`}>+{p.roundScore}</div>
                     </div>
                   ))}
                 </div>
                 
                 <div className="space-y-4 pt-4">
                   <button onClick={startRound} className={`w-full py-6 md:py-10 rounded-3xl md:rounded-[4rem] font-black text-xl md:text-3xl uppercase tracking-tighter shadow-2xl transition-all group relative overflow-hidden active:scale-95 border-b-8 ${currentRound >= totalRounds ? 'bg-amber-500 hover:bg-amber-400 border-amber-700' : 'bg-indigo-600 hover:bg-indigo-500 border-indigo-800'}`}>
                     <span className="relative z-10">
                       {currentRound >= totalRounds ? 'NOVO JOGO' : 'PRÓXIMA RODADA'}
                     </span>
                     <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
                   </button>
                   
                   {currentRound >= totalRounds && (
                     <button 
                        onClick={() => setGameState(GameState.LOBBY)}
                        className="w-full bg-white/5 hover:bg-white/10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border border-white/10"
                      >
                        Voltar para o Lobby
                      </button>
                   )}
                 </div>
              </div>

              <div className="lg:col-span-8 space-y-6 md:space-y-10">
                 <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-purple-400 text-center md:text-left">Análise do Gênio</h2>
                 <div className="space-y-8 md:space-y-12">
                    {categories.map(cat => (
                      <div key={cat.id} className="glass-heavy rounded-[3rem] md:rounded-[5rem] overflow-hidden border-white/15 shadow-2xl">
                        <div className="bg-indigo-500/10 px-8 md:px-16 py-5 md:py-8 font-black uppercase text-xs md:text-sm tracking-[0.3em] text-indigo-400 border-b border-white/10 flex justify-between items-center">
                          <span>Categoria: {cat.name}</span>
                          <span className="text-indigo-400/40 text-[10px]">Letra: {currentLetter}</span>
                        </div>
                        <div className="divide-y divide-white/5">
                           {players.map(p => {
                             const res = results.find(r => 
                               (normalize(r.playerName) === normalize(p.name) || (p.id === 'me' && normalize(r.playerName).includes(normalize(p.name)))) && 
                               normalize(r.categoryName) === normalize(cat.name)
                             );
                             
                             return (
                               <div key={p.id} className="px-8 md:px-16 py-8 md:py-12 flex items-start justify-between hover:bg-white/[0.02] transition-colors gap-4">
                                  <div className="flex-1 flex items-start gap-6 md:gap-10 min-w-0">
                                    <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl md:rounded-3xl flex items-center justify-center text-xl md:text-4xl shadow-2xl shrink-0 mt-1" style={{ backgroundColor: p.color }}>
                                      {p.avatar}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="text-[8px] md:text-[11px] font-black uppercase text-slate-500 mb-2 tracking-widest truncate">{p.name}</div>
                                      <div className={`text-2xl md:text-5xl font-black tracking-tighter truncate leading-tight mb-4 ${res?.isValid ? 'text-white' : 'text-slate-800 line-through italic decoration-red-600/50'}`}>
                                        {p.answers[cat.id] || '---'}
                                      </div>
                                      
                                      <div className={`px-4 md:px-8 py-3 md:py-5 rounded-2xl md:rounded-[2rem] border-2 flex items-start gap-3 md:gap-5 shadow-inner ${res?.isValid ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                                        <div className={`shrink-0 w-2.5 h-2.5 md:w-3 md:h-3 rounded-full mt-1.5 md:mt-2 shadow-glow ${res?.isValid ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                                        <div className="space-y-1">
                                          <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest opacity-50 block">Análise do Gênio</span>
                                          <p className="text-[10px] md:text-[14px] font-bold italic leading-snug">
                                            {res?.reason || (res?.isValid ? "Resposta aceita e validada." : "Infelizmente, a resposta não cumpre os requisitos.")}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`text-3xl md:text-7xl font-black ml-4 shrink-0 leading-none self-center ${res?.isValid ? (res.score === 10 ? 'text-emerald-400 drop-shadow-glow' : 'text-amber-400') : 'text-slate-900'}`}>
                                    {res?.isValid ? `+${res.score}` : '0'}
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

        {/* MODAL DE CONVITE */}
        {showInviteModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 md:p-6">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setShowInviteModal(false)}></div>
            <div className="glass-heavy p-8 md:p-14 rounded-3xl md:rounded-[4.5rem] w-full max-w-xl relative animate-pop border-indigo-500/40 flex flex-col items-center gap-6 md:gap-10 shadow-2xl shadow-black">
              <button 
                onClick={() => setShowInviteModal(false)}
                className="absolute top-6 md:top-10 right-6 md:right-10 text-slate-500 hover:text-white transition-all"
              >
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="text-center space-y-2 md:space-y-4">
                <div className="w-16 h-16 md:w-24 md:h-24 bg-indigo-600 rounded-2xl md:rounded-[3rem] mx-auto flex items-center justify-center text-3xl md:text-5xl shadow-2xl animate-float">🔗</div>
                <h3 className="text-2xl md:text-4xl font-black uppercase tracking-tighter text-indigo-100">Convide a Equipe</h3>
                <p className="text-slate-500 text-xs md:text-sm max-w-xs mx-auto">Mande o link para começar o desafio!</p>
              </div>

              <div className="w-full space-y-6 md:space-y-8">
                <div className="bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl md:rounded-[2rem] flex items-center gap-3 md:gap-4 group focus-within:border-indigo-500/50 transition-all">
                  <div className="flex-1 truncate text-[10px] md:text-xs font-bold text-slate-400 select-all pl-2">
                    {getInviteUrl()}
                  </div>
                  <button 
                    onClick={copyInviteLink}
                    className={`px-4 md:px-6 py-2 md:py-3 rounded-xl md:rounded-[1.5rem] text-[9px] md:text-[10px] font-black uppercase transition-all shadow-lg ${copiedLink ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                  >
                    {copiedLink ? 'COPIADO' : 'COPIAR'}
                  </button>
                </div>

                <button 
                  onClick={handleShare}
                  className="w-full bg-white/5 hover:bg-white/10 py-4 md:py-6 rounded-2xl md:rounded-[2.5rem] font-black text-xs md:text-sm uppercase tracking-widest transition-all border border-white/10 flex items-center justify-center gap-3 group"
                >
                  <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  Compartilhar Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE REGRAS */}
        {showRulesModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 md:p-6 overflow-y-auto">
            <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl" onClick={() => setShowRulesModal(false)}></div>
            <div className="glass-heavy p-8 md:p-12 rounded-[2.5rem] md:rounded-[4rem] w-full max-w-2xl relative animate-pop border-white/10 shadow-2xl my-auto">
              <button 
                onClick={() => setShowRulesModal(false)}
                className="absolute top-8 right-8 text-slate-500 hover:text-white transition-all"
              >
                <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>

              <div className="text-center mb-8 md:mb-10">
                <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter text-indigo-400">Manual do Jogador</h2>
                <p className="text-slate-500 font-black uppercase tracking-widest text-[10px] mt-2">Como vencer o Gênio AI</p>
              </div>

              <div className="space-y-6 md:space-y-8 text-slate-300">
                <section className="space-y-3">
                  <div className="flex items-center gap-3 text-indigo-400">
                    <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center text-xs">01</div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Objetivo</h3>
                  </div>
                  <p className="text-sm leading-relaxed pl-9">
                    O Stop Genius AI é uma evolução do clássico "Adedonha". Seu objetivo é preencher todas as categorias com palavras que comecem com a letra sorteada antes que o tempo acabe ou que alguém aperte o botão <span className="text-red-500 font-black">STOP</span>.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-3 text-purple-400">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-lg flex items-center justify-center text-xs">02</div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Sistema de Pontos</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pl-9">
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="text-2xl font-black text-emerald-400 mb-1">+10</div>
                      <div className="text-[9px] font-black uppercase text-slate-500">Único</div>
                      <p className="text-[10px] mt-2 opacity-70">Sua resposta é válida e ninguém mais escreveu igual.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="text-2xl font-black text-amber-400 mb-1">+5</div>
                      <div className="text-[9px] font-black uppercase text-slate-500">Repetido</div>
                      <p className="text-[10px] mt-2 opacity-70">Sua resposta é válida, mas outro jogador (ou bot) escreveu a mesma.</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                      <div className="text-2xl font-black text-red-500 mb-1">0</div>
                      <div className="text-[9px] font-black uppercase text-slate-500">Inválido</div>
                      <p className="text-[10px] mt-2 opacity-70">A palavra não existe, não começa com a letra ou não pertence ao tema.</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-3 text-indigo-400">
                    <div className="w-6 h-6 bg-indigo-500/20 rounded-lg flex items-center justify-center text-xs">03</div>
                    <h3 className="font-black uppercase tracking-widest text-xs">O Gênio Julgador</h3>
                  </div>
                  <p className="text-sm leading-relaxed pl-9">
                    Diferente de outros jogos, aqui a validação é feita por uma <span className="text-white font-bold">Inteligência Artificial de ponta</span>. O Gênio entende o contexto brasileiro e gírias, sendo justo com palavras como "Jabuti" ou "Jaca". Cada resposta vem com uma <span className="italic text-indigo-300">justificativa detalhada</span> para você entender a análise.
                  </p>
                </section>

                <section className="space-y-3">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center text-xs">04</div>
                    <h3 className="font-black uppercase tracking-widest text-xs">Dica Pro</h3>
                  </div>
                  <p className="text-sm leading-relaxed pl-9 bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                    Fique de olho na <span className="text-white font-bold">barra de tempo no rodapé</span>. Ela muda para vermelho quando faltarem 10 segundos. Se o tempo acabar, suas respostas serão enviadas automaticamente!
                  </p>
                </section>
              </div>

              <button 
                onClick={() => setShowRulesModal(false)}
                className="w-full mt-10 bg-indigo-600 hover:bg-indigo-500 py-4 md:py-6 rounded-2xl md:rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl transition-all active:scale-95"
              >
                Entendido!
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
