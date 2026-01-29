// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  isEmailVerified: boolean;
  isAdmin: boolean;
  kycStatus: KYCStatus;
  walletAddress?: string;
  nftChain?: 'BNB' | 'ETH'; // The chain where NFT is minted
  nftTokenId?: string;
  votingChain?: 'BNB' | 'ETH'; // The chain user votes from (same as nftChain)
  residentialArea?: string;
  createdAt: string;
  updatedAt: string;
}

export type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

// KYC Request Types
export interface KYCRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  idCardFront: string;
  idCardBack: string;
  facePhoto: string; // Captured from camera
  walletAddress: string;
  chainType: 'BNB' | 'ETH'; // Chain for NFT minting
  residentialArea: string;
  status: KYCStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  nftTokenId?: string;
  nftTransactionHash?: string;
}

// Voting Types
export interface Voting {
  id: string;
  title: string;
  description: string;
  candidates: Candidate[];
  startTime: string;
  endTime: string;
  votingArea: string;
  eligibleAreas: string[];
  // Voting is NOT chain-specific - users can vote from either chain
  status: VotingStatus;
  createdBy: string;
  createdAt: string;
  totalVotes: number;
  votesByChain: {
    BNB: number;
    ETH: number;
  };
}

export type VotingStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';

export interface Candidate {
  id: string;
  name: string;
  party: string;
  photo: string;
  description: string;
  voteCount: number;
  votesByChain: {
    BNB: number;
    ETH: number;
  };
}

export interface Vote {
  id: string;
  votingId: string;
  candidateId: string;
  voterNftId: string;
  voterAddress: string;
  voterChain: 'BNB' | 'ETH'; // Track which chain the voter used
  transactionHash: string;
  timestamp: string;
}

// API Response Types
export interface ApiResponse<T> {
  code: string;
  msg: string;
  data: T | null;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Chain Types
export interface ChainInfo {
  id: string;
  name: string;
  symbol: string;
  icon: string;
  networkName: string;
  explorerUrl: string;
  rpcUrl: string;
  chainId: number;
}

export const SUPPORTED_CHAINS: ChainInfo[] = [
  {
    id: 'BNB',
    name: 'BNB Smart Chain',
    symbol: 'BNB',
    icon: '🟡',
    networkName: 'BSC Mainnet',
    explorerUrl: 'https://bscscan.com',
    rpcUrl: 'https://bsc-dataseed.binance.org',
    chainId: 56,
  },
  {
    id: 'ETH',
    name: 'Ethereum',
    symbol: 'ETH',
    icon: '🔷',
    networkName: 'Sepolia Testnet',
    explorerUrl: 'https://sepolia.etherscan.io',
    rpcUrl: 'https://rpc.sepolia.org',
    chainId: 11155111,
  },
];

// Voting Areas (Bangladesh Districts for demo)
export const VOTING_AREAS = [
  'Dhaka',
  'Chittagong',
  'Rajshahi',
  'Khulna',
  'Sylhet',
  'Rangpur',
  'Barisal',
  'Mymensingh',
  'Comilla',
  'Gazipur',
  'Narayanganj',
  'Bogra',
  'Cox\'s Bazar',
  'Jessore',
  'Dinajpur',
];
