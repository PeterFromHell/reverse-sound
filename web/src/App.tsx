import { useAudio } from './hooks/useAudio';
import { Visualizer } from './components/Visualizer';
import './App.css';

function App() {
  const {
    state,
    startRecording,
    stopRecording,
    reverseAudio,
    playAudio,
    stopPlayback,
    analyser
  } = useAudio();

  const handleToggleRecord = () => {
    if (state.isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleTogglePlay = () => {
    if (state.isPlaying) {
      stopPlayback();
    } else {
      playAudio();
    }
  };

  const isProcessing = state.isRecording || state.isPlaying;

  return (
    <div className="app-container">
      <div className="card">
        <h1>Echo Reverse</h1>

        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
          Record your voice, flip it, and hear the reversed reality.
        </p>

        <div className="visualizer-container">
          <Visualizer analyser={analyser} isActive={isProcessing} />
        </div>

        <div className="controls">
          <button
            className={`record ${state.isRecording ? 'active' : ''}`}
            onClick={handleToggleRecord}
            disabled={state.isPlaying}
          >
            {state.isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>

          <button
            onClick={reverseAudio}
            disabled={!state.hasAudio || isProcessing}
          >
            Reverse Audio
          </button>

          <button
            className="play"
            onClick={handleTogglePlay}
            disabled={!state.hasAudio || state.isRecording}
          >
            {state.isPlaying ? 'Stop Playing' : 'Play'}
          </button>
        </div>

        {state.hasAudio && (
          <div style={{ marginTop: '1rem', fontSize: '0.9em', opacity: 0.5 }}>
            Duration: {state.duration.toFixed(2)}s
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
