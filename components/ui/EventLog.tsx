import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ProtocolEvent, ProtocolState } from '../../types';
import { Card, Badge, Button } from './Primitives';
import { Scroll, X, Clock, ChevronRight } from 'lucide-react';

interface EventLogProps {
  events: ProtocolEvent[];
  isOpen: boolean;
  onToggle: () => void;
  currentState: ProtocolState;
}

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const StateStep: React.FC<{ state: ProtocolState; current: ProtocolState; label: string }> = ({ state, current, label }) => {
    const states = Object.values(ProtocolState);
    const currentIndex = states.indexOf(current);
    const stepIndex = states.indexOf(state);
    const isActive = stepIndex === currentIndex;
    const isPast = stepIndex < currentIndex;

    return (
        <div className="flex items-center gap-3 relative pb-6 last:pb-0">
            {/* Line connector */}
            {state !== ProtocolState.COMPLETED && (
                <div className={`absolute left-[9px] top-5 bottom-0 w-0.5 ${isPast ? 'bg-emerald-500/30' : 'bg-white/5'}`} />
            )}
            
            {/* Dot */}
            <div className={`w-5 h-5 rounded-full flex items-center justify-center z-10 border ${
                isActive ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                isPast ? 'bg-emerald-900/50 border-emerald-500/30' : 'bg-stone-900 border-stone-700'
            }`}>
                {isPast && <div className="w-2 h-2 rounded-full bg-emerald-500" />}
                {isActive && <div className="w-2 h-2 rounded-full bg-white animate-pulse" />}
            </div>

            <div className={`${isActive ? 'text-white font-medium' : isPast ? 'text-secondary' : 'text-stone-600'}`}>
                <div className="text-xs uppercase tracking-wider">{label}</div>
            </div>
        </div>
    );
};

export const EventLog: React.FC<EventLogProps> = ({ events, isOpen, onToggle, currentState }) => {
  return (
    <>
      {/* Trigger Button */}
      {!isOpen && (
        <motion.div 
            className="fixed bottom-6 right-6 z-50"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
        >
            <Button onClick={onToggle} variant="outline" className="h-12 w-12 rounded-full p-0 bg-stone-900/80 backdrop-blur-md border-white/10 shadow-xl hover:bg-stone-800">
                <Scroll className="w-5 h-5 text-secondary" />
            </Button>
        </motion.div>
      )}

      {/* Drawer Panel */}
      <AnimatePresence>
        {isOpen && (
            <>
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onToggle}
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
                />
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-full w-full max-w-sm bg-stone-950/95 border-l border-white/10 z-50 shadow-2xl flex flex-col"
                >
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-stone-900/50">
                        <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-emerald-400" />
                            <h2 className="text-sm font-mono uppercase tracking-widest text-white">Protocol Logs</h2>
                        </div>
                        <button onClick={onToggle} className="text-secondary hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8">
                        {/* State History Section */}
                        <div className="mb-8">
                            <h3 className="text-xs text-stone-500 uppercase font-mono mb-4">State Progression</h3>
                            <div className="pl-2">
                                <StateStep state={ProtocolState.ACTIVE} current={currentState} label="Active Monitoring" />
                                <StateStep state={ProtocolState.WARNING} current={currentState} label="Inactivity Threshold" />
                                <StateStep state={ProtocolState.PENDING} current={currentState} label="Pending Verification" />
                                <StateStep state={ProtocolState.EXECUTING} current={currentState} label="Progressive Execution" />
                                <StateStep state={ProtocolState.COMPLETED} current={currentState} label="Completed" />
                            </div>
                        </div>

                        {/* Logs Section */}
                        <div>
                            <h3 className="text-xs text-stone-500 uppercase font-mono mb-4">Event Stream</h3>
                            <div className="space-y-3">
                                {events.length === 0 ? (
                                    <div className="text-stone-600 text-xs text-center py-4 italic">No events recorded.</div>
                                ) : (
                                    [...events].reverse().map((event) => (
                                        <div key={event.id} className="bg-white/5 rounded p-3 border border-white/5">
                                            <div className="flex justify-between items-start mb-1">
                                                <Badge variant={event.type === 'CRITICAL' ? 'critical' : event.type === 'WARNING' ? 'warning' : 'neutral'} className="scale-90 origin-left">
                                                    {event.type}
                                                </Badge>
                                                <span className="text-[10px] text-stone-500 font-mono">{formatTime(event.timestamp)}</span>
                                            </div>
                                            <p className="text-xs text-stone-300 leading-relaxed">{event.message}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            </>
        )}
      </AnimatePresence>
    </>
  );
};
