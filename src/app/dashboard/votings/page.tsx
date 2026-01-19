'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { votingAPI, Voting } from '@/lib/api';
import Link from 'next/link';

export default function VotingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.isAdmin;
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [votings, setVotings] = useState<Voting[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVotings = async () => {
      try {
        const response = await votingAPI.getAll();
        if (response.code === 'SUCCESS' && response.data) {
          setVotings(response.data);
        }
      } catch (error) {
        console.error('Error fetching votings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchVotings();
  }, []);

  const filteredVotings = votings.filter((voting) => {
    const matchesStatus = statusFilter === 'all' || voting.status === statusFilter;
    const matchesChain = chainFilter === 'all' || voting.chainType === chainFilter;
    return matchesStatus && matchesChain;
  });

  const getStatusBadge = (status: Voting['status']) => {
    const styles = {
      upcoming: 'bg-blue-500/20 text-blue-400',
      active: 'bg-green-500/20 text-green-400',
      completed: 'bg-gray-500/20 text-gray-400',
      cancelled: 'bg-red-500/20 text-red-400',
    };
    const labels = {
      upcoming: 'Upcoming',
      active: 'Active',
      completed: 'Completed',
      cancelled: 'Cancelled',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const activeCount = votings.filter(v => v.status === 'active').length;
  const upcomingCount = votings.filter(v => v.status === 'upcoming').length;
  const completedCount = votings.filter(v => v.status === 'completed').length;

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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            {isAdmin ? 'Manage Elections' : 'Available Elections'}
          </h1>
          <p className="text-gray-400 mt-1">
            {isAdmin
              ? 'View and manage all elections in the system'
              : 'Browse active and upcoming elections you can participate in'}
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/create-voting"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create New Election
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active</p>
              <p className="text-2xl font-bold text-green-400">{activeCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Upcoming</p>
              <p className="text-2xl font-bold text-blue-400">{upcomingCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gray-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Completed</p>
              <p className="text-2xl font-bold text-gray-400">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Chains</option>
            <option value="BNB">BNB Smart Chain</option>
            <option value="ETH">Ethereum</option>
          </select>
        </div>
      </div>

      {/* Votings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredVotings.length > 0 ? (
          filteredVotings.map((voting) => (
            <div
              key={voting.id}
              className="bg-[#12161C] border border-white/10 rounded-2xl p-6 hover:border-blue-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{voting.title}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{voting.description}</p>
                </div>
                {getStatusBadge(voting.status)}
              </div>

              <div className="flex flex-wrap gap-3 mb-4">
                <span className="flex items-center gap-1 text-gray-400 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {voting.votingArea}
                </span>
                <span className="flex items-center gap-1 text-gray-400 text-sm">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {voting.candidates.length} candidates
                </span>
                <span className="inline-flex gap-2 px-2 py-0.5 rounded text-xs font-medium">
                  <span className="bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">
                    🟡 BNB
                  </span>
                  <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">
                    🔷 ETH
                  </span>
                </span>

              </div>

              {/* Timeline */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-gray-500">Start</p>
                    <p className="text-white">{new Date(voting.startTime).toLocaleDateString()}</p>
                  </div>
                  <div className="flex-1 mx-4">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                      {voting.status === 'active' && (
                        <div className="h-full bg-green-500 rounded-full" style={{ width: '50%' }}></div>
                      )}
                      {voting.status === 'completed' && (
                        <div className="h-full bg-gray-500 rounded-full w-full"></div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">End</p>
                    <p className="text-white">{new Date(voting.endTime).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {/* Vote Count for completed/active */}
              {(voting.status === 'active' || voting.status === 'completed') && (
                <div className="flex items-center justify-between mb-4 text-sm">
                  <span className="text-gray-400">Total Votes</span>
                  <span className="text-white font-semibold">{voting.totalVotes.toLocaleString()}</span>
                </div>
              )}

              {/* Action Button */}
              <Link
                href={`/dashboard/votings/${voting.id}`}
                className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all ${voting.status === 'active' && !isAdmin && user?.kycStatus === 'approved'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:shadow-lg hover:shadow-blue-500/25'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
                  }`}
              >
                {voting.status === 'active' && !isAdmin && user?.kycStatus === 'approved' ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Cast Your Vote
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    View Details
                  </>
                )}
              </Link>

              {/* Warning for unverified users */}
              {voting.status === 'active' && !isAdmin && user?.kycStatus !== 'approved' && (
                <p className="text-yellow-400 text-xs mt-3 text-center">
                  Complete KYC verification to participate
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-2 text-center py-12 bg-[#12161C] border border-white/10 rounded-2xl">
            <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-400">No elections found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
