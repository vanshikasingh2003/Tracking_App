import React, { useState, useEffect, useCallback } from 'react';
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
  Trash2,
  CheckCircle,
  Lock,
  Unlock,
  User,
  ArrowLeft,
  Zap,
  Target,
  TrendingUp,
  Star,
  Flame,
  Trophy,
  Sparkles,
  ExternalLink,
  Briefcase,
} from 'lucide-react';

/* ==================== FIREBASE ==================== */

const firebaseConfig = {
  apiKey: 'AIzaSyCX4myq_aSMqQ19Ae59qcBbvUTF6a7dx6E',
  authDomain: 'our-adventure-log.firebaseapp.com',
  projectId: 'our-adventure-log',
  storageBucket: 'our-adventure-log.firebasestorage.app',
  messagingSenderId: '539205598720',
  appId: '1:539205598720:web:090d8c3955f45cbf1aa2e5',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ==================== TYPES ==================== */

type Player = 'player1' | 'player2';
type GameMode = 'singleplayer' | 'multiplayer' | null;
type ActionType = 'workout' | 'study' | 'reading' | 'work' | 'relationship' | 'other';

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
  type: ActionType;
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

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'xp' | 'error';
  icon: string;
}

/* ==================== CONSTANTS ==================== */

const ACTION_TYPES: { type: ActionType; icon: string; label: string; bonus: boolean }[] = [
  { type: 'workout', icon: '💪', label: 'Workout', bonus: true },
  { type: 'study', icon: '📖', label: 'Study', bonus: true },
  { type: 'reading', icon: '📚', label: 'Reading', bonus: false },
  { type: 'work', icon: '💼', label: 'Work', bonus: false },
  { type: 'relationship', icon: '❤️', label: 'Love', bonus: false },
  { type: 'other', icon: '⭐', label: 'Other', bonus: false },
];

/* ==================== XP / LEVEL CALCULATIONS ==================== */

const calculateLevel = (totalXP: number) => {
  const baseXP = 100;
  const multiplier = 1.5;

  let level = 1;
  let xpNeeded = baseXP;
  let totalUsed = 0;

  while (totalXP >= totalUsed + xpNeeded) {
    totalUsed += xpNeeded;
    level++;
    xpNeeded = Math.floor(baseXP * Math.pow(multiplier, level - 1));
  }

  return {
    level,
    currentXP: totalXP - totalUsed,
    xpForNext: xpNeeded,
    progress: ((totalXP - totalUsed) / xpNeeded) * 100,
  };
};

const getLevelTitle = (level: number) => {
  if (level >= 50) return '🏆 Legend';
  if (level >= 40) return '👑 Champion';
  if (level >= 30) return '⚔️ Master';
  if (level >= 20) return '🛡️ Warrior';
  if (level >= 10) return '⭐ Skilled';
  return '🌱 Beginner';
};

/* ==================== MAIN COMPONENT ==================== */

const ModernGoalsApp: React.FC = () => {
  // Player & Game State
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>(null);
  const [activeTab, setActiveTab] = useState<'checkin' | 'actions' | 'reading' | 'stats'>('checkin');
  const [loading, setLoading] = useState(true);

  // Data State
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);

  // Form State
  const [checkinText, setCheckinText] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [selectedActionType, setSelectedActionType] = useState<ActionType>('workout');
  const [readingTitle, setReadingTitle] = useState('');
  const [readingUrl, setReadingUrl] = useState('');

  // UI State
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(1);
  const [showXPGain, setShowXPGain] = useState(false);
  const [xpGainAmount, setXpGainAmount] = useState(0);

  const today = new Date().toLocaleDateString();

    /* ==================== HELPER FUNCTIONS ==================== */

    const showToast = useCallback((message: string, type: 'success' | 'xp' | 'error', icon: string) => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type, icon }]);
      setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
    }, []);
  
    const triggerXPGain = useCallback((amount: number) => {
      setXpGainAmount(amount);
      setShowXPGain(true);
      setTimeout(() => setShowXPGain(false), 1000);
    }, []);
  
    const hasCheckedInToday = currentPlayer
      ? checkins.some((c) => c.userId === currentPlayer && c.date === today)
      : false;
  
    const getTotalXP = useCallback(
      (player: Player) =>
        checkins.filter((c) => c.userId === player).length * 10 +
        actions.filter((a) => a.userId === player).reduce((s, a) => s + a.points, 0),
      [checkins, actions]
    );
  
    const getPlayerDailyScore = useCallback(
      (player: Player, date: string): number => {
        const checkedIn = checkins.some((c) => c.userId === player && c.date === date);
        if (!checkedIn) return 0;
  
        const playerActions = actions.filter((a) => a.userId === player && a.date === date);
        if (playerActions.length === 0) return 10;
  
        const actionPoints = playerActions.reduce((sum, a) => sum + a.points, 0);
        return 10 + actionPoints;
      },
      [checkins, actions]
    );
  
    const getTeamScore = useCallback(
      (date: string): number => {
        const p1Score = getPlayerDailyScore('player1', date);
        const p2Score = getPlayerDailyScore('player2', date);
        if (p1Score === 0 || p2Score === 0) return 0;
        return Math.min(p1Score, p2Score) * 2;
      },
      [getPlayerDailyScore]
    );
  
    const getStreak = useCallback((): { count: number; status: 'fire' | 'cold' } => {
      if (!currentPlayer) return { count: 0, status: 'cold' };
  
      let streak = 0;
      const todayDate = new Date();
  
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(todayDate);
        checkDate.setDate(todayDate.getDate() - i);
        const dateStr = checkDate.toLocaleDateString();
  
        const hasCheckin = checkins.some((c) => c.userId === currentPlayer && c.date === dateStr);
  
        if (hasCheckin) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }
  
      return { count: streak, status: streak > 0 ? 'fire' : 'cold' };
    }, [checkins, currentPlayer]);
  
    const getBadges = useCallback(() => {
      if (!currentPlayer) return [];
  
      const playerActions = actions.filter((a) => a.userId === currentPlayer);
      const playerCheckins = checkins.filter((c) => c.userId === currentPlayer);
      const workoutCount = playerActions.filter((a) => a.type === 'workout').length;
      const studyCount = playerActions.filter((a) => a.type === 'study').length;
      const streak = getStreak().count;
  
      const allBadges = [
        { icon: '💪', name: 'First Pump', desc: '1 workout', unlocked: workoutCount >= 1 },
        { icon: '🏋️', name: 'Iron Will', desc: '5 workouts', unlocked: workoutCount >= 5 },
        { icon: '🔥', name: 'Beast Mode', desc: '15 workouts', unlocked: workoutCount >= 15 },
        { icon: '📖', name: 'Bookworm', desc: '5 study sessions', unlocked: studyCount >= 5 },
        { icon: '⚡', name: 'Streak Starter', desc: '3 day streak', unlocked: streak >= 3 },
        { icon: '🔥', name: 'On Fire', desc: '7 day streak', unlocked: streak >= 7 },
        { icon: '🏆', name: 'Dedicated', desc: '10 check-ins', unlocked: playerCheckins.length >= 10 },
      ];
  
      return allBadges.filter((b) => b.unlocked);
    }, [actions, checkins, currentPlayer, getStreak]);
  
    const getActionIcon = (type: ActionType) => {
      switch (type) {
        case 'workout':
          return <Dumbbell size={18} />;
        case 'study':
          return <Clock size={18} />;
        case 'reading':
          return <Book size={18} />;
        case 'work':
          return <Briefcase size={18} />;
        case 'relationship':
          return <Heart size={18} />;
        default:
          return <Star size={18} />;
      }
    };

      /* ==================== USE EFFECTS ==================== */

  // Load saved player from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('currentPlayer');
    if (saved === 'player1' || saved === 'player2') {
      setCurrentPlayer(saved);
    }
  }, []);

  // Firebase listeners
  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'checkins'), orderBy('timestamp', 'desc')),
      (snap) => setCheckins(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as CheckIn[])
    );

    const unsub2 = onSnapshot(
      query(collection(db, 'actions'), orderBy('timestamp', 'desc')),
      (snap) => setActions(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Action[])
    );

    const unsub3 = onSnapshot(
      query(collection(db, 'readings'), orderBy('timestamp', 'desc')),
      (snap) => setReadings(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Reading[])
    );

    setTimeout(() => setLoading(false), 1500);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  /* ==================== EVENT HANDLERS ==================== */

  const selectPlayer = (player: Player) => {
    setCurrentPlayer(player);
    localStorage.setItem('currentPlayer', player);
  };

  const switchPlayer = () => {
    setCurrentPlayer(null);
    setGameMode(null);
    localStorage.removeItem('currentPlayer');
  };

  const addCheckin = async () => {
    if (!checkinText.trim() || !currentPlayer) return;

    const prevXP = getTotalXP(currentPlayer);
    const prevLevel = calculateLevel(prevXP).level;

    await addDoc(collection(db, 'checkins'), {
      userId: currentPlayer,
      text: checkinText,
      timestamp: Date.now(),
      date: today,
      hasActions: false,
    });

    setCheckinText('');
    triggerXPGain(10);
    showToast('+10 XP Check-in complete!', 'xp', '✨');

    setTimeout(() => {
      const newXP = prevXP + 10;
      const newLevelData = calculateLevel(newXP);
      if (newLevelData.level > prevLevel) {
        setNewLevel(newLevelData.level);
        setShowLevelUp(true);
      }
    }, 500);
  };

  const addAction = async () => {
    if (!actionDescription.trim() || !currentPlayer || !hasCheckedInToday) return;

    const todayActions = actions.filter((a) => a.userId === currentPlayer && a.date === today);
    const isFirst = todayActions.length === 0;
    const points = isFirst ? 20 : selectedActionType === 'workout' || selectedActionType === 'study' ? 30 : 10;

    const prevXP = getTotalXP(currentPlayer);
    const prevLevel = calculateLevel(prevXP).level;

    await addDoc(collection(db, 'actions'), {
      userId: currentPlayer,
      date: today,
      type: selectedActionType,
      points,
      timestamp: Date.now(),
      description: actionDescription,
    });

    if (isFirst) {
      const checkin = checkins.find((c) => c.userId === currentPlayer && c.date === today);
      if (checkin) {
        await updateDoc(doc(db, 'checkins', checkin.id), { hasActions: true });
      }
    }

    setActionDescription('');
    triggerXPGain(points);

    const bonusText = selectedActionType === 'workout' || selectedActionType === 'study' ? ' (Bonus!)' : '';
    showToast(`+${points} XP${bonusText}`, 'xp', '⚡');

    setTimeout(() => {
      const newXP = prevXP + points;
      const newLevelData = calculateLevel(newXP);
      if (newLevelData.level > prevLevel) {
        setNewLevel(newLevelData.level);
        setShowLevelUp(true);
      }
    }, 500);
  };

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
    showToast('Resource added!', 'success', '📚');
  };

  const toggleReading = async (id: string, completed: boolean) => {
    await updateDoc(doc(db, 'readings', id), { completed: !completed });
    if (!completed) {
      showToast('Marked as complete!', 'success', '✅');
    }
  };

  const deleteReading = async (id: string) => {
    await deleteDoc(doc(db, 'readings', id));
    showToast('Resource removed', 'error', '🗑️');
  };

    /* ==================== RENDER LOGIC ==================== */

  // Loading Screen
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="loading-icon-wrapper">
            <div className="loading-spinner"></div>
            <span className="loading-emoji">💪</span>
          </div>
          <h2 className="loading-title">Our Adventure Log</h2>
          <p className="loading-subtitle">Loading your journey...</p>
          <div className="loading-progress">
            <div className="loading-progress-bar"></div>
          </div>
        </div>
      </div>
    );
  }

  // Player Selection Screen
  if (!currentPlayer) {
    return (
      <div className="glass-card" style={{ marginTop: 48 }}>
        <header>
          <h1>Our Adventure Log</h1>
        </header>

        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text-secondary)' }}>
          Choose your character
        </p>

        <div className="player-select-container">
          <button className="player-btn player1" onClick={() => selectPlayer('player1')}>
            <span className="player-emoji">❤️</span>
            <span className="player-name">Player 1</span>
          </button>

          <button className="player-btn player2" onClick={() => selectPlayer('player2')}>
            <span className="player-emoji">💙</span>
            <span className="player-name">Player 2</span>
          </button>
        </div>
      </div>
    );
  }

  // Game Mode Selection Screen
  if (!gameMode) {
    const totalXP = getTotalXP(currentPlayer);
    const levelData = calculateLevel(totalXP);
    const streak = getStreak();
    const badges = getBadges();

    return (
      <div className="glass-card" style={{ marginTop: 24 }}>
        <header>
          <h1>Our Adventure Log</h1>
          <button className="btn btn-icon" onClick={switchPlayer}>
            <User size={20} />
          </button>
        </header>

        {/* Player Indicator */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div className={`player-indicator ${currentPlayer}`}>
            <span className="player-indicator-emoji">{currentPlayer === 'player1' ? '❤️' : '💙'}</span>
            <span>Playing as {currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}</span>
          </div>
        </div>

        {/* XP Bar */}
        <div className="xp-section">
          <div className="xp-header">
            <div className="xp-level">
              <div className="level-badge">
                <span className="level-icon">⭐</span>
                <span>Level {levelData.level}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getLevelTitle(levelData.level)}</span>
            </div>
            <div className="xp-points">
              <span>{levelData.currentXP}</span> / {levelData.xpForNext} XP
            </div>
          </div>
          <div className="xp-bar-wrapper">
            <div className="xp-bar-glow" style={{ width: `${levelData.progress}%` }}></div>
            <div className="xp-bar-fill" style={{ width: `${levelData.progress}%` }}></div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="quick-stats">
          <div className="quick-stat">
            <div className="quick-stat-value">{totalXP}</div>
            <div className="quick-stat-label">Total XP</div>
          </div>
          <div className="quick-stat">
            <div className="quick-stat-value">{streak.count}🔥</div>
            <div className="quick-stat-label">Streak</div>
          </div>
          <div className="quick-stat">
            <div className="quick-stat-value">{badges.length}</div>
            <div className="quick-stat-label">Badges</div>
          </div>
        </div>

        {/* Game Mode Buttons */}
        <h3 style={{ textAlign: 'center', marginBottom: 16 }}>Select Mode</h3>

        <div className="mode-select-container">
          <button className="mode-btn solo" onClick={() => setGameMode('singleplayer')}>
            <span className="mode-icon">🧍</span>
            <div className="mode-info">
              <div className="mode-title">Solo Mode</div>
              <div className="mode-desc">Track your personal progress</div>
            </div>
          </button>

          <button className="mode-btn team" onClick={() => setGameMode('multiplayer')}>
            <span className="mode-icon">👥</span>
            <div className="mode-info">
              <div className="mode-title">Team Mode</div>
              <div className="mode-desc">Grow together with your partner</div>
            </div>
          </button>

          <button className="mode-btn pvp" disabled>
            <span className="mode-icon">⚔️</span>
            <div className="mode-info">
              <div className="mode-title">PVP Mode</div>
              <div className="mode-desc">Coming soon...</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Main App Variables
  const todayActions = actions.filter((a) => a.userId === currentPlayer && a.date === today);
  const myScore = getPlayerDailyScore(currentPlayer, today);
  const otherPlayer: Player = currentPlayer === 'player1' ? 'player2' : 'player1';
  const otherScore = getPlayerDailyScore(otherPlayer, today);
  const teamScore = getTeamScore(today);
  const totalXP = getTotalXP(currentPlayer);
  const levelData = calculateLevel(totalXP);
  const streak = getStreak();
  const badges = getBadges();

  // Main App Render
  return (
    <>
      {/* Toast Notifications */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">{toast.icon}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Level Up Modal */}
      {showLevelUp && (
        <div className="level-up-overlay" onClick={() => setShowLevelUp(false)}>
          <div className="level-up-modal" onClick={(e) => e.stopPropagation()}>
            <div className="level-up-icon">🎉</div>
            <div className="level-up-title">LEVEL UP!</div>
            <div className="level-up-level">{newLevel}</div>
            <div className="level-up-message">{getLevelTitle(newLevel)} - Keep pushing!</div>
            <button className="level-up-btn" onClick={() => setShowLevelUp(false)}>
              Awesome!
            </button>
          </div>
        </div>
      )}

      <div className="glass-card">
        {/* Header */}
        <header>
          <button className="btn btn-icon" onClick={() => setGameMode(null)}>
            <ArrowLeft size={20} />
          </button>
          <h1>{gameMode === 'multiplayer' ? 'Team Mode' : 'Solo Mode'}</h1>
          <button className="btn btn-icon" onClick={switchPlayer}>
            <User size={20} />
          </button>
        </header>

        {/* XP Bar Section */}
        <div className="xp-section">
          <div className="xp-header">
            <div className="xp-level">
              <div className={`level-badge ${showXPGain ? 'leveling-up' : ''}`}>
                <span className="level-icon">⭐</span>
                <span>Lv. {levelData.level}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{getLevelTitle(levelData.level)}</span>
            </div>
            <div className="xp-points">
              <span>{levelData.currentXP}</span> / {levelData.xpForNext} XP
              {showXPGain && <span className="xp-gain-popup">+{xpGainAmount}</span>}
            </div>
          </div>
          <div className="xp-bar-wrapper">
            <div className="xp-bar-glow" style={{ width: `${levelData.progress}%` }}></div>
            <div className="xp-bar-fill" style={{ width: `${levelData.progress}%` }}></div>
          </div>
        </div>

                {/* Score Section - Team Mode */}
                {gameMode === 'multiplayer' && (
          <div className="score-section">
            <div className="score-card">
              <div className="score-card-header">
                <div className="score-card-title">Today's Battle</div>
              </div>

              <div className="score-players">
                <div className={`score-player player1 ${currentPlayer === 'player1' ? 'current' : ''}`}>
                  <div className="score-player-emoji">❤️</div>
                  <div className="score-player-name">Player 1</div>
                  <div className="score-player-points">{getPlayerDailyScore('player1', today)}</div>
                </div>

                <div className={`score-player player2 ${currentPlayer === 'player2' ? 'current' : ''}`}>
                  <div className="score-player-emoji">💙</div>
                  <div className="score-player-name">Player 2</div>
                  <div className="score-player-points">{getPlayerDailyScore('player2', today)}</div>
                </div>
              </div>

              {/* Team Score */}
              <div className="score-team">
                <div className="score-team-label">Team Score</div>
                <div className="score-team-points">{teamScore}</div>
                {teamScore === 0 && (
                  <div className={`score-team-status ${myScore === 0 ? 'warning' : 'waiting'}`}>
                    {myScore === 0 ? '⚠️ Check-in + action needed!' : '⏳ Waiting for partner...'}
                  </div>
                )}
                {teamScore > 0 && <div className="score-team-status success">🎉 Both players active!</div>}
              </div>
            </div>
          </div>
        )}

        {/* Score Section - Solo Mode */}
        {gameMode === 'singleplayer' && (
          <div className="quick-stats" style={{ marginBottom: 20 }}>
            <div className="quick-stat">
              <div className="quick-stat-value" style={{ color: 'var(--accent-green)' }}>
                {myScore}
              </div>
              <div className="quick-stat-label">Today's XP</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value" style={{ color: 'var(--accent-orange)' }}>
                {streak.count}🔥
              </div>
              <div className="quick-stat-label">Streak</div>
            </div>
            <div className="quick-stat">
              <div className="quick-stat-value" style={{ color: 'var(--accent-gold)' }}>
                {totalXP}
              </div>
              <div className="quick-stat-label">Total XP</div>
            </div>
          </div>
        )}

        {/* Tabs Navigation */}
        <div className="tabs">
          <button className={activeTab === 'checkin' ? 'active' : ''} onClick={() => setActiveTab('checkin')}>
            <Heart size={18} className="tab-icon" />
            <span>Check-in</span>
          </button>
          <button className={activeTab === 'actions' ? 'active' : ''} onClick={() => setActiveTab('actions')}>
            <Zap size={18} className="tab-icon" />
            <span>Actions</span>
          </button>
          <button className={activeTab === 'reading' ? 'active' : ''} onClick={() => setActiveTab('reading')}>
            <Book size={18} className="tab-icon" />
            <span>Reading</span>
          </button>
          <button className={activeTab === 'stats' ? 'active' : ''} onClick={() => setActiveTab('stats')}>
            <Trophy size={18} className="tab-icon" />
            <span>Stats</span>
          </button>
        </div>

                {/* ==================== CHECK-IN TAB ==================== */}
                {activeTab === 'checkin' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2>
              <Sparkles size={20} />
              Daily Check-in
            </h2>

            {/* Check-in Status */}
            <div className={`checkin-status ${hasCheckedInToday ? 'unlocked' : 'locked'}`}>
              {hasCheckedInToday ? (
                <>
                  <Unlock size={24} className="status-icon" />
                  <span className="status-text">✓ Checked in today!</span>
                </>
              ) : (
                <>
                  <Lock size={24} className="status-icon" />
                  <span className="status-text">Check-in to unlock actions</span>
                </>
              )}
            </div>

            {/* Check-in Form */}
            {!hasCheckedInToday && (
              <div style={{ marginBottom: 24 }}>
                <textarea
                  value={checkinText}
                  onChange={(e) => setCheckinText(e.target.value)}
                  placeholder="How are you feeling today? What's on your mind?"
                  rows={3}
                />
                <button
                  className="btn btn-primary btn-full btn-lg"
                  onClick={addCheckin}
                  disabled={!checkinText.trim()}
                >
                  <CheckCircle size={20} />
                  Check In (+10 XP)
                </button>
              </div>
            )}

            {/* Daily Goal Progress */}
            {hasCheckedInToday && (
              <div className="daily-goal">
                <div className="daily-goal-header">
                  <div className="daily-goal-title">
                    <Target size={18} className="goal-icon" />
                    Daily Progress
                  </div>
                  <div className="daily-goal-count">
                    <span>{todayActions.length}</span> / 3 actions
                  </div>
                </div>
                <div className="daily-goal-bar">
                  <div
                    className={`daily-goal-fill ${todayActions.length >= 3 ? 'complete' : ''}`}
                    style={{ width: `${Math.min((todayActions.length / 3) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="daily-goal-milestones">
                  <div className={`milestone ${todayActions.length >= 1 ? 'reached' : ''}`}>
                    <div className="milestone-dot"></div>
                    <span>1</span>
                  </div>
                  <div className={`milestone ${todayActions.length >= 2 ? 'reached' : ''}`}>
                    <div className="milestone-dot"></div>
                    <span>2</span>
                  </div>
                  <div className={`milestone ${todayActions.length >= 3 ? 'reached' : ''}`}>
                    <div className="milestone-dot"></div>
                    <span>3</span>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Check-ins */}
            <div className="section-divider"></div>
            <h3>Recent Check-ins</h3>

            {checkins.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📝</div>
                <div className="empty-state-title">No check-ins yet</div>
                <div className="empty-state-text">Start your journey by checking in today!</div>
              </div>
            ) : (
              <div className="card-list">
                {checkins.slice(0, 5).map((checkin) => (
                  <div key={checkin.id} className="card">
                    <div className="card-icon checkin">{checkin.userId === 'player1' ? '❤️' : '💙'}</div>
                    <div className="card-content">
                      <div className="card-title">{checkin.text}</div>
                      <div className="card-subtitle">
                        {checkin.date} • {checkin.userId === 'player1' ? 'Player 1' : 'Player 2'}
                      </div>
                    </div>
                    {checkin.hasActions && <div className="card-points">+XP</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

                {/* ==================== ACTIONS TAB ==================== */}
                {activeTab === 'actions' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2>
              <Zap size={20} />
              Log Actions
            </h2>

            {/* Locked State */}
            {!hasCheckedInToday ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <div className="empty-state-icon">🔒</div>
                <div className="empty-state-title">Actions Locked</div>
                <div className="empty-state-text">
                  Complete your daily check-in first to unlock actions and earn XP!
                </div>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setActiveTab('checkin')}>
                  Go to Check-in
                </button>
              </div>
            ) : (
              <>
                {/* Action Type Selector */}
                <div className="action-type-grid">
                  {ACTION_TYPES.map((action) => (
                    <button
                      key={action.type}
                      className={`action-type-btn ${action.type} ${
                        selectedActionType === action.type ? 'selected' : ''
                      }`}
                      onClick={() => setSelectedActionType(action.type)}
                    >
                      <span className="action-type-icon">{action.icon}</span>
                      <span className="action-type-label">{action.label}</span>
                      {action.bonus && selectedActionType === action.type && (
                        <span style={{ fontSize: 10, color: 'var(--accent-gold)' }}>+30</span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Action Input */}
                <input
                  type="text"
                  value={actionDescription}
                  onChange={(e) => setActionDescription(e.target.value)}
                  placeholder="What did you accomplish?"
                  onKeyPress={(e) => e.key === 'Enter' && addAction()}
                />

                <button
                  className="btn btn-success btn-full btn-lg"
                  onClick={addAction}
                  disabled={!actionDescription.trim()}
                >
                  <Zap size={20} />
                  Log Action (+
                  {todayActions.length === 0
                    ? '20'
                    : selectedActionType === 'workout' || selectedActionType === 'study'
                    ? '30'
                    : '10'}{' '}
                  XP)
                </button>

                {/* Scoring Info */}
                <div className="scoring-info">
                  <h3>
                    <TrendingUp size={16} />
                    XP Guide
                  </h3>
                  <ul className="scoring-list">
                    <li>
                      <span className="score-label">
                        <CheckCircle size={14} />
                        Daily Check-in
                      </span>
                      <span className="score-value">+10 XP</span>
                    </li>
                    <li>
                      <span className="score-label">
                        <Star size={14} />
                        First Action
                      </span>
                      <span className="score-value">+20 XP</span>
                    </li>
                    <li>
                      <span className="score-label">
                        <Zap size={14} />
                        Extra Actions
                      </span>
                      <span className="score-value">+10 XP</span>
                    </li>
                    <li>
                      <span className="score-label">
                        <Flame size={14} />
                        Workout / Study
                      </span>
                      <span className="score-value bonus">+30 XP</span>
                    </li>
                  </ul>
                </div>

                {/* Today's Actions */}
                {todayActions.length > 0 && (
                  <>
                    <div className="section-divider"></div>
                    <h3>Today's Actions ({todayActions.length})</h3>
                    <div className="card-list" style={{ maxHeight: 200 }}>
                      {todayActions.map((action) => (
                        <div key={action.id} className="card">
                          <div className={`card-icon ${action.type}`}>{getActionIcon(action.type)}</div>
                          <div className="card-content">
                            <div className="card-title">{action.description}</div>
                            <div className="card-subtitle">{action.type}</div>
                          </div>
                          <div className="card-points">+{action.points}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Recent Actions */}
                <div className="section-divider"></div>
                <h3>Recent Actions</h3>
                {actions.filter((a) => a.date !== today).length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">⚡</div>
                    <div className="empty-state-title">No past actions</div>
                    <div className="empty-state-text">Your action history will appear here</div>
                  </div>
                ) : (
                  <div className="card-list" style={{ maxHeight: 220 }}>
                    {actions
                      .filter((a) => a.date !== today)
                      .slice(0, 8)
                      .map((action) => (
                        <div key={action.id} className="card">
                          <div className={`card-icon ${action.type}`}>{getActionIcon(action.type)}</div>
                          <div className="card-content">
                            <div className="card-title">{action.description}</div>
                            <div className="card-subtitle">{action.date}</div>
                          </div>
                          <div className="card-meta">
                            <span className="card-player">{action.userId === 'player1' ? '❤️' : '💙'}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

                {/* ==================== READING TAB ==================== */}
                {activeTab === 'reading' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2>
              <Book size={20} />
              Shared Reading List
            </h2>

            {/* Add Reading Form */}
            <div style={{ marginBottom: 20 }}>
              <input
                type="text"
                value={readingTitle}
                onChange={(e) => setReadingTitle(e.target.value)}
                placeholder="Article, video, or book title..."
              />
              <input
                type="url"
                value={readingUrl}
                onChange={(e) => setReadingUrl(e.target.value)}
                placeholder="URL (optional)"
              />
              <button className="btn btn-primary btn-full" onClick={addReading} disabled={!readingTitle.trim()}>
                <Book size={18} />
                Add Resource
              </button>
            </div>

            {/* Reading Progress */}
            {readings.length > 0 && (
              <div className="progress-section">
                <div className="progress-item">
                  <div className="progress-header">
                    <span className="progress-label">
                      <CheckCircle size={14} />
                      Completion Progress
                    </span>
                    <span className="progress-value">
                      {readings.filter((r) => r.completed).length} / {readings.length}
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className="progress-fill green"
                      style={{
                        width: `${(readings.filter((r) => r.completed).length / readings.length) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Reading List */}
            <div className="section-divider"></div>
            <h3>Resources ({readings.length})</h3>

            {readings.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📚</div>
                <div className="empty-state-title">No resources yet</div>
                <div className="empty-state-text">Add articles, videos, or books to share with your partner!</div>
              </div>
            ) : (
              <div className="card-list" style={{ maxHeight: 350 }}>
                {readings.map((reading) => (
                  <div key={reading.id} className={`reading-card ${reading.completed ? 'completed' : ''}`}>
                    <div className={`reading-icon ${reading.addedBy}`}>
                      {reading.addedBy === 'player1' ? '❤️' : '💙'}
                    </div>
                    <div className="reading-content">
                      <div className="reading-title">{reading.title}</div>
                      {reading.url && (
                        <a href={reading.url} target="_blank" rel="noopener noreferrer" className="reading-link">
                          <ExternalLink size={12} />
                          Open Link
                        </a>
                      )}
                    </div>
                    <div className="reading-actions">
                      <button
                        className={`toggle-complete ${reading.completed ? 'completed' : ''}`}
                        onClick={() => toggleReading(reading.id, reading.completed)}
                        title={reading.completed ? 'Mark incomplete' : 'Mark complete'}
                      >
                        <CheckCircle size={20} />
                      </button>
                      <button
                        className="delete-btn"
                        onClick={() => deleteReading(reading.id)}
                        title="Delete"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

                {/* ==================== STATS TAB ==================== */}
                {activeTab === 'stats' && (
          <div style={{ animation: 'fadeIn 0.3s ease' }}>
            <h2>
              <Trophy size={20} />
              Stats & Badges
            </h2>

            {/* Streak Display */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div className={`streak-badge ${streak.status}`}>
                <span className="streak-icon">{streak.status === 'fire' ? '🔥' : '❄️'}</span>
                <span>{streak.count > 0 ? `${streak.count} Day Streak!` : 'Start your streak today!'}</span>
              </div>
            </div>

            {/* Level Progress */}
            <div className="stats-card" style={{ marginBottom: 20 }}>
              <h3>
                <Star size={16} />
                Level Progress
              </h3>
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>⭐</div>
                <div
                  style={{
                    fontSize: 32,
                    fontWeight: 800,
                    color: 'var(--accent-gold)',
                    marginBottom: 4,
                  }}
                >
                  Level {levelData.level}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    marginBottom: 16,
                  }}
                >
                  {getLevelTitle(levelData.level)}
                </div>
                <div className="xp-bar-wrapper" style={{ marginBottom: 8 }}>
                  <div className="xp-bar-glow" style={{ width: `${levelData.progress}%` }}></div>
                  <div className="xp-bar-fill" style={{ width: `${levelData.progress}%` }}></div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {levelData.currentXP} / {levelData.xpForNext} XP to next level
                </div>
              </div>
            </div>

            {/* Badges Grid */}
            <h3>
              <Award size={16} />
              Badges Earned ({badges.length})
            </h3>

            {badges.length === 0 ? (
              <div className="badges-empty">
                <div className="badges-empty-icon">🏅</div>
                <div className="badges-empty-text">
                  Keep grinding to earn badges!
                  <br />
                  Complete workouts, studies, and maintain streaks.
                </div>
              </div>
            ) : (
              <div className="badges-grid">
                {badges.map((badge, idx) => (
                  <div key={idx} className="badge-card">
                    <span className="badge-icon">{badge.icon}</span>
                    <div className="badge-name">{badge.name}</div>
                    <div className="badge-desc">{badge.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Personal Stats */}
            <div className="section-divider"></div>
            <div className="stats-card">
              <h3>
                <TrendingUp size={16} />
                Your Stats
              </h3>
              <div className="stats-list">
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">⚡</div>
                    Total XP
                  </div>
                  <div className="stat-value highlight">{totalXP}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">📅</div>
                    Today's XP
                  </div>
                  <div className="stat-value green">{myScore}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">✅</div>
                    Total Check-ins
                  </div>
                  <div className="stat-value">{checkins.filter((c) => c.userId === currentPlayer).length}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">🎯</div>
                    Total Actions
                  </div>
                  <div className="stat-value">{actions.filter((a) => a.userId === currentPlayer).length}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">💪</div>
                    Workouts
                  </div>
                  <div className="stat-value">
                    {actions.filter((a) => a.userId === currentPlayer && a.type === 'workout').length}
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">📖</div>
                    Study Sessions
                  </div>
                  <div className="stat-value">
                    {actions.filter((a) => a.userId === currentPlayer && a.type === 'study').length}
                  </div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">📚</div>
                    Resources Shared
                  </div>
                  <div className="stat-value">{readings.filter((r) => r.addedBy === currentPlayer).length}</div>
                </div>
                <div className="stat-row">
                  <div className="stat-label">
                    <div className="stat-label-icon">🔥</div>
                    Current Streak
                  </div>
                  <div className="stat-value" style={{ color: 'var(--accent-orange)' }}>
                    {streak.count} days
                  </div>
                </div>
              </div>
            </div>

            {/* Team Stats - Only in Multiplayer */}
            {gameMode === 'multiplayer' && (
              <>
                <div className="section-divider"></div>
                <div className="stats-card">
                  <h3>
                    <Heart size={16} />
                    Team Stats
                  </h3>
                  <div className="stats-list">
                    <div className="stat-row">
                      <div className="stat-label">
                        <div className="stat-label-icon">🏆</div>
                        Today's Team Score
                      </div>
                      <div className="stat-value highlight">{teamScore}</div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-label">
                        <div className="stat-label-icon">❤️</div>
                        Player 1 Today
                      </div>
                      <div className="stat-value pink">{getPlayerDailyScore('player1', today)}</div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-label">
                        <div className="stat-label-icon">💙</div>
                        Player 2 Today
                      </div>
                      <div className="stat-value blue">{getPlayerDailyScore('player2', today)}</div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-label">
                        <div className="stat-label-icon">⚡</div>
                        Player 1 Total XP
                      </div>
                      <div className="stat-value pink">{getTotalXP('player1')}</div>
                    </div>
                    <div className="stat-row">
                      <div className="stat-label">
                        <div className="stat-label-icon">⚡</div>
                        Player 2 Total XP
                      </div>
                      <div className="stat-value blue">{getTotalXP('player2')}</div>
                    </div>
                  </div>
                </div>

                {/* Versus Display */}
                <div className="section-divider"></div>
                <h3 style={{ textAlign: 'center' }}>Today's Battle</h3>
                <div className="versus-display">
                  <div className="versus-player player1">
                    <div className="versus-avatar">❤️</div>
                    <div className="versus-name">Player 1</div>
                    <div className="versus-score">{getPlayerDailyScore('player1', today)}</div>
                  </div>
                  <div className="versus-vs">VS</div>
                  <div className="versus-player player2">
                    <div className="versus-avatar">💙</div>
                    <div className="versus-name">Player 2</div>
                    <div className="versus-score">{getPlayerDailyScore('player2', today)}</div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Footer */}
        <footer>
          <div className="footer-text">
            Building our future together
            <span className="footer-heart">💚</span>
            one step at a time
          </div>
        </footer>
      </div>
    </>
  );
};

export default ModernGoalsApp;