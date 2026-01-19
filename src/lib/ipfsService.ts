/**
 * IPFS Service for NFT Voting System
 * 
 * This module handles uploading data to IPFS via Pinata or other providers.
 * Used for storing voter metadata and face photos for NFT minting.
 */

// IPFS Gateway URLs
const IPFS_GATEWAYS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
];

export interface IPFSUploadResult {
  success: boolean;
  hash?: string;
  url?: string;
  error?: string;
}

export interface VoterMetadata {
  name: string;
  description: string;
  image: string;
  external_url?: string;
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

/**
 * Upload JSON metadata to IPFS using Pinata API with JWT authentication
 */
export async function uploadMetadataToIPFS(metadata: VoterMetadata): Promise<IPFSUploadResult> {
  const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  // If no Pinata JWT configured, use simulation mode
  if (!PINATA_JWT) {
    console.warn('Pinata JWT not configured, using simulation mode');
    await simulateDelay(1500);
    const fakeHash = 'Qm' + generateRandomHash(44);
    return {
      success: true,
      hash: fakeHash,
      url: `${IPFS_GATEWAYS[0]}${fakeHash}`,
    };
  }

  try {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `VoterNFT-${metadata.properties.voterWallet.slice(0, 10)}`,
        },
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      hash: result.IpfsHash,
      url: `${IPFS_GATEWAYS[0]}${result.IpfsHash}`,
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload to IPFS',
    };
  }
}

/**
 * Upload image (base64) to IPFS using Pinata API with JWT authentication
 */
export async function uploadImageToIPFS(base64Image: string): Promise<IPFSUploadResult> {
  const PINATA_JWT = process.env.NEXT_PUBLIC_PINATA_JWT;
  
  // If no Pinata JWT configured, use simulation mode
  if (!PINATA_JWT) {
    console.warn('Pinata JWT not configured, using simulation mode');
    await simulateDelay(2000);
    const fakeHash = 'Qm' + generateRandomHash(44);
    return {
      success: true,
      hash: fakeHash,
      url: `${IPFS_GATEWAYS[0]}${fakeHash}`,
    };
  }

  try {
    // Convert base64 to blob
    const blob = await fetch(base64Image).then(r => r.blob());
    const formData = new FormData();
    formData.append('file', blob, 'voter-photo.jpg');
    
    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`Pinata API error: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    return {
      success: true,
      hash: result.IpfsHash,
      url: `${IPFS_GATEWAYS[0]}${result.IpfsHash}`,
    };
  } catch (error) {
    console.error('IPFS image upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image to IPFS',
    };
  }
}

/**
 * Create voter NFT metadata
 */
export function createVoterNFTMetadata(params: {
  name: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  nidNumber: string;
  residentialArea: string;
  walletAddress: string;
  chain: 'BNB' | 'ETH';
  facePhotoIPFSHash: string;
}): VoterMetadata {
  const {
    name,
    fatherName,
    motherName,
    dateOfBirth,
    nidNumber,
    residentialArea,
    walletAddress,
    chain,
    facePhotoIPFSHash,
  } = params;

  // Create hash of sensitive data (in production, use proper crypto)
  const nidHash = '0x' + simpleHash(nidNumber).toString(16).padStart(64, '0');
  const dataHash = '0x' + simpleHash(JSON.stringify({
    name,
    fatherName,
    motherName,
    dateOfBirth,
    nidNumber,
  })).toString(16).padStart(64, '0');

  return {
    name: `Voter ID - ${name}`,
    description: 'NFT-based Voter Identity for Decentralized Voting System. This token represents a verified voter credential that enables participation in blockchain-based elections.',
    image: `ipfs://${facePhotoIPFSHash}`,
    external_url: 'https://nft-voting-system.example.com',
    attributes: [
      {
        trait_type: 'Voter Name',
        value: name,
      },
      {
        trait_type: 'NID Number',
        value: nidNumber,
      },
      {
        trait_type: 'Father Name',
        value: fatherName,
      },
      {
        trait_type: 'Mother Name',
        value: motherName,
      },
      {
        trait_type: 'Date of Birth',
        value: dateOfBirth,
      },
      {
        trait_type: 'Residential Area',
        value: residentialArea,
      },
      {
        trait_type: 'Blockchain Network',
        value: chain === 'BNB' ? 'BNB Smart Chain' : 'Ethereum',
      },
      {
        trait_type: 'Verification Status',
        value: 'Verified',
      },
      {
        trait_type: 'Registration Year',
        value: new Date().getFullYear(),
      },
    ],
    properties: {
      voterWallet: walletAddress,
      nidHash,
      dataHash,
      registrationDate: new Date().toISOString(),
    },
  };
}

/**
 * Get IPFS URL from hash
 */
export function getIPFSUrl(hash: string, gatewayIndex = 0): string {
  const cleanHash = hash.replace('ipfs://', '');
  return `${IPFS_GATEWAYS[gatewayIndex]}${cleanHash}`;
}

/**
 * Validate IPFS hash format
 */
export function isValidIPFSHash(hash: string): boolean {
  // CIDv0 starts with 'Qm' and is 46 characters
  // CIDv1 starts with 'b' and varies in length
  const cidv0Regex = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/;
  const cidv1Regex = /^b[a-z2-7]{58}$/;
  
  return cidv0Regex.test(hash) || cidv1Regex.test(hash);
}

// Helper functions
function simulateDelay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomHash(length: number): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
