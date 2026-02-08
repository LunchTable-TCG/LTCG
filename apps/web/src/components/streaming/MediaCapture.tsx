"use client";

import { Camera, Mic, MicOff, Monitor } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface CapturedMedia {
  screenStream: MediaStream | null;
  webcamStream: MediaStream | null;
  audioStream: MediaStream | null;
}

interface MediaCaptureProps {
  onMediaCaptured: (media: CapturedMedia) => void;
  onError: (error: string) => void;
}

export function MediaCapture({ onMediaCaptured, onError }: MediaCaptureProps) {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isCapturing, setIsCapturing] = useState(false);

  const screenVideoRef = useRef<HTMLVideoElement>(null);
  const webcamVideoRef = useRef<HTMLVideoElement>(null);

  const captureScreen = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true, // Capture system audio if available
      });

      setScreenStream(stream);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      // Handle user stopping screen share via browser UI
      stream.getVideoTracks()[0].addEventListener("ended", () => {
        setScreenStream(null);
        onError("Screen sharing stopped");
      });

      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to capture screen";
      onError(message);
      return null;
    }
  }, [onError]);

  const captureWebcam = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 },
        },
        audio: audioEnabled,
      });

      setWebcamStream(stream);

      if (webcamVideoRef.current) {
        webcamVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to capture webcam";
      onError(message);
      return null;
    }
  }, [audioEnabled, onError]);

  const toggleAudio = useCallback(() => {
    if (webcamStream) {
      const audioTrack = webcamStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  }, [webcamStream]);

  const stopAllCapture = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    if (webcamStream) {
      webcamStream.getTracks().forEach((track) => track.stop());
      setWebcamStream(null);
    }
  }, [screenStream, webcamStream]);

  const startCapture = useCallback(async () => {
    setIsCapturing(true);

    const screen = await captureScreen();
    const webcam = await captureWebcam();

    if (screen || webcam) {
      onMediaCaptured({
        screenStream: screen,
        webcamStream: webcam,
        audioStream: webcam, // Audio comes from webcam stream
      });
    }

    setIsCapturing(false);
  }, [captureScreen, captureWebcam, onMediaCaptured]);

  useEffect(() => {
    return () => {
      stopAllCapture();
    };
  }, [stopAllCapture]);

  return (
    <div className="media-capture">
      <h3>📹 Media Setup</h3>
      <p className="description">Configure your stream sources</p>

      <div className="capture-grid">
        {/* Screen Capture */}
        <div className="capture-card">
          <div className="card-header">
            <Monitor className="icon" />
            <span>Screen Share</span>
            {screenStream && <span className="badge active">Active</span>}
          </div>
          {screenStream ? (
            <div className="preview">
              <video ref={screenVideoRef} autoPlay muted playsInline className="preview-video" />
              <button
                type="button"
                onClick={() => {
                  screenStream.getTracks().forEach((t) => t.stop());
                  setScreenStream(null);
                }}
                className="btn-stop-preview"
              >
                Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureScreen}
              className="btn-capture"
              disabled={isCapturing}
            >
              <Monitor className="btn-icon" />
              Share Screen
            </button>
          )}
        </div>

        {/* Webcam Capture */}
        <div className="capture-card">
          <div className="card-header">
            <Camera className="icon" />
            <span>Webcam</span>
            {webcamStream && <span className="badge active">Active</span>}
          </div>
          {webcamStream ? (
            <div className="preview">
              <video ref={webcamVideoRef} autoPlay muted playsInline className="preview-video" />
              <div className="preview-controls">
                <button type="button" onClick={toggleAudio} className="btn-icon-small">
                  {audioEnabled ? <Mic /> : <MicOff />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    webcamStream.getTracks().forEach((t) => t.stop());
                    setWebcamStream(null);
                  }}
                  className="btn-stop-preview"
                >
                  Stop
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={captureWebcam}
              className="btn-capture"
              disabled={isCapturing}
            >
              <Camera className="btn-icon" />
              Enable Webcam
            </button>
          )}
        </div>
      </div>

      {!screenStream && !webcamStream && (
        <div className="info-banner">
          <p>
            <strong>Tip:</strong> You can stream with just your screen, just your webcam, or both!
          </p>
        </div>
      )}

      {(screenStream || webcamStream) && (
        <button type="button" onClick={startCapture} className="btn-primary" disabled={isCapturing}>
          Continue to Stream Setup
        </button>
      )}

      <style jsx>{`
        .media-capture {
          padding: 24px;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          color: #e8e0d5;
        }

        .description {
          margin: 0 0 24px 0;
          color: #a89f94;
          font-size: 14px;
        }

        .capture-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .capture-card {
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-weight: 600;
          color: #e8e0d5;
        }

        .icon {
          width: 20px;
          height: 20px;
          color: #d4af37;
        }

        .badge {
          margin-left: auto;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .badge.active {
          background: rgba(16, 185, 129, 0.2);
          color: #6ee7b7;
        }

        .preview {
          position: relative;
          background: #000;
          border-radius: 8px;
          overflow: hidden;
          aspect-ratio: 16/9;
        }

        .preview-video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .preview-controls {
          position: absolute;
          bottom: 8px;
          right: 8px;
          display: flex;
          gap: 8px;
        }

        .btn-capture {
          width: 100%;
          padding: 16px;
          background: linear-gradient(135deg, #d4af37 0%, #c49d2e 100%);
          border: none;
          border-radius: 8px;
          color: #1a1614;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .btn-capture:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
        }

        .btn-capture:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-icon {
          width: 18px;
          height: 18px;
        }

        .btn-stop-preview {
          padding: 6px 12px;
          background: rgba(220, 38, 38, 0.9);
          border: none;
          border-radius: 6px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-stop-preview:hover {
          background: rgba(220, 38, 38, 1);
        }

        .btn-icon-small {
          padding: 6px;
          background: rgba(0, 0, 0, 0.7);
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .btn-icon-small:hover {
          background: rgba(0, 0, 0, 0.9);
        }

        .btn-icon-small :global(svg) {
          width: 16px;
          height: 16px;
        }

        .info-banner {
          padding: 12px;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.3);
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .info-banner p {
          margin: 0;
          color: #93c5fd;
          font-size: 13px;
        }

        .btn-primary {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
