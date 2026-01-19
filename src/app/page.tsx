'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { BackgroundPaths } from '@/components/ui/background-paths';
import { TestimonialCard } from '@/components/ui/testimonial-card';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !mounted) {
    return (
      <div className="min-h-screen bg-[#0B0E11] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] relative overflow-hidden">
      {/* Animated Background with Paths */}
      <div className="absolute inset-0">
        <BackgroundPaths />
        {/* Gradient Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-500/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[40%] left-[30%] w-[400px] h-[400px] bg-cyan-500/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/5">
        <nav className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              className="flex items-center gap-3"
            >
              <Image
                src="/logo.png"
                alt="NFT Voting Logo"
                width={40}
                height={40}
                className="rounded-xl"
              />
              <span className="text-xl font-bold text-white">NFT Voting</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center gap-4"
            >
              <Link
                href="/login"
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:-translate-y-0.5"
              >
                Sign Up
              </Link>
            </motion.div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="relative z-10">
        <div className="max-w-7xl mx-auto  px-4 sm:px-6 lg:px-8 mt-8 mb-16 lg:pb-28">
          <div className="text-center space-y-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full"
            >
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              <span className="text-blue-400 text-sm font-medium">Powered by Blockchain Technology</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-7xl font-bold text-white leading-tight"
            >
              <span className="gradient-text animate-gradient">
                Decentralized
              </span>
              <span className="text-white"> Voting System</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto leading-relaxed"
            >
              Secure, transparent, and verifiable voting powered by{' '}
              <span className="text-blue-400">NFT-based voter identity</span> and{' '}
              <span className="text-purple-400">cross-chain technology</span>.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6"
            >
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-blue-500/30 transition-all transform hover:scale-105 hover:-translate-y-1"
              >
                Get Started Free
              </Link>
              <Link
                href="#features"
                className="w-full sm:w-auto px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-xl hover:bg-white/10 transition-all group"
              >
                Learn More{' '}
                <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </motion.div>

            {/* Supported Chains */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10"
            >
              <span className="text-gray-500 text-sm">Supported Networks:</span>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/20 transition-colors cursor-pointer">
                  <span className="text-2xl">🟡</span>
                  <span className="text-yellow-400 font-medium">BNB Smart Chain</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors cursor-pointer">
                  <span className="text-2xl">🔷</span>
                  <span className="text-blue-400 font-medium">Ethereum</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { value: '10K+', label: 'Registered Voters', delay: '0s' },
              { value: '500+', label: 'Elections Held', delay: '0.1s' },
              { value: '99.9%', label: 'Uptime', delay: '0.2s' },
              { value: '0', label: 'Security Breaches', delay: '0.3s' },
            ].map((stat, idx) => (
              <div
                key={idx}
                className="glass rounded-2xl p-6 text-center hover-lift animate-fade-in-up"
                style={{ animationDelay: stat.delay }}
              >
                <p className="text-3xl md:text-4xl font-bold gradient-text mb-2">{stat.value}</p>
                <p className="text-gray-400 text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 animate-fade-in-up">
              Why Choose{' '}
              <span className="gradient-text">NFT Voting?</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              Our platform combines cutting-edge blockchain technology with user-friendly design.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ),
                title: 'NFT-Based Identity',
                description: 'Each verified voter receives a unique NFT that serves as their digital voting credential.',
                color: 'blue',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                ),
                title: 'Cross-Chain Support',
                description: 'Vote on BNB Smart Chain or Ethereum - choose your preferred network.',
                color: 'purple',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                ),
                title: 'Multisig Security',
                description: 'Critical operations require multiple authorizations for maximum security.',
                color: 'cyan',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: 'Real-Time KYC',
                description: 'Live camera verification ensures authentic identity confirmation.',
                color: 'green',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                ),
                title: 'Full Transparency',
                description: 'All votes recorded on blockchain, allowing anyone to verify results.',
                color: 'orange',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                title: 'Area-Based Voting',
                description: 'Voters participate only in elections relevant to their verified area.',
                color: 'pink',
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`glass rounded-2xl p-8 hover-lift hover-glow transition-all duration-300 animate-fade-in-up group`}
                style={{ animationDelay: `${idx * 0.1}s` }}
              >
                <div className={`w-14 h-14 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                  <span className={`text-${feature.color}-400`}>{feature.icon}</span>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{feature.title}</h3>
                <p className="text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
              How It <span className="gradient-text">Works</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">
              Get started with decentralized voting in four simple steps
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
            {/* Connection line */}
            <div className="hidden lg:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-blue-500/50 via-purple-500/50 to-cyan-500/50"></div>

            {[
              {
                num: 1,
                title: 'Sign Up',
                desc: 'Create an account and verify your email address.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                ),
                gradient: 'from-blue-500 to-blue-600'
              },
              {
                num: 2,
                title: 'Complete KYC',
                desc: 'Submit ID and capture your face via live camera.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
                  </svg>
                ),
                gradient: 'from-purple-500 to-purple-600'
              },
              {
                num: 3,
                title: 'Get NFT',
                desc: 'Receive your unique voter NFT on your chosen chain.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h18c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-18c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                  </svg>
                ),
                gradient: 'from-cyan-500 to-cyan-600'
              },
              {
                num: 4,
                title: 'Vote Securely',
                desc: 'Participate in elections with your verified identity.',
                icon: (
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                ),
                gradient: 'from-green-500 to-emerald-600'
              },
            ].map((step, idx) => (
              <div
                key={idx}
                className="text-center animate-fade-in-up relative z-10"
                style={{ animationDelay: `${idx * 0.15}s` }}
              >
                <div className="relative mb-6 inline-block">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.gradient} flex items-center justify-center mx-auto shadow-lg shadow-${step.gradient.split('-')[1]}-500/30 hover:scale-110 transition-all duration-300 text-white`}>
                    {step.icon}
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-4 ring-[#0B0E11]">
                    {step.num}
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-[200px] mx-auto">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-16 sm:py-24 px-0">
          <div className="mx-auto flex max-w-7xl flex-col items-center gap-8 text-center sm:gap-16">
            <div className="flex flex-col items-center gap-4 px-4 sm:gap-6">
              <h2 className="max-w-[720px] text-3xl font-bold text-white leading-tight sm:text-5xl sm:leading-tight">
                Trusted by <span className="gradient-text">Voters</span> Worldwide
              </h2>
              <p className="text-md max-w-[600px] text-gray-400 sm:text-xl">
                Join thousands of voters who trust our blockchain-based voting system for secure and transparent elections.
              </p>
            </div>

            <div className="relative flex w-full flex-col items-center justify-center overflow-hidden">
              <div className="group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] flex-row [--duration:40s]">
                <div className="flex shrink-0 justify-around [gap:var(--gap)] animate-marquee flex-row group-hover:[animation-play-state:paused]">
                  {[...Array(4)].map((_, setIndex) => (
                    [
                      {
                        author: { name: 'Sarah Mitchell', handle: '@sarahm_voter', avatar: 'SM' },
                        text: 'The NFT-based identity verification is brilliant! I felt completely secure knowing my vote was protected by blockchain technology.'
                      },
                      {
                        author: { name: 'James Rodriguez', handle: '@jrod_tech', avatar: 'JR' },
                        text: 'Cross-chain voting support is a game-changer. I could vote using my preferred network without any hassle.'
                      },
                      {
                        author: { name: 'Emily Chen', handle: '@emilyc', avatar: 'EC' },
                        text: 'The KYC process was seamless. Within minutes, I had my voter NFT and was ready to participate in elections.'
                      },
                      {
                        author: { name: 'Michael Brown', handle: '@mikeb_dao', avatar: 'MB' },
                        text: 'Finally, a voting system that combines transparency with privacy. Every vote is verifiable on-chain!'
                      },
                      {
                        author: { name: 'Lisa Wang', handle: '@lisawang', avatar: 'LW' },
                        text: 'The multisig security gives me confidence that elections are conducted fairly. This is the future of voting.'
                      },
                    ].map((testimonial, i) => (
                      <TestimonialCard
                        key={`${setIndex}-${i}`}
                        {...testimonial}
                      />
                    ))
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 bg-gradient-to-r from-[#0B0E11] sm:block" />
              <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-[#0B0E11] sm:block" />
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
              <Link
                href="/signup"
                className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-xl hover:shadow-emerald-500/30 transition-all transform hover:scale-105 hover:-translate-y-0.5"
              >
                Create Free Account
              </Link>
              <Link
                href="/login"
                className="px-10 py-4 bg-white/5 border border-white/20 text-white font-semibold rounded-xl hover:bg-white/10 transition-all hover:border-white/30"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 bg-gradient-to-b from-[#0B0E11] to-[#070809]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">
            {/* Brand */}
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.png"
                  alt="NFT Voting Logo"
                  width={40}
                  height={40}
                  className="rounded-xl"
                />
                <span className="text-xl font-bold text-white">NFT Voting</span>
              </div>
              <p className="text-gray-500 text-sm text-center md:text-left max-w-[280px]">
                Decentralized voting system powered by blockchain technology and NFT-based identity.
              </p>
              <div className="flex items-center gap-2 mt-4">
                <span className="px-2.5 py-1 bg-yellow-500/10 text-yellow-400 text-xs rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  BNB
                </span>
                <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 text-xs rounded-md flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  ETH
                </span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="flex flex-col items-center md:items-center">
              <h4 className="text-white font-semibold mb-4 text-center">Quick Links</h4>
              <div className="flex flex-col gap-2 text-center">
                <Link href="/login" className="text-gray-400 hover:text-white transition-colors text-sm">Login</Link>
                <Link href="/signup" className="text-gray-400 hover:text-white transition-colors text-sm">Sign Up</Link>
                <Link href="#features" className="text-gray-400 hover:text-white transition-colors text-sm">Features</Link>
              </div>
            </div>

            {/* Authors */}
            <div className="flex flex-col items-center md:items-end">
              <h4 className="text-white font-semibold mb-4 text-center md:text-right">Project Authors</h4>
              <div className="flex flex-col gap-3 w-full max-w-[280px]">
                <a
                  href="https://github.com/rayhanalmim"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/10 hover:border-emerald-500/50 hover:shadow-lg hover:shadow-emerald-500/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-emerald-500/50">
                    <Image
                      src="/rayhan.jpeg"
                      alt="Rayhan Al Mim"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Rayhan Al Mim</p>
                    <p className="text-xs text-gray-400">ID: 222015010</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-emerald-400 transition-colors shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://github.com/nasrin1025"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-gradient-to-r from-white/5 to-white/10 rounded-xl border border-white/10 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/10 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 ring-2 ring-purple-500/50">
                    <Image
                      src="/nasrin.jpeg"
                      alt="Nasrin Jahan Fatema"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">Nasrin Jahan Fatema</p>
                    <p className="text-xs text-gray-400">ID: 222015015</p>
                  </div>
                  <svg className="w-5 h-5 text-gray-500 group-hover:text-purple-400 transition-colors shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/5 pt-6">
            <p className="text-gray-600 text-xs text-center">
              © 2025 NFT Voting System. Thesis Project - Green University of Bangladesh
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
