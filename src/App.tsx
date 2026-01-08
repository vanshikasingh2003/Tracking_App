import React, { useState, useEffect } from 'react';
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
  Activity,
  User,
  ArrowLeft,
  Settings,
  Loader2,
  PauseCircle,
} from 'lucide-react';

// Firebase configuration (same as before)
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

const ModernGoalsApp: React.FC = () => {
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [playerSelected, setPlayerSelected] = useState(false);

  const [activeTab, setActiveTab] = useState('checkin');
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>(null);

  const [actions, setActions] = useState<Action[]>([]);
  const [selectedActionType, setSelectedActionType] = useState('workout');
  const [actionDescription, setActionDescription] = useState('');

  const [checkinText, setCheckinText] = useState('');
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  const [readingTitle, setReadingTitle] = useState('');
  const [readingUrl, setReadingUrl] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('currentPlayer');
    if (saved === 'player1' || saved === 'player2') {
      setCurrentPlayer(saved);
      setPlayerSelected(true);
    }
  }, []);

  const getTodayDate = () => new Date().toLocaleDateString();

  useEffect(() => {
    if (!currentPlayer) return;
    const today = getTodayDate();
    const checkedIn = checkins.some(
      (c) => c.userId === currentPlayer && c.date === today
    );
    setHasCheckedInToday(checkedIn);
  }, [checkins, currentPlayer]);

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

  const getActionPoints = (type: string, isFirstAction: boolean): number => {
    if (isFirstAction) return 20;
    if (type === 'workout' || type === 'study') return 30;
    return 10;
  };

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
      case 'workout': return <Dumbbell size={18} color="#FFD700" />;
      case 'study': return <Clock size={18} color="#FFD700" />;
      case 'reading': return <Book size={18} color="#FFD700" />;
      case 'work': return <Award size={18} color="#FFD700" />;
      case 'relationship': return <Heart size={18} color="#FFD700" />;
      default: return <Award size={18} color="#FFD700" />;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" aria-label="Loading">
        <Loader2 className="loading-icon" />
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '8px' }}>
          Loading Our World...
        </div>
      </div>
    );
  }

  if (!playerSelected || !currentPlayer) {
    return (
      <div className="glass-card" style={{ maxWidth: 400, marginTop: 48 }}>
        <header>
          <h1>Select Your Player</h1>
        </header>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: 24 }}>
          Who are you?
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-around', gap: '12px' }}>
          <button className="btn" onClick={() => selectPlayer('player1')} aria-label="Select Player 1">
            <div style={{ fontSize: 32 }}>❤️</div>
            Player 1
          </button>
          <button className="btn" onClick={() => selectPlayer('player2')} aria-label="Select Player 2">
            <div style={{ fontSize: 32 }}>💙</div>
            Player 2
          </button>
        </div>
      </div>
    );
  }

  if (!gameMode) {
    return (
      <div className="glass-card" style={{ maxWidth: 400, marginTop: 48 }}>
        <header>
          <h1>Our Adventure Log</h1>
          <button className="btn" onClick={switchPlayer}>Switch Player</button>
        </header>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: 24 }}>
          Playing as: {currentPlayer === 'player1' ? '❤️ You' : '💙 Baby'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <button className="btn" onClick={() => setGameMode('singleplayer')}>Solo Mode 🧍</button>
          <button className="btn" onClick={() => setGameMode('multiplayer')}>Team Mode 👥</button>
          <button className="btn" disabled style={{ cursor: 'not-allowed', opacity: 0.5 }}>PVP Mode ⚔️ (Coming Soon)</button>
        </div>
      </div>
    );
  }

  const today = getTodayDate();
  const todayActions = actions.filter((a) => a.userId === currentPlayer && a.date === today);
  const myScore = getPlayerDailyScore(currentPlayer, today);
  const otherPlayer: Player = currentPlayer === 'player1' ? 'player2' : 'player1';
  const otherScore = getPlayerDailyScore(otherPlayer, today);
  const teamScore = getTeamScore(today);

  return (
    <div className="glass-card" style={{ maxWidth: 480, margin: '24px auto' }}>
      <header>
        <button className="btn" onClick={() => setGameMode(null)} aria-label="Back">
          <ArrowLeft size={24} />
        </button>
        <h1 style={{ flexGrow: 1, textAlign: 'center' }}>
          {gameMode === 'multiplayer' ? 'Team Mode' : gameMode === 'pvp' ? 'PVP Mode' : 'Solo Mode'}
        </h1>
        <button className="btn" onClick={switchPlayer} aria-label="Switch Player">
          <User size={24} />
        </button>
      </header>

      {/* Scores */}
      {gameMode === 'multiplayer' && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: 6, color: 'var(--text-accent)' }}>
              Today's Scores
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '12px' }}>
              <div>
                <div style={{ color: '#FFD6D6', fontWeight: 600, marginBottom: 4 }}>❤️ You</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{myScore} pts</div>
              </div>
              <div>
                <div style={{ color: '#ADD8FF', fontWeight: 600, marginBottom: 4 }}>💙 Baby</div>
                <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{otherScore} pts</div>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Team Score</div>
            <div style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--text-accent)' }}>{teamScore}</div>
            {teamScore === 0 && (
              <div style={{ fontSize: '13px', color: 'tomato' }}>
                {myScore === 0 ? '⚠️ You need check-in + action' : '⏳ Waiting for partner'}
              </div>
            )}
          </div>
        </div>
      )}

      {gameMode === 'singleplayer' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, color: 'var(--text-primary)' }}>
          <div>Today: <strong>{myScore} pts</strong></div>
          <div>Streak: <strong>{getStreak()}</strong></div>
        </div>
      )}

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Sections Tabs">
        {[
          { id: 'checkin', icon: Heart, label: 'Check-in' },
          { id: 'actions', icon: Award, label: 'Actions' },
          { id: 'reading', icon: Book, label: 'Reading' },
          { id: 'badges', icon: Calendar, label: 'Stats' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={activeTab === tab.id ? 'active' : ''}
            aria-selected={activeTab === tab.id}
            role="tab"
            aria-controls={`${tab.id}-panel`}
            id={`${tab.id}-tab`}
          >
            <tab.icon size={20} style={{ marginBottom: 2 }} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Content Panels */}
      <section
        id="checkin-panel"
        role="tabpanel"
        aria-labelledby="checkin-tab"
        hidden={activeTab !== 'checkin'}
      >
        <h2>💬 Daily Check-in</h2>

        <div className={`card`} style={{ backgroundColor: hasCheckedInToday ? 'rgba(50,50,50,0.4)' : 'rgba(100,20,20,0.4)', marginBottom: '20px', justifyContent: 'center' }}>
          {hasCheckedInToday ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#4caf50' }}>
              <Unlock size={24} />
              <span>✓ Checked In</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#f44336' }}>
              <Lock size={24} />
              <span>⚠️ Check-in Required</span>
            </div>
          )}
        </div>

        {!hasCheckedInToday && (
          <>
            <textarea
              value={checkinText}
              onChange={(e) => setCheckinText(e.target.value)}
              placeholder="What did you do today?"
              aria-label="Check-in text"
            />
            <button onClick={addCheckin} className="btn">Check In Today (+10 pts)</button>
          </>
        )}

        <div>
          <h3>Recent Check-ins</h3>
          <div className="card-list" aria-live="polite" aria-relevant="additions">
            {checkins.slice(0, 5).map((checkin) => (
              <article key={checkin.id} className="card" role="listitem" tabIndex={0}>
                <div style={{ fontWeight: 600, color: checkin.userId === 'player1' ? '#ff6699' : '#6699ff' }}>
                  {checkin.userId === 'player1' ? '❤️ You' : '💙 Baby'}
                </div>
                <small>{checkin.date}</small>
                <p>{checkin.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="actions-panel"
        role="tabpanel"
        aria-labelledby="actions-tab"
        hidden={activeTab !== 'actions'}
      >
        <h2>🏆 Log Actions</h2>

        {!hasCheckedInToday ? (
          <div className="card" style={{ backgroundColor: 'rgba(200, 50, 50, 0.35)', justifyContent: 'center' }}>
            <Lock size={48} color="#f44336"/>
            <p>Check in first to unlock actions</p>
          </div>
        ) : (
          <>
            <select
              value={selectedActionType}
              onChange={(e) => setSelectedActionType(e.target.value)}
              aria-label="Select action type"
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
              aria-label="Action description"
            />
            <button onClick={addAction} className="btn" disabled={!hasCheckedInToday}>
              Log Action {todayActions.length === 0 ? '(+20 pts)' : '(+10-30 pts)'}
            </button>

            <div style={{ marginTop: '16px' }}>
              <h3>📊 Scoring:</h3>
              <ul>
                <li>• Check-in: +10</li>
                <li>• First action: +20</li>
                <li>• Extra actions: +10</li>
                <li>• Workout/Study bonus: +30</li>
              </ul>
            </div>

            <div style={{marginTop: '20px'}}>
              <h3>Today's Actions ({todayActions.length})</h3>
              <div className="card-list">
                {todayActions.map((action) => (
                  <article key={action.id} className="card" role="listitem">
                    <span>{getAchievementIcon(action.type)}</span>
                    <div className="description">
                      <p>{action.description}</p>
                      <small>{action.type}</small>
                    </div>
                    <div style={{ color: '#4caf50' }}>+{action.points}</div>
                  </article>
                ))}
              </div>
            </div>

            <div style={{marginTop: '20px'}}>
              <h3>Recent Actions</h3>
              <div className="card-list" style={{maxHeight: '220px'}}>
                {actions.filter(a => a.date !== today).slice(0, 5).map((action) => (
                  <article key={action.id} className="card" role="listitem">
                    <span style={{color: action.userId === 'player1' ? '#ff6699' : '#6699ff'}}>
                      {getAchievementIcon(action.type)}
                    </span>
                    <div className="description">
                      <p>{action.description}</p>
                      <small>{action.date}</small>
                    </div>
                    <span style={{ color: action.userId === 'player1' ? '#ff6699' : '#6699ff' }}>
                      {action.userId === 'player1' ? '❤️' : '💙'}
                    </span>
                  </article>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <section
        id="reading-panel"
        role="tabpanel"
        aria-labelledby="reading-tab"
        hidden={activeTab !== 'reading'}
      >
        <h2>📚 Shared Reading List</h2>
        <input
          value={readingTitle}
          onChange={(e) => setReadingTitle(e.target.value)}
          placeholder="Article/Video title"
          aria-label="Reading title"
        />
        <input
          value={readingUrl}
          onChange={(e) => setReadingUrl(e.target.value)}
          placeholder="URL (optional)"
          aria-label="Reading URL"
        />
        <button onClick={addReading} className="btn">Add Resource</button>

        <div className="card-list" style={{maxHeight: '250px', marginTop: 16}}>
          {readings.map((reading) => (
            <article
              key={reading.id}
              className="card"
              style={{backgroundColor: reading.completed ? 'rgba(50,150,50,0.2)' : 'var(--panel-bg)'}}
              role="listitem"
              tabIndex={0}
            >
              <div className="description" style={{flexGrow: 1}}>
                <div style={{color: reading.addedBy === 'player1' ? '#ff6699' : '#6699ff', marginBottom: 4}}>
                  {reading.addedBy === 'player1' ? '❤️' : '💙'}
                  <span style={{marginLeft: 8, textDecoration: reading.completed ? 'line-through' : 'none'}}>
                    {reading.title}
                  </span>
                </div>
                {reading.url && (
                  <a href={reading.url} target="_blank" rel="noopener noreferrer" style={{color: '#1e90ff', fontSize: '12px'}}>
                    🔗 Link
                  </a>
                )}
              </div>
              <div>
                <button onClick={() => toggleReading(reading.id, reading.completed)} aria-label={reading.completed ? 'Mark incomplete' : 'Mark complete'}>
                  <CheckCircle size={20} color={reading.completed ? '#4caf50' : '#999'} />
                </button>
                <button onClick={() => deleteReading(reading.id)} aria-label="Delete reading" style={{marginLeft: '8px'}}>
                  <Trash2 size={20} color="#f44336" />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        id="badges-panel"
        role="tabpanel"
        aria-labelledby="badges-tab"
        hidden={activeTab !== 'badges'}
      >
        <h2>🏅 Badges & Stats</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
          {getBadges().map((badge, idx) => (
            <div key={idx} className="card" style={{flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>{badge.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{badge.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{badge.desc}</div>
            </div>
          ))}
          {getBadges().length === 0 && (
            <div style={{ gridColumn: 'span 2', color: 'var(--text-secondary)', fontSize: 14, textAlign: 'center', padding: 24 }}>
              Keep grinding to earn badges! 💪
            </div>
          )}
        </div>

        <div className="card" style={{ flexDirection: 'column', gap: 14 }}>
          <h3>Your Stats</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Today's Score:</span><span style={{ fontWeight: 600, color: '#4caf50' }}>{myScore} pts</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Actions:</span><span style={{ fontWeight: 600 }}>{actions.filter((a) => a.userId === currentPlayer).length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Check-ins:</span><span style={{ fontWeight: 600 }}>{checkins.filter((c) => c.userId === currentPlayer).length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Resources Shared:</span><span style={{ fontWeight: 600 }}>{readings.filter((r) => r.addedBy === currentPlayer).length}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Streak:</span><span style={{ fontWeight: 600 }}>{getStreak()}</span>
          </div>
        </div>

        {gameMode === 'multiplayer' && (
          <div className="card" style={{ marginTop: 20, flexDirection: 'column', gap: 14 }}>
            <h3>👥 Team Stats</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Today's Team Score:</span><span style={{ fontWeight: 600, color: 'var(--text-accent)' }}>{teamScore} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>❤️ Your Score:</span><span style={{ fontWeight: 600, color: '#ff6699' }}>{myScore} pts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>💙 Partner Score:</span><span style={{ fontWeight: 600, color: '#6699ff' }}>{otherScore} pts</span>
            </div>
          </div>
        )}
      </section>

      <footer style={{ marginTop: 24 }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          Building our future together, one step at a time 💚
        </div>
      </footer>
    </div>
  );
};

export default ModernGoalsApp;