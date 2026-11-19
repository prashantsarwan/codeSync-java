import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Code2, Plus, LogIn, LogOut, Clock, Users, X, Loader2 } from 'lucide-react';
import api from '../../api/axios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import './Lobby.css';

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'typescript', label: 'TypeScript' },
];

export default function Lobby() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [myRooms, setMyRooms] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', language: 'javascript' });
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/rooms/my').then((r) => setMyRooms(r.data)).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post('/rooms', createForm);
      toast.success('Room created: ' + data.code);
      nav('/room/' + data.code);
    } catch (err) {
      toast.error((err.response && err.response.data && err.response.data.message) || 'Failed');
    } finally { setLoading(false); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) return toast.error('Enter room code');
    setLoading(true);
    try {
      await api.post('/rooms/' + joinCode.toUpperCase() + '/join');
      toast.success('Joined!');
      nav('/room/' + joinCode.toUpperCase());
    } catch (err) {
      toast.error((err.response && err.response.data && err.response.data.message) || 'Room not found');
    } finally { setLoading(false); }
  };

  const handleLogout = () => { logout(); nav('/'); };

  return (
    <div className="lobby">
      <nav className="lobby-nav">
        <Link to="/" className="lobby-logo">
          <Code2 size={22} color="#06B6D4" />
          <span>CodeSync</span>
        </Link>
        <div className="lobby-nav-right">
          <span className="lobby-user">
            <span className="avatar-dot" style={{ background: user?.color || '#06B6D4' }} />
            {user?.name}
          </span>
          <button onClick={handleLogout} className="btn"><LogOut size={14} /> Logout</button>
        </div>
      </nav>

      <div className="lobby-content">
        <div className="lobby-header">
          <div>
            <h1>Welcome back, <span className="neon-text">{user?.name?.split(' ')[0]}</span></h1>
            <p>Create a room or join an existing one</p>
          </div>
        </div>

        <div className="action-cards">
          <button className="action-card glass" onClick={() => setShowCreate(true)}>
            <div className="action-icon"><Plus size={26} /></div>
            <h3>Create Room</h3>
            <p>Start a fresh collaborative session</p>
          </button>
          <button className="action-card glass" onClick={() => setShowJoin(true)}>
            <div className="action-icon"><LogIn size={26} /></div>
            <h3>Join Room</h3>
            <p>Enter a 6-character room code</p>
          </button>
        </div>

        <h2 className="section-h">Recent Rooms</h2>
        {myRooms.length === 0 ? (
          <div className="empty glass">
            <p>No rooms yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="room-list">
            {myRooms.map((r) => (
              <Link to={'/room/' + r.code} key={r._id} className="room-item glass">
                <div className="room-item-left">
                  <div className="room-code">{r.code}</div>
                  <div>
                    <p className="room-name">{r.name}</p>
                    <p className="room-meta">
                      <Clock size={11} /> {new Date(r.lastActivity).toLocaleDateString()}
                      <Users size={11} style={{ marginLeft: 12 }} /> {r.members?.length || 1}
                    </p>
                  </div>
                </div>
                <span className="btn btn-sm">Open</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowCreate(false)}><X size={18} /></button>
            <h2>Create a Room</h2>
            <form onSubmit={handleCreate}>
              <label>Room Name</label>
              <input className="input" placeholder="e.g. Interview Prep — DSA"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                autoFocus />
              <label>Language</label>
              <select className="input" value={createForm.language}
                onChange={(e) => setCreateForm({ ...createForm, language: e.target.value })}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
              <button className="btn btn-primary modal-btn" disabled={loading}>
                {loading ? <><Loader2 size={14} className="spin" /> Creating...</> : 'Create Room'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showJoin && (
        <div className="modal-overlay" onClick={() => setShowJoin(false)}>
          <div className="modal glass" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowJoin(false)}><X size={18} /></button>
            <h2>Join a Room</h2>
            <p className="modal-sub">Enter the 6-character room code</p>
            <form onSubmit={handleJoin}>
              <input className="input join-code-input mono" placeholder="ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                autoFocus />
              <button className="btn btn-primary modal-btn" disabled={loading}>
                {loading ? <><Loader2 size={14} className="spin" /> Joining...</> : 'Join Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
