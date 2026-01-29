'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { userAPI } from '@/lib/api';

interface Voter {
  id: string;
  name: string;
  email: string;
  walletAddress?: string;
  area: string;
  chainType: string;
  nftTokenId?: string;
  nftTransactionHash?: string;
  ipfsMetadataHash?: string;
  totalVotes: number;
  verifiedAt: string;
}

interface VoterWithDetails extends Voter {
  lastVotedAt?: string | null;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties: {
    voterWallet: string;
    nidHash: string;
    dataHash: string;
    registrationDate: string;
  };
}

export default function VotersPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [chainFilter, setChainFilter] = useState<string>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [voters, setVoters] = useState<VoterWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVoter, setSelectedVoter] = useState<VoterWithDetails | null>(null);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [showNftModal, setShowNftModal] = useState(false);

  useEffect(() => {
    const fetchVoters = async () => {
      try {
        const response = await userAPI.getVoters();
        if (response.code === 'SUCCESS' && response.data) {
          setVoters(response.data);
        }
      } catch (error) {
        console.error('Error fetching voters:', error);
      } finally {
        setLoading(false);
      }
    };
    if (user?.isAdmin) {
      fetchVoters();
    }
  }, [user?.isAdmin]);

  // Fetch NFT metadata from IPFS
  const viewNftDetails = async (voter: VoterWithDetails) => {
    setSelectedVoter(voter);
    setShowNftModal(true);
    setNftMetadata(null);
    
    if (!voter.ipfsMetadataHash) {
      return;
    }

    setLoadingMetadata(true);
    try {
      // Try multiple IPFS gateways
      const gateways = [
        `https://gateway.pinata.cloud/ipfs/${voter.ipfsMetadataHash}`,
        `https://ipfs.io/ipfs/${voter.ipfsMetadataHash}`,
        `https://cloudflare-ipfs.com/ipfs/${voter.ipfsMetadataHash}`,
      ];
      
      for (const gateway of gateways) {
        try {
          const response = await fetch(gateway);
          if (response.ok) {
            const metadata = await response.json();
            setNftMetadata(metadata);
            break;
          }
        } catch {
          continue;
        }
      }
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
    } finally {
      setLoadingMetadata(false);
    }
  };

  // Get explorer URL
  const getExplorerUrl = (hash: string, type: 'tx' | 'address', chainType: string) => {
    const baseUrl = chainType === 'BNB' 
      ? 'https://bscscan.com' 
      : 'https://sepolia.etherscan.io';
    return `${baseUrl}/${type}/${hash}`;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Redirect non-admin users
  if (!user?.isAdmin) {
    router.push('/dashboard');
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredVoters = voters.filter((voter) => {
    const matchesChain = chainFilter === 'all' || voter.chainType === chainFilter;
    const matchesArea = areaFilter === 'all' || voter.area === areaFilter;
    const matchesSearch = 
      voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (voter.walletAddress && voter.walletAddress.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesChain && matchesArea && matchesSearch;
  });

  const uniqueAreas = [...new Set(voters.map(v => v.area))];
  const bnbCount = voters.filter(v => v.chainType === 'BNB').length;
  const ethCount = voters.filter(v => v.chainType === 'ETH').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white">Verified Voters</h1>
        <p className="text-gray-400 mt-1">View all verified voters with NFT voter IDs</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Total Voters</p>
              <p className="text-2xl font-bold text-white">{voters.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
              <span className="text-xl">🟡</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">BNB Chain</p>
              <p className="text-2xl font-bold text-yellow-400">{bnbCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <span className="text-xl">🔷</span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Ethereum</p>
              <p className="text-2xl font-bold text-blue-400">{ethCount}</p>
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
              <p className="text-gray-400 text-sm">NFTs Minted</p>
              <p className="text-2xl font-bold text-purple-400">{voters.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email, wallet, or NFT ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Chain Filter */}
          <select
            value={chainFilter}
            onChange={(e) => setChainFilter(e.target.value)}
            className="bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Chains</option>
            <option value="BNB">🟡 BNB Smart Chain</option>
            <option value="ETH">🔷 Ethereum</option>
          </select>

          {/* Area Filter */}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Areas</option>
            {uniqueAreas.map(area => (
              <option key={area} value={area}>{area}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Voters Table */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-400 text-sm border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 font-medium">Voter</th>
                <th className="px-6 py-4 font-medium">NFT ID</th>
                <th className="px-6 py-4 font-medium">Chain</th>
                <th className="px-6 py-4 font-medium">Wallet</th>
                <th className="px-6 py-4 font-medium">Area</th>
                <th className="px-6 py-4 font-medium">Votes</th>
                <th className="px-6 py-4 font-medium">Verified</th>
                <th className="px-6 py-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredVoters.length > 0 ? (
                filteredVoters.map((voter) => (
                  <tr key={voter.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                          {voter.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white font-medium">{voter.name}</p>
                          <p className="text-gray-500 text-xs">{voter.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-mono">
                        {voter.nftTokenId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        voter.chainType === 'BNB' 
                          ? 'bg-yellow-500/20 text-yellow-400' 
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {voter.chainType === 'BNB' ? '🟡 BNB' : '🔷 ETH'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 font-mono text-xs">
                          {voter.walletAddress ? `${voter.walletAddress.slice(0, 8)}...${voter.walletAddress.slice(-6)}` : 'N/A'}
                        </span>
                        {voter.walletAddress && (
                          <button
                            onClick={() => navigator.clipboard.writeText(voter.walletAddress!)}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {voter.area}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${voter.totalVotes > 0 ? 'text-green-400' : 'text-gray-500'}`}>
                        {voter.totalVotes}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {voter.verifiedAt ? new Date(voter.verifiedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => viewNftDetails(voter)}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        View NFT
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-gray-500/10 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <p className="text-gray-400">No voters found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NFT Details Modal */}
      {showNftModal && selectedVoter && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161C] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">NFT Details</h3>
                  <p className="text-gray-500 text-sm">{selectedVoter.name}</p>
                </div>
              </div>
              <button
                onClick={() => setShowNftModal(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
              {loadingMetadata ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-10 h-10 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin"></div>
                </div>
              ) : nftMetadata ? (
                <div className="space-y-6">
                  {/* NFT Image */}
                  {nftMetadata.image && (
                    <div className="flex justify-center">
                      <div className="w-32 h-32 rounded-2xl overflow-hidden border border-white/10">
                        <img 
                          src={nftMetadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                          alt="NFT" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}

                  {/* NFT Name & Description */}
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-white mb-2">{nftMetadata.name}</h4>
                    <p className="text-gray-400 text-sm">{nftMetadata.description}</p>
                  </div>

                  {/* Attributes */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Attributes</h5>
                    <div className="grid grid-cols-2 gap-3">
                      {nftMetadata.attributes.map((attr, index) => (
                        <div key={index} className="bg-white/5 rounded-xl p-3 border border-white/5">
                          <p className="text-gray-500 text-xs uppercase">{attr.trait_type}</p>
                          <p className="text-white font-medium truncate">{attr.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Properties */}
                  <div>
                    <h5 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Properties</h5>
                    <div className="space-y-3">
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-gray-500 text-xs uppercase mb-1">Voter Wallet</p>
                        <div className="flex items-center gap-2">
                          <code className="text-green-400 font-mono text-xs break-all flex-1">{nftMetadata.properties.voterWallet}</code>
                          <button
                            onClick={() => copyToClipboard(nftMetadata.properties.voterWallet)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-gray-500 text-xs uppercase mb-1">NID Hash</p>
                        <code className="text-purple-400 font-mono text-xs break-all">{nftMetadata.properties.nidHash}</code>
                      </div>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-gray-500 text-xs uppercase mb-1">Registration Date</p>
                        <p className="text-white">{new Date(nftMetadata.properties.registrationDate).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Info */}
                  {selectedVoter.nftTransactionHash && (
                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-3 uppercase tracking-wider">Blockchain</h5>
                      <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                        <p className="text-gray-500 text-xs uppercase mb-1">Transaction Hash</p>
                        <div className="flex items-center gap-2">
                          <code className="text-blue-400 font-mono text-xs break-all flex-1">{selectedVoter.nftTransactionHash}</code>
                          <button
                            onClick={() => copyToClipboard(selectedVoter.nftTransactionHash!)}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                        <a
                          href={getExplorerUrl(selectedVoter.nftTransactionHash, 'tx', selectedVoter.chainType)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                        >
                          View on {selectedVoter.chainType === 'BNB' ? 'BscScan' : 'Etherscan'}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* IPFS Link */}
                  {selectedVoter.ipfsMetadataHash && (
                    <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                      <p className="text-gray-500 text-xs uppercase mb-1">IPFS Metadata</p>
                      <div className="flex items-center gap-2">
                        <code className="text-purple-400 font-mono text-xs break-all flex-1">ipfs://{selectedVoter.ipfsMetadataHash}</code>
                        <button
                          onClick={() => copyToClipboard(`ipfs://${selectedVoter.ipfsMetadataHash}`)}
                          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                        >
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${selectedVoter.ipfsMetadataHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                      >
                        View Raw Metadata
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <p className="text-gray-400">No IPFS metadata found for this NFT</p>
                  {selectedVoter.nftTokenId && (
                    <p className="text-gray-500 text-sm mt-2">Token ID: {selectedVoter.nftTokenId}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-white/10">
              <button
                onClick={() => setShowNftModal(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
              >
                Close
              </button>
              {selectedVoter.nftTransactionHash && (
                <a
                  href={getExplorerUrl(selectedVoter.nftTransactionHash, 'tx', selectedVoter.chainType)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors inline-flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View on Explorer
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
