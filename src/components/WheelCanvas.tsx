import React, { useRef, useEffect, useCallback, useState } from 'react';
import { WheelSettings, WheelEntry, WheelBackgroundImage, WheelCenterImage } from '../types';

interface WheelCanvasProps {
  entries: WheelEntry[];
  settings: WheelSettings;
  onSpinStart: () => void;
  onSpinEnd: (winnerName: string) => void;
  onPlayTickSound: () => void;
  isSpinningTrigger: boolean;
  backgroundImageUrl: WheelBackgroundImage;
  centerImageUrl: WheelCenterImage;
}

const WheelCanvas: React.FC<WheelCanvasProps> = ({
  entries,
  settings,
  onSpinStart,
  onSpinEnd,
  onPlayTickSound,
  isSpinningTrigger,
  backgroundImageUrl,
  centerImageUrl,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const currentAngleRef = useRef<number>(0);
  const initialSpinSpeedRef = useRef<number>(0); 
  const angularVelocityRef = useRef<number>(0); 
  const animationFrameIdRef = useRef<number | null>(null);
  const isActuallySpinningRef = useRef<boolean>(false);
  const spinStartTimeRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const animationFrameResizeIdRef = useRef<number | null>(null);
  const lastTickTimeRef = useRef<number>(0);

  const [loadedBackgroundImage, setLoadedBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [loadedCenterImage, setLoadedCenterImage] = useState<HTMLImageElement | null>(null);
  const [loadedEntryImages, setLoadedEntryImages] = useState<Record<string, HTMLImageElement>>({});
  
  const [isAnimatingLoader, setIsAnimatingLoader] = useState<boolean>(false);
  const loaderAnimationFrameRef = useRef<number | null>(null);
  const loaderDotAnimationRef = useRef({ phase: 0 });


  useEffect(() => {
    if (backgroundImageUrl) {
      const img = new Image();
      img.onload = () => setLoadedBackgroundImage(img);
      img.onerror = () => { console.error("Failed to load background image"); setLoadedBackgroundImage(null); };
      img.src = backgroundImageUrl;
    } else {
      setLoadedBackgroundImage(null);
    }
  }, [backgroundImageUrl]);

  useEffect(() => {
    if (centerImageUrl) {
      const img = new Image();
      img.onload = () => setLoadedCenterImage(img);
      img.onerror = () => { console.error("Failed to load center image"); setLoadedCenterImage(null); };
      img.src = centerImageUrl;
    } else {
      setLoadedCenterImage(null);
    }
  }, [centerImageUrl]);

  useEffect(() => {
    const newLoadedImages: Record<string, HTMLImageElement> = { ...loadedEntryImages };
    let changed = false;
    entries.forEach(entry => {
      if (entry.type === 'image' && entry.dataUrl && !newLoadedImages[entry.id] && !(entry.id in newLoadedImages)) { // check if not already loaded or loading
        const img = new Image();
        img.onload = () => {
          setLoadedEntryImages(prev => ({ ...prev, [entry.id]: img }));
        };
        img.onerror = () => {
            console.error(`Failed to load entry image: ${entry.originalName}`);
            // Potentially mark as failed to avoid retrying, or rely on placeholder
        };
        img.src = entry.dataUrl;
        newLoadedImages[entry.id] = img; // Tentatively add to prevent re-triggering, actual update on load
        changed = true; 
      }
    });
    // This effect primarily initiates loading. Actual update to state is in onload.
  }, [entries]);


  const drawAnimatedLoader = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const dotSize = size * 0.15;
    const offset = size * 0.3;
    const phase = loaderDotAnimationRef.current.phase;

    for (let i = 0; i < 3; i++) {
        const angle = (i * 2 * Math.PI / 3) + phase;
        const dotX = x + Math.cos(angle) * offset;
        const dotY = y + Math.sin(angle) * offset;
        const currentDotSize = dotSize * (0.6 + Math.sin(angle + phase * 2) * 0.4); 

        ctx.beginPath();
        ctx.arc(dotX, dotY, Math.max(1, currentDotSize), 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fill();
    }
  };


  const drawWheel = useCallback((currentAngle: number, entriesToRender: WheelEntry[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const centerX = width / 2;
    const centerY = height / 2;
    const baseRadius = Math.min(centerX, centerY) * 0.92; 
    
    ctx.clearRect(0, 0, width, height);

    // 1. Background Image (Full Canvas)
    if (loadedBackgroundImage) {
      ctx.drawImage(loadedBackgroundImage, 0, 0, width, height);
    }
    
    // Rotate canvas for wheel elements
    ctx.save(); 
    ctx.translate(centerX, centerY);
    ctx.rotate(currentAngle); 
    // No untranslate here, everything below is in rotated context
    
    // 2. Draw Segments
    if (entriesToRender.length > 0) {
      const numSegments = entriesToRender.length;
      const anglePerSegment = (2 * Math.PI) / numSegments;

      for (let i = 0; i < numSegments; i++) {
        const entry = entriesToRender[i];
        const startAngle = i * anglePerSegment;
        const endAngle = (i + 1) * anglePerSegment;

        ctx.beginPath();
        ctx.moveTo(0, 0); // Center of rotated context
        ctx.arc(0, 0, baseRadius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = settings.segmentColors[i % settings.segmentColors.length];
        ctx.fill();

        ctx.lineWidth = 1; 
        ctx.strokeStyle = '#FFFFFF';
        ctx.stroke();
        
        ctx.save();
        ctx.rotate(startAngle + anglePerSegment / 2); // Rotate for text/image on segment
        ctx.textAlign = 'right'; 
        ctx.textBaseline = 'middle';
        const fontSize = Math.max(10, Math.min(16, baseRadius / 15 * (Math.min(10, 20 / numSegments ))));
        ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
        const maxContentWidth = baseRadius * 0.6;
        const contentAnchorX = baseRadius * 0.85;

        if (entry.type === 'text') {
            ctx.fillStyle = settings.textColor;
            let displayText = entry.name || '';
            if (ctx.measureText(displayText).width > maxContentWidth) {
                while (ctx.measureText(displayText + '...').width > maxContentWidth && displayText.length > 0) {
                    displayText = displayText.slice(0, -1);
                }
                displayText += '...';
            }
            ctx.fillText(displayText, contentAnchorX, 0); 
        } else if (entry.type === 'image') {
            const img = loadedEntryImages[entry.id];
            if (img && img.complete && img.naturalWidth > 0) {
                const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                let h = baseRadius * 0.25; // Max height for image on segment
                let w = h * imgAspectRatio;
                if (w > maxContentWidth) {
                    w = maxContentWidth;
                    h = w / imgAspectRatio;
                }
                const imageX = contentAnchorX - w; // Position image more to the center of its space
                const imageY = -h/2;
                ctx.drawImage(img, imageX, imageY, w, h);
            } else {
                // Placeholder or loader
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.font = `italic ${fontSize * 0.8}px Helvetica, Arial, sans-serif`;
                let placeholderText = entry.originalName;
                if(ctx.measureText(placeholderText).width > maxContentWidth * 0.8) placeholderText = "Loading..."
                
                if (isAnimatingLoader || (isActuallySpinningRef.current && !img)) { // Show loader if generally animating or if specifically this image is not loaded during spin
                   drawAnimatedLoader(ctx, contentAnchorX - maxContentWidth / 2, 0, maxContentWidth * 0.3);
                } else {
                   ctx.fillText(placeholderText, contentAnchorX - maxContentWidth * 0.1, 0);
                }
            }
        }
        ctx.restore(); 
      }
    }
    
    // 3. Center Circle, Center Image, or "Click to Spin" text (all rotate with wheel)
    const centerAreaRadius = baseRadius * 0.25;
    ctx.beginPath();
    ctx.arc(0, 0, centerAreaRadius, 0, 2 * Math.PI);
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.strokeStyle = '#CCCCCC'; 
    ctx.lineWidth = 2; 
    ctx.stroke();

    if (loadedCenterImage) {
        const img = loadedCenterImage;
        const maxCenterImgSize = centerAreaRadius * 1.8; // Allow image to be slightly larger than white circle
        let w = img.width;
        let h = img.height;
        if (w > maxCenterImgSize || h > maxCenterImgSize) {
            if (w/h > 1) { // Landscape
                h = maxCenterImgSize * (h/w);
                w = maxCenterImgSize;
            } else { // Portrait or square
                w = maxCenterImgSize * (w/h);
                h = maxCenterImgSize;
            }
        }
        // Apply circular clip for center image
        ctx.save();
        ctx.beginPath();
        ctx.arc(0,0, centerAreaRadius * 0.95, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, -w/2, -h/2, w, h);
        ctx.restore();

    } else if (entriesToRender.length > 0 && !isActuallySpinningRef.current) {
        ctx.fillStyle = '#333333';
        const fontSize = Math.max(10, baseRadius * 0.05); 
        ctx.font = `bold ${fontSize}px Helvetica, Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText("Click to spin", 0, 0);
    }
    ctx.restore(); // Restore from main canvas rotation

    // 4. Pointer (static, right side / 3 o'clock - drawn in un-rotated context)
    const pointerSize = Math.min(width, height) * 0.05;
    const pointerX = centerX + baseRadius + pointerSize * 0.1; 
    
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(pointerX, centerY - pointerSize / 2); 
    ctx.lineTo(pointerX, centerY + pointerSize / 2); 
    ctx.lineTo(pointerX - pointerSize * 1.1, centerY); 
    ctx.closePath();
    ctx.fillStyle = '#FFD700'; 
    ctx.fill();
    ctx.strokeStyle = '#4A4A4A'; 
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

  }, [settings, loadedBackgroundImage, loadedCenterImage, loadedEntryImages, isAnimatingLoader]); 

  const spinAnimation = useCallback(() => {
    if (!isActuallySpinningRef.current) { 
        if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
        return;
    }

    const elapsedTime = (Date.now() - spinStartTimeRef.current) / 1000;
    const duration = settings.spinDurationSeconds;
    const currentTime = Date.now();

    if (elapsedTime < duration) {
        const t = Math.min(elapsedTime / duration, 1.0); 
        const currentSpeed = initialSpinSpeedRef.current * Math.pow(1 - t, 2); 
        
        currentAngleRef.current += currentSpeed;
        angularVelocityRef.current = currentSpeed; 

        const maxSpeedForSoundRange = 0.35; 
        const minSpeedForSoundRange = 0.01; 
        let normalizedSpeed = (angularVelocityRef.current - minSpeedForSoundRange) / (maxSpeedForSoundRange - minSpeedForSoundRange);
        normalizedSpeed = Math.max(0, Math.min(1, normalizedSpeed)); 
        
        const baseTickInterval = 350; 
        const minTickInterval = 60;  
        let tickInterval = baseTickInterval - (baseTickInterval - minTickInterval) * normalizedSpeed;
        tickInterval = Math.max(minTickInterval, tickInterval);

        if (currentTime - lastTickTimeRef.current > tickInterval && angularVelocityRef.current > 0.005) { 
          onPlayTickSound();
          lastTickTimeRef.current = currentTime;
        }

        drawWheel(currentAngleRef.current, entries);
        animationFrameIdRef.current = requestAnimationFrame(spinAnimation);
    } else { 
      isActuallySpinningRef.current = false;
      angularVelocityRef.current = 0;
      
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = null;
      if (loaderAnimationFrameRef.current) cancelAnimationFrame(loaderAnimationFrameRef.current);
      loaderAnimationFrameRef.current = null;
      setIsAnimatingLoader(false);
      
      const finalAngle = currentAngleRef.current; // Use the angle from the natural spin end
      const normalizedAngle = (-(finalAngle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); 

      let winnerValue = "Error";
      if (entries.length > 0) {
        const anglePerSegment = (2 * Math.PI) / entries.length;
        const winningSegmentIndex = Math.floor(normalizedAngle / anglePerSegment);
        
        const winnerEntry = entries[winningSegmentIndex];
        if (winnerEntry) {
          winnerValue = winnerEntry.type === 'image' ? winnerEntry.originalName : winnerEntry.name;
        } else {
            console.error("Calculated winning index out of bounds:", winningSegmentIndex, "Entries:", entries.length);
            winnerValue = "Error: Index issue";
        }
      } else {
        winnerValue = "No entries!";
      }
      
      drawWheel(finalAngle, entries); 
      
      setTimeout(() => { 
        onSpinEnd(winnerValue);
      }, 50); 
    }
  }, [onSpinEnd, drawWheel, settings.spinDurationSeconds, onPlayTickSound, entries]);

  // Loader animation loop
  const animateLoaderLoop = useCallback(() => {
    loaderDotAnimationRef.current.phase += 0.1;
    drawWheel(currentAngleRef.current, entries); // Redraw with updated loader phase
    loaderAnimationFrameRef.current = requestAnimationFrame(animateLoaderLoop);
  }, [drawWheel, entries]);

  useEffect(() => {
    const anyEntriesLoading = entries.some(entry => entry.type === 'image' && entry.dataUrl && !loadedEntryImages[entry.id]);
    if (anyEntriesLoading && !isActuallySpinningRef.current) {
        setIsAnimatingLoader(true);
    } else if (!anyEntriesLoading && isAnimatingLoader) {
        setIsAnimatingLoader(false);
    }
  }, [entries, loadedEntryImages, isActuallySpinningRef.current, isAnimatingLoader]);

  useEffect(() => {
    if (isAnimatingLoader && !isActuallySpinningRef.current) {
        if (!loaderAnimationFrameRef.current) {
            loaderAnimationFrameRef.current = requestAnimationFrame(animateLoaderLoop);
        }
    } else {
        if (loaderAnimationFrameRef.current) {
            cancelAnimationFrame(loaderAnimationFrameRef.current);
            loaderAnimationFrameRef.current = null;
        }
    }
    return () => { // Cleanup loader animation frame on unmount or if deps change
        if (loaderAnimationFrameRef.current) {
            cancelAnimationFrame(loaderAnimationFrameRef.current);
            loaderAnimationFrameRef.current = null;
        }
    };
  }, [isAnimatingLoader, animateLoaderLoop]);


  useEffect(() => {
    if (isSpinningTrigger && !isActuallySpinningRef.current && entries.length > 0) {
      onSpinStart();
      isActuallySpinningRef.current = true;
      spinStartTimeRef.current = Date.now();
      lastTickTimeRef.current = Date.now(); 
      if (loaderAnimationFrameRef.current) cancelAnimationFrame(loaderAnimationFrameRef.current); // Stop loader anim
      loaderAnimationFrameRef.current = null;
      setIsAnimatingLoader(false);

      initialSpinSpeedRef.current = 0.3 + Math.random() * 0.3; 
      angularVelocityRef.current = initialSpinSpeedRef.current;

      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      animationFrameIdRef.current = requestAnimationFrame(spinAnimation);
    } else if (isSpinningTrigger && entries.length === 0) {
        onSpinEnd("No entries to spin!"); 
    }
  }, [isSpinningTrigger, entries, settings.spinDurationSeconds, onSpinStart, onSpinEnd, spinAnimation]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;
    if (!container) return;

    const { clientWidth: initialCWidth, clientHeight: initialCHeight } = container;
    let initialSize = 300; // Default fallback
    if (initialCWidth > 0 && initialCHeight > 0) {
        initialSize = Math.min(initialCWidth, initialCHeight);
    } else {
        const vpWidth = window.innerWidth;
        const vpHeight = window.innerHeight;
        // Estimate based on parent's potential size or viewport
        initialSize = Math.min(vpWidth * 0.8, vpHeight * 0.7, 500); 
    }
    canvas.width = initialSize;
    canvas.height = initialSize;
    
    drawWheel(currentAngleRef.current, entries); 

    const observer = new ResizeObserver((observerEntries) => {
      if (animationFrameResizeIdRef.current) {
        cancelAnimationFrame(animationFrameResizeIdRef.current);
      }
      animationFrameResizeIdRef.current = requestAnimationFrame(() => {
        if (!canvasRef.current || !canvasRef.current.parentElement) return;
        const currentCanvas = canvasRef.current;
        const entry = observerEntries[0];
        if (!entry) return;

        const newWidth = entry.contentRect?.width || (entry.target as HTMLElement).clientWidth;
        const newHeight = entry.contentRect?.height || (entry.target as HTMLElement).clientHeight;
        
        if (newWidth > 0 && newHeight > 0) {
          const newCanvasSize = Math.min(newWidth, newHeight);
          let dimensionsActuallyChanged = false;
          if (currentCanvas.width !== newCanvasSize) {
            currentCanvas.width = newCanvasSize;
            dimensionsActuallyChanged = true;
          }
          if (currentCanvas.height !== newCanvasSize) {
            currentCanvas.height = newCanvasSize;
            dimensionsActuallyChanged = true;
          }
          // Only redraw if idle and dimensions changed
          if (dimensionsActuallyChanged && !isActuallySpinningRef.current) { 
            drawWheel(currentAngleRef.current, entries);
          }
        }
      });
    });

    observer.observe(container);
    resizeObserverRef.current = observer;

    return () => {
      if (resizeObserverRef.current) resizeObserverRef.current.disconnect(); 
      if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
      if (animationFrameResizeIdRef.current) cancelAnimationFrame(animationFrameResizeIdRef.current);
      if (loaderAnimationFrameRef.current) cancelAnimationFrame(loaderAnimationFrameRef.current);
    };
  }, [drawWheel, entries]);

  return (
    <div className="w-full h-full flex justify-center items-center aspect-square max-w-[calc(100vw-4rem)] max-h-[calc(100vh-12rem)] md:max-w-[600px] md:max-h-[600px] mx-auto relative">
      <canvas ref={canvasRef} className="rounded-full"></canvas>
    </div>
  );
};

export default WheelCanvas;
