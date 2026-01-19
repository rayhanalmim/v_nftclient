'use client';

import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseAbi } from 'viem';

const VOTER_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_NFT_ADDRESS as `0x${string}`;

const voterNFTAbi = parseAbi([
  'function mintVoterNFT(address to, (string name, string fatherName, string motherName, string dateOfBirth, string nidNumber, string residentialArea, string ipfsMetadataHash) voterInfo) external returns (uint256)',
  'function isVerifiedVoter(address voter) external view returns (bool)',
  'function getVoterInfo(address voter) external view returns (uint256 tokenId, string area, bool verified, uint256 regTime)',
  'function totalRegisteredVoters() external view returns (uint256)',
  'function owner() external view returns (address)',
  'event VoterRegistered(uint256 indexed tokenId, address indexed voterAddress, string residentialArea, bytes32 dataHash, uint256 timestamp)',
]);

export interface VoterInfo {
  name: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  nidNumber: string;
  residentialArea: string;
  ipfsMetadataHash: string;
}

export function useVoterNFT() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const mintVoterNFT = async (toAddress: string, voterInfo: VoterInfo) => {
    if (!VOTER_NFT_ADDRESS) {
      throw new Error('VoterNFT contract address not configured');
    }

    writeContract({
      address: VOTER_NFT_ADDRESS,
      abi: voterNFTAbi,
      functionName: 'mintVoterNFT',
      args: [
        toAddress as `0x${string}`,
        {
          name: voterInfo.name,
          fatherName: voterInfo.fatherName,
          motherName: voterInfo.motherName,
          dateOfBirth: voterInfo.dateOfBirth,
          nidNumber: voterInfo.nidNumber,
          residentialArea: voterInfo.residentialArea,
          ipfsMetadataHash: voterInfo.ipfsMetadataHash,
        },
      ],
    });
  };

  return {
    mintVoterNFT,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
