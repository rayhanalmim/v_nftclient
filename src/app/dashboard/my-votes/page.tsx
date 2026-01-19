'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { votingAPI } from '@/lib/api';
import Link from 'next/link';

interface MyVote {
  id: string;
  votingId: string;
  votingTitle: string;
  candidateName: string;
  candidateParty: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
  chainType: 'BNB' | 'ETH';
  status: 'confirmed' | 'pending';
}

export default function MyVotesPage() {
  const { user } = useAuth();
  const [myVotes, setMyVotes] = useState<MyVote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyVotes = async () => {
      try {
        const response = await votingAPI.getMyVotes();
        if (response.code === 'SUCCESS' && response.data) {
          setMyVotes(response.data);
        }
      } catch (error) {
        console.error('Error fetching votes:', error);
      } finally {
        setLoading(false);
      }
    };
    if (!user?.isAdmin) {
      fetchMyVotes();
    } else {
      setLoading(false);
    }
  }, [user?.isAdmin]);
  
  if (user?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Admin Account</h2>
        <p className="text-gray-400 mb-6">Admin users cannot cast votes. Use a regular user account to participate in elections.</p>
        <Link href="/dashboard/votings" className="text-blue-400 hover:text-blue-300">
          View All Elections →
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">My Votes</h1>
        <p className="text-gray-400 mt-1">View your voting history and verify your votes on the blockchain</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Votes Cast</p>
              <p className="text-2xl font-bold text-white">{myVotes.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Confirmed</p>
              <p className="text-2xl font-bold text-green-400">
                {myVotes.filter(v => v.status === 'confirmed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">NFT Voter ID</p>
              <p className="text-lg font-bold text-white">
                {user?.nftTokenId || 'Not assigned'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Voting History */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-6">Voting History</h2>

        {myVotes.length > 0 ? (
          <div className="space-y-4">
            {myVotes.map((vote) => (
              <div key={vote.id} className=" border border-white/10 rounded-xl p-5">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{vote.votingTitle}</h3>
                    <p className="text-gray-400 text-sm">
                      Voted on {new Date(vote.timestamp).toLocaleDateString()} at {new Date(vote.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium self-start ${
                    vote.status === 'confirmed' 
                      ? 'bg-green-500/20 text-green-400' 
                      : 'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {vote.status === 'confirmed' ? '✓ Confirmed' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Your Vote</p>
                    <p className="text-white font-medium">{vote.candidateName}</p>
                    <p className="text-blue-400 text-sm">{vote.candidateParty}</p>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-gray-500 text-xs mb-1">Network</p>
                    <p className="text-white font-medium">
                      {vote.chainType === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum'}
                    </p>
                    <p className="text-gray-400 text-sm">Block #{vote.blockNumber.toLocaleString()}</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 text-xs mb-1">Transaction Hash</p>
                      <p className="text-white font-mono text-sm">
                        {vote.transactionHash.slice(0, 20)}...{vote.transactionHash.slice(-10)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(vote.transactionHash)}
                        className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="Copy hash"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                      <a
                        href={vote.chainType === 'BNB' 
                          ? `https://testnet.bscscan.com/tx/${vote.transactionHash}`
                          : `https://sepolia.etherscan.io/tx/${vote.transactionHash}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-white/5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        title="View on explorer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                </div>

                {vote.votingId && (
                  <Link
                    href={`/dashboard/votings/${vote.votingId}`}
                    className="mt-4 flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    View Election Results
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400 mb-4">You haven&apos;t cast any votes yet</p>
            <Link
              href="/dashboard/votings"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              View Available Elections
            </Link>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-blue-400 font-medium">Blockchain Verification</p>
            <p className="text-gray-400 text-sm mt-1">
              All your votes are permanently recorded on the blockchain. You can verify any vote by clicking the 
              transaction hash and viewing it on the block explorer. This ensures complete transparency and immutability.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
