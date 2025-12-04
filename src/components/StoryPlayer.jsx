import { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Play, Pause, Loader2, RotateCcw } from 'lucide-react';
import { generateProductStoryWithAudio } from '../services/StoryService';
import translations from './Translations.json';
import '../styles/storyPlayer.css';

/**
 * StoryPlayer - Audio player component for AI-generated product stories
 *
 * Features:
 * - Generates story on first play
 * - Text-to-speech audio playback
 * - Shows story text while playing
 * - Respects current app language
 */
function StoryPlayer({ productData, language }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [story, setStory] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const audioRef = useRef(null);

  // Normalize language key
  const langKey =
    Object.keys(translations).find(k => k.toLowerCase() === String(language).toLowerCase())
    ?? Object.keys(translations)[0];

  // Get translations
  const t = translations[langKey];

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Handle audio end
  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => setIsPlaying(false);
      audioRef.current.addEventListener('ended', handleEnded);
      return () => {
        if (audioRef.current) {
          audioRef.current.removeEventListener('ended', handleEnded);
        }
      };
    }
  }, [audioUrl]);

  const handlePlayPause = async () => {
    // If we already have audio, just play/pause
    if (audioRef.current && audioUrl) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        try {
          await audioRef.current.play();
          setIsPlaying(true);
        } catch (playError) {
          console.error('Error resuming audio:', playError);
          setError('Unable to play audio. Please try again.');
        }
      }
      return;
    }

    // Generate story and audio if not already done
    setIsLoading(true);
    setError(null);

    try {
      const result = await generateProductStoryWithAudio(productData, language);
      setStory(result.story);
      setAudioUrl(result.audioUrl);

      // Create audio element
      const audio = new Audio(result.audioUrl);
      audioRef.current = audio;

      // Load the audio (but don't autoplay)
      audio.load();
    } catch (err) {
      console.error('Error generating story:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (!isPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(err => {
          console.error('Error restarting audio:', err);
          setError('Unable to restart audio. Please try again.');
        });
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  return (
    <div className="story-player">
      <div className="story-controls">
        <button
          className="story-play-btn"
          onClick={handlePlayPause}
          disabled={isLoading}
          title={t.story_play_tooltip || 'Listen to the product story'}
        >
          {isLoading ? (
            <>
              <Loader2 className="spinning" size={20} />
              <span>{t.story_loading || 'Generating story...'}</span>
            </>
          ) : isPlaying ? (
            <>
              <Pause size={20} />
              <span>{t.story_pause || 'Pause'}</span>
            </>
          ) : (
            <>
              <Play size={20} />
              <span>{t.story_play || 'Listen to my story'}</span>
            </>
          )}
        </button>

        {story && audioUrl && (
          <button
            className="story-restart-btn"
            onClick={handleRestart}
            disabled={isLoading}
            title={t.story_restart || 'Restart from beginning'}
          >
            <RotateCcw size={20} />
            <span>{t.story_restart || 'Restart'}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="story-error">
          <p>{t.story_error || 'Error generating story'}:</p>
          <small>{error}</small>
        </div>
      )}

      {story && (
        <div className="story-text-container" data-aos="fade-in">
          <h3>{t.story_title || 'My Story'}</h3>
          <p className="story-text">{story}</p>
        </div>
      )}
    </div>
  );
}

StoryPlayer.propTypes = {
  productData: PropTypes.object.isRequired,
  language: PropTypes.string.isRequired,
};

export default StoryPlayer;