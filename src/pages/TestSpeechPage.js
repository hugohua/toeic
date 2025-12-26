import React from 'react';
import { useSpeech } from 'react-text-to-speech';
import Header from '../components/Header';
import '../index.css';
import './TestSpeechPage.css';

export default function TestSpeechPage() {
  const {
    Text, // Component that renders speech text in a <div> and supports standard HTML <div> props
    speechStatus, // String that stores current speech status
    isInQueue, // Indicates whether the speech is currently playing or waiting in the queue
    start, // Function to start the speech or put it in queue
    pause, // Function to pause the speech
    stop, // Function to stop the speech or remove it from queue
  } = useSpeech({ text: 'This library is awesome!' });

  return (
    <div className="container">
      <Header title="语音测试页面" showBack />
      <main className="test-speech-content">
        <Text />
        <div className="test-speech-buttons">
          {speechStatus !== 'started' ? (
            <button onClick={start}>Start</button>
          ) : (
            <button onClick={pause}>Pause</button>
          )}
          <button onClick={stop}>Stop</button>
        </div>
        <div>
          <p>
            Speech Status: <strong>{speechStatus}</strong>
          </p>
          <p>
            Is In Queue: <strong>{isInQueue ? 'Yes' : 'No'}</strong>
          </p>
        </div>
      </main>
    </div>
  );
}
