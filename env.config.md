# Client Environment Variables

Create a `.env.local` file in the client folder with the following variables:

```env
# API Server URL
NEXT_PUBLIC_API_URL=http://localhost:3001

# Google OAuth Client ID
NEXT_PUBLIC_GOOGLE_CLIENT_ID=682579882661-9dp3jc9nn9fitceud7p541cn6ck141nh.apps.googleusercontent.com

# Blockchain Configuration
NEXT_PUBLIC_BSC_TESTNET_RPC=https://data-seed-prebsc-1-s1.binance.org:8545/
NEXT_PUBLIC_VOTER_NFT_ADDRESS=0x51f1182d716b119e05e07643843f874ad04874c0
NEXT_PUBLIC_VOTING_SYSTEM_ADDRESS=0xd79a6599ab5fef53453744ebb2cc9d8e234f2b4f

# Cloudinary Configuration (for client-side image uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dq9yrj7c9
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=kyc_uploads
```

## Cloudinary Setup

To enable client-side image uploads, you need to create an **unsigned upload preset** in Cloudinary:

1. Go to Cloudinary Dashboard → Settings → Upload
2. Click "Add upload preset"
3. Set "Signing Mode" to **Unsigned**
4. Set "Folder" to `kyc`
5. Name it `kyc_uploads`
6. Save the preset
