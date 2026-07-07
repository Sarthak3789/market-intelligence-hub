import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, UserPlus, TrendingUp, AlertCircle, CheckCircle2, LineChart as LineChartIcon, LogOut, Loader2, Search, Trash2, ChevronDown, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from 'recharts';

const POPULAR_TICKERS = [
  "AAPL", "NVDA", "TSLA", "MSFT", "AMZN", "META", "GOOG", "NFLX", "AMD", 
  "JPM", "V", "WMT", "JNJ", "PG", "MA", "UNH", "HD", "BAC", "DIS", 
  "CSCO", "XOM", "CVX", "PEP", "KO", "PFE", "INTC", "QCOM", "TXN", 
  "AVGO", "COST", "MCD", "NKE", "BTC-USD", "ETH-USD"
];
const CHART_COLORS = ['#b45309', '#059669', '#2563eb', '#db2777', '#7c3aed', '#ea580c', '#0891b2', '#4f46e5'];

const MarketSimulator = ({ onAddTicker, liveData }) => {
  // Double the array for seamless infinite scroll
  const scrollItems = [...liveData, ...liveData];

  return (
    <div className="w-full bg-black/80 backdrop-blur-md border-b border-white/10 z-50 overflow-hidden py-2 fixed top-0 left-0 shadow-lg">
      <div className="flex items-center relative h-8">
        <div className="px-6 border-r border-white/20 flex items-center bg-black absolute left-0 z-10 h-full shadow-[20px_0_20px_-10px_rgba(0,0,0,0.8)]">
           <Activity className="w-4 h-4 mr-2 text-amber-400" />
           <span className="text-white font-bold text-xs tracking-wider uppercase whitespace-nowrap">Live Market</span>
        </div>
        <div className="w-full overflow-hidden ml-40 pl-4">
          {liveData.length > 0 ? (
            <div className="animate-marquee-horizontal">
              {scrollItems.map((item, idx) => (
                <div 
                  key={`${item.ticker}-${idx}`}
                  onClick={() => onAddTicker(item.ticker)}
                  className="flex items-center px-8 border-r border-white/10 cursor-pointer hover:bg-white/10 transition-colors group"
                >
                  <span className="font-bold text-gray-300 group-hover:text-white mr-3 transition-colors">{item.ticker}</span>
                  <span className="text-amber-400 text-sm font-mono font-medium">${item.price.toFixed(2)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-8 text-white/50 text-xs flex items-center">
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Connecting to market feed...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SentimentCard = ({ stock, info, portfolioItems, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [historyPrice, setHistoryPrice] = useState([]);

  useEffect(() => {
    if (isHovered && historyPrice.length === 0) {
      fetch(`/portfolio/history_price/${stock}`)
        .then(res => res.json())
        .then(data => setHistoryPrice(data))
        .catch(console.error);
    }
  }, [isHovered, stock, historyPrice.length]);

  const pItem = portfolioItems?.find(p => p.ticker === stock);
  const hasPosition = pItem && pItem.shares > 0;
  const totalCost = hasPosition ? pItem.shares * pItem.buy_price : 0;
  const currentValue = hasPosition ? pItem.shares * info.current_price : 0;
  const pnl = currentValue - totalCost;
  const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;
  const pnlColor = pnl >= 0 ? 'text-emerald-600' : 'text-red-600';

  const isPos = info.overall_sentiment === 'Positive';
  const isNeg = info.overall_sentiment === 'Negative';
  const badgeColor = isPos ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                  : isNeg ? 'bg-red-100 text-red-800 border-red-200' 
                  : 'bg-gray-100 text-gray-800 border-gray-200';

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="bg-white/80 backdrop-blur-xl border border-white/50 shadow-lg rounded-2xl overflow-hidden relative transition-all duration-500 ease-in-out"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-6">
        <div className="flex justify-between items-start sm:items-center flex-col sm:flex-row border-b border-gray-200/50 pb-4 mb-4 gap-4">
          <div>
            <div className="flex items-center space-x-4">
              <h3 className="text-3xl font-extrabold text-gray-800">{stock}</h3>
              {info.current_price > 0 && (
                <span className="text-2xl font-light text-gray-500 tracking-tight flex items-center space-x-3">
                  <span>${info.current_price.toFixed(2)}</span>
                  {hasPosition && (
                    <span className={`text-lg font-bold ${pnlColor} bg-white/50 px-2 py-1 rounded-lg border border-gray-100`}>
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)} ({pnlPercent.toFixed(2)}%)
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 font-medium mt-1 flex items-center">
              <ChevronDown className={`w-4 h-4 mr-1 transition-transform ${isHovered ? 'rotate-180 text-amber-600' : ''}`} />
              Hover for Market Deep Dive
            </p>
          </div>
          <div className={`px-4 py-1.5 rounded-full border font-bold text-sm tracking-wide ${badgeColor} shadow-sm`}>
            {info.overall_sentiment}
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">AI Audit Log</h4>
          {info.details?.slice(0, 3).map((d, i) => {
            const dPos = d.sentiment === 'Positive';
            const dNeg = d.sentiment === 'Negative';
            const dColor = dPos ? 'text-emerald-600' : dNeg ? 'text-red-600' : 'text-gray-500';
            
            return (
              <div key={i} className="flex items-start space-x-3 text-sm group/audit">
                <span className={`font-bold min-w-[70px] ${dColor}`}>[{d.sentiment}]</span>
                <span className="text-gray-700 leading-snug truncate flex-1">{d.headline}</span>
                {d.link && (
                  <a 
                    href={d.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover/audit:opacity-100 transition-opacity bg-gray-100 hover:bg-amber-100 text-amber-700 hover:text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-xs whitespace-nowrap font-medium"
                  >
                    Read Article
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hover State Reveal */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-gray-50/90 border-t border-gray-200 px-6 py-5 overflow-hidden"
          >
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wider">7-Day Price Correlation</h4>
              <button 
                onClick={(e) => { e.stopPropagation(); onRemove(stock); }}
                className="text-red-500 hover:text-red-700 bg-red-50 px-3 py-1 rounded border border-red-100 flex items-center text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3 h-3 mr-1" /> Remove
              </button>
            </div>
            
            {historyPrice.length > 0 ? (
              <div className="h-40 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={historyPrice}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={['auto', 'auto']} hide />
                    <Tooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                      formatter={(val) => [`$${val}`, 'Close Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke="#d97706" strokeWidth={2} fillOpacity={1} fill="url(#colorPrice)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 w-full flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isVerifyMode, setIsVerifyMode] = useState(false);
  const [verifyCode, setVerifyCode] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authStatus, setAuthStatus] = useState({ type: '', msg: '' });

  const [ticker, setTicker] = useState('');
  const [shares, setShares] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [portfolioStatus, setPortfolioStatus] = useState('');
  const [portfolioItems, setPortfolioItems] = useState([]);
  const [liveData, setLiveData] = useState([]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sentimentResults, setSentimentResults] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const fetchPortfolio = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/portfolio`, { headers: { 'Authorization': `Bearer ${user.token}` } });
      const data = await res.json();
      setPortfolioItems(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/portfolio/history`, { headers: { 'Authorization': `Bearer ${user.token}` } });
      const data = await res.json();
      setHistoryData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthStatus({ type: '', msg: '' });
    if (!email || !password || (!isLoginMode && !username)) {
      setAuthStatus({ type: 'error', msg: 'Please enter all required fields.' });
      return;
    }

    const endpoint = isLoginMode ? '/login' : '/signup';
    const payload = isLoginMode ? { email, password } : { email, username, password };
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      
      if (res.ok) {
        if (data.requires_verification) {
          setIsVerifyMode(true);
          setAuthStatus({ type: 'success', msg: `Code sent to ${email}` });
        } else {
          setUser({ ...data.user, token: data.access_token });
        }
      } else {
        if (data.detail === 'unverified') {
          setIsVerifyMode(true);
          setAuthStatus({ type: 'error', msg: 'Account not verified. Sign up again to resend code.' });
        } else {
          setAuthStatus({ type: 'error', msg: data.detail || 'Authentication failed.' });
        }
      }
    } catch (err) {
      setAuthStatus({ type: 'error', msg: 'Server connection failed.' });
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setAuthStatus({ type: '', msg: '' });
    try {
      const res = await fetch('/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verifyCode })
      });
      const data = await res.json();
      if (res.ok) {
        setUser({ ...data.user, token: data.access_token });
        setIsVerifyMode(false);
      } else {
        setAuthStatus({ type: 'error', msg: data.detail || 'Verification failed.' });
      }
    } catch (err) {
      setAuthStatus({ type: 'error', msg: 'Server connection failed.' });
    }
  };

  const addStockRaw = async (stockTicker) => {
    if (!stockTicker) return;
    try {
      const res = await fetch(`/portfolio/add`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ 
          ticker: stockTicker.toUpperCase(),
          shares: parseFloat(shares) || 0,
          buy_price: parseFloat(buyPrice) || 0
        })
      });
      
      if (res.ok) {
        setPortfolioStatus(`Added ${stockTicker.toUpperCase()}`);
        setTicker('');
        setShares('');
        setBuyPrice('');
        await fetchPortfolio();
        setTimeout(() => setPortfolioStatus(''), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddStockForm = async (e) => {
    e.preventDefault();
    addStockRaw(ticker);
  };

  const handleRemoveStock = async (tickerToRemove) => {
    try {
      const res = await fetch(`/portfolio/remove/${tickerToRemove}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (res.ok) {
        await fetchPortfolio();
        if (sentimentResults && sentimentResults[tickerToRemove]) {
          const newResults = { ...sentimentResults };
          delete newResults[tickerToRemove];
          setSentimentResults(Object.keys(newResults).length > 0 ? newResults : null);
        }
      }
    } catch (err) {
      console.error("Failed to remove stock", err);
    }
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setSentimentResults(null);
    try {
      const res = await fetch(`/portfolio/sentiment`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (data.message) {
        alert(data.message);
      } else {
        setSentimentResults(data);
        await fetchHistory();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPortfolio();
      fetchHistory();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    let ws = null;
    let isMounted = true;
    
    const connectWS = () => {
      const portfolioTickers = portfolioItems.map(i => i.ticker);
      const allTickers = Array.from(new Set([...POPULAR_TICKERS, ...portfolioTickers]));
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live_prices?tickers=${allTickers.join(',')}`;
      
      ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        if (!isMounted) return;
        const data = JSON.parse(event.data);
        setLiveData(data);
      };
      
      ws.onclose = () => {
        if (isMounted) {
          setTimeout(connectWS, 3000); // Auto-reconnect
        }
      };
    };
    
    connectWS();
    
    return () => {
      isMounted = false;
      if (ws) ws.close();
    };
  }, [portfolioItems, user]);

  // Extract unique tickers from historyData for the multi-line chart
  const historyTickers = historyData.length > 0 
    ? Object.keys(historyData[historyData.length - 1]).filter(k => k !== 'time') 
    : [];

  return (
    <div className="min-h-screen w-full flex">
      {/* Semi-transparent dark overlay */}
      <div className="fixed inset-0 bg-black/50 pointer-events-none" />

      {/* Main Content Area */}
      <main className="relative z-10 w-full flex flex-col items-center px-4 pb-4 pt-24 lg:px-8 lg:pb-8 lg:pt-32 overflow-y-auto">
        
        {/* Animated Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center mb-10 w-full max-w-4xl"
        >
          <div className="inline-flex items-center justify-center space-x-3 mb-2">
            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl shadow-xl border border-white/20">
              <LineChartIcon className="w-8 h-8 text-amber-400" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-lg">
              Market<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-300">Intel</span>
            </h1>
          </div>
          <p className="text-white/70 font-medium text-lg tracking-wide drop-shadow-md">Professional ML Sentiment Analysis</p>
        </motion.div>

        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div
              key="auth"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
              className="w-full max-w-md bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2rem] p-8"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                {isVerifyMode ? 'Verify Your Email' : isLoginMode ? 'Welcome Back' : 'Join the Platform'}
              </h2>
              
              {isVerifyMode ? (
                <form onSubmit={handleVerify} className="space-y-4">
                  <p className="text-sm text-gray-600 text-center mb-4">
                    We sent a 6-digit code to <span className="font-bold">{email}</span>.
                  </p>
                  <div>
                    <input 
                      type="text" 
                      placeholder="6-Digit Code" 
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value)}
                      maxLength={6}
                      className="w-full bg-white/70 border border-white/60 focus:border-amber-700/50 focus:ring-4 focus:ring-amber-700/10 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-500 outline-none transition-all shadow-inner text-center text-xl tracking-[0.5em] font-bold uppercase"
                    />
                  </div>
                  {authStatus.msg && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className={`flex items-center space-x-2 text-sm font-medium p-3 rounded-lg border ${authStatus.type === 'success' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-red-600 bg-red-50 border-red-100'}`}>
                      {authStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      <span>{authStatus.msg}</span>
                    </motion.div>
                  )}
                  <button 
                    type="submit" 
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl px-4 py-3.5 font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Verify Account</span>
                  </button>
                  <div className="mt-4 text-center">
                    <button 
                      type="button"
                      onClick={() => setIsVerifyMode(false)}
                      className="text-gray-500 hover:text-gray-700 text-sm transition-colors font-medium"
                    >
                      Back to login
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <form onSubmit={handleAuth} className="space-y-4">
                  <div>
                    <input 
                      type="email" 
                      placeholder="Email Address" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-white/70 border border-white/60 focus:border-amber-700/50 focus:ring-4 focus:ring-amber-700/10 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-500 outline-none transition-all shadow-inner"
                    />
                  </div>
                  {!isLoginMode && (
                    <div>
                      <input 
                        type="text" 
                        placeholder="Username (Public Display)" 
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-white/70 border border-white/60 focus:border-amber-700/50 focus:ring-4 focus:ring-amber-700/10 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-500 outline-none transition-all shadow-inner"
                      />
                    </div>
                  )}
                  <div>
                    <input 
                      type="password" 
                      placeholder="Password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-white/70 border border-white/60 focus:border-amber-700/50 focus:ring-4 focus:ring-amber-700/10 rounded-xl px-4 py-3 text-gray-800 placeholder-gray-500 outline-none transition-all shadow-inner"
                    />
                  </div>

                  {authStatus.msg && (
                    <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="flex items-center space-x-2 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                      <AlertCircle className="w-4 h-4" />
                      <span>{authStatus.msg}</span>
                    </motion.div>
                  )}

                  <button 
                    type="submit" 
                    className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-amber-800 to-orange-900 hover:from-amber-900 hover:to-orange-950 text-white rounded-xl px-4 py-3.5 font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
                  >
                    {isLoginMode ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    <span>{isLoginMode ? 'Sign In' : 'Create Account'}</span>
                  </button>
                  
                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-amber-900/10"></div>
                    <span className="flex-shrink-0 mx-4 text-amber-900/50 text-sm font-medium">or</span>
                    <div className="flex-grow border-t border-amber-900/10"></div>
                  </div>
                  
                  <button 
                    type="button" 
                    onClick={async () => {
                      try {
                        const res = await fetch('/login', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ email: 'demo@marketintel.ai', password: 'demo123' })
                        });
                        const data = await res.json();
                        if (res.ok) {
                          const userData = data.user;
                          userData.token = data.access_token;
                          setUser(userData);
                          localStorage.setItem('market_hub_user', JSON.stringify(userData));
                        }
                      } catch (err) {
                        console.error(err);
                      }
                    }}
                    className="w-full flex items-center justify-center space-x-2 bg-white/50 hover:bg-white/80 text-amber-900 border border-amber-900/20 rounded-xl px-4 py-3.5 font-semibold transition-all shadow hover:shadow-md active:translate-y-0"
                  >
                    <span>Explore as Guest (No Sign Up)</span>
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <button 
                    onClick={() => setIsLoginMode(!isLoginMode)}
                    className="text-amber-900 hover:text-amber-700 font-medium text-sm transition-colors"
                  >
                    {isLoginMode ? "Don't have an account? Sign up" : "Already have an account? Log in"}
                  </button>
                </div>
              </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="w-full max-w-4xl space-y-6"
            >
              {/* Dashboard Header */}
              <div className="flex justify-between items-center bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl rounded-2xl p-5">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-amber-950 font-bold text-lg shadow-inner">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <h3 className="font-semibold text-white text-lg drop-shadow-md">Welcome, {user.username}</h3>
                </div>
                <button 
                  onClick={() => setUser(null)}
                  className="flex items-center space-x-2 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 border border-white/20 px-4 py-2 rounded-lg transition-all text-sm font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>

              {/* Grid Layout for Portfolio & Actions */}
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* Build & Manage Portfolio */}
                <motion.div whileHover={{ scale: 1.01 }} className="bg-white/80 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2rem] p-6 lg:p-8 transition-transform">
                  <div className="flex items-center space-x-2 mb-6">
                    <TrendingUp className="w-6 h-6 text-amber-800" />
                    <h2 className="text-xl font-bold text-gray-800">Tracked Assets</h2>
                  </div>
                  
                  {/* Portfolio List */}
                  <div className="mb-6 space-y-2 max-h-40 overflow-y-auto pr-2">
                    <AnimatePresence>
                      {portfolioItems.length === 0 ? (
                        <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-gray-500 text-sm italic">
                          No assets currently tracked. Add one below.
                        </motion.p>
                      ) : (
                        portfolioItems.map((item) => {
                          const liveInfo = liveData.find(d => d.ticker === item.ticker);
                          const currentPrice = liveInfo ? liveInfo.price : 0;
                          const hasPosition = item.shares > 0;
                          const totalCost = hasPosition ? item.shares * item.buy_price : 0;
                          const currentValue = hasPosition ? item.shares * currentPrice : 0;
                          const pnl = currentValue - totalCost;
                          const pnlColor = pnl >= 0 ? 'text-emerald-500' : 'text-red-500';

                          return (
                            <motion.div 
                              key={item.ticker}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                              className="flex justify-between items-center bg-white/70 border border-gray-200 px-4 py-2 rounded-lg shadow-sm"
                            >
                              <div className="flex flex-col">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-gray-800">{item.ticker}</span>
                                  {currentPrice > 0 && <span className="text-xs font-bold text-gray-600">${currentPrice.toFixed(2)}</span>}
                                </div>
                                {hasPosition && (
                                  <span className="text-xs text-gray-500 font-medium mt-0.5">
                                    {item.shares} shs @ ${item.buy_price.toFixed(2)}
                                    {currentPrice > 0 && (
                                      <span className={`ml-2 font-bold ${pnlColor}`}>
                                        {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                                      </span>
                                    )}
                                  </span>
                                )}
                              </div>
                              <button 
                                onClick={() => handleRemoveStock(item.ticker)}
                                className="text-red-400 hover:text-red-600 transition-colors p-1 ml-2"
                                title="Remove from portfolio"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          );
                        })
                      )}
                    </AnimatePresence>
                  </div>

                  <form onSubmit={handleAddStockForm} className="grid grid-cols-2 gap-3 mt-4">
                    <input 
                      type="text" 
                      placeholder="Ticker (e.g. AAPL)" 
                      value={ticker}
                      onChange={(e) => setTicker(e.target.value)}
                      className="col-span-2 bg-white/80 border border-gray-300 focus:border-amber-700/50 focus:ring-4 focus:ring-amber-700/10 rounded-xl px-4 py-3 text-gray-800 outline-none transition-all shadow-inner uppercase font-semibold"
                    />
                    <input 
                      type="number" 
                      placeholder="Shares (Opt)" 
                      value={shares}
                      onChange={(e) => setShares(e.target.value)}
                      className="bg-white/80 border border-gray-300 focus:border-amber-700/50 rounded-xl px-4 py-2 text-gray-800 text-sm outline-none transition-all shadow-inner"
                    />
                    <input 
                      type="number" 
                      placeholder="Buy Price (Opt)" 
                      value={buyPrice}
                      onChange={(e) => setBuyPrice(e.target.value)}
                      className="bg-white/80 border border-gray-300 focus:border-amber-700/50 rounded-xl px-4 py-2 text-gray-800 text-sm outline-none transition-all shadow-inner"
                    />
                    <button type="submit" className="col-span-2 bg-gray-800 hover:bg-black text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg mt-1">
                      Add Asset
                    </button>
                  </form>
                  <AnimatePresence>
                    {portfolioStatus && (
                      <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} exit={{opacity:0}} className="mt-4 flex items-center space-x-2 text-emerald-700 text-sm font-medium">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{portfolioStatus}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Analysis Action */}
                <motion.div whileHover={{ scale: 1.01 }} className="bg-gradient-to-br from-amber-700 to-amber-950 backdrop-blur-2xl border border-white/20 shadow-2xl rounded-[2rem] p-6 lg:p-8 flex flex-col justify-center items-center text-center text-white relative overflow-hidden transition-transform">
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
                  
                  <h2 className="text-2xl font-bold mb-2 relative z-10">Live AI Evaluation</h2>
                  <p className="text-white/80 text-sm mb-8 max-w-[250px] relative z-10">Scrape live Google News and evaluate your portfolio using the enhanced ML Engine.</p>
                  
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || portfolioItems.length === 0}
                    className="w-full relative z-10 bg-white text-amber-900 hover:bg-orange-50 font-bold py-4 rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] hover:-translate-y-1 flex items-center justify-center space-x-2 disabled:opacity-80 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                    <span>{isAnalyzing ? 'Analyzing Markets...' : 'Analyze Sentiment'}</span>
                  </button>
                </motion.div>

              </div>

              {/* Chart & Results Grid */}
              <AnimatePresence>
                {(sentimentResults || historyData.length > 0) && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-6 pt-4"
                  >
                    {/* Multi-Line Recharts Historical Trend */}
                    {historyData.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl rounded-[2rem] p-6 lg:p-8 w-full"
                      >
                        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                          <LineChartIcon className="w-6 h-6 mr-2 text-amber-700" />
                          Multi-Asset Sentiment Trend
                        </h3>
                        <div className="h-72 w-full">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={historyData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                              <XAxis dataKey="time" stroke="#9ca3af" tick={{fill: '#6b7280', fontSize: 12}} dy={10} />
                              <YAxis domain={[-1.2, 1.2]} ticks={[-1, 0, 1]} tickFormatter={(val) => val === 1 ? 'Pos' : val === -1 ? 'Neg' : 'Neu'} stroke="#9ca3af" tick={{fill: '#6b7280', fontSize: 12}} dx={-10} />
                              <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(8px)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.5)', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                                labelStyle={{ color: '#374151', fontWeight: 'bold', marginBottom: '8px' }}
                              />
                              {historyTickers.map((tick, idx) => (
                                <Line 
                                  key={tick}
                                  type="monotone" 
                                  dataKey={tick} 
                                  name={tick}
                                  stroke={CHART_COLORS[idx % CHART_COLORS.length]} 
                                  strokeWidth={3}
                                  dot={{ fill: CHART_COLORS[idx % CHART_COLORS.length], strokeWidth: 2, r: 4 }}
                                  activeDot={{ r: 8, strokeWidth: 0 }}
                                  animationDuration={1500}
                                />
                              ))}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </motion.div>
                    )}

                    {/* Sentiment Cards with Hover Deep Dive */}
                    {sentimentResults && Object.entries(sentimentResults).map(([stock, info], index) => (
                      <SentimentCard 
                        key={stock} 
                        stock={stock} 
                        info={info} 
                        portfolioItems={portfolioItems}
                        onRemove={handleRemoveStock} 
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Moving Market Simulator Sidebar (Only shown if logged in) */}
      {user && <MarketSimulator onAddTicker={addStockRaw} liveData={liveData} />}

    </div>
  );
}
