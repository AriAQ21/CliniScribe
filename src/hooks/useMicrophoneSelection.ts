import { useState, useEffect, useCallback } from 'react';

export interface MicrophoneDevice {
  deviceId: string;
  label: string;
}

export interface UseMicrophoneSelectionReturn {
  availableDevices: MicrophoneDevice[];
  selectedDevice: MicrophoneDevice | null;
  hasMultipleDevices: boolean;
  isLoadingDevices: boolean;
  selectDevice: (device: MicrophoneDevice) => void;
  refreshDevices: () => Promise<void>;
  getConstraintsForSelectedDevice: () => MediaStreamConstraints;
}

export function useMicrophoneSelection(): UseMicrophoneSelectionReturn {
  const [availableDevices, setAvailableDevices] = useState<MicrophoneDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<MicrophoneDevice | null>(null);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);

  const refreshDevices = useCallback(async () => {
    setIsLoadingDevices(true);
    try {
      // Request permission to enumerate devices
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices
        .filter(device => device.kind === 'audioinput')
        .map(device => ({
          deviceId: device.deviceId,
          label: device.label || `Microphone ${device.deviceId.slice(0, 5)}...`
        }));

      setAvailableDevices(audioInputs);

      // Auto-select the default device if none is selected
      if (!selectedDevice && audioInputs.length > 0) {
        const defaultDevice = audioInputs.find(device => device.deviceId === 'default') 
          || audioInputs[0];
        setSelectedDevice(defaultDevice);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      setAvailableDevices([]);
    } finally {
      setIsLoadingDevices(false);
    }
  }, [selectedDevice]);

  const selectDevice = useCallback((device: MicrophoneDevice) => {
    setSelectedDevice(device);
  }, []);

  const getConstraintsForSelectedDevice = useCallback((): MediaStreamConstraints => {
    return {
      audio: selectedDevice?.deviceId 
        ? {
            deviceId: { exact: selectedDevice.deviceId },
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
        : {
            echoCancellation: true,
            noiseSuppression: true,
            sampleRate: 44100
          }
    };
  }, [selectedDevice]);

  useEffect(() => {
    refreshDevices();

    // Listen for device changes with error handling
    const handleDeviceChange = () => {
      refreshDevices();
    };

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
        navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
      }
    } catch (error) {
      console.warn('Could not add device change listener:', error);
    }

    return () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
          navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
        }
      } catch (error) {
        console.warn('Could not remove device change listener:', error);
      }
    };
  }, [refreshDevices]);

  return {
    availableDevices,
    selectedDevice,
    hasMultipleDevices: availableDevices.length > 1,
    isLoadingDevices,
    selectDevice,
    refreshDevices,
    getConstraintsForSelectedDevice,
  };
}