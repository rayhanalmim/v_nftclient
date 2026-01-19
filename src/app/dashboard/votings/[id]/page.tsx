'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useParams } from 'next/navigation';
import { votingAPI, Voting } from '@/lib/api';
import { SUPPORTED_CHAINS } from '@/types';
import Link from 'next/link';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { VOTING_SYSTEM_ABI, VOTER_NFT_ABI, CHAIN_CONFIG, CHAIN_IDS } from '@/lib/web3Config';

const VOTING_SYSTEM_ADDRESS = CHAIN_CONFIG[CHAIN_IDS.BSC_TESTNET].contracts.votingSystem as `0x${string}`;
const VOTER_NFT_ADDRESS = CHAIN_CONFIG[CHAIN_IDS.BSC_TESTNET].contracts.voterNFT as `0x${string}`;

export default function VotingDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const votingId = params.id as string;
  
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [voting, setVoting] = useState<Voting | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [blockNumber, setBlockNumber] = useState<number | undefined>();
  const [votingStep, setVotingStep] = useState<string>('');
  const [voteError, setVoteError] = useState<string | null>(null);

  // Wagmi hooks
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Get the NFT token ID currently OWNED by the wallet (supports transferred NFTs)
  const { data: ownedTokenId, isLoading: isCheckingNFT } = useReadContract({
    address: VOTER_NFT_ADDRESS,
    abi: VOTER_NFT_ABI,
    functionName: 'getOwnedTokenId',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected,
    },
  });

  // Check if the owned token is verified
  const tokenIdNumber = ownedTokenId ? Number(ownedTokenId) : 0;
  const { data: isTokenVerified } = useReadContract({
    address: VOTER_NFT_ADDRESS,
    abi: VOTER_NFT_ABI,
    functionName: 'isTokenVerified',
    args: ownedTokenId ? [ownedTokenId] : undefined,
    query: {
      enabled: tokenIdNumber > 0,
    },
  });

  // Check if voter's NFT has already voted in this election
  const { data: hasAlreadyVoted, isLoading: isCheckingVoteStatus } = useReadContract({
    address: VOTING_SYSTEM_ADDRESS,
    abi: VOTING_SYSTEM_ABI,
    functionName: 'hasVoterVoted',
    args: address && voting?.blockchainElectionId ? [BigInt(voting.blockchainElectionId), address] : undefined,
    query: {
      enabled: !!address && isConnected && !!voting?.blockchainElectionId,
    },
  });

  // Get voter info including residential area from blockchain
  const { data: voterInfo, isLoading: isLoadingVoterInfo } = useReadContract({
    address: VOTER_NFT_ADDRESS,
    abi: VOTER_NFT_ABI,
    functionName: 'getVoterInfo',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && isConnected && tokenIdNumber > 0,
    },
  });

  // Extract voter area from blockchain data
  const voterArea = voterInfo ? (voterInfo as [bigint, string, boolean, bigint])[1] : null;

  useEffect(() => {
    const fetchVoting = async () => {
      try {
        const response = await votingAPI.getById(votingId);
        if (response.code === 'SUCCESS' && response.data) {
          setVoting(response.data);
        }
      } catch (error) {
        console.error('Error fetching voting:', error);
      } finally {
        setPageLoading(false);
      }
    };
    fetchVoting();
  }, [votingId]);

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!voting) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Election Not Found</h2>
        <p className="text-gray-400 mb-6">The election you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/votings" className="text-blue-400 hover:text-blue-300 font-medium">
          ← Back to Elections
        </Link>
      </div>
    );
  }

  const userChain = SUPPORTED_CHAINS.find(c => c.id === user?.nftChain);
  const isAdmin = user?.isAdmin;
  
  // NFT-based voting eligibility: must OWN a verified NFT and not already voted
  // tokenIdNumber > 0 means wallet has an NFT (could be transferred from another wallet)
  const hasNFT = isConnected && tokenIdNumber > 0;
  const hasValidNFT = hasNFT && isTokenVerified === true;
  const alreadyVoted = hasAlreadyVoted === true;
  
  // Check if voter's area matches election's eligible areas
  const isAreaEligible = voterArea && voting.eligibleAreas ? 
    voting.eligibleAreas.some(area => area.toLowerCase() === voterArea.toLowerCase()) : false;
  
  const canVote = voting.status === 'active' && !isAdmin && hasValidNFT && !alreadyVoted && isAreaEligible;
  const isLoadingEligibility = isCheckingNFT || isCheckingVoteStatus || isLoadingVoterInfo;
  
  // Calculate vote percentages
  const maxVotes = Math.max(...voting.candidates.map(c => c.voteCount));
  
  const handleVote = async () => {
    if (!selectedCandidate || !voting || !isConnected || !address) {
      setVoteError('Please connect your wallet to vote');
      return;
    }
    
    setLoading(true);
    setVotingStep('Preparing transaction...');
    setVoteError(null);
    
    try {
      // Get the blockchain election ID and candidate ID
      const blockchainElectionId = voting.blockchainElectionId;
      const candidateIndex = voting.candidates.findIndex(c => c.id === selectedCandidate);
      const blockchainCandidateId = candidateIndex + 1; // Blockchain IDs are 1-indexed
      
      if (!blockchainElectionId) {
        throw new Error('Election not found on blockchain');
      }
      
      setVotingStep('Please confirm the transaction in MetaMask...');
      
      // Call the blockchain contract
      const hash = await writeContractAsync({
        address: VOTING_SYSTEM_ADDRESS,
        abi: VOTING_SYSTEM_ABI,
        functionName: 'castVote',
        args: [BigInt(blockchainElectionId), BigInt(blockchainCandidateId)],
      });
      
      setTxHash(hash);
      setVotingStep('Waiting for transaction confirmation...');
      
      // Wait for confirmation and get block number
      const estimatedBlockNumber = Math.floor(Date.now() / 1000);
      setBlockNumber(estimatedBlockNumber);
      
      // Save to database
      setVotingStep('Recording vote in database...');
      const authToken = localStorage.getItem('voting_token') || undefined;
      const response = await votingAPI.castVoteWithTx(
        votingId,
        selectedCandidate,
        hash,
        estimatedBlockNumber,
        authToken
      );
      
      if (response.code !== 'SUCCESS') {
        // API returned error - show it to user
        setShowConfirmModal(false);
        setVoteError(response.msg || 'Failed to record vote in database');
        return;
      }
      
      setShowConfirmModal(false);
      setVoteSubmitted(true);
    } catch (error: unknown) {
      console.error('Error casting vote:', error);
      
      // Parse blockchain-specific errors
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        const msg = error.message.toLowerCase();
        
        if (msg.includes('alreadyvoted') || msg.includes('already voted')) {
          errorMessage = 'You have already voted in this election. Each NFT can only vote once.';
        } else if (msg.includes('notverifiedvoter') || msg.includes('not verified')) {
          errorMessage = 'Your NFT is not verified. Please complete KYC verification first.';
        } else if (msg.includes('nottokenowner') || msg.includes('not token owner')) {
          errorMessage = 'You do not own this Voter NFT. The NFT must be in your connected wallet.';
        } else if (msg.includes('noteligiblearea') || msg.includes('not eligible')) {
          errorMessage = 'Your residential area does not match this election\'s eligible voting areas.';
        } else if (msg.includes('electionnotactive') || msg.includes('not active')) {
          errorMessage = 'This election is not currently active';
        } else if (msg.includes('electionended') || msg.includes('ended')) {
          errorMessage = 'This election has ended';
        } else if (msg.includes('user rejected') || msg.includes('user denied')) {
          errorMessage = 'Transaction was cancelled by user';
        } else {
          errorMessage = error.message;
        }
      }
      
      setShowConfirmModal(false);
      setVoteError(errorMessage);
    } finally {
      setLoading(false);
      setVotingStep('');
    }
  };

  // Show error screen
  if (voteError) {
    return (
      <div className="max-w-2xl mx-auto animate-scale-in">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Vote Failed</h2>
          <p className="text-gray-400 mb-6">{voteError}</p>
          
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setVoteError(null)}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
            >
              Try Again
            </button>
            <Link
              href="/dashboard/votings"
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              Back to Elections
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (voteSubmitted) {
    const votedCandidate = voting.candidates.find(c => c.id === selectedCandidate);
    const explorerUrl = user?.nftChain === 'BNB' 
      ? `https://testnet.bscscan.com/tx/${txHash}`
      : `https://sepolia.etherscan.io/tx/${txHash}`;
    
    return (
      <div className="max-w-4xl mx-auto animate-scale-in">
        <div className="relative overflow-hidden  border border-green-500/30 rounded-3xl p-8 text-center">
          {/* Background Glow */}
       
          
          <div className="relative">
            {/* Success Icon */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3">Vote Submitted Successfully!</h2>
            <p className="text-gray-400 mb-6 text-lg">
              Your vote for <span className="text-green-400 font-semibold underline decoration-green-500/50">{votedCandidate?.name}</span> has been recorded on the blockchain.
            </p>
            
            {/* Transaction Details */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-6 text-left space-y-4">
              {/* Transaction Hash */}
              <div>
                <p className="text-yellow-400 text-sm font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Transaction Hash
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-green-400 text-sm font-mono bg-black/30 px-3 py-2 rounded-lg break-all">
                    {txHash || 'Pending...'}
                  </code>
                  {txHash && (
                    <button
                      onClick={() => navigator.clipboard.writeText(txHash)}
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors shrink-0"
                      title="Copy hash"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              {/* Block Number & Chain */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-cyan-400 text-sm font-semibold mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Block Number
                  </p>
                  <p className="text-white font-mono text-lg">{blockNumber || 'Pending...'}</p>
                </div>
                <div>
                  <p className="text-purple-400 text-sm font-semibold mb-1 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Voting Chain
                  </p>
                  <p className="text-white font-medium text-lg">
                    {user?.nftChain === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum Sepolia'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {txHash && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-purple-500/30 transition-all hover:scale-105"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Explorer
                </a>
              )}
              <Link
                href="/dashboard/votings"
                className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-green-500/30 transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                </svg>
                Back to Elections
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Back Button */}
      <Link href="/dashboard/votings" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors animate-fade-in">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Elections
      </Link>

      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 animate-slide-up">
        {/* Background Pattern */}
      
        
        <div className="relative p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{voting.title}</h1>
                  <p className="text-gray-400 text-sm mt-1">{voting.description}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                voting.status === 'active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                voting.status === 'upcoming' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                'bg-gray-500/20 text-gray-400 border border-gray-500/30'
              }`}>
                {voting.status === 'active' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>}
                {voting.status.charAt(0).toUpperCase() + voting.status.slice(1)}
              </span>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-all group">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Voting Area</p>
              </div>
              <p className="text-white font-semibold">{voting.votingArea}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-blue-500/30 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Chains</p>
              </div>
              <p className="text-white font-semibold">🟡 BNB  🔷 ETH</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-green-500/30 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-xs uppercase tracking-wider">Start</p>
              </div>
              <p className="text-white font-semibold">{new Date(voting.startTime).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5 hover:border-red-500/30 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-gray-500 text-xs uppercase tracking-wider">End</p>
              </div>
              <p className="text-white font-semibold">{new Date(voting.endTime).toLocaleString()}</p>
            </div>
          </div>

          {/* Eligible Areas */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <p className="text-gray-400 text-sm font-medium">Eligible Areas for This Election</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {voting.eligibleAreas?.map((area, idx) => (
                <span 
                  key={idx} 
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                    voterArea && area.toLowerCase() === voterArea.toLowerCase()
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-white/10 text-gray-300 border border-white/10'
                  }`}
                >
                  {voterArea && area.toLowerCase() === voterArea.toLowerCase() && (
                    <span className="mr-1">✓</span>
                  )}
                  {area}
                </span>
              ))}
            </div>
            {voterArea && (
              <p className="text-gray-500 text-xs mt-3">
                Your registered area: <span className={isAreaEligible ? 'text-green-400' : 'text-red-400'}>{voterArea}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Chain Vote Distribution */}
      {(voting.status === 'active' || voting.status === 'completed') && voting.totalVotes > 0 && voting.votesByChain && (
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-lg font-semibold text-white mb-4">Votes by Chain</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-yellow-400 font-medium">🟡 BNB Smart Chain</span>
                <span className="text-white font-bold">{voting.votesByChain.BNB.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(voting.votesByChain.BNB / voting.totalVotes * 100)}%` }}
                ></div>
              </div>
              <p className="text-yellow-400/70 text-sm mt-2">
                {((voting.votesByChain.BNB / voting.totalVotes) * 100).toFixed(1)}% of votes
              </p>
            </div>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-blue-400 font-medium">🔷 Ethereum</span>
                <span className="text-white font-bold">{voting.votesByChain.ETH.toLocaleString()}</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full transition-all duration-1000"
                  style={{ width: `${(voting.votesByChain.ETH / voting.totalVotes * 100)}%` }}
                ></div>
              </div>
              <p className="text-blue-400/70 text-sm mt-2">
                {((voting.votesByChain.ETH / voting.totalVotes) * 100).toFixed(1)}% of votes
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User's Voting Chain Info */}
      {canVote && user?.nftChain && (
        <div className={`rounded-xl p-4 border animate-slide-up ${
          user.nftChain === 'BNB' 
            ? 'bg-yellow-500/10 border-yellow-500/30' 
            : 'bg-blue-500/10 border-blue-500/30'
        }`} style={{ animationDelay: '0.15s' }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              user.nftChain === 'BNB' ? 'bg-yellow-500/20' : 'bg-blue-500/20'
            }`}>
              <span className="text-xl">{user.nftChain === 'BNB' ? '🟡' : '🔷'}</span>
            </div>
            <div>
              <p className={user.nftChain === 'BNB' ? 'text-yellow-400' : 'text-blue-400'}>
                <strong>Your Voting Chain:</strong> {userChain?.name}
              </p>
              <p className="text-gray-400 text-sm">
                Your vote will be recorded on the {userChain?.testnetName} using your NFT: {user.nftTokenId}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Candidates */}
      <div className="relative overflow-hidden rounded-2xl  border border-white/10 p-6 md:p-8 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                {canVote ? 'Select Your Candidate' : 'Candidates'}
              </h2>
              <p className="text-gray-500 text-sm">{voting.candidates.length} candidates running</p>
            </div>
          </div>
          {canVote && (
            <span className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-blue-400 text-sm">
              Click to select
            </span>
          )}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {voting.candidates.map((candidate, idx) => {
            const votePercentage = voting.totalVotes > 0 
              ? (candidate.voteCount / voting.totalVotes * 100).toFixed(1)
              : '0';
            const isLeading = candidate.voteCount === maxVotes && maxVotes > 0;
            const isSelected = selectedCandidate === candidate.id;
            
            return (
              <div
                key={candidate.id}
                onClick={() => canVote && setSelectedCandidate(candidate.id)}
                className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 animate-fade-in-up ${
                  canVote ? 'cursor-pointer hover:scale-[1.02]' : ''
                } ${
                  isSelected
                    ? 'border-purple-500 bg-purple-500/10 shadow-xl shadow-purple-500/20 ring-2 ring-purple-500/30'
                    : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                }`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                {/* Selection Glow Effect */}
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-blue-500/10 pointer-events-none"></div>
                )}
                
                {/* Winner/Leading Badge */}
                {isLeading && voting.totalVotes > 0 && (
                  <div className="absolute top-3 right-3">
                    <span className={`px-2.5 py-1 text-white text-xs rounded-full font-semibold flex items-center gap-1 shadow-lg ${
                      voting.status === 'completed' 
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                        : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                    }`}>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {voting.status === 'completed' ? 'Winner' : 'Leading'}
                    </span>
                  </div>
                )}
                
                <div className="relative p-5">
                  <div className="flex items-start gap-4">
                    {/* Candidate Number Badge */}
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-lg transition-all ${
                      isSelected 
                        ? 'bg-gradient-to-br from-purple-500 to-blue-600' 
                        : 'bg-gradient-to-br from-gray-600 to-gray-700'
                    }`}>
                      {idx + 1}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white mb-1">{candidate.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-md font-medium">
                          {candidate.party}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm line-clamp-2">{candidate.description}</p>
                    </div>

                    {/* Selection Indicator */}
                    {canVote && (
                      <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                        isSelected
                          ? 'border-purple-500 bg-purple-500 scale-110 shadow-lg shadow-purple-500/50'
                          : 'border-gray-500 hover:border-gray-400'
                      }`}>
                        {isSelected && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Vote Results (for active/completed) */}
                  {(voting.status === 'active' || voting.status === 'completed') && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-400">{candidate.voteCount.toLocaleString()} votes</span>
                        <span className="text-white font-medium">{votePercentage}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            isLeading ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-purple-600'
                          }`}
                          style={{ width: `${votePercentage}%` }}
                        ></div>
                      </div>
                      {/* Chain breakdown */}
                      {candidate.votesByChain && (
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          <span className="text-yellow-400">🟡 {candidate.votesByChain.BNB}</span>
                          <span className="text-blue-400">🔷 {candidate.votesByChain.ETH}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vote Button */}
      {canVote && (
        <div className="relative animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-500 rounded-2xl blur-xl opacity-40"></div>
          <button
            onClick={() => selectedCandidate && setShowConfirmModal(true)}
            disabled={!selectedCandidate}
            className="relative w-full flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-green-600 via-emerald-500 to-teal-500 text-white font-bold text-lg rounded-2xl hover:shadow-2xl hover:shadow-green-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.01] disabled:hover:scale-100 border border-white/20 overflow-hidden group"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
            
            <div className="relative w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="relative flex-1 text-left">
              <div className="text-xl font-bold tracking-wide">Submit Your Vote</div>
              <div className="text-sm text-white/70 flex items-center gap-2">
                <span>on</span>
                <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                  user?.nftChain === 'BNB' 
                    ? 'bg-yellow-500/30 text-yellow-200' 
                    : 'bg-blue-500/30 text-blue-200'
                }`}>
                  {user?.nftChain === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum Sepolia'}
                </span>
              </div>
            </div>
            <div className="relative w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          </button>
        </div>
      )}

      {/* Voting Status Messages */}
      {voting.status === 'active' && !isAdmin && (
        <>
          {/* Loading eligibility */}
          {isLoadingEligibility && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
                <p className="text-blue-400">Checking voting eligibility...</p>
              </div>
            </div>
          )}

          {/* Not connected */}
          {!isLoadingEligibility && !isConnected && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-yellow-400 font-medium">Wallet not connected</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Please connect your wallet using the button in the top navigation to vote.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Connected but no verified NFT */}
          {!isLoadingEligibility && isConnected && !hasValidNFT && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-yellow-400 font-medium">No verified Voter NFT found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your connected wallet does not have a verified Voter NFT. Complete KYC verification to receive your NFT voter ID.
                  </p>
                  <Link href="/dashboard/kyc" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-flex items-center gap-1">
                    Complete KYC 
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Already voted */}
          {!isLoadingEligibility && isConnected && hasValidNFT && alreadyVoted && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-400 font-medium">You have already voted</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your NFT (Token ID: {tokenIdNumber}) has already been used to cast a vote in this election.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Area not eligible warning */}
          {!isLoadingEligibility && hasValidNFT && !alreadyVoted && !isAreaEligible && voterArea && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                <div>
                  <p className="text-red-400 font-medium">Not Eligible for This Election</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your residential area <span className="text-white font-medium">({voterArea})</span> is not eligible for this election.
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Eligible areas: {voting.eligibleAreas?.join(', ') || 'None specified'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Verified NFT badge - can vote */}
          {!isLoadingEligibility && hasValidNFT && !alreadyVoted && isAreaEligible && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="text-green-400 font-medium">✓ Verified Voter</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Your NFT (Token ID: {tokenIdNumber}) is verified. Your area <span className="text-green-400">({voterArea})</span> is eligible to vote in this election.
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Total Votes Summary */}
      {(voting.status === 'active' || voting.status === 'completed') && (
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Votes Cast</p>
              <p className="text-4xl font-bold text-white">{voting.totalVotes.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Vote Modal */}
      {showConfirmModal && selectedCandidate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Your Vote</h3>
            <p className="text-gray-400 mb-6">
              You are about to cast your vote. This action cannot be undone.
            </p>
            
            <div className="bg-white/5 rounded-xl p-4 mb-4">
              <p className="text-gray-500 text-sm mb-1">Your vote for:</p>
              <p className="text-white font-semibold text-lg">
                {voting.candidates.find(c => c.id === selectedCandidate)?.name}
              </p>
              <p className="text-blue-400 text-sm">
                {voting.candidates.find(c => c.id === selectedCandidate)?.party}
              </p>
            </div>

            <div className={`rounded-xl p-4 mb-6 ${
              user?.nftChain === 'BNB' 
                ? 'bg-yellow-500/10 border border-yellow-500/30' 
                : 'bg-blue-500/10 border border-blue-500/30'
            }`}>
              <p className={user?.nftChain === 'BNB' ? 'text-yellow-400' : 'text-blue-400'} >
                <strong>Voting Chain:</strong> {user?.nftChain === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                NFT: {user?.nftTokenId}
              </p>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
              <p className="text-yellow-400 text-sm">
                <strong>Important:</strong> Your vote will be permanently recorded on the blockchain and cannot be changed.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {loading || isWritePending || isConfirming ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    {votingStep || 'Processing...'}
                  </span>
                ) : (
                  'Confirm Vote'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
