'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useAccount } from 'wagmi';
import { SUPPORTED_CHAINS, VOTING_AREAS } from '@/types';
import CameraCapture from '@/components/CameraCapture';
import { kycAPI } from '@/lib/api';
import { 
  extractIDCardData, 
  validateNIDNumber, 
  validateDateOfBirth,
  checkDuplicateNID,
  ExtractedIDData, 
  ExtractionProgress 
} from '@/lib/idCardExtractor';
import { uploadToCloudinary } from '@/lib/cloudinaryService';

export default function KYCPage() {
  const { user, refreshUser } = useAuth();
  const { address: connectedWallet, isConnected } = useAccount();
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Form state
  const [fullName, setFullName] = useState(user?.name || '');
  const [idCardFront, setIdCardFront] = useState<File | null>(null);
  const [idCardBack, setIdCardBack] = useState<File | null>(null);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  
  useEffect(() => {
    if (connectedWallet && isConnected) {
      setWalletAddress(connectedWallet);
    }
  }, [connectedWallet, isConnected]);
  const [selectedChain, setSelectedChain] = useState<'BNB' | 'ETH'>('BNB');
  const [residentialArea, setResidentialArea] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  // Preview URLs
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);

  // Extracted ID Data State
  const [extractedData, setExtractedData] = useState<ExtractedIDData | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<ExtractionProgress | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<{ checked: boolean; isDuplicate: boolean }>({ checked: false, isDuplicate: false });
  
  // Face verification state
  const [faceVerification, setFaceVerification] = useState<{
    verified: boolean;
    isMatch: boolean;
    confidence: number;
    message: string;
    skipped: boolean;
  } | null>(null);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  
  // Editable extracted fields
  const [editedName, setEditedName] = useState('');
  const [editedFatherName, setEditedFatherName] = useState('');
  const [editedMotherName, setEditedMotherName] = useState('');
  const [editedDOB, setEditedDOB] = useState('');
  const [editedNID, setEditedNID] = useState('');
  const [nidValidation, setNidValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });
  const [dobValidation, setDobValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

  // Handle file change with OCR extraction
  const handleFrontFileChange = async (file: File | null) => {
    if (file) {
      setIdCardFront(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdFrontPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Start OCR extraction
      setIsExtracting(true);
      setExtractedData(null);
      setDuplicateCheck({ checked: false, isDuplicate: false });
      
      try {
        const data = await extractIDCardData(file, setExtractionProgress);
        setExtractedData(data);
        
        // Pre-fill editable fields
        setEditedName(data.name);
        setEditedFatherName(data.fatherName);
        setEditedMotherName(data.motherName);
        setEditedDOB(data.dateOfBirth);
        setEditedNID(data.idNumber);

        // Check for duplicate NID
        const dupCheck = await checkDuplicateNID(data.idNumber);
        setDuplicateCheck({ checked: true, isDuplicate: dupCheck.isDuplicate });
        
      } catch (error) {
        console.error('Extraction error:', error);
      } finally {
        setIsExtracting(false);
        setExtractionProgress(null);
      }
    }
  };

  const handleBackFileChange = (file: File | null) => {
    if (file) {
      setIdCardBack(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdBackPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Validate NID on change
  useEffect(() => {
    if (editedNID) {
      const validation = validateNIDNumber(editedNID);
      setNidValidation(validation);
    }
  }, [editedNID]);

  // Validate DOB on change
  useEffect(() => {
    if (editedDOB) {
      const validation = validateDateOfBirth(editedDOB);
      setDobValidation(validation);
    }
  }, [editedDOB]);

  const validateStep1 = () => {
    if (!residentialArea) {
      alert('Please select your residential area');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!idCardFront) {
      alert('Please upload the front of your ID card');
      return false;
    }
    if (!idCardBack) {
      alert('Please upload the back of your ID card');
      return false;
    }
    if (!extractedData) {
      alert('Please wait for ID card data extraction');
      return false;
    }
    if (!editedName.trim()) {
      alert('Please verify/enter your name');
      return false;
    }
    if (!editedFatherName.trim()) {
      alert('Please verify/enter father\'s name');
      return false;
    }
    if (!editedMotherName.trim()) {
      alert('Please verify/enter mother\'s name');
      return false;
    }
    if (!nidValidation.valid) {
      alert('Please enter a valid NID number');
      return false;
    }
    if (!dobValidation.valid) {
      alert('Please enter a valid date of birth');
      return false;
    }
    if (duplicateCheck.isDuplicate) {
      alert('This NID is already registered. Each citizen can only register once.');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!facePhoto) {
      alert('Please capture your face photo using the camera');
      return false;
    }
    // Face verification is optional - will be checked but won't block if skipped
    return true;
  };

  const validateStep4 = () => {
    if (!isConnected || !connectedWallet) {
      alert('Please connect your wallet before submitting');
      return false;
    }
    if (!acceptTerms) {
      alert('Please accept the terms and conditions');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep4()) return;
    
    setLoading(true);
    
    try {
      // Upload images to Cloudinary first
      const [frontResult, backResult, faceResult] = await Promise.all([
        uploadToCloudinary(idFrontPreview || '', 'kyc/id-front'),
        uploadToCloudinary(idBackPreview || '', 'kyc/id-back'),
        uploadToCloudinary(facePhoto || '', 'kyc/face'),
      ]);

      // Check if all uploads succeeded
      if (!frontResult.success || !backResult.success || !faceResult.success) {
        const errors = [
          !frontResult.success && `ID Front: ${frontResult.error}`,
          !backResult.success && `ID Back: ${backResult.error}`,
          !faceResult.success && `Face Photo: ${faceResult.error}`,
        ].filter(Boolean).join('\n');
        alert(`Image upload failed:\n${errors}`);
        return;
      }

      // Submit KYC with Cloudinary URLs and extracted data
      const response = await kycAPI.submit({
        fullName: editedName,
        residentialArea,
        idCardFront: frontResult.url || '',
        idCardBack: backResult.url || '',
        facePhoto: faceResult.url || '',
        walletAddress,
        chainType: selectedChain,
        extractedData: {
          name: editedName,
          fatherName: editedFatherName,
          motherName: editedMotherName,
          dateOfBirth: editedDOB,
          nidNumber: editedNID,
        },
      });
      
      if (response.code === 'SUCCESS') {
        setSubmitted(true);
        // Refresh user context to update KYC status in real-time
        await refreshUser();
      } else {
        alert(response.msg || 'Failed to submit KYC');
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      alert('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const selectedChainInfo = SUPPORTED_CHAINS.find(c => c.id === selectedChain);

  // If KYC is already submitted or approved
  if (user?.kycStatus === 'pending' || submitted) {
    return (
      <div className="animate-fade-in">
        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
            <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">KYC Verification Pending</h2>
          <p className="text-gray-400 mb-6">
            Your documents have been submitted successfully. Our team will review them within 72 hours.
            You will receive an email notification once your verification is complete.
          </p>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
            <p className="text-yellow-400 text-sm">
              <strong>Submission ID:</strong> KYC-{Date.now().toString(36).toUpperCase()}
            </p>
            <p className="text-yellow-400 text-sm mt-1">
              <strong>NFT Chain:</strong> {selectedChainInfo?.icon} {selectedChainInfo?.name}
            </p>
            <p className="text-yellow-400 text-sm mt-1">
              <strong>NID:</strong> {editedNID}
            </p>
            <p className="text-yellow-400 text-sm mt-1">
              <strong>Expected Review Time:</strong> Up to 72 hours
            </p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">
              <strong>Note:</strong> Once approved, your NFT voter ID will be minted on the {selectedChainInfo?.name} ({selectedChainInfo?.testnetName}). 
              You will be able to participate in all elections using this NFT.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user?.kycStatus === 'approved') {
    return (
      <div className=" animate-fade-in">
        <div className="bg-[#12161C] border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Identity Verified</h2>
          <p className="text-gray-400 mb-6">
            Congratulations! Your identity has been verified and your NFT voter ID has been minted.
          </p>
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
            <p className="text-green-400 text-sm">
              <strong>NFT Token ID:</strong> {user.nftTokenId}
            </p>
            <p className="text-green-400 text-sm">
              <strong>Chain:</strong> {user.nftChain === 'BNB' ? '🟡 BNB Smart Chain' : '🔷 Ethereum'}
            </p>
            <p className="text-green-400 text-sm">
              <strong>Wallet:</strong> {user.walletAddress?.slice(0, 10)}...{user.walletAddress?.slice(-8)}
            </p>
          </div>
          <div className="mt-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
            <p className="text-blue-400 text-sm">
              You can now participate in all elections. Your votes will be recorded using your NFT from the {user.nftChain === 'BNB' ? 'BNB Smart Chain' : 'Ethereum'} network.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (user?.kycStatus === 'rejected') {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-red-400 font-semibold mb-2">Verification Rejected</h3>
              <p className="text-gray-400 text-sm">
                Your previous submission was rejected. Please review the reason below and resubmit your documents.
              </p>
              <div className="mt-3 p-3 bg-red-500/10 rounded-lg">
                <p className="text-red-400 text-sm">
                  <strong>Reason:</strong> ID card image is blurry. Please resubmit with a clearer photo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">KYC Verification</h1>
        <p className="text-gray-400">
          Complete your identity verification to receive your NFT voter ID
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 md:gap-4 py-6">
        {[
          { num: 1, label: 'Area' },
          { num: 2, label: 'ID Documents' },
          { num: 3, label: 'Face Capture' },
          { num: 4, label: 'Wallet & Chain' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center">
            <div className="flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-300 ${
                  step >= s.num 
                    ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/30' 
                    : 'bg-white/10 text-gray-500'
                }`}
              >
                {step > s.num ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s.num}
              </div>
              <span className={`text-xs mt-1 hidden md:block ${step >= s.num ? 'text-blue-400' : 'text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            {idx < 3 && (
              <div className={`w-8 md:w-16 h-1 mx-1 md:mx-2 rounded transition-all duration-300 ${step > s.num ? 'bg-blue-500' : 'bg-white/10'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="bg-[#12161C] border border-white/10 rounded-2xl p-6 md:p-8 transition-all duration-300">
        {/* Step 1: Area Selection */}
        {step === 1 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Select Your Residential Area</h2>
              <p className="text-gray-400 text-sm">This determines which elections you can participate in</p>
            </div>

            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Residential Area <span className="text-red-400">*</span>
              </label>
              <select
                value={residentialArea}
                onChange={(e) => setResidentialArea(e.target.value)}
                className="w-full bg-[#1E2329] border border-[#2B3139] rounded-xl px-4 py-3.5 text-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              >
                <option value="">Select your area</option>
                {VOTING_AREAS.map((area) => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => validateStep1() && setStep(2)}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all transform hover:scale-[1.02]"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Document Upload with OCR Extraction */}
        {step === 2 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Upload ID Documents</h2>
              <p className="text-gray-400 text-sm">Upload your National ID card - data will be extracted automatically</p>
            </div>

            <div className='flex gap-6'>
              {/* ID Card Front */}
              <div className='w-full'> 
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  ID Card - Front Side <span className="text-red-400">*</span>
                </label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  idFrontPreview ? 'border-green-500/50 bg-green-500/5' : 'border-[#2B3139] hover:border-blue-500/50 hover:bg-blue-500/5'
                }`}>
                  {idFrontPreview ? (
                    <div className="relative">
                      <img src={idFrontPreview} alt="ID Front" className="max-h-48 mx-auto rounded-lg shadow-lg" />
                      <button
                        onClick={() => {
                          setIdCardFront(null);
                          setIdFrontPreview(null);
                          setExtractedData(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-white mb-2 font-medium">Click to upload front side</p>
                      <p className="text-gray-500 text-sm">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFrontFileChange(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* ID Card Back */}
              <div className='w-full'>
                <label className="block text-gray-400 text-sm font-medium mb-2">
                  ID Card - Back Side <span className="text-red-400">*</span>
                </label>
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  idBackPreview ? 'border-green-500/50 bg-green-500/5' : 'border-[#2B3139] hover:border-blue-500/50 hover:bg-blue-500/5'
                }`}>
                  {idBackPreview ? (
                    <div className="relative">
                      <img src={idBackPreview} alt="ID Back" className="max-h-48 mx-auto rounded-lg shadow-lg" />
                      <button
                        onClick={() => {
                          setIdCardBack(null);
                          setIdBackPreview(null);
                        }}
                        className="absolute top-2 right-2 p-2 bg-red-500 rounded-full text-white hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-white mb-2 font-medium">Click to upload back side</p>
                      <p className="text-gray-500 text-sm">PNG, JPG up to 10MB</p>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleBackFileChange(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* OCR Extraction Progress */}
            {isExtracting && extractionProgress && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 animate-pulse">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                  <div>
                    <p className="text-blue-400 font-medium">{extractionProgress.message}</p>
                    <p className="text-gray-500 text-sm">Extracting data from your ID card...</p>
                  </div>
                </div>
                <div className="w-full bg-blue-500/20 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${extractionProgress.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Extracted Data Display & Edit */}
            {extractedData && !isExtracting && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h3 className="text-green-400 font-semibold">Data Extracted Successfully</h3>
                  </div>
                  <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                    {Math.round(extractedData.confidence * 100)}% confidence
                  </span>
                </div>
                
                <p className="text-gray-400 text-sm mb-4">Please verify the extracted information:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedName}
                      readOnly
                      className="w-full bg-[#1E2329] border border-[#2B3139] rounded-lg px-3 py-2.5 text-white text-sm cursor-not-allowed opacity-90"
                    />
                  </div>

                  {/* NID Number */}
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1">
                      NID Number <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedNID}
                      readOnly
                      className={`w-full bg-[#1E2329] border rounded-lg px-3 py-2.5 text-white text-sm cursor-not-allowed opacity-90 ${
                        nidValidation.valid ? 'border-[#2B3139]' : 'border-red-500'
                      }`}
                    />
                    {!nidValidation.valid && (
                      <p className="text-red-400 text-xs mt-1">{nidValidation.error}</p>
                    )}
                  </div>

                  {/* Father's Name */}
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1">
                      Father&apos;s Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedFatherName}
                      readOnly
                      className="w-full bg-[#1E2329] border border-[#2B3139] rounded-lg px-3 py-2.5 text-white text-sm cursor-not-allowed opacity-90"
                    />
                  </div>

                  {/* Mother's Name */}
                  <div>
                    <label className="block text-gray-400 text-xs font-medium mb-1">
                      Mother&apos;s Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedMotherName}
                      readOnly
                      className="w-full bg-[#1E2329] border border-[#2B3139] rounded-lg px-3 py-2.5 text-white text-sm cursor-not-allowed opacity-90"
                    />
                  </div>

                  {/* Date of Birth */}
                  <div className="md:col-span-2">
                    <label className="block text-gray-400 text-xs font-medium mb-1">
                      Date of Birth <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={editedDOB}
                      readOnly
                      className={`w-full bg-[#1E2329] border rounded-lg px-3 py-2.5 text-white text-sm cursor-not-allowed opacity-90 ${
                        dobValidation.valid ? 'border-[#2B3139]' : 'border-red-500'
                      }`}
                    />
                    {!dobValidation.valid && (
                      <p className="text-red-400 text-xs mt-1">{dobValidation.error}</p>
                    )}
                  </div>
                </div>

                {/* Duplicate Check Warning */}
                {duplicateCheck.checked && duplicateCheck.isDuplicate && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-start gap-2">
                    <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-red-400 text-sm">
                      <strong>Duplicate Detected:</strong> This NID is already registered in our system. Each citizen can only register once.
                    </p>
                  </div>
                )}

                {duplicateCheck.checked && !duplicateCheck.isDuplicate && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-green-400 text-sm">NID verified - No duplicate registration found</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-xl hover:bg-white/10 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => validateStep2() && setStep(3)}
                disabled={isExtracting || !extractedData}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Face Capture */}
        {step === 3 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Face Verification</h2>
              <p className="text-gray-400 text-sm">Take a clear photo of your face using your camera</p>
            </div>

            <CameraCapture 
              onCapture={async (photo) => {
                setFacePhoto(photo);
                setFaceVerification(null);
                
                // Auto-trigger face verification after photo capture
                if (idFrontPreview) {
                  setIsVerifyingFace(true);
                  try {
                    const response = await kycAPI.verifyFace(idFrontPreview, photo);
                    
                    if (response.code === 'SUCCESS' && response.data) {
                      setFaceVerification({
                        verified: true,
                        isMatch: response.data.isMatch || false,
                        confidence: response.data.confidencePercent || 0,
                        message: response.msg,
                        skipped: response.data.skipped || false
                      });
                    } else {
                      setFaceVerification({
                        verified: true,
                        isMatch: false,
                        confidence: 0,
                        message: response.msg || 'Face verification failed',
                        skipped: false
                      });
                    }
                  } catch (error) {
                    console.error('Face verification error:', error);
                    setFaceVerification({
                      verified: true,
                      isMatch: false,
                      confidence: 0,
                      message: 'Face verification service unavailable',
                      skipped: true
                    });
                  } finally {
                    setIsVerifyingFace(false);
                  }
                }
              }}
              capturedImage={facePhoto}
              onRetake={() => {
                setFacePhoto(null);
                setFaceVerification(null);
              }}
            />

            {/* Face Verification Section */}
            {facePhoto && idFrontPreview && (
              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Face Verification (AI-Powered)
                </h3>

                {isVerifyingFace && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <svg className="animate-spin h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-purple-400">Analyzing faces with Azure AI...</span>
                  </div>
                )}

                {faceVerification && (
                  <div className={`p-4 rounded-lg ${
                    faceVerification.skipped 
                      ? 'bg-yellow-500/10 border border-yellow-500/30'
                      : faceVerification.isMatch 
                        ? 'bg-green-500/10 border border-green-500/30' 
                        : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-3">
                      {faceVerification.skipped ? (
                        <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      ) : faceVerification.isMatch ? (
                        <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      ) : (
                        <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <div>
                        <p className={`font-medium ${
                          faceVerification.skipped 
                            ? 'text-yellow-400' 
                            : faceVerification.isMatch 
                              ? 'text-green-400' 
                              : 'text-red-400'
                        }`}>
                          {faceVerification.skipped 
                            ? 'Verification Skipped' 
                            : faceVerification.isMatch 
                              ? 'Face Match Confirmed' 
                              : 'Face Mismatch Detected'}
                        </p>
                        <p className="text-gray-400 text-sm">{faceVerification.message}</p>
                      </div>
                    </div>
                    {!faceVerification.isMatch && !faceVerification.skipped && (
                      <p className="text-gray-400 text-xs mt-2">
                        Please verify your face to proceed.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(2)}
                className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-xl hover:bg-white/10 transition-all"
              >
                Back
              </button>
              <button
                onClick={() => validateStep3() && setStep(4)}
                disabled={!facePhoto || isVerifyingFace || (faceVerification !== null && !faceVerification.isMatch && !faceVerification.skipped)}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {isVerifyingFace ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Wallet & Chain Selection */}
        {step === 4 && (
          <div className="space-y-6 animate-slide-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Choose Your NFT Chain</h2>
              <p className="text-gray-400 text-sm">Select the blockchain where you want to receive your voter NFT</p>
            </div>

            {/* Summary of Extracted Data */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4">
              <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Your Verified Information
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Name:</span>
                  <p className="text-white">{editedName}</p>
                </div>
                <div>
                  <span className="text-gray-500">NID:</span>
                  <p className="text-white">{editedNID}</p>
                </div>
                <div>
                  <span className="text-gray-500">Father:</span>
                  <p className="text-white">{editedFatherName}</p>
                </div>
                <div>
                  <span className="text-gray-500">Mother:</span>
                  <p className="text-white">{editedMotherName}</p>
                </div>
                <div>
                  <span className="text-gray-500">DOB:</span>
                  <p className="text-white">{editedDOB}</p>
                </div>
                <div>
                  <span className="text-gray-500">Area:</span>
                  <p className="text-white">{residentialArea}</p>
                </div>
              </div>
            </div>

            {/* Chain Selection */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-3">
                Select Blockchain Network <span className="text-red-400">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUPPORTED_CHAINS.map((chain) => (
                  <button
                    key={chain.id}
                    type="button"
                    onClick={() => setSelectedChain(chain.id as 'BNB' | 'ETH')}
                    className={`p-5 rounded-xl border-2 transition-all text-left group ${
                      selectedChain === chain.id
                        ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20'
                        : 'border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-3xl">{chain.icon}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedChain === chain.id ? 'border-blue-500 bg-blue-500' : 'border-gray-500'
                      }`}>
                        {selectedChain === chain.id && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <p className="text-white font-semibold">{chain.name}</p>
                    <p className="text-gray-500 text-sm">{chain.testnetName}</p>
                  </button>
                ))}
              </div>
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  <strong>Important:</strong> Your NFT will be minted on the selected chain. You will vote using this NFT from this chain. All elections support both chains.
                </p>
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div>
              <label className="block text-gray-400 text-sm font-medium mb-2">
                Wallet Address <span className="text-red-400">*</span>
              </label>
              {isConnected && connectedWallet ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-green-400 font-medium">Wallet Connected</span>
                  </div>
                  <p className="text-white font-mono text-sm break-all">{connectedWallet}</p>
                  <p className="text-gray-400 text-xs mt-2">
                    Your NFT voter ID will be minted to this address on {selectedChain === 'BNB' ? 'BSC Testnet' : 'Sepolia Testnet'}.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-yellow-400 font-medium">Wallet Not Connected</span>
                  </div>
                  <p className="text-gray-400 text-sm">
                    Please connect your wallet using the button in the top navigation bar before submitting your KYC.
                  </p>
                </div>
              )}
            </div>

            {/* Terms and Conditions */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="terms"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-[#2B3139] bg-[#1E2329] text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                />
                <label htmlFor="terms" className="text-gray-400 text-sm cursor-pointer">
                  I confirm that all information provided is accurate and matches my official identity documents. 
                  I understand that providing false information may result in permanent account suspension 
                  and legal consequences. I agree to the{' '}
                  <span className="text-blue-400 hover:underline">Terms of Service</span> and{' '}
                  <span className="text-blue-400 hover:underline">Privacy Policy</span>.
                </label>
              </div>
            </div>

            {/* Warning */}
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <p className="text-yellow-400 text-sm">
                  <strong>Review Time:</strong> After submission, your application will be reviewed within 72 hours. 
                  Upon approval, your NFT will be minted using the smart contract with your verified data stored on IPFS.
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <button
                onClick={() => setStep(3)}
                className="flex-1 bg-white/5 border border-white/10 text-white font-semibold py-4 rounded-xl hover:bg-white/10 transition-all"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold py-4 rounded-xl hover:shadow-lg hover:shadow-green-500/25 transition-all transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Submitting...
                  </span>
                ) : (
                  'Submit for Verification'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
