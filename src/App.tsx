import { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  doc,
  query,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import {
  Heart,
  Book,
  Dumbbell,
  Clock,
  Award,
  Calendar,
  Trash2,
  CheckCircle,
  Users,
  Lock,
  Unlock,
} from 'lucide-react';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyCX4myq_aSMqQ19Ae59qcBbvUTF6a7dx6E',
  authDomain: 'our-adventure-log.firebaseapp.com',
  projectId: 'our-adventure-log',
  storageBucket: 'our-adventure-log.firebasestorage.app',
  messagingSenderId: '539205598720',
  appId: '1:539205598720:web:090d8c3955f45cbf1aa2e5',
  measurementId: 'G-ZS0X2XSY2Y',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════════════════════════════════════════════════════════
// FIRESTORE SCHEMA (Extended from existing)
// ═══════════════════════════════════════════════════════════
// checkins: { userId, text, timestamp, date, hasActions }
// actions: { userId, date, type, points, timestamp, description }
// readings: { addedBy, title, url, completed, timestamp }
// achievements: { user, type, value, timestamp, date } [LEGACY - kept for compatibility]

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════
type Player = 'player1' | 'player2';
type GameMode = 'singleplayer' | 'multiplayer' | 'pvp' | null;

interface CheckIn {
  id: string;
  userId: Player;
  text: string;
  timestamp: number;
  date: string;
  hasActions?: boolean;
}

interface Action {
  id: string;
  userId: Player;
  date: string;
  type: string;
  points: number;
  timestamp: number;
  description: string;
}

interface Reading {
  id: string;
  addedBy: Player;
  title: string;
  url: string;
  completed: boolean;
  timestamp: number;
}

const MinecraftGoalsApp = () => {
  // ═══════════════════════════════════════════════════════════
  // STEP 1: USER IDENTITY STATE
  // ═══════════════════════════════════════════════════════════
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerSelected, setPlayerSelected] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // EXISTING STATE (preserved)
  // ═══════════════════════════════════════════════════════════
  const [activeTab, setActiveTab] = useState('checkin');
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>(null);

  // ═══════════════════════════════════════════════════════════
  // STEP 3: ACTION SYSTEM STATE
  // ═══════════════════════════════════════════════════════════
  const [actions, setActions] = useState<Action[]>([]);
  const [selectedActionType, setSelectedActionType] = useState('workout');
  const [actionDescription, setActionDescription] = useState('');

  // ═══════════════════════════════════════════════════════════
  // STEP 2: CHECK-IN STATE
  // ═══════════════════════════════════════════════════════════
  const [checkinText, setCheckinText] = useState('');
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  // Existing form states
  const [readingTitle, setReadingTitle] = useState('');
  const [readingUrl, setReadingUrl] = useState('');

  // ═══════════════════════════════════════════════════════════
  // STEP 1: LOAD PLAYER FROM LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const saved = localStorage.getItem('currentPlayer');
    if (saved === 'player1' || saved === 'player2') {
      setCurrentPlayer(saved);
      setPlayerSelected(true);
    }
  }, []);

  // ═══════════════════════════════════════════════════════════
  // HELPER: Get today's date string
  // ═══════════════════════════════════════════════════════════
  const getTodayDate = () => new Date().toLocaleDateString();

  // ═══════════════════════════════════════════════════════════
  // STEP 2: CHECK IF PLAYER HAS CHECKED IN TODAY
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    if (!currentPlayer) return;
    const today = getTodayDate();
    const checkedIn = checkins.some(
      (c) => c.userId === currentPlayer && c.date === today
    );
    setHasCheckedInToday(checkedIn);
  }, [checkins, currentPlayer]);

  // ═══════════════════════════════════════════════════════════
  // REAL-TIME LISTENERS (Extended with actions collection)
  // ═══════════════════════════════════════════════════════════
  useEffect(() => {
    const checkinsQuery = query(
      collection(db, 'checkins'),
      orderBy('timestamp', 'desc')
    );
    const readingsQuery = query(
      collection(db, 'readings'),
      orderBy('timestamp', 'desc')
    );
    const achievementsQuery = query(
      collection(db, 'achievements'),
      orderBy('timestamp', 'desc')
    );
    const actionsQuery = query(
      collection(db, 'actions'),
      orderBy('timestamp', 'desc')
    );

    const MIN_LOADING_TIME = 5000;
    const startTime = Date.now();

    const unsubCheckins = onSnapshot(checkinsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as CheckIn[];
      setCheckins(data);

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(MIN_LOADING_TIME - elapsed, 0);
      setTimeout(() => setLoading(false), remaining);
    });

    const unsubReadings = onSnapshot(readingsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Reading[];
      setReadings(data);
    });

    const unsubAchievements = onSnapshot(achievementsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setAchievements(data);
    });

    const unsubActions = onSnapshot(actionsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Action[];
      setActions(data);
    });

    return () => {
      unsubCheckins();
      unsubReadings();
      unsubAchievements();
      unsubActions();
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // STEP 1: PLAYER SELECTION HANDLERS
  // ═══════════════════════════════════════════════════════════
  const selectPlayer = (player: Player) => {
    setCurrentPlayer(player);
    localStorage.setItem('currentPlayer', player);
    setPlayerSelected(true);
  };

  const switchPlayer = () => {
    setCurrentPlayer(null);
    setPlayerSelected(false);
    setGameMode(null);
    localStorage.removeItem('currentPlayer');
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 2: MANDATORY CHECK-IN HANDLER
  // ═══════════════════════════════════════════════════════════
  const addCheckin = async () => {
    if (!checkinText.trim() || !currentPlayer) return;
    
    await addDoc(collection(db, 'checkins'), {
      userId: currentPlayer,
      text: checkinText,
      timestamp: Date.now(),
      date: getTodayDate(),
      hasActions: false,
    });
    
    setCheckinText('');
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 3: ACTION SYSTEM - SCORING LOGIC
  // ═══════════════════════════════════════════════════════════
  const getActionPoints = (type: string, isFirstAction: boolean): number => {
    if (isFirstAction) return 20;
    if (type === 'workout' || type === 'study') return 30;
    return 10;
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 3: ADD ACTION HANDLER
  // ═══════════════════════════════════════════════════════════
  const addAction = async () => {
    if (!actionDescription.trim() || !currentPlayer || !hasCheckedInToday) return;

    const today = getTodayDate();
    const todayActions = actions.filter(
      (a) => a.userId === currentPlayer && a.date === today
    );
    const isFirstAction = todayActions.length === 0;
    const points = getActionPoints(selectedActionType, isFirstAction);

    await addDoc(collection(db, 'actions'), {
      userId: currentPlayer,
      date: today,
      type: selectedActionType,
      points,
      timestamp: Date.now(),
      description: actionDescription,
    });

    if (isFirstAction) {
      const todayCheckin = checkins.find(
        (c) => c.userId === currentPlayer && c.date === today
      );
      if (todayCheckin) {
        await updateDoc(doc(db, 'checkins', todayCheckin.id), { hasActions: true });
      }
    }

    setActionDescription('');
  };

  // ═══════════════════════════════════════════════════════════
  // STEP 4: MULTIPLAYER SCORING LOGIC
  // ═══════════════════════════════════════════════════════════
  const getPlayerDailyScore = (player: Player, date: string): number => {
    const checkedIn = checkins.some((c) => c.userId === player && c.date === date);
    if (!checkedIn) return 0;

    const playerActions = actions.filter((a) => a.userId === player && a.date === date);
    if (playerActions.length === 0) return 0;

    const actionPoints = playerActions.reduce((sum, a) => sum + a.points, 0);
    return 10 + actionPoints;
  };

  const getTeamScore = (date: string): number => {
    const p1Score = getPlayerDailyScore('player1', date);
    const p2Score = getPlayerDailyScore('player2', date);

    if (p1Score === 0 || p2Score === 0) return 0;

    return Math.min(p1Score, p2Score) * 2;
  };

  // ═══════════════════════════════════════════════════════════
  // EXISTING HELPER FUNCTIONS (Preserved)
  // ═══════════════════════════════════════════════════════════
  const addReading = async () => {
    if (!readingTitle.trim() || !currentPlayer) return;
    await addDoc(collection(db, 'readings'), {
      addedBy: currentPlayer,
      title: readingTitle,
      url: readingUrl,
      completed: false,
      timestamp: Date.now(),
    });
    setReadingTitle('');
    setReadingUrl('');
  };

  const toggleReading = async (id: string, completed: boolean) => {
    await updateDoc(doc(db, 'readings', id), { completed: !completed });
  };

  const deleteReading = async (id: string) => {
    await deleteDoc(doc(db, 'readings', id));
  };

  const getStreak = () => {
    if (!currentPlayer) return '❄️ Select player';
    const today = getTodayDate();
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString();
    
    const hasToday = checkins.some((c) => c.userId === currentPlayer && c.date === today);
    const hasYesterday = checkins.some((c) => c.userId === currentPlayer && c.date === yesterday);
    
    return hasToday && hasYesterday ? '🔥 2+ days' : hasToday ? '🔥 1 day' : '❄️ Start today!';
  };

  const getBadges = () => {
    if (!currentPlayer) return [];
    
    const workoutCount = actions.filter((a) => a.userId === currentPlayer && a.type === 'workout').length;
    const studyCount = actions.filter((a) => a.userId === currentPlayer && a.type === 'study').length;

    const badges = [];
    if (workoutCount >= 5) badges.push({ icon: '💪', name: 'Iron Ore', desc: '5+ workouts' });
    if (workoutCount >= 15) badges.push({ icon: '⛏️', name: 'Diamond Pick', desc: '15+ workouts' });
    if (studyCount >= 10) badges.push({ icon: '📚', name: 'Bookworm', desc: '10+ study hours' });
    if (studyCount >= 25) badges.push({ icon: '💎', name: 'Study Diamond', desc: '25+ study hours' });
    
    const playerCheckins = checkins.filter((c) => c.userId === currentPlayer);
    if (playerCheckins.length >= 7) badges.push({ icon: '🏆', name: 'Weekly Warrior', desc: '7+ check-ins' });

    return badges;
  };

  const getAchievementIcon = (type: string) => {
    switch (type) {
      case 'workout': return <Dumbbell className="w-4 h-4" />;
      case 'study': return <Clock className="w-4 h-4" />;
      case 'reading': return <Book className="w-4 h-4" />;
      case 'work': return <Award className="w-4 h-4" />;
      case 'relationship': return <Heart className="w-4 h-4" />;
      default: return <Award className="w-4 h-4" />;
    }
  };

  // ═══════════════════════════════════════════════════════════
  // LOADING SCREEN (Preserved)
  // ═══════════════════════════════════════════════════════════
  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(to bottom, #14532d, #052e16)', zIndex: 9999 }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div className="text-7xl mb-4 bob">⛏️</div>
          <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '20px', color: 'white', marginBottom: '12px' }}>
            Loading Our World
          </div>
          <div style={{ fontFamily: "'Press Start 2P', cursive", fontSize: '12px', color: 'rgba(255,255,255,0.8)' }} className="loading-dots">
            Generating terrain
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // STEP 1: PLAYER SELECTION SCREEN
  // ═══════════════════════════════════════════════════════════
  if (!playerSelected || !currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .pixel-font { font-family: 'Press Start 2P', cursive; }
          .minecraft-border {
            border: 4px solid #000;
            box-shadow: inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.3);
          }
          .player-btn {
            border: 4px solid #000;
            box-shadow: inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.3);
            transition: all 0.15s;
          }
          .player-btn:hover {
            transform: translateY(-2px);
            box-shadow: inset -3px -3px 0 rgba(0,0,0,0.6), inset 3px 3px 0 rgba(255,255,255,0.4);
          }
          .player-btn:active {
            transform: translateY(2px);
            box-shadow: inset 2px 2px 0 rgba(0,0,0,0.5);
          }
        `}</style>

        <div className="max-w-md w-full">
          <div className="minecraft-border bg-amber-800 p-6 mb-8">
            <h1 className="pixel-font text-2xl text-white text-center mb-3">
              Select Your Player
            </h1>
            <p className="pixel-font text-xs text-amber-200 text-center">
              Who are you?
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
  <button
    onClick={() => selectPlayer('player1')}
    className="mc-card bg-pink-600 text-white pixel-font text-xs"
  >
    <div className="text-4xl mb-2">❤️</div>
    <div>Player 1</div>
    <div className="opacity-80 text-[10px] mt-1">(You)</div>
  </button>

  <button
    onClick={() => selectPlayer('player2')}
    className="mc-card bg-blue-600 text-white pixel-font text-xs"
  >
    <div className="text-4xl mb-2">💙</div>
    <div>Player 2</div>
    <div className="opacity-80 text-[10px] mt-1">(Baby)</div>
  </button>
</div>


          <div className="mt-8 text-center">
            <p className="pixel-font text-xs text-green-300">Version 2025.1</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // GAME MODE SELECTION (Preserved)
  // ═══════════════════════════════════════════════════════════
  if (!gameMode) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 flex items-center justify-center p-4">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
          .pixel-font { font-family: 'Press Start 2P', cursive; }
          .minecraft-border {
            border: 4px solid #000;
            box-shadow: inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.3);
          }
          .mode-btn {
            border: 4px solid #000;
            box-shadow: inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.3);
            transition: all 0.15s;
          }
          .mode-btn:hover {
            transform: translateY(-2px);
            box-shadow: inset -3px -3px 0 rgba(0,0,0,0.6), inset 3px 3px 0 rgba(255,255,255,0.4);
          }
          .mode-btn:active {
            transform: translateY(2px);
            box-shadow: inset 2px 2px 0 rgba(0,0,0,0.5);
          }
        `}</style>

        <div className="max-w-md w-full">
          <div className="minecraft-border bg-amber-800 p-6 mb-8">
            <h1 className="pixel-font text-2xl text-white text-center mb-3">
              Our Adventure Log
            </h1>
            <p className="pixel-font text-xs text-amber-200 text-center">
              Select Game Mode
            </p>
            <div className="text-center mt-3 pixel-font text-xs text-white">
              Playing as: {currentPlayer === 'player1' ? '❤️ You' : '💙 Baby'}
            </div>
          </div>

          <div className="space-y-3">


  {/* Game modes */}
  <button
    onClick={() => setGameMode('singleplayer')}
    className="mc-card bg-green-600 text-white pixel-font text-xs"
  >
    <div className="text-base mb-1">🧍 Solo Mode</div>
    <div className="opacity-80 text-[10px]">
      Focus on your own growth
    </div>
  </button>

  <button
    onClick={() => setGameMode('multiplayer')}
    className="mc-card bg-blue-600 text-white pixel-font text-xs"
  >
    <div className="text-lg mb-1">👥 Team Mode</div>
    <div className="opacity-80 text-[10px]">
      Both must check in & act
    </div>
  </button>

  <button
    disabled
    className="mc-card bg-red-600 text-white pixel-font text-xs opacity-60"
  >
    <div className="text-lg mb-1">⚔️ PVP Mode</div>
    <div className="opacity-80 text-[10px]">
      Coming soon
    </div>
  </button>



  {/* Switch player (secondary action) */}
  <button
    onClick={switchPlayer}
    className="mc-card bg-gray-600 text-white pixel-font text-[10px]"
  >
    🔄 Switch Player
  </button>
</div>

          <div className="mt-8 text-center">
            <p className="pixel-font text-xs text-green-300">Version 2025.1</p>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // MAIN APP UI
  // ═══════════════════════════════════════════════════════════
  const today = getTodayDate();
  const todayActions = actions.filter((a) => a.userId === currentPlayer && a.date === today);
  const myScore = getPlayerDailyScore(currentPlayer, today);
  const otherPlayer: Player = currentPlayer === 'player1' ? 'player2' : 'player1';
  const otherScore = getPlayerDailyScore(otherPlayer, today);
  const teamScore = getTeamScore(today);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-900 to-green-950 p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .pixel-font { font-family: 'Press Start 2P', cursive; }
        .minecraft-border { 
          border: 4px solid #000; 
          box-shadow: inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.3);
        }
        .minecraft-btn {
          border: 3px solid #000;
          box-shadow: inset -2px -2px 0 rgba(0,0,0,0.5), inset 2px 2px 0 rgba(255,255,255,0.3);
          transition: all 0.1s;
        }
        .minecraft-btn:active {
          box-shadow: inset 2px 2px 0 rgba(0,0,0,0.5);
        }
        .minecraft-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>

      {/* Header */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="minecraft-border bg-amber-800 p-4 mb-4">
          <div className="flex items-start justify-between mb-2">
            <button
              onClick={() => setGameMode(null)}
              className="minecraft-btn bg-red-600 hover:bg-red-500 text-white px-3 py-1 pixel-font text-xs"
            >
              ← Back
            </button>
            <button
              onClick={switchPlayer}
              className="minecraft-btn bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 pixel-font text-xs"
            >
              Switch
            </button>
          </div>
          <h1 className="pixel-font text-xl text-white text-center mb-2">
            🎮 {gameMode === 'multiplayer' ? 'Team Mode' : gameMode === 'pvp' ? 'PVP Mode' : 'Solo Mode'} 🎮
          </h1>
          <div className="text-center mb-2">
            <span className="pixel-font text-sm text-white">
              {currentPlayer === 'player1' ? '❤️ You' : '💙 Baby'}
            </span>
          </div>

          {/* STEP 4: Multiplayer Team Scores */}
          {gameMode === 'multiplayer' && (
            <div className="minecraft-border bg-stone-800 p-3 mt-3">
              <div className="pixel-font text-xs text-amber-400 text-center mb-2">Today's Scores</div>
              <div className="flex justify-around items-center text-white text-sm mb-2">
                <div>
                  <div className="pixel-font text-xs text-pink-400">❤️ You</div>
                  <div className="text-center font-bold">{myScore} pts</div>
                </div>
                <div>
                  <div className="pixel-font text-xs text-blue-400">💙 Baby</div>
                  <div className="text-center font-bold">{otherScore} pts</div>
                </div>
              </div>
              <div className="minecraft-border bg-amber-900 p-2 text-center">
                <div className="pixel-font text-xs text-amber-200">Team Score</div>
                <div className="text-2xl font-bold text-white">{teamScore}</div>
                {teamScore === 0 && (
                  <div className="pixel-font text-xs text-red-400 mt-1">
                    {myScore === 0 ? '⚠️ You need check-in + action' : '⏳ Waiting for partner'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Singleplayer Score */}
          {gameMode === 'singleplayer' && (
            <div className="flex justify-center gap-4 items-center text-white text-sm mt-2">
              <div className="pixel-font">Today: {myScore} pts</div>
              <div className="pixel-font">Streak: {getStreak()}</div>
            </div>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { id: 'checkin', icon: Heart, label: 'Check-in' },
            { id: 'actions', icon: Award, label: 'Actions' },
            { id: 'reading', icon: Book, label: 'Reading' },
            { id: 'badges', icon: Calendar, label: 'Stats' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`minecraft-btn p-3 flex flex-col items-center gap-1 ${
                activeTab === tab.id ? 'bg-amber-600 text-white' : 'bg-stone-600 text-gray-300'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              <span className="pixel-font text-xs">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto">
        {/* STEP 2: CHECK-IN TAB (with mandatory check-in logic) */}
        {activeTab === 'checkin' && (
          <div className="minecraft-border bg-stone-700 p-4">
            <h2 className="pixel-font text-white text-sm mb-2">
              💬 Daily Check-in
            </h2>
            
            {/* Check-in Status */}
            <div className="minecraft-border bg-stone-800 p-3 mb-3 text-center">
              {hasCheckedInToday ? (
                <div className="flex items-center justify-center gap-2">
                  <Unlock className="w-4 h-4 text-green-400" />
                  <span className="pixel-font text-xs text-green-400">✓ Checked In</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Lock className="w-4 h-4 text-red-400" />
                  <span className="pixel-font text-xs text-red-400">⚠️ Check-in Required</span>
                </div>
              )}
            </div>

            {!hasCheckedInToday && (
              <>
                <textarea
                  value={checkinText}
                  onChange={(e) => setCheckinText(e.target.value)}
                  placeholder="What did you do today?"
                  className="w-full p-3 mb-3 minecraft-border bg-stone-800 text-white placeholder-gray-400"
                  rows={3}
                />
                <button
                  onClick={addCheckin}
                  className="minecraft-btn bg-green-600 text-white px-6 py-2 pixel-font text-xs w-full"
                  >
                  Check In Today (+10 pts)
                  </button>
                  </>
                  )}
                  <div className="mt-4 minecraft-border bg-amber-900 p-3">
          <div className="pixel-font text-xs text-amber-200 mb-2">⚠️ Important Rules:</div>
          <ul className="text-xs text-white space-y-1">
            <li>• Must check in daily</li>
            <li>• Must log ≥1 action to score</li>
            <li>• Both required for points</li>
          </ul>
        </div>

        <div className="mt-6 space-y-3">
          <h3 className="pixel-font text-xs text-gray-400">Recent Check-ins</h3>
          {checkins.slice(0, 5).map((checkin) => (
            <div key={checkin.id} className="minecraft-border bg-stone-800 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={`pixel-font text-xs ${
                  checkin.userId === 'player1' ? 'text-pink-400' : 'text-blue-400'
                }`}>
                  {checkin.userId === 'player1' ? '❤️ You' : '💙 Baby'}
                </span>
                <span className="text-gray-400 text-xs">{checkin.date}</span>
                {checkin.hasActions && <span className="text-green-400 text-xs">✓</span>}
              </div>
              <p className="text-white text-sm">{checkin.text}</p>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* STEP 3: ACTIONS TAB (with scoring system) */}
    {activeTab === 'actions' && (
      <div className="minecraft-border bg-stone-700 p-4">
        <h2 className="pixel-font text-white text-sm mb-2">
          🏆 Log Actions
        </h2>

        {!hasCheckedInToday ? (
          <div className="minecraft-border bg-red-900 p-4 text-center">
            <Lock className="w-8 h-8 mx-auto mb-2 text-red-400" />
            <p className="pixel-font text-xs text-red-200">
              Check in first to unlock actions
            </p>
          </div>
        ) : (
          <>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              className="w-full p-3 mb-2 minecraft-border bg-stone-800 text-white"
              disabled={!hasCheckedInToday}
            >
              <option value="workout">💪 Workout (+30 pts bonus)</option>
              <option value="study">📖 Study (+30 pts bonus)</option>
              <option value="reading">📚 Reading (+10/20 pts)</option>
              <option value="work">💼 Work (+10/20 pts)</option>
              <option value="relationship">❤️ Relationship (+10/20 pts)</option>
              <option value="other">⭐ Other (+10/20 pts)</option>
            </select>

            <input
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
              placeholder="What did you do?"
              className="w-full p-3 mb-3 minecraft-border bg-stone-800 text-white placeholder-gray-400"
              disabled={!hasCheckedInToday}
            />

            <button
              onClick={addAction}
              disabled={!hasCheckedInToday}
              className="minecraft-btn bg-purple-600 text-white px-6 py-2 pixel-font text-xs w-full disabled:opacity-50"
            >
              Log Action {todayActions.length === 0 ? '(+20 pts)' : '(+10-30 pts)'}
            </button>

            <div className="mt-4 minecraft-border bg-amber-900 p-3">
              <div className="pixel-font text-xs text-amber-200 mb-2">📊 Scoring:</div>
              <ul className="text-xs text-white space-y-1">
                <li>• Check-in: +10</li>
                <li>• First action: +20</li>
                <li>• Extra actions: +10</li>
                <li>• Workout/Study bonus: +30</li>
              </ul>
            </div>
          </>
        )}

        <div className="mt-6 space-y-2">
          <h3 className="pixel-font text-xs text-gray-400">Today's Actions ({todayActions.length})</h3>
          {todayActions.map((action) => (
            <div key={action.id} className="minecraft-border bg-stone-800 p-3 flex items-center gap-3">
              <div className={action.userId === 'player1' ? 'text-pink-400' : 'text-blue-400'}>
                {getAchievementIcon(action.type)}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{action.description}</p>
                <p className="text-gray-400 text-xs">{action.type}</p>
              </div>
              <span className="pixel-font text-xs text-green-400">+{action.points}</span>
            </div>
          ))}

          <h3 className="pixel-font text-xs text-gray-400 mt-6">Recent Actions</h3>
          {actions.filter(a => a.date !== today).slice(0, 5).map((action) => (
            <div key={action.id} className="minecraft-border bg-stone-800 p-3 flex items-center gap-3">
              <div className={action.userId === 'player1' ? 'text-pink-400' : 'text-blue-400'}>
                {getAchievementIcon(action.type)}
              </div>
              <div className="flex-1">
                <p className="text-white text-sm">{action.description}</p>
                <p className="text-gray-400 text-xs">{action.date}</p>
              </div>
              <span className={`pixel-font text-xs ${
                action.userId === 'player1' ? 'text-pink-400' : 'text-blue-400'
              }`}>
                {action.userId === 'player1' ? '❤️' : '💙'}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* READING TAB (Preserved) */}
    {activeTab === 'reading' && (
      <div className="minecraft-border bg-stone-700 p-4">
        <h2 className="pixel-font text-white text-sm mb-4">
          📚 Shared Reading List
        </h2>
        <input
          value={readingTitle}
          onChange={(e) => setReadingTitle(e.target.value)}
          placeholder="Article/Video title"
          className="w-full p-3 mb-2 minecraft-border bg-stone-800 text-white placeholder-gray-400"
        />
        <input
          value={readingUrl}
          onChange={(e) => setReadingUrl(e.target.value)}
          placeholder="URL (optional)"
          className="w-full p-3 mb-3 minecraft-border bg-stone-800 text-white placeholder-gray-400"
        />
        <button
          onClick={addReading}
          className="minecraft-btn bg-blue-600 text-white px-6 py-2 pixel-font text-xs w-full"
        >
          Add Resource
        </button>

        <div className="mt-6 space-y-2">
          {readings.map((reading) => (
            <div
              key={reading.id}
              className={`minecraft-border p-3 flex items-center justify-between ${
                reading.completed ? 'bg-green-900' : 'bg-stone-800'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs ${
                    reading.addedBy === 'player1' ? 'text-pink-400' : 'text-blue-400'
                  }`}>
                    {reading.addedBy === 'player1' ? '❤️' : '💙'}
                  </span>
                  <span className={`text-sm ${
                    reading.completed ? 'line-through text-gray-400' : 'text-white'
                  }`}>
                    {reading.title}
                  </span>
                </div>
                {reading.url && (
                  <a
                    href={reading.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-300 text-xs hover:underline"
                  >
                    🔗 Link
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => toggleReading(reading.id, reading.completed)} className="text-white">
                  <CheckCircle className={`w-5 h-5 ${reading.completed ? 'text-green-400' : 'text-gray-500'}`} />
                </button>
                <button onClick={() => deleteReading(reading.id)} className="text-red-400">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}

    {/* BADGES & STATS TAB (Enhanced) */}
    {activeTab === 'badges' && (
      <div className="minecraft-border bg-stone-700 p-4">
        <h2 className="pixel-font text-white text-sm mb-4">
          🏅 Badges & Stats
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {getBadges().map((badge, idx) => (
            <div key={idx} className="minecraft-border bg-amber-900 p-4 text-center">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <div className="pixel-font text-white text-xs mb-1">{badge.name}</div>
              <div className="text-gray-300 text-xs">{badge.desc}</div>
            </div>
          ))}
          {getBadges().length === 0 && (
            <div className="col-span-2 text-center text-gray-400 py-8">
              <p className="pixel-font text-xs">Keep grinding to earn badges! ⛏️</p>
            </div>
          )}
        </div>

        <div className="minecraft-border bg-stone-800 p-4">
          <h3 className="pixel-font text-white text-xs mb-3">📊 Your Stats</h3>
          <div className="space-y-2 text-sm text-white">
            <div className="flex justify-between">
              <span>Today's Score:</span>
              <span className="font-bold text-green-400">{myScore} pts</span>
            </div>
            <div className="flex justify-between">
              <span>Total Actions:</span>
              <span className="font-bold">
                {actions.filter((a) => a.userId === currentPlayer).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total Check-ins:</span>
              <span className="font-bold">
                {checkins.filter((c) => c.userId === currentPlayer).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Resources Shared:</span>
              <span className="font-bold">
                {readings.filter((r) => r.addedBy === currentPlayer).length}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Streak:</span>
              <span className="font-bold">{getStreak()}</span>
            </div>
          </div>
        </div>

        {gameMode === 'multiplayer' && (
          <div className="minecraft-border bg-stone-800 p-4 mt-4">
            <h3 className="pixel-font text-white text-xs mb-3">👥 Team Stats</h3>
            <div className="space-y-2 text-sm text-white">
              <div className="flex justify-between">
                <span>Today's Team Score:</span>
                <span className="font-bold text-amber-400">{teamScore} pts</span>
              </div>
              <div className="flex justify-between">
                <span>❤️ Your Score:</span>
                <span className="font-bold text-pink-400">{myScore} pts</span>
              </div>
              <div className="flex justify-between">
                <span>💙 Partner Score:</span>
                <span className="font-bold text-blue-400">{otherScore} pts</span>
              </div>
            </div>
          </div>
        )}
      </div>
    )}
  </div>

  <div className="max-w-4xl mx-auto mt-6 text-center text-green-300 text-xs">
    <p className="pixel-font">Building our future together, one block at a time 💚</p>
  </div>
</div>
);
};

export default MinecraftGoalsApp;