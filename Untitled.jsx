import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Upload, Monitor, Layout, Download, Play, Pause, RotateCcw, Loader, Grid, Maximize, CheckSquare, Square, Edit2, Save, BadgeCheck, Image as ImageIcon, Type, Sliders, Users, Globe, Move, Volume2, VolumeX, Bold } from 'lucide-react';

// --- HARDCODED LOGOS (SVG Data URIs) ---

const LOGO_BEST_FOUNDER_CLIPS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='black'/%3E%3Ctext x='50%25' y='30%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='900' font-size='130' letter-spacing='-4'%3EBEST%3C/text%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23ffa302' font-family='Arial, sans-serif' font-weight='900' font-size='75' letter-spacing='-2'%3EFOUNDER%3C/text%3E%3Ctext x='50%25' y='70%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='900' font-size='130' letter-spacing='-4'%3ECLIPS%3C/text%3E%3C/svg%3E`;

const LOGO_BUSINESS_CRACKED = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' rx='0' fill='black'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='900' font-size='280' letter-spacing='-10'%3EBC%3C/text%3E%3C/svg%3E`;

const LOGO_THE_FOUNDERS_SHOW = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='%23C62828'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Times New Roman, serif' font-weight='400' font-size='300'%3EFS%3C/text%3E%3C/svg%3E`;

const LOGO_FOUNDERS_GOD = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500' style='background-color:black'%3E%3Crect x='25' y='25' width='450' height='450' fill='none' stroke='%23C5A059' stroke-width='15'/%3E%3Cpath d='M 250 25 Q 350 125 475 250 Q 350 375 250 475 Q 150 375 25 250 Q 150 125 250 25' fill='none' stroke='%23C5A059' stroke-width='15'/%3E%3Ccircle cx='250' cy='250' r='60' fill='%23C5A059'/%3E%3Cpath d='M 250 25 L 250 475 M 25 250 L 475 250' fill='none' stroke='%23C5A059' stroke-width='5' opacity='0.5'/%3E%3C/svg%3E`;

const LOGO_SMART_BUSINESS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='black'/%3E%3Ccircle cx='250' cy='220' r='180' fill='white'/%3E%3Cpath d='M250 100 C180 100 130 160 130 230 C130 290 170 330 200 350 L150 500 L350 500 L300 350 C330 330 370 290 370 230 C370 160 320 100 250 100 Z' fill='black' transform='translate(0, 20)'/%3E%3C/svg%3E`;

const LOGO_THERISINGFOUNDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='transparent'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='%23DC2626' font-family='Arial, sans-serif' font-weight='900' font-size='200' letter-spacing='-5'%3ETRF.%3C/text%3E%3C/svg%3E`;

const LOGO_THEREALFOUNDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='transparent'/%3E%3Cpath d='M 200 150 L 300 150 L 300 200 L 250 250 L 200 200 Z M 250 250 L 250 350 L 300 350 L 300 300 L 350 350 L 350 250 Z' fill='white' stroke='white' stroke-width='20'/%3E%3C/svg%3E`;

const LOGO_INSPIRINGFOUNDER = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Crect width='500' height='500' fill='white'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='black' font-family='Arial, sans-serif' font-weight='900' font-size='80' letter-spacing='-2'%3EINSPIRING%3C/text%3E%3Ctext x='50%25' y='75%25' dominant-baseline='middle' text-anchor='middle' fill='black' font-family='Arial, sans-serif' font-weight='900' font-size='80' letter-spacing='-2'%3EFOUNDER%3C/text%3E%3C/svg%3E`;

const LOGO_REALINDIABUSINESS = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Ccircle cx='250' cy='250' r='200' fill='%239433CC'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='900' font-size='220' letter-spacing='-5'%3EB.%3C/text%3E%3C/svg%3E`;

const LOGO_CEOMINDSETINDIA = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 500 500'%3E%3Ccircle cx='250' cy='250' r='200' fill='%23DC2626'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' fill='white' font-family='Arial, sans-serif' font-weight='900' font-size='180' letter-spacing='-5'%3ECBO%3C/text%3E%3C/svg%3E`;


// --- DEFAULTS ---
const DEFAULT_HEADLINE = "The <b>trick</b> to making your employees loyal";
const DEFAULT_FOOTER = "Credit: The Founders Show";

// --- CONFIGURATION: THE 12 PRESETS ---
const INITIAL_PRESETS = [
    { id: 1, name: '101xfounders', handle: '@101xfounders', ratio: '1:1', color: '#fe6700', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left' },
    { id: 2, name: 'bizzindia', handle: '@bizzindia', ratio: '4:3', color: '#E31D38', active: true, layout: 'watermark', logo: null, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'center' },
    { id: 3, name: 'Best Founder Clips', handle: '@BestFOunderClips', ratio: '1:1', color: '#ffa302', active: true, layout: 'logo_centered', logo: LOGO_BEST_FOUNDER_CLIPS, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 4, name: 'Business Cracked', handle: '@businesscracked', ratio: '1:1', color: '#f7f7f7', active: true, layout: 'social', logo: LOGO_BUSINESS_CRACKED, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 5, name: 'The Founders Show', handle: '@thefoundersshow', ratio: '4:3', color: '#ffa302', active: true, layout: 'social', logo: LOGO_THE_FOUNDERS_SHOW, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 6, name: 'Founders God', handle: '@foundersgod', ratio: '4:3', color: '#f7f7f7', active: true, layout: 'social', logo: LOGO_FOUNDERS_GOD, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 7, name: 'Smart Business.in', handle: '@smartbusiness.in', ratio: '4:3', color: '#f7f7f7', active: true, layout: 'social', logo: LOGO_SMART_BUSINESS, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 8, name: 'The Rising Founder', handle: '@therisingfounder', ratio: '4:3', color: '#ffa302', active: true, layout: 'watermark', logo: LOGO_THERISINGFOUNDER, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: false, alignment: 'left' },
    { id: 9, name: 'The Real Founder', handle: '@therealfounder', ratio: '4:3', color: '#ffa302', active: true, layout: 'social', logo: LOGO_THEREALFOUNDER, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 10, name: 'Inspiring Founder', handle: '@inspiringfounder', ratio: '4:3', color: '#3b82f6', active: true, layout: 'social', logo: LOGO_INSPIRINGFOUNDER, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
    { id: 11, name: 'Real India Business', handle: '@realindianbusiness', ratio: '4:3', color: '#9433CC', active: true, layout: 'logo_centered', logo: LOGO_REALINDIABUSINESS, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'center' },
    { id: 12, name: 'CEO Mindset India', handle: '@ceomindsetindia', ratio: '4:3', color: '#DC2626', active: true, layout: 'social', logo: LOGO_CEOMINDSETINDIA, headline: DEFAULT_HEADLINE, footer: DEFAULT_FOOTER, position: { x: 50, y: 50 }, creditPosition: { x: 0, y: -1.5 }, watermarkPosition: { x: 50, y: 16 }, headlinePosition: { x: 0, y: 0 }, showLogo: true, alignment: 'left' },
];

// Helper to strip HTML tags for length calculations
const stripHTML = (html) => {
    if (!html) return '';
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

// Helper to parse HTML text into segments (for preview rendering)
const parseHeadline = (html) => {
    if (!html) return [];
    const segments = [];
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;

    // Walk the tree and extract words with their bold state
    // This ensures consistent spacing (no double spaces)
    const walk = (node, isBoldParent = false) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent || '';
            // Split into words only, ignore spaces
            const words = text.trim().split(/\s+/).filter(w => w.length > 0);
            words.forEach(word => {
                segments.push({ text: word, highlight: isBoldParent });
            });
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            const isBold = node.tagName === 'B' || node.tagName === 'STRONG' ||
                (node.style && parseInt(node.style.fontWeight) >= 600);
            const children = Array.from(node.childNodes);
            children.forEach(child => walk(child, isBold || isBoldParent));
        }
    };

    Array.from(tmp.childNodes).forEach(child => walk(child, false));

    // If no segments found, return plain text
    if (segments.length === 0) {
        return [{ text: stripHTML(html), highlight: false }];
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
    const containerRef = useRef(null);
    const creditRef = useRef(null);
    const watermarkRef = useRef(null);
    const headlineRef = useRef(null);

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

    const textLength = preset.headline ? stripHTML(preset.headline).length : 0;
    const baseSize = calculateFontSize(textLength, fontScaleGlobal);
    const layoutScale = preset.layout === 'logo_centered' ? 0.35 : 0.45;
    const previewFontSize = Math.max(10, baseSize * layoutScale);

    // Alignment Logic - Use preset.alignment property
    const isCenterAligned = preset.alignment === 'center';
    const textAlignClass = isCenterAligned ? 'text-center items-center px-6' : 'text-left items-start px-6';
    const justifyClass = 'justify-center gap-1';

    const segments = parseHeadline(preset.headline);

    return (
        <div
            className={`group relative bg-black shadow-2xl flex flex-col items-center select-none transform transition-all duration-300 hover:scale-[1.02] border-2 ${preset.active ? 'border-yellow-500/50' : 'border-transparent opacity-50 grayscale'}`}
            style={{
                width: '100%',
                maxWidth: '320px',
                aspectRatio: '9/16',
                boxShadow: '0 0 20px rgba(0,0,0,0.5)',
                fontFamily: "'Inter', sans-serif"
            }}
        >

            {/* MAIN CONTENT AREA - FULL HEIGHT FLEX */}
            {/* This allows us to stack everything (Header -> Text -> Video -> Footer) properly in one flow */}
            <div className={`flex-1 w-full flex flex-col ${justifyClass} relative bg-neutral-900`}>

                {/* 1. HEADER SECTION (Stacked inside content flow) */}
                {preset.layout !== 'watermark' && (
                    <div className="w-full px-6 z-10 shrink-0 mb-1">
                        {/* SOCIAL HEADER */}
                        {preset.layout === 'social' && (
                            <div className={`flex items-center w-full ${preset.name === 'Business Cracked' ? 'justify-center gap-[10px]' : 'justify-start gap-2'}`}>
                                <div className="w-[70px] h-[70px] rounded-full bg-neutral-800 flex items-center justify-center overflow-hidden border border-white/10 shadow-sm shrink-0">
                                    {preset.logo ? (
                                        <img src={preset.logo} className="w-full h-full rounded-full" style={{ objectFit: 'cover', transform: 'scale(1.2)' }} />
                                    ) : (
                                        <span className="text-[7px] font-bold font-serif text-neutral-500 text-center leading-tight">No Logo</span>
                                    )}
                                </div>
                                <div className="flex flex-col text-left">
                                    <div className={`flex items-center ${preset.name === 'Business Cracked' ? 'gap-[28px]' : 'gap-1.5'}`}>
                                        <span className="text-xs font-bold text-white leading-none">{preset.name}</span>
                                        <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500 text-black" />
                                    </div>
                                    <span className="text-[9px] font-medium text-neutral-400 leading-tight mt-0.5">{preset.handle}</span>
                                </div>
                            </div>
                        )}

                        {/* LOGO CENTERED */}
                        {preset.layout === 'logo_centered' && preset.logo && (
                            <div className="flex justify-center w-full">
                                <div className={`w-[70px] h-[70px] ${preset.name === 'Best Founder Clips' ? 'rounded-none' : 'rounded-full'} overflow-hidden`}>
                                    <img src={preset.logo} className={`w-full h-full ${preset.name === 'Best Founder Clips' ? 'rounded-none' : 'rounded-full'}`} style={{ objectFit: 'cover', transform: 'scale(1.2)' }} />
                                </div>
                            </div>
                        )}
                    </div>
                )}


                {/* 2. HOOK TEXT */}
                <div
                    ref={headlineRef}
                    className={`w-full z-10 mb-1 leading-tight drop-shadow-lg tracking-tighter relative ${isRepositioningHeadline ? 'cursor-move ring-2 ring-yellow-500' : ''} ${isCenterAligned ? 'flex flex-col items-center' : 'flex flex-col items-start'}`}
                    style={{
                        fontSize: `${previewFontSize}px`,
                        marginTop: preset.name === 'Best Founder Clips' ? '0.5rem' : '0',
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
                            gap: `${wordSpacing}em`
                        }}
                    >
                        {segments.map((segment, idx) => (
                            <span
                                key={idx}
                                style={{
                                    color: segment.highlight ? preset.color : 'white',
                                    fontWeight: segment.highlight ? 800 : 500
                                }}
                            >
                                {segment.text}
                            </span>
                        ))}
                    </div>
                </div>

                {/* 3. VIDEO CONTAINER */}
                <div
                    ref={containerRef}
                    className={`w-full relative bg-black shrink-0 group ${isRepositioning ? 'cursor-move ring-2 ring-yellow-500 z-50' : isResizingVideo ? 'ring-2 ring-blue-500 z-50' : 'cursor-pointer'} ${preset.name === 'Business Cracked' ? 'border-4 border-[#FF6B00]' : ''}`}
                    style={getAspectRatioStyle(preset.ratio)}
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

                    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none bg-black">
                        {videoSrc ? (
                            <video
                                ref={isMain ? videoRef : null}
                                src={videoSrc}
                                className="w-full h-full"
                                style={{
                                    objectFit: fitMode === 'fill' ? 'fill' : fitMode === 'contain' ? 'contain' : 'cover',
                                    objectPosition: fitMode === 'fill' ? 'center' : `${localPos.x}% ${localPos.y}%`,
                                    width: `${localVideoScale}%`,
                                    height: `${localVideoScale}%`,
                                    minWidth: '100%',
                                    minHeight: '100%',
                                    transform: 'translate(-50%, -50%)',
                                    left: '50%',
                                    top: '50%',
                                    position: 'absolute'
                                }}
                                playsInline
                                muted={isMuted}
                                autoPlay
                                loop
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-neutral-800 border border-neutral-700">
                                <span className="text-[10px] text-neutral-500 font-mono">{preset.ratio}</span>
                            </div>
                        )}

                        {/* WATERMARK OVERLAY */}
                        {preset.layout === 'watermark' && (
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
                                    className={preset.name === '101xfounders' || preset.name === 'bizzindia' ? "font-light tracking-wide font-inter" : "font-bold tracking-wide font-inter"}
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
                {showCredit && (
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
                        <p className="text-[8px] text-white font-bold font-inter" style={{ letterSpacing: '0.5px' }}>
                            {preset.footer}
                        </p>
                    </div>
                )}

            </div>

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

                {preset.layout === 'watermark' && (
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

                <button
                    onClick={() => onToggle(preset.id)}
                    className={`w-5 h-5 flex items-center justify-center rounded text-xs ${preset.active ? 'bg-yellow-500 text-black' : 'bg-neutral-800/90 text-neutral-400 backdrop-blur-sm'}`}
                >
                    {preset.active ? <CheckSquare size={12} /> : <Square size={12} />}
                </button>
            </div>

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

    // System
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const renderLoopRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true); // Start muted for autoplay compatibility
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState('');
    const [exportProgress, setExportProgress] = useState(0);

    // --- PASTE LISTENER ---
    useEffect(() => {
        const handlePaste = (e) => {
            const items = e.clipboardData.items;
            for (let item of items) {
                if (item.kind === 'file') {
                    const blob = item.getAsFile();
                    if (blob.type.startsWith('video/')) {
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
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            if (isPlaying) v.pause();
            else v.play();
        });
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const toggleMute = useCallback(() => {
        const videos = document.querySelectorAll('video');
        videos.forEach(v => {
            v.muted = !isMuted;
        });
        setIsMuted(!isMuted);
    }, [isMuted]);

    const togglePresetActive = useCallback((id) => {
        setPresets(prev => prev.map(p => p.id === id ? { ...p, active: !p.active } : p));
    }, []);


    // --- BATCH EXPORT LOGIC ---
    const processBatchExport = async () => {
        const activePresets = presets.filter(p => p.active);
        if (!videoSrc || activePresets.length === 0) return;

        setIsExporting(true);
        // Create dedicated hidden video element to avoid conflicts
        const exportVideo = document.createElement('video');
        exportVideo.src = videoSrc;
        exportVideo.muted = false; // Not muted for export to capture audio
        exportVideo.playsInline = true;
        exportVideo.crossOrigin = "anonymous";
        exportVideo.loop = false; // Important for export loop control

        // Wait for metadata
        await new Promise(resolve => {
            exportVideo.onloadedmetadata = () => resolve();
        });

        //ZS: Process each preset
        for (let i = 0; i < activePresets.length; i++) {
            const currentPreset = activePresets[i];
            setExportStatus(`Rendering: ${currentPreset.name} (${i + 1}/${activePresets.length})`);
            setExportProgress(0);

            let logoImageObj = null;
            if (currentPreset.logo) {
                try {
                    logoImageObj = await new Promise((resolve) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = () => resolve(null);
                        img.src = currentPreset.logo;
                    });
                } catch (e) { console.error("Logo load fail", e); }
            }

            await renderSingleVideo(exportVideo, currentPreset, logoImageObj);

            if (i < activePresets.length - 1) {
                setExportStatus(`Preparing next...`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        setExportStatus('Done!');
        setTimeout(() => {
            setIsExporting(false);
            setExportStatus('');
            setExportProgress(0);
            exportVideo.remove();
        }, 1000);
    };

    // --- RICH TEXT RENDERER FOR CANVAS ---
    const calculateRichTextLines = (ctx, html, maxWidth, baseFontSize, highlightColor, spacingMultiplier = 0.25) => {
        const tokens = [];
        const tmp = document.createElement('DIV');
        // Normalize HTML to ensure spaces between inline elements are preserved
        tmp.innerHTML = (html || '').replace(/>\s+</g, '> <');

        // Extract only words (not spaces) with their bold state
        // We'll add consistent spacing between words during rendering
        const walk = (node, isBold = false) => {
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.textContent || '';
                // Split into words only, ignore spaces
                const words = text.trim().split(/\s+/).filter(w => w.length > 0);
                words.forEach(word => {
                    tokens.push({ text: word, highlight: isBold });
                });
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const nodeIsBold = node.tagName === 'B' || node.tagName === 'STRONG' ||
                    (node.style && parseInt(node.style.fontWeight) >= 600);
                Array.from(node.childNodes).forEach(child => walk(child, nodeIsBold || isBold));
            }
        };

        Array.from(tmp.childNodes).forEach(child => walk(child, false));

        //ZS: Remove empty tokens
        const cleanedTokens = tokens.filter(t => t.text && t.text.trim().length > 0);

        const lines = [];
        let currentLine = [];
        let currentLineWidth = 0;

        // FIX: Calculate space width based on font size (em) to match CSS 'gap' behavior in Preview
        // Previous logic used measureText(' ').width * multiplier, which resulted in tiny gaps (~2px)
        const spaceWidth = baseFontSize * spacingMultiplier;

        cleanedTokens.forEach((token, tokenIdx) => {
            //ZS: Measure word width with its actual font weight
            ctx.font = `${token.highlight ? 800 : 500} ${baseFontSize}px Inter, sans-serif`;
            const wordWidth = ctx.measureText(token.text).width;

            //ZS: Check if we need to wrap to next line
            //ZS: Add space before word if not first word in line
            const spaceNeeded = currentLine.length > 0 ? spaceWidth : 0;
            const wouldExceedWidth = currentLineWidth + spaceNeeded + wordWidth >= maxWidth && currentLine.length > 0;

            if (wouldExceedWidth) {
                //ZS: Wrap to next line
                lines.push(currentLine);
                currentLine = [];
                currentLineWidth = 0;
            }

            //ZS: Add space before word if not first word in line
            if (currentLine.length > 0) {
                currentLineWidth += spaceWidth;
            }

            //ZS: Add word to current line with its starting X position
            currentLine.push({ ...token, x: currentLineWidth });
            currentLineWidth += wordWidth;
        });

        if (currentLine.length > 0) lines.push(currentLine);
        return lines;
    };


    const renderSingleVideo = (video, preset, logoImageObj) => {
        return new Promise(async (resolve) => {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d', { alpha: false });

            canvas.width = 720;
            canvas.height = 1280;

            //ZS: Pass showCredit to the draw function
            const shouldShowCredit = showCredit;

            //ZS: Enable high-quality rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            //ZS: Apply video scale (convert percentage to decimal)
            const scaleFactor = videoScale / 100;

            //ZS: Use 30fps for canvas capture (good balance of quality and performance)
            const stream = canvas.captureStream(30);
            let audioTracks = [];
            let combinedStream = stream;

            //ZS: Try MP4 first, fallback to WebM
            let mimeType = 'video/webm';
            let fileExtension = 'webm';
            const mp4Options = [
                'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
                'video/mp4;codecs=avc1.42E01E',
                'video/mp4;codecs=h264',
                'video/mp4'
            ];

            for (const option of mp4Options) {
                if (MediaRecorder.isTypeSupported(option)) {
                    mimeType = option;
                    fileExtension = 'mp4';
                    break;
                }
            }

            // --- PRE-CALCULATION & LAYOUT ENGINE ---
            // 1. Video Dimensions
            let targetW = 720;
            let targetH;
            if (preset.ratio === '16:9') targetH = 720 * (9 / 16);
            else if (preset.ratio === '1:1') targetH = 720;
            else if (preset.ratio === '4:3') targetH = 720 * (3 / 4);
            else if (preset.ratio === '3:4') targetH = 720 * (4 / 3);

            // 2. Text Calculations (exclude HTML tags from length)
            const fontSize = calculateFontSize(stripHTML(preset.headline).length, fontScale);

            // Fix: Apply letterSpacing BEFORE calculating text metrics so positions match the drawing
            if (ctx.letterSpacing !== undefined) {
                ctx.letterSpacing = "-2px";
            }

            const lineHeight = fontSize * 1.25;
            const richLines = calculateRichTextLines(ctx, preset.headline, 620, fontSize, preset.color, wordSpacing);
            const totalTextHeight = richLines.length * lineHeight;

            // --- TOTAL STACK HEIGHT CALCULATION ---
            const GAP = 20;
            // Larger logo height for Best Founder Clips
            const LOGO_HEIGHT = 80; // Approx header height
            const FOOTER_HEIGHT = 30; // Approx footer height

            // The total content group height
            const totalStackHeight = LOGO_HEIGHT + GAP + totalTextHeight + GAP + targetH + GAP + FOOTER_HEIGHT;

            // Start Y position to Center everything vertically in 1280
            const startY_Stack = (1280 - totalStackHeight) / 2;

            // --- ABSOLUTE Y POSITIONS ---
            // 1. Logo Group
            const logoGroupY = startY_Stack; // Top of logo box

            // X Coordinates (Left Aligned) - Define first as it's used below
            const textXStart = 50;

            // 2. Headline Text
            // Starts after Logo Height + Gap. 
            // Note: richLines drawing needs Y of the first line's baseline (approx).
            // Standard text drawing is top-baseline in this engine.
            // Extra spacing for Best Founder Clips to avoid overlap with larger logo
            const extraLogoSpacing = preset.name === 'Best Founder Clips' ? 15 : 0;
            const baseTextStartY = logoGroupY + LOGO_HEIGHT + GAP + extraLogoSpacing;
            // Apply headline position offset
            const headlineOffsetX = preset.headlinePosition?.x ?? 0;
            const headlineOffsetY = preset.headlinePosition?.y ?? 0;
            // Both X and Y are in percentage (like credit/watermark)
            // Convert percentage to pixels for canvas
            // For Y: percentage of canvas height (1280px)
            // For X: percentage of canvas width (720px)
            const textStartY = baseTextStartY + (1280 * (headlineOffsetY / 100));
            const adjustedTextXStart = textXStart + (720 * (headlineOffsetX / 100));

            // 3. Video
            // Starts after Text + Gap
            const videoTopY = textStartY + totalTextHeight + GAP;

            // 4. Footer
            // Preview: mt-1 = 4px margin-top after video, match in export
            const footerTopY = videoTopY + targetH + 4;
            const logoX = 50;
            const logoY = logoGroupY; // Logo image top
            const headerTextX = logoX + 70 + 12;
            const headerTextY = logoY + 35; // Centered to logo

            let nameWidth = 0;
            if (preset.layout === 'social') {
                ctx.font = 'bold 26px Inter, sans-serif';
                nameWidth = ctx.measureText(preset.name).width;
            }

            video.currentTime = 0;
            video.loop = false; // We handle loop stop manually
            video.playbackRate = 1.0; // Ensure normal playback speed
            video.muted = false; // Ensure audio is enabled

            // Wait for video to be ready to play before starting recording
            await new Promise(resolve => {
                const onCanPlay = () => {
                    video.removeEventListener('canplay', onCanPlay);
                    resolve();
                };
                video.addEventListener('canplay', onCanPlay);
                video.load(); // Reload to ensure ready state
            });

            // Start video playback first - ensure it's playing and unmuted
            video.muted = false;
            await video.play().catch(e => console.log('Play error:', e));

            // Wait for video to be playing and audio to initialize
            await new Promise(resolve => setTimeout(resolve, 500));

            // Use native captureStream() method - supported natively in Chrome, Edge, Safari
            try {
                // Native browser API - works on Windows and macOS
                if (video.captureStream) {
                    // Chrome, Edge, Safari (native support)
                    const videoStream = video.captureStream();
                    audioTracks = videoStream.getAudioTracks();
                } else if (video.mozCaptureStream) {
                    // Firefox fallback
                    const videoStream = video.mozCaptureStream();
                    audioTracks = videoStream.getAudioTracks();
                }

                if (audioTracks.length > 0) {
                    combinedStream = new MediaStream([...stream.getVideoTracks(), ...audioTracks]);
                    console.log('Audio captured via native captureStream():', audioTracks.length, 'tracks');
                } else {
                    console.log('No audio tracks found - video may not have audio or browser does not support captureStream()');
                }
            } catch (e) {
                console.log('Native audio capture error:', e);
            }

            // Recreate recorder with the combined stream (with or without audio)
            const recorderOptions = {
                mimeType: mimeType,
            };
            if (audioTracks.length > 0) {
                recorderOptions.audioBitsPerSecond = 128000;
            }
            recorderOptions.videoBitsPerSecond = 4000000;

            const recorder = new MediaRecorder(combinedStream, recorderOptions);
            const chunks = [];

            recorder.ondataavailable = e => {
                if (e.data && e.data.size > 0) chunks.push(e.data);
            };

            recorder.onstop = () => {
                if (renderLoopRef.current) cancelAnimationFrame(renderLoopRef.current);

                const blob = new Blob(chunks, { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${preset.name.replace(/\s+/g, '-')}_${preset.handle}.${fileExtension}`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                resolve();
            };

            // Start recorder with timeslice for more efficient processing (100ms chunks)
            recorder.start(100);

            // Use setInterval to match 30fps capture rate (33.33ms = ~30fps)
            // This ensures smooth playback without lag
            const targetFPS = 30;
            const frameInterval = 1000 / targetFPS;
            let lastFrameTime = performance.now();

            const draw = (vid, p, logoImg, showCreditFlag) => {
                const now = performance.now();
                const elapsed = now - lastFrameTime;

                // Only draw if enough time has passed (maintain 30fps)
                if (elapsed < frameInterval) {
                    renderLoopRef.current = requestAnimationFrame(() => draw(vid, p, logoImg, showCreditFlag));
                    return;
                }

                lastFrameTime = now - (elapsed % frameInterval);

                // Check if video has ended
                if (vid.ended || vid.currentTime >= vid.duration - 0.05) {
                    if (recorder.state === 'recording') {
                        recorder.stop();
                    }
                    return;
                }

                // If video is paused but not ended, resume it
                if (vid.paused && !vid.ended) {
                    vid.play().catch(e => console.log('Resume play error:', e));
                }

                ctx.fillStyle = '#000';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.textBaseline = 'top';
                if (ctx.letterSpacing !== undefined) {
                    ctx.letterSpacing = "-2px";
                }

                // DRAW VIDEO - Always fill the frame completely
                const vidRatio = vid.videoWidth / vid.videoHeight;
                const areaRatio = targetW / targetH;

                // Fill background first
                ctx.fillStyle = '#000';
                ctx.fillRect(0, videoTopY, targetW, targetH);

                // Add Orange Border for Business Cracked (Behind text, around video)
                if (p.name === 'Business Cracked') {
                    ctx.save();
                    ctx.strokeStyle = '#FF6B00';
                    ctx.lineWidth = 8; // Visible thick border
                    // Draw stroke slightly inside to ensure visibility
                    ctx.strokeRect(4, videoTopY + 4, targetW - 8, targetH - 8);
                    ctx.restore();
                }

                // Apply video scale to target dimensions
                const scaledTargetW = targetW * scaleFactor;
                const scaledTargetH = targetH * scaleFactor;
                const scaleOffsetX = (targetW - scaledTargetW) / 2;
                const scaleOffsetY = (targetH - scaledTargetH) / 2;

                if (fitMode === 'cover') {
                    // Calculate source crop area to maintain aspect ratio while filling frame
                    let sx, sy, sw, sh;

                    if (vidRatio > areaRatio) {
                        // Video is wider - fit to target height, crop width
                        sh = vid.videoHeight;
                        sw = sh * areaRatio;
                        sy = 0;
                        sx = (vid.videoWidth - sw) / 2;
                    } else {
                        // Video is taller - fit to target width, crop height
                        sw = vid.videoWidth;
                        sh = sw / areaRatio;
                        sx = 0;
                        sy = (vid.videoHeight - sh) / 2;
                    }

                    // Apply position offset if specified
                    const posX = preset.position?.x ?? 50;
                    const posY = preset.position?.y ?? 50;
                    const offsetX = (vid.videoWidth - sw) * ((posX - 50) / 50);
                    const offsetY = (vid.videoHeight - sh) * ((posY - 50) / 50);

                    const finalCropX = Math.max(0, Math.min(vid.videoWidth - sw, sx + offsetX));
                    const finalCropY = Math.max(0, Math.min(vid.videoHeight - sh, sy + offsetY));

                    // Draw video with scale applied
                    ctx.drawImage(vid, finalCropX, finalCropY, sw, sh,
                        scaleOffsetX, videoTopY + scaleOffsetY, scaledTargetW, scaledTargetH);
                } else if (fitMode === 'fill') {
                    // Fill mode - stretch video to fill entire area (may distort aspect ratio)
                    ctx.drawImage(vid, 0, 0, vid.videoWidth, vid.videoHeight,
                        scaleOffsetX, videoTopY + scaleOffsetY, scaledTargetW, scaledTargetH);
                } else {
                    // Contain mode - scale to fit entire video (may show black bars)
                    const scaleW = scaledTargetW / vid.videoWidth;
                    const scaleH = scaledTargetH / vid.videoHeight;
                    const scale = Math.min(scaleW, scaleH); // Use min to fit entire video
                    const dw = vid.videoWidth * scale;
                    const dh = vid.videoHeight * scale;

                    ctx.drawImage(vid, 0, 0, vid.videoWidth, vid.videoHeight,
                        scaleOffsetX + (scaledTargetW - dw) / 2, videoTopY + scaleOffsetY + (scaledTargetH - dh) / 2, dw, dh);
                }

                // DRAW OVERLAYS
                if (p.layout !== 'watermark') {
                    if (p.layout === 'social') {
                        // Calculate positions - center for Business Cracked, left-aligned for others
                        let actualLogoX = logoX;
                        let actualHeaderTextX = headerTextX;
                        
                        if (p.name === 'Business Cracked') {
                            // Center the logo group on canvas (720px wide)
                            const logoSize = 70;
                            const gap = 10; // Reduced gap for cohesion
                            const badgeWidth = 20; // Approximate badge width
                            const totalGroupWidth = logoSize + gap + nameWidth + badgeWidth;
                            actualLogoX = (720 - totalGroupWidth) / 2;
                            actualHeaderTextX = actualLogoX + logoSize + gap;
                        }
                        
                        if (logoImg) {
                            ctx.save();
                            const logoSize = 70;
                            const scaleFactor = 1.2;
                            const scaledSize = logoSize * scaleFactor;
                            const offset = (scaledSize - logoSize) / 2;
                            const centerX = actualLogoX + logoSize / 2;
                            const centerY = logoY + logoSize / 2;
                            const radius = logoSize / 2;
                            // Draw circular clip
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                            ctx.closePath();
                            ctx.clip();
                            ctx.drawImage(logoImg, actualLogoX - offset, logoY - offset, scaledSize, scaledSize);
                            ctx.restore();
                            // Draw circular border
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                            ctx.lineWidth = 2;
                            ctx.strokeStyle = '#333';
                            ctx.stroke();
                        } else {
                            const logoSize = 70;
                            ctx.fillStyle = '#222';
                            ctx.beginPath();
                            ctx.arc(actualLogoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2, 0, Math.PI * 2);
                            ctx.fill();
                        }
                        
                        // Text Drawing Logic
                        ctx.font = 'bold 26px Inter, sans-serif'; 
                        ctx.textAlign = 'left'; 
                        ctx.fillStyle = '#fff';
                        
                        // Adjust vertical positions based on preset
                        // Business Cracked: Move text UP to center it better against the logo
                        const nameY = p.name === 'Business Cracked' ? headerTextY - 15 : headerTextY - 5;
                        const handleY = p.name === 'Business Cracked' ? headerTextY + 15 : headerTextY + 25;
                        const tickYOffset = p.name === 'Business Cracked' ? -2 : 8; // Move tick up for BC
                        const tickSpacing = p.name === 'Business Cracked' ? 28 : 10; // Increased space for BC

                        ctx.fillText(p.name, actualHeaderTextX, nameY);
                        
                        // Tick
                        const tickX = actualHeaderTextX + nameWidth + tickSpacing; 
                        const tickY = headerTextY + tickYOffset;
                        ctx.beginPath(); ctx.arc(tickX, tickY, 10, 0, Math.PI * 2); ctx.fillStyle = '#3b82f6'; ctx.fill();
                        ctx.beginPath(); ctx.moveTo(tickX - 5, tickY - 1); ctx.lineTo(tickX - 2, tickY + 3); ctx.lineTo(tickX + 5, tickY - 4);
                        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
                        
                        // Handle
                        ctx.font = '500 18px Inter, sans-serif'; ctx.fillStyle = '#9ca3af';
                        ctx.fillText(p.handle, actualHeaderTextX, handleY);
                    }

                    if (p.layout === 'logo_centered' && logoImg) {
                        const lSize = 70;
                        const scaleFactor = 1.2;
                        const scaledSize = lSize * scaleFactor;

                        // Special centering for Real India Business only
                        if (p.name === 'Real India Business') {
                            // Center horizontally: canvas width is 720, so center is at 360
                            const centerX = 360;
                            // Calculate X position to center the scaled image
                            const lX = centerX - (scaledSize / 2);
                            // Center vertically within the logo area
                            const centeredLogoY = logoY + (LOGO_HEIGHT - scaledSize) / 2;
                            const centerY = logoY + LOGO_HEIGHT / 2;
                            const radius = lSize / 2;
                            // Draw circular clip centered on the actual logo size
                            ctx.save();
                            ctx.beginPath();
                            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                            ctx.closePath();
                            ctx.clip();
                            // Draw the scaled image, centered
                            ctx.drawImage(logoImg, lX, centeredLogoY, scaledSize, scaledSize);
                            ctx.restore();
                        } else {
                            // Original logic for other templates (e.g., Best Founder Clips)
                            const lX = 360 - (scaledSize / 2);
                            const centeredLogoY = logoY + (LOGO_HEIGHT - scaledSize) / 2;
                            ctx.drawImage(logoImg, lX, centeredLogoY, scaledSize, scaledSize);
                        }
                    }
                }

                if (p.layout === 'watermark') {
                    ctx.save(); ctx.textAlign = 'center';
                    const watermarkFontWeight = (p.name === '101xfounders' || p.name === 'bizzindia') ? '300' : 'bold';
                    ctx.font = `${watermarkFontWeight} 24px Inter, sans-serif`;
                    ctx.textBaseline = 'bottom'; ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 1;
                    // Use watermarkPosition if available, otherwise default
                    const watermarkX = 720 * ((p.watermarkPosition?.x ?? 50) / 100);
                    const watermarkY = videoTopY + targetH - (p.watermarkPosition?.y ?? 16);
                    ctx.fillText(p.handle, watermarkX, watermarkY);
                    ctx.restore();
                }

                // Headline Drawing (Top-Down)
                const isCenterAligned = p.alignment === 'center';
                let currentLineY = textStartY;

                richLines.forEach(line => {
                    // Calculate total line width for center alignment
                    let totalLineWidth = 0;
                    if (line.length > 0) {
                        line.forEach((token, idx) => {
                            ctx.font = `${token.highlight ? 800 : 500} ${fontSize}px Inter, sans-serif`;
                            const wordWidth = ctx.measureText(token.text).width;
                            // Calculate actual width - token.x already includes all previous words and spaces
                            const actualWidth = token.x + wordWidth;
                            totalLineWidth = Math.max(totalLineWidth, actualWidth);
                        });
                    }
                    const centerOffset = isCenterAligned ? (720 - totalLineWidth) / 2 - adjustedTextXStart : 0;

                    // Render words with proper spacing - use exact positions from calculation
                    line.forEach((token, idx) => {
                        ctx.font = `${token.highlight ? 800 : 500} ${fontSize}px Inter, sans-serif`;
                        ctx.fillStyle = token.highlight ? p.color : '#fff';
                        ctx.textAlign = 'left';
                        // Render word at its calculated position (token.x already includes proper spacing)
                        ctx.fillText(token.text, adjustedTextXStart + token.x + centerOffset, currentLineY);
                    });
                    currentLineY += lineHeight;
                });

                // Footer - Use creditPosition if available (only if showCreditFlag is true)
                if (showCreditFlag) {
                    ctx.save();
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'top';
                    // Use smaller font size with letter spacing for readability
                    ctx.font = 'bold 14px Inter, sans-serif';
                    ctx.fillStyle = '#ffffff';
                    // Convert percentage offset to pixels (both X and Y are percentages)
                    const creditX = textXStart + (720 * ((p.creditPosition?.x ?? 0) / 100));
                    const creditY = footerTopY + (1280 * ((p.creditPosition?.y ?? 0) / 100));
                    // Draw text with letter spacing (manual spacing since canvas doesn't support letterSpacing)
                    const letterSpacing = 1;
                    let currentX = creditX;
                    const creditText = p.footer || '';
                    // Draw text with subtle shadow for better readability on any background
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
                    ctx.shadowBlur = 2;
                    ctx.shadowOffsetX = 1;
                    ctx.shadowOffsetY = 1;
                    for (let i = 0; i < creditText.length; i++) {
                        ctx.fillText(creditText[i], currentX, creditY);
                        currentX += ctx.measureText(creditText[i]).width + letterSpacing;
                    }
                    ctx.restore();
                }

                setExportProgress(Math.floor((vid.currentTime / vid.duration) * 100));

                // Continue the draw loop
                renderLoopRef.current = requestAnimationFrame(() => draw(vid, p, logoImg, showCreditFlag));
            };

            // Start the draw loop
            renderLoopRef.current = requestAnimationFrame(() => draw(video, preset, logoImageObj, shouldShowCredit));
        });
    };


    return (
        <div className="min-h-screen bg-neutral-900 text-white flex flex-col md:flex-row h-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>

            <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}
            </style>

            {/* ... existing code ... */}
            <canvas ref={canvasRef} className="hidden" />

            {/* --- LEFT PANEL --- */}
            <div className="w-full md:w-96 bg-neutral-800 border-r border-neutral-700 flex flex-col h-full overflow-y-auto z-20 shadow-xl shrink-0">
                <div className="p-6 border-b border-neutral-700">
                    <h1 className="text-xl font-bold flex items-center gap-2 text-yellow-400">
                        <Layout className="w-6 h-6" />
                        12-Page Batcher
                    </h1>
                    <p className="text-xs text-neutral-400 mt-1">One Video → 12 Branded Clips</p>
                </div>

                <div className="p-6 space-y-8 pb-32">

                    {/* UPLOAD */}
                    <div className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">1. Source Media</h2>

                        {/* VIDEO FIT MODE */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-neutral-400">Video Fit Mode</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setFitMode('cover')}
                                    className={`flex-1 px-3 py-2 text-xs rounded border transition-all ${fitMode === 'cover'
                                        ? 'bg-yellow-500 text-black border-yellow-500'
                                        : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:border-neutral-400'
                                        }`}
                                    title="Crop to fill (maintains aspect ratio)"
                                >
                                    Cover
                                </button>
                                <button
                                    onClick={() => setFitMode('contain')}
                                    className={`flex-1 px-3 py-2 text-xs rounded border transition-all ${fitMode === 'contain'
                                        ? 'bg-yellow-500 text-black border-yellow-500'
                                        : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:border-neutral-400'
                                        }`}
                                    title="Fit entire video (may show black bars)"
                                >
                                    Contain
                                </button>
                                <button
                                    onClick={() => setFitMode('fill')}
                                    className={`flex-1 px-3 py-2 text-xs rounded border transition-all ${fitMode === 'fill'
                                        ? 'bg-yellow-500 text-black border-yellow-500'
                                        : 'bg-neutral-800 text-neutral-400 border-neutral-600 hover:border-neutral-400'
                                        }`}
                                    title="Stretch to fill (may distort aspect ratio)"
                                >
                                    Fill
                                </button>
                            </div>
                        </div>

                        {/* VIDEO SCALE */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-medium text-neutral-400">Video Scale</label>
                                <span className="text-xs text-neutral-500">{videoScale}%</span>
                            </div>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                step="1"
                                value={videoScale}
                                onChange={(e) => setVideoScale(parseInt(e.target.value))}
                                className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <div className="flex justify-between text-[10px] text-neutral-500">
                                <span>50%</span>
                                <span>100%</span>
                                <span>200%</span>
                            </div>
                        </div>
                        <div
                            className={`border-2 border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors relative ${isDraggingVideo ? 'border-yellow-500 bg-yellow-500/20' : 'border-neutral-600 bg-neutral-700/30 hover:bg-neutral-700/50'}`}
                            onDragOver={onDragOverVideo}
                            onDragLeave={onDragLeaveVideo}
                            onDrop={onDropVideo}
                        >
                            <Upload className="w-6 h-6 text-neutral-400" />
                            <span className="text-xs text-neutral-300">{videoSrc ? 'Replace Video' : 'Drag & Drop Video Here'}</span>
                            <input type="file" accept="video/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleVideoUpload} />
                        </div>
                    </div>

                    {/* TEXT EDIT */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-500">2. Text & Font</h2>
                            <div className="flex bg-neutral-700 rounded p-0.5">
                                <button
                                    onClick={() => setEditMode('global')}
                                    className={`px-2 py-1 text-[10px] rounded ${editMode === 'global' ? 'bg-neutral-500 text-white' : 'text-neutral-400'}`}
                                >
                                    All
                                </button>
                                <button
                                    onClick={() => setEditMode('individual')}
                                    className={`px-2 py-1 text-[10px] rounded ${editMode === 'individual' ? 'bg-neutral-500 text-white' : 'text-neutral-400'}`}
                                >
                                    Per Brand
                                </button>
                            </div>
                        </div>

                        {/* FONT SIZE SLIDER */}
                        <div className="flex items-center gap-2 mb-2">
                            <Type className="w-4 h-4 text-neutral-400" />
                            <input
                                type="range"
                                min="0.5"
                                max="1.5"
                                step="0.1"
                                value={fontScale}
                                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                                className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <span className="text-xs text-neutral-400 w-8 text-right">{(fontScale * 100).toFixed(0)}%</span>
                        </div>

                        {/* WORD SPACING SLIDER */}
                        <div className="flex items-center gap-2 mb-2">
                            <Type className="w-4 h-4 text-neutral-400" />
                            <label className="text-xs text-neutral-400 whitespace-nowrap">Word Spacing:</label>
                            <input
                                type="range"
                                min="0.1"
                                max="1.5"
                                step="0.05"
                                value={wordSpacing}
                                onChange={(e) => setWordSpacing(parseFloat(e.target.value))}
                                className="w-full h-1 bg-neutral-600 rounded-lg appearance-none cursor-pointer accent-yellow-500"
                            />
                            <span className="text-xs text-neutral-400 w-8 text-right">{(wordSpacing * 100).toFixed(0)}%</span>
                        </div>

                        {/* EDIT MODE: GLOBAL */}
                        {editMode === 'global' && (
                            <>
                                <RichTextEditor
                                    value={globalHeadline}
                                    onChange={(html) => updateGlobalText(html, globalFooter)}
                                    placeholder="Headline for ALL videos (Select text and press B to bold)"
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-white placeholder-neutral-500 focus:border-yellow-500 focus:outline-none font-medium min-h-[60px]"
                                />

                                <input
                                    type="text"
                                    value={globalFooter}
                                    onChange={(e) => updateGlobalText(globalHeadline, e.target.value)}
                                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-xs text-neutral-400 font-medium placeholder-neutral-600 focus:border-yellow-500 focus:outline-none"
                                    placeholder="Credit for ALL videos"
                                />
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="show-credit-toggle"
                                        checked={showCredit}
                                        onChange={(e) => setShowCredit(e.target.checked)}
                                        className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-yellow-500 focus:ring-yellow-500"
                                    />
                                    <label htmlFor="show-credit-toggle" className="text-[10px] text-neutral-400 cursor-pointer">
                                        Show Credit
                                    </label>
                                </div>
                                <p className="text-[10px] text-neutral-500">Updating this overwrites all brands.</p>
                            </>
                        )}

                        {/* EDIT MODE: INDIVIDUAL */}
                        {editMode === 'individual' && (
                            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                                {presets.filter(p => p.active).map(p => (
                                    <div key={p.id} className="p-2 bg-neutral-800 rounded border border-neutral-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-bold text-yellow-500">{p.name}</span>
                                            {/* Aspect Ratio Selector */}
                                            <div className="flex gap-1">
                                                {['16:9', '1:1', '4:3', '3:4'].map(r => (
                                                    <button
                                                        key={r}
                                                        onClick={() => {
                                                            setPresets(prev => prev.map(item =>
                                                                item.id === p.id ? { ...item, ratio: r } : item
                                                            ));
                                                        }}
                                                        className={`px-1.5 py-0.5 text-[8px] rounded border ${p.ratio === r ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400'}`}
                                                    >
                                                        {r}
                                                    </button>
                                                ))}
                                            </div>
                                            {/* Text Alignment Selector */}
                                            <div className="flex gap-1 ml-auto">
                                                {['left', 'center'].map(align => (
                                                    <button
                                                        key={align}
                                                        onClick={() => {
                                                            setPresets(prev => prev.map(item =>
                                                                item.id === p.id ? { ...item, alignment: align } : item
                                                            ));
                                                        }}
                                                        className={`px-1.5 py-0.5 text-[8px] rounded border ${(p.alignment || 'left') === align ? 'bg-blue-500 text-white border-blue-500' : 'bg-transparent text-neutral-400 border-neutral-600 hover:border-neutral-400'}`}
                                                        title={align === 'left' ? 'Left Aligned' : 'Center Aligned'}
                                                    >
                                                        {align === 'left' ? 'L' : 'C'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <RichTextEditor
                                            value={p.headline}
                                            onChange={(html) => updateIndividualText(p.id, 'headline', html)}
                                            placeholder="Headline (Select text and press B to bold)"
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-white mb-2 focus:border-yellow-500 focus:outline-none min-h-[50px]"
                                        />
                                        <input
                                            type="text"
                                            value={p.footer}
                                            onChange={(e) => updateIndividualText(p.id, 'footer', e.target.value)}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded p-1.5 text-xs text-neutral-400 focus:border-yellow-500 focus:outline-none"
                                        />
                                    </div>
                                ))}
                                {presets.filter(p => p.active).length === 0 && (
                                    <p className="text-xs text-neutral-500 italic">No active presets selected below.</p>
                                )}
                            </div>
                        )}

                    </div>

                    {/* PRESET LIST */}
                    <div className="pt-4 border-t border-neutral-700 space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-500">3. Brand Assets</h2>
                        <p className="text-[10px] text-neutral-400">Drag & Drop logos onto squares to update.</p>
                        <div className="flex flex-col gap-2">
                            {presets.map(p => (
                                <div key={p.id} className="flex items-center justify-between p-2 rounded bg-neutral-900 border border-neutral-700 transition-colors hover:border-neutral-600">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div
                                            className={`relative group cursor-pointer w-[70px] h-[70px] ${p.name === 'Best Founder Clips' ? 'rounded-none' : 'rounded-full'} bg-neutral-800 flex items-center justify-center border border-neutral-600 overflow-hidden shrink-0 hover:border-white transition-all`}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => onDropLogo(e, p.id)}
                                        >
                                            {p.logo ? (
                                                <img src={p.logo} className={`w-full h-full ${p.name === 'Best Founder Clips' ? 'rounded-none' : 'rounded-full'}`} style={{ objectFit: 'cover', transform: 'scale(1.2)' }} />
                                            ) : (
                                                p.layout !== 'watermark' ? <ImageIcon className="w-4 h-4 text-neutral-500" /> : <span className="text-[8px] text-neutral-600">N/A</span>
                                            )}
                                            {p.layout !== 'watermark' && (
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
                                            <span className="text-xs font-bold text-white">{p.name}</span>
                                            <span className="text-[9px] text-neutral-400">{p.ratio}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => togglePresetActive(p.id)} className="p-2 hover:text-green-400 transition-colors">
                                        {p.active ? <CheckSquare className="w-4 h-4 text-green-500" /> : <Square className="w-4 h-4 text-neutral-600" />}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={processBatchExport}
                            disabled={!videoSrc || isExporting}
                            className={`w-full py-4 rounded-lg font-bold text-black flex items-center justify-center gap-2 transition-all shadow-lg ${!videoSrc ? 'bg-neutral-700 text-neutral-500 cursor-not-allowed' :
                                isExporting ? 'bg-yellow-600 cursor-wait' : 'bg-yellow-500 hover:bg-yellow-400'
                                }`}
                        >
                            {isExporting ? <Loader className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                            {isExporting ? 'Processing Batch...' : `Export ${presets.filter(p => p.active).length} Videos`}
                        </button>
                    </div>
                </div>
            </div>

            {/* --- RIGHT PANEL: PREVIEW --- */}
            <div className="flex-1 bg-neutral-950 flex flex-col relative overflow-hidden">

                {videoSrc && !isExporting && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
                        <button
                            onClick={togglePlay}
                            className="bg-neutral-800/80 backdrop-blur text-white px-6 py-2 rounded-full border border-neutral-600 hover:border-yellow-500 flex items-center gap-2 shadow-lg transition-all"
                        >
                            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase tracking-wider">{isPlaying ? 'Pause All' : 'Play All'}</span>
                        </button>
                        <button
                            onClick={toggleMute}
                            className="bg-neutral-800/80 backdrop-blur text-white px-6 py-2 rounded-full border border-neutral-600 hover:border-yellow-500 flex items-center gap-2 shadow-lg transition-all"
                            title={isMuted ? 'Unmute' : 'Mute'}
                        >
                            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase tracking-wider">{isMuted ? 'Unmute' : 'Muted'}</span>
                        </button>
                    </div>
                )}

                {isExporting && (
                    <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center text-center p-8">
                        <Loader className="w-12 h-12 text-yellow-500 animate-spin mb-4" />
                        <h2 className="text-2xl font-bold text-white mb-2">{exportStatus}</h2>
                        <div className="w-64 h-2 bg-neutral-800 rounded-full overflow-hidden mt-4">
                            <div className="h-full bg-yellow-500 transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>
                        </div>
                        <p className="text-neutral-500 text-xs mt-4">Please keep this tab open.</p>
                    </div>
                )}

                {/* --- GRID VIEW CONTENT --- */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    <div className="flex flex-col items-center min-h-full">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl items-start pb-20">
                            {presets.map((p, i) => (
                                <div key={p.id} className={`flex flex-col items-center gap-2 transition-opacity ${p.active ? 'opacity-100' : 'opacity-40'}`}>
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
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}