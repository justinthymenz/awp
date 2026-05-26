import React, { useState, useEffect } from 'react';

const GROUPS = [
  [1, 6, 11],
  [2, 7, 12],
  [3, 8, 13],
  [4, 9, 14],
  [5, 10, 15]
];

interface GroupState {
  bankroll: number;
  carryOverLoss: number;
}

interface GroupResult {
  id: number;
  efficiency: number;
  status: 'PASS' | 'EXECUTE' | 'STOP_LOSS';
  totalStake: number;
  horseStakes: Record<number, number>;
}

export function TerminalApp() {
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [mode, setMode] = useState<'input' | 'checkout' | 'awaiting_result'>('input');
  const [prices, setPrices] = useState<Record<number, string>>({});
  const [groupStates, setGroupStates] = useState<Record<number, GroupState>>({
    1: { bankroll: 500, carryOverLoss: 0 },
    2: { bankroll: 500, carryOverLoss: 0 },
    3: { bankroll: 500, carryOverLoss: 0 },
    4: { bankroll: 500, carryOverLoss: 0 },
    5: { bankroll: 500, carryOverLoss: 0 },
  });
  const [groupResults, setGroupResults] = useState<Record<number, GroupResult>>({});
  const [totalSpreadCost, setTotalSpreadCost] = useState(0);
  const [winningRunner, setWinningRunner] = useState<string>('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handlePriceChange = (runner: number, val: string) => {
    if (mode !== 'input') return;
    setPrices(prev => ({ ...prev, [runner]: val }));
  };

  const adjustPrice = (runner: number, delta: number) => {
    if (mode !== 'input') return;
    setPrices(prev => {
       let current = parseFloat(prev[runner] || '0');
       if (isNaN(current) || current < 1.0) current = 1.0;
       let next = parseFloat((current + delta).toFixed(2));
       if (next < 1.0) next = 1.0;
       return { ...prev, [runner]: next.toFixed(2) };
    });
  };

  const processInvestment = () => {
    let maxPrice = 0;
    let hasValue = false;
    Object.values(prices).forEach(pStr => {
       const p = parseFloat(pStr);
       if (!isNaN(p) && p > 0) {
          hasValue = true;
          if (p > maxPrice) maxPrice = p;
       }
    });

    if (!hasValue || maxPrice <= 2.00) {
       setValidationError('Hold on! You need at least one horse priced above $2.00 to calculate a profitable spread.');
       return;
    }

    setValidationError('');

    const results: Record<number, GroupResult> = {};
    let spreadCost = 0;
    const nextGroups = { ...groupStates };
    let stopLossHit = false;

    GROUPS.forEach((runners, index) => {
       const groupId = index + 1;
       const targetProfit = 10 + groupStates[groupId].carryOverLoss;
       
       let efficiency = 0;
       let hasAnyPrice = false;
       runners.forEach(r => {
          const p = parseFloat(prices[r] || '0');
          if (!isNaN(p) && p >= 1.0) {
             efficiency += (1 / p);
             hasAnyPrice = true;
          }
       });

       if (!hasAnyPrice) {
          results[groupId] = { id: groupId, efficiency: 0, status: 'PASS', totalStake: 0, horseStakes: {} };
       } else if (efficiency >= 1.0) {
          results[groupId] = { id: groupId, efficiency, status: 'PASS', totalStake: 0, horseStakes: {} };
       } else {
          const reqTotalStake = targetProfit / (1 - efficiency);
          if (reqTotalStake > groupStates[groupId].bankroll * 0.05) {
             results[groupId] = { id: groupId, efficiency, status: 'STOP_LOSS', totalStake: 0, horseStakes: {} };
             stopLossHit = true;
             // Book accumulated loss, reset target back to base 2%
             nextGroups[groupId].carryOverLoss = 0; 
          } else {
             const hStakes: Record<number, number> = {};
             let grpStakeSum = 0;
             runners.forEach(r => {
                const p = parseFloat(prices[r] || '0');
                if (!isNaN(p) && p >= 1.0) {
                   const stake = Math.ceil(reqTotalStake * (1 / p));
                   hStakes[r] = stake;
                   grpStakeSum += stake;
                }
             });
             results[groupId] = { id: groupId, efficiency, status: 'EXECUTE', totalStake: grpStakeSum, horseStakes: hStakes };
             spreadCost += grpStakeSum;
          }
       }
    });

    if (stopLossHit) {
       setGroupStates(nextGroups);
    }

    setGroupResults(results);
    setTotalSpreadCost(spreadCost);
    setMode('checkout');
  };

  const abortTrade = () => {
    setMode('input');
    setGroupResults({});
    setTotalSpreadCost(0);
    setPrices({});
  };

  const executeSpread = () => {
    setMode('awaiting_result');
  };

  const resolveRace = () => {
    const winner = parseInt(winningRunner);
    if (isNaN(winner) || winner < 1 || winner > 15) {
      alert('Please enter a valid winning runner (1-15)');
      return;
    }

    const nextStates = { ...groupStates };
        
    GROUPS.forEach((runners, index) => {
       const groupId = index + 1;
       const res = groupResults[groupId];
       if (res.status === 'EXECUTE') {
          const groupCost = res.totalStake;
          let groupReturn = 0;

          if (runners.includes(winner) && res.horseStakes[winner]) {
             groupReturn = res.horseStakes[winner] * parseFloat(prices[winner] || '0');
          }
          
          const profit = groupReturn - groupCost;
          nextStates[groupId].bankroll += profit;

          // Update carryover based on win/loss participation
          if (runners.includes(winner) && res.horseStakes[winner]) {
             nextStates[groupId].carryOverLoss = 0;
          } else {
             nextStates[groupId].carryOverLoss += groupCost;
          }
       }
    });

    setGroupStates(nextStates);
    setPrices({});
    setMode('input');
    setWinningRunner('');
    setGroupResults({});
    setTotalSpreadCost(0);
    setTimeLeft(300); // reset timer
  };

  const isWarning = timeLeft <= 180 && timeLeft > 0;
  const totalEquity = Object.values(groupStates).reduce((sum, g) => sum + g.bankroll, 0);

  const hasStopLoss = Object.values(groupResults).some(g => g.status === 'STOP_LOSS');

  const getRunnerStatusClass = (runner: number) => {
     const groupIdx = GROUPS.findIndex(g => g.includes(runner));
     if (groupIdx === -1 || mode === 'input') return 'border-[#27272a] bg-[#121212]';
     const res = groupResults[groupIdx + 1];
     if (!res) return 'border-[#27272a] bg-[#121212]';
     
     if (res.status === 'PASS') return 'border-[#ef4444]/20 bg-[#121212] opacity-70';
     if (res.status === 'STOP_LOSS') return 'border-[#ef4444] bg-[#ef4444]/10';
     if (res.status === 'EXECUTE') {
        if (res.horseStakes[runner]) return 'border-[#C5A059] bg-[#C5A059]/10';
        return 'border-[#27272a] bg-[#121212] opacity-40';
     }
     return 'border-[#27272a] bg-[#121212]';
  };

  const getRunnerMessage = (runner: number) => {
     const groupIdx = GROUPS.findIndex(g => g.includes(runner));
     if (groupIdx === -1 || mode === 'input') return null;
     const res = groupResults[groupIdx + 1];
     if (!res) return null;

     if (res.status === 'PASS') return <span className="text-[#ef4444]/80">AVOID - NO PROFIT MARGIN</span>;
     if (res.status === 'STOP_LOSS') return <span className="text-[#ef4444] animate-pulse">🛑 STOP-LOSS LIMIT HIT</span>;
     if (res.status === 'EXECUTE') {
        if (res.horseStakes[runner]) return <span className="text-[#C5A059]">STAKE: ${res.horseStakes[runner]}</span>;
     }
     return null;
  };

  return (
    <div className="w-full bg-[#050505] text-[#e0e0e0] font-sans h-full min-h-[80vh]">
      <div className="max-w-2xl mx-auto pt-8 pb-40">
        
        {/* Header & Timer */}
        <div className="bg-[#121212] border border-[#27272a] rounded-sm p-6 text-center shadow-lg relative mb-6">
          <h1 className="text-2xl md:text-3xl font-serif text-[#e0e0e0] mb-2 tracking-wide uppercase">Smart-Spread Calculator</h1>
          
          <div className="flex items-center justify-between mt-6">
             <div className="text-left">
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Total Trading Bankroll</p>
                <p className="text-xl sm:text-2xl font-mono text-[#e0e0e0] font-bold">${totalEquity.toFixed(2)}</p>
                <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-bold mt-1">Active Funds (Groups 1-5)</p>
             </div>
             
             <div className="text-right">
                <p className="text-[10px] sm:text-xs uppercase tracking-widest text-zinc-500 mb-1 font-bold">Time to Jump</p>
                <div className={`text-2xl sm:text-3xl font-mono font-bold ${isWarning ? 'text-[#ef4444] animate-pulse' : 'text-[#e0e0e0]'}`}>
                   {formatTime(timeLeft)}
                </div>
             </div>
          </div>

          {isWarning && mode === 'input' && (
            <div className="mt-6 bg-[#ef4444]/10 border border-[#ef4444] text-[#ef4444] text-xs font-mono py-3 px-4 rounded-sm animate-pulse uppercase tracking-widest font-bold">
               WARNING: 3 MIN TO JUMP - VERIFY ODDS
            </div>
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
           <div className="bg-[#ef4444]/10 border border-[#ef4444]/50 text-[#ef4444] text-xs p-4 rounded-sm text-center mb-6 font-mono uppercase tracking-wide">
              {validationError}
           </div>
        )}

        {/* Runners List */}
        <div className="flex flex-col gap-2 relative">
           {Array.from({length: 15}).map((_, i) => {
              const runner = i + 1;
              const statusClass = getRunnerStatusClass(runner);
              const message = getRunnerMessage(runner);

              return (
                 <div key={runner} className={`border rounded-sm p-3.5 flex items-center justify-between transition-colors ${statusClass}`}>
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-sm bg-[#050505] border border-[#27272a] flex items-center justify-center font-mono text-[#e0e0e0] font-bold text-lg">
                          {runner}
                       </div>
                       {message && (
                          <div className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-widest">{message}</div>
                       )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                       <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono mr-2 hidden md:inline-block">Price</span>
                       <button onClick={() => adjustPrice(runner, -0.1)} disabled={mode !== 'input'} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#050505] border border-[#27272a] text-zinc-400 hover:text-[#C5A059] hover:border-[#C5A059] disabled:opacity-30 transition-colors rounded-sm font-mono font-bold text-lg">-</button>
                       <input 
                         type="number" 
                         step="0.10"
                         value={prices[runner] !== undefined ? prices[runner] : ''}
                         onChange={(e) => handlePriceChange(runner, e.target.value)}
                         disabled={mode !== 'input'}
                         className="w-16 h-8 sm:w-20 sm:h-10 bg-[#050505] border border-[#27272a] text-center font-mono focus:outline-none focus:border-[#C5A059] disabled:opacity-50 text-[#e0e0e0] rounded-sm font-bold placeholder:text-zinc-700"
                         placeholder="1.00"
                       />
                       <button onClick={() => adjustPrice(runner, 0.1)} disabled={mode !== 'input'} className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center bg-[#050505] border border-[#27272a] text-zinc-400 hover:text-[#C5A059] hover:border-[#C5A059] disabled:opacity-30 transition-colors rounded-sm font-mono font-bold text-lg">+</button>
                    </div>
                 </div>
              )
           })}
        </div>

        {/* Action Bar Input */}
        {mode === 'input' && (
           <div className="mt-8">
             <button 
               onClick={processInvestment}
               className="w-full bg-[#C5A059] text-[#050505] font-bold uppercase tracking-widest py-4 rounded-sm hover:focus:bg-[#d4af37] transition-colors text-sm font-sans"
             >
               CALCULATE STAKES
             </button>
           </div>
        )}

        {/* Post-Purchase FAQs */}
        <div className="mt-16 text-left">
           <h3 className="text-xl font-serif text-[#e0e0e0] mb-8 border-b border-[#27272a] pb-4 uppercase tracking-widest text-center">
              Protocol Support & FAQ
           </h3>
           <div className="space-y-4">
             {[
               {
                 q: "How do I enter market prices on the Race Board?",
                 a: "Speed is critical. Instead of manual typing, use the [+] and [-] stepper buttons next to each of the 15 runners. The steppers are anchored at a minimum of $1.00 and adjust in clean $0.10 increments. This allows you to match live market drift in seconds using just one thumb."
               },
               {
                 q: "Why does the board only show numbers 1-15 instead of horse names?",
                 a: "Tactical anonymity. We intentionally designed a \"flattened\" interface that removes horse names, jockey colors, and form data. This eliminates emotional bias and \"jockey noise,\" forcing you to treat the Race Board as a clinical financial tool rather than a racing guide."
               },
               {
                 q: "What does the \"AVOID - NO PROFIT MARGIN\" alert mean?",
                 a: "When you click [ CALCULATE STAKES ], the system checks the implied probability of the market. If the combined probability of our hidden sub-groups equals or exceeds 1.0, a profit cannot be guaranteed. The system will flag those runners with a gentle \"AVOID - NO PROFIT MARGIN\" (or \"SKIP\") alert. Trust the math and pass on the event."
               },
               {
                 q: "How does the system handle loss recovery?",
                 a: "If an event does not hit its target profit, AWP automatically acts as your CFO. The system carries over the lost stake and dynamically adds it to your Desired Income target for the next event, calculating a slightly heavier stake spread to clear the red ink and keep you on track for your daily yield."
               },
               {
                 q: "How does the 5% Stop-Loss Limit (Rule 4) work?",
                 a: "This is your ultimate capital defense. If the dynamic recovery math ever dictates that a required stake exceeds 5% of your active group bankroll (e.g., requesting a stake higher than $25 on a $500 bank), the terminal will instantly pulse a 🛑 STOP-LOSS LIMIT HIT warning. It physically locks you from placing the trade, books the accumulated loss, and resets the target back to your base 2% to protect you from bankruptcy."
               },
               {
                 q: "What is the \"Money Out, Money In\" philosophy I see on my dashboard?",
                 a: "We treat your daily sessions as a profession. Our internal math accounts for your labor. By factoring in a professional salary draw of $30 per hour for your time, alongside a built-in 33% IRD tax provisioning pool (and 10% Community Fund), we ensure you are running a compliant, profitable business, not just funding a hobby."
               },
               {
                 q: "What do I do when the 3-minute timer flashes amber?",
                 a: "The \"Time to Jump\" countdown is manual. Once you sync it, it will pulse an amber \"WARNING: 3 MIN TO JUMP - VERIFY ODDS\" alert exactly at the 03:00 minute mark. This is your cue to finalize your prices, click [ CALCULATE STAKES ], and hit [ LOCK IN STAKES ] to execute your spread before the market closes."
               }
             ].map((faq, i) => (
               <div key={i} className="bg-[#121212] border border-[#27272a] rounded-sm p-5">
                 <h4 className="text-sm font-bold text-[#C5A059] mb-3 uppercase tracking-wider font-mono">
                   {faq.q}
                 </h4>
                 <p className="text-zinc-400 leading-relaxed font-mono text-xs">
                   {faq.a}
                 </p>
               </div>
             ))}
           </div>
        </div>

      </div>

      {/* Fixed Checkout Bar */}
      {(mode === 'checkout' || mode === 'awaiting_result') && (
         <div className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-[#C5A059]/30 p-6 shadow-[0_-10px_40px_rgba(5,5,5,0.9)] z-50">
            <div className="max-w-2xl mx-auto">
               
               {mode === 'checkout' && (
                  <div>
                     <div className="flex justify-between items-center mb-6">
                        <span className="text-zinc-500 uppercase tracking-widest text-xs font-mono font-bold">Total Spread Cost</span>
                        <span className="text-3xl font-mono text-[#e0e0e0] font-bold">${totalSpreadCost.toFixed(2)}</span>
                     </div>
                     <div className="flex gap-4">
                        <button 
                          onClick={abortTrade}
                          className="flex-1 bg-transparent border border-[#27272a] text-[#e0e0e0] font-bold uppercase tracking-widest py-3.5 rounded-sm hover:bg-[#121212] transition-colors text-xs"
                        >
                          Abort
                        </button>
                        <button 
                          onClick={executeSpread}
                          disabled={hasStopLoss}
                          className="flex-[2] bg-[#C5A059] text-[#050505] font-bold uppercase tracking-widest py-3.5 rounded-sm hover:bg-[#d4af37] transition-colors text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {hasStopLoss ? 'Execution Locked' : 'LOCK IN STAKES'}
                        </button>
                     </div>
                     {hasStopLoss && (
                        <p className="text-center text-[#ef4444] text-[10px] uppercase font-mono tracking-widest mt-4">Trade Locked due to Stop-Loss override rule. Target reset.</p>
                     )}
                  </div>
               )}

               {mode === 'awaiting_result' && (
                  <div className="text-center">
                     <h3 className="text-[#C5A059] uppercase tracking-widest text-sm font-bold mb-6 font-mono">Awaiting Results</h3>
                     <div className="mb-6 flex flex-col items-center">
                        <label className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2 font-mono font-bold">Winning Runner (1-15)</label>
                        <input 
                          type="number"
                          value={winningRunner}
                          onChange={(e) => setWinningRunner(e.target.value)}
                          min={1}
                          max={15}
                          className="w-24 bg-[#121212] border border-[#C5A059] text-center font-mono py-3 focus:outline-none text-[#C5A059] font-bold text-2xl rounded-sm"
                        />
                     </div>
                     <button 
                       onClick={resolveRace}
                       className="w-full bg-[#C5A059] text-[#050505] font-bold uppercase tracking-widest py-4 rounded-sm hover:bg-[#d4af37] transition-colors text-xs"
                     >
                       Record Results
                     </button>
                  </div>
               )}
            </div>
         </div>
      )}
    </div>
  );
}

