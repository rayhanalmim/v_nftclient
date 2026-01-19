'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { votingAPI, kycAPI, userAPI, Voting, KYCRequest } from '@/lib/api';
import Link from 'next/link';

interface Stats {
  totalUsers: number;
  verifiedVoters: number;
  pendingKYC: number;
  activeVotings: number;
  completedVotings: number;
  totalVotesCast: number;
  nftsMinted: number;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeVotings, setActiveVotings] = useState<Voting[]>([]);
  const [upcomingVotings, setUpcomingVotings] = useState<Voting[]>([]);
  const [pendingKYC, setPendingKYC] = useState<KYCRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch votings
        const votingsRes = await votingAPI.getAll();
        if (votingsRes.code === 'SUCCESS' && votingsRes.data) {
          setActiveVotings(votingsRes.data.filter(v => v.status === 'active'));
          setUpcomingVotings(votingsRes.data.filter(v => v.status === 'upcoming'));
        }

        // Fetch admin-specific data
        if (isAdmin) {
          const [statsRes, kycRes] = await Promise.all([
            userAPI.getStats(),
            kycAPI.getRequests('pending')
          ]);
          
          if (statsRes.code === 'SUCCESS' && statsRes.data) {
            setStats(statsRes.data);
          }
          if (kycRes.code === 'SUCCESS' && kycRes.data) {
            setPendingKYC(kycRes.data);
          }
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-cyan-500/10 border border-white/10 rounded-2xl p-8 animate-fade-in">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Welcome back, <span className="gradient-text">{user?.name}</span>! 👋
            </h1>
            <p className="text-gray-400 text-lg">
              {isAdmin 
                ? 'Manage the voting system, approve KYC requests, and create new elections.'
                : 'View active elections, complete your verification, and cast your vote.'}
            </p>
          </div>
          {!isAdmin && user?.kycStatus !== 'approved' && (
            <Link
              href="/dashboard/kyc"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-105 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
              </svg>
              Complete KYC
            </Link>
          )}
        </div>
      </div>

      {/* KYC Status Card for Non-Admin Users */}
      {!isAdmin && (
        <div className={`rounded-2xl p-6 border transition-all duration-300 animate-slide-up ${
          user?.kycStatus === 'approved' 
            ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50' 
            : user?.kycStatus === 'pending'
            ? 'bg-yellow-500/10 border-yellow-500/30 hover:border-yellow-500/50'
            : user?.kycStatus === 'rejected'
            ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50'
            : 'bg-gray-500/10 border-gray-500/30 hover:border-gray-500/50'
        }`} style={{ animationDelay: '0.1s' }}>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-transform hover:scale-110 ${
              user?.kycStatus === 'approved' 
                ? 'bg-green-500/20' 
                : user?.kycStatus === 'pending'
                ? 'bg-yellow-500/20'
                : user?.kycStatus === 'rejected'
                ? 'bg-red-500/20'
                : 'bg-gray-500/20'
            }`}>
              {user?.kycStatus === 'approved' ? (
                <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              ) : user?.kycStatus === 'pending' ? (
                <svg className="w-7 h-7 text-yellow-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : user?.kycStatus === 'rejected' ? (
                <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg mb-1 ${
                user?.kycStatus === 'approved' 
                  ? 'text-green-400' 
                  : user?.kycStatus === 'pending'
                  ? 'text-yellow-400'
                  : user?.kycStatus === 'rejected'
                  ? 'text-red-400'
                  : 'text-gray-400'
              }`}>
                {user?.kycStatus === 'approved' 
                  ? 'Identity Verified ✓' 
                  : user?.kycStatus === 'pending'
                  ? 'Verification Pending'
                  : user?.kycStatus === 'rejected'
                  ? 'Verification Rejected'
                  : 'Verification Required'}
              </h3>
              <p className="text-gray-400">
                {user?.kycStatus === 'approved' 
                  ? (
                    <>
                      Your NFT voter ID: <span className="text-white font-mono">{user.nftTokenId}</span> on{' '}
                      <span className={user.nftChain === 'BNB' ? 'text-yellow-400' : 'text-blue-400'}>
                        {user.nftChain === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum'}
                      </span>
                    </>
                  )
                  : user?.kycStatus === 'pending'
                  ? 'Your documents are being reviewed. This may take up to 72 hours.'
                  : user?.kycStatus === 'rejected'
                  ? 'Please review the rejection reason and resubmit your documents.'
                  : 'Complete KYC verification to receive your NFT voter ID and participate in elections.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid - Admin View */}
      {isAdmin && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Users', value: stats.totalUsers, color: 'blue', icon: 'users' },
            { label: 'Verified Voters', value: stats.verifiedVoters, color: 'green', icon: 'shield' },
            { label: 'Pending KYC', value: stats.pendingKYC, color: 'yellow', icon: 'clock' },
            { label: 'Total Votes', value: stats.totalVotesCast, color: 'purple', icon: 'vote' },
          ].map((stat, idx) => (
            <div 
              key={idx}
              className="glass rounded-2xl p-6 hover-lift animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.1}s` }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl bg-${stat.color}-500/20 flex items-center justify-center`}>
                  {stat.icon === 'users' && (
                    <svg className={`w-7 h-7 text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  {stat.icon === 'shield' && (
                    <svg className={`w-7 h-7 text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  )}
                  {stat.icon === 'clock' && (
                    <svg className={`w-7 h-7 text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {stat.icon === 'vote' && (
                    <svg className={`w-7 h-7 text-${stat.color}-400`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin: Pending KYC Requests */}
      {isAdmin && pendingKYC.length > 0 && (
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Pending KYC Requests</h2>
              <p className="text-gray-400 text-sm mt-1">Review and approve voter verification</p>
            </div>
            <Link href="/dashboard/kyc-requests" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors">
              View All 
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 text-sm border-b border-white/10">
                  <th className="pb-4 font-medium">User</th>
                  <th className="pb-4 font-medium">Chain</th>
                  <th className="pb-4 font-medium">Wallet</th>
                  <th className="pb-4 font-medium">Submitted</th>
                  <th className="pb-4 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingKYC.slice(0, 5).map((kyc, idx) => (
                  <tr key={kyc.id} className="border-b border-white/5 hover:bg-white/5 transition-colors animate-fade-in" style={{ animationDelay: `${idx * 0.05}s` }}>
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {kyc.userName.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{kyc.userName}</p>
                          <p className="text-gray-500 text-xs">{kyc.userEmail}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                        kyc.chainType === 'BNB' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {kyc.chainType === 'BNB' ? '🟡 BNB' : '🔷 ETH'}
                      </span>
                    </td>
                    <td className="py-4">
                      <span className="text-gray-400 font-mono text-xs">
                        {kyc.walletAddress.slice(0, 8)}...{kyc.walletAddress.slice(-6)}
                      </span>
                    </td>
                    <td className="py-4 text-gray-400">
                      {new Date(kyc.submittedAt).toLocaleDateString()}
                    </td>
                    <td className="py-4">
                      <Link
                        href={`/dashboard/kyc-requests/${kyc.id}`}
                        className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors font-medium text-sm"
                      >
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Active Votings */}
      <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">
              {isAdmin ? 'Active Elections' : 'Vote Now'}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              {isAdmin ? 'Currently running elections' : 'Elections you can participate in'}
            </p>
          </div>
          <Link href="/dashboard/votings" className="text-blue-400 hover:text-blue-300 text-sm font-medium flex items-center gap-1 transition-colors">
            View All 
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {activeVotings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {activeVotings.map((voting, idx) => (
              <div 
                key={voting.id} 
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-blue-500/50 transition-all hover-lift animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-2">{voting.title}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{voting.description}</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 animate-pulse ml-4">
                    Active
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 mb-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {voting.votingArea}
                  </span>
                  <span className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-lg">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {voting.candidates.length} candidates
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 text-sm">
                    Ends: {new Date(voting.endTime).toLocaleDateString()}
                  </span>
                  <Link
                    href={`/dashboard/votings/${voting.id}`}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:shadow-lg hover:shadow-blue-500/25 transition-all text-sm font-medium"
                  >
                    {isAdmin ? 'View Details' : 'Vote Now'}
                  </Link>
                </div>
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
            <p className="text-gray-400">No active elections at the moment</p>
          </div>
        )}
      </div>

      {/* Upcoming Votings */}
      {upcomingVotings.length > 0 && (
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <h2 className="text-xl font-bold text-white mb-6">Upcoming Elections</h2>
          <div className="space-y-4">
            {upcomingVotings.map((voting, idx) => (
              <div 
                key={voting.id} 
                className="flex items-center justify-between p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all animate-fade-in"
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{voting.title}</h3>
                    <p className="text-gray-400 text-sm">
                      Starts: {new Date(voting.startTime).toLocaleDateString()} • {voting.votingArea}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                  Upcoming
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NFT Info for Verified Users */}
      {!isAdmin && user?.kycStatus === 'approved' && user?.nftTokenId && (
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-cyan-500/10 border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10 flex items-start gap-5">
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold text-xl mb-2">Your NFT Voter ID</h3>
              <p className="text-gray-400 text-sm mb-4">
                This unique NFT represents your verified identity and enables you to participate in decentralized voting.
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-gray-500 text-xs mb-1">Token ID</p>
                  <p className="text-white font-mono font-semibold">{user.nftTokenId}</p>
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-gray-500 text-xs mb-1">Voting Chain</p>
                  <p className={`font-semibold ${user.nftChain === 'BNB' ? 'text-yellow-400' : 'text-blue-400'}`}>
                    {user.nftChain === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum'}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                  <p className="text-gray-500 text-xs mb-1">Wallet</p>
                  <p className="text-white font-mono text-sm">
                    {user.walletAddress?.slice(0, 8)}...{user.walletAddress?.slice(-6)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
