import { Link } from 'react-router-dom';
import { Code2, Users, Bot, Mic, Zap, Terminal, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import './Home.css';

export default function Home() {
  const { isAuth } = useAuth();

  return (
    <div className="home">
      <nav className="home-nav">
        <Link to="/" className="home-logo">
          <Code2 size={22} color="#06B6D4" />
          <span>CodeSync</span>
        </Link>
        <div className="home-nav-links">
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          {isAuth ? (
            <Link to="/lobby" className="btn btn-primary">Go to Lobby <ArrowRight size={14} /></Link>
          ) : (
            <>
              <Link to="/login" className="btn">Login</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      <section className="hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <span className="hero-badge">◆ Real-Time Collaborative IDE</span>
          <h1 className="hero-title">
            Code Together.<br />
            <span className="neon-text">From Anywhere.</span>
          </h1>
          <p className="hero-sub">
            A Google Docs for code — with real-time editing, voice chat, AI code review,
            and 40+ language execution. Built for pair programming and interviews.
          </p>
          <div className="hero-actions">
            <Link to={isAuth ? '/lobby' : '/register'} className="btn btn-primary hero-cta">
              Start Coding Now <ArrowRight size={16} />
            </Link>
            <a href="#features" className="btn hero-cta">Learn More</a>
          </div>

          <div className="hero-preview glass">
            <div className="preview-bar">
              <span className="preview-dot" style={{ background: '#EF4444' }} />
              <span className="preview-dot" style={{ background: '#F59E0B' }} />
              <span className="preview-dot" style={{ background: '#10B981' }} />
              <span className="preview-room">ROOM: CS-194-ALPHA</span>
              <span className="preview-live">● 3 online</span>
            </div>
            <div className="preview-code mono">
              <div><span className="ln">1</span><span className="kw">def</span> <span className="fn">fibonacci</span>(n):</div>
              <div><span className="ln">2</span>  <span className="kw">if</span> n &lt;= <span className="nm">1</span>:</div>
              <div><span className="ln">3</span>    <span className="kw">return</span> n</div>
              <div><span className="ln">4</span>  <span className="kw">return</span> <span className="fn">fibonacci</span>(n-<span className="nm">1</span>) + <span className="fn">fibonacci</span>(n-<span className="nm">2</span>)<span className="cursor cursor-pink">Riya</span></div>
              <div><span className="ln">5</span></div>
              <div><span className="ln">6</span><span className="fn">print</span>(<span className="fn">fibonacci</span>(<span className="nm">10</span>))<span className="cursor cursor-cyan">You</span></div>
            </div>
            <div className="preview-console mono">
              <div className="pc-head">CONSOLE</div>
              <div>$ python main.py</div>
              <div className="pc-ok">[OK] 55</div>
            </div>
          </div>
        </div>
      </section>

      <section className="features" id="features">
        <h2 className="section-title">Everything You Need to <span className="neon-text">Build Together</span></h2>
        <div className="features-grid">
          {[
            { icon: <Users size={22} />, t: 'Real-Time Editing', d: 'Multiple cursors, live sync, zero conflicts with CRDT-based editing (Yjs).' },
            { icon: <Mic size={22} />, t: 'Voice Chat', d: 'WebRTC-powered voice with push-to-talk. Host can mute or kick users.' },
            { icon: <Bot size={22} />, t: 'AI Code Review', d: 'Explain, find bugs, optimize, or ask anything — powered by Gemini & Groq.' },
            { icon: <Terminal size={22} />, t: '40+ Languages', d: 'Run code instantly with Piston API. JS, Python, Java, C++, Go, Rust and more.' },
            { icon: <Zap size={22} />, t: 'Monaco Editor', d: 'The same editor powering VS Code — syntax highlighting, autocomplete, themes.' },
            { icon: <Code2 size={22} />, t: 'Room System', d: 'Create rooms, share 6-character codes, invite friends with a single link.' },
          ].map((f, i) => (
            <div key={i} className="feature-card glass">
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.t}</h3>
              <p>{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how" id="how">
        <h2 className="section-title">How It <span className="neon-text">Works</span></h2>
        <div className="steps">
          {[
            { n: '01', t: 'Create Room', d: 'Pick a name and language. Get a 6-char room code.' },
            { n: '02', t: 'Invite Friends', d: 'Share the code. They join instantly from anywhere.' },
            { n: '03', t: 'Code Together', d: 'Live editing with cursors, chat, and voice.' },
            { n: '04', t: 'Run & Review', d: 'Execute code, ask AI, ship faster together.' },
          ].map((s) => (
            <div key={s.n} className="step-card glass">
              <span className="step-num">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-card glass">
          <h2>Ready to Code <span className="neon-text">Together?</span></h2>
          <p>Join developers collaborating in real-time. Free forever.</p>
          <Link to={isAuth ? '/lobby' : '/register'} className="btn btn-primary cta-btn">
            Get Started Free <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <p>© {new Date().getFullYear()} CodeSync — Built with MERN + Yjs + WebRTC</p>
      </footer>
    </div>
  );
}
