// API Service for NFT Voting System
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to get auth headers
function getAuthHeaders(token?: string | null): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  const authToken = token || (typeof window !== 'undefined' ? localStorage.getItem('voting_token') : null);
  
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  return headers;
}

// ============================================
// Auth API
// ============================================

export interface LoginResponse {
  code: string;
  msg: string;
  data: {
    token: string;
    userId: string;
    user: {
      id: string;
      email: string;
      name: string;
      isEmailVerified: boolean;
      isAdmin: boolean;
      kycStatus: string;
    };
  } | null;
}

export interface SignupResponse {
  code: string;
  msg: string;
  data: {
    userId: string;
    message: string;
  } | null;
}

export const authAPI = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  },

  async signup(name: string, email: string, password: string): Promise<SignupResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });
    return response.json();
  },

  async verifyEmail(email: string, code: string): Promise<{ code: string; msg: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });
    return response.json();
  },

  async resendCode(email: string): Promise<{ code: string; msg: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/resend-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });
    return response.json();
  },

  async googleAuth(credential: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ credential }),
    });
    return response.json();
  },

  async getMe(token?: string): Promise<{ code: string; msg: string; data: { id: string; email: string; name: string; isEmailVerified: boolean; isAdmin: boolean; kycStatus: string; walletAddress?: string; nftTokenId?: string; } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },

  async walletLogin(address: string, signature: string, nonce: string): Promise<LoginResponse> {
    const response = await fetch(`${API_BASE_URL}/api/auth/wallet/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address, signature, nonce }),
    });
    return response.json();
  },
};

// ============================================
// KYC API
// ============================================

export interface KYCSubmitRequest {
  fullName: string;
  residentialArea: string;
  idCardFront: string; // Base64 or URL
  idCardBack: string;
  facePhoto: string;
  walletAddress: string;
  chainType: 'BNB' | 'ETH';
  extractedData?: {
    name: string;
    fatherName: string;
    motherName: string;
    dateOfBirth: string;
    nidNumber: string;
  };
}

export interface KYCRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  idCardFront: string;
  idCardBack: string;
  facePhoto: string;
  walletAddress: string;
  chainType: 'BNB' | 'ETH';
  residentialArea: string;
  status: 'pending' | 'approved' | 'rejected' | 'not_submitted';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  nftTokenId?: string;
  nftTransactionHash?: string;
  nidNumber?: string;
  extractedData?: {
    name: string;
    fatherName: string;
    motherName: string;
    dateOfBirth: string;
    nidNumber: string;
  };
}

export const kycAPI = {
  async submit(data: KYCSubmitRequest, token?: string): Promise<{ code: string; msg: string; data: { requestId: string } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/submit`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getStatus(token?: string): Promise<{ code: string; msg: string; data: KYCRequest | null }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/status`, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },

  async getRequests(status?: string, token?: string): Promise<{ code: string; msg: string; data: KYCRequest[] | null }> {
    const url = status 
      ? `${API_BASE_URL}/api/kyc/requests?status=${status}`
      : `${API_BASE_URL}/api/kyc/requests`;
    const response = await fetch(url, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },

  async getRequest(id: string, token?: string): Promise<{ code: string; msg: string; data: KYCRequest | null }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/requests/${id}`, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },

  async approve(id: string, ipfsHash: string, token?: string): Promise<{ code: string; msg: string; data: { nftTokenId: string; transactionHash: string } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/requests/${id}/approve`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ ipfsHash }),
    });
    return response.json();
  },

  async approveWithTx(id: string, ipfsHash: string, txHash: string, token?: string): Promise<{ code: string; msg: string; data: { nftTokenId: string; transactionHash: string } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/requests/${id}/approve-with-tx`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ ipfsHash, txHash }),
    });
    return response.json();
  },

  async reject(id: string, reason: string, token?: string): Promise<{ code: string; msg: string }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/requests/${id}/reject`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ reason }),
    });
    return response.json();
  },

  async extractIdCard(imageBase64: string, token?: string): Promise<{ 
    code: string; 
    msg: string; 
    data: {
      address: string | undefined;
      name: string;
      nameBangla: string;
      fatherName: string;
      motherName: string;
      dateOfBirth: string;
      idNumber: string;
      confidence: number;
      extractionStatus: 'success' | 'partial' | 'failed';
      errors: string[];
    } | null 
  }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/extract-id`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ imageBase64 }),
    });
    return response.json();
  },

  async checkDuplicateNID(nidNumber: string, token?: string): Promise<{ 
    code: string; 
    msg: string; 
    data: { isDuplicate: boolean; message?: string } | null 
  }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/check-duplicate-nid`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ nidNumber }),
    });
    return response.json();
  },

  async verifyFace(idCardImage: string, selfieImage: string, token?: string): Promise<{
    code: string;
    msg: string;
    data: {
      isMatch?: boolean;
      confidence?: number;
      confidencePercent?: number;
      skipped?: boolean;
      message?: string;
    } | null;
  }> {
    const response = await fetch(`${API_BASE_URL}/api/kyc/verify-face`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ idCardImage, selfieImage }),
    });
    return response.json();
  },
};

// ============================================
// Voting API
// ============================================

export interface Candidate {
  id: string;
  name: string;
  party: string;
  description: string;
  photo?: string;
  voteCount: number;
  votesByChain?: { BNB: number; ETH: number };
}

export interface Voting {
  id: string;
  blockchainElectionId?: string;
  title: string;
  description: string;
  candidates: Candidate[];
  startTime: string;
  endTime: string;
  votingArea: string;
  eligibleAreas: string[];
  chainType: 'BNB' | 'ETH';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  createdBy: string;
  createdAt: string;
  totalVotes: number;
  votesByChain?: { BNB: number; ETH: number };
}

export interface CreateVotingRequest {
  title: string;
  description: string;
  candidates: Omit<Candidate, 'id' | 'voteCount'>[];
  startTime: string;
  endTime: string;
  votingArea: string;
  eligibleAreas: string[];
  chainType: 'BNB' | 'ETH';
}

export const votingAPI = {
  async create(data: CreateVotingRequest, token?: string): Promise<{ code: string; msg: string; data: { votingId: string } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/voting/create`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getAll(status?: string): Promise<{ code: string; msg: string; data: Voting[] | null }> {
    const url = status 
      ? `${API_BASE_URL}/api/voting?status=${status}`
      : `${API_BASE_URL}/api/voting`;
    const response = await fetch(url);
    return response.json();
  },

  async getById(id: string): Promise<{ code: string; msg: string; data: Voting | null }> {
    const response = await fetch(`${API_BASE_URL}/api/voting/${id}`);
    return response.json();
  },

  async castVote(votingId: string, candidateId: string, token?: string): Promise<{ code: string; msg: string; data: { transactionHash: string; blockNumber: number } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/voting/${votingId}/vote`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ candidateId }),
    });
    return response.json();
  },

  async createWithTx(data: CreateVotingRequest & { txHash: string; blockchainElectionId?: string }, token?: string): Promise<{ code: string; msg: string; data: { votingId: string } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/voting/create-with-tx`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async castVoteWithTx(votingId: string, candidateId: string, txHash: string, blockNumber: number, token?: string): Promise<{ code: string; msg: string; data: { transactionHash: string; blockNumber: number } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/voting/${votingId}/vote-with-tx`, {
      method: 'POST',
      headers: getAuthHeaders(token),
      body: JSON.stringify({ candidateId, txHash, blockNumber }),
    });
    return response.json();
  },

  async getMyVotes(token?: string): Promise<{ code: string; msg: string; data: Array<{
    id: string;
    votingId: string;
    votingTitle: string;
    candidateName: string;
    candidateParty: string;
    timestamp: string;
    transactionHash: string;
    blockNumber: number;
    chainType: 'BNB' | 'ETH';
    status: 'pending' | 'confirmed';
  }> | null }> {
    const response = await fetch(`${API_BASE_URL}/api/voting/my-votes`, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },
};

// ============================================
// User API
// ============================================

export interface Voter {
  id: string;
  name: string;
  email: string;
  walletAddress: string;
  chainType: 'BNB' | 'ETH';
  nftTokenId: string;
  verifiedAt: string;
  area: string;
  totalVotes: number;
}

export const userAPI = {
  async getVoters(token?: string): Promise<{ code: string; msg: string; data: Voter[] | null }> {
    const response = await fetch(`${API_BASE_URL}/api/users/voters`, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },

  async getStats(token?: string): Promise<{ code: string; msg: string; data: {
    totalUsers: number;
    verifiedVoters: number;
    pendingKYC: number;
    activeVotings: number;
    completedVotings: number;
    totalVotesCast: number;
    nftsMinted: number;
  } | null }> {
    const response = await fetch(`${API_BASE_URL}/api/users/stats`, {
      headers: getAuthHeaders(token),
    });
    return response.json();
  },
};

// ============================================
// Health Check API
// ============================================

export const healthAPI = {
  async check(): Promise<{ status: string; database: string }> {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    return response.json();
  },
};

// Export all APIs
export const API = {
  auth: authAPI,
  kyc: kycAPI,
  voting: votingAPI,
  user: userAPI,
  health: healthAPI,
};

export default API;
