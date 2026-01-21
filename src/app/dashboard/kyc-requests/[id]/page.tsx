'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { kycAPI, KYCRequest } from '@/lib/api';
import { SUPPORTED_CHAINS } from '@/types';
import Link from 'next/link';
import { uploadImageToIPFS, uploadMetadataToIPFS, createVoterNFTMetadata } from '@/lib/ipfsService';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useConfig } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { parseAbi } from 'viem';
import { WalletConnectButton } from '@/components/WalletConnectButton';

const VOTER_NFT_ADDRESS = process.env.NEXT_PUBLIC_VOTER_NFT_ADDRESS as `0x${string}`;

const voterNFTAbi = parseAbi([
  'function mintVoterNFT(address to, (string name, string fatherName, string motherName, string dateOfBirth, string nidNumber, string residentialArea, string ipfsMetadataHash) voterInfo) external returns (uint256)',
]);

export default function KYCRequestDetailPage() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const requestId = params.id as string;
  
  // Wallet connection
  const { address, isConnected } = useAccount();
  const { writeContractAsync, isPending: isWritePending } = useWriteContract();
  const config = useConfig();
  
  const [request, setRequest] = useState<KYCRequest | null>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionComplete, setActionComplete] = useState<'approved' | 'rejected' | null>(null);
  const [mintingStep, setMintingStep] = useState<string>('');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [mintedData, setMintedData] = useState<{
    tokenId: string;
    txHash: string;
    ipfsHash: string;
  } | null>(null);
  
  // Wait for transaction confirmation
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  // Use isConfirming in loading state
  const isTxPending = isWritePending || isConfirming;

  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const response = await kycAPI.getRequest(requestId);
        if (response.code === 'SUCCESS' && response.data) {
          setRequest(response.data);
        }
      } catch (error) {
        console.error('Error fetching KYC request:', error);
      } finally {
        setPageLoading(false);
      }
    };
    if (user?.isAdmin && requestId) {
      fetchRequest();
    }
  }, [user?.isAdmin, requestId]);

  // Redirect non-admin users
  if (!user?.isAdmin) {
    router.push('/dashboard');
    return null;
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Request Not Found</h2>
        <p className="text-gray-400 mb-6">The KYC request you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard/kyc-requests" className="text-blue-400 hover:text-blue-300">
          ← Back to KYC Requests
        </Link>
      </div>
    );
  }

  const chain = SUPPORTED_CHAINS.find(c => c.id === request.chainType);

  // Get extracted data from the KYC request (from Azure Form Recognizer)
  const extractedData = {
    name: request.extractedData?.name || request.userName,
    fatherName: request.extractedData?.fatherName || 'Not Provided',
    motherName: request.extractedData?.motherName || 'Not Provided',
    dateOfBirth: request.extractedData?.dateOfBirth || 'Not Provided',
    nidNumber: request.nidNumber || request.extractedData?.nidNumber || '',
    residentialArea: request.residentialArea || 'Dhaka'
  };
  
  // Clean name - remove Bengali text if present, keep only English
  const cleanName = extractedData.name.includes('\n') 
    ? extractedData.name.split('\n').find((part: string) => /^[A-Z\s.]+$/.test(part.trim())) || extractedData.name.split('\n').pop() || extractedData.name
    : extractedData.name;

  const handleApprove = async () => {
    // Check wallet connection
    if (!isConnected || !address) {
      alert('Please connect your wallet first to approve KYC requests.');
      return;
    }

    setLoading(true);
    
    try {
      // Step 1: Upload face photo to IPFS
      setMintingStep('Uploading face photo to IPFS...');
      const facePhotoResult = await uploadImageToIPFS(request.facePhoto);
      if (!facePhotoResult.success) throw new Error('Failed to upload face photo');

      // Step 2: Create and upload metadata to IPFS
      setMintingStep('Creating NFT metadata...');
      const metadata = createVoterNFTMetadata({
        name: cleanName,
        fatherName: extractedData.fatherName,
        motherName: extractedData.motherName,
        dateOfBirth: extractedData.dateOfBirth,
        nidNumber: extractedData.nidNumber,
        residentialArea: extractedData.residentialArea,
        walletAddress: request.walletAddress,
        chain: request.chainType,
        facePhotoIPFSHash: facePhotoResult.hash!,
      });

      setMintingStep('Uploading metadata to IPFS...');
      const metadataResult = await uploadMetadataToIPFS(metadata);
      if (!metadataResult.success) throw new Error('Failed to upload metadata');

      // Step 3: Mint NFT directly from connected wallet
      setMintingStep('Please confirm the transaction in MetaMask...');
      
      const hash = await writeContractAsync({
        address: VOTER_NFT_ADDRESS,
        abi: voterNFTAbi,
        functionName: 'mintVoterNFT',
        args: [
          request.walletAddress as `0x${string}`,
          {
            name: cleanName,
            fatherName: extractedData.fatherName,
            motherName: extractedData.motherName,
            dateOfBirth: extractedData.dateOfBirth,
            nidNumber: extractedData.nidNumber,
            residentialArea: extractedData.residentialArea,
            ipfsMetadataHash: metadataResult.hash!,
          },
        ],
      });

      setTxHash(hash);
      setMintingStep('Waiting for blockchain confirmation...');

      // Step 4: Wait for transaction confirmation and check status
      const receipt = await waitForTransactionReceipt(config, {
        hash,
        confirmations: 1,
      });

      // Check if transaction was successful
      if (receipt.status !== 'success') {
        throw new Error('Transaction reverted on blockchain. You may not have admin/minter role on this contract.');
      }

      setMintingStep('Transaction confirmed! Updating database...');

      // Step 5: Update database with transaction info (only after blockchain confirmation)
      const approveResponse = await kycAPI.approveWithTx(requestId, metadataResult.hash!, hash);
      
      if (approveResponse.code !== 'SUCCESS') {
        console.warn('Database update failed, but NFT was minted:', hash);
      }

      setMintedData({
        tokenId: `VTR-${Date.now().toString(36).toUpperCase()}`,
        txHash: hash,
        ipfsHash: metadataResult.hash!,
      });

      setLoading(false);
      setShowMintModal(false);
      setActionComplete('approved');
    } catch (error: unknown) {
      console.error('Minting error:', error);
      setLoading(false);
      setMintingStep('');
      
      // Extract meaningful error message
      let errorMessage = 'Failed to mint NFT. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('reverted') || error.message.includes('Transaction reverted')) {
          errorMessage = 'Transaction failed: ' + error.message;
        } else if (error.message.includes('AccessControl') || error.message.includes('missing role')) {
          errorMessage = 'Access denied: Your wallet does not have minter/admin role on the NFT contract.';
        } else if (error.message.includes('rejected')) {
          errorMessage = 'Transaction was rejected in wallet.';
        } else {
          errorMessage = error.message;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLoading(false);
    setShowRejectModal(false);
    setActionComplete('rejected');
  };

  // Helper function to copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  // Get explorer URL based on chain
  const getExplorerUrl = (hash: string, type: 'tx' | 'address' = 'tx') => {
    const baseUrl = request.chainType === 'BNB' 
      ? 'https://testnet.bscscan.com' 
      : 'https://sepolia.etherscan.io';
    return `${baseUrl}/${type}/${hash}`;
  };

  if (actionComplete) {
    return (
      <div className="max-w-6xl mx-auto animate-scale-in">
        {actionComplete === 'approved' && mintedData ? (
          <div className="relative overflow-hidden rounded-3xl border border-green-500/30 ">
            {/* Animated background effect */}
            {/* <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,197,94,0.15),transparent_50%)]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(20,184,166,0.1),transparent_50%)]"></div> */}
            
            <div className="relative p-8 md:p-10">
              {/* Success Icon with animation */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center mb-8">
                <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent mb-3">
                  NFT Minted Successfully!
                </h2>
                <p className="text-gray-400 text-lg">
                  Voter NFT has been minted to the blockchain
                </p>
              </div>

              {/* NFT Card Preview */}
              <div className="bg-[#0D1117] rounded-2xl border border-white/10 p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-white font-bold text-xl">Voter Identity NFT</p>
                    <p className="text-gray-400">Token ID: {mintedData.tokenId}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-green-500/20 rounded-full">
                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">Confirmed</span>
                  </div>
                </div>

                {/* Recipient Address */}
                <div className="bg-white/5 rounded-xl p-4 mb-4">
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">Recipient Wallet</label>
                  <div className="flex items-center gap-2">
                    <code className="text-white font-mono text-sm flex-1 break-all">{request.walletAddress}</code>
                    <button
                      onClick={() => copyToClipboard(request.walletAddress, 'Wallet address')}
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Copy address"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <a
                      href={getExplorerUrl(request.walletAddress, 'address')}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="View on Explorer"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>

              {/* Transaction Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Transaction Hash */}
                <div className="bg-[#0D1117] rounded-xl border border-white/10 p-4">
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Transaction Hash
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-green-400 font-mono text-xs break-all flex-1">{mintedData.txHash}</code>
                    <button
                      onClick={() => copyToClipboard(mintedData.txHash, 'Transaction hash')}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Copy hash"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <a
                    href={getExplorerUrl(mintedData.txHash, 'tx')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
                  >
                    View on {request.chainType === 'BNB' ? 'BscScan' : 'Etherscan'}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>

                {/* IPFS Metadata */}
                <div className="bg-[#0D1117] rounded-xl border border-white/10 p-4">
                  <label className="text-gray-500 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                    </svg>
                    IPFS Metadata
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="text-purple-400 font-mono text-xs break-all flex-1">ipfs://{mintedData.ipfsHash}</code>
                    <button
                      onClick={() => copyToClipboard(`ipfs://${mintedData.ipfsHash}`, 'IPFS hash')}
                      className="p-1.5 hover:bg-white/10 rounded-lg transition-colors shrink-0"
                      title="Copy IPFS hash"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${mintedData.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm font-medium transition-colors"
                  >
                    View Metadata on IPFS
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>

              {/* Chain Info Badge */}
              <div className="flex justify-center mb-8">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/5 rounded-full border border-white/10">
                  <span className="text-2xl">{chain?.icon}</span>
                  <div>
                    <p className="text-white font-medium">{chain?.name}</p>
                    <p className="text-gray-500 text-xs">{chain?.testnetName}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href={getExplorerUrl(mintedData.txHash, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  View Transaction
                </a>
                <Link
                  href="/dashboard/kyc-requests"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
                  </svg>
                  Back to KYC Requests
                </Link>
              </div>
            </div>
          </div>
        ) : (
          /* Rejected State */
          <div className="rounded-2xl p-8 text-center border bg-red-500/10 border-red-500/30">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">Request Rejected</h2>
            <p className="text-gray-400 mb-6">
              The KYC request for {request.userName} has been rejected.
            </p>
            <Link
              href="/dashboard/kyc-requests"
              className="inline-block px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all"
            >
              Back to KYC Requests
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in">
      {/* Back Button */}
      <Link href="/dashboard/kyc-requests" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to KYC Requests
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-white">KYC Request Details</h1>
          <p className="text-gray-400 mt-1">Review verification request from {request.userName}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium self-start ${
          request.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
          request.status === 'approved' ? 'bg-green-500/20 text-green-400' :
          'bg-red-500/20 text-red-400'
        }`}>
          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
        </span>
      </div>

      {/* Extracted ID Card Data */}
      <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-2xl p-6 animate-slide-up">
        <div className="flex items-center gap-2 mb-4">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <h2 className="text-lg font-semibold text-white">Extracted ID Card Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-gray-500 text-xs uppercase tracking-wider">Full Name</label>
            <p className="text-white font-medium mt-1">{extractedData.name}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-gray-500 text-xs uppercase tracking-wider">NID Number</label>
            <p className="text-white font-mono mt-1">{extractedData.nidNumber}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-gray-500 text-xs uppercase tracking-wider">Date of Birth</label>
            <p className="text-white font-medium mt-1">{extractedData.dateOfBirth}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-gray-500 text-xs uppercase tracking-wider">Father&apos;s Name</label>
            <p className="text-white font-medium mt-1">{extractedData.fatherName}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-gray-500 text-xs uppercase tracking-wider">Mother&apos;s Name</label>
            <p className="text-white font-medium mt-1">{extractedData.motherName}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-4">
            <label className="text-gray-500 text-xs uppercase tracking-wider">Residential Area</label>
            <p className="text-white font-medium mt-1">{extractedData.residentialArea}</p>
          </div>
        </div>
      </div>

      {/* User Information */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Account Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-gray-400 text-sm">Email Address</label>
            <p className="text-white font-medium mt-1">{request.userEmail}</p>
          </div>
          <div>
            <label className="text-gray-400 text-sm">Submission Date</label>
            <p className="text-white font-medium mt-1">
              {new Date(request.submittedAt).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-gray-400 text-sm">User ID</label>
            <p className="text-white font-medium mt-1">{request.userId}</p>
          </div>
          <div>
            <label className="text-gray-400 text-sm">Request ID</label>
            <p className="text-white font-medium mt-1">{request.id}</p>
          </div>
        </div>
      </div>

      {/* Wallet Information */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Wallet & Chain Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-gray-400 text-sm">Blockchain Network</label>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl">{chain?.icon}</span>
              <div>
                <p className="text-white font-medium">{chain?.name}</p>
                <span className="text-gray-500 text-sm">{chain?.testnetName}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="text-gray-400 text-sm">Wallet Address</label>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-white font-mono text-sm break-all bg-white/5 px-3 py-2 rounded-lg flex-1">{request.walletAddress}</p>
              <button 
                onClick={() => navigator.clipboard.writeText(request.walletAddress)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Copy address"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Document Photos */}
      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 animate-slide-up" style={{ animationDelay: '0.3s' }}>
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          Verification Documents
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* ID Front */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">ID Card - Front</label>
            <a 
              href={request.idCardFront} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer"
            >
              {request.idCardFront ? (
                <img 
                  src={request.idCardFront} 
                  alt="ID Front" 
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No image available</p>
                </div>
              )}
            </a>
          </div>

          {/* ID Back */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">ID Card - Back</label>
            <a 
              href={request.idCardBack} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer"
            >
              {request.idCardBack ? (
                <img 
                  src={request.idCardBack} 
                  alt="ID Back" 
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No image available</p>
                </div>
              )}
            </a>
          </div>

          {/* Face Photo */}
          <div>
            <label className="text-gray-400 text-sm mb-2 block">Face Photo (Live Capture)</label>
            <a 
              href={request.facePhoto} 
              target="_blank" 
              rel="noopener noreferrer"
              className="block bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-blue-500/50 transition-colors cursor-pointer"
            >
              {request.facePhoto ? (
                <img 
                  src={request.facePhoto} 
                  alt="Face Photo" 
                  className="w-full h-48 object-cover"
                />
              ) : (
                <div className="h-48 flex items-center justify-center">
                  <p className="text-gray-500 text-sm">No image available</p>
                </div>
              )}
            </a>
          </div>
        </div>
      </div>

      {/* Wallet Connection Warning */}
      {request.status === 'pending' && !isConnected && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-yellow-400 font-medium">Wallet Connection Required</p>
              <p className="text-gray-400 text-sm mt-1">
                Please connect your wallet using the button in the sidebar to approve KYC requests and mint NFTs. 
                You must be connected as the contract owner.
              </p>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      )}

      {/* Wallet Connected Status */}
      {request.status === 'pending' && isConnected && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 animate-slide-up" style={{ animationDelay: '0.35s' }}>
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <p className="text-green-400 font-medium">Wallet Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
          </div>
        </div>
      )}

      {/* Actions for Pending Requests */}
      {request.status === 'pending' && (
        <div className="flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.4s' }}>
          <button
            onClick={() => setShowMintModal(true)}
            disabled={!isConnected || isTxPending}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold rounded-xl transition-all ${
              isConnected && !isTxPending
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-green-500/25 hover:scale-[1.02]'
                : 'bg-gray-500/20 text-gray-500 cursor-not-allowed'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {isTxPending ? 'Processing...' : 'Approve & Mint NFT'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-500/20 border border-red-500/50 text-red-400 font-semibold rounded-xl hover:bg-red-500/30 transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject Request
          </button>
        </div>
      )}

      {/* Previous Review Info */}
      {request.status !== 'pending' && (
        <div className={`rounded-2xl p-6 border ${
          request.status === 'approved' 
            ? 'bg-green-500/10 border-green-500/30' 
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <h3 className={`font-semibold mb-2 ${
            request.status === 'approved' ? 'text-green-400' : 'text-red-400'
          }`}>
            {request.status === 'approved' ? 'Approved' : 'Rejected'}
          </h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">
              <strong>Reviewed:</strong> {new Date(request.reviewedAt!).toLocaleString()}
            </p>
            <p className="text-gray-400">
              <strong>By:</strong> {request.reviewedBy}
            </p>
            {request.status === 'approved' && request.nftTokenId && (
              <>
                <p className="text-gray-400">
                  <strong>NFT Token ID:</strong> {request.nftTokenId}
                </p>
                <p className="text-gray-400">
                  <strong>Transaction:</strong>{' '}
                  <span className="font-mono text-xs">
                    {request.nftTransactionHash?.slice(0, 20)}...{request.nftTransactionHash?.slice(-10)}
                  </span>
                </p>
              </>
            )}
            {request.status === 'rejected' && request.rejectionReason && (
              <p className="text-gray-400">
                <strong>Reason:</strong> {request.rejectionReason}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mint NFT Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 max-w-lg w-full animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-4">Confirm NFT Minting</h3>
            <p className="text-gray-400 mb-6">
              You are about to mint a Voter NFT with the following information:
            </p>
            
            <div className="bg-white/5 rounded-xl p-4 mb-6 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <label className="text-gray-500 text-xs">Recipient</label>
                  <p className="text-white font-medium">{extractedData.name}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">NID</label>
                  <p className="text-white font-mono">{extractedData.nidNumber}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Network</label>
                  <p className="text-white font-medium">{chain?.icon} {chain?.name}</p>
                </div>
                <div>
                  <label className="text-gray-500 text-xs">Area</label>
                  <p className="text-white font-medium">{extractedData.residentialArea}</p>
                </div>
              </div>
              <div>
                <label className="text-gray-500 text-xs">Wallet Address</label>
                <p className="text-white font-mono text-sm break-all">{request.walletAddress}</p>
              </div>
            </div>

            {loading && mintingStep && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <p className="text-blue-400 font-medium">{mintingStep}</p>
                </div>
              </div>
            )}

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6">
              <p className="text-yellow-400 text-sm">
                <strong>Note:</strong> This will upload data to IPFS and mint an NFT on the blockchain. This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowMintModal(false)}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  'Confirm & Mint'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 max-w-md w-full animate-scale-in">
            <h3 className="text-xl font-bold text-white mb-4">Reject KYC Request</h3>
            <p className="text-gray-400 mb-6">
              Please provide a reason for rejecting this KYC request. The user will be notified.
            </p>
            
            <div className="mb-6">
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Rejection Reason
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter the reason for rejection..."
                rows={4}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 transition-all resize-none"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-red-500 text-white font-medium rounded-xl hover:bg-red-600 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  'Reject Request'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
