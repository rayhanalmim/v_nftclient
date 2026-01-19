/**
 * Web3 Configuration for NFT Voting System
 * 
 * This module contains contract addresses, ABIs, and chain configurations
 * for interacting with the deployed smart contracts.
 */

// Chain IDs
export const CHAIN_IDS = {
  BSC_MAINNET: 56,
  BSC_TESTNET: 97,
  ETH_MAINNET: 1,
  ETH_SEPOLIA: 11155111,
} as const;

// Chain configurations
export const CHAIN_CONFIG = {
  [CHAIN_IDS.BSC_TESTNET]: {
    name: 'BNB Smart Chain Testnet',
    shortName: 'BSC Testnet',
    nativeCurrency: {
      name: 'BNB',
      symbol: 'tBNB',
      decimals: 18,
    },
    rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545/'],
    blockExplorerUrls: ['https://testnet.bscscan.com'],
    contracts: {
      voterNFT: '0x4d22f3dcebf3986f03e962619c072de9c3813400',
      votingSystem: '0xdb2c618f798c8e04db4749a05bf972c94ea979e1',
    },
  },
  [CHAIN_IDS.ETH_SEPOLIA]: {
    name: 'Ethereum Sepolia Testnet',
    shortName: 'Sepolia',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'SepoliaETH',
      decimals: 18,
    },
    rpcUrls: ['https://rpc.sepolia.org'],
    blockExplorerUrls: ['https://sepolia.etherscan.io'],
    contracts: {
      voterNFT: '', // To be filled after deployment
      votingSystem: '', // To be filled after deployment
    },
  },
};

// VoterNFT ABI (Essential functions only)
export const VOTER_NFT_ABI = [
  // View Functions
  {
    inputs: [{ name: 'voter', type: 'address' }],
    name: 'isVerifiedVoter',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'voter', type: 'address' }],
    name: 'getVoterInfo',
    outputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'area', type: 'string' },
      { name: 'verified', type: 'bool' },
      { name: 'regTime', type: 'uint256' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'voter', type: 'address' }],
    name: 'voterTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'owner', type: 'address' }],
    name: 'getOwnedTokenId',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'isTokenVerified',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    name: 'tokenURI',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalRegisteredVoters',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'nidNumber', type: 'string' }],
    name: 'isNIDRegistered',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Admin Functions
  {
    inputs: [
      { name: 'to', type: 'address' },
      {
        name: 'voterInfo',
        type: 'tuple',
        components: [
          { name: 'name', type: 'string' },
          { name: 'fatherName', type: 'string' },
          { name: 'motherName', type: 'string' },
          { name: 'dateOfBirth', type: 'string' },
          { name: 'nidNumber', type: 'string' },
          { name: 'residentialArea', type: 'string' },
          { name: 'ipfsMetadataHash', type: 'string' },
        ],
      },
    ],
    name: 'mintVoterNFT',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'tokenId', type: 'uint256' },
      { indexed: true, name: 'voterAddress', type: 'address' },
      { indexed: false, name: 'residentialArea', type: 'string' },
      { indexed: false, name: 'dataHash', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'VoterRegistered',
    type: 'event',
  },
];

// VotingSystem ABI (Essential functions only)
export const VOTING_SYSTEM_ABI = [
  // View Functions
  {
    inputs: [{ name: 'electionId', type: 'uint256' }],
    name: 'getElectionInfo',
    outputs: [
      {
        name: 'info',
        type: 'tuple',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'title', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'startTime', type: 'uint256' },
          { name: 'endTime', type: 'uint256' },
          { name: 'eligibleAreas', type: 'string[]' },
          { name: 'candidateCount', type: 'uint256' },
          { name: 'totalVotes', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'resultsFinalized', type: 'bool' },
          { name: 'creator', type: 'address' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'electionId', type: 'uint256' }],
    name: 'getElectionCandidates',
    outputs: [
      {
        name: 'candidates',
        type: 'tuple[]',
        components: [
          { name: 'id', type: 'uint256' },
          { name: 'name', type: 'string' },
          { name: 'party', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'voteCount', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'electionId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    name: 'hasVoterVoted',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'electionId', type: 'uint256' },
      { name: 'tokenId', type: 'uint256' },
    ],
    name: 'hasNFTVoted',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'electionId', type: 'uint256' },
      { name: 'voter', type: 'address' },
    ],
    name: 'isVoterEligible',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'electionId', type: 'uint256' },
      { name: '_chainId', type: 'uint256' },
    ],
    name: 'getVotesByChain',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getElectionCount',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // Write Functions
  {
    inputs: [
      { name: 'electionId', type: 'uint256' },
      { name: 'candidateId', type: 'uint256' },
    ],
    name: 'castVote',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'title', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'eligibleAreas', type: 'string[]' },
    ],
    name: 'createElection',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'electionId', type: 'uint256' },
      { name: 'name', type: 'string' },
      { name: 'party', type: 'string' },
      { name: 'description', type: 'string' },
    ],
    name: 'addCandidate',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'electionId', type: 'uint256' },
      { indexed: true, name: 'candidateId', type: 'uint256' },
      { indexed: true, name: 'voter', type: 'address' },
      { indexed: false, name: 'chainId', type: 'uint256' },
      { indexed: false, name: 'voteHash', type: 'bytes32' },
      { indexed: false, name: 'timestamp', type: 'uint256' },
    ],
    name: 'VoteCast',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'electionId', type: 'uint256' },
      { indexed: false, name: 'title', type: 'string' },
      { indexed: false, name: 'startTime', type: 'uint256' },
      { indexed: false, name: 'endTime', type: 'uint256' },
      { indexed: false, name: 'creator', type: 'address' },
    ],
    name: 'ElectionCreated',
    type: 'event',
  },
];

// Helper function to get contract addresses for a chain
export function getContractAddresses(chainId: number) {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }
  return config.contracts;
}

// Helper function to add network to wallet
export async function addNetwork(chainId: number) {
  const config = CHAIN_CONFIG[chainId as keyof typeof CHAIN_CONFIG];
  if (!config) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  try {
    await window.ethereum?.request({
      method: 'wallet_addEthereumChain',
      params: [
        {
          chainId: `0x${chainId.toString(16)}`,
          chainName: config.name,
          nativeCurrency: config.nativeCurrency,
          rpcUrls: config.rpcUrls,
          blockExplorerUrls: config.blockExplorerUrls,
        },
      ],
    });
  } catch (error) {
    console.error('Failed to add network:', error);
    throw error;
  }
}

// Helper function to switch network
export async function switchNetwork(chainId: number) {
  try {
    await window.ethereum?.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (error: unknown) {
    // If the chain hasn't been added, add it
    if ((error as { code?: number }).code === 4902) {
      await addNetwork(chainId);
    } else {
      throw error;
    }
  }
}

