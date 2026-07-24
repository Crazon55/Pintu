import React, { useState, useRef, useEffect, useLayoutEffect, useCallback, memo, useMemo } from 'react';
import { Upload, Monitor, Layout, Download, Play, Pause, RotateCcw, Grid, Maximize, CheckSquare, Square, Edit2, Save, BadgeCheck, Image as ImageIcon, Type, Sliders, Users, Globe, Move, Volume2, VolumeX, X, Video, ChevronDown } from 'lucide-react';
import {
    cleanHeadlineHtml,
    layoutHeadlineLines,
    layoutNewsTickerTokenLines,
    canvasPxToPercent,
    CANVAS_REF_W,
    getExportFontSize,
    getExportEyebrowFontSize,
    getExportMaxTextWidth,
    getExportNewsMaxLineWidth,
    getHookVideoGap,
    getEffectiveLineSpacing,
    fitNewsTickerFontSize,
    NEWS_TICKER_BAR_LINE_HEIGHT,
    NEWS_TICKER_LINE_GAP,
    NEWS_TICKER_HIGHLIGHT_HEIGHT,
} from './shared/headlineLayout.js';
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
    { id: 91, name: 'indian-founders-co', handle: '@indianfoundersco', ratio: '4:3', color: '#32c26c', active: true, layout: 'hook_video', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
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
    { id: 92, name: 'indiabusinesscom', handle: '@indiabusinesscom', ratio: '4:3', color: '#FF5F07', active: true, layout: 'hook_video', logo: 'indiabusinesscom.png', headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25, rules: { logoOpacity: 1, logoPosition: 'top-left', logoCircular: false, logoSize: 48, logoPadX: 22, logoPadY: 12 } },
    { id: 94, name: 'indiabusinesscom-news', handle: '@indiabusinesscom', ratio: '4:5', color: '#FF8932', active: true, layout: 'news_ticker', logo: 'indiabusinesscom.png', headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25, rules: { logoOpacity: 1, logoPosition: 'top-left', logoCircular: false, logoSize: 48, logoPadX: 46, logoPadY: 41 } },
    { id: 95, name: 'indiastartupstory-news', handle: '@indiastartupstory', ratio: '4:5', color: '#e31d38', active: true, layout: 'news_ticker', logo: 'indiastartupstory.png', headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25, rules: { logoOpacity: 1, logoPosition: 'bottom-left', logoCircular: false, logoSize: 55 } },
    { id: 96, name: 'ifc-news', handle: '@ifc', ratio: '9:16', color: '#32c26c', active: true, layout: 'news_ticker', logo: null, headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25, rules: { logoOpacity: 1, logoPosition: 'top-left', logoCircular: false, logoSize: 38, textLogo: 'IFC.', logoPadX: 30, logoPadY: 56 } },
    { id: 97, name: 'ifc2-news', handle: '@indianfoundercore', ratio: '4:5', color: '#ffd412', active: true, layout: 'news_ticker', logo: 'FoundersCORE-white.png', headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center', lineSpacing: 1.25, rules: { logoOpacity: 1, logoPosition: 'top-left', logoCircular: false, logoSize: 160, logoPadX: 28, logoPadY: 36 } },
    { id: 98, name: '101xtechnology-aroll', handle: '@101xtechnology', ratio: '16:9', color: '#4898ab', active: true, layout: 'aroll', logo: null, headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left', lineSpacing: 1.25, rules: { hookPosition: 'mid', textLogo: '101xt.', highlightColors: ['#4898ab', '#90d46c'], topGlow: true } },
    { id: 99, name: 'indiantechdaily-aroll', handle: '@indiantechdaily', ratio: '16:9', color: '#ffffff', active: true, layout: 'aroll', logo: 'indiantechdaily.png', headline: DEFAULT_HEADLINE, footer: '', position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left', lineSpacing: 1.25, rules: { arollStyle: 'logo_social', hookPosition: 'mid', textLogo: 'Indian Tech Daily', topGlow: false } },
    { id: 93, name: 'indianfoundercore', handle: '@indianfoundercore', ratio: '4:3', color: '#FADB0D', active: true, layout: 'hook_video', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: 0.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center', lineSpacing: 1.25 },
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
    hookEyebrowGapScale: p.hookEyebrowGapScale ?? 7.0,
}));

// Presets configured during the "Experiment X" pass — surfaced in their own quick-pick section
const EXPERIMENT_X_PRESET_NAMES = ['indiabusinesscom', 'indiabusinesscom-news', 'indianfoundercore', 'indian-founders-co', 'indiastartupstory', 'indiastartupstory-news', 'ifc-news', 'ifc2-news', '101xtechnology-aroll', 'indiantechdaily-aroll'];
// Archived out of Bizz India Playbook for now — tech pages + news-ticker formats. Kept here so they're easy to bring back.
const ARCHIVED_PRESET_NAMES = ['101xtechnology-aroll', 'indiantechdaily-aroll', 'indiabusinesscom-news', 'indiastartupstory-news', 'ifc-news', 'ifc2-news'];
const BIZZINDIA_PLAYBOOK_PRESET_NAMES = EXPERIMENT_X_PRESET_NAMES.filter(n => !ARCHIVED_PRESET_NAMES.includes(n));
// Bizz India Playbook format switch (inside the playbook header): "A-roll" is the
// original 4-preset default set above; "News formats" is the archived news-ticker group.
// The archived tech/aroll-layout pages stay unused.
const BIZZINDIA_NEWS_PRESET_NAMES = ['indiabusinesscom-news', 'indiastartupstory-news', 'ifc-news', 'ifc2-news'];

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
    // Cache-bust so preset previews pick up logo color edits immediately
    const bust = (logo === 'FoundersCORE-white.png' || logo === 'FoundersCORE-removebg-preview.png')
        ? `?v=ifc2-white-ffd412`
        : '';
    return `${base}/assets/logos/${logo}${bust}`;
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

let _measureCanvas = null;
function getMeasureCtx() {
    if (!_measureCanvas && typeof document !== 'undefined') {
        _measureCanvas = document.createElement('canvas');
    }
    return _measureCanvas?.getContext('2d') || null;
}
// This canvas is reused for every text measurement for the app's whole lifetime. If any
// measurement ever ran against a custom font before that font finished loading, some browsers
// keep resolving that font on this exact context to its fallback from then on — recreating the
// canvas guarantees a clean slate once a font is confirmed ready, regardless of what ran before.
function resetMeasureCtx() {
    _measureCanvas = null;
}

/** Match export line-wrap at preview scale (720px reference canvas). */
function buildPreviewLines(headline, { fontSize, maxWidth, wordSpacing, fontFamily, boldWeight = 700 }) {
    const ctx = getMeasureCtx();
    if (!ctx || !headline) return [];
    const cleaned = cleanHeadlineHtml(normalizeBoldHTML(headline));
    const spacing = wordSpacing * fontSize;
    return layoutHeadlineLines(cleaned, (text, bold) => {
        ctx.font = `${bold ? boldWeight : 400} ${fontSize}px ${fontFamily}`;
        return ctx.measureText(text).width;
    }, maxWidth, spacing);
}

function buildNewsTickerPreviewLines(headline, { fontSize, maxWidth, fontFamily, boldWeight = 700 }) {
    const ctx = getMeasureCtx();
    if (!ctx || !headline) return [];
    const cleaned = cleanHeadlineHtml(normalizeBoldHTML(headline));
    return layoutNewsTickerTokenLines(cleaned, (text) => {
        ctx.font = `${boldWeight} ${fontSize}px ${fontFamily}`;
        return ctx.measureText(text).width;
    }, maxWidth);
}

/** Auto-fit news ticker like Canva/export: same min size + wrap budget as server. */
function fitNewsTickerPreview(headline, { baseFontSize, maxWidth, fontFamily, boldWeight = 700, maxTotalBarsH }) {
    const ctx = getMeasureCtx();
    if (!ctx || !headline) return { fontSize: baseFontSize, lines: [] };
    const cleaned = cleanHeadlineHtml(normalizeBoldHTML(headline));
    return fitNewsTickerFontSize({
        cleanedHtml: cleaned,
        measureWordAtSize: (text, fs) => {
            ctx.font = `${boldWeight} ${fs}px ${fontFamily}`;
            return ctx.measureText(text).width;
        },
        maxLineW: maxWidth,
        baseFontSize,
        minFontSize: 22, // match server generateNewsTickerOverlay
        maxLines: 3,
        maxTotalBarsH,
        barLineHeight: NEWS_TICKER_BAR_LINE_HEIGHT,
    });
}

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
            if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
                e.preventDefault();
                handleBold();
                return;
            }
            // Shift+Enter = manual line break (matches export); Enter = new paragraph
            if (e.key === 'Enter' && e.shiftKey) {
                e.preventDefault();
                document.execCommand('insertLineBreak');
                if (onChange && editorRef.current) onChange(editorRef.current.innerHTML);
            } else if (e.key === 'Enter') {
                requestAnimationFrame(() => {
                    if (onChange && editorRef.current) onChange(editorRef.current.innerHTML);
                });
            }
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

    // Update content when value changes externally (skip while focused so typing stays live)
    useEffect(() => {
        if (editorRef.current && !isFocused && editorRef.current.innerHTML !== value) {
            editorRef.current.innerHTML = value || '';
        }
    }, [value, isFocused]);

    return (
        <div className="relative">
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

// --- SUB-COMPONENT: Collapsible dropdown-style section wrapper ---
const CollapsibleSection = ({ title, defaultOpen = true, children, flat = false, collapsible = true }) => {
    const [open, setOpen] = useState(defaultOpen);
    if (flat) {
        return (
            <div className="border-t border-[var(--pintu-card-header-border)] pt-4 mt-4">
                {collapsible ? (
                    <button
                        type="button"
                        onClick={() => setOpen(v => !v)}
                        className="w-full flex items-center justify-between text-left mb-2"
                    >
                        <span className="text-xs font-medium text-[var(--pintu-text-secondary)]">{title}</span>
                        <ChevronDown className={`w-4 h-4 text-[var(--pintu-text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </button>
                ) : (
                    <div className="mb-2">
                        <span className="text-xs font-medium text-[var(--pintu-text-secondary)]">{title}</span>
                    </div>
                )}
                {(!collapsible || open) && (
                    <div className="space-y-2 pb-2">
                        {children}
                    </div>
                )}
            </div>
        );
    }
    return (
        <div className="bg-[var(--pintu-card-header-bg)] backdrop-blur-xl rounded-xl border border-[var(--pintu-card-header-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(v => !v)}
                className="w-full flex items-center justify-between p-4 text-left"
            >
                <span className="text-xs font-medium text-[var(--pintu-text-secondary)]">{title}</span>
                <ChevronDown className={`w-4 h-4 text-[var(--pintu-text-muted)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
                <div className="px-4 pb-4 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: Per-brand preset editing card (one collapse toggle per preset, not per section) ---
const PerBrandPresetCard = ({ p, fontScale, wordSpacing, setPresets, updateIndividualText }) => {
    const [cardOpen, setCardOpen] = useState(false);
    return (
        <div className="p-5 bg-[var(--pintu-card-bg)] backdrop-blur-2xl rounded-xl border border-[var(--pintu-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.5)]">
            <button
                type="button"
                onClick={() => setCardOpen(v => !v)}
                className="w-full flex items-center justify-between text-left"
            >
                <span className="text-sm font-bold text-[var(--pintu-text-primary)]">{p.name}</span>
                <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono text-[var(--pintu-accent)] bg-violet-500/10 px-2 py-0.5 rounded-full">{p.ratio}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--pintu-text-muted)] transition-transform duration-200 ${cardOpen ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* Hook Text — always visible, even while collapsed (edited most often) */}
            <CollapsibleSection title="Hook Text (Bold)" flat collapsible={false}>
                <RichTextEditor
                    value={p.headline}
                    onChange={(html) => updateIndividualText(p.id, 'headline', html)}
                    placeholder="Hook....."
                    className="w-full bg-[var(--pintu-input-bg)] border border-[var(--pintu-input-border)] rounded-lg p-4 text-sm text-[var(--pintu-text-primary)] focus:border-violet-500 focus:outline-none min-h-[100px]"
                />
            </CollapsibleSection>

            {cardOpen && (
                <>
                    {/* Ratio + Alignment */}
                    <CollapsibleSection title="Ratio & Alignment" flat collapsible={false}>
                        <div className="flex items-center gap-4 flex-wrap text-xs">
                            <div className="flex gap-1.5">
                                {(p.layout === 'aroll' ? ['16:9', '6:5', '2:3'] : ['16:9', '4:3', '3:4', '1:1']).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => {
                                            setPresets(prev => prev.map(item =>
                                                item.id === p.id ? { ...item, ratio: r } : item
                                            ));
                                        }}
                                        className={`px-2.5 py-1 rounded-md border transition-all ${p.ratio === r ? 'bg-violet-500 text-black border-violet-500 font-semibold' : 'bg-transparent text-[var(--pintu-text-muted)] border-[var(--pintu-input-border)] hover:border-[var(--pintu-text-muted)]'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-1.5">
                                {['left', 'center'].map(align => (
                                    <button
                                        key={align}
                                        onClick={() => {
                                            setPresets(prev => prev.map(item =>
                                                item.id === p.id ? { ...item, alignment: align } : item
                                            ));
                                        }}
                                        className={`px-2.5 py-1 rounded-md border transition-all ${(p.alignment || 'left') === align ? 'bg-violet-500 text-black border-violet-500 font-semibold' : 'bg-transparent text-[var(--pintu-text-muted)] border-[var(--pintu-input-border)] hover:border-[var(--pintu-text-muted)]'}`}
                                        title={align === 'left' ? 'Left Aligned' : 'Center Aligned'}
                                    >
                                        {align === 'left' ? 'Left' : 'Center'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CollapsibleSection>

                    {/* Typography: Text Size / Letter Spacing */}
                    <CollapsibleSection title="Typography" flat collapsible={false}>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-[var(--pintu-text-secondary)]">Text Size</label>
                                <span className="text-xs font-mono text-[var(--pintu-accent)] bg-violet-500/10 px-2 py-0.5 rounded-full min-w-[2.5rem] text-center">{Math.round((p.fontScale ?? fontScale) * 100)}%</span>
                            </div>
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
                                className="w-full h-2 bg-[var(--pintu-track-bg)] rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-[var(--pintu-text-secondary)]">Letter Spacing</label>
                                <span className="text-xs font-mono text-[var(--pintu-accent)] bg-violet-500/10 px-2 py-0.5 rounded-full min-w-[2.5rem] text-center">{Math.round((p.wordSpacing ?? wordSpacing) * 100)}%</span>
                            </div>
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
                                className="w-full h-2 bg-[var(--pintu-track-bg)] rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                        </div>
                    </CollapsibleSection>
                </>
            )}
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
    wordSpacing = 0.25,
    newsFontReady = true
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

    useEffect(() => {
        setLocalVideoScale(videoScale || 100);
    }, [videoScale]);

    const [ifcFontInfo, setIfcFontInfo] = useState(null);
    const containerRef = useRef(null);
    const cardRef = useRef(null);
    const creditRef = useRef(null);
    const watermarkRef = useRef(null);
    const headlineRef = useRef(null);
    const videoElementRef = useRef(null);
    const [previewCardW, setPreviewCardW] = useState(CANVAS_REF_W);

    useLayoutEffect(() => {
        const el = cardRef.current;
        if (!el) return;
        const update = () => setPreviewCardW(el.offsetWidth || CANVAS_REF_W);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    useEffect(() => {
        if (preset.name !== 'indian-founders-co') return;

        let cancelled = false;
        const tick = () => {
            const root = headlineRef.current;
            const spans = root ? Array.from(root.querySelectorAll('span')) : [];
            const highlighted = spans.find(s => {
                const color = window.getComputedStyle(s).color;
                return color === 'rgb(50, 194, 108)'; // #32c26c
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

    // Every preset preview plays in sync with the global play/pause, regardless of export-selection state
    useEffect(() => {
        const video = videoElementRef.current;
        if (!video || !videoSrc) return;

        if (isPlaying) {
            video.play().catch(() => { });
            video.loop = true;
        } else {
            video.pause();
            video.loop = false;
        }
    }, [isPlaying, videoSrc]);

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
            case '6:5': return { paddingBottom: '83.33%' };
            case '2:3': return { paddingBottom: '150%' };
            case '1:1': return { paddingBottom: '100%' };
            case '4:3': return { paddingBottom: '75%' };
            case '3:4': return { paddingBottom: '133.33%' };
            case '4:5': return { paddingBottom: '125%' };
            case '9:16': return { paddingBottom: '177.78%' };
            default: return { paddingBottom: '100%' };
        }
    };

    // aroll video frame: only 2:3 portrait gets side padding (matches export)
    const arollHasSidePad = preset.layout === 'aroll' && preset.ratio === '2:3';

    const handleMouseDown = (e) => {
        // News RE-SIZE mode: drag pans (like Canva). Other layouts need Move toggle.
        const canPan = isRepositioning || (isResizingVideo && preset.layout === 'news_ticker');
        if (!canPan) return;
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
            // Higher sensitivity when zoomed so pan feels natural
            const sens = 0.35 * Math.max(1, (localVideoScale || 100) / 100);
            let nX = startPosX - (dX / rect.width * 100 * sens);
            let nY = startPosY - (dY / rect.height * 100 * sens);
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

    const handleResizeStart = (e, corner) => {
        e.preventDefault();
        e.stopPropagation();
        const startScale = localVideoScale;
        let currentScale = startScale;
        let currentPosX = localPos.x;
        let currentPosY = localPos.y;
        const isNews = preset.layout === 'news_ticker';
        const isIfc = (preset.name || '').toLowerCase() === 'ifc-news';
        // ifc is full-bleed 9:16 — cap zoom so face doesn't disappear before captions are covered
        const maxZoom = isIfc ? 220 : 300;
        const rect0 = containerRef.current?.getBoundingClientRect();
        const startDistance = Math.sqrt(
            Math.pow(e.clientX - ((rect0?.left || 0) + (rect0?.width || 0) / 2), 2) +
            Math.pow(e.clientY - ((rect0?.top || 0) + (rect0?.height || 0) / 2), 2)
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
            newScale = Math.max(100, Math.min(maxZoom, newScale));
            currentScale = newScale;
            setLocalVideoScale(newScale);

            // News RE-SIZE: bias crop toward the TOP as you zoom so competitor
            // bottom captions leave the frame first (Canva-style cover), not the face.
            if (isNews && newScale > 100) {
                const t = (newScale - 100) / (maxZoom - 100);
                currentPosY = Math.max(isIfc ? 8 : 5, 50 * (1 - t * 0.85));
                setLocalPos(prev => ({ ...prev, y: currentPosY }));
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            const next = Math.round(currentScale);
            setLocalVideoScale(next);
            if (onVideoScaleChange) onVideoScaleChange(next);
            if (isNews && onPositionChange) {
                onPositionChange(preset.id, { x: currentPosX, y: currentPosY });
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
        const isNewsHook = preset.layout === 'news_ticker';

        const onMove = (evt) => {
            const measureEl = isNewsHook ? containerRef.current : headlineRef.current;
            if (!measureEl) return;
            evt.preventDefault();
            const rect = measureEl.getBoundingClientRect();
            const dX = evt.clientX - startX;
            const dY = evt.clientY - startY;
            if (isNewsHook) {
                // Drag up → raise hook stack (gradient + black + text) together
                const sens = 1.1;
                let nY = startPosY - (dY / rect.height * 100 * sens);
                nY = Math.max(0, Math.min(48, nY));
                if (Math.abs(nY - lastY) > 0.1) {
                    lastY = nY;
                    setLocalHeadlinePos({ x: 0, y: nY });
                    if (headlineRef.current) {
                        headlineRef.current.dataset.tempX = '0';
                        headlineRef.current.dataset.tempY = String(nY);
                    }
                }
                return;
            }
            const sens = 0.2;
            let nX = startPosX + (dX / rect.width * 100 * sens * 2);
            let nY = startPosY + (dY / rect.height * 100 * sens * 2);
            nX = Math.max(-100, Math.min(200, nX));
            nY = Math.max(-100, Math.min(200, nY));

            if (Math.abs(nX - lastX) > 0.1 || Math.abs(nY - lastY) > 0.1) {
                lastX = nX;
                lastY = nY;
                setLocalHeadlinePos({ x: nX, y: nY });
                if (headlineRef.current) {
                    headlineRef.current.dataset.tempX = nX;
                    headlineRef.current.dataset.tempY = nY;
                }
            }
        };

        const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (headlineRef.current && headlineRef.current.dataset.tempY !== undefined) {
                onHeadlinePositionChange(preset.id, {
                    x: parseFloat(headlineRef.current.dataset.tempX || '0'),
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
    const previewScale = previewCardW / CANVAS_REF_W;
    const exportFontSize = getExportFontSize(preset, preset.headline, effectiveFontScale);
    const previewFontSize = Math.max(10, exportFontSize * previewScale);
    const exportMaxTextW = getExportMaxTextWidth(preset) * previewScale;
    const exportNewsMaxLineW = getExportNewsMaxLineWidth(preset) * previewScale;
    const hookVideoGapPx = getHookVideoGap(preset) * previewScale;
    const effectiveLineSpacing = getEffectiveLineSpacing(preset);

    // Alignment Logic - Use preset.alignment property
    const isCenterAligned = preset.alignment === 'center';
    const isCenteredLeftAlign = preset.name === 'startupsoncrack' || preset.name === 'millionaire.founders' || preset.name === 'startupscheming' || preset.name === 'indian business com';
    const textAlignClass = isCenterAligned ? 'text-center items-center px-6' : (isCenteredLeftAlign ? 'text-left items-start px-14' : 'text-left items-start px-6');
    // aroll: 16:9/6:5 stacks centered; 2:3 uses hookPosition (top/mid/low)
    const arollHookPos = preset.layout === 'aroll' ? (preset.rules?.hookPosition || 'mid') : null;
    const arollCenterStack = preset.layout === 'aroll' && (preset.ratio === '16:9' || preset.ratio === '6:5');
    const justifyClass = arollHookPos
        ? (arollCenterStack ? 'justify-center gap-1 -mt-[4%]' : arollHookPos === 'top' ? 'justify-start gap-1 pt-[9%]' : arollHookPos === 'low' ? 'justify-center gap-1 pt-[14%]' : 'justify-center gap-1')
        : 'justify-center gap-1';
    const showMainHookBlock = preset.layout !== 'hook_video' && preset.layout !== 'news_ticker' && preset.layout !== 'aroll' && preset.name !== 'Best Founder Clips' && preset.name !== 'best business clips' && preset.name !== 'startup madness' && preset.name !== 'Ads by marketer';
    const eyebrowSizeScale = preset.hookEyebrowSizeScale ?? 1.1;
    const eyebrowGapScale = preset.hookEyebrowGapScale ?? 7.0;
    const eyebrowAlignment = preset.hookEyebrowAlignment ?? 'left';
    const eyebrowAlignClass = eyebrowAlignment === 'center'
        ? 'text-center items-center px-6'
        : (isCenteredLeftAlign ? 'text-left items-start px-14' : 'text-left items-start px-6');
    const eyebrowPreviewSize = Math.max(10, Math.round(getExportEyebrowFontSize(preset, effectiveFontScale, eyebrowSizeScale) * previewScale));
    // Keep preview spacing consistent with export (server uses ~16px * gapScale).
    const eyebrowGapPx = Math.round(16 * eyebrowGapScale * previewScale);
    const eyebrowTextTrimmed = (preset.hookEyebrow && String(preset.hookEyebrow).trim()) || '';
    const showEyebrowInPreview = preset.showHookEyebrow && eyebrowTextTrimmed.length > 0;

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
        preset.name === 'indiastartupstory' ||
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
    const isNewsFormat = preset.layout === 'news_ticker';
    const newsResizeActive = isNewsFormat && isResizingVideo;

    const mainHookLines = useMemo(() => {
        const fontFamily = isPoppinsFont ? "'Poppins', sans-serif" : "'Inter', sans-serif";
        return buildPreviewLines(preset.headline, {
            fontSize: previewFontSize,
            maxWidth: exportMaxTextW,
            wordSpacing: adjustedWordSpacing,
            fontFamily,
            boldWeight: 700,
        });
    }, [preset.headline, previewFontSize, exportMaxTextW, adjustedWordSpacing, isPoppinsFont]);

    return (
        <div
            ref={cardRef}
            className={`group relative ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-white' : 'bg-black'} flex flex-col items-center select-none border-2 ${preset.active ? 'border-violet-500 ring-2 ring-violet-500/60 shadow-lg shadow-violet-500/20' : 'border-violet-500/50 opacity-70 hover:opacity-90 hover:border-violet-500/80'}`}
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
            <div className={`flex-1 w-full flex flex-col ${justifyClass} relative ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-white' : (preset.layout === 'aroll' ? '' : 'bg-neutral-900')}`} style={preset.layout === 'aroll' ? (preset.rules?.topGlow === false ? { background: '#000000' } : { background: 'radial-gradient(ellipse 60% 45% at 95% 0%, rgba(100, 155, 85, 0.32) 0%, rgba(60, 110, 55, 0.12) 30%, transparent 68%), #000000' }) : undefined}>

                {/* 1a. HOOK_VIDEO HEADER: optional line above hook, then hook text centered on black */}
                {preset.layout === 'hook_video' && (
                    <div
                        className="w-full px-4 pt-4 z-10 shrink-0"
                        style={{ marginBottom: `${hookVideoGapPx}px` }}
                    >
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
                            className={`w-full ${isCenterAligned ? 'text-center' : 'text-left'}`}
                            style={{
                                fontSize: `${previewFontSize}px`,
                                lineHeight: effectiveLineSpacing,
                                fontFamily: "'Inter', sans-serif",
                                letterSpacing: preset.name === 'indiabusinesscom'
                                    ? '-0.05em'
                                    : preset.name === 'indianfoundercore'
                                        ? '-0.053em'
                                        : undefined,
                            }}
                        >
                            {(() => {
                                const hookFontFamily = "'Inter', sans-serif";
                                const hookBoldWeight = preset.name === 'indiabusinesscom' ? 800
                                    : preset.name === 'indianfoundercore' ? 900
                                    : preset.name === 'indian-founders-co' ? 900 : 700;
                                const lines = buildPreviewLines(preset.headline, {
                                    fontSize: previewFontSize,
                                    maxWidth: exportMaxTextW,
                                    wordSpacing: adjustedWordSpacing,
                                    fontFamily: hookFontFamily,
                                    boldWeight: hookBoldWeight,
                                });
                                let highlightGroupIndex = 0;
                                let prevWasHighlight = false;
                                const groupForToken = (bold) => {
                                    if (bold) {
                                        if (!prevWasHighlight) highlightGroupIndex++;
                                        prevWasHighlight = true;
                                        return highlightGroupIndex;
                                    }
                                    prevWasHighlight = false;
                                    return 0;
                                };
                                return lines.map((line, li) => (
                                    <div
                                        key={li}
                                        style={{
                                            textAlign: isCenterAligned ? 'center' : 'left',
                                            width: '100%',
                                        }}
                                    >
                                        {line.tokens.map((t, ti) => {
                                            const grp = groupForToken(t.bold);
                                            return (
                                                <span
                                                    key={ti}
                                                    style={{
                                                        fontSynthesis: 'none',
                                                        color: preset.name === 'indiabusinesscom'
                                                            ? (grp === 1 ? '#FF5F07' : grp >= 2 ? '#46DB27' : '#FFFFFF')
                                                            : (t.bold ? preset.color : '#FFFFFF'),
                                                        fontWeight: preset.name === 'indian-founders-co'
                                                            ? (t.bold ? 900 : 400)
                                                            : preset.name === 'indiabusinesscom'
                                                                ? 800
                                                                : preset.name === 'indianfoundercore'
                                                                    ? 900
                                                                    : (t.bold ? 700 : 400),
                                                    }}
                                                >
                                                    {t.text}{' '}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* 1b-news overlays render inside the video frame (see video container) */}

                {/* 1b-aroll. AROLL LAYOUT: in-flow black header band ("101xt." + badge + handle + hook)
                    above the embedded video band. Output stays a 9:16 reel — only the video frame
                    ratio + vertical placement (top/mid/low) change between variants. */}
                {preset.layout === 'aroll' && (() => {
                    const isLogoSocial = preset.rules?.arollStyle === 'logo_social';
                    const textLogo = preset.rules?.textLogo || (isLogoSocial ? preset.name : '101xt.');
                    const brandSize = Math.round(previewFontSize * (isLogoSocial ? 0.85 : 1.2));
                    const handleSize = Math.round(previewFontSize * 0.52);
                    const hlColors = preset.rules?.highlightColors || ['#4898ab', '#90d46c'];
                    const badgePx = Math.max(10, Math.round(brandSize * (isLogoSocial ? 0.62 : 0.52)));

                    const hookBlock = (() => {
                        const hookFontFamily = isLogoSocial ? "'Inter', sans-serif" : "'Poppins', sans-serif";
                        const hookBoldWeight = isLogoSocial ? 700 : 700;
                        const lines = buildPreviewLines(preset.headline || '', {
                            fontSize: previewFontSize,
                            maxWidth: exportMaxTextW,
                            wordSpacing: adjustedWordSpacing,
                            fontFamily: hookFontFamily,
                            boldWeight: hookBoldWeight,
                        });
                        return (
                            <div className="pb-2" style={{
                                fontFamily: hookFontFamily,
                                fontSize: `${previewFontSize}px`,
                                lineHeight: effectiveLineSpacing,
                                fontWeight: isLogoSocial ? 400 : 700,
                            }}>
                                {lines.map((line, li) => (
                                    <div key={li}>
                                        {line.tokens.map((t, ti) => {
                                            if (!isLogoSocial && t.bold) {
                                                return (
                                                    <span key={ti} style={{
                                                        fontWeight: 700,
                                                        background: `linear-gradient(90deg, ${hlColors[0]}, ${hlColors[1]})`,
                                                        WebkitBackgroundClip: 'text',
                                                        WebkitTextFillColor: 'transparent',
                                                        backgroundClip: 'text',
                                                    }}>{t.text}{' '}</span>
                                                );
                                            }
                                            return (
                                                <span key={ti} style={{ color: '#FFFFFF', fontWeight: t.bold ? 700 : (isLogoSocial ? 400 : 700) }}>
                                                    {t.text}{' '}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        );
                    })();

                    if (isLogoSocial) {
                        return (
                            <div className="w-full px-[7%] z-10 shrink-0">
                                <div className="flex gap-3.5 pt-3 pb-1.5 items-start">
                                    <div className="w-[70px] h-[70px] rounded-full ring-1 ring-white/70 overflow-hidden shrink-0 bg-neutral-800">
                                        {getLogoUrl(preset.logo) ? (
                                            <img src={getLogoUrl(preset.logo)} className="w-full h-full object-cover scale-[1.2]" alt="" />
                                        ) : null}
                                    </div>
                                    <div className="flex flex-col justify-center min-h-[70px]">
                                        <div className="flex items-center">
                                            <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700, fontSize: `${brandSize}px`, color: '#FFFFFF', lineHeight: 1, whiteSpace: 'nowrap' }}>{textLogo}</span>
                                            <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: `${badgePx}px`, height: `${badgePx}px`, background: '#1D9BF0', marginLeft: '8px' }}>
                                                <svg viewBox="0 0 24 24" fill="none" style={{ width: '68%', height: '68%' }}>
                                                    <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </div>
                                        <span style={{ fontFamily: "'Inter', sans-serif", fontWeight: 400, fontSize: `${handleSize}px`, color: '#AAAAAA', lineHeight: 1, marginTop: '10px' }}>{preset.handle}</span>
                                    </div>
                                </div>
                                {hookBlock}
                            </div>
                        );
                    }

                    return (
                        <div className="w-full px-[7%] z-10 shrink-0">
                            <div className="flex items-center pt-3 pb-1.5">
                                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: `${brandSize}px`, color: '#FFFFFF', lineHeight: 1, whiteSpace: 'nowrap' }}>{textLogo}</span>
                                <div className="rounded-full flex items-center justify-center flex-shrink-0" style={{ width: `${badgePx}px`, height: `${badgePx}px`, background: '#1D9BF0', marginLeft: '8px' }}>
                                    <svg viewBox="0 0 24 24" fill="none" style={{ width: '68%', height: '68%' }}>
                                        <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                </div>
                                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 500, fontSize: `${handleSize}px`, color: '#AAAAAA', lineHeight: 1, whiteSpace: 'nowrap', marginLeft: '18px' }}>{preset.handle}</span>
                            </div>
                            {hookBlock}
                        </div>
                    );
                })()}

                {/* 1b. HEADER SECTION (Stacked inside content flow) */}
                {preset.layout !== 'watermark' && preset.layout !== 'hook_video' && preset.layout !== 'news_ticker' && preset.layout !== 'aroll' && (
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
                {preset.layout !== 'hook_video' && preset.layout !== 'news_ticker' && preset.layout !== 'aroll' && preset.name !== 'Best Founder Clips' && preset.name !== 'best business clips' && preset.name !== 'startup madness' && preset.name !== 'Ads by marketer' && (
                    <div
                        ref={headlineRef}
                        data-headline="true"
                        className={`w-full z-10 leading-tight drop-shadow-lg ${preset.name === 'indian-founders-co' ? 'tracking-normal' : 'tracking-tighter'} relative ${isRepositioningHeadline ? 'cursor-move ring-2 ring-yellow-500' : ''} ${isCenterAligned ? 'flex flex-col items-center' : 'flex flex-col items-start'} ${isCenteredLeftAlign ? 'px-14' : (preset.name === 'wealth lessons india' ? 'px-4' : '')}`}
                        style={{
                            fontSize: `${previewFontSize}px`,
                            lineHeight: effectiveLineSpacing,
                            marginTop: preset.name === 'Best Founder Clips' ? '0.5rem' : (preset.name === 'The Founders Show' || preset.name === 'Life Wealth Lessons' || preset.name === 'Business India Lessons' || preset.name === 'Billionaires of Bharat' || preset.name === 'startupcoded' || preset.name === 'kwazyfounders' || preset.name === 'founders-in-india' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf' || preset.name === 'wealth lessons india' || preset.name === 'Daily Tech India' ? '1rem' : '0'),
                            marginBottom: `${hookVideoGapPx}px`,
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
                        <div style={{ pointerEvents: isRepositioningHeadline ? 'none' : 'auto', width: '100%' }}>
                            {(() => {
                                let highlightGroupIndex = 0;
                                let prevWasHighlight = false;
                                const groupForToken = (highlight) => {
                                    if (highlight) {
                                        if (!prevWasHighlight) highlightGroupIndex++;
                                        prevWasHighlight = true;
                                        return highlightGroupIndex;
                                    }
                                    prevWasHighlight = false;
                                    return 0;
                                };
                                const tokenColor = (highlight, highlightGroup) => {
                                    if (preset.name === 'Real India Business') return highlightGroup === 1 ? '#FF8323' : highlightGroup >= 2 ? '#0DC100' : 'white';
                                    if (preset.name === 'theprimefounder') return highlight ? '#1DB077' : 'white';
                                    if (preset.name === 'foundrsonig') return highlight ? '#ECECDC' : 'white';
                                    if (preset.name === 'indiasbestfounders' || preset.name === 'intelligence by ai') return highlight ? '#ECECDC' : 'white';
                                    if (preset.name === 'elitefoundrs') return highlight ? '#5887FF' : 'white';
                                    if (preset.name === 'indianfoundr') return highlight ? '#487AF9' : 'white';
                                    if (preset.name === 'the ai phaze') return highlight ? '#95C5D1' : 'white';
                                    if (preset.name === 'That AI page') return highlight ? '#6523FF' : 'white';
                                    if (preset.name === 'Revolution in tech') return highlight ? '#FDB05E' : 'white';
                                    if (preset.name === 'indiastartupstory') return highlight ? '#EF5350' : 'white';
                                    if (presetNameLower === 'risewithcontent') return highlight ? '#E53935' : 'white';
                                    if (preset.name === 'The Prime Ai Page') return highlight ? '#FFCD1D' : 'white';
                                    if (preset.name === 'Dhandha India') return highlight ? '#FB9C39' : 'white';
                                    if (preset.name === 'The Ai Gauntlet') return highlight ? '#FFCD1D' : 'white';
                                    if (presetNameLower === 'bestindianpodcast') return highlight ? '#fde601' : 'white';
                                    if (preset.name === 'founders-in-india') return highlight ? '#7F53FF' : 'white';
                                    if (preset.name === 'Entrepreneursindia.co') return 'white';
                                    if (preset.name === 'peakofai' || isAicrackedOrEvolvingPreset) return 'white';
                                    if (['founderdaily', 'founderbusinesstips', 'kwazyfounders', 'startup madness'].includes(preset.name)) return 'black';
                                    if (['Smart Business.in', 'Founders wtf', 'mktg-wtf', 'Business wtf', 'Startups wtf'].includes(preset.name)) return 'white';
                                    if (['Founders God', 'CEO Mindset India', 'The Founders Show', 'Life Wealth Lessons', 'Billionaires of Bharat', 'ceo hustle advice', 'indian hustle advice', 'rich indian ceo', 'startupcoded', 'founders cracked', 'indian business com', 'Entrepreneurial India', 'Finding Good AI', 'Finding Good Tech', 'startupsinthelast24hrs', 'indian ai future', 'techinthelast24hrs', 'indianaipage', 'indiantechdaily', '101xtechnology', 'therisingai', 'Revolution in ai', 'Founders.India', 'Technology In India', 'Daily Tech India', 'The Prime Ai Page', 'Dhandha India', 'The Ai Gauntlet', 'startupbydog', 'foundersoncrack'].includes(preset.name)) return 'white';
                                    return highlight ? preset.color : 'white';
                                };
                                const tokenWeight = (highlight) => {
                                    if (preset.name === 'indian-founders-co') return highlight ? 800 : 400;
                                    if (preset.name === 'bizzindia' || preset.name === '101xfounders') return highlight ? 900 : 400;
                                    if (preset.name === 'theprimefounder' || preset.name === 'peakofai' || isAicrackedOrEvolvingPreset || preset.name === 'foundrsonig' || preset.name === 'indianfoundr' || preset.name === 'indiastartupstory' || preset.name === 'neworderai') return highlight ? 700 : 400;
                                    if (preset.name === 'startup madness') return 800;
                                    if (preset.name === 'indian business com') return highlight ? 700 : 400;
                                    if (preset.name === 'techinthelast24hrs') return 700;
                                    if (preset.name === 'indianaipage' || preset.name === 'indiantechdaily' || preset.name === '101xtechnology' || preset.name === 'therisingai' || preset.name === 'Revolution in ai' || preset.name === 'Founders.India' || preset.name === 'Technology In India' || preset.name === 'Daily Tech India' || preset.name === 'The Prime Ai Page' || preset.name === 'Dhandha India' || preset.name === 'The Ai Gauntlet' || preset.name === '101xfounders-tweet' || preset.name === 'bizzindia-tweet' || preset.name === 'founders-in-india-tweet' || preset.name === 'indian-founders-co-tweet') return highlight ? 700 : 400;
                                    if (preset.name === 'rich indian ceo' || preset.name === 'Entrepreneurial India') return highlight ? 700 : 400;
                                    if (['founderdaily', 'founderbusinesstips', 'Life Wealth Lessons', 'Billionaires of Bharat', 'indian hustle advice', 'Finding Good AI', 'Finding Good Tech', 'startupsinthelast24hrs', 'indian ai future', 'startupbydog'].includes(preset.name)) return 400;
                                    if (preset.name === 'founders cracked') return highlight ? 700 : 400;
                                    if (preset.name === 'ceo hustle advice') return highlight ? 700 : 400;
                                    if (['Smart Business.in', 'Founders wtf', 'mktg-wtf', 'Business wtf', 'Startups wtf'].includes(preset.name)) return highlight ? 800 : 400;
                                    if (preset.name === 'founders-in-india' || preset.name === 'Entrepreneursindia.co') return highlight ? 700 : 400;
                                    if (preset.name === 'Real India Business') return highlight ? 600 : 300;
                                    if (['Founders God', 'CEO Mindset India', 'startupcoded', 'foundersoncrack'].includes(preset.name)) return 800;
                                    if (['The Founders Show', 'Business India Lessons'].includes(preset.name)) return highlight ? 800 : 400;
                                    return highlight ? 800 : 400;
                                };
                                const tokenFont = ((preset.name === '101xfounders' || preset.name === 'bizzindia' || preset.name === 'indian-founders-co' || presetNameLower === 'bestindianpodcast')
                                    ? "'Inter', sans-serif"
                                    : isPoppinsFont
                                        ? "'Poppins', sans-serif"
                                        : (preset.name === 'Smart Business.in' || preset.name === 'Founders wtf' || preset.name === 'mktg-wtf' || preset.name === 'Business wtf' || preset.name === 'Startups wtf') ? "'Inter', sans-serif" : 'inherit');
                                return mainHookLines.map((line, li) => (
                                    <div key={li} style={{ textAlign: isCenterAligned ? 'center' : 'left', width: '100%', letterSpacing: preset.name === 'indian-founders-co' ? '0px' : (isPoppinsFont ? '0px' : undefined) }}>
                                        {line.tokens.map((t, ti) => {
                                            const grp = groupForToken(t.bold);
                                            return (
                                                <span key={ti} style={{ fontSynthesis: 'none', color: tokenColor(t.bold, grp), fontWeight: tokenWeight(t.bold), fontFamily: tokenFont }}>
                                                    {t.text}{' '}
                                                </span>
                                            );
                                        })}
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {/* 3. VIDEO CONTAINER (aroll: inset with left/right padding to match export) */}
                <div
                    ref={containerRef}
                    className={`relative bg-black shrink-0 group overflow-hidden ${preset.layout === 'aroll' ? 'mx-auto' : 'w-full'} ${isRepositioning ? 'cursor-move ring-2 ring-yellow-500 z-50' : newsResizeActive ? 'cursor-move ring-2 ring-violet-500 z-50' : isResizingVideo ? 'ring-2 ring-blue-500 z-50' : 'cursor-pointer'} ''}`}
                    style={{
                        ...(preset.layout === 'aroll' ? { width: arollHasSidePad ? '87.8%' : '100%' } : {}),
                        // Video band ratio only — outer card stays 9:16 for every preset.
                        ...getAspectRatioStyle(preset.ratio),
                    }}
                    onDoubleClick={() => {
                        if (isNewsFormat) {
                            setIsResizingVideo(v => !v);
                            setIsRepositioning(false);
                        } else {
                            setIsRepositioning(!isRepositioning);
                        }
                    }}
                    onMouseDown={handleMouseDown}
                >
                    {isRepositioning && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                            <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1 whitespace-nowrap">
                                <Move size={10} /> Drag to Reposition
                            </div>
                        </div>
                    )}

                    {isResizingVideo && (
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
                            <div className="bg-violet-600/90 text-white text-[10px] px-2 py-1 rounded backdrop-blur flex items-center gap-1 whitespace-nowrap">
                                <Maximize size={10} /> {isNewsFormat ? 'RE-SIZE — drag to move · handles to zoom' : 'Drag corners to resize'}
                            </div>
                        </div>
                    )}

                    {/* Resize Handles — Canva-style corners + edges for news RE-SIZE */}
                    {isResizingVideo && (
                        <>
                            {/* Corner handles */}
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-nwse-resize z-[60]"
                                style={{ top: '-7px', left: '-7px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'nw')}
                            />
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-nesw-resize z-[60]"
                                style={{ top: '-7px', right: '-7px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'ne')}
                            />
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-nwse-resize z-[60]"
                                style={{ bottom: '-7px', left: '-7px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'sw')}
                            />
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-nesw-resize z-[60]"
                                style={{ bottom: '-7px', right: '-7px' }}
                                onMouseDown={(e) => handleResizeStart(e, 'se')}
                            />
                            {/* Edge handles (Canva-style) */}
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-ns-resize z-[60]"
                                style={{ top: '-7px', left: '50%', transform: 'translateX(-50%)' }}
                                onMouseDown={(e) => handleResizeStart(e, 'n')}
                            />
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-ns-resize z-[60]"
                                style={{ bottom: '-7px', left: '50%', transform: 'translateX(-50%)' }}
                                onMouseDown={(e) => handleResizeStart(e, 's')}
                            />
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-ew-resize z-[60]"
                                style={{ left: '-7px', top: '50%', transform: 'translateY(-50%)' }}
                                onMouseDown={(e) => handleResizeStart(e, 'w')}
                            />
                            <div
                                className="absolute w-3.5 h-3.5 bg-white border-2 border-violet-500 rounded-full cursor-ew-resize z-[60]"
                                style={{ right: '-7px', top: '50%', transform: 'translateY(-50%)' }}
                                onMouseDown={(e) => handleResizeStart(e, 'e')}
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
                            <div className={`w-full h-full flex flex-col items-center justify-center gap-2 ${(preset.name === 'founderdaily' || preset.name === 'founderbusinesstips' || preset.name === 'kwazyfounders' || preset.name === 'startup madness') ? 'bg-neutral-200' : 'bg-neutral-800'} ${preset.name === 'startup madness' || preset.name === 'ceo hustle advice' || preset.name === 'indian-founders-co-old' ? 'rounded-2xl' : ''}`}>
                                <Video className="w-6 h-6 text-neutral-500" />
                                <span className="text-xs text-neutral-500 text-center px-4">Upload a video to preview</span>
                            </div>
                        )}

                        {/* NEWS-TICKER: match export — full-bleed gradient + solid black footer + ticker */}
                        {preset.layout === 'news_ticker' && (
                            <div
                                className="absolute inset-0 z-30"
                                style={{ pointerEvents: isRepositioningHeadline ? 'auto' : 'none' }}
                            >
                                {preset.rules?.textLogo ? (
                                    <div
                                        className="absolute z-50 text-white font-black leading-tight"
                                        style={{
                                            fontFamily: "'Inter', sans-serif",
                                            whiteSpace: 'pre-line',
                                            fontSize: `${Math.round((preset.rules?.logoSize || 42) * 0.9 * previewScale)}px`,
                                            lineHeight: 1.1,
                                            // Vertical pad must use canvas HEIGHT (9:16 ≠ square) — width-based % sat too low vs Canva
                                            top: (() => {
                                                const [rw, rh] = (preset.ratio || '9:16').split(':').map(Number);
                                                const canvasH = Math.round(720 * (rh / rw));
                                                const padY = preset.name === 'ifc-news'
                                                    ? (preset.rules?.logoPadY ?? 56)
                                                    : (preset.rules?.logoPadY ?? 45);
                                                return `${(padY / canvasH) * 100}%`;
                                            })(),
                                            left: canvasPxToPercent(
                                                preset.name === 'ifc-news'
                                                    ? (preset.rules?.logoPadX ?? 30)
                                                    : (preset.rules?.logoPadX ?? 20)
                                            ),
                                        }}
                                    >
                                        {preset.rules.textLogo}
                                    </div>
                                ) : getLogoUrl(preset.logo) ? (
                                    <div className="absolute z-50" style={preset.rules?.logoPosition === 'bottom-left'
                                        ? { bottom: `${Math.round(12 * previewScale)}px`, left: canvasPxToPercent(preset.rules?.logoPadX ?? 59) }
                                        : { top: canvasPxToPercent(preset.rules?.logoPadY ?? 41), left: canvasPxToPercent(preset.rules?.logoPadX ?? 46) }}>
                                        {/* Export locks ISS by height (55px @720); others by width. Use previewScale px so % height never collapses to intrinsic size. */}
                                        <img
                                            src={getLogoUrl(preset.logo)}
                                            alt=""
                                            style={
                                                preset.rules?.logoPosition === 'bottom-left'
                                                    ? { height: `${Math.round((preset.rules?.logoSize || 55) * previewScale)}px`, width: 'auto', maxWidth: '70%', objectFit: 'contain', display: 'block', opacity: preset.rules?.logoOpacity ?? 1 }
                                                    : { width: canvasPxToPercent(preset.rules?.logoSize || 48), height: 'auto', objectFit: 'contain', display: 'block', opacity: preset.rules?.logoOpacity ?? 1 }
                                            }
                                        />
                                    </div>
                                ) : null}
                                {preset.name === 'indiabusinesscom-news' && (
                                    <div className="absolute z-50" style={{ top: canvasPxToPercent(15), right: canvasPxToPercent(5) }}>
                                        <img src={getLogoUrl('IndianBusinessCom NewsStatic Format (1).png')} style={{ width: canvasPxToPercent(32), height: 'auto', objectFit: 'contain' }} />
                                    </div>
                                )}
                                {(() => {
                                    if (!newsFontReady) return null;
                                    const isIBC = preset.name === 'indiabusinesscom-news';
                                    const isISS = preset.name === 'indiastartupstory-news';
                                    const isIFC = preset.name === 'ifc-news';
                                    const isIFC2 = preset.name === 'ifc2-news';
                                    const ntFontWeight = 700;
                                    const ntFontFamily = "'ITC Avant Garde Gothic', sans-serif";
                                    const [rw, rh] = (preset.ratio || '9:16').split(':').map(Number);
                                    const exportCanvasH = Math.round(720 * (rh / rw));
                                    // Same wrap budget as export (getExportNewsMaxLineWidth already leaves pad room)
                                    const { fontSize: fittedExportFs, lines } = fitNewsTickerPreview(preset.headline, {
                                        baseFontSize: Math.round(54 * effectiveFontScale),
                                        maxWidth: getExportNewsMaxLineWidth(preset),
                                        fontFamily: ntFontFamily,
                                        boldWeight: ntFontWeight,
                                        maxTotalBarsH: Math.round(exportCanvasH * 0.28),
                                    });
                                    const ntFontSize = Math.max(8, fittedExportFs * previewScale);
                                    // Mirror generateNewsTickerOverlay geometry (percent of frame height)
                                    const highlightH = Math.round(fittedExportFs * NEWS_TICKER_HIGHLIGHT_HEIGHT);
                                    const lineGap = Math.round(fittedExportFs * NEWS_TICKER_LINE_GAP);
                                    const totalBarsH = lines.length === 0
                                        ? 0
                                        : lines.length * highlightH + Math.max(0, lines.length - 1) * lineGap;
                                    // IFC Canva-style: tight bottom margin, black hugs the hook (no empty slab)
                                    const bottomMarginPct = isIFC ? 5.5 : 10;
                                    const blackBandHPct = bottomMarginPct + (totalBarsH / exportCanvasH) * 100;
                                    const gradientHPx = Math.min(
                                        isIFC ? 280 : 160,
                                        Math.round(exportCanvasH * (isIFC ? 0.26 : 0.18)),
                                    );
                                    const gradientHPct = (gradientHPx / exportCanvasH) * 100;
                                    const lineGapPx = Math.round(ntFontSize * NEWS_TICKER_LINE_GAP);
                                    // headlinePosition.y = % to raise hook text + gradient
                                    const shiftUpPct = Math.max(0, Math.min(48, localHeadlinePos?.y || 0));
                                    // Match export: solid pad above first line + black always to frame bottom
                                    const blackPadPct = (fittedExportFs * (isIFC ? 0.35 : 0.12) / exportCanvasH) * 100;
                                    const solidBlackHPct = blackBandHPct + shiftUpPct + blackPadPct;
                                    const gradientBottomPct = solidBlackHPct; // gradient sits on top of solid cover

                                    return (
                                        <>
                                            {/* Gradient — steep fade so competitor captions don't read through */}
                                            <div
                                                className="absolute left-0 w-full z-10 pointer-events-none"
                                                style={{
                                                    bottom: `${gradientBottomPct}%`,
                                                    height: `${gradientHPct}%`,
                                                    background: 'linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.92) 75%, rgba(0,0,0,1) 100%)',
                                                }}
                                            />
                                            {/* Solid black ALWAYS to frame bottom (covers competitor lower-third) */}
                                            <div
                                                className="absolute left-0 w-full z-[11] pointer-events-none"
                                                style={{
                                                    bottom: 0,
                                                    height: `${solidBlackHPct}%`,
                                                    background: '#000000',
                                                }}
                                            />
                                            {/* Ticker text */}
                                            <div
                                                className="absolute left-0 right-0 z-20 flex flex-col pointer-events-none"
                                                style={{
                                                    bottom: `${bottomMarginPct + shiftUpPct}%`,
                                                    gap: `${lineGapPx}px`,
                                                    paddingLeft: isISS ? canvasPxToPercent(56) : canvasPxToPercent(16),
                                                    paddingRight: canvasPxToPercent(16),
                                                    boxSizing: 'border-box',
                                                    alignItems: (isIBC || isIFC || isIFC2) ? 'center' : 'flex-start',
                                                }}
                                            >
                                                {lines.map((lineTokens, i) => {
                                                    const runs = [];
                                                    for (const t of lineTokens) {
                                                        if (!runs.length || runs[runs.length - 1].bold !== t.bold)
                                                            runs.push({ bold: t.bold, words: [t.text] });
                                                        else
                                                            runs[runs.length - 1].words.push(t.text);
                                                    }
                                                    return (
                                                        <div key={i} style={{
                                                            display: 'flex', alignItems: 'stretch',
                                                            justifyContent: (isIBC || isIFC || isIFC2) ? 'center' : 'flex-start',
                                                            fontFamily: ntFontFamily,
                                                            fontWeight: ntFontWeight,
                                                            fontSize: `${ntFontSize}px`,
                                                            lineHeight: NEWS_TICKER_HIGHLIGHT_HEIGHT,
                                                            whiteSpace: 'nowrap',
                                                            maxWidth: '100%',
                                                            boxSizing: 'border-box',
                                                        }}>
                                                            {runs.map((run, j) => (
                                                                <span key={j} style={{
                                                                    background: run.bold ? (isIBC ? 'linear-gradient(90deg, #FF8932 0%, #F2EFE1 50%, #3AB26B 100%)' : preset.color) : 'transparent',
                                                                    color: (isIBC || isIFC || isIFC2) ? (run.bold ? '#000000' : '#ffffff') : '#ffffff',
                                                                    padding: run.bold ? '0 4px' : '0 2px',
                                                                    borderRadius: ((isISS || isIFC2) && run.bold) ? '6px' : undefined,
                                                                    flexShrink: 1,
                                                                    minWidth: 0,
                                                                }}>
                                                                    {run.words.join(' ')}{j < runs.length - 1 ? ' ' : ''}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            {/* Drag hit-area for MOVE HOOK — must sit above dismiss layers */}
                                            {isRepositioningHeadline && (
                                                <div
                                                    ref={headlineRef}
                                                    className="absolute left-0 right-0 z-[90] cursor-ns-resize"
                                                    style={{
                                                        bottom: 0,
                                                        height: `${Math.max(solidBlackHPct + gradientHPct, 18)}%`,
                                                        pointerEvents: 'auto',
                                                        touchAction: 'none',
                                                        background: 'rgba(139, 92, 246, 0.12)',
                                                        boxShadow: 'inset 0 0 0 2px rgba(167, 139, 250, 0.9)',
                                                    }}
                                                    onMouseDown={handleHeadlineMouseDown}
                                                    title="Drag up/down to move hook"
                                                >
                                                    <div className="absolute top-1.5 left-1/2 -translate-x-1/2 pointer-events-none bg-violet-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded whitespace-nowrap">
                                                        Drag hook
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
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
                        {preset.layout === 'hook_video' && preset.name !== 'indiabusinesscom' && getLogoUrl(preset.logo) && (
                            <div className="absolute z-50" style={
                                (preset.rules?.logoPosition || 'top-right') === 'top-left'
                                    ? { top: canvasPxToPercent(preset.rules?.logoPadY ?? 8), left: canvasPxToPercent(preset.rules?.logoPadX ?? 8) }
                                    : { top: canvasPxToPercent(preset.rules?.logoPadY ?? 8), right: canvasPxToPercent(preset.rules?.logoPadX ?? 8) }
                            }>
                                <img
                                    src={getLogoUrl(preset.logo)}
                                    style={{
                                        width: canvasPxToPercent(preset.rules?.logoSize ?? 80),
                                        height: canvasPxToPercent(preset.rules?.logoSize ?? 80),
                                        objectFit: preset.rules?.logoCircular !== false ? 'cover' : 'contain',
                                        borderRadius: preset.rules?.logoCircular !== false ? '50%' : undefined,
                                        opacity: preset.rules?.logoOpacity ?? 0.5,
                                    }}
                                />
                            </div>
                        )}

                        {/* Logo overlay for indiabusinesscom - TOP LEFT, full opacity, uncropped */}
                        {preset.name === 'indiabusinesscom' && getLogoUrl(preset.logo) && (
                            <div className="absolute z-50" style={{ top: canvasPxToPercent(preset.rules?.logoPadY ?? 12), left: canvasPxToPercent(preset.rules?.logoPadX ?? 22) }}>
                                <img src={getLogoUrl(preset.logo)} style={{ width: canvasPxToPercent(preset.rules?.logoSize ?? 48), height: canvasPxToPercent(preset.rules?.logoSize ?? 48), objectFit: 'contain', opacity: preset.rules?.logoOpacity ?? 1 }} />
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
                {showCredit && preset.layout !== 'hook_video' && preset.layout !== 'news_ticker' && preset.layout !== 'aroll' && preset.name !== 'peakofai' && preset.name !== 'theprimefounder' && preset.name !== 'neworderai' && !isAicrackedOrEvolvingPreset && (
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
                className={`absolute top-2 left-2 z-[100] flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium shadow-lg border-2 transition-all min-w-[88px] justify-center ${preset.active ? 'bg-violet-500 text-black border-violet-400 ring-1 ring-violet-300' : 'bg-neutral-800/95 text-neutral-300 border-violet-500/60 hover:border-violet-500 hover:bg-violet-500/20 backdrop-blur-sm'}`}
            >
                {preset.active ? <CheckSquare size={14} className="shrink-0" /> : <Square size={14} className="shrink-0 text-violet-400" />}
                <span>{preset.active ? 'Selected' : 'Select'}</span>
            </button>

            <div className={`absolute top-2 right-2 flex gap-1 z-[100] transition-opacity ${isNewsFormat || isResizingVideo || isRepositioning || isRepositioningHeadline ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                {isNewsFormat ? (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsResizingVideo(!isResizingVideo);
                                setIsRepositioning(false);
                                setIsRepositioningHeadline(false);
                            }}
                            className={`px-2 h-6 flex items-center justify-center gap-1 rounded text-[10px] font-semibold uppercase tracking-wide ${isResizingVideo ? 'bg-violet-500 text-white' : 'bg-neutral-800/90 text-neutral-200 backdrop-blur-sm'} hover:bg-violet-600`}
                            title="RE-SIZE video — cover competitor captions with your hook"
                        >
                            <Maximize size={12} />
                            RE-SIZE
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsRepositioningHeadline(!isRepositioningHeadline);
                                setIsResizingVideo(false);
                                setIsRepositioning(false);
                            }}
                            className={`px-2 h-6 flex items-center justify-center gap-1 rounded text-[10px] font-semibold uppercase tracking-wide ${isRepositioningHeadline ? 'bg-violet-500 text-white' : 'bg-neutral-800/90 text-neutral-200 backdrop-blur-sm'} hover:bg-violet-600`}
                            title="Move hook — text, black bar & gradient together"
                        >
                            <Move size={12} />
                            HOOK
                        </button>
                    </>
                ) : (
                    <>
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
                    </>
                )}

                {!isNewsFormat && preset.layout === 'watermark' && preset.name !== 'peakofai' && preset.name !== 'theprimefounder' && preset.name !== 'neworderai' && !isAicrackedOrEvolvingPreset && (
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsRepositioningWatermark(!isRepositioningWatermark); }}
                        className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioningWatermark ? 'bg-green-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-green-600`}
                        title="Reposition Watermark"
                    >
                        <Type size={12} />
                    </button>
                )}

                {!isNewsFormat && (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsRepositioningCredit(!isRepositioningCredit); }}
                            className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioningCredit ? 'bg-purple-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-purple-600`}
                            title="Reposition Credit"
                        >
                            <Edit2 size={12} />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); setIsRepositioningHeadline(!isRepositioningHeadline); }}
                            className={`w-5 h-5 flex items-center justify-center rounded text-xs ${isRepositioningHeadline ? 'bg-violet-500 text-white' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'} hover:bg-violet-600`}
                            title="Reposition Headline"
                        >
                            <Type size={12} />
                        </button>
                    </>
                )}
            </div>

            {isRepositioning && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsRepositioning(false)} />
            )}
            {/* Don't cover the card with a dismiss layer while editing news RE-SIZE / HOOK —
                it stole all mouse events and blocked dragging. Exit via the toggle buttons. */}
            {isResizingVideo && !isNewsFormat && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsResizingVideo(false)} />
            )}
            {isRepositioningHeadline && !isNewsFormat && (
                <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsRepositioningHeadline(false)} />
            )}
        </div>
    );
});

const XP_FONT = "Tahoma, Geneva, 'Segoe UI', sans-serif";

const GRAIN_DATA_URI = `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.7 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`
)}")`;

const PLAYBOOKS = [
    {
        id: 'bizzindia', title: 'Bizz India Playbook', accent: '#E31D38', enabled: true,
        formats: [
            { key: 'aroll', label: 'A-roll' },
            { key: 'news', label: 'News formats' },
        ],
    },
    { id: 'news', title: 'News Playbook', accent: '#3B82F6', enabled: false },
    { id: '101xf', title: '101xf Playbook', accent: '#8B5CF6', enabled: false },
];

function RetroPopup({ title, icon, children, style }) {
    const [closed, setClosed] = useState(false);
    if (closed) return null;
    return (
        <div className="absolute z-10 w-72 shadow-2xl" style={style}>
            <div
                className="flex items-center justify-between px-2 py-1 text-white text-xs font-bold rounded-t-sm"
                style={{ background: 'linear-gradient(#3a93ff, #0058ee)', fontFamily: XP_FONT }}
            >
                <span>{title}</span>
                <button
                    onClick={() => setClosed(true)}
                    className="w-4 h-4 flex items-center justify-center bg-red-500 hover:bg-red-400 rounded-sm text-[9px] leading-none border border-red-700"
                >
                    ✕
                </button>
            </div>
            <div
                className="border border-t-0 border-neutral-400 p-3 rounded-b-sm text-black flex items-start gap-2 text-xs"
                style={{ background: '#ece9d8', fontFamily: XP_FONT }}
            >
                {icon && <span className="text-xl leading-none">{icon}</span>}
                <div className="flex-1">{children}</div>
            </div>
        </div>
    );
}

function DiscIcon({ accent, enabled }) {
    return (
        <div
            className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-md overflow-hidden ${!enabled ? 'grayscale opacity-60' : ''}`}
            style={{
                background: 'conic-gradient(from 200deg, #e6e6e6, #ffffff, #c9c9c9, #ffffff, #d8d8d8, #ffffff, #e6e6e6)',
                border: '1px solid rgba(0,0,0,0.35)',
            }}
        >
            <div className="absolute inset-0 rounded-full" style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 30%)' }} />
            <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: accent, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.3)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-900" />
            </div>
        </div>
    );
}

function StartMenu({ onSelect, onClose }) {
    return (
        <div
            className="fixed bottom-10 left-0 z-30 w-72 rounded-t-md overflow-hidden shadow-2xl border border-black/30"
            style={{ fontFamily: XP_FONT }}
            onClick={(e) => e.stopPropagation()}
        >
            {/* header banner */}
            <div className="flex items-center gap-2 px-3 py-2" style={{ background: 'linear-gradient(#3a93ff, #0058ee)' }}>
                <span className="text-white font-bold text-sm">PINTU</span>
            </div>
            {/* items */}
            <div className="bg-white py-1">
                {PLAYBOOKS.map((pb) => (
                    <button
                        key={pb.id}
                        type="button"
                        disabled={!pb.enabled}
                        onClick={() => { if (pb.enabled) { onSelect(pb.id, pb.title); onClose(); } }}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm ${pb.enabled ? 'hover:bg-[#316ac5] hover:text-white text-black cursor-pointer' : 'text-neutral-400 cursor-not-allowed'}`}
                    >
                        <span className="flex-1 font-medium">{pb.title}</span>
                        {!pb.enabled && <span className="text-[10px] uppercase tracking-wide">Coming soon</span>}
                    </button>
                ))}
            </div>
            <div className="border-t border-neutral-300" style={{ background: '#ece9d8' }}>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full text-right px-3 py-1.5 text-xs text-neutral-600 hover:text-black"
                >
                    Close
                </button>
            </div>
        </div>
    );
}

function PlaybookCard({ pb, onOpen, isDark, isActive }) {
    return (
        <button
            type="button"
            disabled={!pb.enabled}
            onClick={(e) => { e.stopPropagation(); pb.enabled && onOpen(pb.id, pb.title); }}
            className={`group relative w-48 sm:w-52 rounded-2xl p-6 flex flex-col items-center gap-4 overflow-hidden isolate transition-all duration-300 ${isDark
                    ? 'bg-white/[0.06] border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_32px_rgba(0,0,0,0.4)] hover:bg-white/[0.09] hover:border-white/25'
                    : 'bg-white/80 backdrop-blur-md border border-white/60 shadow-[0_8px_30px_rgba(0,0,0,0.08)] hover:shadow-[0_16px_40px_rgba(0,0,0,0.12)]'
                } ${isActive ? '-translate-y-1 !border-violet-500 ring-2 ring-violet-500/50' : ''} ${pb.enabled ? 'cursor-pointer hover:-translate-y-1' : 'opacity-60 grayscale cursor-not-allowed'}`}
        >
            <div className="scale-125">
                <DiscIcon accent={pb.accent} enabled={pb.enabled} />
            </div>
            <span className={`text-base font-semibold text-center leading-tight ${isDark ? 'text-white' : 'text-neutral-800'}`}>{pb.title}</span>
            {!pb.enabled && (
                <span className={`text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-neutral-400' : 'bg-neutral-200 text-neutral-500'}`}>Coming soon</span>
            )}
        </button>
    );
}

function MacWindow({ isDark }) {
    return (
        <div className={`w-full max-w-2xl rounded-xl overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl ${isDark ? 'border border-white/10 bg-neutral-900/90' : 'border border-black/10 bg-white/90'}`}>
            {/* title bar */}
            <div className={`grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-3 border-b ${isDark ? 'bg-gradient-to-b from-neutral-800 to-neutral-900 border-white/10' : 'bg-gradient-to-b from-neutral-100 to-neutral-200 border-black/10'}`}>
                <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#ff5f57] border border-black/10" />
                    <span className="w-3 h-3 rounded-full bg-[#febc2e] border border-black/10" />
                    <span className="w-3 h-3 rounded-full bg-[#28c840] border border-black/10" />
                </div>
                <span className={`text-center text-xs font-medium truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>FS.app</span>
                <div className="w-12" />
            </div>
            {/* body */}
            <div className={`relative h-[440px] flex items-center justify-center overflow-hidden ${isDark ? 'bg-gradient-to-b from-neutral-900 to-black' : 'bg-gradient-to-b from-neutral-50 to-neutral-100'}`}>
                <div className="absolute w-80 h-80 rounded-full bg-orange-400/30 blur-[70px] pintu-logo-glow" />
                <img
                    src="/images/FS%20without%20bg.png"
                    alt="FS"
                    className="relative w-72 h-72 drop-shadow-xl"
                />
            </div>
        </div>
    );
}

function XPDesktop({ onSelect, theme = 'light', onToggleTheme }) {
    const isDark = theme === 'dark';

    // Enter playbook directly — A-roll / News switch lives in the playbook header.
    const handleOpen = (playbookId, label) => {
        onSelect(playbookId, label);
    };

    return (
        <div className="relative min-h-screen w-full overflow-hidden select-none" style={{ fontFamily: XP_FONT }}>
            <style>
                {`
                @keyframes pintuLogoSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes pintuLogoGlow { 0%, 100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.6; transform: scale(1.08); } }
                .pintu-logo-spin { animation: pintuLogoSpin 18s linear infinite; }
                .pintu-logo-glow { animation: pintuLogoGlow 4s ease-in-out infinite; }
                `}
            </style>

            {onToggleTheme && (
                <button
                    type="button"
                    onClick={onToggleTheme}
                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                    className={`fixed top-6 right-6 z-20 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white/80 hover:bg-white'}`}
                >
                    <span className="text-base leading-none">{isDark ? '☀️' : '🌙'}</span>
                </button>
            )}

            {isDark ? (
                <>
                    {/* true black background, just a whisper of color */}
                    <div className="absolute inset-0 bg-black" />
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-purple-600/10 blur-[110px]" />
                        <div className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full bg-blue-600/8 blur-[110px]" />
                        <div className="absolute -bottom-32 left-1/4 w-[440px] h-[440px] rounded-full bg-orange-600/10 blur-[110px]" />
                    </div>

                    {/* subtle black mist for depth */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/4 left-0 w-[700px] h-[550px] rounded-full bg-white/[0.02] blur-[120px]" />
                        <div className="absolute bottom-0 right-0 w-[750px] h-[550px] rounded-full bg-white/[0.02] blur-[130px]" />
                    </div>

                    {/* misty film grain texture */}
                    <div
                        className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-[0.1]"
                        style={{ backgroundImage: GRAIN_DATA_URI, backgroundSize: '90px 90px' }}
                    />
                </>
            ) : (
                <>
                    {/* dreamy white background */}
                    <div className="absolute inset-0 bg-white" />
                    <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full bg-purple-200/50 blur-[100px]" />
                        <div className="absolute top-1/3 -right-24 w-[380px] h-[380px] rounded-full bg-blue-200/50 blur-[100px]" />
                        <div className="absolute -bottom-32 left-1/4 w-[440px] h-[440px] rounded-full bg-pink-200/40 blur-[100px]" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-100/30 blur-[120px]" />
                    </div>

                    {/* white mist (dominant) + a touch of black */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute top-1/4 left-0 w-[700px] h-[550px] rounded-full bg-neutral-300/50 blur-[110px]" />
                        <div className="absolute bottom-0 right-0 w-[750px] h-[550px] rounded-full bg-neutral-300/45 blur-[120px]" />
                        <div className="absolute top-0 right-1/4 w-[600px] h-[450px] rounded-full bg-neutral-200/50 blur-[110px]" />
                        <div className="absolute bottom-1/4 left-1/3 w-[600px] h-[450px] rounded-full bg-neutral-200/45 blur-[120px]" />
                        <div className="absolute top-10 left-1/3 w-[350px] h-[250px] rounded-full bg-black/[0.06] blur-[100px]" />
                        <div className="absolute bottom-10 right-1/3 w-[300px] h-[220px] rounded-full bg-black/[0.05] blur-[110px]" />
                    </div>

                    {/* misty film grain texture */}
                    <div
                        className="absolute inset-0 pointer-events-none mix-blend-multiply opacity-[0.12]"
                        style={{ backgroundImage: GRAIN_DATA_URI, backgroundSize: '90px 90px' }}
                    />
                </>
            )}

            {/* playbooks (left, gallery row) + animated logo window (right) */}
            <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-16 overflow-y-auto">
                <div className="w-full max-w-[1400px] flex flex-col xl:flex-row items-center gap-10 xl:gap-16">
                    <div className="shrink-0 flex flex-col gap-8 items-center">
                        <div className="text-center">
                            <p className={`text-sm font-semibold tracking-[0.4em] uppercase mb-2 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>PINTU</p>
                            <h1 className={`text-3xl font-semibold ${isDark ? 'text-white' : 'text-neutral-800'}`}>Pick your playbook</h1>
                        </div>
                        <div className="flex flex-row flex-wrap justify-center gap-4">
                            {PLAYBOOKS.map((pb) => (
                                <PlaybookCard key={pb.id} pb={pb} onOpen={handleOpen} isDark={isDark} isActive={false} />
                            ))}
                        </div>
                    </div>
                    <div className="flex-1 flex justify-center w-full min-w-0">
                        <MacWindow isDark={isDark} />
                    </div>
                </div>
            </div>
        </div>
    );
}

function DvdLoadingScreen({ label }) {
    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center text-white" style={{ fontFamily: XP_FONT }}>
            <style>
                {`
                @keyframes dvdSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes dvdLoadBar { from { width: 0%; } to { width: 100%; } }
                `}
            </style>
            <img
                src="/images/FS%20without%20bg.png"
                alt="FS"
                className="w-28 h-28 rounded-full mb-6 grayscale"
                style={{ animation: 'dvdSpin 1s linear infinite' }}
            />
            <p className="text-sm tracking-wide text-neutral-400">Reading disc…</p>
            <p className="text-lg font-semibold mt-1">{label}</p>
            <div className="w-64 h-2 bg-neutral-800 rounded-full mt-6 overflow-hidden">
                <div className="h-full bg-blue-500" style={{ animation: 'dvdLoadBar 1.4s ease-in-out forwards' }} />
            </div>
        </div>
    );
}

export default function App() {
    const [screen, setScreen] = useState('desktop'); // 'desktop' | 'loading' | 'app'
    const [loadingLabel, setLoadingLabel] = useState('');
    // Bizz India format set — switched inside the playbook (not on the desktop picker)
    const [playbookFormat, setPlaybookFormat] = useState('aroll'); // 'aroll' | 'news'
    const [activeTool, setActiveTool] = useState('video'); // 'video' | 'text'
    const [videoSrc, setVideoSrc] = useState(null);
    const videoFileRef = useRef(null); // Store original file for server upload
    const [presets, setPresets] = useState(INITIAL_PRESETS);
    const [isDraggingVideo, setIsDraggingVideo] = useState(false);

    // --- THEME (light default; dark keeps the original black/misty look) ---
    const [theme, setTheme] = useState(() => {
        if (typeof window === 'undefined') return 'light';
        return window.localStorage.getItem('pintu-theme') || 'light';
    });
    useEffect(() => {
        window.localStorage.setItem('pintu-theme', theme);
    }, [theme]);
    const isDark = theme === 'dark';
    const themeVars = {
        '--pintu-bg': isDark ? '#000000' : '#d9dade',
        '--pintu-header-bg': isDark ? '#000000' : '#ffffff',
        '--pintu-header-border': isDark ? '#262626' : '#c8cacd',
        '--pintu-rail-bg': isDark ? '#000000' : '#ffffff',
        '--pintu-panel-bg': isDark ? '#000000' : '#d9dade',
        '--pintu-card-bg': isDark ? 'rgba(255,255,255,0.03)' : '#f7f6f3',
        '--pintu-card-border': isDark ? 'rgba(255,255,255,0.2)' : '#c8cacd',
        '--pintu-card-header-bg': isDark ? 'rgba(255,255,255,0.05)' : '#eceef0',
        '--pintu-card-header-border': isDark ? 'rgba(255,255,255,0.1)' : '#c8cacd',
        '--pintu-text-primary': isDark ? '#ffffff' : '#171717',
        '--pintu-text-secondary': isDark ? '#d4d4d4' : '#262626',
        '--pintu-text-muted': isDark ? '#a3a3a3' : '#525252',
        '--pintu-text-faint': isDark ? '#737373' : '#6b6b6b',
        '--pintu-accent': isDark ? '#a78bfa' : '#7c3aed',
        '--pintu-input-bg': isDark ? '#171717' : '#ffffff',
        '--pintu-input-border': isDark ? '#404040' : '#b8bac0',
        '--pintu-track-bg': isDark ? '#404040' : '#b8bac0',
        '--pintu-toggle-bg': isDark ? 'rgba(255,255,255,0.05)' : '#e0e1e5',
        '--pintu-toggle-border': isDark ? 'rgba(255,255,255,0.1)' : '#c8cacd',
        '--pintu-icon-inactive': isDark ? '#a3a3a3' : '#525252',
        '--pintu-icon-hover-bg': isDark ? '#262626' : '#c8cacd',
        '--pintu-right-bg': isDark ? '#0a0a0a' : '#c7c9cd',
        '--pintu-scrollbar-thumb': isDark ? '#52525b' : '#a9abb0',
    };

    const buildBizzIndiaPresets = (format, textState = {}) => {
        const names = format === 'news' ? BIZZINDIA_NEWS_PRESET_NAMES : BIZZINDIA_PLAYBOOK_PRESET_NAMES;
        const {
            headline = DEFAULT_HEADLINE,
            footer = DEFAULT_FOOTER,
            hookEyebrow = '',
            showHookEyebrow = false,
            hookEyebrowAlignment = 'left',
            hookEyebrowSizeScale = 1.1,
            hookEyebrowGapScale = 7.0,
        } = textState;
        // Always rehydrate from INITIAL_PRESETS so news ratios stay correct
        // (ifc 9:16, others 4:5) even after HMR / stale state.
        return INITIAL_PRESETS.filter(p => names.includes(p.name)).map(p => ({
            ...p,
            headline,
            // News / hook_video / aroll never use credits
            footer: (format === 'news' || p.layout === 'news_ticker' || p.layout === 'hook_video' || p.layout === 'aroll')
                ? ''
                : footer,
            hookEyebrow,
            showHookEyebrow,
            hookEyebrowAlignment,
            hookEyebrowSizeScale,
            hookEyebrowGapScale,
        }));
    };

    const enterPlaybook = (playbookId, label, format) => {
        const fmt = format || 'aroll';
        if (playbookId === 'bizzindia') {
            setPlaybookFormat(fmt);
            setPresets(buildBizzIndiaPresets(fmt));
            const pb = PLAYBOOKS.find(x => x.id === 'bizzindia');
            const formatLabel = pb?.formats?.find(f => f.key === fmt)?.label;
            setLoadingLabel(formatLabel ? `${pb.title} — ${formatLabel}` : (label || pb?.title || 'Bizz India Playbook'));
        } else {
            setLoadingLabel(label);
        }
        setScreen('loading');
    };

    useEffect(() => {
        if (screen !== 'loading') return;
        const t = setTimeout(() => setScreen('app'), 1500);
        return () => clearTimeout(t);
    }, [screen]);

    // Config
    const [viewMode, setViewMode] = useState('grid');
    const [fitMode, setFitMode] = useState('cover');
    const [fontScale, setFontScale] = useState(1);
    const [editMode, setEditMode] = useState('global');
    const [videoScale, setVideoScale] = useState(100); // Video scale in percentage (100 = 100%)
    const [showCredit, setShowCredit] = useState(false); // Credit UI removed; keep hidden by default
    const [wordSpacing, setWordSpacing] = useState(0.25); // Word spacing multiplier (0.25 = 25% of normal space width for very tight, natural spacing)

    // Global Text State
    const [globalHeadline, setGlobalHeadline] = useState(DEFAULT_HEADLINE);
    const [globalFooter, setGlobalFooter] = useState(DEFAULT_FOOTER);
    const [globalHookEyebrow, setGlobalHookEyebrow] = useState('');
    const [globalShowHookEyebrow, setGlobalShowHookEyebrow] = useState(false);
    const [globalHookEyebrowAlignment, setGlobalHookEyebrowAlignment] = useState('left');
    const [globalHookEyebrowSizeScale, setGlobalHookEyebrowSizeScale] = useState(1.1);
    const [globalHookEyebrowGapScale, setGlobalHookEyebrowGapScale] = useState(7.0);
    const [ideaName, setIdeaName] = useState('');

    // In-playbook format switch — swaps preset cards only. Video, export job,
    // headlines, and other session state stay put (Canva-style background switch).
    const switchPlaybookFormat = (format) => {
        if (format === playbookFormat) return;
        setPlaybookFormat(format);
        const pb = PLAYBOOKS.find(x => x.id === 'bizzindia');
        const formatLabel = pb?.formats?.find(f => f.key === format)?.label;
        if (pb && formatLabel) setLoadingLabel(`${pb.title} — ${formatLabel}`);
        setPresets(buildBizzIndiaPresets(format, {
            headline: globalHeadline,
            footer: globalFooter,
            hookEyebrow: globalHookEyebrow,
            showHookEyebrow: globalShowHookEyebrow,
            hookEyebrowAlignment: globalHookEyebrowAlignment,
            hookEyebrowSizeScale: globalHookEyebrowSizeScale,
            hookEyebrowGapScale: globalHookEyebrowGapScale,
        }));
    };

    // System
    const videoRef = useRef(null);
    // Per-job abort + poll handles (not stored in React state)
    const exportJobControllersRef = useRef(new Map());
    const exportJobIdCounterRef = useRef(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
    // Pipeline: up to 5 export jobs run in a tray while the editor stays free
    const MAX_PIPELINE_JOBS = 5;
    const [exportJobs, setExportJobs] = useState([]);
    // status: 'uploading' | 'processing' | 'completed' | 'failed' | 'stopped'
    const [showKoushikPopup, setShowKoushikPopup] = useState(false);
    const [presetSearch, setPresetSearch] = useState('');

    const pipelineFull = exportJobs.length >= MAX_PIPELINE_JOBS;
    const updateExportJob = useCallback((localId, patch) => {
        setExportJobs(prev => prev.map(j => j.id === localId ? { ...j, ...patch } : j));
    }, []);

    const clearExportJobController = useCallback((localId) => {
        const entry = exportJobControllersRef.current.get(localId);
        if (!entry) return;
        if (entry.pollInterval) clearInterval(entry.pollInterval);
        exportJobControllersRef.current.delete(localId);
    }, []);

    const resolveExportServerUrl = useCallback(() => {
        if (typeof window === 'undefined') return '';
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1' || window.location.origin.includes('ngrok')) {
            return window.location.origin;
        }
        return `http://${host}:3002`;
    }, []);

    const cancelServerJob = useCallback(async (jobId) => {
        if (!jobId) return;
        try {
            await fetch(`${resolveExportServerUrl()}/api/job/${jobId}/cancel`, { method: 'POST' });
        } catch (err) {
            console.warn('Server cancel failed:', err);
        }
    }, [resolveExportServerUrl]);

    const stopExportJob = useCallback(async (localId) => {
        const entry = exportJobControllersRef.current.get(localId);
        let jobId = entry?.jobId || null;
        if (entry?.abortController) {
            entry.abortController.abort();
        }
        clearExportJobController(localId);
        setExportJobs(prev => {
            if (!jobId) jobId = prev.find(j => j.id === localId)?.jobId || null;
            return prev.map(j => j.id === localId
                ? { ...j, status: 'stopped', statusText: 'Stopping server…', progress: 0 }
                : j);
        });
        await cancelServerJob(jobId);
        updateExportJob(localId, { status: 'stopped', statusText: 'Stopped', progress: 0 });
    }, [cancelServerJob, clearExportJobController, updateExportJob]);

    const dismissExportJob = useCallback(async (localId) => {
        const entry = exportJobControllersRef.current.get(localId);
        let jobId = entry?.jobId || null;
        let shouldCancel = false;
        if (entry?.abortController) {
            entry.abortController.abort();
        }
        clearExportJobController(localId);
        setExportJobs(prev => {
            const j = prev.find(x => x.id === localId);
            if (!jobId) jobId = j?.jobId || null;
            shouldCancel = !!(j && (j.status === 'uploading' || j.status === 'processing' || j.status === 'stopped'));
            // still cancel if user dismissed while "Stopping…"
            return prev.filter(x => x.id !== localId);
        });
        if (shouldCancel && jobId) {
            await cancelServerJob(jobId);
        }
    }, [cancelServerJob, clearExportJobController]);

    // Cleanup polls on unmount
    useEffect(() => {
        return () => {
            for (const [, entry] of exportJobControllersRef.current) {
                if (entry.pollInterval) clearInterval(entry.pollInterval);
                if (entry.abortController) entry.abortController.abort();
            }
            exportJobControllersRef.current.clear();
        };
    }, []);

    // News-ticker headlines measure/wrap using this custom font. Custom @font-face fonts load
    // asynchronously, so canvas measurement done before the font is ready silently falls back to
    // a generic font's (narrower) metrics — wrapping the text wrong and clipping it. The news
    // ticker text is not rendered at all until this flips true, so it's never shown mis-wrapped.
    const [newsFontReady, setNewsFontReady] = useState(false);
    useEffect(() => {
        if (!document.fonts) { setNewsFontReady(true); return; }
        document.fonts.load("700 54px 'ITC Avant Garde Gothic'")
            .catch(() => {})
            .then(() => document.fonts.ready)
            .then(() => {
                resetMeasureCtx();
                setNewsFontReady(true);
            });
    }, []);

  // Keep news-ticker output ratios in sync (ifc → 9:16, others → 4:5).
  // Also strip any leftover credits stamped by global footer sync,
  // and refresh logo path so white+highlight Founders CORE asset shows in preview.
  useEffect(() => {
        setPresets(prev => {
            let changed = false;
            const next = prev.map(p => {
                if (p.layout !== 'news_ticker') return p;
                const src = INITIAL_PRESETS.find(x => x.name === p.name);
                let nextP = p;
                if (src && p.ratio !== src.ratio) {
                    changed = true;
                    nextP = { ...nextP, ratio: src.ratio };
                }
                if (src && src.logo && p.logo !== src.logo) {
                    changed = true;
                    nextP = { ...nextP, logo: src.logo };
                }
                if (nextP.footer) {
                    changed = true;
                    nextP = { ...nextP, footer: '' };
                }
                return nextP;
            });
            return changed ? next : prev;
        });
    }, []);

    const searchQuery = (presetSearch || '').trim().toLowerCase();

    // --- PASTE LISTENER ---
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob.type.startsWith('video/')) {
                        const file = new File([blob], 'pasted-video.mp4', { type: blob.type });
                        videoFileRef.current = file;
                        setVideoSrc(prev => {
                            if (prev && typeof prev === 'string' && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                            return URL.createObjectURL(blob);
                        });
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
            videoFileRef.current = file;
            setVideoSrc(prev => {
                if (prev && typeof prev === 'string' && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
            setIsPlaying(true);
        }
    }, []);

    const onDragOverVideo = (e) => { e.preventDefault(); setIsDraggingVideo(true); };
    const onDragLeaveVideo = (e) => { e.preventDefault(); setIsDraggingVideo(false); };
    const onDropVideo = (e) => {
        e.preventDefault(); setIsDraggingVideo(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('video/')) {
            videoFileRef.current = file;
            setVideoSrc(prev => {
                if (prev && typeof prev === 'string' && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
                return URL.createObjectURL(file);
            });
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
        // News / hook_video / aroll never use credits — don't stamp DEFAULT_FOOTER onto them.
        setPresets(prev => prev.map(p => ({
            ...p,
            headline: headline,
            footer: (p.layout === 'news_ticker' || p.layout === 'hook_video' || p.layout === 'aroll')
                ? ''
                : footer,
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
        const next = Math.max(100, Math.min(300, Math.round(scale)));
        setVideoScale(next);
        // News RE-SIZE via sidebar: same top-bias as card handles so captions
        // drop under the hook without needing extreme zoom (esp. full-bleed ifc).
        if (playbookFormat === 'news' && next > 100) {
            const t = (next - 100) / 200;
            setPresets(prev => prev.map(p => {
                if (p.layout !== 'news_ticker') return p;
                const isIfc = (p.name || '').toLowerCase() === 'ifc-news';
                const maxZ = isIfc ? 220 : 300;
                const tt = Math.min(1, (next - 100) / (maxZ - 100));
                const y = Math.max(isIfc ? 8 : 5, 50 * (1 - tt * 0.85));
                return { ...p, position: { ...(p.position || { x: 50, y: 50 }), y } };
            }));
        }
    }, [playbookFormat]);

    const togglePlay = useCallback(() => {
        // Play/pause every preset preview, regardless of export-selection state
        const videos = document.querySelectorAll('video[data-preset-id]');
        videos.forEach(v => {
            if (isPlaying) {
                v.pause();
            } else {
                v.play().catch(() => { });
            }
        });
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        const videos = document.querySelectorAll('video[data-preset-id]');
        videos.forEach(v => {
            v.muted = !isMuted;
        });
        setIsMuted(!isMuted);
    }, [isMuted]);

    const togglePresetActive = useCallback((id) => {
        setPresets(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
    }, []);


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

    // Free the editor so the next video can be uploaded/edited while exports continue
    const clearEditorForNextVideo = useCallback(() => {
        setVideoSrc(prev => {
            if (prev && typeof prev === 'string' && prev.startsWith('blob:')) {
                URL.revokeObjectURL(prev);
            }
            return null;
        });
        videoFileRef.current = null;
        setIsPlaying(false);
        setGlobalHeadline(DEFAULT_HEADLINE);
        setGlobalFooter(DEFAULT_FOOTER);
        setGlobalHookEyebrow('');
        setGlobalShowHookEyebrow(false);
        setGlobalHookEyebrowAlignment('left');
        setGlobalHookEyebrowSizeScale(1.1);
        setGlobalHookEyebrowGapScale(7.0);
        setIdeaName('');
        setFontScale(1);
        setWordSpacing(0.25);
        setVideoScale(100);
        setFitMode('cover');
        setShowCredit(false);
        setPresets(prev => prev.map(p => ({
            ...p,
            active: false,
            headline: DEFAULT_HEADLINE,
            footer: (p.layout === 'news_ticker' || p.layout === 'hook_video' || p.layout === 'aroll')
                ? ''
                : DEFAULT_FOOTER,
            hookEyebrow: '',
            showHookEyebrow: false,
            hookEyebrowAlignment: 'left',
            hookEyebrowSizeScale: 1.1,
            hookEyebrowGapScale: 7.0,
        })));
    }, []);

    const pollExportJob = useCallback(async (localId, jobId, signal) => {
        if (signal.aborted) return;
        const entry = exportJobControllersRef.current.get(localId);
        if (entry?.polling) return; // single-flight — avoid overlapping polls
        if (entry) entry.polling = true;
        try {
            const statusResponse = await fetch(`${SERVER_URL}/api/job/${jobId}`, { signal });
            if (signal.aborted) return;
            if (!statusResponse.ok) throw new Error('Failed to get job status');

            const jobStatus = await statusResponse.json();
            if (signal.aborted) return;

            if (jobStatus.error === '404' || (!jobStatus.state && jobStatus.error)) {
                clearExportJobController(localId);
                updateExportJob(localId, { status: 'failed', statusText: 'Job lost (server restarted?)' });
                return;
            }

            if (jobStatus.state === 'completed') {
                clearExportJobController(localId);
                updateExportJob(localId, { progress: 100, statusText: 'Export complete! 100%' });

                const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

                if (isLocalhost) {
                    updateExportJob(localId, { statusText: 'Export complete! Downloading ZIP...' });
                    const a = document.createElement('a');
                    a.href = `${SERVER_URL}/api/download/${jobId}`;
                    a.download = '';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    updateExportJob(localId, { status: 'completed', statusText: 'Done — ZIP downloaded', progress: 100 });
                } else {
                    updateExportJob(localId, { statusText: 'Export complete! Uploading to Drive...' });
                    try {
                        const driveRes = await fetch(`${SERVER_URL}/api/upload-to-drive`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ jobId }),
                            signal,
                        });
                        if (!driveRes.ok) {
                            const j = await driveRes.json().catch(() => ({}));
                            throw new Error(j.error || `HTTP ${driveRes.status}`);
                        }
                        const data = await driveRes.json();
                        const links = data.files ? data.files.map(f => f.webViewLink).filter(Boolean) : [];
                        updateExportJob(localId, {
                            status: 'completed',
                            statusText: links.length ? 'Uploaded to Google Drive' : 'Done',
                            progress: 100,
                            driveLinks: links,
                        });
                    } catch (err) {
                        if (err.name === 'AbortError') return;
                        console.error('Drive upload error:', err);
                        updateExportJob(localId, {
                            status: 'failed',
                            statusText: `Drive upload failed: ${err.message}`,
                        });
                    }
                }
            } else if (jobStatus.state === 'failed') {
                clearExportJobController(localId);
                const reason = jobStatus.failedReason || 'Unknown error. Check server console.';
                updateExportJob(localId, { status: 'failed', statusText: `Export failed: ${reason}` });
            } else if (jobStatus.state === 'cancelled') {
                clearExportJobController(localId);
                updateExportJob(localId, { status: 'stopped', statusText: 'Stopped', progress: 0 });
            } else {
                const p = jobStatus.progress;
                if (p && typeof p === 'object') {
                    const percent = typeof p.percent === 'number'
                        ? p.percent
                        : (p.total > 0 ? (p.current / p.total) * 100 : 0);
                    const presetLabel = p.preset || '';
                    const idx = Math.min((p.current || 0) + (p.phase === 'done' ? 0 : 1), p.total || 0);
                    let statusText;
                    if (p.phase === 'overlay') {
                        statusText = `Preparing ${presetLabel} (${idx}/${p.total}) — ${Math.round(percent)}%`;
                    } else if (p.phase === 'encoding') {
                        const enc = Math.round(p.encodePercent || 0);
                        statusText = `Encoding ${presetLabel} ${enc}% · ${Math.round(percent)}% overall (${idx}/${p.total})`;
                    } else {
                        statusText = `Processing ${presetLabel} (${p.current}/${p.total}) — ${Math.round(percent)}%`;
                    }
                    updateExportJob(localId, {
                        status: 'processing',
                        progress: percent,
                        statusText,
                    });
                } else if (jobStatus.state === 'waiting') {
                    updateExportJob(localId, {
                        status: 'processing',
                        progress: 0,
                        statusText: 'Queued — waiting for previous export…',
                    });
                } else {
                    updateExportJob(localId, {
                        status: 'processing',
                        statusText: `Processing on server… (${jobId})`,
                    });
                }
            }
        } catch (err) {
            if (err.name === 'AbortError') return;
            console.error('Error polling job status:', err);
            // Don't kill the job on a single blip — next interval retries
        } finally {
            const e = exportJobControllersRef.current.get(localId);
            if (e) e.polling = false;
        }
    }, [SERVER_URL, clearExportJobController, updateExportJob]);

    // --- SERVER-SIDE EXPORT LOGIC (pipeline: non-blocking, up to 5 jobs) ---
    const startExportJob = async () => {
        const activePresets = presets
            .filter(p => p.active)
            .map(p => p.layout === 'news_ticker' ? { ...p, footer: '' } : p);
        if (!videoSrc || activePresets.length === 0) return;
        if (exportJobs.length >= MAX_PIPELINE_JOBS) return;

        // Resolve video file BEFORE clearing editor (clear revokes the blob URL)
        let videoFile = videoFileRef.current;
        const snapshotSrc = videoSrc;
        if (!videoFile && snapshotSrc?.startsWith('blob:')) {
            try {
                const response = await fetch(snapshotSrc);
                const blob = await response.blob();
                videoFile = new File([blob], 'video.mp4', { type: blob.type || 'video/mp4' });
            } catch (err) {
                console.error('Error fetching blob:', err);
                return;
            }
        }
        if (!videoFile) return;

        const snapshotHeadline = globalHeadline;
        const snapshotFontScale = fontScale;
        const snapshotWordSpacing = wordSpacing;
        const snapshotVideoScale = videoScale;
        const snapshotFitMode = fitMode;
        const snapshotShowCredit = showCredit;
        const snapshotIdeaName = ideaName || '';
        const snapshotPresets = activePresets;
        const label = snapshotIdeaName
            || (videoFile?.name)
            || `Export ${exportJobIdCounterRef.current + 1}`;

        const localId = `local-${++exportJobIdCounterRef.current}`;
        const abortController = new AbortController();
        const signal = abortController.signal;

        exportJobControllersRef.current.set(localId, { abortController, pollInterval: null });
        setExportJobs(prev => [...prev, {
            id: localId,
            label,
            jobId: null,
            status: 'uploading',
            progress: 0,
            statusText: 'Uploading video to server...',
            driveLinks: [],
            cloudLinks: [],
        }]);

        // Free editor immediately so the next video can be set up
        clearEditorForNextVideo();

        try {
            const formData = new FormData();
            formData.append('presets', JSON.stringify(snapshotPresets));
            formData.append('headline', snapshotHeadline);
            formData.append('fontScale', snapshotFontScale.toString());
            formData.append('wordSpacing', snapshotWordSpacing.toString());
            formData.append('videoScale', snapshotVideoScale.toString());
            formData.append('fitMode', snapshotFitMode);
            formData.append('showCredit', snapshotShowCredit.toString());
            formData.append('ideaName', snapshotIdeaName);
            formData.append('video', videoFile);

            console.log('Uploading video to server...', {
                localId,
                fileName: videoFile.name,
                fileSize: (videoFile.size / 1024 / 1024).toFixed(2) + ' MB',
                fileType: videoFile.type,
                presetCount: snapshotPresets.length
            });

            updateExportJob(localId, { statusText: 'Uploading video file...' });
            const uploadResponse = await fetch(`${SERVER_URL}/api/export`, {
                method: 'POST',
                body: formData,
                signal
            });

            if (signal.aborted) {
                updateExportJob(localId, { status: 'stopped', statusText: 'Stopped' });
                clearExportJobController(localId);
                return;
            }

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
            if (signal.aborted) {
                await cancelServerJob(jobId);
                updateExportJob(localId, { status: 'stopped', statusText: 'Stopped' });
                clearExportJobController(localId);
                return;
            }

            updateExportJob(localId, {
                jobId,
                status: 'processing',
                progress: 1,
                statusText: `Queued… (${jobId})`,
            });

            const poll = () => pollExportJob(localId, jobId, signal);
            const pollInterval = setInterval(poll, 1000);
            const entry = exportJobControllersRef.current.get(localId);
            if (entry) {
                entry.pollInterval = pollInterval;
                entry.jobId = jobId;
            } else {
                // Stop raced us — cancel server and clear orphaned interval
                clearInterval(pollInterval);
                await cancelServerJob(jobId);
                return;
            }
            poll();
        } catch (error) {
            if (error.name === 'AbortError') {
                updateExportJob(localId, { status: 'stopped', statusText: 'Stopped', progress: 0 });
                clearExportJobController(localId);
                return;
            }
            console.error('Server export error:', error);
            updateExportJob(localId, { status: 'failed', statusText: `Error: ${error.message}` });
            clearExportJobController(localId);
        }
    };

    if (screen === 'desktop') {
        return <XPDesktop onSelect={enterPlaybook} theme={theme} onToggleTheme={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))} />;
    }

    if (screen === 'loading') {
        return <DvdLoadingScreen label={loadingLabel} />;
    }

    return (
        <div
            className="min-h-screen bg-[var(--pintu-bg)] text-[var(--pintu-text-primary)] flex flex-col h-full overflow-hidden"
            data-theme={theme}
            style={{ fontFamily: "'Inter', sans-serif", ...themeVars }}
        >

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
                /* ITC Avant Garde Gothic Bold for the 4 "News formats" presets (served from public/fonts/) */
                @font-face {
                    font-family: 'ITC Avant Garde Gothic';
                    font-style: normal;
                    font-weight: 700;
                    font-display: swap;
                    src: url('/fonts/ITCAvantGardeGothic-Bold.otf') format('opentype');
                }
                .pintu-scroll::-webkit-scrollbar {
                    width: 8px;
                    height: 8px;
                }
                .pintu-scroll::-webkit-scrollbar-track {
                    background: transparent;
                }
                .pintu-scroll::-webkit-scrollbar-thumb {
                    background-color: var(--pintu-scrollbar-thumb);
                    border-radius: 9999px;
                }
                .pintu-scroll::-webkit-scrollbar-thumb:hover {
                    background-color: #f97316;
                }
                .pintu-scroll {
                    scrollbar-width: thin;
                    scrollbar-color: var(--pintu-scrollbar-thumb) transparent;
                }
                `}
            </style>

            {/* --- HEADER --- */}
            <div className="fixed top-0 left-0 right-0 h-14 z-50 bg-[var(--pintu-header-bg)] border-b border-[var(--pintu-header-border)] flex items-center justify-between px-4">
                <button
                    onClick={() => setScreen('desktop')}
                    className="text-sm text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-primary)] transition-colors"
                >
                    ← Back
                </button>
                <span className="text-sm font-semibold text-[var(--pintu-text-secondary)]">{loadingLabel || 'Bizz India Playbook'}</span>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                        {(PLAYBOOKS.find(p => p.id === 'bizzindia')?.formats || []).map((f) => {
                            const isActive = playbookFormat === f.key;
                            return (
                                <button
                                    key={f.key}
                                    type="button"
                                    onClick={() => switchPlaybookFormat(f.key)}
                                    className={`px-3 py-1.5 rounded-lg border-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                                        isActive
                                            ? 'border-violet-500 bg-violet-500 text-white'
                                            : 'border-violet-500 text-violet-500 hover:bg-violet-500/15'
                                    }`}
                                >
                                    {f.label}
                                </button>
                            );
                        })}
                    </div>
                    <button
                        type="button"
                        onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}
                        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        className="w-10 flex justify-end text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-primary)] transition-colors"
                    >
                        {isDark ? <span className="text-base leading-none">☀️</span> : <span className="text-base leading-none">🌙</span>}
                    </button>
                </div>
            </div>

            {/* --- KOUSHIK POPUP --- */}
            {showKoushikPopup && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowKoushikPopup(false)}
                >
                    <div
                        className="bg-neutral-800 border-2 border-violet-500 rounded-xl p-8 shadow-2xl max-w-md w-full mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center space-y-3">
                            <h2 className="text-3xl font-bold text-violet-500">PROGRAMMED BY KOUSHIK</h2>
                            <h3 className="text-2xl font-bold text-violet-400">DESIGNED BY RJOE</h3>
                            <p className="text-xl text-neutral-300 italic">MADE USING POWER OF FRIENDSHIP</p>
                            <button
                                onClick={() => setShowKoushikPopup(false)}
                                className="mt-6 px-6 py-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT WRAPPER: LEFT = Video + Options, RIGHT = preset grid --- */}
            <div className="flex flex-col md:flex-row h-full pt-14">

                {/* --- LEFT COLUMN: icon rail + tool panel --- */}
                <div className={`w-full ${activeTool === 'text' && editMode === 'individual' ? 'md:w-[560px]' : 'md:w-[440px]'} shrink-0 h-full flex flex-row border-r border-neutral-800 transition-all duration-200`}>

                    {/* --- ICON RAIL --- */}
                    <div className="w-16 shrink-0 h-full bg-[var(--pintu-rail-bg)] border-r border-[var(--pintu-header-border)] flex flex-col items-center py-4 gap-2">
                        <button
                            onClick={() => setActiveTool('video')}
                            title="Video"
                            className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${activeTool === 'video' ? 'bg-violet-500 text-white' : 'text-[var(--pintu-icon-inactive)] hover:bg-[var(--pintu-icon-hover-bg)] hover:text-[var(--pintu-text-primary)]'}`}
                        >
                            <Video className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setActiveTool('text')}
                            title="Text & Layout"
                            className={`w-11 h-11 rounded-lg flex items-center justify-center transition-colors ${activeTool === 'text' ? 'bg-violet-500 text-white' : 'text-[var(--pintu-icon-inactive)] hover:bg-[var(--pintu-icon-hover-bg)] hover:text-[var(--pintu-text-primary)]'}`}
                        >
                            <Type className="w-5 h-5" />
                        </button>
                    </div>

                    {/* --- TOOL PANEL --- */}
                    <div className="relative flex-1 h-full overflow-hidden bg-[var(--pintu-panel-bg)]">
                    {/* ambient color blobs behind the glass cards */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute -top-16 -left-10 w-72 h-72 rounded-full bg-violet-600/10 blur-[100px]" />
                        <div className="absolute top-1/3 -right-16 w-64 h-64 rounded-full bg-purple-600/10 blur-[100px]" />
                        <div className="absolute bottom-0 left-1/4 w-72 h-72 rounded-full bg-blue-600/8 blur-[110px]" />
                    </div>
                    <div className="relative h-full overflow-y-auto pintu-scroll">

                    {activeTool === 'video' && (
                        <div className="p-4 space-y-3">
                            <div
                                className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-all duration-200 relative cursor-pointer group ${isDraggingVideo ? 'border-violet-500 bg-violet-500/10 scale-105' : 'border-[var(--pintu-input-border)] bg-[var(--pintu-card-header-bg)] hover:border-violet-500 hover:bg-violet-500/10 hover:scale-[1.02]'}`}
                                onDragOver={onDragOverVideo}
                                onDragLeave={onDragLeaveVideo}
                                onDrop={onDropVideo}
                            >
                                <span className={`text-sm transition-colors duration-200 ${isDraggingVideo ? 'text-violet-500' : 'text-[var(--pintu-text-muted)] group-hover:text-violet-500'}`}>{videoSrc ? 'Replace Video' : 'upload or browse video'}</span>
                                <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVideoUpload} />
                            </div>
                            {videoSrc && (
                                <>
                                    <div className="w-full max-h-[210px] aspect-video rounded-lg border border-[var(--pintu-input-border)] bg-black overflow-hidden">
                                        <video
                                            src={videoSrc}
                                            className="w-full h-full object-cover"
                                            style={{ transform: `scale(${videoScale / 100})`, transformOrigin: 'center' }}
                                            muted
                                            loop
                                            autoPlay
                                            playsInline
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs text-[var(--pintu-text-secondary)] font-semibold tracking-wide">
                                                {playbookFormat === 'news' ? 'RE-SIZE' : 'Zoom'}
                                            </label>
                                            <span className="text-xs text-[var(--pintu-text-muted)]">{videoScale}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="100"
                                            max="300"
                                            step="1"
                                            value={videoScale}
                                            onChange={(e) => handleVideoScaleChange(parseInt(e.target.value, 10))}
                                            className="w-full h-1 bg-[var(--pintu-track-bg)] rounded-lg appearance-none cursor-pointer accent-violet-500"
                                        />
                                        <p className="text-[10px] text-[var(--pintu-text-faint)] leading-relaxed">
                                            {playbookFormat === 'news'
                                                ? 'Scale & drag the video so competitor captions sit under your hook — same idea as Canva. Double-click a card or hit RE-SIZE.'
                                                : 'Zooms the video across every preset preview.'}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {activeTool === 'text' && (
                    <div className="p-6 space-y-6 pb-8">

                        {/* IDEA NAME (GLOBAL) */}
                        <div className="bg-[var(--pintu-card-bg)] backdrop-blur-2xl rounded-xl overflow-hidden border border-[var(--pintu-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-2 bg-[var(--pintu-card-header-bg)] px-6 py-3 border-b border-[var(--pintu-card-header-border)]">
                                <Edit2 className="w-4 h-4 text-[var(--pintu-accent)]" />
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--pintu-text-secondary)]">Idea Name</h2>
                                <span className="text-[10px] normal-case font-normal tracking-normal text-[var(--pintu-text-faint)]">(as written on FSOS)</span>
                            </div>
                            <div className="p-6 space-y-2">
                                <label className="text-xs text-[var(--pintu-text-muted)]">What's this video about?</label>
                                <input
                                    type="text"
                                    value={ideaName}
                                    onChange={(e) => setIdeaName(e.target.value)}
                                    placeholder="e.g. The trick to making your employees loyal"
                                    className="w-full px-4 py-3 text-sm text-[var(--pintu-text-primary)] bg-[var(--pintu-input-bg)] border border-[var(--pintu-input-border)] rounded-lg focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 placeholder:text-[var(--pintu-text-faint)] transition-all"
                                />
                            </div>
                        </div>

                        {/* APPLY CHANGES TO: All Brands / Per Brand — sits above the Text & Layout card */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs text-[var(--pintu-text-muted)]">Apply changes to</span>
                            <div className="flex bg-[var(--pintu-toggle-bg)] backdrop-blur-md rounded-lg p-1 border border-[var(--pintu-toggle-border)]">
                                <button
                                    onClick={() => setEditMode('global')}
                                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${editMode === 'global' ? 'bg-violet-500 text-white font-semibold' : 'text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-secondary)]'}`}
                                >
                                    All Brands
                                </button>
                                <button
                                    onClick={() => setEditMode('individual')}
                                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${editMode === 'individual' ? 'bg-violet-500 text-white font-semibold' : 'text-[var(--pintu-text-muted)] hover:text-[var(--pintu-text-secondary)]'}`}
                                >
                                    Per Brand
                                </button>
                            </div>
                        </div>

                        {/* TEXT EDIT */}
                        <div className="bg-[var(--pintu-card-bg)] backdrop-blur-2xl rounded-xl overflow-hidden border border-[var(--pintu-card-border)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_8px_32px_rgba(0,0,0,0.5)]">
                            <div className="flex items-center gap-2 bg-[var(--pintu-card-header-bg)] px-6 py-3 border-b border-[var(--pintu-card-header-border)]">
                                <Type className="w-4 h-4 text-[var(--pintu-accent)]" />
                                <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--pintu-text-secondary)]">Text &amp; Layout</h2>
                            </div>
                            <div className="p-6 space-y-4">

                                {/* EDIT MODE: GLOBAL */}
                                {editMode === 'global' && (
                                    <>
                                        <CollapsibleSection title="Hook Text (Bold)">
                                            <RichTextEditor
                                                value={globalHeadline}
                                                onChange={(html) => updateGlobalText(html, globalFooter)}
                                                placeholder="Hook....."
                                                className="w-full bg-[var(--pintu-input-bg)] border border-[var(--pintu-input-border)] rounded p-3 text-sm text-[var(--pintu-text-primary)] placeholder-[var(--pintu-text-faint)] focus:border-violet-500 focus:outline-none font-medium min-h-[80px]"
                                            />
                                        </CollapsibleSection>
                                        <p className="text-[10px] text-[var(--pintu-text-faint)] px-1">Updating this overwrites all brands.</p>
                                    </>
                                )}

                                {/* TYPOGRAPHY: Text Size, Letter Spacing — only in All (global) mode; per-brand has its own below */}
                                {editMode === 'global' && (
                                    <CollapsibleSection title="Typography">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-medium text-[var(--pintu-text-secondary)]">Text Size</label>
                                                <span className="text-xs font-mono text-[var(--pintu-accent)] bg-violet-500/10 px-2 py-0.5 rounded-full min-w-[2.5rem] text-center">{Math.round(fontScale * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="1.5"
                                                step="0.1"
                                                value={fontScale}
                                                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-[var(--pintu-track-bg)] rounded-lg appearance-none cursor-pointer accent-violet-500"
                                            />
                                            <p className="text-[10px] text-[var(--pintu-text-faint)]">How big the headline text is on the video.</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-xs font-medium text-[var(--pintu-text-secondary)]">Letter Spacing</label>
                                                <span className="text-xs font-mono text-[var(--pintu-accent)] bg-violet-500/10 px-2 py-0.5 rounded-full min-w-[2.5rem] text-center">{Math.round(wordSpacing * 100)}%</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="0.1"
                                                max="1.5"
                                                step="0.05"
                                                value={wordSpacing}
                                                onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                                                className="w-full h-2 bg-[var(--pintu-track-bg)] rounded-lg appearance-none cursor-pointer accent-violet-500"
                                            />
                                            <p className="text-[10px] text-[var(--pintu-text-faint)]">How much space sits between words.</p>
                                        </div>
                                    </CollapsibleSection>
                                )}

                                {/* EDIT MODE: INDIVIDUAL - only show presets the user has selected for export */}
                                {editMode === 'individual' && (
                                    <div className="space-y-4">
                                        {presets.filter(p => p.active).map(p => (
                                            <PerBrandPresetCard
                                                key={p.id}
                                                p={p}
                                                fontScale={fontScale}
                                                wordSpacing={wordSpacing}
                                                setPresets={setPresets}
                                                updateIndividualText={updateIndividualText}
                                            />
                                        ))}
                                        {presets.filter(p => p.active).length === 0 && (
                                            <p className="text-sm text-[var(--pintu-text-faint)] italic text-center py-4">No presets selected. Select presets using the checkboxes on the cards or in BRAND ASSETS below, then use Per Brand to edit them.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                    </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: PRESET GRID --- */}
                <div className="flex-1 bg-[var(--pintu-right-bg)] flex flex-col relative overflow-hidden">

                    {videoSrc && (
                        <div className="absolute top-4 right-4 z-30 flex gap-2">
                            <button
                                onClick={() => startExportJob()}
                                disabled={!videoSrc || pipelineFull || presets.filter(p => p.active).length === 0}
                                title={pipelineFull ? 'Pipeline full (5/5) — dismiss a finished job first' : undefined}
                                className={`bg-yellow-500 hover:bg-yellow-400 text-black px-4 py-2 rounded-full border border-yellow-500 flex items-center gap-2 shadow-lg transition-all ${(!videoSrc || pipelineFull || presets.filter(p => p.active).length === 0) ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                                <Download className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-wider">
                                    {pipelineFull
                                        ? 'Pipeline Full (5/5)'
                                        : `Export ${presets.filter(p => p.active).length} Videos`}
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

                    {/* --- EXPORT PIPELINE TRAY (non-blocking) --- */}
                    {exportJobs.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4 z-40 pointer-events-none">
                            <div className="pointer-events-auto ml-auto max-w-md w-full space-y-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                                        Export pipeline {exportJobs.length}/{MAX_PIPELINE_JOBS}
                                    </span>
                                    <span className="text-[10px] text-neutral-500">Keep this tab open</span>
                                </div>
                                {exportJobs.map(job => {
                                    const isActive = job.status === 'uploading' || job.status === 'processing';
                                    const isDone = job.status === 'completed';
                                    const isFail = job.status === 'failed' || job.status === 'stopped';
                                    return (
                                        <div
                                            key={job.id}
                                            className="bg-neutral-900/95 backdrop-blur border border-neutral-700 rounded-xl p-3 shadow-xl"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-1.5">
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-white truncate">{job.label}</p>
                                                    <p className={`text-[11px] truncate mt-0.5 ${
                                                        isDone ? 'text-green-400' : isFail ? 'text-red-400' : 'text-neutral-400'
                                                    }`}>
                                                        {job.statusText}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    {isActive && (
                                                        <button
                                                            onClick={() => stopExportJob(job.id)}
                                                            className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-red-600 hover:bg-red-700 text-white"
                                                        >
                                                            Stop
                                                        </button>
                                                    )}
                                                    {(isDone || isFail) && (
                                                        <button
                                                            onClick={() => dismissExportJob(job.id)}
                                                            className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-neutral-700 hover:bg-neutral-600 text-white"
                                                        >
                                                            Dismiss
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {isActive && (
                                                <div className="mt-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-[10px] text-neutral-500 uppercase tracking-wider">
                                                            {job.status === 'uploading' ? 'Upload' : 'Progress'}
                                                        </span>
                                                        <span className="text-[11px] font-bold text-yellow-400 tabular-nums">
                                                            {Math.round(job.status === 'uploading' ? Math.max(job.progress || 0, 8) : (job.progress || 0))}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-yellow-500 transition-all duration-300"
                                                            style={{ width: `${Math.min(100, Math.max(job.progress || 0, job.status === 'uploading' ? 8 : 0))}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {isDone && job.jobId && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                                <a
                                                    href={`${SERVER_URL}/api/download/${job.jobId}`}
                                                    className="inline-block mt-2 text-[11px] text-yellow-400 hover:text-yellow-300 font-medium"
                                                >
                                                    Re-download ZIP
                                                </a>
                                            )}
                                            {job.driveLinks?.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-[10px] text-green-400">Google Drive:</p>
                                                    {job.driveLinks.map((link, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <a href={link} target="_blank" rel="noopener" className="text-[11px] text-blue-400 hover:text-blue-300 truncate max-w-[220px]">
                                                                {link.split('/').pop() || `File ${i + 1}`}
                                                            </a>
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(link)}
                                                                className="text-[10px] text-violet-400 hover:text-violet-300"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {job.cloudLinks?.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    <p className="text-[10px] text-green-400">Cloud links:</p>
                                                    {job.cloudLinks.map((link, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => navigator.clipboard.writeText(link)}
                                                                className="text-[11px] text-blue-400 hover:text-blue-300 truncate max-w-[220px] text-left"
                                                                title={link}
                                                            >
                                                                {link.split('/').pop()}
                                                            </button>
                                                            <a href={link} target="_blank" rel="noopener" className="text-[10px] text-violet-400 hover:text-violet-300">Open</a>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* --- PRESET GRID CONTENT --- */}
                    <div className={`flex-1 overflow-y-auto p-8 pintu-scroll ${exportJobs.length > 0 ? 'pb-48' : ''}`}>
                        <div className="flex flex-col w-full space-y-4">
                            <p className="text-xs text-[var(--pintu-accent)] w-full">Presets highlighted in purple — click the checkbox on each card to select for export.</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-7xl mx-auto">
                                {presets
                                    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery) || (p.handle || '').toLowerCase().includes(searchQuery))
                                    .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
                                    .map((p, i) => (
                                        <div key={p.id} className={`flex flex-col items-center gap-3 transition-opacity duration-200 ${p.active ? 'opacity-100' : 'opacity-85'}`}>
                                            <span className="text-sm font-bold text-[var(--pintu-text-primary)] max-w-full truncate px-1">{p.name}</span>
                                            <div
                                                className="w-full rounded-lg overflow-hidden shadow-[0_8px_20px_rgba(0,0,0,0.35)]"
                                                style={{ aspectRatio: '9 / 16' }}
                                            >
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
                                                    newsFontReady={newsFontReady}
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
