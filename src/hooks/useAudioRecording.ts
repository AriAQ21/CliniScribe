import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface UseAudioRecordingReturn {
  recordingState: 'idle' | 'recording' | 'paused';
  hasRecorded: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  permissionGranted: boolean;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => Promise<Blob | null>;
  resetRecording: () => void;
}

export function useAudioRecording(deviceConstraints?: MediaStreamConstraints): UseAudioRecordingReturn {
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const updateDuration = useCallback(() => {
    if (startTimeRef.current) {
      const elapsed = Date.now() - startTimeRef.current - pausedTimeRef.current;
      setRecordingDuration(Math.floor(elapsed / 1000));
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const constraints = deviceConstraints || { 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      mediaStreamRef.current = stream;
      setPermissionGranted(true);
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        setHasRecorded(true);
        
        // Clean up stream
        if (mediaStreamRef.current) {
          mediaStreamRef.current.getTracks().forEach(track => track.stop());
          mediaStreamRef.current = null;
        }
      };

      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      startTimeRef.current = Date.now();
      pausedTimeRef.current = 0;
      
      // Start duration timer
      intervalRef.current = setInterval(updateDuration, 1000);
      
      toast({
        title: "Recording Started",
        description: "Audio recording has begun.",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      setPermissionGranted(false);
      
      toast({
        title: "Recording Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [updateDuration, toast]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      
      // Stop duration timer and track paused time
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      toast({
        title: "Recording Paused",
        description: "Audio recording has been paused.",
      });
    }
  }, [recordingState, toast]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      // Resume duration timer
      const pauseStartTime = startTimeRef.current + recordingDuration * 1000;
      pausedTimeRef.current += Date.now() - pauseStartTime;
      intervalRef.current = setInterval(updateDuration, 1000);
      
      toast({
        title: "Recording Resumed",
        description: "Audio recording has resumed.",
      });
    }
  }, [recordingState, recordingDuration, updateDuration, toast]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current) {
        // Set up the onstop handler to create and resolve with the blob
        mediaRecorderRef.current.onstop = () => {
          // Create the blob from chunks directly here
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setAudioBlob(audioBlob);
          setHasRecorded(true);
          
          // Clean up stream
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
          }
          
          // Resolve with the newly created blob
          resolve(audioBlob);
        };
        
        mediaRecorderRef.current.stop();
        setRecordingState('idle');
        
        // Stop duration timer
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        toast({
          title: "Recording Stopped",
          description: "Audio recording has been completed.",
        });
      } else {
        resolve(null);
      }
    });
  }, [toast]);

  const resetRecording = useCallback(() => {
    // Stop any ongoing recording
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    
    // Clean up stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    
    // Stop timer
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Reset all state
    setRecordingState('idle');
    setHasRecorded(false);
    setRecordingDuration(0);
    setAudioBlob(null);
    audioChunksRef.current = [];
    startTimeRef.current = 0;
    pausedTimeRef.current = 0;
  }, []);

  return {
    recordingState,
    hasRecorded,
    recordingDuration,
    audioBlob,
    permissionGranted,
    startRecording,
    pauseRecording: pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  };
}
