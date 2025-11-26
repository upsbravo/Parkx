"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Camera, Scan, Sparkles, Video, VideoOff } from "lucide-react";
import { extractTextFromImage } from "@/ai/flows/extract-text-from-image";

interface TextScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTextScanned: (text: string) => void;
  scanContext?: string;
}

export function TextScanner({
  open,
  onOpenChange,
  onTextScanned,
  scanContext,
}: TextScannerProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const getCameraPermission = useCallback(async () => {
    if (stream) return; // Already have a stream

    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
      setStream(cameraStream);
      setHasCameraPermission(true);
    } catch (error) {
      console.error("Error accessing camera:", error);
      setHasCameraPermission(false);
      toast({
        variant: "destructive",
        title: "Camera Access Denied",
        description: "Please enable camera permissions in your browser settings.",
      });
    }
  }, [stream, toast]);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  }, [stream]);

  useEffect(() => {
    if (open) {
      getCameraPermission();
    } else {
      stopCamera();
    }
    // Cleanup on component unmount
    return () => stopCamera();
  }, [open, getCameraPermission, stopCamera]);
  
  useEffect(() => {
      if(stream && videoRef.current) {
          videoRef.current.srcObject = stream;
      }
  }, [stream])

  const handleCaptureAndScan = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsScanning(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) return;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoDataUri = canvas.toDataURL("image/jpeg");

    try {
      const result = await extractTextFromImage({ 
          photoDataUri, 
          context: scanContext 
      });
      if (result && result.extractedText) {
        onTextScanned(result.extractedText);
      } else {
        toast({
          variant: "destructive",
          title: "Scan Failed",
          description: "Could not extract text from the image. Please try again.",
        });
      }
    } catch (error) {
      console.error("AI Scan failed:", error);
      toast({
        variant: "destructive",
        title: "Scan Failed",
        description: "An error occurred while scanning the image.",
      });
    } finally {
      setIsScanning(false);
    }
  };
  
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      stopCamera();
    }
    onOpenChange(isOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Scan {scanContext || "Text"}</DialogTitle>
          <DialogDescription>
            Point your camera at the {scanContext || "text"} you want to scan. Ensure it is well-lit and clear.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-muted">
            <video ref={videoRef} className="h-full w-full object-cover" autoPlay playsInline muted />
            <canvas ref={canvasRef} className="hidden" />
            
            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                    <VideoOff className="h-12 w-12 mb-4" />
                    <h3 className="text-lg font-semibold">Camera Access Required</h3>
                    <p className="text-center text-sm">Please allow camera access in your browser to use this feature.</p>
                </div>
            )}
             {hasCameraPermission === null && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                    <Video className="h-12 w-12 mb-4 animate-pulse" />
                    <h3 className="text-lg font-semibold">Requesting Camera...</h3>
                </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleCaptureAndScan}
            disabled={!hasCameraPermission || isScanning}
          >
            {isScanning ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Scan className="mr-2 h-4 w-4" />
                Capture & Scan Text
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
