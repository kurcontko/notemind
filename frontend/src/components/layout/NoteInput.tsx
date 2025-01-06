import React, { useCallback, useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Paperclip, Plus, Sparkles, Loader2, XCircle, File, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface NoteInputProps {
  onSubmit: (content: string, files?: File[]) => Promise<void>;
  onSuccess?: () => void;
  isExpanded?: boolean;
}

export const NoteInput = ({ onSubmit, onSuccess, isExpanded = false }: NoteInputProps) => {
  const [content, setContent] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sparklesEnabled, setSparklesEnabled] = useState(true);
  const [progress, setProgress] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressTimerRef = useRef<number>();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameIdRef = useRef<number>();
  const streamRef = useRef<MediaStream | null>(null); // Ref for the stream

  // Constants for the waveform display
  // The maximum samples we want to display at once
  const SAMPLE_RATE_GUESS = 44100;   // Typical for mic streams
  const WINDOW_SECONDS = 5;         // How many seconds to show
  const MAX_SAMPLES = SAMPLE_RATE_GUESS * WINDOW_SECONDS; 
  const downsampleFactor = 16;
  const rollingBufferRef = useRef<Uint8Array>(new Uint8Array(0));
  

  // Progress bar animation
  useEffect(() => {
    if (isSubmitting) {
      setProgress(0);
      progressTimerRef.current = window.setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            if (progressTimerRef.current) {
              window.clearInterval(progressTimerRef.current);
            }
            return 90;
          }
          return prev + 5;
        });
      }, 50);
    } else {
      setProgress(0);
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    }

    return () => {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current);
      }
    };
  }, [isSubmitting]);

  const adjustTextareaHeight = useCallback(() => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    textarea.style.height = 'auto';
    const scrollHeight = Math.min(textarea.scrollHeight, 300);
    textarea.style.height = `${scrollHeight}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [content, adjustTextareaHeight]);

  /**
   * Drag & drop handlers
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...droppedFiles]);

    // Check if the dropped item is a URL
    const url =
      e.dataTransfer.getData('text/uri-list') ||
      e.dataTransfer.getData('text/plain');
    if (url && url.startsWith('http')) {
      setContent((prev) => (prev ? `${prev}\n${url}` : url));
    }
  }, []);

  /**
   * File upload handler
   */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const selectedFiles = Array.from(e.target.files);
        setFiles((prev) => [...prev, ...selectedFiles]);
      }
    },
    []
  );

  /**
   * Submit handler
   */
  const handleSubmit = async () => {
    if (!content.trim() && files.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(content, files);
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Add minimum loading time
      setContent('');
      setFiles([]);
      onSuccess?.();
      toast({
        title: 'Success',
        description: 'Your note has been saved successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error creating note:', error);
      toast({
        title: 'Error',
        description: 'Failed to save your note. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSparklesClick = useCallback(() => {
    setSparklesEnabled((prev) => !prev);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  /**
   * -----------
   * AUDIO LOGIC
   * -----------
   */
  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    analyser.fftSize = 2048;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    // Get current audio data
    analyser.getByteTimeDomainData(dataArray);

    // Append to rolling buffer
    let newBuffer = new Uint8Array(rollingBufferRef.current.length + bufferLength);
    newBuffer.set(rollingBufferRef.current, 0);
    newBuffer.set(dataArray, rollingBufferRef.current.length);

    // Keep only the last MAX_SAMPLES
    if (newBuffer.length > MAX_SAMPLES) {
      newBuffer = newBuffer.slice(newBuffer.length - MAX_SAMPLES);
    }
    rollingBufferRef.current = newBuffer;

    // Setup canvas
    canvas.width = window.innerWidth * 0.8;
    canvas.height = 300;
    ctx.fillStyle = 'rgb(243, 244, 246)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw line
    ctx.lineWidth = 2;
    ctx.strokeStyle = isRecording
      ? 'rgb(239, 68, 68)' // Red
      : 'rgb(156, 163, 175)';
    ctx.beginPath();

    // Downsample the rolling buffer for smoother drawing
    const rollingLength = rollingBufferRef.current.length;
    const downsampledData = [];

    for (let i = 0; i < rollingLength; i += downsampleFactor) {
      let sum = 0;
      let count = 0;
      for (let j = 0; j < downsampleFactor; j++) {
        if (i + j < rollingLength) {
          sum += rollingBufferRef.current[i + j];
          count++;
        }
      }
      downsampledData.push(sum / count);
    }

    // Plot wave
    const sliceWidth = canvas.width / downsampledData.length;
    let x = 0;

    for (let i = 0; i < downsampledData.length; i++) {
      const v = downsampledData[i] / 128.0; // scale from 0-255 to around -1..1
      const y = v * (canvas.height / 2);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationFrameIdRef.current = requestAnimationFrame(drawWaveform);
  }, [isRecording, downsampleFactor]);

  /**
   * Start mic recording
   */
  const startRecording = async () => {
    try {
      rollingBufferRef.current = new Uint8Array(0); // reset the rolling buffer

      // Request mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Setup audio context + analyser
      const audioCtx = new AudioContext();
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Choose a browser-supported audio MIME type
      const options = { mimeType: 'audio/webm; codecs=opus' };
      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;

      // Called every time recorder has data
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          // Use the actual event.data.type rather than forcing wav
          const audioBlob = new Blob([event.data], { type: event.data.type });

          // Give it a .webm extension to match the mimeType 
          const now = new Date();
          const datetime = now.toISOString().replace(/[:.]/g, '-');
          const filename = `recording-${datetime}.webm`; 

          // Convert Blob to File
          const audioFile = Object.assign(audioBlob, {
            name: filename,
            lastModified: Date.now(),
          });

          // Add file to state
          setFiles((prev) => [...prev, audioFile as File]);
        }
      };

      // Start recording + drawing waveform
      recorder.start();
      setIsRecording(true);
      drawWaveform();
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Error',
        description:
          'Failed to start recording. Please check your microphone permissions.',
        variant: 'destructive',
      });
      setIsRecording(false);
    }
  };

  /**
   * Stop mic recording
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (animationFrameIdRef.current) {
      cancelAnimationFrame(animationFrameIdRef.current);
    }
    setIsRecording(false);

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Disconnect and cleanup
    if (analyserRef.current) {
      analyserRef.current.disconnect();
      analyserRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  /**
   * Mic button click
   */
  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      void startRecording();
    }
  };

  /**
   * If recording, draw waveform on each animation frame
   */
  useEffect(() => {
    if (isRecording && analyserRef.current && canvasRef.current) {
      drawWaveform();
    }
    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [isRecording, drawWaveform]);

  return (
    <div
      className={cn(
        'w-full border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 relative overflow-hidden transition-all duration-300',
        isExpanded ? 'rounded-t-xl rounded-b-none' : 'rounded-xl'
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isSubmitting && (
        <Progress
          value={progress}
          className="absolute top-0 left-0 right-0 h-1 rounded-none z-10"
        />
      )}

      {/* Waveform Canvas */}
      {isRecording && (
        <div className="absolute top-0 left-0 right-0 h-24">
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            width={500}
            height={100}
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 border-b border-gray-200 dark:border-gray-800">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs dark:bg-gray-700/50"
            >
              <File className="h-3 w-3 text-gray-500 dark:text-gray-400" />
              <span className="truncate max-w-[150px]" title={file.name}>
                {file.name}
              </span>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-full p-0.5"
              >
                <XCircle className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write a note, drag files, or paste links..."
        className={cn(
          'resize-none border-0 bg-transparent focus-visible:ring-0 w-full shadow-none',
          'min-h-[24px] transition-all duration-200 overflow-hidden px-4 pt-4',
          'focus:shadow-none placeholder:text-gray-400 dark:placeholder:text-gray-500',
          '!focus:outline-none !focus:ring-0 !focus:shadow-none',
          isRecording ? 'mt-24' : '' // Keep the margin-top for recording
        )}
        style={{ height: '24px' }}
      />

      <div className="mt-3 flex items-center justify-between w-full px-3 pb-3">
        <div className="flex items-center space-x-2">
          {/* Attach File Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  disabled={isSubmitting || isRecording}
                >
                  <label>
                    <input
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isSubmitting || isRecording}
                    />
                    <Paperclip className="h-5 w-5" />
                  </label>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Attach files</p>
              </TooltipContent>
            </Tooltip>

            {/* Sparkles Button with Tooltip */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleSparklesClick}
                  disabled={isSubmitting || isRecording}
                  className={cn(
                    'transition-colors',
                    sparklesEnabled
                      ? 'text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300'
                      : 'text-gray-400 hover:text-gray-500 dark:text-gray-600 dark:hover:text-gray-500'
                  )}
                >
                  <Sparkles className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{sparklesEnabled ? 'Disable AI' : 'Enable AI'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Microphone and Submit Button */}
        <div className="flex items-center space-x-2">
          {/* Microphone Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={handleMicClick}
                  disabled={isSubmitting}
                  className={cn(
                    'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    'transition-colors',
                    isRecording &&
                      'text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300'
                  )}
                  variant="ghost"
                  size="icon"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isRecording ? 'Stop Recording' : 'Start Recording'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Submit Button with Tooltip */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={
                    isSubmitting ||
                    (!content.trim() && files.length === 0)
                  }
                  className={cn(
                    'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200',
                    'transition-all duration-200',
                    isSubmitting && 'opacity-50 cursor-not-allowed'
                  )}
                  variant="ghost"
                  size="icon"
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save Note</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {isDragging && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <div className="rounded-lg bg-white/75 dark:bg-gray-800/75 p-4 text-center">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Drop here
            </p>
          </div>
        </div>
      )}
    </div>
  );
};