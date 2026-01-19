import { useAccount, useSignMessage, useDisconnect } from 'wagmi';
import { useState } from 'react';
import { authAPI } from '@/lib/api';

export function useWalletAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const authenticateWallet = async () => {
    if (!address || !isConnected) {
      throw new Error('Wallet not connected');
    }

    setIsAuthenticating(true);
    try {
      // Request nonce from server
      const nonceResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/wallet/nonce?address=${address}`);
      const { nonce } = await nonceResponse.json();

      // Sign message with nonce
      const message = `Sign this message to authenticate with NFT Voting System.\n\nNonce: ${nonce}\nAddress: ${address}`;
      const signature = await signMessageAsync({ message });

      // Verify signature on server
      const verifyResponse = await authAPI.walletLogin(address, signature, nonce);
      
      if (verifyResponse.code === 'SUCCESS' && verifyResponse.data) {
        return {
          token: verifyResponse.data.token,
          user: verifyResponse.data.user,
        };
      }
      
      throw new Error(verifyResponse.msg || 'Authentication failed');
    } catch (error) {
      console.error('Wallet authentication error:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  return {
    address,
    isConnected,
    isAuthenticating,
    authenticateWallet,
    disconnect,
  };
}
