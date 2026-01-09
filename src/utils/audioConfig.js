/**
 * Audio Configuration
 * Centralized settings for TTS voices and languages.
 * 
 * Voices:
 * - English: Elias (Default), etc.
 * - Chinese: ZhiXia (Default), etc.
 */

export const AUDIO_CONFIG = {
    DEFAULT_VOICE: 'Elias',
    DEFAULT_LANGUAGE: 'English',

    CHINESE_VOICE: 'Cherry',
    CHINESE_LANGUAGE: 'Chinese',

    // Fallbacks or future expansions can be added here
    voices: {
        en: 'Elias',
        zh: 'Cherry',
    },

    languages: {
        en: 'English',
        zh: 'Chinese',
    }
};
