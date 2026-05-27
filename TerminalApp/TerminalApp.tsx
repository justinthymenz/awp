import React, { useState, useEffect } from 'react';
import { Clock, ShieldAlert, Target, Play, CheckCircle2 } from 'lucide-react';

export default function TerminalApp() {
  // Manual Header State
  const [meetingCode, setMeetingCode] = useState('');
  const [raceNumber, setRaceNumber] = useState('');
  
  // Timer State
  const [timer, setTimer] = useState(300); // 5 minutes (300 seconds)
  const [timerRunning, setTimerRunning] = useState(false);
  
  // Dashboard & Layman State
  const [warningAlert, setWarningAlert] = useState('');
  const [totalBankroll] = useState(2500); // Anchored at 5 x $500 groups
  
  // 1-15 Matrix State
  const [runners, setRunners] = useState(
    Array.from({ length: 15 }, (_, i) => ({ id: i + 1, price: '1.00', stake: 0, status: 'AWAITING DATA' }))
  );

  // Manual Timer Countdown Logic
  useEffect(() => {
    let interval;
    if (timerRunning && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning, timer]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Manual Typing Handler
  const handleManualPrice = (id, newPrice) => {
    setRunners(runners.map(r => {
      if (r.id === id) {
        return { ...r, price: newPrice };
      }
      return r;
    }));
  };

  // $0.10 Stepper Logic
  const handlePriceStep = (id, delta) => {
    setRunners(runners.map(r => {
      if (r.id === id) {
        const currentPrice = Number(r.price) || 1.00;
        const newPrice = Math.max(1.00, +(currentPrice + delta).toFixed(2));
        return { ...r, price: newPrice.toFixed(2) };
      }
      return r;
    }));
  };

  // Core Math, Rounding up, & Stop-Loss
  const calculateStakes = () => {
    // Layman Error Alert 1: Check for valid market prices
    const hasValidPrice = runners.some(r => Number(r.price) > 2.00);
    if (!hasValidPrice) {
      setWarningAlert('Hold on! You need at least one horse priced above $2.00 to process the investment matrix.');
      return;
    }
    setWarningAlert('');

    // Coverage Logic & Rule 4 Stop-Loss
    const updatedRunners = runners.map(r => {
      const numericPrice = Number(r.price);
      if (numericPrice > 2.00) {
        const impliedProb = 1 / numericPrice;
        
        // No Profit Margin Alert
        if (impliedProb >= 1.0) {
          return { ...r, status: 'AVOID - NO PROFIT MARGIN', stake: 0 };
        }
        
        // Calculate Target-Profit Allocation and Round UP to nearest whole dollar
        const rawStake = 100 / numericPrice; // Core spread allocation logic
        const requiredStake = Math.ceil(rawStake); // Mathematical whole dollar round up
        
        // Rule 4: 5% Stop Loss Check (5% of $500 group bankroll = $25)
        if (requiredStake > 25) {
          return { ...r, status: '🛑 STOP-LOSS LIMIT HIT', stake: 0 };
        }
        
        return { ...r, status: 'TARGET-PROFIT ALLOCATION', stake: requiredStake };
      }
      return r;
    });
    
    setRunners(updatedRunners);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-[#e0e0e0] font-sans p-4 md:p-8">
      
      {/* MEMBER DASHBOARD WRAPPER */}
      <div className="max-w-6xl mx-auto mb-8 bg-[#121212] border border-[#C5A059]/20 rounded-xl p-6 flex flex-col md:flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#C5A059] mb-1">Inner Circle Dashboard</h1>
          <p className="text-sm text-gray-400">Total Trading Bankroll: <span className="text-white font-mono">${totalBankroll.toFixed(2)}</span></p>
          <p className="text-sm text-gray-400">Active Funds (Groups 1-5): $500.00 each</p>
        </div>
        <div className="mt-4 md:mt-0 flex gap-3">
          <span className="px-4 py-2 bg-green-900/20 text-green-500 text-sm font-semibold rounded-lg flex items-center gap-2">
            <CheckCircle2 size={16} /> Subscription: Active
          </span>
        </div>
      </div>

      {/* RACEDAY TERMINAL / SMART-SPREAD CALCULATOR */}
      <div className="max-w-6xl mx-auto bg-[#121212] border border-[#333] rounded-xl overflow-hidden shadow-2xl">
        
        {/* MANUAL HEADER MODULE */}
        <div className="bg-[#1A1A1A] p-6 border-b border-[#333] flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Meeting Code</label>
              <input 
                type="text" 
                placeholder="e.g. M1"
                value={meetingCode}
                onChange={(e) => setMeetingCode(e.target.value.toUpperCase())}
                className="bg-[#050505] border border-[#333] text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#C5A059] uppercase w-32"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Race Number</label>
              <input 
                type="number" 
                placeholder="e.g. 4"
                value={raceNumber}
                onChange={(e) => setRaceNumber(e.target.value)}
                className="bg-[#050505] border border-[#333] text-white px-4 py-2 rounded-lg focus:outline-none focus:border-[#C5A059] w-32 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>

          {/* MANUAL TIMER CONTROLS */}
          <div className="flex items-center gap-4 bg-[#050505] border border-[#333] p-2 rounded-lg">
            <div className={`text-3xl font-mono font-bold px-4 ${timer <= 180 && timer > 0 ? 'text-amber-500 animate-pulse' : 'text-[#C5A059]'}`}>
              {formatTime(timer)}
            </div>
            <button 
              onClick={() => setTimerRunning(!timerRunning)}
              className="bg-[#C5A059]/10 text-[#C5A059] hover:bg-[#C5A059]/20 px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-colors"
            >
              <Play size={16} /> {timerRunning ? 'PAUSE' : 'SYNC WARNING'}
            </button>
          </div>
        </div>

        {/* LAYMAN ALERT BANNER */}
        {warningAlert && (
          <div className="bg-red-900/30 border-l-4 border-red-500 p-4 m-6 flex items-center gap-3">
            <ShieldAlert className="text-red-500" size={24} />
            <p className="text-red-200 text-sm font-medium">{warningAlert}</p>
          </div>
        )}
        {(timer <= 180 && timer > 175) && (
           <div className="bg-amber-900/30 border-l-4 border-amber-500 p-4 mx-6 mt-6 flex items-center gap-3 animate-pulse">
            <Clock className="text-amber-500" size={24} />
            <p className="text-amber-200 text-sm font-medium">WARNING: 3 MIN TO JUMP - VERIFY ODDS</p>
          </div>
        )}

        {/* RACE BOARD MATRIX */}
        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#333] text-xs text-gray-500 uppercase tracking-widest">
                <th className="py-3 px-4 w-20">Runner</th>
                <th className="py-3 px-4 w-48">Market Price</th>
                <th className="py-3 px-4">Coverage Logic Status</th>
                <th className="py-3 px-4 text-right">Required Stake</th>
              </tr>
            </thead>
            <tbody>
              {runners.map((runner) => (
                <tr key={runner.id} className="border-b border-[#222] hover:bg-[#1A1A1A] transition-colors">
                  <td className="py-3 px-4 font-mono text-lg text-gray-300">#{runner.id}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handlePriceStep(runner.id, -0.10)} className="w-8 h-8 bg-[#333] hover:bg-[#444] rounded flex items-center justify-center font-bold">-</button>
                      <input 
                        type="number" 
                        step="any"
                        value={runner.price}
                        onChange={(e) => handleManualPrice(runner.id, e.target.value)}
                        className="w-20 bg-[#050505] border border-[#444] text-center py-1 rounded font-mono text-white focus:outline-none focus:border-[#C5A059] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <button onClick={() => handlePriceStep(runner.id, 0.10)} className="w-8 h-8 bg-[#333] hover:bg-[#444] rounded flex items-center justify-center font-bold">+</button>
                    </div>
                  </td>
                  <td className={`py-3 px-4 text-xs font-bold tracking-wider ${
                    runner.status.includes('AVOID') || runner.status.includes('STOP') ? 'text-red-400' : 
                    runner.status.includes('TARGET') ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    {runner.status}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-mono text-lg font-bold ${runner.stake > 0 ? 'text-[#C5A059]' : 'text-gray-600'}`}>
                      ${runner.stake.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ACTION FOOTER */}
        <div className="bg-[#1A1A1A] p-6 border-t border-[#333] flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-sm flex items-center gap-2">
            <Target size={16} className="text-[#C5A059]" /> Smart-Spread Calculator Active
          </p>
          <div className="flex gap-4 w-full md:w-auto">
            <button 
              onClick={calculateStakes}
              className="flex-1 md:flex-none bg-[#C5A059] hover:bg-[#d4af37] text-black px-8 py-3 rounded-lg font-bold tracking-wide transition-colors uppercase"
            >
              Process Investment
            </button>
            <button 
              className="flex-1 md:flex-none bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-lg font-bold tracking-wide transition-colors uppercase"
            >
              LOCK IN STAKES
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
