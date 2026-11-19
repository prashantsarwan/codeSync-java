import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import toast from 'react-hot-toast';
import {
  Code2, Play, Save, Sparkles, Copy, Users, Mic, MicOff,
  MessageSquare, Terminal as TermIcon, X, Plus, Crown,
  Volume2, VolumeX, LogOut, Loader2, FileCode, ChevronRight,
  Send, Bug, Zap, HelpCircle, Clock
} from 'lucide-react';
import api from '../../api/axios.js';
import { getSocket } from '../../api/socket.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useVoiceChat from '../../hooks/useVoiceChat.js';
import './Room.css';

const LANG_MAP = {
  javascript: 'javascript', python: 'python', java: 'java',
  cpp: 'cpp', c: 'c', typescript: 'typescript',
};

export default function Room() {
  const { code } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();

  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [users, setUsers] = useState([]);
  const [cursors, setCursors] = useState({});
  const [messages, setMessages] = useState([]);
  const [typing, setTyping] = useState(null);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiPanel, setAiPanel] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showFiles, setShowFiles] = useState(true);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFile, setShowNewFile] = useState(false);
  const [rightTab, setRightTab] = useState('chat');

  const socketRef = useRef(null);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef({});
  const typingTimeout = useRef(null);

  const voice = useVoiceChat({
    roomCode: code,
    user,
    socket: socketRef.current,
    isHost: room && room.host && (room.host._id === user?.id || room.host._id === user?._id),
  });

  // -------- Initial load --------
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await api.post('/rooms/' + code + '/join');
        if (!mounted) return;
        setRoom(data);
        setFiles(data.files || []);
        setActiveFile(data.activeFile || (data.files?.[0]?.name));

        const s = getSocket();
        socketRef.current = s;
        
        // Socket ko connect karein agar connected nahi hai
        if (!s.connected) {
          s.connect();
        }

        // Ek baar connect hone ke baad hi join-room event bhejein
        s.on('connect', () => {
          console.log("Socket Connected successfully!");
          s.emit('join-room', {
            roomCode: code,
            userId: user._id || user.id,
            userName: user.name,
            userColor: user.color || '#06B6D4',
          });
        });

        // ... (baaki ke saare s.on('room-users', ... ) waise hi rahenge)

        s.on('room-users', setUsers);
        s.on('cursor-update', ({ userId, name, color, position }) => {
          setCursors((prev) => ({ ...prev, [userId]: { name, color, position } }));
        });
        s.on('chat-message', (msg) => setMessages((prev) => [...prev, msg]));
        s.on('typing', ({ userName, isTyping }) => setTyping(isTyping ? userName : null));
        s.on('user-joined', ({ name }) => toast.success(name + ' joined'));
        s.on('user-left', ({ name }) => toast(name + ' left'));
        s.on('file-change', ({ fileName, content }) => {
          setFiles((prev) => prev.map((f) => f.name === fileName ? { ...f, content } : f));
        });
        s.on('file-created', (file) => setFiles((prev) => [...prev, file]));
        s.on('file-deleted', (fileName) => {
          setFiles((prev) => prev.filter((f) => f.name !== fileName));
        });
        s.on('active-file-change', (fileName) => setActiveFile(fileName));
        s.on('doc-state', () => {});
        s.on('kicked', () => { toast.error('You were kicked from the room'); nav('/lobby'); });
        s.on('force-mute', (muted) => { voice.setSelfMuted(muted); });
      }catch (err) {
        console.error("JOIN ROOM API ERROR:", err.response || err); // <-- Ye line asli error dikhayegi
        toast.error((err.response && err.response.data && err.response.data.message) || 'Cannot join room');
        // nav('/lobby'); // <-- Ise comment out kar dein taaki redirect na ho
      }
    })();

    return () => {
      mounted = false;
      const s = socketRef.current;
      if (s) {
        s.emit('voice-leave', { roomCode: code, userName: user?.name });
        s.off();
        s.disconnect();
      }
    };
    // eslint-disable-next-line
  }, [code]);

  // -------- Cursor decorations --------
  const updateCursorDecorations = useCallback(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const newDecorations = [];

    Object.entries(cursors).forEach(([userId, { name, color, position }]) => {
      if (!position) return;
      if (userId === (user._id || user.id)) return;
      newDecorations.push({
        range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column + 1),
        options: {
          className: 'remote-cursor',
          beforeContentClassName: 'remote-cursor-before',
          afterContentClassName: 'remote-cursor-after',
          hoverMessage: { value: name },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    });

    decorationsRef.current.remote = editor.deltaDecorations(
      decorationsRef.current.remote || [],
      newDecorations
    );
  }, [cursors, user]);

  useEffect(() => { updateCursorDecorations(); }, [updateCursorDecorations]);

  const handleEditorChange = (value) => {
    if (!activeFile) return;
    setFiles((prev) => prev.map((f) => f.name === activeFile ? { ...f, content: value } : f));
    const s = socketRef.current;
    if (s) s.emit('file-change', { roomCode: code, fileName: activeFile, content: value });
  };

  const handleCursorPositionChange = (e) => {
    const s = socketRef.current;
    if (!s) return;
    s.emit('cursor-update', {
      roomCode: code,
      userId: user._id || user.id,
      name: user.name,
      color: user.color || '#06B6D4',
      position: e.position,
    });
  };

  const currentFile = files.find((f) => f.name === activeFile);

  // -------- Actions --------
  const runCode = async () => {
    if (!currentFile) return;
    setRunning(true);
    setOutput('$ Running ' + currentFile.name + '...\n');
    try {
      const { data } = await api.post('/execute', {
        code: currentFile.content,
        language: currentFile.language,
      });
      let out = '';
      if (data.stdout) out += data.stdout;
      if (data.stderr) out += '\n[STDERR]\n' + data.stderr;
      out += '\n[Process exited with code ' + data.code + ']';
      setOutput((prev) => prev + out);
    } catch (err) {
      setOutput((prev) => prev + '[ERROR] ' + ((err.response && err.response.data && err.response.data.message) || err.message));
    } finally { setRunning(false); }
  };

  const saveRoom = async () => {
    setSaving(true);
    try {
      await api.put('/rooms/' + code, { files, activeFile });
      toast.success('Saved');
    } catch (err) { toast.error('Save failed'); }
    finally { setSaving(false); }
  };

  const askAI = async (action, query) => {
    if (!currentFile) return;
    setAiPanel(true);
    setAiLoading(true);
    setAiResponse('');
    try {
      const { data } = await api.post('/ai/review', {
        action,
        code: currentFile.content,
        language: currentFile.language,
        query: query || '',
      });
      setAiResponse(data.response);
    } catch (err) {
      setAiResponse('AI service unavailable. Try again.');
    } finally { setAiLoading(false); }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const s = socketRef.current;
    if (!s) return;
    s.emit('chat-message', {
      roomCode: code,
      user: { name: user.name, color: user.color || '#06B6D4' },
      message: chatInput.trim(),
      timestamp: Date.now(),
    });
    setChatInput('');
  };

  const handleChatTyping = (val) => {
    setChatInput(val);
    const s = socketRef.current;
    if (!s) return;
    s.emit('typing', { roomCode: code, userName: user.name, isTyping: val.length > 0 });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      s.emit('typing', { roomCode: code, userName: user.name, isTyping: false });
    }, 1500);
  };

  const switchFile = (name) => {
    setActiveFile(name);
    const s = socketRef.current;
    if (s) s.emit('active-file-change', { roomCode: code, fileName: name });
  };

    const createNewFile = async () => {
    if (!newFileName.trim()) return;
    const ext = newFileName.split('.').pop();
    const langMap = { js: 'javascript', py: 'python', java: 'java', cpp: 'cpp', c: 'c', ts: 'typescript' };
    const language = langMap[ext] || 'javascript';
    
    try {
      // Backend ko call karein taaki naya file database mein save ho jaye (Hello World ke sath)
      const { data } = await api.post(`/rooms/${code}/files`, {
        fileName: newFileName.trim(),
        language: language
      });
      
      // Backend se aayi hui nayi file list update karein
      setFiles(data.files);
      switchFile(newFileName.trim());
      
      const s = socketRef.current;
      if (s) s.emit('file-created', { roomCode: code, file: data.files.find(f => f.name === newFileName.trim()) });
      
      toast.success("File created!");
    } catch (err) {
      toast.error("Failed to create file");
    }
    
    setNewFileName('');
    setShowNewFile(false);
  };

  const deleteFile = (name) => {
    if (files.length === 1) return toast.error('Cannot delete last file');
    setFiles((prev) => prev.filter((f) => f.name !== name));
    if (activeFile === name) switchFile(files.find((f) => f.name !== name).name);
    const s = socketRef.current;
    if (s) s.emit('file-deleted', { roomCode: code, fileName: name });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Room code copied: ' + code);
  };

  const isHost = room && room.host && ((room.host._id === (user?._id || user?.id)));

  if (!room) return <div className="room-loading"><Loader2 className="spin" size={28} /> Loading room...</div>;

  return (
    <div className="room">
      {/* ============ TOP BAR ============ */}
      <div className="room-topbar">
        <div className="topbar-left">
          <Link to="/lobby" className="topbar-logo">
            <Code2 size={18} color="#06B6D4" />
          </Link>
          <div className="room-code-badge" onClick={copyCode} title="Copy code">
            ROOM: {code} <Copy size={12} />
          </div>
          <span className="topbar-online">
            <span className="status-dot online" /> {users.length} online
          </span>
        </div>

        <div className="topbar-center">
          <button className="btn btn-sm" onClick={runCode} disabled={running}>
            {running ? <Loader2 size={13} className="spin" /> : <Play size={13} />}
            {running ? 'Running...' : 'Run'}
          </button>
          <button className="btn btn-sm" onClick={saveRoom} disabled={saving}>
            <Save size={13} /> {saving ? 'Saving...' : 'Save'}
          </button>
          <button className="btn btn-sm btn-primary" onClick={() => askAI('explain')}>
            <Sparkles size={13} /> Ask AI
          </button>
        </div>

        <div className="topbar-right">
          <div className="user-badge" title={user?.name}>
            <span className="avatar-dot" style={{ background: user?.color || '#06B6D4' }} />
            {user?.name}
            {isHost && <Crown size={12} color="#F59E0B" />}
          </div>
          <button className="btn btn-sm" onClick={() => setShowChat(!showChat)}>
            <MessageSquare size={13} />
          </button>
        </div>
      </div>

      {/* ============ MAIN LAYOUT ============ */}
      <div className="room-body">
        {/* LEFT: Files + Collaborators + Voice */}
        {showFiles && (
          <aside className="sidebar-left">
            {/* Files */}
            <div className="panel">
              <div className="panel-head">
                <span>FILES</span>
                <button className="icon-btn" onClick={() => setShowNewFile(true)}><Plus size={13} /></button>
              </div>
              <div className="file-list">
                {files.map((f) => (
                  <div
                    key={f.name}
                    className={'file-item' + (f.name === activeFile ? ' active' : '')}
                    onClick={() => switchFile(f.name)}
                  >
                    <FileCode size={13} />
                    <span className="file-name">{f.name}</span>
                    {files.length > 1 && (
                      <button
                        className="file-del"
                        onClick={(e) => { e.stopPropagation(); deleteFile(f.name); }}
                        title="Delete"
                      ><X size={11} /></button>
                    )}
                  </div>
                ))}
                {showNewFile && (
                  <div className="new-file-row">
                    <input
                      className="input new-file-input"
                      placeholder="file.py"
                      value={newFileName}
                      onChange={(e) => setNewFileName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && createNewFile()}
                      autoFocus
                    />
                    <button className="icon-btn" onClick={createNewFile}><ChevronRight size={13} /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Collaborators */}
            <div className="panel">
              <div className="panel-head"><span>COLLABORATORS ({users.length})</span></div>
              <div className="collab-list">
                {users.map((u) => {
                  const targetSocketId = u.socketId;
                  const isMe = u.id === (user?._id || user?.id);
                  return (
                    <div key={targetSocketId} className="collab-item">
                      <span className="avatar-dot" style={{ background: u.color || '#06B6D4' }} />
                      <div className="collab-info">
                        <div className="collab-name">
                          {u.name} {isMe && <span className="you-tag">you</span>}
                          {u.id === room.host._id && <Crown size={10} color="#F59E0B" />}
                        </div>
                        <div className="collab-status">
                          <span className="status-dot online" /> online
                          {u.speaking && <span className="speaking-badge">● speaking</span>}
                          {u.muted && <span className="muted-badge"><MicOff size={9} /> muted</span>}
                        </div>
                      </div>
                      {isHost && !isMe && (
                        <div className="collab-actions">
                          <button
                            className="icon-btn"
                            onClick={() => socketRef.current.emit('host-mute-user', {
                              roomCode: code, targetSocketId, muted: !u.muted,
                            })}
                            title={u.muted ? 'Unmute' : 'Mute'}
                          >
                            {u.muted ? <Volume2 size={12} /> : <VolumeX size={12} />}
                          </button>
                          <button
                            className="icon-btn danger"
                            onClick={() => {
                              if (window.confirm('Kick ' + u.name + '?'))
                                socketRef.current.emit('host-kick-user', { roomCode: code, targetSocketId });
                            }}
                            title="Kick"
                          ><LogOut size={12} /></button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Voice Chat */}
            <div className="panel voice-panel">
              <div className="panel-head"><span>VOICE CHAT</span></div>
              <div className="voice-body">
                <div className="voice-status">
                  {voice.inCall ? (
                    <>
                      <span className="status-dot online" />
                      <span>{voice.participants + 1} connected</span>
                    </>
                  ) : (
                    <span className="text-mut">Not in call</span>
                  )}
                </div>
                {!voice.inCall ? (
                  <button className="btn btn-primary voice-btn" onClick={voice.join}>
                    <Mic size={13} /> Join Voice
                  </button>
                ) : (
                  <>
                    <button
                      className={'btn voice-btn ' + (voice.pushToTalkActive ? 'btn-primary' : 'btn-ghost')}
                      onMouseDown={voice.startPTT}
                      onMouseUp={voice.stopPTT}
                      onMouseLeave={voice.stopPTT}
                      onTouchStart={voice.startPTT}
                      onTouchEnd={voice.stopPTT}
                    >
                      <Mic size={13} />
                      {voice.pushToTalkActive ? 'Speaking...' : 'Hold to Talk'}
                    </button>
                    <div className="voice-actions">
                      <button
                        className={'btn btn-sm ' + (voice.selfMuted ? 'btn-danger' : '')}
                        onClick={() => voice.toggleMute()}
                      >
                        {voice.selfMuted ? <MicOff size={12} /> : <Mic size={12} />}
                        {voice.selfMuted ? 'Unmute' : 'Mute'}
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={voice.leave}>
                        <LogOut size={12} /> Leave
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </aside>
        )}

        {/* CENTER: Editor + Output */}
        <main className="editor-area">
          <div className="editor-tabs">
            {files.map((f) => (
              <div
                key={f.name}
                className={'editor-tab' + (f.name === activeFile ? ' active' : '')}
                onClick={() => switchFile(f.name)}
              >
                <FileCode size={11} /> {f.name}
              </div>
            ))}
          </div>

          <div className="editor-wrap">
            <Editor
              height="100%"
              language={LANG_MAP[currentFile?.language] || 'javascript'}
              value={currentFile?.content || ''}
              onChange={handleEditorChange}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                editor.onDidChangeCursorPosition(handleCursorPositionChange);
              }}
              theme="vs-dark"
              options={{
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                padding: { top: 14 },
                renderLineHighlight: 'all',
                lineNumbersMinChars: 3,
              }}
            />
          </div>

          {/* Console */}
          <div className="console">
            <div className="console-head">
              <TermIcon size={13} />
              <span>CONSOLE (TERMINAL)</span>
              <button className="icon-btn" onClick={() => setOutput('')}>Clear</button>
            </div>
            <pre className="console-body mono">{output || '// Click "Run" to execute code'}</pre>
          </div>
        </main>

        {/* RIGHT: Chat / AI */}
        {showChat && (
          <aside className="sidebar-right">
            <div className="right-tabs">
              <button
                className={'right-tab' + (rightTab === 'chat' ? ' active' : '')}
                onClick={() => setRightTab('chat')}
              >
                <MessageSquare size={12} /> Chat
              </button>
              <button
                className={'right-tab' + (rightTab === 'ai' ? ' active' : '')}
                onClick={() => setRightTab('ai')}
              >
                <Sparkles size={12} /> AI
              </button>
              <button className="right-tab-close" onClick={() => setShowChat(false)}>
                <X size={14} />
              </button>
            </div>

            {rightTab === 'chat' && (
              <>
                <div className="chat-body">
                  {messages.length === 0 && (
                    <p className="chat-empty">No messages yet. Say hi! 👋</p>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className="chat-msg">
                      <span className="chat-avatar" style={{ background: m.user.color }}>
                        {m.user.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="chat-bubble">
                        <div className="chat-meta">
                          <span className="chat-name" style={{ color: m.user.color }}>{m.user.name}</span>
                          <span className="chat-time mono">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="chat-text">{m.message}</div>
                      </div>
                    </div>
                  ))}
                  {typing && <div className="typing-indicator">{typing} is typing...</div>}
                </div>
                <form className="chat-input-wrap" onSubmit={sendMessage}>
                  <input
                    className="chat-input"
                    placeholder="Message collaborators..."
                    value={chatInput}
                    onChange={(e) => handleChatTyping(e.target.value)}
                  />
                  <button className="chat-send" type="submit"><Send size={14} /></button>
                </form>
              </>
            )}

            {rightTab === 'ai' && (
              <div className="ai-panel-body">
                <div className="ai-quick">
                  <button className="ai-q" onClick={() => askAI('explain')}>
                    <HelpCircle size={12} /> Explain Code
                  </button>
                  <button className="ai-q" onClick={() => askAI('bugs')}>
                    <Bug size={12} /> Find Bugs
                  </button>
                  <button className="ai-q" onClick={() => askAI('optimize')}>
                    <Zap size={12} /> Optimize
                  </button>
                  <button className="ai-q" onClick={() => askAI('complexity')}>
                    <Clock size={12} /> Complexity
                  </button>
                </div>

                <div className="ai-response">
                  {aiLoading ? (
                    <div className="ai-loading"><Loader2 className="spin" size={16} /> AI is thinking...</div>
                  ) : aiResponse ? (
                    <pre className="ai-text">{aiResponse}</pre>
                  ) : (
                    <p className="ai-empty">Pick an action above or ask a question below 👇</p>
                  )}
                </div>

                <form className="ai-input-wrap" onSubmit={(e) => { e.preventDefault(); if (aiQuestion.trim()) { askAI('ask', aiQuestion); setAiQuestion(''); } }}>
                  <input
                    className="chat-input"
                    placeholder="Ask anything about the code..."
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                  />
                  <button className="chat-send" type="submit"><Send size={14} /></button>
                </form>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
