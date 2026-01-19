'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { VOTING_AREAS, Candidate } from '@/types';
import { votingAPI } from '@/lib/api';
import Link from 'next/link';

export default function CreateVotingPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [votingArea, setVotingArea] = useState('');
  const [eligibleAreas, setEligibleAreas] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [candidates, setCandidates] = useState<Partial<Candidate>[]>([
    { name: '', party: '', description: '' },
    { name: '', party: '', description: '' },
  ]);

  // Redirect non-admin users
  if (!user?.isAdmin) {
    router.push('/dashboard');
    return null;
  }

  const handleAddCandidate = () => {
    setCandidates([...candidates, { name: '', party: '', description: '' }]);
  };

  const handleRemoveCandidate = (index: number) => {
    if (candidates.length > 2) {
      setCandidates(candidates.filter((_, i) => i !== index));
    }
  };

  const handleCandidateChange = (index: number, field: string, value: string) => {
    const updated = [...candidates];
    updated[index] = { ...updated[index], [field]: value };
    setCandidates(updated);
  };

  const handleAreaToggle = (area: string) => {
    if (eligibleAreas.includes(area)) {
      setEligibleAreas(eligibleAreas.filter(a => a !== area));
    } else {
      setEligibleAreas([...eligibleAreas, area]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      alert('Please enter an election title');
      return;
    }
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }
    if (!votingArea) {
      alert('Please select a primary voting area');
      return;
    }
    if (eligibleAreas.length === 0) {
      alert('Please select at least one eligible area');
      return;
    }
    if (!startDate || !endDate) {
      alert('Please set start and end dates');
      return;
    }
    if (new Date(startDate) >= new Date(endDate)) {
      alert('End date must be after start date');
      return;
    }
    
    const validCandidates = candidates.filter(c => c.name?.trim() && c.party?.trim());
    if (validCandidates.length < 2) {
      alert('Please add at least 2 candidates with name and party');
      return;
    }

    setLoading(true);
    
    try {
      // Convert to ISO format for consistent parsing on server
      const startTimeISO = new Date(startDate).toISOString();
      const endTimeISO = new Date(endDate).toISOString();
      
      console.log('Sending voting request:', { startDate, endDate, startTimeISO, endTimeISO });
      
      const response = await votingAPI.create({
        title,
        description,
        votingArea,
        eligibleAreas,
        startTime: startTimeISO,
        endTime: endTimeISO,
        chainType: 'BNB',
        candidates: validCandidates.map((c) => ({
          name: c.name!,
          party: c.party!,
          description: c.description || '',
        })),
      });
      
      if (response.code === 'SUCCESS') {
        setSuccess(true);
      } else {
        alert(response.msg || 'Failed to create election');
      }
    } catch (error) {
      console.error('Error creating election:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-5xl mx-auto animate-scale-in">
        <div className="relative overflow-hidden  border border-green-500/30 rounded-3xl p-8 text-center">
          {/* Background Glow */}
       
          
          <div className="relative">
            {/* Success Icon */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-green-500/30">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-3">Election Created Successfully!</h2>
            <p className="text-gray-400 mb-6 text-lg">
              The election &quot;<span className="text-green-400 font-semibold">{title}</span>&quot; has been created and will be available for voting on <span className="text-white">{new Date(startDate).toLocaleDateString()}</span>.
            </p>
            
            {/* Multi-Chain Info */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-6">
              <div className="flex items-center justify-center gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🟡</span>
                  <span className="text-yellow-400 font-medium">BNB Smart Chain</span>
                </div>
                <span className="text-gray-600">|</span>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔷</span>
                  <span className="text-blue-400 font-medium">Ethereum</span>
                </div>
              </div>
              <p className="text-gray-500 text-sm">
                Voters can participate using their NFT from either chain
              </p>
            </div>

            {/* Eligible Areas */}
            {eligibleAreas.length > 0 && (
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-4 mb-6">
                <p className="text-purple-400 text-sm font-medium mb-2">Eligible Voting Areas</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {eligibleAreas.map((area, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Buttons */}
            <div className="flex gap-4 justify-center">
              <Link
                href="/dashboard/votings"
                className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-green-500/30 transition-all hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                View All Elections
              </Link>
              <button
                onClick={() => {
                  setSuccess(false);
                  setTitle('');
                  setDescription('');
                  setVotingArea('');
                  setEligibleAreas([]);
                  setStartDate('');
                  setEndDate('');
                  setCandidates([
                    { name: '', party: '', description: '' },
                    { name: '', party: '', description: '' },
                  ]);
                }}
                className="flex items-center gap-2 px-8 py-4 bg-white/5 border border-white/20 text-white font-bold rounded-xl hover:bg-white/10 transition-all"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">Create New Election</h1>
          <p className="text-gray-400 mt-1">Set up a new voting event for the decentralized system</p>
        </div>
        <Link href="/dashboard/votings" className="text-gray-400 hover:text-white transition-colors">
          Cancel
        </Link>
      </div>

      {/* Multi-Chain Info Banner */}
      <div className="bg-gradient-to-r from-yellow-500/10 via-blue-500/10 to-purple-500/10 border border-white/10 rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">🟡</span>
            <span className="text-gray-400">+</span>
            <span className="text-2xl">🔷</span>
          </div>
          <div>
            <h3 className="text-white font-semibold mb-1">Multi-Chain Voting Support</h3>
            <p className="text-gray-400 text-sm">
              This election will automatically support voting from both <span className="text-yellow-400">BNB Smart Chain</span> and <span className="text-blue-400">Ethereum</span>. 
              Voters can participate using their NFT from either chain, and all votes will be tracked and aggregated.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="glass rounded-2xl p-6 animate-slide-up">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Basic Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Election Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., City Council Election 2025"
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose and scope of this election..."
                rows={4}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none"
              />
            </div>
          </div>
        </div>

        {/* Voting Area & Eligibility */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Voting Area & Eligibility
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Primary Voting Area <span className="text-red-400">*</span>
              </label>
              <select
                value={votingArea}
                onChange={(e) => setVotingArea(e.target.value)}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Select primary area</option>
                <option value="National">National (All Areas)</option>
                {VOTING_AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Eligible Areas <span className="text-red-400">*</span>
                <span className="text-gray-500 font-normal ml-2">(Select all that apply)</span>
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (eligibleAreas.length === VOTING_AREAS.length) {
                      setEligibleAreas([]);
                    } else {
                      setEligibleAreas([...VOTING_AREAS]);
                    }
                  }}
                  className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    eligibleAreas.length === VOTING_AREAS.length
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30'
                  }`}
                >
                  {eligibleAreas.length === VOTING_AREAS.length ? '✓ All Selected' : 'Select All'}
                </button>
                {VOTING_AREAS.map((area) => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => handleAreaToggle(area)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      eligibleAreas.includes(area)
                        ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                        : 'bg-white/5 text-gray-400 border border-white/10 hover:border-white/30'
                    }`}
                  >
                    {eligibleAreas.includes(area) && '✓ '}{area}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Timeline
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Start Date & Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                End Date & Time <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Candidates */}
        <div className="glass rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Candidates
            </h2>
            <button
              type="button"
              onClick={handleAddCandidate}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Candidate
            </button>
          </div>

          <div className="space-y-4">
            {candidates.map((candidate, index) => (
              <div key={index} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:border-white/20 transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                      {index + 1}
                    </div>
                    <h3 className="text-white font-medium">Candidate {index + 1}</h3>
                  </div>
                  {candidates.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCandidate(index)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-500 text-xs font-medium mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidate.name || ''}
                      onChange={(e) => handleCandidateChange(index, 'name', e.target.value)}
                      placeholder="Candidate name"
                      className="w-full bg-[#1E2329] border border-[#2B3139] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-500 text-xs font-medium mb-1">
                      Party/Affiliation <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidate.party || ''}
                      onChange={(e) => handleCandidateChange(index, 'party', e.target.value)}
                      placeholder="Party name"
                      className="w-full bg-[#1E2329] border border-[#2B3139] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-gray-500 text-xs font-medium mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={candidate.description || ''}
                      onChange={(e) => handleCandidateChange(index, 'description', e.target.value)}
                      placeholder="Brief description or background"
                      className="w-full bg-[#1E2329] border border-[#2B3139] rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] disabled:hover:scale-100"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Creating Election...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Election
            </>
          )}
        </button>
      </form>
    </div>
  );
}
