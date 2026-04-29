import React, { useState, useRef, useEffect, useCallback, memo, useMemo } from 'react';
import { Upload, Monitor, Layout, Download, Play, Pause, RotateCcw, Loader, Grid, Maximize, CheckSquare, Square, Edit2, Save, BadgeCheck, Image as ImageIcon, Type, Sliders, Users, Globe, Move, Volume2, VolumeX, Bold, X, Video } from 'lucide-react';
// Inter is loaded globally via public/fonts/*.woff2 (see index.css)

// --- HARDCODED LOGOS (SVG Data URIs) ---

const LOGO_BEST_FOUNDER_CLIPS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='black'/%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Inter, sans-serif' font-weight='900' font-size='130' letter-spacing='-4'%3EBEST%3C/text%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffa302' font-family='Inter, sans-serif' font-weight='900' font-size='75' letter-spacing='-2'%3EFOUNDER%3C/text%3E%3Ctext x='50%25' y='70%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Inter, sans-serif' font-weight='900' font-size='130' letter-spacing='-4'%3ECLIPS%3C/text%3E%3C/svg%3E`;

const LOGO_BUSINESS_CRACKED = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' rx='0' fill='black'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Inter, sans-serif' font-weight='900' font-size='280' letter-spacing='-10'%3EBC%3C/text%3E%3C/svg%3E`;

const LOGO_THE_FOUNDERS_SHOW = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='%23C62828'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Times New Roman, serif' font-weight='400' font-size='300'%3EFS%3C/text%3E%3C/svg%3E`;

const LOGO_FOUNDERS_GOD = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500' style='background-color:black'%3E%3Crect x='25' y='25' width='450' height='450' fill='none' stroke='%23C5A059' stroke-width='15'/%3E%3Cpath d='M 250 25 Q 350 125 475 250 Q 350 375 250 475 Q 150 375 25 250 Q 150 125 250 25' fill='none' stroke='%23C5A059' stroke-width='15'/%3E%3Ccircle cx='250' cy='250' r='60' fill='%23C5A059'/%3E%3Cpath d='M 250 25 L 250 475 M 25 250 L 475 250' fill='none' stroke='%23C5A059' stroke-width='5' opacity='0.5'/%3E%3C/svg%3E`;

const LOGO_SMART_BUSINESS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='black'/%3E%3Ccircle cx='250' cy='220' r='180' fill='white'/%3E%3Cpath d='M250 100 C180 100 130 160 130 230 C130 290 170 330 200 350 L150 500 L350 500 L300 350 C330 330 370 290 370 230 C370 160 320 100 250 100 Z' fill='black' transform='translate(0, 20)'/%3E%3C/svg%3E`;

const LOGO_THERISINGFOUNDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='transparent'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23DC2626' font-family='Inter, sans-serif' font-weight='900' font-size='200' letter-spacing='-5'%3ETRF.%3C/text%3E%3C/svg%3E`;

const LOGO_THEREALFOUNDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='transparent'/%3E%3Cpath d='M 200 150 L 300 150 L 300 200 L 250 250 L 200 200 Z M 250 250 L 250 350 L 300 350 L 300 300 L 350 350 L 350 250 Z' fill='white' stroke='white' stroke-width='20'/%3E%3C/svg%3E`;

const LOGO_INSPIRINGFOUNDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='white'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='black' font-family='Inter, sans-serif' font-weight='900' font-size='80' letter-spacing='-2'%3EINSPIRING%3C/text%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='black' font-family='Inter, sans-serif' font-weight='900' font-size='80' letter-spacing='-2'%3EFOUNDER%3C/text%3E%3C/svg%3E`;

const LOGO_REALINDIABUSINESS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Ccircle cx='250' cy='250' r='200' fill='%239433CC'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Inter, sans-serif' font-weight='900' font-size='220' letter-spacing='-5'%3EB.%3C/text%3E%3C/svg%3E`;

const LOGO_CEOMINDSETINDIA = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Ccircle cx='250' cy='250' r='200' fill='%23DC2626'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Inter, sans-serif' font-weight='900' font-size='180' letter-spacing='-5'%3ECBO%3C/text%3E%3C/svg%3E`;

const LOGO_STARTUP_MADNESS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' rx='40' fill='%23FF6B00'/%3E%3Cpath d='M 200 150 L 300 150 L 300 200 L 250 250 L 200 200 Z M 250 250 L 250 350 L 300 350 L 300 300 L 350 350 L 350 250 Z' fill='white' stroke='white' stroke-width='20'/%3E%3C/svg%3E`;

const LOGO_FOUNDERS_WTF = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='%237C3AED' stroke='white' stroke-width='4'/%3E%3Ctext x='250' y='185' text-anchor='middle' fill='white' font-family='Inter, sans-serif' font-weight='600' font-size='72' letter-spacing='-2'%3Efounders%3C/text%3E%3Ctext x='250' y='335' text-anchor='middle' fill='white' font-family='Inter, sans-serif'%3E%3Ctspan font-weight='900' font-size='120' letter-spacing='-4'%3EW%3C/tspan%3E%3Ctspan font-weight='600' font-size='72' letter-spacing='-2'%3ETF.%3C/tspan%3E%3C/text%3E%3C/svg%3E`;


// --- DEFAULTS ---
const DEFAULT_HEADLINE = "The <b>trick</b> to making your employees loyal";
const DEFAULT_FOOTER = "Credit: The Founders Show";

// --- CONFIGURATION: PRESETS ---
const INITIAL_PRESETS_RAW = [
    { id: 1, name: '101xfounders', handle: '@101xfounders', ratio: '4:3', color: '#ffa302', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 2, name: 'bizzindia', handle: '@bizzindia', ratio: '4:3', color: '#E31D38', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 3, name: 'Best Founder Clips', handle: '@BestFOunderClips', ratio: '16:9', color: '#ffc002', active: true, layout: 'logo_centered', logo: LOGO_BEST_FOUNDER_CLIPS, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 4, name: 'Business Cracked', handle: '@businesscracked', ratio: '4:3', color: '#fdeb01', active: true, layout: 'social', logo: LOGO_BUSINESS_CRACKED, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 5, name: 'The Founders Show', handle: '@thefoundersshow', ratio: '4:3', color: '#E31D38', active: true, layout: 'social', logo: LOGO_THE_FOUNDERS_SHOW, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 6, name: 'Founders God', handle: '@foundersgod', ratio: '4:3', color: '#ffcd4c', active: true, layout: 'social', logo: LOGO_FOUNDERS_GOD, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 7, name: 'Smart Business.in', handle: '@smartbusiness.in', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: LOGO_SMART_BUSINESS, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 8, name: 'The Rising Founder', handle: '@therisingfounder', ratio: '4:3', color: '#ffa302', active: true, layout: 'watermark', logo: LOGO_THERISINGFOUNDER, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 9, name: 'The Real Founder', handle: '@therealfounder', ratio: '4:3', color: '#ff7338', active: true, layout: 'social', logo: LOGO_THEREALFOUNDER, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 10, name: 'Inspiring Founder', handle: '@inspiringfounder', ratio: '1:1', color: '#5274f1', active: true, layout: 'social', logo: LOGO_INSPIRINGFOUNDER, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 11, name: 'Real India Business', handle: '@realindianbusiness', ratio: '4:3', color: '#8a2bff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 12, name: 'CEO Mindset India', handle: '@ceomindsetindia', ratio: '4:3', color: '#DC2626', active: true, layout: 'social', logo: LOGO_CEOMINDSETINDIA, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 13, name: 'founderdaily', handle: '@founderdaily', ratio: '4:3', color: '#000000', active: true, layout: 'social', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 14, name: 'founderbusinesstips', handle: '@founderbusinesstips', ratio: '4:3', color: '#000000', active: true, layout: 'social', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 15, name: 'foundersoncrack', handle: '@foundersoncrack', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'foundersoncrack.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 16, name: 'kwazyfounders', handle: '@kwazyfounders', ratio: '1:1', color: '#000000', active: true, layout: 'social', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 17, name: 'Life Wealth Lessons', handle: '@lifewealthlessons', ratio: '4:3', color: '#E31D38', active: true, layout: 'social', logo: LOGO_THE_FOUNDERS_SHOW, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 18, name: 'Business India Lessons', handle: '@businessindialessons', ratio: '4:3', color: '#ff2845', active: true, layout: 'social', logo: LOGO_THE_FOUNDERS_SHOW, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 19, name: 'Billionaires of Bharat', handle: '@billionairesofbharat', ratio: '4:3', color: '#E31D38', active: true, layout: 'social', logo: LOGO_THE_FOUNDERS_SHOW, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 20, name: 'startup madness', handle: '@startupmadness', ratio: '4:3', color: '#ffa302', active: true, layout: 'logo_centered', logo: LOGO_STARTUP_MADNESS, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 21, name: 'ceo hustle advice', handle: '@ceohustleadvice', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 22, name: 'wealth lessons india', handle: '@wealthlessonsindia', ratio: '4:3', color: '#ff9c06', active: true, layout: 'social', logo: 'life-wealth-lessons.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 23, name: 'indian hustle advice', handle: '@indianhustleadvice', ratio: '1:1', color: '#ffffff', active: true, layout: 'social', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 24, name: 'rich indian ceo', handle: '@richindianceo', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 25, name: 'indiasbestfounders', handle: '@indiasbestfounders', ratio: '4:3', color: '#ECECDC', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 26, name: 'startupcoded', handle: '@startupcoded', ratio: '1:1', color: '#ffffff', active: true, layout: 'social', logo: 'startupcoded.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 27, name: 'founders cracked', handle: '@founderscracked', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'founders-cracked.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 28, name: 'indian business com', handle: '@indianbusinesscom', ratio: '1:1', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 29, name: 'indian-founders-co-old', handle: '@indianfoundersco', ratio: '4:3', color: '#f7EA6A', active: false, hidden: true, layout: 'social', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 30, name: 'founders-in-india-old', handle: '@foundersinindia', ratio: '4:3', color: '#ffffff', active: false, hidden: true, layout: 'social', logo: 'founders-in-india.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 90, name: 'founders-in-india', handle: '@foundersinindia', ratio: '4:3', color: '#7F53FF', active: true, layout: 'hook_video', logo: 'founders-in-india.png', headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25, rules: { logoOpacity: 0.5, logoPosition: 'top-right' } },
    { id: 91, name: 'indian-founders-co', handle: '@indianfoundersco', ratio: '4:3', color: '#2cb162', active: true, layout: 'hook_video', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 31, name: 'Ads by marketer', handle: '@adsbymarketer', ratio: '4:3', color: '#ffc002', active: true, layout: 'logo_centered', logo: 'ads-by-marketer.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 32, name: 'best business clips', handle: '@bestbusinessclips', ratio: '4:3', color: '#ffc002', active: true, layout: 'logo_centered', logo: 'best-business-clips.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25 },
    { id: 33, name: 'Founders wtf', handle: '@founderswtf', ratio: '16:9', color: '#ffffff', active: true, layout: 'social', logo: LOGO_FOUNDERS_WTF, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 34, name: 'mktg-wtf', handle: '@mktgwtf', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'mktg-wtf.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 35, name: 'Business wtf', handle: '@businesswtf', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'business-wtf.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 36, name: 'Startups wtf', handle: '@startupswtf', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'startups-wtf.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 37, name: 'Entrepreneurial India', handle: '@entrepreneurialindia', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Entreprenurial-india.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 38, name: 'Finding Good AI', handle: '@findinggoodai', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'finding-good-ai.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 39, name: 'Finding Good Tech', handle: '@findinggoodtech', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'finding-good-tech.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 40, name: 'peakofai', handle: '@peakofai', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 41, name: 'theprimefounder', handle: '@theprimefounder', ratio: '16:9', color: '#1DB077', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 42, name: 'aicracked', handle: '@aicracked', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 43, name: 'theevolvinggpt', handle: '@theevolvinggpt', ratio: '16:9', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 44, name: 'foundrsonig', handle: '@foundrsonig', ratio: '4:3', color: '#ECECDC', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 45, name: 'indianfoundr', handle: '@indianfoundr', ratio: '1:1', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 46, name: 'indiastartupstory', handle: '@indiastartupstory', ratio: '4:3', color: '#EF5350', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 47, name: 'neworderai', handle: '@neworderai', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 48, name: 'startupsinthelast24hrs', handle: '@startupsinthelast24hrs', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'startupsinthelast24hrs.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 68, name: 'indian ai future', handle: '@indianaifuture', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'indian-ai-future.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 49, name: 'techinthelast24hrs', handle: '@techinthelast24hrs', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'techinthelast24hrs.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 50, name: 'indianaipage', handle: '@indianaipage', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'indianaipage.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 51, name: 'elitefoundrs', handle: '@elitefoundrs', ratio: '4:3', color: '#ECECDC', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 69, name: 'intelligence by ai', handle: '@intelligencebyai', ratio: '4:3', color: '#ECECDC', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 52, name: 'indiantechdaily', handle: '@indiantechdaily', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'indiantechdaily.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 53, name: '101xtechnology', handle: '@101xtechnology', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: '101xtechnology.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 73, name: 'Pure Code AI', handle: '@purecodeai', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Pure-Code-AI.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 74, name: 'Nobel AI Page', handle: '@nobelai', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Nobel-AI-Page.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 54, name: 'therisingai', handle: '@therisingai', ratio: '16:9', color: '#ffffff', active: true, layout: 'social', logo: 'therisingai.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 55, name: 'Revolution in ai', handle: '@revolutioninai', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Revolution-in-ai.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 56, name: 'Founders.India', handle: '@foundersindia', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Founders-India.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 57, name: 'Technology In India', handle: '@technologyinindia', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Technology-In-India.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 58, name: 'Daily Tech India', handle: '@dailytechindia', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'Daily-Tech-India.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 59, name: 'The Prime Ai Page', handle: '@theprimeaipage', ratio: '4:3', color: '#FFCD1D', active: true, layout: 'social', logo: 'The-Prime-Ai-Page.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 60, name: 'Dhandha India', handle: '@dhandhaindia', ratio: '1:1', color: '#FB9C39', active: true, layout: 'social', logo: 'Dhandha-India.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 61, name: 'The Ai Gauntlet', handle: '@theaigauntlet', ratio: '4:3', color: '#FFCD1D', active: true, layout: 'social', logo: 'The-Ai-Gauntlet.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 62, name: 'startupsoncrack', handle: '@startupsoncrack', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 63, name: 'millionaire.founders', handle: '@millionaire.founders', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 64, name: 'startupscheming', handle: '@startupscheming', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 65, name: 'startupsxindia', handle: '@startupsxindia', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: -6, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 66, name: 'nobelfounders', handle: '@nobelfounders', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: -6, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 67, name: 'foundersxindia', handle: '@foundersxindia', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: -6, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 70, name: 'the ai phaze', handle: '@theaiphaze', ratio: '4:3', color: '#95C5D1', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: -6, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 71, name: 'That AI page', handle: '@thataipage', ratio: '4:3', color: '#6523FF', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: -6, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 72, name: 'Revolution in tech', handle: '@revolutionintech', ratio: '4:3', color: '#FDB05E', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: -6, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
    { id: 75, name: 'bestindianpodcast', handle: '@bestindianpodcast', ratio: '4:3', color: '#ffffff', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 76, name: 'risewithcontent', handle: '@risewithcontent', ratio: '4:3', color: '#E53935', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25 },
    { id: 77, name: '101xfounders-tweet', handle: '@101xfounders', ratio: '4:3', color: '#ffa302', active: true, layout: 'social', logo: '101xfounders.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 78, name: 'bizzindia-tweet', handle: '@bizzindia', ratio: '4:3', color: '#E31D38', active: true, layout: 'social', logo: 'bizzindia.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 79, name: 'founders-in-india-tweet', handle: '@foundersinindia', ratio: '4:3', color: '#ffffff', active: false, hidden: true, layout: 'social', logo: 'founders-in-india.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 80, name: 'indian-founders-co-tweet', handle: '@indianfoundersco', ratio: '4:3', color: '#2cb162', active: false, hidden: true, layout: 'social', logo: 'indian-founders-co.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 81, name: 'startupbydog', handle: '@startupbydog', ratio: '4:3', color: '#ffffff', active: true, layout: 'social', logo: 'startupbydog.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
    { id: 82, name: 'Entrepreneursindia.co', handle: '@entrepreneursindia.co', ratio: '4:3', color: '#6500D1', active: true, layout: 'social', logo: 'Entrepreneursindia.co.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25 },
];

// All presets are shown in a single unified list (no active/inactive division).

// Start with ALL presets unchecked by default; user must click to select them
const INITIAL_PRESETS = INITIAL_PRESETS_RAW.filter(p => !p.hidden).map(p => ({
    ...p,
    active: false,
    hookEyebrow: p.hookEyebrow ?? '',
    showHookEyebrow: p.showHookEyebrow ?? false,
    hookEyebrowAlignment: p.hookEyebrowAlignment ?? 'left',
    hookEyebrowSizeScale: p.hookEyebrowSizeScale ?? 1.1,
    hookEyebrowGapScale: p.hookEyebrowGapScale ?? 1.35,
}));

// Helper to get logo URL (handles both data URIs and filenames)
const getLogoUrl = (logo) => {
    if (!logo) return null;
    // If it's already a full URL or data URI, return as is
    if (logo.startsWith('http://') || logo.startsWith('https://') || logo.startsWith('data:')) {
        return logo;
    }
    // If it's a filename, convert to server URL
    // For EC2/remote access, logos are served from port 3002 (backend)
    const host = window.location.hostname;
    const base = (host === 'localhost' || host === '127.0.0.1' || window.location.origin.includes('ngrok'))
        ? window.location.origin
        : `http://${host}:3002`;
    return `${base}/assets/logos/${logo}`;
};

// Helper to strip HTML tags for length calculations
const stripHTML = (html) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

// Normalize bold markers and <br> so preview and export match (same as server)
const normalizeBoldHTML = (html) => {
    if (!html || typeof html !== 'string') return html || '';
    let out = html.replace(/<\/?strong>/gi, (m) => m.toLowerCase().replace('strong', 'b'));
    // Normalize <b style="..."> or <b class="..."> to plain <b>
    out = out.replace(/<b\s[^>]*>/gi, '<b>');
    // Support WhatsApp-style *word* / **word** syntax as bold.
    // Order matters: handle **...** first so it doesn't get partially consumed by the single-* pass.
    out = out.replace(/\*\*(\S(?:[\s\S]*?\S)?)\*\*/g, '<b>$1</b>');
    out = out.replace(/\*(\S(?:[\s\S]*?\S)?)\*/g, '<b>$1</b>');
    return out;
};
// Replace <br> with newline so line breaks render (and literal "<br>" never appears)
const normalizeLineBreaks = (html) => {
    if (!html || typeof html !== 'string') return html || '';
    return html.replace(/<br\s*\/?>/gi, '\n');
};

// Helper to parse HTML text into segments (for preview rendering). Same logic as server so preview = export. Supports <br> as line break.
const parseHeadline = (html) => {
    if (!html) return [];
    const segments = [];
    const normalized = normalizeBoldHTML(html);
    const tmp = document.createElement('DIV');
    tmp.innerHTML = normalized;

    const styleWeightIsBold = (el) => {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;
        const cls = (el.getAttribute ? String(el.getAttribute('class') || '') : '');
        // contentEditable sometimes uses class-based weights (e.g., pasted rich text or toolbars)
        // Treat Tailwind-like weight classes as highlight.
        if (/\bfont-(semibold|bold|extrabold|black)\b/i.test(cls)) return true;
        // Prefer the parsed style object when available.
        const fw = el.style ? String(el.style.fontWeight || '') : '';
        if (fw === 'bold') return true;
        const fwNum = parseInt(fw, 10);
        if (!Number.isNaN(fwNum) && fwNum >= 600) return true;
        // Some browsers/contentEditable produce spans where font-weight only exists in the raw style attribute.
        const rawStyle = el.getAttribute ? String(el.getAttribute('style') || '') : '';
        const m = rawStyle.match(/font-weight\s*:\s*([^;]+)/i);
        if (!m) return false;
        const v = String(m[1]).trim().toLowerCase();
        if (v === 'bold') return true;
        const n = parseInt(v, 10);
        return !Number.isNaN(n) && n >= 600;
    };

    const walk = (node, isBoldParent = false) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            // Shift+Enter in contentEditable can produce literal newline characters in text nodes.
            // Preserve them as explicit line breaks for preview/export parity.
            const lines = text.replace(/\r\n/g, '\n').split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i] || '';
                const words = line.trim().split(/\s+/).filter(w => w.length > 0);
                words.forEach(word => segments.push({ text: word, highlight: isBoldParent }));
                if (i < lines.length - 1 && segments.length > 0) {
                    segments.push({ lineBreak: true });
                }
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'BR') {
                segments.push({ lineBreak: true });
                return;
            }
            // Block elements (DIV, P) from pressing Enter in editor = line break before their content
            const isBlock = node.tagName === 'DIV' || node.tagName === 'P';
            if (isBlock && segments.length > 0) segments.push({ lineBreak: true });
            const isBold =
                node.tagName === 'B' ||
                node.tagName === 'STRONG' ||
                styleWeightIsBold(node);
            Array.from(node.childNodes).forEach(child => walk(child, isBold || isBoldParent));
        }
    };

    Array.from(tmp.childNodes).forEach(child => walk(child, false));

    if (segments.length === 0) {
        return [{ text: stripHTML(normalized), highlight: false }];
    }
    return segments;
};

// Helper to calculate font size (uses text length without HTML tags)
const calculateFontSize = (textLength, scaleMultiplier = 1) => {
    let size = 32;
    if (textLength < 25) size = 50;
    else if (textLength < 50) size = 40;
    return size * scaleMultiplier;
};

// Rich Text Editor Component
const RichTextEditor = ({ value, onChange, placeholder, className }) => {
    const editorRef = useRef(null);
    const [isFocused, setIsFocused] = useState(false);

    const handleBold = useCallback(() => {
        const editor = editorRef.current;
        if (!editor) return;

        editor.focus();
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        if (range.collapsed) return; // No text selected

        // Check if selection is already bold by checking if queryCommandState returns true
        const isBold = document.queryCommandState('bold');

        // Use document.execCommand for reliable bold toggle - it automatically toggles
        document.execCommand('bold', false, null);

        // Update value immediately
        if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    }, [onChange]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;

        const handleKeyDown = (e) => {
            // B key for bold (when Ctrl/Cmd is pressed)
            if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                handleBold();
            }
            // Don't handle B key alone - let user type normally
        };

        editor.addEventListener('keydown', handleKeyDown);
        return () => editor.removeEventListener('keydown', handleKeyDown);
    }, [handleBold]);

    const handleInput = (e) => {
        if (onChange) {
            onChange(e.target.innerHTML);
        }
    };

    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        document.execCommand('insertText', false, text);
        if (onChange && editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    // Update content when value changes externally
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value]);

    return (
        <div className="relative">
            <div className="flex items-center gap-1 mb-1">
                <button
                    type="button"
                    onClick={handleBold}
                    className={`px-2 py-1 text-xs rounded border transition-all flex items-center gap-1 ${isFocused && window.getSelection().toString()
                        ? 'bg-yellow-500 text-black border-yellow-500'
                        : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:border-neutral-400'
                        }`}
                    title="Bold (B or Ctrl+B)"
                >
                    <Bold size={14} />
                    <span className="text-[10px]">B</span>
                </button>
                <span className="text-[10px] text-neutral-500">Select text and press B or click Bold</span>
            </div>
            <div
                ref={editorRef}
                contentEditable
                onInput={handleInput}
                onPaste={handlePaste}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className={className}
                style={{ minHeight: '60px' }}
                suppressContentEditableWarning
            />
        </div>
    );
};

// --- SUB-COMPONENT: Preview Card (Memoized for Performance) ---
const PreviewCard = memo(({
    preset,
    videoSrc,
    isPlaying,
    videoRef,
    isMain,
    fitMode,
    videoScale,
    showCredit,
    onToggle,
    fontScaleGlobal,
    onPositionChange,
    onCreditPositionChange,
    onWatermarkPositionChange,
    onHeadlinePositionChange,
    onVideoScaleChange,
    isMuted,
    wordSpacing = 0.25
}) => {
    const [isRepositioning, setIsRepositioning] = useState(false);
    const [isRepositioningCredit, setIsRepositioningCredit] = useState(false);
    const [isRepositioningWatermark, setIsRepositioningWatermark] = useState(false);
    const [isRepositioningHeadline, setIsRepositioningHeadline] = useState(false);
    const [isResizingVideo, setIsResizingVideo] = useState(false);
    const [localPos, setLocalPos] = useState(preset.position || { x: 50, y: 50 });
    const [localCreditPos, setLocalCreditPos] = useState(preset.creditPosition || { x: 0, y: -1.5 });
    const [localWatermarkPos, setLocalWatermarkPos] = useState(preset.watermarkPosition || { x: 50, y: 16 });
    const [localHeadlinePos, setLocalHeadlinePos] = useState(preset.headlinePosition || { x: 0, y: 0 });
    const [localVideoScale, setLocalVideoScale] = useState(videoScale || 100);
    const [ifcFontInfo, setIfcFontInfo] = useState(null);
    const containerRef = useRef(null);
    const creditRef = useRef(null);
    const watermarkRef = useRef(null);
    const headlineRef = useRef(null);
    const videoElementRef = useRef(null);

    useEffect(() => {
        if (preset.name !== 'indian-founders-co') return;

        let cancelled = false;
        const tick = () => {
            const root = headlineRef.current;
            const spans = root ? Array.from(root.querySelectorAll('span')) : [];
            const highlighted = spans.find(s => {
                const color = window.getComputedStyle(s).color;
                return color === 'rgb(44, 177, 98)'; // #2cb162
            });
            const target = highlighted ?? spans[0] ?? null;
            const cs = target ? window.getComputedStyle(target) : null;
            const family = cs?.fontFamily ?? '(no-span)';
            const weight = cs?.fontWeight ?? '(n/a)';
            const interAny = !!document.fonts?.check?.('16px "Inter"');
            const inter400 = !!document.fonts?.check?.('normal 400 16px "Inter"');
            const inter700 = !!document.fonts?.check?.('normal 700 16px "Inter"');
            const inter800 = !!document.fonts?.check?.('normal 800 16px "Inter"');
            const inter900 = !!document.fonts?.check?.('normal 900 16px "Inter"');
            if (!cancelled) setIfcFontInfo({ family, weight, interAny, inter400, inter700, inter800, inter900 });
        };

        tick();
        const id = window.setInterval(tick, 750);
        return () => { cancelled = true; window.clearInterval(id); };
    }, [preset.name, preset.headline]);

    // CRITICAL: Control video playback based on preset.active and isPlaying
    // Only active presets should play video to reduce resource usage and prevent lag
    useEffect(() => {
        const video = videoElementRef.current;
        if (!video || !videoSrc) return;

        if (preset.active && isPlaying) {
            // Active preset and play button is on - play video
            video.play().catch(() => { });
            video.loop = true;
        } else {
            // Inactive preset or play button is off - pause video
            video.pause();
            video.loop = false;
        }
    }, [preset.active, isPlaying, videoSrc]);

    useEffect(() => {
        setLocalPos(preset.position || { x: 50, y: 50 });
    }, [preset.position]);

    useEffect(() => {
        setLocalCreditPos(preset.creditPosition || { x: 0, y: -1.5 });
    }, [preset.creditPosition]);

    useEffect(() => {
        setLocalWatermarkPos(preset.watermarkPosition || { x: 50, y: 16 });
    }, [preset.watermarkPosition]);

    useEffect(() => {
        const pos = preset.headlinePosition || { x: 0, y: 0 };
        setLocalHeadlinePos(pos);
    }, [preset.headlinePosition]);

    // Font debug removed (using clean global Inter now)

    const getAspectRatioStyle = (r) => {
        switch (r) {
            case '16:9': return { paddingBottom: '56.25%' };
            case '1:1': return { paddingBottom: '100%' };
            case '4:3': return { paddingBottom: '75%' };
            case '3:4': return { paddingBottom: '133.33%' };
            default: return { paddingBottom: '100%' };
        }
    };

    const handleMouseDown = (e) => {
        if (!isRepositioning) return;
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = localPos.x;
        const startPosY = localPos.y;

        const onMove = (evt) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const dX = evt.clientX - startX;
            const dY = evt.clientY - startY;
            const sens = 0.2;
            let nX = startPosX - (dX / rect.width * 100 * sens * 2);
            let nY = startPosY - (dY / rect.height * 100 * sens * 2);
            nX = Math.max(0, Math.min(100, nX));
            nY = Math.max(0, Math.min(100, nY));
            setLocalPos({ x: nX, y: nY });
            containerRef.current.dataset.tempX = nX;
            containerRef.current.dataset.tempY = nY;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (containerRef.current && containerRef.current.dataset.tempX) {
                onPositionChange(preset.id, {
                    x: parseFloat(containerRef.current.dataset.tempX),
                    y: parseFloat(containerRef.current.dataset.tempY)
                });
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const handleCreditMouseDown = (e) => {
        if (!isRepositioningCredit) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = localCreditPos.x;
        const startPosY = localCreditPos.y;

        const onMove = (evt) => {
            if (!creditRef.current) return;
            const rect = creditRef.current.getBoundingClientRect();
            const dX = evt.clientX - startX;
            const dY = evt.clientY - startY;
            const sens = 0.2;
            let nX = startPosX + (dX / rect.width * 100 * sens * 2);
            let nY = startPosY + (dY / rect.height * 100 * sens * 2);
            nX = Math.max(-100, Math.min(200, nX));
            nY = Math.max(-100, Math.min(200, nY));
            setLocalCreditPos({ x: nX, y: nY });
            creditRef.current.dataset.tempX = nX;
            creditRef.current.dataset.tempY = nY;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (creditRef.current && creditRef.current.dataset.tempX) {
                onCreditPositionChange(preset.id, {
                    x: parseFloat(creditRef.current.dataset.tempX),
                    y: parseFloat(creditRef.current.dataset.tempY)
                });
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const handleWatermarkMouseDown = (e) => {
        if (!isRepositioningWatermark) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = localWatermarkPos.x;
        const startPosY = localWatermarkPos.y;

        const onMove = (evt) => {
            if (!watermarkRef.current) return;
            const rect = watermarkRef.current.getBoundingClientRect();
            const dX = evt.clientX - startX;
            const dY = evt.clientY - startY;
            const sens = 0.2;
            let nX = startPosX + (dX / rect.width * 100 * sens * 2);
            let nY = startPosY - (dY / rect.height * 100 * sens * 2); // Invert Y for bottom positioning
            nX = Math.max(0, Math.min(100, nX));
            nY = Math.max(0, Math.min(200, nY));
            setLocalWatermarkPos({ x: nX, y: nY });
            watermarkRef.current.dataset.tempX = nX;
            watermarkRef.current.dataset.tempY = nY;
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (watermarkRef.current && watermarkRef.current.dataset.tempX) {
                onWatermarkPositionChange(preset.id, {
                    x: parseFloat(watermarkRef.current.dataset.tempX),
                    y: parseFloat(watermarkRef.current.dataset.tempY)
                });
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const handleResizeStart = (e, corner) => {
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startScale = localVideoScale;
        const startDistance = Math.sqrt(
            Math.pow(e.clientX - (containerRef.current?.getBoundingClientRect().left + containerRef.current?.getBoundingClientRect().width / 2) || 0, 2) +
            Math.pow(e.clientY - (containerRef.current?.getBoundingClientRect().top + containerRef.current?.getBoundingClientRect().height / 2) || 0, 2)
        );

        const onMove = (evt) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const currentDistance = Math.sqrt(
                Math.pow(evt.clientX - centerX, 2) +
                Math.pow(evt.clientY - centerY, 2)
            );

            // Calculate scale change based on distance from center
            const scaleChange = ((currentDistance - startDistance) / Math.min(rect.width, rect.height)) * 200;

            let newScale = startScale + scaleChange;
            newScale = Math.max(50, Math.min(200, newScale));
            setLocalVideoScale(newScale);
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (onVideoScaleChange && localVideoScale !== videoScale) {
                onVideoScaleChange(localVideoScale);
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    const handleHeadlineMouseDown = (e) => {
        if (!isRepositioningHeadline) return;
        e.preventDefault();
        e.stopPropagation();
        const startX = e.clientX;
        const startY = e.clientY;
        const startPosX = localHeadlinePos.x || 0;
        const startPosY = localHeadlinePos.y || 0;
        let lastX = startPosX;
        let lastY = startPosY;

        const onMove = (evt) => {
            if (!headlineRef.current) return;
            evt.preventDefault();
            const rect = headlineRef.current.getBoundingClientRect();
            const dX = evt.clientX - startX;
            const dY = evt.clientY - startY;
            const sens = 0.2;
            let nX = startPosX + (dX / rect.width * 100 * sens * 2);
            let nY = startPosY + (dY / rect.height * 100 * sens * 2);
            nX = Math.max(-100, Math.min(200, nX));
            nY = Math.max(-100, Math.min(200, nY));

            // Only update if position changed significantly to reduce re-renders
            if (Math.abs(nX - lastX) > 0.1 || Math.abs(nY - lastY) > 0.1) {
                lastX = nX;
                lastY = nY;
                setLocalHeadlinePos({ x: nX, y: nY });
                headlineRef.current.dataset.tempX = nX;
                headlineRef.current.dataset.tempY = nY;
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (headlineRef.current && headlineRef.current.dataset.tempX !== undefined) {
                onHeadlinePositionChange(preset.id, {
                    x: parseFloat(headlineRef.current.dataset.tempX),
                    y: parseFloat(headlineRef.current.dataset.tempY)
                });
            }
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    };

    // OPTIMIZATION: Skip expensive calculations for inactive presets
    // Only calculate when preset is active to save RAM and CPU
    const effectiveFontScale = preset.fontScale ?? fontScaleGlobal;
    const previewFontSize = useMemo(() => {
        if (!preset.active) return 20; // Default size for inactive presets
        const textLength = preset.headline ? stripHTML(preset.headline).length : 0;
        const baseSize = calculateFontSize(textLength, effectiveFontScale);
        const layoutScale = preset.layout === 'hook_video' ? 0.5 : preset.layout === 'logo_centered' ? 0.35 : 0.45;
        return Math.max(10, baseSize * layoutScale);
    }, [preset.headline, preset.layout, effectiveFontScale, preset.active]);

    // Alignment Logic - Use preset.alignment property
    const isCenterAligned = preset.alignment === 'center';
    const isCenteredLeftAlign = preset.name === 'startupsoncrack' || preset.name === 'millionaire.founders' || preset.name === 'startupscheming' || preset.name === 'indian business com';
    const textAlignClass = isCenterAligned ? 'text-center items-center px-6' : (isCenteredLeftAlign ? 'text-left items-start px-14' : 'text-left items-start px-6');
    const justifyClass = 'justify-center gap-1';
    const showMainHookBlock = preset.layout !== 'hook_video' && preset.name !== 'Best Founder Clips' && preset.name !== 'best business clips' && preset.name !== 'startup madness' && preset.name !== 'Ads by marketer';
    const eyebrowSizeScale = preset.hookEyebrowSizeScale ?? 1.1;
    const eyebrowGapScale = preset.hookEyebrowGapScale ?? 0.65;
    const eyebrowAlignment = preset.hookEyebrowAlignment ?? 'left';
    const eyebrowAlignClass = eyebrowAlignment === 'center'
        ? 'text-center items-center px-6'
        : (isCenteredLeftAlign ? 'text-left items-start px-14' : 'text-left items-start px-6');
    const eyebrowPreviewSize = Math.max(10, Math.round(previewFontSize * 0.52 * eyebrowSizeScale));
    const eyebrowGapPx = Math.round(6 * eyebrowGapScale);
    const eyebrowTextTrimmed = (preset.hookEyebrow && String(preset.hookEyebrow).trim()) || '';
    const showEyebrowInPreview = preset.showHookEyebrow && eyebrowTextTrimmed.length > 0;

    // OPTIMIZATION: Skip expensive parsing for inactive presets
    const segments = useMemo(() => {
        if (!preset.active) return []; // Empty array for inactive presets
        return parseHeadline(preset.headline);
    }, [preset.headline, preset.active]);

    // aicracked, theevolvinggpt, foundrsonig and related Poppins presets: no watermark, Poppins only (case-insensitive)
    const presetNameLower = (preset.name || '').toLowerCase().trim();
    const isAicrackedOrEvolvingPreset =
        presetNameLower === 'aicracked' ||
        presetNameLower === 'theevolvinggpt' ||
        presetNameLower === 'foundrsonig' ||
        presetNameLower === 'indianfoundr' ||
        presetNameLower === 'indiastartupstory' ||
        presetNameLower === 'neworderai' ||
        presetNameLower === 'indiasbestfounders' ||
        presetNameLower === 'elitefoundrs' ||
        presetNameLower === 'intelligence by ai' ||
        presetNameLower === 'startupsoncrack' ||
        presetNameLower === 'millionaire.founders' ||
        presetNameLower === 'startupsxindia' ||
        presetNameLower === 'nobelfounders' ||
        presetNameLower === 'foundersxindia' ||
        presetNameLower === 'startupscheming' ||
        presetNameLower === 'the ai phaze' ||
        presetNameLower === 'that ai page' ||
        presetNameLower === 'revolution in tech' ||
        presetNameLower === 'bestindianpodcast' ||
        presetNameLower === 'risewithcontent';
    // Increase word spacing for presets with all bold white text to prevent overlapping
    const isAllBoldWhite = useMemo(() =>
        preset.name === 'Founders God' || preset.name === 'CEO Mindset India',
        [preset.name]
    );
    const isPoppinsFont = (isAicrackedOrEvolvingPreset && presetNameLower !== 'bestindianpodcast') ||
        preset.name === 'theprimefounder' ||
        preset.name === 'peakofai' ||
        preset.name === 'Founders.India' ||
        preset.name === 'Technology In India' ||
        preset.name === 'Daily Tech India' ||
        preset.name === 'The Prime Ai Page' ||
        preset.name === 'Dhandha India' ||
        preset.name === 'The Ai Gauntlet';
    const effectiveWordSpacing = preset.wordSpacing ?? wordSpacing;
    // OPTIMIZATION: Skip expensive calculations for inactive presets
    const adjustedWordSpacing = useMemo(() => {
        if (!preset.active) return effectiveWordSpacing; // Skip calculation for inactive
        // Increase spacing for all bold presets
        if (isAllBoldWhite) {
            return Math.max(effectiveWordSpacing, 0.2);
        }
        return effectiveWordSpacing;
    }, [isAllBoldWhite, effectiveWordSpacing, preset.name, preset.active]);

    // Ensure preview video is always clearly visible by clamping scale
    const clampedVideoScale = Math.max(localVideoScale || 100, 60);
    const previewVideoScale = clampedVideoScale / 100;

    return (
        <div
            className={`group relative ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-white' : 'bg-black'} flex flex-col items-center select-none border-2 ${preset.active ? 'border-orange-500 ring-2 ring-orange-500/60 shadow-lg shadow-orange-500/20' : 'border-orange-500/50 opacity-70 hover:opacity-90 hover:border-orange-500/80'}`}
            data-preset-name={preset.name}
            style={{
                width: '100%',
                maxWidth: '320px',
                aspectRatio: '9/16',
                fontFamily: "'Inter', sans-serif",
                borderRadius: '8px',
                overflow: 'hidden'
            }}
        >

            {/* MAIN CONTENT AREA - FULL HEIGHT FLEX */}
            {/* This allows us to stack everything (Header -> Text -> Video -> Footer) properly in one flow */}
            <div className={`flex-1 w-full flex flex-col ${justifyClass} relative ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-white' : 'bg-neutral-900'}`}>

                {/* 1a. HOOK_VIDEO HEADER: optional line above hook, then hook text centered on black */}
                {preset.layout === 'hook_video' && (
                    <div className="w-full px-4 pt-4 pb-2 z-10 shrink-0">
                        {showEyebrowInPreview && (
                            <div
                                className={`w-full font-medium ${eyebrowAlignClass}`}
                                style={{
                                    fontSize: `${eyebrowPreviewSize}px`,
                                    lineHeight: 1.35,
                                    color: '#FFFFFF',
                                    fontFamily: "'Inter', sans-serif",
                                    marginBottom: `${eyebrowGapPx}px`,
                                }}
                            >
                                {eyebrowTextTrimmed}
                            </div>
                        )}
                        <div
                            ref={preset.name === 'indian-founders-co' ? headlineRef : undefined}
                            className="w-full text-center"
                            style={{
                                fontSize: `${previewFontSize}px`,
                                lineHeight: 1.35,
                                fontFamily: "'Inter', sans-serif",
                            }}
                        >
                            {(() => {
                                const segments = parseHeadline(preset.headline);
                                return segments.map((segment, idx) => {
                                    if (segment.lineBreak) return <br key={`br-${idx}`} />;
                                    return (
                                    <span
                                        key={idx}
                                        style={{
                                            fontSynthesis: 'none',
                                            color: segment.highlight ? preset.color : '#FFFFFF',
                                            fontWeight: preset.name === 'indian-founders-co'
                                                ? (segment.highlight ? 900 : 400)
                                                : (segment.highlight ? 700 : 400),
                                        }}
                                    >
                                        {segment.text}{' '}
                                    </span>
                                    );
                                });
                            })()}
                        </div>
                    </div>
                )}

                {/* 1b. HEADER SECTION (Stacked inside content flow) */}
                {preset.layout !== 'watermark' && preset.layout !== 'hook_video' && (
                    <div className={`w-full ${preset.name === 'wealth lessons india' ? 'px-4' : 'px-6'} z-10 shrink-0 mb-1`}>
                        {/* SOCIAL HEADER */}
                        {preset.layout === 'social' && preset.name !== 'founderdaily' && preset.name !== 'founderbusinesstips' && preset.name !== 'kwazyfounders' && (
                            <div className={`flex items-center w-full justify-start gap-2`}>
                                {(preset.name !== 'The Real Founder' && preset.name !== 'Inspiring Founder' && preset.name !== 'founders cracked' && preset.name !== 'indian business com') && (
                                    <div className={`w-[70px] h-[70px] ${preset.name === 'Founders God' ? 'rounded-none' : ((preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf') ? 'rounded-lg' : 'rounded-full')} bg-neutral-800 flex items-center justify-center overflow-hidden shadow-sm shrink-0 ${(preset.name === 'Finding Good AI' || preset.name === 'Finding Good Tech' || preset.name === 'startupsinthelast24hrs' || preset.name === 'indian ai future' || preset.name === 'techinthelast24hrs' || preset.name === 'indianaipage' || preset.name === 'indiantechdaily' || preset.name === '101xtechnology' || preset.name === 'Pure Code AI' || preset.name === 'Nobel AI Page' || preset.name === 'therisingai' || preset.name === 'Revolution in ai' || preset.name === 'Founders.India' || preset.name === 'Technology In India' || preset.name === 'Daily Tech India' || preset.name === 'The Prime Ai Page' || preset.name === 'Dhandha India' || preset.name === 'The Ai Gauntlet' || preset.name === 'wealth lessons india' || preset.name === '101xfounders-tweet' || preset.name === 'bizzindia-tweet' || preset.name === 'founders-in-india-tweet' || preset.name === 'indian-founders-co-tweet' || preset.name === 'startupbydog' || preset.name === 'foundersoncrack' || preset.name === 'Entrepreneursindia.co') ? 'ring-1 ring-white/70' : ''} ${isAllBoldWhite ? '-mt-2' : (preset.name === 'The Founders Show' || preset.name === 'Life Wealth Lessons' || preset.name === 'Business India Lessons' || preset.name === 'Billionaires of Bharat' || preset.name === 'CEO Mindset India' || preset.name === 'founders-in-india' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf' || preset.name === 'Entrepreneurial India' || preset.name === 'Finding Good AI' || preset.name === 'Finding Good Tech') ? 'mt-5' : (preset.name === 'startupsinthelast24hrs' || preset.name === 'indian ai future' || preset.name === 'techinthelast24hrs' || preset.name === 'indianaipage' || preset.name === 'indiantechdaily' || preset.name === '101xtechnology' || preset.name === 'Pure Code AI' || preset.name === 'Nobel AI Page' || preset.name === 'therisingai' || preset.name === 'Revolution in ai' || preset.name === 'Founders.India' || preset.name === 'Technology In India' || preset.name === 'Daily Tech India' || preset.name === 'The Prime Ai Page' || preset.name === 'Dhandha India' || preset.name === 'The Ai Gauntlet' || preset.name === '101xfounders-tweet' || preset.name === 'bizzindia-tweet' || preset.name === 'founders-in-india-tweet' || preset.name === 'indian-founders-co-tweet' || preset.name === 'startupbydog' || preset.name === 'foundersoncrack' || preset.name === 'Entrepreneursindia.co') ? 'mt-6' : (preset.name === 'startupcoded') ? 'mt-2' : (preset.name === 'wealth lessons india') ? 'mt-0' : preset.name === 'Founders God' ? 'mt-5' : 'mt-3'}`}>
                                        {getLogoUrl(preset.logo) ? (
                                            <img src={getLogoUrl(preset.logo)} className={`w-full h-full ${preset.name === 'Founders God' ? 'rounded-none' : ((preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf') ? 'rounded-lg' : 'rounded-full')}`} style={{ objectFit: 'cover', transform: (preset.name === 'indianaipage') ? 'scale(1.35)' : (preset.name === 'startupsinthelast24hrs' || preset.name === 'indian ai future' || preset.name === 'techinthelast24hrs' || preset.name === 'indiantechdaily' || preset.name === '101xtechnology' || preset.name === 'therisingai' || preset.name === 'Revolution in ai' || preset.name === 'Founders.India' || preset.name === 'Technology In India' || preset.name === 'Daily Tech India' || preset.name === 'The Prime Ai Page' || preset.name === 'Dhandha India' || preset.name === 'The Ai Gauntlet' || preset.name === '101xfounders-tweet' || preset.name === 'bizzindia-tweet' || preset.name === 'founders-in-india-tweet' || preset.name === 'indian-founders-co-tweet' || preset.name === 'startupbydog' || preset.name === 'foundersoncrack' || preset.name === 'Entrepreneursindia.co') ? 'scale(1.2)' : (preset.name === 'Billionaires of Bharat' || preset.name === 'Business Cracked' || preset.name === 'startupcoded' || preset.name === 'founders-in-india' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf' || preset.name === 'Finding Good AI' || preset.name === 'Finding Good Tech' ? 'scale(1.6)' : (preset.name === 'Life Wealth Lessons' || preset.name === 'Business India Lessons' ? 'scale(1.0)' : (preset.name === 'wealth lessons india' ? 'scale(1.6)' : 'scale(1.6)'))) }} />
                                        ) : (
                                            <span className="text-[7px] font-bold font-serif text-neutral-500 text-center leading-tight">No Logo</span>
                                        )}
                                    </div>
                                )}
                                {(preset.name !== 'The Real Founder' && preset.name !== 'Inspiring Founder' && preset.name !== 'founders cracked' && preset.name !== 'indian business com') && (
                                    <div className="flex flex-col text-left">
                                        <div className={`flex items-center gap-4`}>
                                            <span className={`text-xs font-bold leading-none ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders') ? 'text-black' : 'text-white'}`}>{preset.name === 'founders-in-india' || preset.name === 'founders-in-india-tweet' ? 'Foundersinindia' : (preset.name === '101xfounders-tweet' ? '101xfounders' : (preset.name === 'bizzindia-tweet' ? 'Bizzindia' : (preset.name === 'indian-founders-co-tweet' ? 'Indianfoundersco' : (preset.name === 'foundersoncrack' ? 'Founders on Crack' : (preset.name === 'mktg-wtf' ? 'mktg Wtf' : (preset.name === 'Entrepreneurial India' ? 'Entrepreneurial.India' : preset.name))))))}</span>
                                            <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500 text-black" />
                                        </div>
                                        <span className={`text-[9px] font-medium leading-tight mt-0.5 ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders') ? 'text-neutral-700' : 'text-neutral-400'}`}>{preset.handle}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* LOGO CENTERED */}
                        {preset.layout === 'logo_centered' && getLogoUrl(preset.logo) && (
                            <div className={`flex flex-col items-center justify-center w-full ${isAllBoldWhite ? 'mb-0' : ((preset.name === 'Best Founder Clips' || preset.name === 'best business clips' || preset.name === 'Ads by marketer') ? 'mb-10' : (preset.name === 'startup madness' ? 'mb-6' : ''))}`}>
                                <div className={`${preset.name === 'Best Founder Clips' ? 'w-[120px] h-[85px]' : (preset.name === 'best business clips' ? 'h-[320px]' : (preset.name === 'Ads by marketer' ? 'w-[360px] h-[260px]' : (preset.name === 'startup madness' ? 'w-[80px] h-[80px]' : 'w-[70px] h-[70px]')))} ${(preset.name === 'Best Founder Clips' || preset.name === 'best business clips' || preset.name === 'Ads by marketer') ? 'rounded-none' : (preset.name === 'startup madness' ? 'rounded-xl' : 'rounded-full')} overflow-hidden ${preset.name === 'best business clips' ? 'flex items-center justify-center' : ''}`}>
                                    <img src={getLogoUrl(preset.logo)} className={`${preset.name === 'best business clips' ? 'h-full w-auto' : 'w-full h-full'} ${(preset.name === 'Best Founder Clips' || preset.name === 'best business clips' || preset.name === 'Ads by marketer') ? 'rounded-none' : (preset.name === 'startup madness' ? 'rounded-xl' : 'rounded-full')}`} style={{ objectFit: preset.name === 'best business clips' ? 'contain' : 'cover', transform: (preset.name === 'Best Founder Clips' || preset.name === 'best business clips' || preset.name === 'Ads by marketer') ? 'scale(1.0)' : 'scale(1.2)' }} />
                                </div>
                                {preset.name === 'startup madness' && (
                                    <span className="text-base font-black text-black mt-3 leading-tight" style={{ fontFamily: "'Inter', sans-serif", fontWeight: '900' }}>{preset.name.toUpperCase()}</span>
                                )}
                            </div>
                        )}
                    </div>
                )}


                {/* Tagline for rich indian ceo - just above hook text */}
                {preset.name === 'rich indian ceo' && (
                    <div className="w-full px-6 z-10 flex items-center gap-1" style={{ marginBottom: '35px' }}>
                        <span style={{ fontSize: '11px', color: 'white', fontFamily: "'Inter', sans-serif", fontWeight: 600, letterSpacing: '0.02em' }}>
                            Premium side of Instagram for Founders
                        </span>
                        <span style={{ fontSize: '11px', color: 'white' }}>▶</span>
                    </div>
                )}

                {/* Optional line above hook (e.g. series day counter) — same layouts as main hook */}
                {showMainHookBlock && showEyebrowInPreview && (
                    <div
                        className={`w-full z-10 shrink-0 font-medium ${eyebrowAlignClass}`}
                        style={{
                            fontSize: `${eyebrowPreviewSize}px`,
                            lineHeight: 1.35,
                            color: (preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? '#000000' : '#FFFFFF',
                            fontFamily: isPoppinsFont ? "'Poppins', sans-serif" : "'Inter', sans-serif",
                            marginBottom: `${eyebrowGapPx}px`,
                        }}
                    >
                        {eyebrowTextTrimmed}
                    </div>
                )}

                {/* 2. HOOK TEXT */}
                {preset.layout !== 'hook_video' && preset.name !== 'Best Founder Clips' && preset.name !== 'best business clips' && preset.name !== 'startup madness' && preset.name !== 'Ads by marketer' && (
                    <div
                        ref={headlineRef}
                        data-headline="true"
                        className={`w-full z-10 leading-tight drop-shadow-lg ${preset.name === 'indian-founders-co' ? 'tracking-normal' : 'tracking-tighter'} relative ${isRepositioningHeadline ? 'cursor-move ring-2 ring-yellow-500' : ''} ${isCenterAligned ? 'flex flex-col items-center' : 'flex flex-col items-start'} ${isCenteredLeftAlign ? 'px-14' : (preset.name === 'wealth lessons india' ? 'px-4' : '')}`}
                        style={{
                            fontSize: `${previewFontSize}px`,
                            lineHeight: preset.lineSpacing || 1.25,
                            marginTop: preset.name === 'Best Founder Clips' ? '0.5rem' : (preset.name === 'The Founders Show' || preset.name === 'Life Wealth Lessons' || preset.name === 'Business India Lessons' || preset.name === 'Billionaires of Bharat' || preset.name === 'startupcoded' || preset.name === 'kwazyfounders' || preset.name === 'founders-in-india' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf' || preset.name === 'wealth lessons india' || preset.name === 'Daily Tech India' ? '1rem' : '0'),
                            marginBottom: (isAllBoldWhite || preset.name === 'The Rising Founder' || preset.name === 'The Real Founder' || preset.name === 'Inspiring Founder' || preset.name === 'Business Cracked' || preset.name === 'The Founders Show' || preset.name === 'Life Wealth Lessons' || preset.name === 'Business India Lessons' || preset.name === 'Billionaires of Bharat' || preset.name === 'startupcoded' || preset.name === 'kwazyfounders' || preset.name === 'founders-in-india' || preset.name === 'founders cracked' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf' || preset.name === 'Entrepreneurial India') ? '0' : '0.25rem',
                            ...(localHeadlinePos.x !== 0 && localHeadlinePos.x ? {
                                left: `${localHeadlinePos.x}%`,
                                transform: 'translateX(0)'
                            } : {}),
                            top: `${localHeadlinePos.y || 0}%`,
                            position: 'relative',
                            zIndex: isRepositioningHeadline ? 100 : 10
                        }}
                        onDoubleClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setIsRepositioningHeadline(!isRepositioningHeadline);
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleHeadlineMouseDown(e);
                        }}
                    >
                        {isRepositioningHeadline && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
                                <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                                    <Move size={10} /> Drag Headline (Y-axis)
                                </div>
                            </div>
                        )}
                        <div
                            className="flex flex-wrap"
                            style={{
                                pointerEvents: isRepositioningHeadline ? 'none' : 'auto',
                                justifyContent: isCenterAligned ? 'center' : 'flex-start',
                                gap: `${preset.name === 'indian-founders-co' ? 0.33 : adjustedWordSpacing}em`,
                                letterSpacing: preset.name === 'indian-founders-co' ? '0px' : (isPoppinsFont ? '0px' : undefined)
                            }}
                        >
                            {/* Pre-compute highlight group index for Real India Business dual-color logic */}
                            {(() => {
                                let highlightGroupIndex = 0;
                                let prevWasHighlight = false;
                                const groupMap = segments.map(seg => {
                                    if (seg.lineBreak) { prevWasHighlight = false; return -1; }
                                    if (seg.highlight) {
                                        if (!prevWasHighlight) highlightGroupIndex++;
                                        prevWasHighlight = true;
                                        return highlightGroupIndex;
                                    }
                                    prevWasHighlight = false;
                                    return 0;
                                });
                                return segments.map((segment, idx) => segment.lineBreak ? (
                                <br key={idx} />
                            ) : (
                                <span
                                    key={idx}
                                    style={{
                                        fontSynthesis: 'none',
                                        color: (() => {
                                            const highlightGroup = groupMap[idx];
                                            if (preset.name === 'Real India Business') return highlightGroup === 1 ? '#FF8323' : highlightGroup >= 2 ? '#0DC100' : 'white';
                                            if (preset.name === 'theprimefounder') return segment.highlight ? '#1DB077' : 'white';
                                            if (preset.name === 'foundrsonig') return segment.highlight ? '#ECECDC' : 'white';
                                            if (preset.name === 'indiasbestfounders' || preset.name === 'intelligence by ai') return segment.highlight ? '#ECECDC' : 'white';
                                            if (preset.name === 'elitefoundrs') return segment.highlight ? '#5887FF' : 'white';
                                            if (preset.name === 'indianfoundr') return segment.highlight ? '#487AF9' : 'white';
                                            if (preset.name === 'the ai phaze') return segment.highlight ? '#95C5D1' : 'white';
                                            if (preset.name === 'That AI page') return segment.highlight ? '#6523FF' : 'white';
                                            if (preset.name === 'Revolution in tech') return segment.highlight ? '#FDB05E' : 'white';
                                            if (preset.name === 'indiastartupstory') return segment.highlight ? '#EF5350' : 'white';
                                            if (presetNameLower === 'risewithcontent') return segment.highlight ? '#E53935' : 'white';
                                            if (preset.name === 'The Prime Ai Page') return segment.highlight ? '#FFCD1D' : 'white';
                                            if (preset.name === 'Dhandha India') return segment.highlight ? '#FB9C39' : 'white';
                                            if (preset.name === 'The Ai Gauntlet') return segment.highlight ? '#FFCD1D' : 'white';
                                            if (presetNameLower === 'bestindianpodcast') return segment.highlight ? '#fde601' : 'white';
                                            if (preset.name === 'founders-in-india') return segment.highlight ? '#7F53FF' : 'white';
                                            if (preset.name === 'Entrepreneursindia.co') return 'white';
                                            if (preset.name === 'peakofai' || isAicrackedOrEvolvingPreset) return 'white';
                                            if (['founderdaily', 'founderbusinesstips', 'kwazyfounders', 'startup madness'].includes(preset.name)) return 'black';
                                            if (['Smart Business.in', 'Founders wtf', 'mktg-wtf', 'Business wtf', 'Startups wtf'].includes(preset.name)) return 'white';
                                            if (['Founders God', 'CEO Mindset India', 'The Founders Show', 'Life Wealth Lessons', 'Billionaires of Bharat', 'ceo hustle advice', 'indian hustle advice', 'rich indian ceo', 'startupcoded', 'founders cracked', 'indian business com', 'Entrepreneurial India', 'Finding Good AI', 'Finding Good Tech', 'startupsinthelast24hrs', 'indian ai future', 'techinthelast24hrs', 'indianaipage', 'indiantechdaily', '101xtechnology', 'therisingai', 'Revolution in ai', 'Founders.India', 'Technology In India', 'Daily Tech India', 'The Prime Ai Page', 'Dhandha India', 'The Ai Gauntlet', 'startupbydog', 'foundersoncrack'].includes(preset.name)) return 'white';
                                            return segment.highlight ? preset.color : 'white';
                                        })(),
                                        fontWeight: (() => {
                                            // IFC uses local Inter 400 + 700; don't request weights we don't ship.
                                            if (preset.name === 'indian-founders-co') return segment.highlight ? 800 : 400;
                                            if (preset.name === 'bizzindia' || preset.name === '101xfounders') return segment.highlight ? 900 : 400;
                                            if (preset.name === 'theprimefounder' || preset.name === 'peakofai' || isAicrackedOrEvolvingPreset || preset.name === 'foundrsonig' || preset.name === 'indianfoundr' || preset.name === 'indiastartupstory' || preset.name === 'neworderai') return segment.highlight ? 700 : 400;
                                            if (preset.name === 'startup madness') return 800;
                                            if (preset.name === 'indian business com') return segment.highlight ? 700 : 400;
                                            if (preset.name === 'techinthelast24hrs') return 700;
                                            if (preset.name === 'indianaipage' || preset.name === 'indiantechdaily' || preset.name === '101xtechnology' || preset.name === 'therisingai' || preset.name === 'Revolution in ai' || preset.name === 'Founders.India' || preset.name === 'Technology In India' || preset.name === 'Daily Tech India' || preset.name === 'The Prime Ai Page' || preset.name === 'Dhandha India' || preset.name === 'The Ai Gauntlet' || preset.name === '101xfounders-tweet' || preset.name === 'bizzindia-tweet' || preset.name === 'founders-in-india-tweet' || preset.name === 'indian-founders-co-tweet') return segment.highlight ? 700 : 400;
                                            if (preset.name === 'rich indian ceo' || preset.name === 'Entrepreneurial India') return segment.highlight ? 700 : 400;
                                            if (['founderdaily', 'founderbusinesstips', 'Life Wealth Lessons', 'Billionaires of Bharat', 'indian hustle advice', 'Finding Good AI', 'Finding Good Tech', 'startupsinthelast24hrs', 'indian ai future', 'startupbydog'].includes(preset.name)) return 400;
                                            if (preset.name === 'founders cracked') return segment.highlight ? 700 : 400;
                                            if (preset.name === 'ceo hustle advice') return segment.highlight ? 700 : 400;
                                            if (['Smart Business.in', 'Founders wtf', 'mktg-wtf', 'Business wtf', 'Startups wtf'].includes(preset.name)) return segment.highlight ? 800 : 400;
                                            if (preset.name === 'founders-in-india' || preset.name === 'Entrepreneursindia.co') return segment.highlight ? 700 : 400;
                                            if (preset.name === 'Real India Business') return segment.highlight ? 600 : 300;
                                            if (['Founders God', 'CEO Mindset India', 'startupcoded', 'foundersoncrack'].includes(preset.name)) return 800;
                                            if (['The Founders Show', 'Business India Lessons'].includes(preset.name)) return segment.highlight ? 800 : 400;
                                            return segment.highlight ? 800 : 400;
                                        })(),
                                        fontFamily: ((preset.name === '101xfounders' || preset.name === 'bizzindia' || preset.name === 'indian-founders-co' || presetNameLower === 'bestindianpodcast')
                                                ? "'Inter', sans-serif"
                                                : isPoppinsFont
                                                    ? "'Poppins', sans-serif"
                                                    : (preset.name === 'Smart Business.in' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf') ? "'Inter', sans-serif" : 'inherit')
                                    }}
                                >
                                    {segment.text}
                                </span>
                            ));
                            })()}
                        </div>
                    </div>
                )}

                {/* 3. VIDEO CONTAINER */}
                <div
                    ref={containerRef}
                    className={`w-full relative bg-black shrink-0 group ${isRepositioning ? 'cursor-move ring-2 ring-yellow-500 z-50' : isResizingVideo ? 'ring-2 ring-blue-500 z-50' : 'cursor-pointer'} ''}`}
                    style={{
                        ...getAspectRatioStyle(preset.ratio)
                    }}
                    onDoubleClick={() => setIsRepositioning(!isRepositioning)}
                    onMouseDown={handleMouseDown}
                >
                    {isRepositioning && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
                            <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                                <Move size={10} /> Drag to Reposition
                            </div>
                        </div>
                    )}

                    {isResizingVideo && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
                            <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                                <Move size={10} /> Drag corners to resize
                            </div>
                        </div>
                    )}

                    {/* Resize Handles */}
                    {isResizingVideo && (
                        <>
                            {/* Corner handles */}
                            <div
                                className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize z-50"
                                style={{ top: '-8px', left: '-8px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                            />
                            <div
                                className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize z-50"
                                style={{ top: '-8px', right: '-8px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                            />
                            <div
                                className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nwse-resize z-50"
                                style={{ bottom: '-8px', left: '-8px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                            />
                            <div
                                className="absolute w-4 h-4 bg-blue-500 border-2 border-white rounded-full cursor-nesw-resize z-50"
                                style={{ bottom: '-8px', right: '-8px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'se')}
                            />
                        </>
                    )}

                    <div className={`absolute inset-0 w-full h-full overflow-hidden pointer-events-none ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-white' : 'bg-black'}`}>
                        {videoSrc ? (
                            <video
                                ref={(el) => {
                                    if (isMain) {
                                        if (typeof videoRef === 'function') videoRef(el);
                                        else if (videoRef) videoRef.current = el;
                                    }
                                    videoElementRef.current = el;
                                }}
                                src={videoSrc}
                                className={`w-full h-full ${preset.name === 'startup madness' || preset.name === 'ceo hustle advice' || preset.name === 'indian-founders-co-old' ? 'rounded-2xl' : ''}`}
                                style={{
                                    objectFit: fitMode === 'fill' ? 'fill' : fitMode === 'contain' ? 'contain' : 'cover',
                                    objectPosition: fitMode === 'fill' ? 'center' : `${localPos.x}% ${localPos.y}%`,
                                    // Always fill the frame, then zoom using scale
                                    width: '100%',
                                    height: '100%',
                                    transform: `translate(-50%, -50%) scale(${previewVideoScale})`,
                                    left: '50%',
                                    top: '50%',
                                    position: 'absolute',
                                    borderRadius: (preset.name === 'startup madness' || preset.name === 'ceo hustle advice' || preset.name === 'indian-founders-co-old') ? '16px' : '0',
                                    border: preset.name === 'ceo hustle advice' ? '1px solid #d1d5db' : 'none'
                                }}
                                playsInline
                                muted={isMuted}
                                autoPlay={false}
                                loop={false}
                                data-preset-id={preset.id}
                            />
                        ) : (
                            <div className={`w-full h-full flex items-center justify-center ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-neutral-200' : 'bg-neutral-800'} ${preset.name === 'startup madness' || preset.name === 'ceo hustle advice' || preset.name === 'indian-founders-co-old' ? 'rounded-2xl' : ''}`}>
                                <span className="text-sm text-neutral-500 font-mono">{preset.ratio}</span>
                            </div>
                        )}

                        {/* Logo overlay for The Rising Founder - TOP RIGHT */}
                        {preset.name === 'The Rising Founder' && getLogoUrl(preset.logo) && (
                            <div className="absolute top-0 right-0 z-50 p-2">
                                <img src={getLogoUrl(preset.logo)} className="w-40 h-40" style={{ objectFit: 'contain' }} />
                            </div>
                        )}

                        {/* Logo overlay for The Real Founder - TOP RIGHT */}
                        {preset.name === 'The Real Founder' && getLogoUrl(preset.logo) && (
                            <div className="absolute top-0 right-0 z-50 p-2">
                                <img src={getLogoUrl(preset.logo)} className="w-40 h-40" style={{ objectFit: 'contain' }} />
                            </div>
                        )}

                        {/* Logo overlay for hook_video layout - TOP RIGHT with 50% opacity */}
                        {preset.layout === 'hook_video' && getLogoUrl(preset.logo) && (
                            <div className="absolute top-2 right-2 z-50">
                                <img src={getLogoUrl(preset.logo)} className="w-16 h-16 rounded-full" style={{ objectFit: 'cover', opacity: preset.rules?.logoOpacity || 0.5 }} />
                            </div>
                        )}

                        {/* Logo overlay for Inspiring Founder - TOP LEFT */}
                        {preset.name === 'Inspiring Founder' && getLogoUrl(preset.logo) && (
                            <div className="absolute top-0 left-0 z-50 p-2">
                                <img src={getLogoUrl(preset.logo)} className="w-40 h-40" style={{ objectFit: 'contain' }} />
                            </div>
                        )}

                        {/* Logo overlay for ceo hustle advice - TOP LEFT (inside video frame) */}
                        {preset.name === 'ceo hustle advice' && getLogoUrl(preset.logo) && (
                            <div className="absolute top-2 left-2 z-50">
                                <div className="w-32 h-32 rounded-full overflow-hidden">
                                    <img src={getLogoUrl(preset.logo)} className="w-full h-full" style={{ objectFit: 'cover' }} />
                                </div>
                            </div>
                        )}

                        {/* WATERMARK OVERLAY */}
                        {preset.layout === 'watermark' && preset.name !== 'The Rising Founder' && preset.name !== 'ceo hustle advice' && preset.name !== 'peakofai' && preset.name !== 'theprimefounder' && preset.name !== 'neworderai' && preset.name !== 'indian business com' && !isAicrackedOrEvolvingPreset && (
                            <div
                                ref={watermarkRef}
                                className={`absolute left-0 w-full flex justify-center z-20 ${isRepositioningWatermark ? 'cursor-move ring-2 ring-yellow-500' : 'pointer-events-none'}`}
                                style={{
                                    bottom: `${localWatermarkPos.y}px`,
                                    left: `${localWatermarkPos.x}%`,
                                    transform: 'translate(-50%, 0)',
                                    pointerEvents: isRepositioningWatermark ? 'auto' : 'none'
                                }}
                                onDoubleClick={(e) => { e.stopPropagation(); setIsRepositioningWatermark(!isRepositioningWatermark); }}
                                onMouseDown={handleWatermarkMouseDown}
                            >
                                {isRepositioningWatermark && (
                                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
                                        <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                                            <Move size={10} /> Drag Watermark
                                        </div>
                                    </div>
                                )}
                                <span
                                    className={preset.name === '101xfounders' || preset.name === 'bizzindia' || preset.name === 'indian-founders-co' ? "font-light tracking-wide font-inter" : "font-bold tracking-wide font-inter"}
                                    style={{
                                        fontSize: '11px',
                                        color: 'rgba(255, 255, 255, 0.5)',
                                        textShadow: '0px 1px 2px rgba(0,0,0,0.8)'
                                    }}
                                >
                                    {preset.handle}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. CREDIT TEXT (Footer) - Left Aligned below video, matching export layout */}
                {showCredit && preset.layout !== 'hook_video' && preset.name !== 'peakofai' && preset.name !== 'theprimefounder' && preset.name !== 'neworderai' && !isAicrackedOrEvolvingPreset && (
                    <div
                        ref={creditRef}
                        className={`w-full z-10 text-left px-6 relative ${isRepositioningCredit ? 'cursor-move ring-2 ring-yellow-500' : ''}`}
                        style={{
                            left: `${localCreditPos.x}%`,
                            top: `${localCreditPos.y}%`,
                            position: 'relative',
                            marginTop: '4px'
                        }}
                        onDoubleClick={(e) => { e.stopPropagation(); setIsRepositioningCredit(!isRepositioningCredit); }}
                        onMouseDown={handleCreditMouseDown}
                    >
                        {isRepositioningCredit && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 pointer-events-none">
                                <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1">
                                    <Move size={10} /> Drag Credit
                                </div>
                            </div>
                        )}
                        <p className={`text-[8px] font-bold font-inter ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'text-black' : 'text-white'}`} style={{
                            letterSpacing: '0.5px',
                            color: (preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? '#000000' : undefined,
                            textShadow: 'none'
                        }}>
                            {preset.footer}
                        </p>
                    </div>
                )}

            </div>

            {/* Always-visible "Select for export" control on each preset card */}
            <button
                onClick={() => onToggle(preset.id)}
                title="Select preset for export"
                className={`absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium shadow-lg border-2 transition-all min-w-[88px] justify-center ${preset.active ? 'bg-orange-500 text-black border-orange-400 ring-1 ring-orange-300' : 'bg-neutral-800/95 text-neutral-300 border-orange-500/60 hover:border-orange-500 hover:bg-orange-500/20 backdrop-blur-sm'}`}
            >
                {preset.active ? <CheckSquare size={14} className="shrink-0" /> : <Square size={14} className="shrink-0 text-orange-400" />}
                <span>{preset.active ? 'Selected' : 'Select'}</span>
            </button>

            <div className="absolute top-2 right-2 flex gap-1 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); setIsRepositioning(!isRepositioning); setIsResizingVideo(false); }}
                    className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioning ? 'bg-blue-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-blue-600`}
                    title="Reposition Video"
                >
                    <Move size={12} />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); setIsResizingVideo(!isResizingVideo); setIsRepositioning(false); }}
                    className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isResizingVideo ? 'bg-blue-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-blue-600`}
                    title="Resize Video"
                >
                    <Maximize size={12} />
                </button>

                {preset.layout === 'watermark' && preset.name !== 'peakofai' && preset.name !== 'theprimefounder' && preset.name !== 'neworderai' && !isAicrackedOrEvolvingPreset && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsRepositioningWatermark(!isRepositioningWatermark); }}
                        className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioningWatermark ? 'bg-green-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-green-600`}
                        title="Reposition Watermark"
                    >
                        <Type size={12} />
                    </button>
                )}

                <button
                    onClick={(e) => { e.stopPropagation(); setIsRepositioningCredit(!isRepositioningCredit); }}
                    className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioningCredit ? 'bg-purple-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-purple-600`}
                    title="Reposition Credit"
                >
                    <Edit2 size={12} />
                </button>

                <button
                    onClick={(e) => { e.stopPropagation(); setIsRepositioningHeadline(!isRepositioningHeadline); }}
                    className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioningHeadline ? 'bg-orange-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-orange-600`}
                    title="Reposition Headline"
                >
                    <Type size={12} />
                </button>
            </div>

            {preset.name === 'indian-founders-co' && ifcFontInfo && (
                <div className="absolute bottom-2 left-2 right-2 z-30 bg-black/80 text-white text-[10px] px-2 py-1 rounded pointer-events-none">
                    <div>computed family: {ifcFontInfo.family}</div>
                    <div>computed weight: {ifcFontInfo.weight}</div>
                    <div>Inter loaded: any {String(ifcFontInfo.interAny)} | 400 {String(ifcFontInfo.inter400)} | 700 {String(ifcFontInfo.inter700)} | 800 {String(ifcFontInfo.inter800)} | 900 {String(ifcFontInfo.inter900)}</div>
                </div>
            )}

            {isRepositioning && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsRepositioning(false)} />
            )}
            {isResizingVideo && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsResizingVideo(false)} />
            )}
            {isRepositioningHeadline && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsRepositioningHeadline(false)} />
            )}
        </div>
    );
});


export default function App() {
    const [videoSrc, setVideoSrc] = useState(null);
    const videoFileRef = useRef(null); // Store original file for server upload
    const [presets, setPresets] = useState(INITIAL_PRESETS);
    const [isDraggingVideo, setIsDraggingVideo] = useState(false);

    // Config
    const [viewMode, setViewMode] = useState('grid');
    const [fitMode, setFitMode] = useState('cover');
    const [fontScale, setFontScale] = useState(1);
    const [editMode, setEditMode] = useState('global');
    const [videoScale, setVideoScale] = useState(100); // Video scale in percentage (100 = 100%)
    const [showCredit, setShowCredit] = useState(true); // Toggle credit visibility
    const [wordSpacing, setWordSpacing] = useState(0.25); // Word spacing multiplier (0.25 = 25% of normal space width for very tight, natural spacing)

    // Global Text State
    const [globalHeadline, setGlobalHeadline] = useState(DEFAULT_HEADLINE);
    const [globalFooter, setGlobalFooter] = useState(DEFAULT_FOOTER);
    const [globalHookEyebrow, setGlobalHookEyebrow] = useState('');
    const [globalShowHookEyebrow, setGlobalShowHookEyebrow] = useState(false);
    const [globalHookEyebrowAlignment, setGlobalHookEyebrowAlignment] = useState('left');
    const [globalHookEyebrowSizeScale, setGlobalHookEyebrowSizeScale] = useState(1.1);
    const [globalHookEyebrowGapScale, setGlobalHookEyebrowGapScale] = useState(1.35);
    const [ideaName, setIdeaName] = useState('');

    // System
    const videoRef = useRef(null);
    const exportAbortControllerRef = useRef(null);
    const serverPollIntervalRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const [cloudLinks, setCloudLinks] = useState([]);
    const [exportProgress, setExportProgress] = useState(0);
    const [showKoushikPopup, setShowKoushikPopup] = useState(false);
    const [presetSearch, setPresetSearch] = useState('');

    const searchQuery = (presetSearch || '').trim().toLowerCase();

    // --- PASTE LISTENER ---
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob.type.startsWith('video/')) {
                        // Convert blob to File for server upload
                        const file = new File([blob], 'pasted-video.mp4', { type: blob.type });
                        videoFileRef.current = file;
                        setVideoSrc(URL.createObjectURL(blob));
                        setIsPlaying(true);
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, []);

    // --- HANDLERS ---
    const handleVideoUpload = useCallback((e) => {
        const file = e.target.files[0];
        if (file) {
            videoFileRef.current = file; // Store original file for server upload
            setVideoSrc(URL.createObjectURL(file));
            setIsPlaying(true);
        }
    }, []);

    const onDragOverVideo = (e) => { e.preventDefault(); setIsDraggingVideo(true); };
    const onDragLeaveVideo = (e) => { e.preventDefault(); setIsDraggingVideo(false); };
    const onDropVideo = (e) => {
        e.preventDefault(); setIsDraggingVideo(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            videoFileRef.current = file; // Store original file for server upload
            setVideoSrc(URL.createObjectURL(file));
            setIsPlaying(true);
        }
    };

    const onDropLogo = (e, id) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const url = URL.createObjectURL(file);
            setPresets(prev => prev.map(p => p.id === id ? { ...p, logo: url } : p));
        }
    };

    const handlePresetLogoUpload = useCallback((e, id) => {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setPresets(prev => prev.map(p => p.id === id ? { ...p, logo: url } : p));
            // Reset the input so the same file can be uploaded again
            e.target.value = '';
        }
    }, []);

    // Text Handlers
    const updateGlobalText = (headline, footer) => {
        setGlobalHeadline(headline);
        setGlobalFooter(footer);
        setPresets(prev => prev.map(p => ({
            ...p,
            headline: headline,
            footer: footer
        })));
    };

    const updateIndividualText = (id, field, value) => {
        setPresets(prev => prev.map(p =>
            p.id === id ? { ...p, [field]: value } : p
        ));
    };

    const updateGlobalHookEyebrow = (text, show) => {
        setGlobalHookEyebrow(text);
        setGlobalShowHookEyebrow(show);
        setPresets(prev => prev.map(p => ({
            ...p,
            hookEyebrow: text,
            showHookEyebrow: show,
        })));
    };

    const updateGlobalHookEyebrowStyle = (field, value) => {
        if (field === 'hookEyebrowAlignment') setGlobalHookEyebrowAlignment(value);
        if (field === 'hookEyebrowSizeScale') setGlobalHookEyebrowSizeScale(value);
        if (field === 'hookEyebrowGapScale') setGlobalHookEyebrowGapScale(value);
        setPresets(prev => prev.map(p => ({
            ...p,
            [field]: value,
        })));
    };

    const handlePositionChange = useCallback((id, pos) => {
        setPresets(prev => prev.map(p =>
            p.id === id ? { ...p, position: pos } : p
        ));
    }, []);

    const handleCreditPositionChange = useCallback((id, pos) => {
        setPresets(prev => prev.map(p =>
            p.id === id ? { ...p, creditPosition: pos } : p
        ));
    }, []);

    const handleWatermarkPositionChange = useCallback((id, pos) => {
        setPresets(prev => prev.map(p =>
            p.id === id ? { ...p, watermarkPosition: pos } : p
        ));
    }, []);

    const handleHeadlinePositionChange = useCallback((id, pos) => {
        setPresets(prev => prev.map(p =>
            p.id === id ? { ...p, headlinePosition: pos } : p
        ));
    }, []);

    const handleVideoScaleChange = useCallback((scale) => {
        setVideoScale(scale);
    }, []);

    const togglePlay = useCallback(() => {
        // Only play/pause videos for ACTIVE presets to reduce resource usage
        const activePresetIds = presets.filter(p => p.active).map(p => p.id);
        const videos = document.querySelectorAll('video[data-preset-id]');
        videos.forEach(v => {
            const presetId = parseInt(v.getAttribute('data-preset-id'));
            if (activePresetIds.includes(presetId)) {
                // Only control videos for active presets
                if (isPlaying) {
                    v.pause();
                } else {
                    v.play().catch(() => { });
                }
            } else {
                // Always pause inactive preset videos
                v.pause();
            }
        });
        setIsPlaying(!isPlaying);
    }, [isPlaying, presets]);

    const toggleMute = useCallback(() => {
        // Only mute/unmute videos for ACTIVE presets
        const activePresetIds = presets.filter(p => p.active).map(p => p.id);
        const videos = document.querySelectorAll('video[data-preset-id]');
        videos.forEach(v => {
            const presetId = parseInt(v.getAttribute('data-preset-id'));
            if (activePresetIds.includes(presetId)) {
                v.muted = !isMuted;
            }
        });
        setIsMuted(!isMuted);
    }, [isMuted, presets]);

    const togglePresetActive = useCallback((id) => {
        setPresets(prev => {
            const updated = prev.map(p => p.id === id ? { ...p, active: !p.active } : p);
            // Immediately pause/play videos based on new active state
            const video = document.querySelector(`video[data-preset-id="${id}"]`);
            if (video) {
                const newPreset = updated.find(p => p.id === id);
                if (newPreset && newPreset.active && isPlaying) {
                    video.play().catch(() => { });
                    video.loop = true;
                } else {
                    video.pause();
                    video.loop = false;
                }
            }
            return updated;
        });
    }, [isPlaying]);


    // Server API URL: use the same hostname but on port 3002 (backend).
    // This works for localhost, EC2 public IP, and ngrok (via proxy).
    // For ngrok, the Vite proxy handles /api → localhost:3002.
    // For direct EC2 access, we talk to port 3002 directly (CORS enabled).
    const SERVER_URL = typeof window !== 'undefined'
        ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? window.location.origin  // localhost: use Vite proxy
            : window.location.origin.includes('ngrok')
                ? window.location.origin  // ngrok: use Vite proxy
                : `http://${window.location.hostname}:3002`)  // EC2/remote: talk to backend directly
        : ((import.meta.env.VITE_SERVER_URL && import.meta.env.VITE_SERVER_URL.trim()) || '');

    // --- SERVER-SIDE EXPORT LOGIC ---
    const processServerExport = async () => {
        const activePresets = presets.filter(p => p.active);
        if (!videoSrc || activePresets.length === 0) return;

        // Abort any previous export and clear polling
        if (exportAbortControllerRef.current) exportAbortControllerRef.current.abort();
        if (serverPollIntervalRef.current) {
            clearInterval(serverPollIntervalRef.current);
            serverPollIntervalRef.current = null;
        }
        const abortController = new AbortController();
        exportAbortControllerRef.current = abortController;
        const signal = abortController.signal;

        setIsExporting(true);
        setExportStatus('Uploading video to server...');
        setExportProgress(0);

        try {
            // Get video file - use stored file reference
            let videoFile = videoFileRef.current;

            // If no file reference, try to get it from blob URL
            if (!videoFile && videoSrc) {
                if (videoSrc.startsWith('blob:')) {
                    try {
                        const response = await fetch(videoSrc, { signal });
                        const blob = await response.blob();
                        videoFile = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
                    } catch (err) {
                        if (err.name === 'AbortError') return;
                        console.error('Error fetching blob:', err);
                        setExportStatus('Error: Could not access video file. Please re-upload the video.');
                        setIsExporting(false);
                        return;
                    }
                } else {
                    setExportStatus('Error: Please re-upload the video file.');
                    setIsExporting(false);
                    return;
                }
            }

            if (!videoFile) {
                setExportStatus('Error: No video file available. Please upload a video first.');
                setIsExporting(false);
                return;
            }

            // Append small fields FIRST so proxies (ngrok/Vite) don't truncate preset data
            const formData = new FormData();
            formData.append('presets', JSON.stringify(activePresets));
            formData.append('headline', globalHeadline);
            formData.append('fontScale', fontScale.toString());
            formData.append('wordSpacing', wordSpacing.toString());
            formData.append('videoScale', videoScale.toString());
            formData.append('fitMode', fitMode);
            formData.append('showCredit', showCredit.toString());
            formData.append('ideaName', ideaName || '');
            formData.append('video', videoFile);

            console.log('Uploading video to server...', {
                fileName: videoFile.name,
                fileSize: (videoFile.size / 1024 / 1024).toFixed(2) + ' MB',
                fileType: videoFile.type,
                presetCount: activePresets.length
            });

            setExportStatus('Uploading video file...');
            const uploadResponse = await fetch(`${SERVER_URL}/api/export`, {
                method: 'POST',
                body: formData,
                signal
            });

            if (signal.aborted) return;

            if (!uploadResponse.ok) {
                let errorText;
                try {
                    const errorJson = await uploadResponse.json();
                    errorText = errorJson.error || JSON.stringify(errorJson);
                } catch {
                    errorText = await uploadResponse.text();
                }
                throw new Error(`Upload failed: ${errorText}`);
            }

            const { jobId } = await uploadResponse.json();
            if (signal.aborted) return;

            setExportStatus(`Processing on server... (Job: ${jobId})`);

            const poll = async () => {
                if (signal.aborted) return;
                try {
                    const statusResponse = await fetch(`${SERVER_URL}/api/job/${jobId}`, { signal });
                    if (signal.aborted) return;
                    if (!statusResponse.ok) throw new Error('Failed to get job status');

                    const jobStatus = await statusResponse.json();
                    if (signal.aborted) return;

                    if (jobStatus.state === 'completed') {
                        if (serverPollIntervalRef.current) {
                            clearInterval(serverPollIntervalRef.current);
                            serverPollIntervalRef.current = null;
                        }
                        setExportStatus('Export complete! Downloading...');
                        setExportProgress(100);

                        try {
                            // Download zip (retry a few times since zip creation can lag behind job completion)
                            const zipUrl = `${SERVER_URL}/api/download/${jobId}`;
                            const maxAttempts = 6;
                            let lastErr = null;

                            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                                if (signal.aborted) return;
                                setExportStatus(`Export complete! Downloading... (attempt ${attempt}/${maxAttempts})`);

                                const dlResponse = await fetch(zipUrl, { signal });
                                if (dlResponse.ok) {
                                    const blob = await dlResponse.blob();
                                    const blobUrl = window.URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = blobUrl;
                                    a.download = `export-${jobId}.zip`;
                                    document.body.appendChild(a);
                                    a.click();
                                    a.remove();
                                    window.URL.revokeObjectURL(blobUrl);
                                    lastErr = null;
                                    break;
                                }

                                // Try to surface a meaningful server error to the user
                                let serverMsg = `HTTP ${dlResponse.status}`;
                                try {
                                    const j = await dlResponse.json();
                                    serverMsg = j?.error || JSON.stringify(j);
                                } catch {
                                    try { serverMsg = (await dlResponse.text()) || serverMsg; } catch { }
                                }
                                lastErr = new Error(serverMsg);

                                // Not ready yet (common): wait and retry
                                if (dlResponse.status === 404 || dlResponse.status === 409 || dlResponse.status === 425) {
                                    await new Promise(r => setTimeout(r, 1000));
                                    continue;
                                }

                                // Anything else: stop retrying
                                break;
                            }

                            if (lastErr) throw lastErr;

                            setIsExporting(false);
                            setExportStatus('');
                            setExportProgress(0);
                        } catch (err) {
                            if (err.name === 'AbortError') return;
                            console.error('Download error:', err);
                            setExportStatus(`Download failed: ${err.message}`);
                            setIsExporting(false);
                            setTimeout(() => { setExportStatus(''); setExportProgress(0); }, 5000);
                        }
                    } else if (jobStatus.state === 'failed') {
                        if (serverPollIntervalRef.current) {
                            clearInterval(serverPollIntervalRef.current);
                            serverPollIntervalRef.current = null;
                        }
                        const reason = jobStatus.failedReason || 'Unknown error. Check server console.';
                        setExportStatus(`Export failed: ${reason}`);
                        setIsExporting(false);
                        setTimeout(() => { setExportStatus(''); setExportProgress(0); }, 8000);
                    } else {
                        if (jobStatus.progress && typeof jobStatus.progress === 'object') {
                            const { current, total } = jobStatus.progress;
                            const progress = total > 0 ? (current / total) * 100 : 0;
                            setExportProgress(progress);
                            setExportStatus(`Processing: ${jobStatus.progress.preset || ''} (${current}/${total})`);
                        }
                    }
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    console.error('Error polling job status:', err);
                    if (serverPollIntervalRef.current) {
                        clearInterval(serverPollIntervalRef.current);
                        serverPollIntervalRef.current = null;
                    }
                    setExportStatus('Error checking status');
                    setIsExporting(false);
                }
            };

            serverPollIntervalRef.current = setInterval(poll, 2000);
            poll(); // run once immediately
        } catch (error) {
            if (error.name === 'AbortError') {
                setExportStatus('Stopped');
                setExportProgress(0);
                setIsExporting(false);
                setTimeout(() => setExportStatus(''), 1500);
                return;
            }
            console.error('Server export error:', error);
            setExportStatus(`Error: ${error.message}`);
            setIsExporting(false);
            setTimeout(() => {
                setExportStatus('');
                setExportProgress(0);
            }, 3000);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col h-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

            <style>
                {`
                /* Poppins for theprimefounder, aicracked, theevolvinggpt (served from public/fonts/) */
                @font-face {
                    font-family: 'Poppins';
                    font-style: normal;
                    font-weight: 400;
                    font-display: swap;
                    src: url('/fonts/Poppins-Regular.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Poppins';
                    font-style: normal;
                    font-weight: 700;
                    font-display: swap;
                    src: url('/fonts/Poppins-Bold.ttf') format('truetype');
                }
                @font-face {
                    font-family: 'Poppins';
                    font-style: normal;
                    font-weight: 100;
                    font-display: swap;
                    src: url('/fonts/Poppins-Thin.ttf') format('truetype');
                }
                `}
            </style>

            {/* --- PINNED HEADER --- */}
            <div className="fixed top-0 left-0 right-0 bg-neutral-800 border-b border-neutral-700 z-50 shadow-lg">
                <div className="p-4">
                    <div className="flex items-center justify-between">
                        <div className="w-24" />
                        <h1
                            className="text-2xl font-bold text-center text-orange-500 cursor-pointer select-none"
                            onDoubleClick={() => setShowKoushikPopup(true)}
                        >
                            PINTU
                        </h1>
                        <div className="flex items-center gap-3">
                            <a href="/silence-remover.html" className="text-xs text-orange-500 hover:text-orange-400 transition-colors">
                                Silence Remover
                            </a>
                            <a href="/transcribe.html" className="text-xs text-orange-500 hover:text-orange-400 transition-colors">
                                Transcribe
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- KOUSHIK POPUP --- */}
            {showKoushikPopup && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowKoushikPopup(false)}
                >
                    <div
                        className="bg-neutral-800 border-2 border-orange-500 rounded-xl p-8 shadow-2xl max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center space-y-3">
                            <h2 className="text-3xl font-bold text-orange-500">PROGRAMMED BY KOUSHIK</h2>
                            <h3 className="text-2xl font-bold text-orange-400">DESIGNED BY RJOE</h3>
                            <p className="text-xl text-neutral-300 italic">MADE USING POWER OF FRIENDSHIP</p>
                            <button
                                onClick={() => setShowKoushikPopup(false)}
                                className="mt-6 px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT WRAPPER --- */}
            <div className="flex flex-col md:flex-row h-full pt-16">
                {/* --- LEFT PANEL --- */}
                <div className="w-full md:w-[500px] bg-neutral-800 border-r border-neutral-700 flex flex-col h-full overflow-y-auto z-20 shadow-xl shrink-0">

                    <div className="p-6 space-y-6 pb-32">

                        {/* UPLOAD */}
                        <div className="bg-neutral-800/50 rounded-xl overflow-hidden border border-neutral-700/50">
                            <div className="bg-neutral-700/50 px-6 py-3 border-b border-neutral-700/50">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300">UPLOAD AN ANIMATED VIDEO</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div
                                    className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center gap-4 transition-all duration-200 relative cursor-pointer group ${isDraggingVideo ? 'border-orange-500 bg-orange-500/10 scale-105' : 'border-neutral-500 bg-neutral-800/30 hover:border-orange-500 hover:bg-orange-500/10 hover:scale-[1.02]'}`}
                                    onDragOver={onDragOverVideo}
                                    onDragLeave={onDragLeaveVideo}
                                    onDrop={onDropVideo}
                                >
                                    <span className={`text-sm transition-colors duration-200 ${isDraggingVideo ? 'text-orange-500' : 'text-neutral-400 group-hover:text-orange-500'}`}>{videoSrc ? 'Replace Video' : 'upload or browse video'}</span>
                                    <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVideoUpload} />
                                </div>
                            </div>
                        </div>

                        {/* IDEA NAME (GLOBAL) */}
                        <div className="bg-neutral-800/50 rounded-xl overflow-hidden border border-neutral-700/50">
                            <div className="bg-neutral-700/50 px-6 py-3 border-b border-neutral-700/50">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 text-center">IDEA NAME</h2>
                            </div>
                            <div className="p-6 space-y-2">
                                <label className="text-xs text-neutral-300">Name of the idea</label>
                                <input
                                    type="text"
                                    value={ideaName}
                                    onChange={(e) => setIdeaName(e.target.value)}
                                    placeholder="e.g. The trick to making your employees loyal"
                                    className="w-full px-3 py-2 text-sm text-white bg-neutral-900 border border-neutral-700 rounded-md focus:outline-none focus:border-orange-500 placeholder:text-neutral-500"
                                />
                            </div>
                        </div>

                        {/* TEXT EDIT */}
                        <div className="bg-neutral-800/50 rounded-xl overflow-hidden border border-neutral-700/50">
                            <div className="bg-neutral-700/50 px-6 py-3 border-b border-neutral-700/50">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-300 text-center">TEXT AND LAYOUT</h2>
                            </div>
                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-neutral-300">Text Settings</span>
                                    <div className="flex bg-neutral-700 rounded p-0.5">
                                        <button
                                            onClick={() => setEditMode('global')}
                                            className={`px-3 py-1.5 text-xs rounded transition-all ${editMode === 'global' ? 'bg-neutral-600 text-neutral-300' : 'text-neutral-400 hover:text-neutral-300'}`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setEditMode('individual')}
                                            className={`px-3 py-1.5 text-xs rounded transition-all font-semibold ${editMode === 'individual' ? 'bg-orange-500 text-white' : 'text-neutral-400 hover:text-neutral-300'}`}
                                        >
                                            Per Brand
                                        </button>
                                    </div>
                                </div>

                                {/* TEXT SIZE & LETTER SPACING - only in All (global) mode; per-brand has its own below */}
                                {editMode === 'global' && (
                                    <>
                                        <div className="space-y-2">
                                            <label className="text-xs text-neutral-300">Text Size</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min="0.5"
                                                    max="1.5"
                                                    step="0.1"
                                                    value={fontScale}
                                                    onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                                    className="flex-1 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                />
                                                <input
                                                    type="number"
                                                    value={Math.round(fontScale * 10)}
                                                    onChange={(e) => {
                                                        const val = Math.max(5, Math.min(15, parseInt(e.target.value) || 10));
                                                        setFontScale(val / 10);
                                                    }}
                                                    className="w-12 px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-neutral-300">Letter Spacing</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="range"
                                                    min="0.1"
                                                    max="1.5"
                                                    step="0.05"
                                                    value={wordSpacing}
                                                    onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                                                    className="flex-1 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                />
                                                <input
                                                    type="number"
                                                    value={Math.round(wordSpacing * 10)}
                                                    onChange={(e) => {
                                                        const val = Math.max(1, Math.min(15, parseInt(e.target.value) || 10));
                                                        setWordSpacing(val / 10);
                                                    }}
                                                    className="w-12 px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* LINE SPACING SLIDER - applies to all presets when in global mode */}
                                {editMode === 'global' && (
                                    <div className="space-y-2">
                                        <label className="text-xs text-neutral-300">Line Spacing</label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="range"
                                                min="0.8"
                                                max="2.0"
                                                step="0.05"
                                                value={presets[0]?.lineSpacing ?? 1.25}
                                                onChange={(e) => {
                                                    const val = parseFloat(e.target.value);
                                                    setPresets(prev => prev.map(p => ({ ...p, lineSpacing: val })));
                                                }}
                                                className="flex-1 h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                            />
                                            <input
                                                type="number"
                                                min="8"
                                                max="20"
                                                value={Math.round((presets[0]?.lineSpacing ?? 1.25) * 10)}
                                                onChange={(e) => {
                                                    const val = Math.max(8, Math.min(20, parseInt(e.target.value) || 10));
                                                    setPresets(prev => prev.map(p => ({ ...p, lineSpacing: val / 10 })));
                                                }}
                                                className="w-12 px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* EDIT MODE: GLOBAL */}
                                {editMode === 'global' && (
                                    <>
                                        <RichTextEditor
                                            value={globalHeadline}
                                            onChange={(html) => updateGlobalText(html, globalFooter)}
                                            placeholder="Hook....."
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-3 text-sm text-white placeholder-neutral-500 focus:border-orange-500 focus:outline-none font-medium min-h-[80px]"
                                        />

                                        <input
                                            type="text"
                                            value={globalFooter}
                                            onChange={(e) => updateGlobalText(globalHeadline, e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-neutral-400 font-medium placeholder-neutral-600 focus:border-yellow-500 focus:outline-none"
                                            placeholder="Credit for ALL videos"
                                        />
                                        <div className="space-y-2 pt-1 border-t border-neutral-700">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="checkbox"
                                                    id="show-hook-eyebrow-global"
                                                    checked={globalShowHookEyebrow}
                                                    onChange={(e) => updateGlobalHookEyebrow(globalHookEyebrow, e.target.checked)}
                                                    className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-orange-500 focus:ring-orange-500 accent-orange-500"
                                                />
                                                <label htmlFor="show-hook-eyebrow-global" className="text-xs text-neutral-300 cursor-pointer">
                                                    Line above hook (series / day line)
                                                </label>
                                            </div>
                                            <input
                                                type="text"
                                                value={globalHookEyebrow}
                                                onChange={(e) => updateGlobalHookEyebrow(e.target.value, globalShowHookEyebrow)}
                                                disabled={!globalShowHookEyebrow}
                                                className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white placeholder-neutral-600 focus:border-orange-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                                placeholder="e.g. Day 23 of Founder series to help you grow in life"
                                            />
                                            <div className="grid grid-cols-3 gap-2">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-neutral-400">Series Size</label>
                                                    <input
                                                        type="number"
                                                        min="8"
                                                        max="20"
                                                        value={Math.round(globalHookEyebrowSizeScale * 10)}
                                                        onChange={(e) => {
                                                            const val = Math.max(8, Math.min(20, parseInt(e.target.value, 10) || 11)) / 10;
                                                            updateGlobalHookEyebrowStyle('hookEyebrowSizeScale', val);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-neutral-400">Series Gap</label>
                                                    <input
                                                        type="number"
                                                        min="5"
                                                        max="25"
                                                        value={Math.round(globalHookEyebrowGapScale * 10)}
                                                        onChange={(e) => {
                                                            const val = Math.max(5, Math.min(25, parseInt(e.target.value, 10) || 14)) / 10;
                                                            updateGlobalHookEyebrowStyle('hookEyebrowGapScale', val);
                                                        }}
                                                        className="w-full px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] text-neutral-400">Series Align</label>
                                                    <div className="flex gap-1">
                                                        {['left', 'center'].map((align) => (
                                                            <button
                                                                key={align}
                                                                type="button"
                                                                onClick={() => updateGlobalHookEyebrowStyle('hookEyebrowAlignment', align)}
                                                                className={`flex-1 px-2 py-1 text-[10px] rounded border ${globalHookEyebrowAlignment === align ? 'bg-orange-500 text-black border-orange-500 font-semibold' : 'bg-transparent text-neutral-300 border-neutral-600 hover:border-neutral-400'}`}
                                                            >
                                                                {align === 'left' ? 'Left' : 'Center'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="show-credit-toggle"
                                                checked={showCredit}
                                                onChange={(e) => setShowCredit(e.target.checked)}
                                                className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-orange-500 focus:ring-orange-500 accent-orange-500"
                                            />
                                            <label htmlFor="show-credit-toggle" className="text-xs text-neutral-400 cursor-pointer">
                                                Credit
                                            </label>
                                        </div>
                                        <p className="text-[10px] text-neutral-500">Updating this overwrites all brands.</p>
                                    </>
                                )}

                                {/* EDIT MODE: INDIVIDUAL - only show presets the user has selected for export */}
                                {editMode === 'individual' && (
                                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                        {presets.filter(p => p.active).map(p => (
                                            <div key={p.id} className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 space-y-4">
                                                {/* Top Bar with Preset Name and Controls */}
                                                <div className="flex items-center gap-3 flex-wrap">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    {/* Aspect Ratio Selector */}
                                                    <div className="flex gap-2">
                                                        {['16:9', '4:3', '3:4', '1:1'].map(r => (
                                                            <button
                                                                key={r}
                                                                onClick={() => {
                                                                    setPresets(prev => prev.map(item =>
                                                                        item.id === p.id ? { ...item, ratio: r } : item
                                                                    ));
                                                                }}
                                                                className={`px-3 py-1.5 text-xs rounded border transition-all ${p.ratio === r ? 'bg-orange-500 text-black border-orange-500 font-semibold' : 'bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400'}`}
                                                            >
                                                                {r}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    {/* Text Alignment Selector */}
                                                    <div className="flex gap-2 ml-auto">
                                                        {['left', 'center'].map(align => (
                                                            <button
                                                                key={align}
                                                                onClick={() => {
                                                                    setPresets(prev => prev.map(item =>
                                                                        item.id === p.id ? { ...item, alignment: align } : item
                                                                    ));
                                                                }}
                                                                className={`px-3 py-1.5 text-xs rounded border transition-all ${(p.alignment || 'left') === align ? 'bg-orange-500 text-black border-orange-500 font-semibold' : 'bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400'}`}
                                                                title={align === 'left' ? 'Left Aligned' : 'Center Aligned'}
                                                            >
                                                                {align === 'left' ? 'Left' : 'Center'}
                                                            </button>
                                                        ))}
                                                        <button
                                                            className="px-3 py-1.5 text-xs rounded border bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400 transition-all"
                                                            title="Bold"
                                                        >
                                                            <Bold className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Bold Instructions */}
                                                <div className="flex items-center gap-2 text-xs text-neutral-400">
                                                    <Bold className="w-4 h-4" />
                                                    <span>Select text and press B or click Bold</span>
                                                </div>

                                                {/* Hook Text Input */}
                                                <div className="space-y-2">
                                                    <RichTextEditor
                                                        value={p.headline}
                                                        onChange={(html) => updateIndividualText(p.id, 'headline', html)}
                                                        placeholder="Hook....."
                                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-4 text-sm text-white focus:border-orange-500 focus:outline-none min-h-[100px]"
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id={`show-hook-eyebrow-${p.id}`}
                                                            checked={!!p.showHookEyebrow}
                                                            onChange={(e) => updateIndividualText(p.id, 'showHookEyebrow', e.target.checked)}
                                                            className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-orange-500 focus:ring-orange-500 accent-orange-500"
                                                        />
                                                        <label htmlFor={`show-hook-eyebrow-${p.id}`} className="text-xs text-neutral-300 cursor-pointer">
                                                            Line above hook
                                                        </label>
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={p.hookEyebrow ?? ''}
                                                        onChange={(e) => updateIndividualText(p.id, 'hookEyebrow', e.target.value)}
                                                        disabled={!p.showHookEyebrow}
                                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-white placeholder-neutral-600 focus:border-orange-500 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                                                        placeholder="e.g. Day 23 of Founder series…"
                                                    />
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-neutral-400">Series Size</label>
                                                            <input
                                                                type="number"
                                                                min="8"
                                                                max="20"
                                                                value={Math.round((p.hookEyebrowSizeScale ?? 1.1) * 10)}
                                                                onChange={(e) => {
                                                                    const val = Math.max(8, Math.min(20, parseInt(e.target.value, 10) || 11)) / 10;
                                                                    updateIndividualText(p.id, 'hookEyebrowSizeScale', val);
                                                                }}
                                                                className="w-full px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-neutral-400">Series Gap</label>
                                                            <input
                                                                type="number"
                                                                min="5"
                                                                max="25"
                                                                value={Math.round((p.hookEyebrowGapScale ?? 1.35) * 10)}
                                                                onChange={(e) => {
                                                                    const val = Math.max(5, Math.min(25, parseInt(e.target.value, 10) || 14)) / 10;
                                                                    updateIndividualText(p.id, 'hookEyebrowGapScale', val);
                                                                }}
                                                                className="w-full px-2 py-1 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[10px] text-neutral-400">Series Align</label>
                                                            <div className="flex gap-1">
                                                                {['left', 'center'].map((align) => (
                                                                    <button
                                                                        key={align}
                                                                        type="button"
                                                                        onClick={() => updateIndividualText(p.id, 'hookEyebrowAlignment', align)}
                                                                        className={`flex-1 px-2 py-1 text-[10px] rounded border ${(p.hookEyebrowAlignment ?? 'left') === align ? 'bg-orange-500 text-black border-orange-500 font-semibold' : 'bg-transparent text-neutral-300 border-neutral-600 hover:border-neutral-400'}`}
                                                                    >
                                                                        {align === 'left' ? 'Left' : 'Center'}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Credit Text Input */}
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={p.footer}
                                                        onChange={(e) => updateIndividualText(p.id, 'footer', e.target.value)}
                                                        className="w-full bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-400 focus:border-orange-500 focus:outline-none"
                                                        placeholder="Credit: The Founders Show"
                                                    />
                                                </div>

                                                {/* Per-brand Text Size */}
                                                <div className="space-y-2">
                                                    <label className="text-xs text-neutral-400 font-medium">Text Size</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range"
                                                            min="0.5"
                                                            max="1.5"
                                                            step="0.1"
                                                            value={p.fontScale ?? fontScale}
                                                            onChange={(e) => {
                                                                setPresets(prev => prev.map(item =>
                                                                    item.id === p.id ? { ...item, fontScale: parseFloat(e.target.value) } : item
                                                                ));
                                                            }}
                                                            className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={Math.round((p.fontScale ?? fontScale) * 10)}
                                                            onChange={(e) => {
                                                                const val = Math.max(5, Math.min(15, parseInt(e.target.value) || 10)) / 10;
                                                                setPresets(prev => prev.map(item =>
                                                                    item.id === p.id ? { ...item, fontScale: val } : item
                                                                ));
                                                            }}
                                                            className="w-12 px-2 py-1.5 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Per-brand Letter Spacing */}
                                                <div className="space-y-2">
                                                    <label className="text-xs text-neutral-400 font-medium">Letter Spacing</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range"
                                                            min="0.1"
                                                            max="1.5"
                                                            step="0.05"
                                                            value={p.wordSpacing ?? wordSpacing}
                                                            onChange={(e) => {
                                                                setPresets(prev => prev.map(item =>
                                                                    item.id === p.id ? { ...item, wordSpacing: parseFloat(e.target.value) } : item
                                                                ));
                                                            }}
                                                            className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={Math.round((p.wordSpacing ?? wordSpacing) * 10)}
                                                            onChange={(e) => {
                                                                const val = Math.max(1, Math.min(15, parseInt(e.target.value) || 10)) / 10;
                                                                setPresets(prev => prev.map(item =>
                                                                    item.id === p.id ? { ...item, wordSpacing: val } : item
                                                                ));
                                                            }}
                                                            className="w-12 px-2 py-1.5 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Line Spacing Control */}
                                                <div className="space-y-2">
                                                    <label className="text-xs text-neutral-400 font-medium">Line Spacing</label>
                                                    <div className="flex items-center gap-3">
                                                        <input
                                                            type="range"
                                                            min="0.8"
                                                            max="2.0"
                                                            step="0.05"
                                                            value={p.lineSpacing || 1.25}
                                                            onChange={(e) => {
                                                                setPresets(prev => prev.map(item =>
                                                                    item.id === p.id ? { ...item, lineSpacing: parseFloat(e.target.value) } : item
                                                                ));
                                                            }}
                                                            className="flex-1 h-2 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                                        />
                                                        <input
                                                            type="number"
                                                            value={(p.lineSpacing || 1.25).toFixed(2)}
                                                            onChange={(e) => {
                                                                const val = Math.max(0.8, Math.min(2.0, parseFloat(e.target.value) || 1.25));
                                                                setPresets(prev => prev.map(item =>
                                                                    item.id === p.id ? { ...item, lineSpacing: val } : item
                                                                ));
                                                            }}
                                                            className="w-16 px-2 py-1.5 text-xs text-white bg-neutral-900 border border-neutral-700 rounded text-center focus:border-orange-500 focus:outline-none"
                                                            step="0.05"
                                                            min="0.8"
                                                            max="2.0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {presets.filter(p => p.active).length === 0 && (
                                            <p className="text-sm text-neutral-500 italic text-center py-4">No presets selected. Select presets using the checkboxes on the cards or in BRAND ASSETS below, then use Per Brand to edit them.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* PRESET LIST */}
                        <div className="bg-neutral-800/50 rounded-xl overflow-hidden border border-neutral-700/50">
                            <div className="bg-neutral-700/50 px-6 py-3 border-b border-neutral-700/50">
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400 text-center">BRAND ASSETS</h2>
                                <p className="text-[10px] text-orange-400 text-center mt-1">Select presets (orange = selected for export)</p>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-xs text-neutral-400">Drag & Drop logos onto squares to update.</p>
                                <div className="flex flex-col gap-2">
                                    {presets.map(p => (
                                        <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors border-2 ${p.active ? 'bg-neutral-900 border-orange-500 ring-1 ring-orange-500/50' : 'bg-neutral-900 border-orange-500/40 hover:border-orange-500/70'}`}>
                                            <div className="flex items-center gap-3 flex-1">
                                                <div
                                                    className={`relative group cursor-pointer w-[70px] h-[70px] ${p.name === 'Best Founder Clips' || p.name === 'Founders God' ? 'rounded-none' : ((p.name === 'Founders wtf' || p.name === 'mktg-wtf' || p.name === 'Business wtf' || p.name === 'Startups wtf') ? 'rounded-lg' : 'rounded-full')} bg-neutral-700 flex items-center justify-center border border-neutral-600 overflow-hidden shrink-0 hover:border-neutral-400 transition-all`}
                                                    onDragOver={(e) => e.preventDefault()}
                                                    onDrop={(e) => onDropLogo(e, p.id)}
                                                >
                                                    {getLogoUrl(p.logo) ? (
                                                        <img src={getLogoUrl(p.logo)} className={`w-full h-full ${p.name === 'Best Founder Clips' || p.name === 'Founders God' ? 'rounded-none' : ((p.name === 'Founders wtf' || p.name === 'mktg-wtf' || p.name === 'Business wtf' || p.name === 'Startups wtf') ? 'rounded-lg' : 'rounded-full')}`} style={{ objectFit: 'cover', transform: p.name === 'Best Founder Clips' ? 'scale(1.0)' : 'scale(1.2)' }} />
                                                    ) : (
                                                        p.layout !== 'watermark' ? <ImageIcon className="w-4 h-4 text-neutral-500" /> : <span className="text-xs text-neutral-400">N/A</span>
                                                    )}
                                                    {(p.layout !== 'watermark' || p.name === 'The Rising Founder' || p.name === 'ceo hustle advice') && (
                                                        <>
                                                            <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer pointer-events-none">
                                                                <Upload className="w-3 h-3 text-white" />
                                                            </label>
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                                                onChange={(e) => handlePresetLogoUpload(e, p.id)}
                                                                id={`logo-upload-${p.id}`}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white">{p.name}</span>
                                                    <span className="text-xs text-neutral-400">{p.ratio}</span>
                                                </div>
                                            </div>
                                            <button onClick={() => togglePresetActive(p.id)} title="Select for export" className="p-2 rounded border border-orange-500/40 hover:border-orange-500 hover:bg-orange-500/10 transition-colors">
                                                {p.active ? <CheckSquare className="w-5 h-5 text-orange-500" /> : <Square className="w-5 h-5 text-orange-500/60" />}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT PANEL: PREVIEW --- */}
                <div className="flex-1 bg-neutral-950 flex flex-col relative overflow-hidden">

                    {videoSrc && !isExporting && (
                        <div className="absolute top-4 right-4 z-30 flex gap-2">
                            <button
                                onClick={() => processServerExport()}
                                disabled={isExporting || !videoSrc}
                                className={`bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full border border-yellow-500 flex items-center gap-2 shadow-lg transition-all ${(!videoSrc || isExporting) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <Download className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {`Export ${presets.filter(p => p.active).length} Videos`}
                                </span>
                            </button>
                            <button
                                onClick={togglePlay}
                                className="bg-neutral-800/80 backdrop-blur text-white px-4 py-2 rounded-full border border-neutral-600 hover:border-yellow-500 flex items-center gap-2 shadow-lg transition-all"
                            >
                                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                <span className="text-xs font-bold uppercase tracking-wider">{isPlaying ? 'Pause All' : 'Play All'}</span>
                            </button>
                            <button
                                onClick={toggleMute}
                                className="bg-neutral-800/80 backdrop-blur text-white px-4 py-2 rounded-full border border-neutral-600 hover:border-yellow-500 flex items-center gap-2 shadow-lg transition-all"
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                <span className="text-xs font-bold uppercase tracking-wider">{isMuted ? 'Unmute' : 'Muted'}</span>
                            </button>
                        </div>
                    )}

                    {isExporting && (
                        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-8">
                            <button
                                onClick={() => {
                                    if (exportAbortControllerRef.current) {
                                        exportAbortControllerRef.current.abort();
                                        exportAbortControllerRef.current = null;
                                    }
                                    if (serverPollIntervalRef.current) {
                                        clearInterval(serverPollIntervalRef.current);
                                        serverPollIntervalRef.current = null;
                                    }
                                    setIsExporting(false);
                                    setExportStatus('Stopped');
                                    setExportProgress(0);
                                    setTimeout(() => setExportStatus(''), 1500);
                                }}
                                className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full flex items-center gap-2 transition-all z-50"
                            >
                                <X className="w-4 h-4" />
                                <span className="text-sm font-bold uppercase">Stop</span>
                            </button>
                            <Loader className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
                            <h2 className="text-2xl font-bold text-white mb-2">{exportStatus}</h2>
                            <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden mt-4">
                                <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                            </div>
                            <p className="text-neutral-500 text-xs mt-4">Please keep this tab open.</p>
                            {cloudLinks.length > 0 && (
                                <div className="mt-4 w-full max-w-md">
                                    <p className="text-sm text-green-400 mb-2">Cloud links (click to copy):</p>
                                    {cloudLinks.map((link, i) => (
                                        <div key={i} className="flex items-center gap-2 mb-1">
                                            <button
                                                onClick={() => { navigator.clipboard.writeText(link); }}
                                                className="text-xs text-blue-400 hover:text-blue-300 truncate max-w-xs text-left"
                                                title={link}
                                            >
                                                {link.split('/').pop()}
                                            </button>
                                            <span className="text-neutral-600 text-xs">|</span>
                                            <a href={link} target="_blank" rel="noopener" className="text-xs text-orange-400 hover:text-orange-300">Open</a>
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => { navigator.clipboard.writeText(cloudLinks.join('\n')); }}
                                        className="mt-2 px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-white"
                                    >
                                        Copy All Links
                                    </button>
                                    <button
                                        onClick={() => setCloudLinks([])}
                                        className="mt-2 ml-2 px-3 py-1 bg-neutral-700 hover:bg-neutral-600 rounded text-xs text-white"
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- GRID VIEW CONTENT --- */}
                    <div className="flex-1 overflow-y-auto p-4 md:p-8">
                        <div className="flex flex-col items-center min-h-full w-full max-w-7xl mx-auto space-y-10 pb-20">
                            {/* Preset search */}
                            <div className="w-full flex justify-between items-center gap-4">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={presetSearch}
                                        onChange={(e) => setPresetSearch(e.target.value)}
                                        placeholder="Search presets by name or handle..."
                                        className="w-full px-3 py-2 rounded-md bg-neutral-900 border border-neutral-700 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-orange-400 w-full text-center">Presets highlighted in orange — click the checkbox on each card to select for export.</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full items-start">
                                {presets
                                    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery) || (p.handle || '').toLowerCase().includes(searchQuery))
                                    .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
                                    .map((p, i) => (
                                        <div key={p.id} className={`flex flex-col items-center gap-2 transition-opacity ${p.active ? 'opacity-100' : 'opacity-85'}`}>
                                            <div className="w-full aspect-[9/16]">
                                                <PreviewCard
                                                    preset={p}
                                                    videoSrc={videoSrc}
                                                    isPlaying={isPlaying}
                                                    videoRef={i === 0 ? videoRef : null}
                                                    isMain={i === 0}
                                                    fitMode={fitMode}
                                                    videoScale={videoScale}
                                                    showCredit={showCredit}
                                                    onToggle={togglePresetActive}
                                                    fontScaleGlobal={fontScale}
                                                    onPositionChange={handlePositionChange}
                                                    onCreditPositionChange={handleCreditPositionChange}
                                                    onWatermarkPositionChange={handleWatermarkPositionChange}
                                                    onHeadlinePositionChange={handleHeadlinePositionChange}
                                                    onVideoScaleChange={handleVideoScaleChange}
                                                    isMuted={isMuted}
                                                    wordSpacing={wordSpacing}
                                                />
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
