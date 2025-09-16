import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAudioRecording } from '@/hooks/useAudioRecording';
import { useAuth } from '@/hooks/useAuth';

const LS_KEY = (appointmentId: string) => `mt:lastAudioId:${appointmentId}`;

export function useTranscription(
  appointmentId?: string,
  appointmentDateTime?: Date,
  manualTags: Array<{ label: string; content: string }> = [],
  deviceConstraints?: MediaStreamConstraints
) {
  const [transcriptionText, setTranscriptionText] = useState('');
  const [originalTranscriptionText, setOriginalTranscriptionText] = useState('');
  const [transcriptionSent, setTranscriptionSent] = useState(false);
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingExistingTranscription, setIsLoadingExistingTranscription] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isLoadingRef = useRef(false);

  const {
    recordingState,
    hasRecorded,
    recordingDuration,
    audioBlob,
    permissionGranted,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
  } = useAudioRecording(deviceConstraints);

  const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  const fetchTranscriptById = useCallback(async (audioId: string) => {
    try {
      const r = await fetch(`${backendUrl}/transcribe/text/${audioId}`);
      if (!r.ok) return null;
      const data = await r.json();
      const t: string | undefined = data?.transcript;
      return (t && t.trim()) ? t : null;
    } catch (error) {
      console.log('Error fetching transcript:', error);
      return null;
    }
  }, [backendUrl]);

  const loadExistingTranscription = useCallback(async (appointmentDateTime: Date) => {
  if (!appointmentId) return;
  if (isLoadingRef.current) return;

  try {
    isLoadingRef.current = true;
    setIsLoadingExistingTranscription(true);

    const storedId = localStorage.getItem(LS_KEY(appointmentId));
    if (storedId) {
      // Try direct transcript fetch
      const t = await fetchTranscriptById(storedId);
      if (t) {
        setTranscriptionText(t);
        setTranscriptionSent(true);
        setIsProcessing(false);
        return;
      }

      // Otherwise check the transcription status
      try {
        const s = await fetch(`${backendUrl}/transcribe/status/${storedId}`);
        if (s.ok) {
          const statusData = await s.json();
          if (statusData.status === "processing" || statusData.status === "queued") {
            setTranscriptionSent(true);
            setIsProcessing(true);
            setTranscriptionText("Transcription in progress...");
            return;
          }
          if (statusData.status === "error") {
            setTranscriptionText("Error: transcription failed.");
            setIsProcessing(false);
            return;
          }
        }
      } catch (error) {
        console.log('Error checking transcription status:', error);
      }

      // Clean up if we get here = not processing, no transcript
      localStorage.removeItem(LS_KEY(appointmentId));
    }
  } catch (e) {
    console.log("No existing transcription yet:", e);
  } finally {
    isLoadingRef.current = false;
    setIsLoadingExistingTranscription(false);
  }
}, [appointmentId, fetchTranscriptById, backendUrl]);


  // const loadExistingTranscription = useCallback(async (appointmentDateTime: Date) => {
  //   if (!appointmentId) return;
  //   if (isLoadingRef.current) return;

  //   try {
  //     isLoadingRef.current = true;
  //     setIsLoadingExistingTranscription(true);

  //     const storedId = localStorage.getItem(LS_KEY(appointmentId));
  //     if (storedId) {
  //       // First, check if transcript exists
  //       const t = await fetchTranscriptById(storedId);
  //       if (t) {
  //         setTranscriptionText(t);
  //         setTranscriptionSent(true);
  //         setIsProcessing(false);
  //         return;
  //       }

  //       // If not, check the current status
  //       const s = await fetch(`${backendUrl}/transcribe/status/${storedId}`);
  //       if (s.ok) {
  //         const statusData = await s.json();

  //         if (statusData.status === "processing" || statusData.status === "queued") {
  //           setTranscriptionSent(true);
  //           setIsProcessing(true);
  //           setTranscriptionText("Transcription in progress...");
  //           return;
  //         }

  //         if (statusData.status === "error") {
  //           setTranscriptionText("Error: transcription failed.");
  //           setIsProcessing(false);
  //           return;
  //         }
  //       }

  //       // If no transcript and not processing, clear the stored ID
  //       localStorage.removeItem(LS_KEY(appointmentId));
  //     }
  //   } catch (e) {
  //     console.log("No existing transcription yet:", e);
  //   } finally {
  //     isLoadingRef.current = false;
  //     setIsLoadingExistingTranscription(false);
  //   }
  // }, [appointmentId, fetchTranscriptById, backendUrl]);

  useEffect(() => {
    if (appointmentId && appointmentDateTime) {
      loadExistingTranscription(appointmentDateTime);
    }
  }, [appointmentId, appointmentDateTime, loadExistingTranscription]);

  // ---- Recording Flow ----
  const handleSendForTranscription = async (appointmentId: string, room: string, appointmentDateTime: Date) => {
    let currentAudioBlob = audioBlob;

    try {
      setIsProcessing(true);
      setTranscriptionText("Transcription in progress...");

      if (recordingState !== 'idle') {
        currentAudioBlob = await stopRecording();
      }
      if (!currentAudioBlob) throw new Error('No audio recording available - please try recording again');
      if (!user) throw new Error('User not authenticated');

      const formData = new FormData();
      formData.append('file', currentAudioBlob, 'audio.webm');
      formData.append('appointment_id', appointmentId);
      formData.append('user_id', String(user.user_id));
      formData.append('room', room);
      formData.append('appointment_time', appointmentDateTime.toISOString());

      if (manualTags.length > 0) {
        formData.append("manual_tags", JSON.stringify(manualTags));
      }

      const response = await fetch(`${backendUrl}/transcribe`, { method: 'POST', body: formData });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(`Upload failed: ${response.status} ${msg}`);
      }

      const uploadResult = await response.json();
      const uploadedAudioId: string | undefined = uploadResult?.audio_id;
      if (!uploadedAudioId) throw new Error("Server did not return audio_id");

      localStorage.setItem(LS_KEY(appointmentId), uploadedAudioId);
      setTranscriptionSent(true);

      // Poll for transcription result
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const s = await fetch(`${backendUrl}/transcribe/status/${uploadedAudioId}`);
        if (!s.ok) throw new Error(`Status check failed: ${s.status}`);
        const statusData = await s.json();

        if (statusData.status === 'completed' && statusData.transcript) {
          setTranscriptionText(statusData.transcript);
          setIsProcessing(false);
          resetRecording();
          toast({ title: "Transcription Complete", description: "Your audio has been successfully transcribed." });
          return;
        }
        if (statusData.status === 'error') {
          throw new Error('Transcription failed on server');
        }
        await new Promise(res => setTimeout(res, 2000));
      }

      throw new Error('Transcription timeout - please try again');
    } catch (error) {
      console.error('Error sending for transcription:', error);
      setIsProcessing(false);
      setTranscriptionSent(false);
      setTranscriptionText('');
      toast({
        title: "Transcription Error",
        description: error instanceof Error ? error.message : "There was an error processing your transcription.",
        variant: "destructive",
      });
    }
  };

  // ---- File Upload Flow ----
  const handleUploadFileForTranscription = async (
    file: File,
    appointmentId: string,
    room: string,
    appointmentDateTime: Date
  ) => {
    try {
      setIsProcessing(true);
      setTranscriptionText("Transcription in progress...");

      if (!user) throw new Error('User not authenticated');

      const formData = new FormData();
      formData.append("file", file);
      formData.append("appointment_id", appointmentId);
      formData.append("user_id", String(user.user_id));
      formData.append("room", room);
      formData.append("appointment_time", appointmentDateTime.toISOString());

      if (manualTags.length > 0) {
        formData.append("manual_tags", JSON.stringify(manualTags));
      }

      const response = await fetch(`${backendUrl}/transcribe`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const msg = await response.text();
        throw new Error(`Upload failed: ${response.status} ${msg}`);
      }

      const data = await response.json();
      const uploadedAudioId: string | undefined = data?.audio_id;
      if (!uploadedAudioId) throw new Error("Server did not return audio_id");

      localStorage.setItem(LS_KEY(appointmentId), uploadedAudioId);
      setTranscriptionSent(true);

      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        const s = await fetch(`${backendUrl}/transcribe/status/${uploadedAudioId}`);
        if (!s.ok) throw new Error(`Status check failed: ${s.status}`);
        const statusData = await s.json();

        if (statusData.status === "completed" && statusData.transcript) {
          setTranscriptionText(statusData.transcript);
          setIsProcessing(false);
          return;
        }
        if (statusData.status === "error") {
          throw new Error("Transcription failed on server");
        }
        await new Promise((res) => setTimeout(res, 2000));
      }

      throw new Error("Transcription timeout - please try again");
    } catch (err) {
      setIsProcessing(false);
      setTranscriptionSent(false);
      setTranscriptionText(
        err instanceof Error ? `Error: ${err.message}` : "There was an error processing your transcription."
      );
    }
  };

  const handleEditTranscription = () => {
    setOriginalTranscriptionText(transcriptionText);
    setIsEditingTranscription(true);
  };
  const handleSaveTranscription = async () => {
    try {
      if (!appointmentId) return;

      const audioId = localStorage.getItem(LS_KEY(appointmentId));
      if (!audioId) throw new Error("Missing audio ID");

      const formData = new FormData();
      formData.append("new_text", transcriptionText);

      const res = await fetch(`${backendUrl}/transcribe/update/${audioId}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Update failed: ${msg}`);
      }

      toast({
        title: "Transcription Saved",
        description: "Your edits have been saved to disk.",
      });

      setIsEditingTranscription(false);
    } catch (err) {
      toast({
        title: "Save Failed",
        description: err instanceof Error ? err.message : "Unable to save your changes. Please try again.",
        variant: "destructive",
      });
    }
  };
  const handleCancelEdit = () => {
    setTranscriptionText(originalTranscriptionText);
    setIsEditingTranscription(false);
  };

  return {
    // States
    recordingState,
    hasRecorded,
    recordingDuration,
    transcriptionText,
    transcriptionSent,
    isEditingTranscription,
    isProcessing,
    isLoadingExistingTranscription,
    permissionGranted,
    setTranscriptionText,

    // Recording actions
    handleStartRecording: startRecording,
    handlePauseRecording: pauseRecording,
    handleResumeRecording: resumeRecording,
    handleSendForTranscription,

    // File upload action
    handleUploadFileForTranscription,

    // Editing actions
    handleEditTranscription,
    handleSaveTranscription,
    handleCancelEdit,

    // Reload existing transcript
    loadExistingTranscription,
  };
}
