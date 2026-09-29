/**
 * Stream URL parsing and embed generation utility
 * Supports YouTube watch, live, shorts, share URLs, and Twitch channels
 */

export interface StreamEmbedInfo {
  embedUrl: string
  platform: 'youtube' | 'twitch' | 'kick' | 'custom'
  originalUrl: string
  isValid: boolean
}

export function parseStreamEmbed(url?: string): StreamEmbedInfo {
  if (!url || typeof url !== 'string') {
    return {
      embedUrl: '',
      platform: 'custom',
      originalUrl: '',
      isValid: false,
    }
  }

  const clean = url.trim()
  if (!clean) {
    return {
      embedUrl: '',
      platform: 'custom',
      originalUrl: '',
      isValid: false,
    }
  }

  // 1. YouTube variations:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/live/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  const ytMatch = clean.match(
    /(?:youtube(?:-nocookie)?\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?|live|shorts)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  )

  if (ytMatch && ytMatch[1]) {
    return {
      embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0&modestbranding=1`,
      platform: 'youtube',
      originalUrl: clean,
      isValid: true,
    }
  }

  // 2. Twitch Channel:
  // - https://www.twitch.tv/CHANNEL_NAME
  const twitchMatch = clean.match(/twitch\.tv\/([a-zA-Z0-9_]{3,25})/i)
  if (twitchMatch && twitchMatch[1]) {
    const parent = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    return {
      embedUrl: `https://player.twitch.tv/?channel=${twitchMatch[1]}&parent=${parent}&autoplay=true&muted=false`,
      platform: 'twitch',
      originalUrl: clean,
      isValid: true,
    }
  }

  // 3. Kick Stream:
  // - https://kick.com/CHANNEL_NAME
  const kickMatch = clean.match(/kick\.com\/([a-zA-Z0-9_]+)/i)
  if (kickMatch && kickMatch[1]) {
    return {
      embedUrl: `https://player.kick.com/${kickMatch[1]}?autoplay=true&muted=false`,
      platform: 'kick',
      originalUrl: clean,
      isValid: true,
    }
  }

  // 4. If already an embed or valid https URL
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return {
      embedUrl: clean,
      platform: 'custom',
      originalUrl: clean,
      isValid: true,
    }
  }

  return {
    embedUrl: clean,
    platform: 'custom',
    originalUrl: clean,
    isValid: false,
  }
}
