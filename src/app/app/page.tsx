'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { CheckSquare, Clock, FileText, Activity, Flame, CalendarDays, Hourglass, Shield, Mic, Sparkles, LineChart, Menu, X } from 'lucide-react'
import PricingSection from '@/components/PricingSection'
import AppleIcon from '@/components/icons/AppleIcon'
import GooglePlayLogo from '@/components/icons/GooglePlayLogo'

export default function AppLandingPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <div className="dark min-h-screen w-full bg-[#05070F] text-[#F2F5FF] font-ui antialiased selection:bg-[#1951FC] selection:text-white overflow-x-hidden">
            {/* Custom animations styling */}
            <style jsx global>{`
                @keyframes float-desktop {
                    0%, 100% { transform: translateY(0px) rotate(-4deg); }
                    50% { transform: translateY(-12px) rotate(-4deg); }
                }
                @keyframes float-mobile {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-10px); }
                }
                .animate-float-desktop {
                    animation: float-desktop 5s ease-in-out infinite;
                }
                .animate-float-mobile {
                    animation: float-mobile 5s ease-in-out infinite;
                }
            `}</style>

            {/* Navigation Bar */}
            <nav className="w-full bg-[#05070F]/85 border-b border-white/10 sticky top-0 z-50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto h-[60px] md:h-[72px] px-5 md:px-10 flex items-center justify-between relative">
                    {/* Left Group: Mobile Hamburger and Wordmark Logo */}
                    <div className="flex items-center gap-4">
                        {/* Mobile Hamburger Button */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden text-snow hover:text-snow/80 transition-colors p-1"
                            aria-label="Toggle menu"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>

                        {/* Logo Wordmark */}
                        <a href="/" className="flex items-center gap-2.5 text-[17px] font-semibold tracking-[0.04em] text-snow select-none">
                            <span className="h-4 w-[1.5px] bg-[#3781FC]" />
                            <span>Focalyst</span>
                        </a>
                    </div>

                    {/* Centered Navigation Links (Desktop) */}
                    <div className="hidden md:flex items-center gap-[48px]">
                        <a href="#features" className="text-snow/75 hover:text-snow text-[14.5px] font-medium transition-colors">
                            Features
                        </a>
                        <a href="#pricing" className="text-snow/75 hover:text-snow text-[14.5px] font-medium transition-colors">
                            Pricing
                        </a>
                        <a href="#download" className="text-snow/75 hover:text-snow text-[14.5px] font-medium transition-colors">
                            Download
                        </a>
                    </div>

                    {/* Action Button */}
                    <div className="flex items-center">
                        <button 
                            onClick={(e) => {
                                e.preventDefault();
                                const downloadEl = document.getElementById('download');
                                if (downloadEl) {
                                    downloadEl.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                            className="rounded-full border border-snow/80 bg-snow text-[#05070F] hover:bg-snow/90 font-semibold transition-all shadow-[0_4px_16px_rgba(255,255,255,0.18)] active:scale-[0.98] text-[12px] px-4 py-1.5 md:text-[14px] md:px-6 md:py-2.5 cursor-pointer"
                        >
                            <span className="md:hidden">Download</span>
                            <span className="hidden md:block">Get Started Free</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-[60px] left-0 w-full bg-[#05070F]/95 backdrop-blur-2xl border-b border-white/10 flex flex-col px-5 py-4 gap-4 transition-all duration-300 z-50">
                        <a 
                            href="#features" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-snow/75 hover:text-snow text-[16px] font-medium py-2 transition-colors border-b border-white/5"
                        >
                            Features
                        </a>
                        <a 
                            href="#pricing" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-snow/75 hover:text-snow text-[16px] font-medium py-2 transition-colors border-b border-white/5"
                        >
                            Pricing
                        </a>
                        <a 
                            href="#download" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-snow/75 hover:text-snow text-[16px] font-medium py-2 transition-colors"
                        >
                            Download
                        </a>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section 
                style={{ 
                    background: 'radial-gradient(80% 60% at 50% 18%, rgba(25, 81, 252, 0.22) 0%, rgba(11, 44, 177, 0.14) 40%, rgba(3, 25, 91, 0.08) 65%, #05070F 100%)'
                }}
                className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] flex items-center py-12 md:py-20 relative overflow-hidden"
            >
                <div className="max-w-[1280px] mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center relative z-10">
                    
                    {/* Left Column - Content */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 md:gap-8">
                        {/* Eyebrow */}
                        <div className="inline-flex items-center justify-center rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            AI-POWERED PRODUCTIVITY
                        </div>

                        {/* Headline */}
                        <h1 className="font-display text-[46px] md:text-[84px] font-normal leading-[1.02] tracking-[-0.02em] text-snow select-none">
                            Own your <br />
                            <em className="italic text-[#6FA4FF]">time.</em>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-[#A3ADC8] text-[16px] md:text-[18px] leading-relaxed max-w-lg font-normal">
                            Combine Tasks, Notes, Habits, Focus Pomodoro Timer, Distraction Blocker, Voice Notes, Countdown Goals, AI Assistance, and Productivity Analytics into one workspace.
                        </p>

                        {/* Download Buttons Block */}
                        <div className="w-full max-w-sm md:max-w-none flex flex-col items-center md:items-start gap-4">
                            <div className="w-full flex flex-col md:flex-row gap-4">
                                {/* Apple App Store Button */}
                                <a
                                    href="https://apps.apple.com/app/focalyst-ai-productivity-hub/id6774425442"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-[52px] rounded-full border border-snow/80 bg-snow text-[#05070F] hover:bg-snow/90 flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] shadow-[0_8px_24px_rgba(0,0,0,0.3)] px-8 md:px-10 font-semibold"
                                >
                                    <AppleIcon className="w-5 h-5 -translate-y-px text-black flex-shrink-0" />
                                    <span className="text-[14px] md:text-[15px] font-semibold whitespace-nowrap">
                                        Download on App Store
                                    </span>
                                </a>

                                {/* Google Play Store Button */}
                                <a
                                    href="https://play.google.com/store/apps/details?id=online.focalyst"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    aria-label="Get Focalyst on the Play Store"
                                    className="h-[52px] rounded-full border border-snow/60 bg-[#0B1020]/70 text-snow hover:bg-[#0B1020] backdrop-blur-md flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] shadow-[0_8px_24px_rgba(0,0,0,0.25)] px-8 md:px-10 font-semibold"
                                >
                                    <GooglePlayLogo size={20} className="flex-shrink-0" />
                                    <span className="text-[14px] md:text-[15px] font-semibold whitespace-nowrap">
                                        Get it on Play Store
                                    </span>
                                </a>
                            </div>

                            {/* Trust Text */}
                            <p className="w-full text-[#6B7591] text-[12.5px] font-medium text-center md:text-left select-none">
                                Free · No credit card needed
                            </p>
                        </div>
                    </div>

                    {/* Right Column - Device Mockup */}
                    <div className="flex justify-center items-center py-6">
                        <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[350px] animate-float-mobile md:animate-float-desktop drop-shadow-[0_24px_50px_rgba(0,0,0,0.8)]">
                            {/* Screen Image */}
                            <Image 
                                src="/landing/app/plan.jpg" 
                                alt="Focalyst Plan Tab Mockup" 
                                width={827}
                                height={1800}
                                sizes="(min-width: 1024px) 350px, (min-width: 640px) 320px, 280px"
                                className="h-full w-full object-cover object-top select-none rounded-[2.5rem]"
                                priority
                            />
                        </div>
                    </div>

                </div>
            </section>

            {/* Social Proof Bar (Section 2) */}
            <div className="w-full bg-[#0B1020]/60 border-y border-white/5 backdrop-blur-md">
                <div className="h-[90px] md:h-[100px] max-w-[1100px] mx-auto px-[20px] md:px-0 flex items-center justify-between">
                    {/* Stat 1 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-[26px] md:text-[30px] font-bold text-snow leading-none">10K+</span>
                        <span className="text-[11px] md:text-[13px] font-normal text-[#A3ADC8] md:tracking-[0.02em] mt-1 text-center">Active users</span>
                    </div>

                    {/* Divider 1 */}
                    <div className="w-[1px] h-[32px] bg-white/10" />

                    {/* Stat 2 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-[26px] md:text-[30px] font-bold text-snow leading-none">★ 4.9</span>
                        <span className="text-[11px] md:text-[13px] font-normal text-[#A3ADC8] md:tracking-[0.02em] mt-1 text-center">App rating</span>
                    </div>

                    {/* Divider 2 */}
                    <div className="w-[1px] h-[32px] bg-white/10" />

                    {/* Stat 3 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-[26px] md:text-[30px] font-bold text-snow leading-none">Free</span>
                        <span className="text-[11px] md:text-[13px] font-normal text-[#A3ADC8] md:tracking-[0.02em] mt-1 text-center">
                            <span className="block md:hidden">Always</span>
                            <span className="hidden md:block">To get started</span>
                        </span>
                    </div>

                    {/* Divider 3 - Desktop Only */}
                    <div className="hidden md:block w-[1px] h-[32px] bg-white/10" />

                    {/* Stat 4 - Desktop Only */}
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center">
                        <span className="text-[30px] font-bold text-snow leading-none">50+</span>
                        <span className="text-[13px] font-normal text-[#A3ADC8] tracking-[0.02em] mt-1 text-center">Countries</span>
                    </div>

                    {/* Divider 4 - Desktop Only */}
                    <div className="hidden md:block w-[1px] h-[32px] bg-white/10" />

                    {/* Stat 5 - Desktop Only */}
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center">
                        <span className="text-[30px] font-bold text-snow leading-none">#1</span>
                        <span className="text-[13px] font-normal text-[#A3ADC8] tracking-[0.02em] mt-1 text-center">Productivity hub</span>
                    </div>
                </div>
            </div>

            {/* Section 3: Problem Statement (App Fatigue) Component */}
            <section className="w-full bg-[#05070F] py-[60px] md:py-24">
                <div className="max-w-[1100px] mx-auto px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-12 md:gap-16">
                    {/* Left Column - Text Column */}
                    <div className="w-full md:w-[45%] flex flex-col items-center md:items-start text-center md:text-left gap-6">
                        <span className="rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            THE PROBLEM
                        </span>
                        
                        <h2 className="font-display text-[34px] md:text-[54px] font-normal leading-[1.08] text-snow">
                            You&apos;re juggling too many apps.
                        </h2>
                        
                        <p className="text-[#A3ADC8] text-[15.5px] md:text-[17px] leading-[1.7] max-w-[300px] md:max-w-[400px] mx-auto md:mx-0">
                            Todoist for tasks. Forest for focus. Notion for notes. A separate habit tracker. The constant context-switching is fragmenting your attention and killing your deep work.
                        </p>

                        {/* Desktop-Only Pill Tags */}
                        <div className="hidden md:flex items-center gap-2">
                            <span className="bg-white/5 border border-white/10 text-snow/90 text-[12px] font-medium rounded-full px-3.5 py-1.5">
                                App fatigue
                            </span>
                            <span className="bg-white/5 border border-white/10 text-snow/90 text-[12px] font-medium rounded-full px-3.5 py-1.5">
                                Context switching
                            </span>
                            <span className="bg-white/5 border border-white/10 text-snow/90 text-[12px] font-medium rounded-full px-3.5 py-1.5">
                                Lost streaks
                            </span>
                        </div>

                        {/* CTA Button */}
                        <a 
                            href="https://focalyst.online"
                            className="w-full md:w-auto h-[50px] md:h-[46px] rounded-full border border-snow/80 bg-snow text-[#05070F] hover:bg-snow/90 text-[15px] font-semibold px-8 flex items-center justify-center transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.3)] active:scale-[0.98]"
                        >
                            <span className="md:hidden">Meet Focalyst →</span>
                            <span className="hidden md:block">Replace them all →</span>
                        </a>
                    </div>

                    {/* Right Column - 2x2 Visual App Grid */}
                    <div className="w-full md:w-[55%] flex items-center justify-between md:gap-8 mt-4 md:mt-0">
                        {/* 2x2 Grid */}
                        <div className="grid grid-cols-2 gap-4 w-full md:w-[75%]">
                            {/* Card 1: Tasks */}
                            <div className="bg-[#0B1020]/70 border border-white/10 rounded-[20px] p-5 md:p-6 backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#6FA4FF]">
                                    <CheckSquare className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[13px] md:text-[15px] text-snow font-semibold">Tasks app</h4>
                                    <p className="hidden md:block text-[12.5px] text-[#A3ADC8] mt-1">Replaced by Plan tab</p>
                                </div>
                            </div>

                            {/* Card 2: Focus */}
                            <div className="bg-[#0B1020]/70 border border-white/10 rounded-[20px] p-5 md:p-6 backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#6FA4FF]">
                                    <Clock className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[13px] md:text-[15px] text-snow font-semibold">Focus timer</h4>
                                    <p className="hidden md:block text-[12.5px] text-[#A3ADC8] mt-1">Replaced by Focus tab</p>
                                </div>
                            </div>

                            {/* Card 3: Notes */}
                            <div className="bg-[#0B1020]/70 border border-white/10 rounded-[20px] p-5 md:p-6 backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#6FA4FF]">
                                    <FileText className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[13px] md:text-[15px] text-snow font-semibold">Notes app</h4>
                                    <p className="hidden md:block text-[12.5px] text-[#A3ADC8] mt-1">Replaced by Notes tab</p>
                                </div>
                            </div>

                            {/* Card 4: Habit Tracker */}
                            <div className="bg-[#0B1020]/70 border border-white/10 rounded-[20px] p-5 md:p-6 backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#6FA4FF]">
                                    <Activity className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[13px] md:text-[15px] text-snow font-semibold">Habit tracker</h4>
                                    <p className="hidden md:block text-[12.5px] text-[#A3ADC8] mt-1">Replaced by Insights tab</p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Only: Consolidation Graphic */}
                        <div className="hidden md:flex items-center justify-center flex-1 gap-2 max-w-[120px]">
                            {/* Subtle SVG Arrow */}
                            <div className="flex-1 flex items-center justify-center">
                                <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#3781FC]">
                                    <path d="M2 12H40M40 12L32 4M40 12L32 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" className="animate-pulse" />
                                </svg>
                            </div>

                            {/* Focalyst Official Logo */}
                            <img 
                                src="/small-logo.png" 
                                alt="Focalyst Logo" 
                                className="w-16 h-16 rounded-2xl shadow-xl border border-white/15 object-contain flex-shrink-0 bg-[#0B1020]"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: Features Grid Component */}
            <section id="features" className="w-full bg-[#05070F] px-8 py-14 md:py-[100px] border-t border-white/10">
                <div className="max-w-[1160px] mx-auto flex flex-col gap-12 md:gap-16">
                    {/* Header Group */}
                    <div className="flex flex-col items-center gap-3 md:gap-4 text-center">
                        <span className="rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            NINE TOOLS. ONE WORKSPACE.
                        </span>
                        <h2 className="font-display text-[34px] md:text-[58px] font-normal leading-tight text-snow max-w-[800px]">
                            Everything you need.<br className="md:hidden" /> Nothing you don&apos;t.
                        </h2>
                        <p className="hidden md:block text-[#A3ADC8] text-[17.5px] leading-relaxed max-w-[600px] mt-2">
                            Stop switching between nine different apps. Focalyst brings your entire productivity stack into one unified flow.
                        </p>
                    </div>

                    {/* Responsive Grid Architecture */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-[14px] md:gap-[24px]">
                        {/* 1. Tasks */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <CheckSquare className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Tasks
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Priority sorting
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Organize with drag-to-reorder priority.
                                </p>
                            </div>
                        </div>

                        {/* 2. Habits */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <Flame className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Habits
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Daily streaks
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Build routines with daily streaks, and stay consistent with friends in accountability groups.
                                </p>
                            </div>
                        </div>

                        {/* 3. Countdowns */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <CalendarDays className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Countdowns
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Track deadlines
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Track days remaining for big deadlines.
                                </p>
                            </div>
                        </div>

                        {/* 4. Focus Timer */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <Hourglass className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Focus Timer
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Pomodoro presets
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Pomodoro and custom deep work sessions.
                                </p>
                            </div>
                        </div>

                        {/* 5. App Blocker */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <Shield className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    App Blocker
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Stop distractions
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Block distracting apps while you work.
                                </p>
                            </div>
                        </div>

                        {/* 6. Notes */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <FileText className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Notes
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Clean editor
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Distraction-free text editor for your thoughts.
                                </p>
                            </div>
                        </div>

                        {/* 7. Voice Notes */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <Mic className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Voice Notes
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Auto-transcribe
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Record and instantly transcribe ideas.
                                </p>
                            </div>
                        </div>

                        {/* 8. AI Assistant */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <Sparkles className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    AI Assistant
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    AI-powered co-pilot
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Chat with your AI-powered co-pilot.
                                </p>
                            </div>
                        </div>

                        {/* 9. Analytics */}
                        <div className="bg-[#0B1020]/70 rounded-[20px] border border-white/10 p-5 md:p-7 md:min-h-[180px] backdrop-blur-xl shadow-[0_12px_40px_-15px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:border-[#3781FC]/40 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4 col-span-2 md:col-span-1">
                            <div className="w-[36px] h-[36px] rounded-xl bg-[#1951FC]/15 flex items-center justify-center">
                                <LineChart className="w-5 h-5 text-[#6FA4FF]" />
                            </div>
                            <div>
                                <h3 className="text-snow text-[14px] md:text-[18px] font-semibold">
                                    Analytics
                                </h3>
                                <p className="text-[#A3ADC8] text-[11.5px] md:hidden mt-1">
                                    Weekly reports &amp; insights
                                </p>
                                <p className="text-[#A3ADC8] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Weekly reports on your strengths &amp; weaknesses.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 md:mt-8 flex flex-col items-center justify-center">
                        {/* Mobile CTA */}
                        <a 
                            href="https://focalyst.online"
                            className="md:hidden w-full h-[52px] rounded-full border border-snow/80 bg-snow text-[#05070F] text-[15px] font-semibold flex items-center justify-center transition-all duration-300 active:scale-[0.98] shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
                        >
                            Try Focalyst Free
                        </a>
                        
                        {/* Desktop CTA */}
                        <div className="hidden md:flex flex-col items-center gap-4">
                            <p className="text-[#A3ADC8] text-[15px] font-normal">
                                Start for free. No credit card required.
                            </p>
                            <a 
                                href="https://focalyst.online"
                                className="h-[48px] rounded-full border border-snow/80 bg-snow hover:bg-snow/90 text-[#05070F] text-[15px] font-semibold px-8 flex items-center justify-center transition-all duration-300 shadow-[0_8px_24px_rgba(0,0,0,0.3)] active:scale-[0.98]"
                            >
                                Download Focalyst &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: Planning Cluster */}
            <section className="w-full bg-[#05070F] px-8 py-14 md:py-[100px] border-t border-white/10">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        {/* Pill tag */}
                        <div className="rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            PLANNING
                        </div>
                        
                        {/* Headline */}
                        <h2 className="font-display text-[30px] md:text-[50px] font-normal leading-[1.12] text-snow mt-[14px]">
                            Command your day.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#A3ADC8] text-[15.5px] md:text-[16.5px] leading-[1.7] font-normal mt-[16px] max-w-[420px]">
                            Your entire life, perfectly organized. Manage daily tasks, build unbreakable habit streaks, and track your biggest deadlines with visual countdown goals, all in one elegant dashboard.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-[24px] text-left items-start">
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#3781FC] flex-shrink-0 mt-[7px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Tasks: Drag-and-drop priority sorting
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#3781FC] flex-shrink-0 mt-[7px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Habits: Track daily streaks and progress
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#3781FC] flex-shrink-0 mt-[7px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Accountability groups with a live streak podium
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#3781FC] flex-shrink-0 mt-[7px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Countdowns: Visual trackers for upcoming goals
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Overlapping Composition */}
                    <div className="flex justify-center items-center py-6 md:py-0">
                        <div className="relative w-full h-[550px] md:h-[650px] mt-12 md:mt-0 max-w-md md:max-w-none mx-auto">
                            {/* Front Image */}
                            <img 
                                src="/focus-tab.png" 
                                alt="Focalyst Focus Tab Mockup" 
                                className="absolute top-0 left-0 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-20 drop-shadow-[0_24px_50px_rgba(0,0,0,0.8)] rounded-[2.5rem] select-none"
                            />
                            {/* Back Image */}
                            <Image 
                                src="/landing/app/plan.jpg" 
                                alt="Focalyst Plan Tab Mockup" 
                                width={827}
                                height={1800}
                                sizes="(min-width: 1024px) 360px, 75vw"
                                className="absolute top-32 right-0 md:top-24 md:-right-10 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] h-full object-cover object-top z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] rounded-[2.5rem] select-none"
                            />
                        </div>
                    </div>

                </div>
            </section>

            {/* Section 6: Deep Work Cluster */}
            <section className="w-full bg-[#05070F] px-8 py-14 md:py-[100px] border-t border-white/10">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Visual Column */}
                    <div className="flex justify-center items-center py-6 md:py-0 order-2 md:order-1">
                        <div className="relative max-w-[280px] sm:max-w-[320px] md:max-w-[350px] w-full">
                            <Image 
                                src="/landing/app/pomodoro.jpg" 
                                alt="Focalyst Pomodoro Mockup" 
                                width={827}
                                height={1800}
                                sizes="(min-width: 1024px) 350px, (min-width: 640px) 320px, 280px"
                                className="h-full w-full object-cover object-top select-none drop-shadow-[0_24px_50px_rgba(0,0,0,0.8)] rounded-[2.5rem]"
                            />
                            {/* The Floating Shield Badge */}
                            <div className="absolute bottom-10 right-0 md:-right-4 bg-[#0B1020]/80 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-2.5 z-30 select-none">
                                <Shield className="w-5 h-5 text-[#6FA4FF] fill-[#1951FC]/40" />
                                <span className="text-snow text-[13px] font-semibold">
                                    Distractions Blocked
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left order-1 md:order-2">
                        {/* Pill tag */}
                        <div className="rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            DEEP WORK
                        </div>
                        
                        {/* Headline */}
                        <h2 className="font-display text-[30px] md:text-[50px] font-normal leading-[1.12] text-snow mt-[14px]">
                            Zero distractions. Pure focus.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#A3ADC8] text-[15.5px] md:text-[16.5px] leading-[1.7] font-normal mt-[16px] max-w-[420px]">
                            Stop letting notifications break your flow. Set a Pomodoro timer and let Focalyst automatically block your biggest digital distractions until the work is actually done.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-[24px] text-left items-start w-full md:w-auto">
                            <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Preloaded &amp; custom Pomodoro sessions
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    System-level distraction app blocker
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Session break &amp; interval management
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Section 7: Capture Cluster */}
            <section className="w-full bg-[#05070F] px-8 py-14 md:py-24 border-t border-white/10">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        {/* Pill tag */}
                        <div className="rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            CAPTURE
                        </div>
                        
                        {/* Headline */}
                        <h2 className="font-display text-[30px] md:text-[50px] font-normal leading-[1.12] text-snow mt-3">
                            Think out loud.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#A3ADC8] text-[15.5px] md:text-[16.5px] leading-[1.7] font-normal mt-4 max-w-[420px]">
                            Never lose a fleeting idea again. Use the minimalist editor for deep writing, or tap the mic to record voice notes that Focalyst instantly transcribes and organizes for you.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-6 text-left items-start">
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0 mt-[8px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Minimalist, block-based text editor
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0 mt-[8px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Instant voice-to-text transcription
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0 mt-[8px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Folder and tag organization
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Overlapping Composition */}
                    <div className="flex justify-center items-center py-6 md:py-0">
                        <div className="relative w-full h-[550px] md:h-[650px] mt-12 md:mt-0 max-w-md md:max-w-none mx-auto">
                            {/* Image 1 (Back) */}
                            <img 
                                src="/notes-tab.png" 
                                alt="Focalyst Notes Tab Mockup" 
                                className="absolute top-0 left-0 md:left-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] rounded-[2.5rem] select-none"
                            />
                            {/* Image 2 (Front) */}
                            <Image 
                                src="/landing/app/voice-ui.jpg" 
                                alt="Focalyst Voice Note Mockup" 
                                width={827}
                                height={1800}
                                sizes="(min-width: 1024px) 360px, 75vw"
                                className="absolute top-32 right-0 md:top-24 md:right-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] h-full object-cover object-top z-20 drop-shadow-[0_24px_50px_rgba(0,0,0,0.8)] rounded-[2.5rem] select-none"
                            />
                        </div>
                    </div>

                </div>
            </section>

            {/* Section 8: AI & Analytics */}
            <section className="w-full bg-[#05070F] px-8 py-16 md:py-32 border-t border-white/10">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Visual Column */}
                    <div className="flex justify-center items-center py-6 md:py-0 order-2 md:order-1">
                        <div className="relative w-full h-[550px] md:h-[650px] mt-12 md:mt-0 max-w-md md:max-w-none mx-auto">
                            {/* Image 1 (Back) */}
                            <img 
                                src="/insights-tab.png" 
                                alt="Focalyst Insights Tab Mockup" 
                                className="absolute top-0 left-0 md:left-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-10 drop-shadow-[0_20px_40px_rgba(0,0,0,0.7)] rounded-[2.5rem] select-none"
                            />
                            {/* Image 2 (Front) */}
                            <Image 
                                src="/landing/app/ai-chat-ui.jpg" 
                                alt="Focalyst AI Chat Mockup" 
                                width={827}
                                height={1800}
                                sizes="(min-width: 1024px) 360px, 75vw"
                                className="absolute top-32 right-0 md:top-24 md:right-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] h-full object-cover object-top z-20 drop-shadow-[0_24px_50px_rgba(0,0,0,0.8)] rounded-[2.5rem] select-none"
                            />
                        </div>
                    </div>

                    {/* Right Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left order-1 md:order-2">
                        {/* Pill tag */}
                        <div className="rounded-full border border-[#3781FC]/30 bg-[#1951FC]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6FA4FF]">
                            AI &amp; INSIGHTS
                        </div>
                        
                        {/* Headline */}
                        <h2 className="font-display text-[30px] md:text-[50px] font-normal leading-[1.12] text-snow mt-3">
                            Work smarter, not harder.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#A3ADC8] text-[15.5px] md:text-[16.5px] leading-[1.7] font-normal mt-4 max-w-[420px]">
                            Your Focalyst AI assistant helps you manage tasks effortlessly. Pair that with rich weekly productivity analytics that show exactly when you work best, where you get distracted and how to improve.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-6 text-left items-start">
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0 mt-[8px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Conversational AI task management
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0 mt-[8px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Weekly strengths &amp; weaknesses report
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#3781FC] flex-shrink-0 mt-[8px]" />
                                <span className="text-snow text-[14px] md:text-[15px] font-medium leading-tight">
                                    Visual focus heatmaps &amp; scoring
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </section>
            
            {/* Section 9: Pricing Section */}
            <PricingSection />

            {/* Section 10: Final CTA & Footer Component */}
            <section id="download" className="w-full bg-[#05070F] py-[64px] md:py-[120px] px-8 md:px-0 border-t border-white/10">
                <div className="max-w-[1000px] mx-auto flex flex-col items-center text-center">
                    {/* Wordmark */}
                    <span className="text-snow font-bold select-none text-[22px] tracking-[0.12em] md:text-[18px] md:tracking-[0.14em]">
                        FOCALYST
                    </span>

                    {/* Headline */}
                    <h2 className="font-display text-snow font-normal leading-none select-none mt-4 text-[48px] md:text-[88px]">
                        Own your time<span className="text-[#3781FC]">.</span>
                    </h2>

                    {/* Subheadline */}
                    <p className="font-normal mt-4 md:mt-5 text-[#A3ADC8] text-[15px] md:text-[20px]">
                        <span className="md:hidden">Start free. No credit card. Download in seconds.</span>
                        <span className="hidden md:block">Start free. Download in 30 seconds. No credit card required.</span>
                    </p>

                    {/* App Download Buttons */}
                    <div className="w-full max-w-sm md:max-w-none mt-8 flex flex-col md:flex-row md:justify-center items-center gap-3 md:gap-4">
                        {/* Apple Store Button */}
                        <a
                            href="https://apps.apple.com/app/focalyst-ai-productivity-hub/id6774425442"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-[52px] w-full md:w-auto rounded-full border border-snow/80 bg-snow text-[#05070F] hover:bg-snow/90 px-[28px] flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] shadow-[0_8px_24px_rgba(0,0,0,0.3)] font-semibold"
                        >
                            <AppleIcon className="w-5 h-5 -translate-y-px text-black flex-shrink-0" />
                            <span className="text-[14px] md:text-[15px] font-semibold whitespace-nowrap">
                                <span className="md:hidden">Download on App Store</span>
                                <span className="hidden md:block">App Store</span>
                            </span>
                        </a>

                        {/* Google Play Button */}
                        <a
                            href="https://play.google.com/store/apps/details?id=online.focalyst"
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Get Focalyst on the Play Store"
                            className="h-[52px] w-full md:w-auto rounded-full border border-snow/60 bg-[#0B1020]/70 text-snow hover:bg-[#0B1020] backdrop-blur-md px-[28px] flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] shadow-[0_8px_24px_rgba(0,0,0,0.25)] font-semibold"
                        >
                            <GooglePlayLogo className="w-5.5 h-5.5 flex-shrink-0" />
                            <span className="text-[14px] md:text-[15px] font-semibold whitespace-nowrap">
                                <span className="md:hidden">Get it on Play Store</span>
                                <span className="hidden md:block">Play Store</span>
                            </span>
                        </a>
                    </div>

                    {/* Trust Row */}
                    <p className="text-center mt-6 md:mt-10 select-none text-[12px] md:text-[14px] text-[#6B7591]">
                        <span className="md:hidden">Free plan included · No credit card · Cancel anytime</span>
                        <span className="hidden md:block">Free plan included · No credit card needed · Cancel anytime</span>
                    </p>

                    {/* Desktop Divider */}
                    <hr className="hidden md:block w-full max-w-[800px] h-[1px] bg-white/10 border-0 mt-14 mx-auto" />

                    {/* Footer Info & Links */}
                    <div className="w-full">
                        {/* Mobile Layout */}
                        <div className="block md:hidden mt-12 flex flex-col items-center">
                            <a href="mailto:contactfocalyst@gmail.com" className="text-snow/80 text-[13px] font-medium hover:underline">
                                contactfocalyst@gmail.com
                            </a>
                            
                            <div className="flex items-center gap-6 mt-4">
                                <a href="https://x.com/focalystapp?s=11" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </a>
                                <a href="https://www.instagram.com/focalyst.online" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                                    </svg>
                                </a>
                            </div>
                            
                            <div className="mt-8 flex flex-col items-center gap-1.5">
                                <span className="text-[#A3ADC8] text-[11px] font-medium">
                                    Built by Chintan
                                </span>
                                <span className="text-[#6B7591] text-[11px]">
                                    Privacy · Terms
                                </span>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:block w-full max-w-[800px] mx-auto">
                            {/* Pre-Footer Row */}
                            <div className="flex items-center justify-between mt-8">
                                <a href="mailto:contactfocalyst@gmail.com" className="text-snow/80 text-[14px] font-medium hover:underline">
                                    contactfocalyst@gmail.com
                                </a>
                                
                                <div className="flex items-center gap-6">
                                    <a href="https://x.com/focalystapp?s=11" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                        </svg>
                                    </a>
                                    <a href="https://www.instagram.com/focalyst.online" target="_blank" rel="noopener noreferrer" className="text-white/50 hover:text-white transition-colors">
                                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                                        </svg>
                                    </a>
                                </div>
                            </div>

                            {/* Footer Row */}
                            <div className="flex items-center justify-between mt-6">
                                <span className="text-[#6B7591] text-[13px]">
                                    © 2026 Focalyst
                                </span>
                                <span className="text-[#A3ADC8] text-[13px]">
                                    Built by Chintan
                                </span>
                                <span className="text-[#6B7591] text-[13px]">
                                    Privacy · Terms
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    )
}
