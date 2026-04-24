import React, { useState, useEffect, useRef } from 'react';
import { ProtocolState, UserRole, ProtocolContextType, AssetState, ProtocolEvent, Guardian, Beneficiary } from './types';
import { formatDuration } from './services/mockService';
import TemporalScene from './components/TemporalScene';
import EntryView from './views/EntryView';
import RoleSelectionView from './views/RoleSelectionView';
import OwnerView from './views/OwnerView';
import GuardianView from './views/GuardianView';
import BeneficiaryView from './views/BeneficiaryView';
import { Button, Badge } from './components/ui/Primitives';
import toast from 'react-hot-toast';
import { EventLog } from './components/ui/EventLog';
import { LogOut } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAccount, useDisconnect, useBalance } from 'wagmi';
import { formatEther } from 'viem';
import { useAfterLifeContract } from './hooks/useAfterLifeContract';
import AnimatedLogo from './components/AnimatedLogo';
import { useChain } from './contexts/ChainContext';

const INACTIVITY_THRESHOLD_MS_DEFAULT = 120000; // 2 minutes for demo purposes
const SYNC_BUFFER_MS = 20000; // 20s safety margin for blockchain clock lag

const STATE_PRIORITY = {
  [ProtocolState.ACTIVE]: 1,
  [ProtocolState.WARNING]: 2,
  [ProtocolState.PENDING]: 3,
  [ProtocolState.EXECUTING]: 4,
  [ProtocolState.COMPLETED]: 5,
};

const App: React.FC = () => {
  const [role, setRole] = useState<UserRole>(UserRole.NONE);
  const [state, setState] = useState<ProtocolState>(ProtocolState.ACTIVE);
  const [lastHeartbeat, setLastHeartbeat] = useState<number>(Date.now());
  const [inactivityThreshold, setInactivityThreshold] = useState<number>(INACTIVITY_THRESHOLD_MS_DEFAULT);
  const [vestingProgress, setVestingProgress] = useState(0);
  const [assets, setAssets] = useState<AssetState[]>([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [vaultBalance, setVaultBalance] = useState<bigint>(0n);
  const [currentVaultBalance, setCurrentVaultBalance] = useState<bigint>(0n);

  // Multi-chain context - must be early for all effects to use
  const { selectedChainId, chainInfo } = useChain();

  // Entity State
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [targetOwner, setTargetOwner] = useState<string>(''); // The owner address we are currently monitoring

  // Refresh trigger - increment to force data re-fetch
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  // Track previous chain to detect chain changes
  const previousChainId = useRef<number | undefined>(undefined);

  // Reset logic when switching roles, owners, OR chains
  useEffect(() => {
    // If chain changed, reset to role selection
    if (previousChainId.current !== undefined && previousChainId.current !== selectedChainId) {
      setRole(UserRole.NONE);
      setTargetOwner('');
      addEvent(`Switched to ${chainInfo?.name || 'new chain'}. Please select your role.`, 'INFO');
    }
    previousChainId.current = selectedChainId;
  }, [selectedChainId]);

  // Reset state when role or target owner changes
  useEffect(() => {
    setState(ProtocolState.ACTIVE);
    setLastHeartbeat(Date.now());
    addEvent(`Session reset. Monitoring switched.`, 'INFO');
  }, [role, targetOwner]);

  // Event Log State
  const [events, setEvents] = useState<ProtocolEvent[]>([]);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const previousState = useRef<ProtocolState>(ProtocolState.ACTIVE);

  const addEvent = (message: string, type: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO') => {
    const newEvent: ProtocolEvent = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      message,
      type
    };
    setEvents(prev => [...prev, newEvent]);
  };

  // Initial Event
  useEffect(() => {
    addEvent('Protocol interface initialized. Monitoring started.', 'INFO');
  }, []);

  // Time Loop Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeSinceHeartbeat = now - lastHeartbeat;

      setElapsedTime(now);

      // State Machine Logic (STICKY TRANSITIONS)
      const thresholdForLogic = INACTIVITY_THRESHOLD_MS_DEFAULT; // Hard override for demo

      const calculateNewState = () => {
        if (state === ProtocolState.EXECUTING || state === ProtocolState.COMPLETED) return state;

        if (timeSinceHeartbeat > thresholdForLogic + SYNC_BUFFER_MS) return ProtocolState.PENDING;
        if (timeSinceHeartbeat > thresholdForLogic * 0.7) return ProtocolState.WARNING;
        return ProtocolState.ACTIVE;
      };

      const newState = calculateNewState();

      // Only transition if it's a forward move or if heartbeat changed (not handled here)
      if (STATE_PRIORITY[newState] > STATE_PRIORITY[state]) {
        setState(newState);
      }

      // Vesting Logic Simulation
      if (state === ProtocolState.EXECUTING) {
        // Unlock assets for demo
        setAssets(prev => prev.map(a => {
          if (a.unlockDate > now && Math.random() > 0.95) {
            // Accelerate unlock for demo visual
            return { ...a, unlockDate: now - 1000 };
          }
          return a;
        }));
      }

    }, 1000);

    return () => clearInterval(interval);
  }, [lastHeartbeat, state, inactivityThreshold]);

  // Log State Changes
  useEffect(() => {
    if (previousState.current !== state) {
      let type: 'INFO' | 'WARNING' | 'CRITICAL' = 'INFO';
      if (state === 'WARNING') type = 'WARNING';
      if (state === 'PENDING') type = 'CRITICAL';
      if (state === 'EXECUTING') type = 'CRITICAL';

      addEvent(`Protocol state transition: ${previousState.current} -> ${state}`, type);
      previousState.current = state;
    }
  }, [state]);

  const proveLife = () => {
    setLastHeartbeat(Date.now());
    addEvent('Proof of life signal received. Clock reset.', 'INFO');
    if (state === ProtocolState.WARNING || state === ProtocolState.PENDING) {
      setState(ProtocolState.ACTIVE);
    }
  };

  const [vestingStartTime, setVestingStartTime] = useState<number | null>(null);

  // ... (previous state useEffects)

  // Vesting Logic Simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setElapsedTime(now);

      // ... (StateMachine Logic)

      if (state === ProtocolState.EXECUTING && vestingStartTime) {
        // Use actual vestingDuration from beneficiary data (in seconds, convert to ms)
        // Find the shortest vesting duration among all beneficiaries for progress display
        // If no beneficiaries or no duration, fall back to 2 minutes for demo
        const shortestVestingMs = beneficiaries.length > 0
          ? Math.min(...beneficiaries.map(b => (b.vestingDuration || 120) * 1000))
          : 120000; // 2 minutes default

        const elapsed = now - vestingStartTime;
        const progress = Math.min((elapsed / shortestVestingMs) * 100, 100);

        setVestingProgress(progress);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lastHeartbeat, state, vestingStartTime, beneficiaries]);

  const {
    confirmInactivity: contractConfirmInactivity,
    claim: contractClaim,
    getClaimableAmount,
    getProtocolState: contractGetProtocolState,
  } = useAfterLifeContract();

  const confirmInactivity = async () => {
    try {
      addEvent('Initiating consensus check...', 'INFO');
      await contractConfirmInactivity(targetOwner);
      addEvent('Guardian consensus reached. Inactivity confirmed.', 'CRITICAL');
      setState(ProtocolState.EXECUTING);
      setVestingStartTime(Date.now()); // Start the Vesting Clock
    } catch (err: any) {
      addEvent(`Consensus failed: ${err.message}`, 'WARNING');
      throw err;
    }
  };

  const addGuardian = (guardian: Guardian) => {
    setGuardians(prev => [...prev, guardian]);
    addEvent(`New guardian added: ${guardian.name}`, 'INFO');
  };

  const removeGuardian = (address: string) => {
    setGuardians(prev => prev.filter(g => g.address !== address));
    addEvent(`Guardian removed: ${address}`, 'INFO');
  };

  const addBeneficiary = (beneficiary: Beneficiary) => {
    setBeneficiaries(prev => [...prev, beneficiary]);
    addEvent(`New beneficiary added: ${beneficiary.name}`, 'INFO');
  };

  const removeBeneficiary = (address: string) => {
    setBeneficiaries(prev => prev.filter(b => b.address !== address));
    addEvent(`Beneficiary removed: ${address}`, 'INFO');
  };

  const updateBeneficiaryAllocation = (address: string, newAllocation: number) => {
    setBeneficiaries(prev => {
      const currentTotal = prev.reduce((sum, b) => sum + (b.address === address ? 0 : b.allocation), 0);
      const available = 100 - currentTotal;
      const clampedAllocation = Math.min(Math.max(0, newAllocation), available);

      return prev.map(b =>
        b.address === address ? { ...b, allocation: clampedAllocation } : b
      );
    });
  };

  const claimBeneficiaryShare = async (beneficiaryAddress: string) => {
    const toastId = toast.loading('Preparing claim...');

    try {
      // 1. Verify protocol is in execution state on-chain
      const protocolState = await contractGetProtocolState(targetOwner);
      if (!protocolState?.isDead) {
        toast.error('Protocol is not in execution state. Owner may still be active.', { id: toastId });
        addEvent('Claim rejected: Protocol not in execution state', 'WARNING');
        return;
      }

      // 2. Verify claimable amount on-chain
      const claimInfo = await getClaimableAmount(targetOwner, beneficiaryAddress);
      if (!claimInfo) {
        toast.error('Could not verify claimable amount. Please try again.', { id: toastId });
        return;
      }

      if (claimInfo.claimable === 0n) {
        toast.error('Nothing to claim yet. Vesting may not have reached your allocation.', { id: toastId });
        addEvent('Claim rejected: No claimable amount available', 'INFO');
        return;
      }

      // 3. Execute claim
      toast.loading('Confirming transaction in wallet...', { id: toastId });
      addEvent(`Initiating claim for ${formatEther(claimInfo.claimable)} ETH...`, 'INFO');

      await contractClaim(targetOwner);

      const claimedAmount = Number(claimInfo.claimable) / 1e18;
      const receivedAmount = claimedAmount * 0.9; // After 10% platform fee

      toast.success(`Claimed ${receivedAmount.toFixed(4)} ETH successfully!`, { id: toastId });
      addEvent(`Successfully claimed ${receivedAmount.toFixed(4)} ETH (after 10% fee)`, 'INFO');

      // 4. Force data refresh to update UI
      triggerRefresh();

    } catch (err: any) {
      const msg = err.shortMessage || err.message || 'Unknown error';
      toast.error(`Claim failed: ${msg}`, { id: toastId });
      addEvent(`Claim failed: ${msg}`, 'WARNING');
    }
  };

  // Wallet & Routing
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: walletBalanceData } = useBalance({ address });

  const context: ProtocolContextType = {
    role,
    setRole,
    state,
    setState,
    ownerAddress: targetOwner,
    vaultBalance,
    currentVaultBalance,
    walletBalance: walletBalanceData ? formatEther(walletBalanceData.value) : '0.00',
    lastHeartbeat,
    inactivityThreshold: INACTIVITY_THRESHOLD_MS_DEFAULT, // HARD OVERRIDE FOR DEMO
    proveLife,
    confirmInactivity,
    assets,
    guardians,
    beneficiaries,
    addGuardian,
    removeGuardian,
    addBeneficiary,
    removeBeneficiary,
    updateBeneficiaryAllocation,
    claimBeneficiaryShare,
    vestingProgress,
    elapsedTime,
    events,
    addEvent
  };
  // Using the updated hook to read data
  const { getGuardians, getBeneficiaries, getProtocolState } = useAfterLifeContract();

  const [hasRegisteredOwner, setHasRegisteredOwner] = useState(false); // To bootstrap the first user as owner

  // Fetch Data from Blockchain on Connect OR Target Owner Change
  useEffect(() => {
    if (isConnected) {
      const syncData = async () => {
        try {
          const ownerToFetch = targetOwner || address;
          if (!ownerToFetch) return;

          // 1. Fetch Entities
          const _guardians = await getGuardians(ownerToFetch);
          setGuardians(_guardians.map(g => ({
            name: g.name,
            address: g.address,
            isConfirmed: true,
            lastActive: Date.now()
          })));

          const _beneficiaries = await getBeneficiaries(ownerToFetch);
          setBeneficiaries(_beneficiaries.map(b => ({
            name: b.name,
            address: b.address,
            allocation: b.allocation / 100,
            amountClaimed: b.amountClaimed.toString(), // Fix missing property lint
            vestingType: b.vestingType.toUpperCase() as any,
            vestingDuration: b.vestingDuration
          })));

          // 2. Fetch Protocol State
          const protocolState = await getProtocolState(ownerToFetch);
          if (protocolState) {
            const prevHeartbeat = lastHeartbeat;
            const newHeartbeat = protocolState.lastHeartbeat;

            setLastHeartbeat(newHeartbeat);
            setInactivityThreshold(Math.min(protocolState.inactivityThreshold, INACTIVITY_THRESHOLD_MS_DEFAULT));
            setVaultBalance(protocolState.initialVaultBalance);
            setCurrentVaultBalance(protocolState.currentVaultBalance);
            setVestingStartTime(protocolState.vestingStartTime > 0 ? protocolState.vestingStartTime : null);

            // Check if dead
            if (protocolState.isDead) {
              setState(ProtocolState.EXECUTING);
            } else {
              const now = Date.now();
              const elapsed = now - protocolState.lastHeartbeat;
              const threshold = inactivityThreshold;

              let calculatedState = ProtocolState.ACTIVE;
              if (elapsed > threshold + SYNC_BUFFER_MS) {
                calculatedState = ProtocolState.PENDING;
              } else if (elapsed > threshold * 0.7) {
                calculatedState = ProtocolState.WARNING;
              }

              if (newHeartbeat > prevHeartbeat) {
                setState(calculatedState);
              } else if (STATE_PRIORITY[calculatedState] > STATE_PRIORITY[state]) {
                setState(calculatedState);
              }
            }
            addEvent(`Synced [${ownerToFetch.slice(0, 6)}]. Heartbeat: ${new Date(protocolState.lastHeartbeat).toLocaleTimeString()}`, 'INFO');
          }
        } catch (err) {
          console.error("Sync Failed:", err);
        }
      };
      syncData();

      // Poll for updates every 15s to keep UI fresh
      const poll = setInterval(syncData, 15000);
      return () => clearInterval(poll);
    }
  }, [isConnected, address, targetOwner, selectedChainId, refreshTrigger]);

  // Auto-Route removed. We now wait for user selection.

  const verifyAndSetRole = async (selectedRole: UserRole, targetOwnerAddr?: string) => {
    if (!address) return;
    const currentAddr = address.toLowerCase();

    if (selectedRole === UserRole.GUARDIAN) {
      if (!targetOwnerAddr) return;

      addEvent(`Authenticating Guardian for ${targetOwnerAddr.slice(0, 6)}...`, 'INFO');
      const _guardians = await getGuardians(targetOwnerAddr);
      const isAuthorized = _guardians.some(g => g.address.toLowerCase() === currentAddr);

      if (isAuthorized) {
        setTargetOwner(targetOwnerAddr);
        setRole(UserRole.GUARDIAN);
        addEvent(`Guardian ${currentAddr.slice(0, 6)}... authenticated`, 'INFO');
      } else {
        addEvent(`Access Denied: ${currentAddr.slice(0, 6)}... is not a Guardian for ${targetOwnerAddr.slice(0, 6)}`, 'WARNING');
        toast.error("Access Denied: Your wallet is not listed as a Guardian for this Owner.");
      }
    }
    else if (selectedRole === UserRole.BENEFICIARY) {
      if (!targetOwnerAddr) return;

      addEvent(`Authenticating Beneficiary for ${targetOwnerAddr.slice(0, 6)}...`, 'INFO');
      const _beneficiaries = await getBeneficiaries(targetOwnerAddr);
      const isAuthorized = _beneficiaries.some(b => b.address.toLowerCase() === currentAddr);

      if (isAuthorized) {
        setTargetOwner(targetOwnerAddr);
        setRole(UserRole.BENEFICIARY);
        addEvent(`Beneficiary ${currentAddr.slice(0, 6)}... authenticated`, 'INFO');
      } else {
        addEvent(`Access Denied: ${currentAddr.slice(0, 6)}... is not a Beneficiary for ${targetOwnerAddr.slice(0, 6)}`, 'WARNING');
        toast.error("Access Denied: Your wallet is not listed as a Beneficiary for this Owner.");
      }
    }
    else if (selectedRole === UserRole.OWNER) {
      setTargetOwner(currentAddr);
      checkOwnerRegistration(currentAddr);
    }
  };

  // Multi-tenant owner registration check
  const { isOwner, register } = useAfterLifeContract();

  const checkOwnerRegistration = async (walletAddress: string) => {
    const registered = await isOwner(walletAddress);
    if (registered) {
      setRole(UserRole.OWNER);
      addEvent(`Owner Dashboard accessed by ${walletAddress.slice(0, 6)}...`, 'INFO');
    } else {
      // Prompt to register
      const shouldRegister = window.confirm(
        "You are not registered as a protocol owner yet. Would you like to register now?\n\n" +
        "This will create your own AfterLife protocol instance with a 2-minute inactivity threshold."
      );
      if (shouldRegister) {
        try {
          addEvent('Registering new protocol owner...', 'INFO');
          await register(120); // 2 minutes in seconds for demo
          setRole(UserRole.OWNER);
          addEvent(`Successfully registered! Welcome, ${walletAddress.slice(0, 6)}...`, 'INFO');
        } catch (err: any) {
          addEvent(`Registration failed: ${err.message}`, 'WARNING');
          toast.error("Registration failed. Please try again.");
        }
      }
    }
  };

  const renderView = () => {
    if (!isConnected) {
      return <EntryView />;
    }

    // If connected but no role selected/detected, show Selection View
    if (role === UserRole.NONE) {
      return <RoleSelectionView onSelectRole={verifyAndSetRole} connectedAddress={address} onDisconnect={disconnect} />;
    }

    switch (role) {
      case UserRole.OWNER:
        return <OwnerView context={context} />;
      case UserRole.GUARDIAN:
        return <GuardianView context={context} />;
      case UserRole.BENEFICIARY:
        return <BeneficiaryView context={context} />;
      default:
        return <div className="text-white text-center mt-20">Error: Unknown State</div>;
    }
  };

  // Determine Banner Style
  const getBannerVariant = () => {
    switch (state) {
      case 'WARNING': return 'warning';
      case 'PENDING': return 'critical';
      case 'EXECUTING': return 'info'; // Use info/indigo for execution
      default: return 'success';
    }
  };

  return (
    <>
      {/* 3D Background Layer */}
      <TemporalScene state={state} />

      {/* Global Message Banner */}
      <div className="absolute top-0 left-0 w-full flex justify-center pt-4 z-50 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
          >
            <Badge variant={getBannerVariant()} className="shadow-2xl border-opacity-50 text-sm py-1 px-4 backdrop-blur-md">
              PROTOCOL STATE: {state}
            </Badge>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* UI Overlay Layer */}
      <div className="ui-layer">
        {/* Global Nav / Brand Mark */}
        {isConnected && (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="fixed top-6 left-6 z-40 flex items-center gap-3 cursor-pointer group"
            onClick={() => setRole(UserRole.NONE)}
          >
            <AnimatedLogo size={40} />
            <span className="text-white font-thin tracking-widest text-lg group-hover:text-emerald-400 transition-colors uppercase">AfterLife</span>
          </motion.div>
        )}

        {role !== UserRole.NONE && (
          <div className="fixed top-6 right-6 z-40">
            <Button variant="ghost" onClick={() => setRole(UserRole.NONE)}>
              <LogOut className="w-4 h-4 mr-2" /> Disconnect
            </Button>
          </div>
        )}

        {renderView()}
      </div>

      {/* Event Log & History Component */}
      <EventLog
        events={events}
        isOpen={isLogOpen}
        onToggle={() => setIsLogOpen(!isLogOpen)}
        currentState={state}
      />
    </>
  );
};

export default App;
