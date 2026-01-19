/**
 * ID Card Data Extractor Service
 * 
 * This module handles extraction of data from Bangladesh National ID cards
 * using Tesseract.js for free client-side OCR extraction.
 */

import Tesseract from 'tesseract.js';
import { kycAPI } from './api';

export interface ExtractedIDData {
  name: string;
  nameBangla: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  idNumber: string;
  address?: string;
  confidence: number;
  rawText?: string;
  extractionStatus: 'success' | 'partial' | 'failed';
  errors: string[];
}

export interface ExtractionProgress {
  stage: 'uploading' | 'processing' | 'extracting' | 'validating' | 'complete';
  progress: number;
  message: string;
}

// Extract ID Card Data using Azure Form Recognizer (via backend API)
export async function extractIDCardData(
  imageFile: File | string,
  onProgress?: (progress: ExtractionProgress) => void
): Promise<ExtractedIDData> {
  // Stage 1: Uploading
  onProgress?.({
    stage: 'uploading',
    progress: 10,
    message: 'Preparing image for Azure Form Recognizer...'
  });

  try {
    // Convert File to base64 if needed
    let base64Image: string;
    
    if (typeof imageFile === 'string') {
      base64Image = imageFile;
    } else {
      // Convert File to base64
      base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });
    }

    // Stage 2: Processing
    onProgress?.({
      stage: 'processing',
      progress: 30,
      message: 'Uploading to Azure Form Recognizer...'
    });

    // Stage 3: Extracting with Azure Form Recognizer via backend
    onProgress?.({
      stage: 'extracting',
      progress: 50,
      message: 'Analyzing ID card with Azure AI...'
    });

    // Call backend API to extract data using Azure
    const response = await kycAPI.extractIdCard(base64Image);

    if (response.code !== 'SUCCESS' || !response.data) {
      throw new Error(response.msg || 'Failed to extract ID card data');
    }

    const extractedData = response.data;

    // Stage 4: Validating
    onProgress?.({
      stage: 'validating',
      progress: 85,
      message: 'Validating extracted data...'
    });

    // Stage 5: Complete
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Extraction complete!'
    });

    return {
      name: extractedData.name || 'Not detected',
      nameBangla: extractedData.nameBangla || 'Not detected',
      fatherName: extractedData.fatherName || 'Not detected',
      motherName: extractedData.motherName || 'Not detected',
      dateOfBirth: extractedData.dateOfBirth || 'Not detected',
      idNumber: extractedData.idNumber || '',
      address: extractedData.address,
      confidence: extractedData.confidence || 0,
      extractionStatus: extractedData.extractionStatus || 'partial',
      errors: extractedData.errors || []
    };

  } catch (error) {
    console.error('Azure ID extraction error:', error);
    
    onProgress?.({
      stage: 'complete',
      progress: 100,
      message: 'Extraction failed'
    });

    return {
      name: 'Not detected',
      nameBangla: 'Not detected',
      fatherName: 'Not detected',
      motherName: 'Not detected',
      dateOfBirth: 'Not detected',
      idNumber: '',
      confidence: 0,
      extractionStatus: 'failed',
      errors: [error instanceof Error ? error.message : 'Unknown error occurred']
    };
  }
}

// Parse Bangladesh NID card text using pattern matching
function parseNIDCardText(text: string): ExtractedIDData {
  const errors: string[] = [];
  
  let name = '';
  const nameBangla = '';
  let fatherName = '';
  let motherName = '';
  let dateOfBirth = '';
  let idNumber = '';

  console.log('Parsing OCR text:', text);

  // Pattern for NID number (10, 13, or 17 digits)
  const nidPatterns = [
    /ID\s*NO[:\s]*(\d{10,17})/i,
    /NID[:\s]*(\d{10,17})/i,
  ];

  // Extract NID Number first
  for (const pattern of nidPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const cleanNid = match[1].replace(/\D/g, '');
      if (cleanNid.length === 10 || cleanNid.length === 13 || cleanNid.length === 17) {
        idNumber = cleanNid;
        break;
      }
    }
  }

  // If no NID found with patterns, search for any 10-digit number
  if (!idNumber) {
    const allNumbers = text.match(/\d{10,17}/g);
    if (allNumbers) {
      for (const num of allNumbers) {
        if (num.length === 10 || num.length === 13 || num.length === 17) {
          idNumber = num;
          break;
        }
      }
    }
  }

  // Extract Date of Birth - improved patterns
  const dobPatterns = [
    /Date\s*of\s*Birth[:\s]*(\d{1,2}\s*[A-Za-z]+\s*\d{4})/i,
    /Birth[:\s]*(\d{1,2}\s*[A-Za-z]+\s*\d{4})/i,
    /(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4})/i,
  ];

  for (const pattern of dobPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Normalize the date format - add space if missing
      let dob = match[1].trim();
      // Fix "01 Feb1993" -> "01 Feb 1993"
      dob = dob.replace(/([A-Za-z])(\d)/g, '$1 $2');
      dateOfBirth = dob;
      break;
    }
  }

  // Extract Name - look for "Name:" followed by English text
  const namePatterns = [
    /Name[:\s]*([A-Z][A-Z\s.]+)/i,  // Name: MD. RASHED MIA
    /Name[:\s]+([^\n\r]+)/i,         // Fallback: anything after Name:
  ];

  for (const pattern of namePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Clean and extract only English letters
      let potentialName = match[1].trim();
      // Remove non-English characters but keep dots and spaces
      potentialName = potentialName.replace(/[^A-Za-z\s.]/g, ' ').trim();
      // Collapse multiple spaces
      potentialName = potentialName.replace(/\s+/g, ' ');
      
      // Fix common OCR issues: ". ASHED" -> "MD. RASHED" pattern
      // If name starts with ". " followed by letters, it might be missing "MD"
      if (/^\.\s*[A-Z]/.test(potentialName)) {
        potentialName = 'MD' + potentialName;
      }
      // If name starts with single letter followed by space and more text, check if it could be "MD."
      if (/^[A-Z]\s+[A-Z]/.test(potentialName) && !potentialName.startsWith('MD')) {
        // Could be missing the "M" or partial "MD"
      }
      
      // Fix missing first letter (OCR often misses M from MD.)
      if (potentialName.startsWith('D.') || potentialName.startsWith('D ')) {
        potentialName = 'M' + potentialName;
      }
      
      if (potentialName.length > 3 && 
          !potentialName.includes('Government') && 
          !potentialName.includes('Bangladesh') &&
          !potentialName.includes('National')) {
        name = potentialName.toUpperCase();
        break;
      }
    }
  }

  // Extract Father's Name - look for পিতা or Father
  const fatherMatch = text.match(/(?:পিতা|Father)[:\s]*([^\n\r]+)/i);
  if (fatherMatch && fatherMatch[1]) {
    // Try to extract English part
    const englishMatch = fatherMatch[1].match(/([A-Z][A-Za-z\s.]+)/);
    if (englishMatch) {
      fatherName = englishMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    }
  }

  // Extract Mother's Name - look for মাতা or Mother
  const motherMatch = text.match(/(?:মাতা|Mother)[:\s]*([^\n\r]+)/i);
  if (motherMatch && motherMatch[1]) {
    // Try to extract English part
    const englishMatch = motherMatch[1].match(/([A-Z][A-Za-z\s.]+)/);
    if (englishMatch) {
      motherName = englishMatch[1].replace(/\s+/g, ' ').trim().toUpperCase();
    }
  }

  // Determine extraction status
  let extractionStatus: 'success' | 'partial' | 'failed' = 'success';
  
  if (!idNumber) {
    errors.push('Could not extract NID number');
    extractionStatus = 'partial';
  }
  if (!name) {
    errors.push('Could not extract name');
    extractionStatus = 'partial';
  }
  if (!dateOfBirth) {
    errors.push('Could not extract date of birth');
  }

  if (!idNumber && !name) {
    extractionStatus = 'failed';
  }

  return {
    name: name || 'Not detected',
    nameBangla,
    fatherName: fatherName || 'Not detected',
    motherName: motherName || 'Not detected',
    dateOfBirth: dateOfBirth || 'Not detected',
    idNumber,
    confidence: 0,
    extractionStatus,
    errors
  };
}

// Validate extracted NID number
export function validateNIDNumber(nid: string): { valid: boolean; error?: string } {
  // Remove any spaces or dashes
  const cleanNID = nid.replace(/[\s-]/g, '');
  
  // Bangladesh NID is typically 10, 13, or 17 digits
  if (!/^\d+$/.test(cleanNID)) {
    return { valid: false, error: 'NID should contain only numbers' };
  }
  
  if (cleanNID.length !== 10 && cleanNID.length !== 13 && cleanNID.length !== 17) {
    return { valid: false, error: 'NID should be 10, 13, or 17 digits' };
  }
  
  return { valid: true };
}

// Validate date of birth format
export function validateDateOfBirth(dob: string): { valid: boolean; error?: string; date?: Date } {
  if (!dob || dob === 'Not detected') {
    return { valid: false, error: 'Date of birth is required' };
  }

  // Normalize the date string - fix spacing issues
  let normalizedDob = dob.trim();
  // Fix "01 Feb1993" -> "01 Feb 1993"
  normalizedDob = normalizedDob.replace(/([A-Za-z])(\d)/g, '$1 $2');
  // Fix multiple spaces
  normalizedDob = normalizedDob.replace(/\s+/g, ' ');

  // Try to parse common formats
  const formats = [
    /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})$/i,
    /^(\d{4})-(\d{2})-(\d{2})$/,
    /^(\d{2})\/(\d{2})\/(\d{4})$/
  ];
  
  for (const format of formats) {
    if (format.test(normalizedDob)) {
      const date = new Date(normalizedDob);
      if (!isNaN(date.getTime())) {
        // Check if age is reasonable (18-120 years)
        const age = new Date().getFullYear() - date.getFullYear();
        if (age < 18) {
          return { valid: false, error: 'Must be at least 18 years old' };
        }
        if (age > 120) {
          return { valid: false, error: 'Invalid date of birth' };
        }
        return { valid: true, date };
      }
    }
  }

  // Try direct Date parsing as fallback
  const directDate = new Date(normalizedDob);
  if (!isNaN(directDate.getTime())) {
    const age = new Date().getFullYear() - directDate.getFullYear();
    if (age >= 18 && age <= 120) {
      return { valid: true, date: directDate };
    }
  }
  
  return { valid: false, error: 'Invalid date format' };
}

// Check for duplicate NID in database using real API
export async function checkDuplicateNID(nid: string): Promise<{ isDuplicate: boolean; message?: string }> {
  try {
    const response = await kycAPI.checkDuplicateNID(nid);
    
    if (response.code === 'SUCCESS' && response.data) {
      return {
        isDuplicate: response.data.isDuplicate,
        message: response.data.message
      };
    }
    
    return { isDuplicate: false };
  } catch (error) {
    console.error('Duplicate NID check error:', error);
    return { isDuplicate: false };
  }
}

// Format extracted data for display
export function formatExtractedData(data: ExtractedIDData): {
  displayName: string;
  displayFather: string;
  displayMother: string;
  displayDOB: string;
  displayNID: string;
} {
  return {
    displayName: data.name || 'Not detected',
    displayFather: data.fatherName || 'Not detected',
    displayMother: data.motherName || 'Not detected',
    displayDOB: data.dateOfBirth || 'Not detected',
    displayNID: formatNIDDisplay(data.idNumber) || 'Not detected'
  };
}

// Format NID for display (add spaces for readability)
function formatNIDDisplay(nid: string): string {
  if (!nid) return '';
  
  // Format based on length
  if (nid.length === 10) {
    return `${nid.slice(0, 3)} ${nid.slice(3, 7)} ${nid.slice(7)}`;
  }
  if (nid.length === 13) {
    return `${nid.slice(0, 4)} ${nid.slice(4, 8)} ${nid.slice(8)}`;
  }
  if (nid.length === 17) {
    return `${nid.slice(0, 4)} ${nid.slice(4, 8)} ${nid.slice(8, 12)} ${nid.slice(12)}`;
  }
  
  return nid;
}

// Generate metadata for IPFS storage
export function generateNFTMetadata(
  extractedData: ExtractedIDData,
  walletAddress: string,
  chainId: 'BNB' | 'ETH',
  residentialArea: string,
  facePhotoHash: string
): object {
  return {
    name: `Voter ID - ${extractedData.name}`,
    description: 'NFT-based Voter Identity for Decentralized Voting System',
    image: `ipfs://${facePhotoHash}`,
    external_url: 'https://nft-voting-system.com',
    attributes: [
      {
        trait_type: 'Name',
        value: extractedData.name
      },
      {
        trait_type: 'NID Number',
        value: extractedData.idNumber
      },
      {
        trait_type: 'Date of Birth',
        value: extractedData.dateOfBirth
      },
      {
        trait_type: 'Residential Area',
        value: residentialArea
      },
      {
        trait_type: 'Chain',
        value: chainId === 'BNB' ? 'BNB Smart Chain' : 'Ethereum'
      },
      {
        trait_type: 'Registration Date',
        value: new Date().toISOString()
      },
      {
        trait_type: 'Verification Status',
        value: 'Verified'
      }
    ],
    properties: {
      voterWallet: walletAddress,
      nidHash: hashData(extractedData.idNumber),
      dataHash: hashData(JSON.stringify({
        name: extractedData.name,
        fatherName: extractedData.fatherName,
        motherName: extractedData.motherName,
        dob: extractedData.dateOfBirth,
        nid: extractedData.idNumber
      }))
    }
  };
}

// Simple hash function for data integrity (use crypto in production)
function hashData(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}
