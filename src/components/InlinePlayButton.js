import React from 'react';
import { Play, Square, Loader2 } from 'lucide-react';
import { useSpeechConfig } from '../hooks/useSpeechConfig';
import './InlinePlayButton.css';

/**
 * InlinePlayButton - A minimal play icon for inline text
 * @param {object} props
 * @param {string} props.text - Text to speak
 * @param {number} props.size - Icon size (default: 16)
 */
function InlinePlayButton({ text, size = 16 }) {
    const { start, stop, isPlaying, isLoading } = useSpeechConfig(text);

    const handleClick = (e) => {
        e.stopPropagation();
        if (isPlaying) {
            stop();
        } else {
            start();
        }
    };

    let Icon = Play;
    if (isLoading) Icon = Loader2;
    if (isPlaying) Icon = Square;

    return (
        <button
            type="button"
            className={`inline-play-btn ${isLoading ? 'loading' : ''} ${isPlaying ? 'playing' : ''}`}
            onClick={handleClick}
            aria-label={isPlaying ? '停止播放' : '播放'}
        >
            <Icon size={size} className={isLoading ? 'icon-spin' : ''} />
        </button>
    );
}

export default InlinePlayButton;
