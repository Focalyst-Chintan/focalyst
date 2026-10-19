'use client'

import React, { useState } from 'react'
import { CheckSquare, Clock, FileText, Activity, Flame, CalendarDays, Hourglass, Shield, Mic, Sparkles, LineChart, Menu } from 'lucide-react'
import PricingSection from '@/components/PricingSection'

export default function AppLandingPage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    return (
        <div className="min-h-screen font-sans antialiased text-[#2C4259] bg-[#f9fbfc]">
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
            <nav className="w-full bg-[#1c2e4a] border-b border-white/10 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto h-[60px] md:h-[72px] px-5 md:px-10 flex items-center justify-between relative">
                    {/* Left Group: Mobile Hamburger and Wordmark Logo */}
                    <div className="flex items-center gap-4">
                        {/* Mobile Hamburger Button */}
                        <button 
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden text-white hover:text-white/80 transition-colors p-1"
                            aria-label="Toggle menu"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Logo Wordmark */}
                        <span className="text-white text-[16px] font-bold tracking-[0.08em] select-none">
                            FOCALYST
                        </span>
                    </div>

                    {/* Centered Navigation Links (Desktop) */}
                    <div className="hidden md:flex items-center gap-[48px]">
                        <a href="#features" className="text-white/70 hover:text-white text-[15px] font-medium transition-colors">
                            Features
                        </a>
                        <a href="#pricing" className="text-white/70 hover:text-white text-[15px] font-medium transition-colors">
                            Pricing
                        </a>
                        <a href="#download" className="text-white/70 hover:text-white text-[15px] font-medium transition-colors">
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
                            className="bg-[#ed6c4c] hover:bg-[#e05f3f] text-white rounded-full transition-all duration-300 shadow-md shadow-black/10 active:scale-[0.98] font-medium text-[12px] px-4 py-1.5 md:text-[15px] md:px-6 md:py-2.5"
                        >
                            <span className="md:hidden">Download</span>
                            <span className="hidden md:block">Get Started Free</span>
                        </button>
                    </div>
                </div>

                {/* Mobile Dropdown Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden absolute top-[60px] left-0 w-full bg-[#1c2e4a] border-b border-white/10 flex flex-col px-5 py-4 gap-4 transition-all duration-300 z-50">
                        <a 
                            href="#features" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-white/70 hover:text-white text-[16px] font-medium py-2 transition-colors border-b border-white/5"
                        >
                            Features
                        </a>
                        <a 
                            href="#pricing" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-white/70 hover:text-white text-[16px] font-medium py-2 transition-colors border-b border-white/5"
                        >
                            Pricing
                        </a>
                        <a 
                            href="#download" 
                            onClick={() => setIsMobileMenuOpen(false)}
                            className="text-white/70 hover:text-white text-[16px] font-medium py-2 transition-colors"
                        >
                            Download
                        </a>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section 
                style={{ 
                    background: 'linear-gradient(to bottom, #1c2e4a 0%, #1c2e4a 65%, #f9fbfc 100%)'
                }}
                className="w-full min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-72px)] flex items-center py-12 md:py-20"
            >
                <div className="max-w-[1280px] mx-auto px-6 w-full grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Content */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6 md:gap-8">
                        {/* Eyebrow */}
                        <div className="flex items-center gap-4 w-full max-w-md md:max-w-none">
                            <div className="h-[1px] flex-1 bg-[#cad6e4]/40" />
                            <span className="text-[#cad6e4] text-[12px] font-bold tracking-[0.18em] whitespace-nowrap">
                                AI-POWERED PRODUCTIVITY
                            </span>
                            <div className="h-[1px] flex-1 bg-[#cad6e4]/40" />
                        </div>

                        {/* Headline */}
                        <h1 className="text-[44px] md:text-[80px] font-black leading-[1.0] text-white tracking-tight select-none">
                            Own your <br />
                            <span className="text-[#ed6c4c]">time.</span>
                        </h1>

                        {/* Subheadline */}
                        <p className="text-white/65 text-[16px] md:text-[18px] leading-relaxed max-w-lg font-medium">
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
                                    className="h-[52px] bg-white hover:bg-white/95 text-[#1c2e4a] flex items-center justify-center gap-3 rounded-xl md:rounded-full transition-all duration-300 border border-white active:scale-[0.98] shadow-lg shadow-black/10 px-8 md:px-10"
                                >
                                    {/* Apple Logo SVG */}
                                    <svg className="w-5.5 h-5.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.82M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.99.08 2.16-.52 2.82-1.33z" />
                                    </svg>
                                    <span className="text-[14px] md:text-[15px] font-medium whitespace-nowrap">
                                        Download on the App Store
                                    </span>
                                </a>

                                {/* Google Play Store Button */}
                                <a
                                    href="https://play.google.com/store/apps/details?id=online.focalyst"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-[52px] bg-transparent hover:bg-white/5 text-white flex items-center justify-center gap-3 rounded-xl md:rounded-full transition-all duration-300 border-[1.5px] border-white active:scale-[0.98] px-8 md:px-10"
                                >
                                    {/* Google Play Logo SVG */}
                                    <svg className="w-5.5 h-5.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                        <path d="M3 5.27v13.46c0 .87.72 1.42 1.47 1.05l14.4-7.2c.75-.38.75-1.46 0-1.83L4.47 4.22c-.75-.37-1.47.18-1.47 1.05z" />
                                    </svg>
                                    <span className="text-[14px] md:text-[15px] font-medium whitespace-nowrap">
                                        Get it on Google Play
                                    </span>
                                </a>
                            </div>

                            {/* Trust Text */}
                            <p className="w-full text-[#cad6e4]/60 text-[12px] font-semibold text-center md:text-left select-none">
                                Free · No credit card needed
                            </p>
                        </div>
                    </div>

                    {/* Right Column - Device Mockup */}
                    <div className="flex justify-center items-center py-6">
                        <div className="relative w-full max-w-[280px] sm:max-w-[320px] md:max-w-[350px] animate-float-mobile md:animate-float-desktop drop-shadow-2xl">
                            {/* Screen Image */}
                            <img 
                                src="/plan-tab.png" 
                                alt="Focalyst Plan Tab Mockup" 
                                className="w-full h-auto object-contain select-none"
                            />
                        </div>
                    </div>

                </div>
            </section>

            {/* Social Proof Bar (Section 2) */}
            <div className="w-full bg-[#f9fbfc]">
                <div className="h-[90px] md:h-[100px] max-w-[1100px] mx-auto px-[20px] md:px-0 flex items-center justify-between">
                    {/* Stat 1 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-[26px] md:text-[30px] font-bold text-[#1c2e4a] leading-none">10K+</span>
                        <span className="text-[11px] md:text-[13px] font-normal text-[#4a6c8c] md:tracking-[0.02em] mt-1 text-center">Active users</span>
                    </div>

                    {/* Divider 1 */}
                    <div className="w-[1px] h-[32px] bg-[#cad6e4] opacity-100 md:opacity-60" />

                    {/* Stat 2 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-[26px] md:text-[30px] font-bold text-[#1c2e4a] leading-none">★ 4.9</span>
                        <span className="text-[11px] md:text-[13px] font-normal text-[#4a6c8c] md:tracking-[0.02em] mt-1 text-center">App rating</span>
                    </div>

                    {/* Divider 2 */}
                    <div className="w-[1px] h-[32px] bg-[#cad6e4] opacity-100 md:opacity-60" />

                    {/* Stat 3 */}
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-[26px] md:text-[30px] font-bold text-[#1c2e4a] leading-none">Free</span>
                        <span className="text-[11px] md:text-[13px] font-normal text-[#4a6c8c] md:tracking-[0.02em] mt-1 text-center">
                            <span className="block md:hidden">Always</span>
                            <span className="hidden md:block">To get started</span>
                        </span>
                    </div>

                    {/* Divider 3 - Desktop Only */}
                    <div className="hidden md:block w-[1px] h-[32px] bg-[#cad6e4] opacity-60" />

                    {/* Stat 4 - Desktop Only */}
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center">
                        <span className="text-[30px] font-bold text-[#1c2e4a] leading-none">50+</span>
                        <span className="text-[13px] font-normal text-[#4a6c8c] tracking-[0.02em] mt-1 text-center">Countries</span>
                    </div>

                    {/* Divider 4 - Desktop Only */}
                    <div className="hidden md:block w-[1px] h-[32px] bg-[#cad6e4] opacity-60" />

                    {/* Stat 5 - Desktop Only */}
                    <div className="hidden md:flex flex-1 flex-col items-center justify-center">
                        <span className="text-[30px] font-bold text-[#1c2e4a] leading-none">#1</span>
                        <span className="text-[13px] font-normal text-[#4a6c8c] tracking-[0.02em] mt-1 text-center">Productivity hub</span>
                    </div>
                </div>
            </div>

            {/* Section 3: Problem Statement (App Fatigue) Component */}
            <section className="w-full bg-[#f9fbfc]">
                <div className="max-w-[1100px] mx-auto px-8 py-[60px] md:py-20 flex flex-col md:flex-row md:items-center md:justify-between gap-12 md:gap-16">
                    {/* Left Column - Text Column */}
                    <div className="w-full md:w-[45%] flex flex-col items-center md:items-start text-center md:text-left gap-6">
                        <span className="text-[#4a6c8c] text-[12px] tracking-[0.18em] uppercase font-bold">
                            THE PROBLEM
                        </span>
                        
                        <h2 className="text-[#1c2e4a] text-[36px] md:text-[56px] font-bold leading-[1.1]">
                            You're juggling too many apps.
                        </h2>
                        
                        <p className="text-[#4a6c8c] text-[16px] md:text-[17px] leading-[1.7] max-w-[300px] md:max-w-[380px] mx-auto md:mx-0">
                            Todoist for tasks. Forest for focus. Notion for notes. A separate habit tracker. The constant context-switching is fragmenting your attention and killing your deep work.
                        </p>

                        {/* Desktop-Only Pill Tags */}
                        <div className="hidden md:flex items-center gap-2">
                            <span className="bg-[#cad6e4]/40 text-[#1c2e4a] text-[12px] font-medium rounded-full px-3 py-1.5">
                                App fatigue
                            </span>
                            <span className="bg-[#cad6e4]/40 text-[#1c2e4a] text-[12px] font-medium rounded-full px-3 py-1.5">
                                Context switching
                            </span>
                            <span className="bg-[#cad6e4]/40 text-[#1c2e4a] text-[12px] font-medium rounded-full px-3 py-1.5">
                                Lost streaks
                            </span>
                        </div>

                        {/* CTA Button */}
                        <a 
                            href="https://focalyst.online"
                            className="w-full md:w-auto h-[52px] md:h-[48px] bg-[#ed6c4c] hover:bg-[#e05f3f] text-white text-[16px] md:text-[15px] font-medium rounded-xl md:rounded-full px-8 flex items-center justify-center transition-all duration-300 shadow-md shadow-black/10 active:scale-[0.98]"
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
                            <div className="bg-[#cad6e4]/30 md:bg-white border-0 md:border md:border-[#cad6e4] rounded-2xl md:rounded-[12px] p-5 md:p-6 flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#1c2e4a] md:text-[#ed6c4c]">
                                    <CheckSquare className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[12px] md:text-[14px] text-[#1c2e4a] font-bold">Tasks app</h4>
                                    <p className="hidden md:block text-[12px] text-[#4a6c8c] mt-1">Replaced by Plan tab</p>
                                </div>
                            </div>

                            {/* Card 2: Focus */}
                            <div className="bg-[#cad6e4]/30 md:bg-white border-0 md:border md:border-[#cad6e4] rounded-2xl md:rounded-[12px] p-5 md:p-6 flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#1c2e4a] md:text-[#ed6c4c]">
                                    <Clock className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[12px] md:text-[14px] text-[#1c2e4a] font-bold">Focus timer</h4>
                                    <p className="hidden md:block text-[12px] text-[#4a6c8c] mt-1">Replaced by Focus tab</p>
                                </div>
                            </div>

                            {/* Card 3: Notes */}
                            <div className="bg-[#cad6e4]/30 md:bg-white border-0 md:border md:border-[#cad6e4] rounded-2xl md:rounded-[12px] p-5 md:p-6 flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#1c2e4a] md:text-[#ed6c4c]">
                                    <FileText className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[12px] md:text-[14px] text-[#1c2e4a] font-bold">Notes app</h4>
                                    <p className="hidden md:block text-[12px] text-[#4a6c8c] mt-1">Replaced by Notes tab</p>
                                </div>
                            </div>

                            {/* Card 4: Habit Tracker */}
                            <div className="bg-[#cad6e4]/30 md:bg-white border-0 md:border md:border-[#cad6e4] rounded-2xl md:rounded-[12px] p-5 md:p-6 flex flex-col items-center md:items-start text-center md:text-left gap-3 md:gap-4 justify-center md:justify-start">
                                <div className="text-[#1c2e4a] md:text-[#ed6c4c]">
                                    <Activity className="w-6 h-6 md:w-7 md:h-7" />
                                </div>
                                <div>
                                    <h4 className="text-[12px] md:text-[14px] text-[#1c2e4a] font-bold">Habit tracker</h4>
                                    <p className="hidden md:block text-[12px] text-[#4a6c8c] mt-1">Replaced by Insights tab</p>
                                </div>
                            </div>
                        </div>

                        {/* Desktop Only: Consolidation Graphic */}
                        <div className="hidden md:flex items-center justify-center flex-1 gap-2 max-w-[120px]">
                            {/* Subtle SVG Arrow */}
                            <div className="flex-1 flex items-center justify-center">
                                <svg width="48" height="24" viewBox="0 0 48 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#cad6e4]">
                                    <path d="M2 12H40M40 12L32 4M40 12L32 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="4 4" className="animate-pulse" />
                                </svg>
                            </div>

                            {/* Focalyst Official Logo */}
                            <img 
                                src="/small-logo.png" 
                                alt="Focalyst Logo" 
                                className="w-16 h-16 rounded-2xl shadow-lg border border-[#cad6e4]/30 object-contain flex-shrink-0"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 4: Features Grid Component */}
            <section id="features" className="w-full bg-[#f9fbfc] px-8 py-12 md:py-[100px] border-t border-[#cad6e4]/30">
                <div className="max-w-[1160px] mx-auto flex flex-col gap-12 md:gap-16">
                    {/* Header Group */}
                    <div className="flex flex-col items-center gap-3 md:gap-4 text-center">
                        <span className="text-[#4a6c8c] text-[11px] md:text-[12px] tracking-[0.18em] uppercase font-bold">
                            NINE TOOLS. ONE WORKSPACE.
                        </span>
                        <h2 className="text-[#1c2e4a] text-[34px] md:text-[60px] font-bold leading-tight max-w-[800px]">
                            Everything you need.<br className="md:hidden" /> Nothing you don't.
                        </h2>
                        <p className="hidden md:block text-[#4a6c8c] text-[18px] leading-relaxed max-w-[600px] mt-2">
                            Stop switching between nine different apps. Focalyst brings your entire productivity stack into one unified flow.
                        </p>
                    </div>

                    {/* Responsive Grid Architecture */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-[12px] md:gap-[24px]">
                        {/* 1. Tasks */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <CheckSquare className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Tasks
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Priority sorting
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Organize with drag-to-reorder priority.
                                </p>
                            </div>
                        </div>

                        {/* 2. Habits */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <Flame className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Habits
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Daily streaks
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Build routines with daily streak tracking.
                                </p>
                            </div>
                        </div>

                        {/* 3. Countdowns */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <CalendarDays className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Countdowns
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Track deadlines
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Track days remaining for big deadlines.
                                </p>
                            </div>
                        </div>

                        {/* 4. Focus Timer */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <Hourglass className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Focus Timer
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Pomodoro presets
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Pomodoro and custom deep work sessions.
                                </p>
                            </div>
                        </div>

                        {/* 5. App Blocker */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <Shield className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    App Blocker
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Stop distractions
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Block distracting apps while you work.
                                </p>
                            </div>
                        </div>

                        {/* 6. Notes */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <FileText className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Notes
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Clean editor
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Distraction-free text editor for your thoughts.
                                </p>
                            </div>
                        </div>

                        {/* 7. Voice Notes */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <Mic className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Voice Notes
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Auto-transcribe
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Record and instantly transcribe ideas.
                                </p>
                            </div>
                        </div>

                        {/* 8. AI Assistant */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <Sparkles className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    AI Assistant
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Gemini powered
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Chat with your Gemini-powered co-pilot.
                                </p>
                            </div>
                        </div>

                        {/* 9. Analytics */}
                        <div className="bg-white rounded-xl md:rounded-2xl border border-[#cad6e4]/40 p-4 md:p-7 md:min-h-[180px] hover:-translate-y-1 hover:shadow-lg hover:bg-[#cad6e4]/10 transition-all duration-300 flex flex-col items-start gap-3 md:gap-4 col-span-2 md:col-span-1">
                            <div className="flex items-center justify-center">
                                <div className="md:w-[36px] md:h-[36px] md:rounded-lg md:bg-[#ed6c4c]/5 md:flex md:items-center md:justify-center">
                                    <LineChart className="w-6 h-6 md:w-5 md:h-5 text-[#ed6c4c]" />
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[#1c2e4a] text-[14px] md:text-[18px] font-bold">
                                    Analytics
                                </h3>
                                <p className="text-[#4a6c8c] text-[11px] md:hidden mt-1">
                                    Weekly reports & insights
                                </p>
                                <p className="text-[#4a6c8c] hidden md:block text-[14px] leading-relaxed mt-1.5">
                                    Weekly reports on your strengths & weaknesses.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom CTA */}
                    <div className="mt-4 md:mt-8 flex flex-col items-center justify-center">
                        {/* Mobile CTA */}
                        <a 
                            href="https://focalyst.online"
                            className="md:hidden w-full h-[52px] bg-[#ed6c4c] text-white text-[16px] font-medium rounded-xl flex items-center justify-center transition-all duration-300 active:scale-[0.98]"
                        >
                            Try Focalyst Free
                        </a>
                        
                        {/* Desktop CTA */}
                        <div className="hidden md:flex flex-col items-center gap-4">
                            <p className="text-[#4a6c8c] text-[15px] font-normal">
                                Start for free. No credit card required.
                            </p>
                            <a 
                                href="https://focalyst.online"
                                className="h-[48px] bg-[#ed6c4c] hover:bg-[#e05f3f] text-white text-[15px] font-medium rounded-full px-8 flex items-center justify-center transition-all duration-300 shadow-md shadow-black/10 active:scale-[0.98]"
                            >
                                Download Focalyst &rarr;
                            </a>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section 5: Planning Cluster */}
            <section className="w-full bg-[#cad6e4]/15 px-8 py-12 md:py-[100px] border-t border-[#cad6e4]/30">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        {/* Pill tag */}
                        <div className="bg-[#1c2e4a] text-white text-[11px] md:text-[12px] tracking-[0.12em] rounded-full px-4 py-1 inline-block font-semibold">
                            PLANNING
                        </div>
                        
                        {/* Headline */}
                        <h2 className="text-[#1c2e4a] text-[28px] md:text-[48px] font-bold leading-[1.15] mt-[12px]">
                            Command your day.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#4a6c8c] text-[15px] md:text-[16px] leading-[1.7] font-normal mt-[16px] max-w-[420px]">
                            Your entire life, perfectly organized. Manage daily tasks, build unbreakable habit streaks, and track your biggest deadlines with visual countdown goals—all in one elegant dashboard.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-[24px] text-left items-start">
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[6px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Tasks: Drag-and-drop priority sorting
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[6px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Habits: Track daily streaks and progress
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-[7px] h-[7px] rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[6px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
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
                                className="absolute top-0 left-0 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-20 drop-shadow-2xl rounded-[2rem] select-none"
                            />
                            {/* Back Image */}
                            <img 
                                src="/plan-tab.png" 
                                alt="Focalyst Plan Tab Mockup" 
                                className="absolute top-32 right-0 md:top-24 md:-right-10 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-10 drop-shadow-xl rounded-[2rem] select-none"
                            />
                        </div>
                    </div>

                </div>
            </section>

            {/* Section 6: Deep Work Cluster */}
            <section className="w-full bg-[#f9fbfc] px-8 py-12 md:py-[100px] border-t border-[#cad6e4]/30">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Visual Column */}
                    <div className="flex justify-center items-center py-6 md:py-0 order-2 md:order-1">
                        <div className="relative max-w-[280px] sm:max-w-[320px] md:max-w-[350px] w-full">
                            <img 
                                src="/pomodoro.png" 
                                alt="Focalyst Pomodoro Mockup" 
                                className="w-full h-auto object-contain select-none drop-shadow-2xl"
                            />
                            {/* The Floating Shield Badge */}
                            <div className="absolute bottom-10 right-0 md:-right-4 bg-white/90 backdrop-blur-md border border-gray-200 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-2.5 z-30 select-none">
                                <Shield className="w-5 h-5 text-[#ed6c4c] fill-[#ed6c4c]" />
                                <span className="text-[#1c2e4a] text-[13px] font-bold">
                                    Distractions Blocked
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left order-1 md:order-2">
                        {/* Pill tag */}
                        <div className="bg-[#ed6c4c] text-white text-[11px] md:text-[12px] tracking-[0.12em] rounded-full px-4 py-1 inline-block font-semibold">
                            DEEP WORK
                        </div>
                        
                        {/* Headline */}
                        <h2 className="text-[#1c2e4a] text-[28px] md:text-[48px] font-bold leading-[1.15] mt-[12px]">
                            Zero distractions. Pure focus.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#4a6c8c] text-[15px] md:text-[16px] leading-[1.7] font-normal mt-[16px] max-w-[420px]">
                            Stop letting notifications break your flow. Set a Pomodoro timer and let Focalyst automatically block your biggest digital distractions until the work is actually done.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-[24px] text-left items-start w-full md:w-auto">
                            <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Preloaded & custom Pomodoro sessions
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    System-level distraction app blocker
                                </span>
                            </div>
                            <div className="flex items-center gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Session break & interval management
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </section>

            {/* Section 7: Capture Cluster */}
            <section className="w-full bg-[#cad6e4]/15 px-8 py-12 md:py-24 border-t border-[#cad6e4]/30">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left">
                        {/* Pill tag */}
                        <div className="bg-[#1c2e4a] text-white text-[11px] md:text-[12px] tracking-[0.12em] rounded-full px-4 py-1 inline-block font-semibold">
                            CAPTURE
                        </div>
                        
                        {/* Headline */}
                        <h2 className="text-[#1c2e4a] text-[28px] md:text-[48px] font-bold leading-[1.15] mt-3">
                            Think out loud.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#4a6c8c] text-[15px] md:text-[16px] leading-[1.7] font-normal mt-4 max-w-[420px]">
                            Never lose a fleeting idea again. Use the minimalist editor for deep writing, or tap the mic to record voice notes that Focalyst instantly transcribes and organizes for you.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-6 text-left items-start">
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[8px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Minimalist, block-based text editor
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[8px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Instant voice-to-text transcription
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[8px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
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
                                className="absolute top-0 left-0 md:left-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-10 drop-shadow-xl rounded-[2rem] select-none"
                            />
                            {/* Image 2 (Front) */}
                            <img 
                                src="/voice-note.png" 
                                alt="Focalyst Voice Note Mockup" 
                                className="absolute top-32 right-0 md:top-24 md:right-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-20 drop-shadow-2xl rounded-[2rem] select-none"
                            />
                        </div>
                    </div>

                </div>
            </section>

            {/* Section 8: AI & Analytics */}
            <section className="w-full bg-[#f9fbfc] px-8 py-16 md:py-32 border-t border-[#cad6e4]/30">
                <div className="max-w-[1160px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center">
                    
                    {/* Left Column - Visual Column */}
                    <div className="flex justify-center items-center py-6 md:py-0 order-2 md:order-1">
                        <div className="relative w-full h-[550px] md:h-[650px] mt-12 md:mt-0 max-w-md md:max-w-none mx-auto">
                            {/* Image 1 (Back) */}
                            <img 
                                src="/insights-tab.png" 
                                alt="Focalyst Insights Tab Mockup" 
                                className="absolute top-0 left-0 md:left-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-10 drop-shadow-xl rounded-[2rem] select-none"
                            />
                            {/* Image 2 (Front) */}
                            <img 
                                src="/ai-chat.png" 
                                alt="Focalyst AI Chat Mockup" 
                                className="absolute top-32 right-0 md:top-24 md:right-4 w-[85%] md:w-[75%] max-w-[320px] md:max-w-[360px] z-20 drop-shadow-2xl rounded-[2rem] select-none"
                            />
                        </div>
                    </div>

                    {/* Right Column - Text Column */}
                    <div className="flex flex-col items-center md:items-start text-center md:text-left order-1 md:order-2">
                        {/* Pill tag */}
                        <div className="bg-gradient-to-r from-[#1c2e4a] to-[#4a6c8c] text-white text-[11px] md:text-[12px] tracking-[0.12em] rounded-full px-4 py-1 inline-block font-semibold">
                            AI & INSIGHTS
                        </div>
                        
                        {/* Headline */}
                        <h2 className="text-[#1c2e4a] text-[28px] md:text-[48px] font-bold leading-[1.15] mt-3">
                            Work smarter, not harder.
                        </h2>
                        
                        {/* Body */}
                        <p className="text-[#4a6c8c] text-[15px] md:text-[16px] leading-[1.7] font-normal mt-4 max-w-[420px]">
                            Powered by Gemini, your Focalyst AI assistant helps you manage tasks effortlessly. Pair that with rich, weekly productivity analytics that break down exactly when you work best, where you get distracted, and how to improve.
                        </p>
                        
                        {/* Feature Bullets */}
                        <div className="flex flex-col gap-3.5 mt-6 text-left items-start">
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[8px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Conversational AI task management
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[8px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Weekly strengths & weaknesses report
                                </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-[#ed6c4c] flex-shrink-0 mt-[8px]" />
                                <span className="text-[#1c2e4a] text-[14px] md:text-[15px] font-medium leading-tight">
                                    Visual focus heatmaps & scoring
                                </span>
                            </div>
                        </div>

                        {/* Gemini Badge (Desktop only) */}
                        <div className="hidden md:flex items-center gap-2 mt-8 px-4 py-1.5 border border-[#cad6e4] rounded-full">
                            <Sparkles className="w-3.5 h-3.5 text-[#4a6c8c]" />
                            <span className="text-[#4a6c8c] text-[12px] font-medium leading-none">
                                Powered by Gemini
                            </span>
                        </div>
                    </div>

                </div>
            </section>
            
            {/* Section 9: Pricing Section */}
            <PricingSection />

            {/* Section 10: Final CTA & Footer Component */}
            <section id="download" className="w-full bg-[#1c2e4a] py-[64px] md:py-[120px] px-8 md:px-0">
                <div className="max-w-[1000px] mx-auto flex flex-col items-center text-center">
                    {/* Wordmark */}
                    <span className="text-white font-bold select-none text-[22px] tracking-[0.12em] md:text-[18px] md:tracking-[0.14em]">
                        FOCALYST
                    </span>

                    {/* Headline */}
                    <h2 className="text-white font-bold leading-none select-none mt-4 text-[48px] md:text-[88px]">
                        Own your time<span className="text-[#ed6c4c]">.</span>
                    </h2>

                    {/* Subheadline */}
                    <p className="font-normal mt-4 md:mt-5 text-white/60 text-[15px] md:text-white/55 text-[20px]">
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
                            className="h-[52px] w-full md:w-auto bg-[#f9fbfc] hover:bg-[#f9fbfc]/95 text-[#1c2e4a] rounded-xl md:rounded-full px-[28px] flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98] shadow-lg shadow-black/10"
                        >
                            {/* Apple SVG */}
                            <svg className="w-5.5 h-5.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.82M15.97 4.17c.66-.81 1.11-1.93.99-3.06-.96.04-2.13.64-2.82 1.45-.6.7-1.13 1.84-.99 2.94.99.08 2.16-.52 2.82-1.33z" />
                            </svg>
                            <span className="text-[14px] md:text-[15px] font-medium whitespace-nowrap">
                                <span className="md:hidden">Download on the App Store</span>
                                <span className="hidden md:block">App Store</span>
                            </span>
                        </a>

                        {/* Google Play Button */}
                        <a
                            href="https://play.google.com/store/apps/details?id=online.focalyst"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-[52px] w-full md:w-auto bg-transparent border-[1.5px] border-white text-white rounded-xl md:rounded-full px-[28px] flex items-center justify-center gap-3 transition-all duration-300 active:scale-[0.98]"
                        >
                            {/* Google Play SVG */}
                            <svg className="w-5.5 h-5.5 fill-current flex-shrink-0" viewBox="0 0 24 24">
                                <path d="M3 5.27v13.46c0 .87.72 1.42 1.47 1.05l14.4-7.2c.75-.38.75-1.46 0-1.83L4.47 4.22c-.75-.37-1.47.18-1.47 1.05z" />
                            </svg>
                            <span className="text-[14px] md:text-[15px] font-medium whitespace-nowrap">
                                <span className="md:hidden">Get it on Google Play</span>
                                <span className="hidden md:block">Google Play</span>
                            </span>
                        </a>
                    </div>

                    {/* Trust Row */}
                    <p className="text-center mt-6 md:mt-10 select-none text-[12px] md:text-[14px] text-white/50 md:text-white/45">
                        <span className="md:hidden">Free plan included · No credit card · Cancel anytime</span>
                        <span className="hidden md:block">Free plan included · No credit card needed · Cancel anytime</span>
                    </p>

                    {/* Desktop Divider */}
                    <hr className="hidden md:block w-full max-w-[800px] h-[1px] bg-white/10 border-0 mt-14 mx-auto" />

                    {/* Footer Info & Links */}
                    <div className="w-full">
                        {/* Mobile Layout */}
                        <div className="block md:hidden mt-12 flex flex-col items-center">
                            <a href="mailto:contactfocalyst@gmail.com" className="text-[#cad6e4] text-[13px] font-medium hover:underline">
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
                                <span className="text-[#4a6c8c] text-[11px] font-medium">
                                    Built by Chintan
                                </span>
                                <span className="text-white/30 text-[11px]">
                                    Privacy · Terms
                                </span>
                            </div>
                        </div>

                        {/* Desktop Layout */}
                        <div className="hidden md:block w-full max-w-[800px] mx-auto">
                            {/* Pre-Footer Row */}
                            <div className="flex items-center justify-between mt-8">
                                <a href="mailto:contactfocalyst@gmail.com" className="text-[#cad6e4] text-[14px] font-medium hover:underline">
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
                                <span className="text-white/25 text-[13px]">
                                    © 2026 Focalyst
                                </span>
                                <span className="text-[#4a6c8c] text-[13px]">
                                    Built by Chintan
                                </span>
                                <span className="text-white/25 text-[13px]">
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
