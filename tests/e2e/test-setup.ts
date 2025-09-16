// Enhanced test setup for browser API mocking and error handling
import { Page } from '@playwright/test';

export async function setupTestEnvironment(page: Page) {
  // Enhanced browser API mocking with early navigator.mediaDevices setup
  await page.addInitScript(() => {
    // Mock console to capture all errors
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;
    
    window.testErrors = [];
    window.testWarnings = [];
    window.testLogs = [];
    
    console.error = (...args) => {
      const errorMsg = args.join(' ');
      window.testErrors.push(errorMsg);
      // originalError('🧪 TEST ERROR:', ...args);
    };
    
    console.warn = (...args) => {
      const warnMsg = args.join(' ');
      window.testWarnings.push(warnMsg);
      // originalWarn('🧪 TEST WARN:', ...args);
    };

    console.log = (...args) => {
      const logMsg = args.join(' ');
      window.testLogs.push(logMsg);
      originalLog(...args);
    };
    
    // Mock localStorage with error handling
    if (typeof window.localStorage === 'undefined') {
      const storage: Record<string, string> = {};
      window.localStorage = {
        getItem: (key: string) => {
          try { return storage[key] || null; } catch { return null; }
        },
        setItem: (key: string, value: string) => {
          try { storage[key] = value; } catch {}
        },
        removeItem: (key: string) => {
          try { delete storage[key]; } catch {}
        },
        clear: () => {
          try { Object.keys(storage).forEach(key => delete storage[key]); } catch {}
        },
        length: 0,
        key: (index: number) => {
          try { 
            const keys = Object.keys(storage);
            return keys[index] || null;
          } catch { return null; }
        }
      };
    }
    
    // CRITICAL: Set up navigator.mediaDevices FIRST, before any other setup
    // console.log('🧪 INIT: Setting up navigator.mediaDevices (early)');
    
    // Ensure navigator exists
    if (!window.navigator) {
      (window as any).navigator = {};
    }
    
    // Simple MediaStream mock
    class MockMediaStream {
      id = 'mock-stream-' + Math.random().toString(36).substr(2, 9);
      active = true;
      
      getTracks() {
        return [{
          stop: () => {}, // console.log('🧪 Mock track stopped'),
          kind: 'audio',
          label: 'Mock Microphone', 
          enabled: true,
          id: 'mock-track-1'
        }];
      }
      
      getAudioTracks() { return this.getTracks(); }
      getVideoTracks() { return []; }
      addTrack() {}
      removeTrack() {}
      clone() { return new MockMediaStream(); }
    }
    
    // Set up navigator.mediaDevices with all required methods immediately
    window.navigator.mediaDevices = {
      getUserMedia: (constraints: any) => {
        // console.log('🧪 getUserMedia called:', constraints);
        return Promise.resolve(new MockMediaStream() as any);
      },
      
      enumerateDevices: () => {
        // console.log('🧪 enumerateDevices called');
        return Promise.resolve([{
          deviceId: 'default',
          kind: 'audioinput' as MediaDeviceKind,
          label: 'Default Microphone',
          groupId: 'mock-group'
        }] as MediaDeviceInfo[]);
      },
      
      addEventListener: (type: string, listener: any) => {
        // console.log('🧪 addEventListener called:', type);
      },
      
      removeEventListener: (type: string, listener: any) => {
        // console.log('🧪 removeEventListener called:', type);  
      },
      
      dispatchEvent: (event: Event) => true,
      getDisplayMedia: () => Promise.resolve(new MockMediaStream() as any),
      getSupportedConstraints: () => ({})
    } as MediaDevices;
    
    // console.log('🧪 INIT: navigator.mediaDevices setup complete');
    
    // Mock MediaRecorder class
    const OriginalMediaRecorder = window.MediaRecorder;
    let fallbackUsed = false;
    
    class TestMediaRecorder {
      state = 'inactive';
      ondataavailable: ((event: BlobEvent) => void) | null = null;
      onstop: (() => void) | null = null;
      onstart: (() => void) | null = null;
      onerror: ((event: Event) => void) | null = null;
      onpause: (() => void) | null = null;
      onresume: (() => void) | null = null;
      
      private chunks: Blob[] = [];
      private intervalId?: number;
      
      constructor(stream: MediaStream, options?: MediaRecorderOptions) {
        // console.log('🧪 TestMediaRecorder: Constructor called');
        if (!stream) {
          throw new Error('MediaRecorder constructor requires a MediaStream');
        }
        
        // Set up interval for timeslice if provided
        if (options && options.timeslice) {
          this.intervalId = window.setInterval(() => {
            if (this.state === 'recording' && this.ondataavailable) {
              const chunk = new Blob(['chunk'], { type: 'audio/wav' });
              this.ondataavailable({ data: chunk } as BlobEvent);
            }
          }, options.timeslice);
        }
      }
      
      start(timeslice?: number) {
        // console.log('🧪 TestMediaRecorder: start called with timeslice:', timeslice);
        this.state = 'recording';
        this.chunks = [];
        
        // Trigger onstart after a short delay
        setTimeout(() => {
          if (this.onstart) this.onstart();
        }, 10);
        
        // If timeslice provided, set up interval
        if (timeslice && !this.intervalId) {
          this.intervalId = window.setInterval(() => {
            if (this.state === 'recording' && this.ondataavailable) {
              const chunk = new Blob(['chunk'], { type: 'audio/wav' });
              this.ondataavailable({ data: chunk } as BlobEvent);
            }
          }, timeslice);
        }
      }
      
      stop() {
        // console.log('🧪 TestMediaRecorder: stop called');
        this.state = 'inactive';
        
        if (this.intervalId) {
          clearInterval(this.intervalId);
          this.intervalId = undefined;
        }
        
        // Generate final data
        setTimeout(() => {
          if (this.ondataavailable) {
            const finalBlob = new Blob(['final audio data'], { type: 'audio/wav' });
            this.ondataavailable({ data: finalBlob } as BlobEvent);
          }
          if (this.onstop) this.onstop();
        }, 10);
      }
      
      pause() {
        // console.log('🧪 TestMediaRecorder: pause called');
        this.state = 'paused';
        if (this.onpause) this.onpause();
      }
      
      resume() {
        // console.log('🧪 TestMediaRecorder: resume called');
        this.state = 'recording';
        if (this.onresume) this.onresume();
      }
      
      requestData() {
        // console.log('🧪 TestMediaRecorder: requestData called');
        if (this.ondataavailable) {
          const chunk = new Blob(['requested data'], { type: 'audio/wav' });
          this.ondataavailable({ data: chunk } as BlobEvent);
        }
      }
      
      static isTypeSupported(type: string) {
        // console.log('🧪 TestMediaRecorder: isTypeSupported called:', type);
        return true; // Always return true for testing
      }
    }
    
    window.MediaRecorder = TestMediaRecorder as any;
    
    // Mock AudioContext
    class MockAudioContext {
      state = 'running';
      sampleRate = 44100;
      currentTime = 0;
      destination = {};
      listener = {};
      
      createAnalyser() { return {}; }
      createGain() { return { gain: { value: 1 } }; }
      createOscillator() { return { frequency: { value: 440 } }; }
      createBufferSource() { return {}; }
      createMediaStreamSource() { return {}; }
      createScriptProcessor() { return {}; }
      createBuffer() { return {}; }
      decodeAudioData() { return Promise.resolve({}); }
      suspend() { return Promise.resolve(); }
      resume() { return Promise.resolve(); }
      close() { return Promise.resolve(); }
    }
    
    if (!window.AudioContext && !window.webkitAudioContext) {
      window.AudioContext = MockAudioContext as any;
      (window as any).webkitAudioContext = MockAudioContext;
    }
    
    // Mock fetch with logging
    const originalFetch = window.fetch;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : input.url;
      // console.log('🧪 Fetch intercepted:', { url, method: init?.method || 'GET' });
      
      if (originalFetch) {
        return originalFetch(input, init);
      }
      
      // Fallback mock response
      return Promise.resolve(new Response('{}', {
        status: 200,
        statusText: 'OK',
        headers: new Headers({ 'Content-Type': 'application/json' })
      }));
    };
    
    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      // console.error('🧪 Unhandled promise rejection:', event.reason);
      window.testErrors.push(`Unhandled promise rejection: ${event.reason}`);
    });
    
    // Capture global errors
    window.addEventListener('error', (event) => {
      // console.error('🧪 Global error:', event.error);
      window.testErrors.push(`Global error: ${event.error?.message || event.message}`);
    });
    
    // Mock React error boundaries
    (window as any).ReactErrorBoundary = {
      capturedErrors: [],
      componentDidCatch: (error: Error, errorInfo: any) => {
        // console.error('🧪 React Error Boundary caught:', error);
        window.testErrors.push(`React Error: ${error.message}`);
        (window as any).ReactErrorBoundary.capturedErrors.push({ error, errorInfo });
      }
    };
  });
}

// Augment the global Window interface to include our test properties
declare global {
  interface Window {
    testErrors: string[];
    testWarnings: string[];
    testLogs: string[];
    ReactErrorBoundary: {
      capturedErrors: Array<{ error: Error; errorInfo: any }>;
      componentDidCatch: (error: Error, errorInfo: any) => void;
    };
  }
}