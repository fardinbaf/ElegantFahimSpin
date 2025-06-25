import React, { useRef, useEffect, useCallback } from 'react';

const CONFETTI_COLORS = ['#FFC300', '#FF5733', '#C70039', '#900C3F', '#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#8e44ad'];

interface ConfettiPiece {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  opacity: number;
  life: number; // Ticks to live
}

const ConfettiCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiPiecesRef = useRef<ConfettiPiece[]>([]);
  const animationFrameIdRef = useRef<number | null>(null);
  const animationStartTimeRef = useRef<number>(0);
  const ANIMATION_DURATION = 4000; // 4 seconds

  const createConfettiPiece = (canvasWidth: number): ConfettiPiece => {
    return {
      x: Math.random() * canvasWidth,
      y: -Math.random() * 50 - 10, // Start above the screen
      size: Math.random() * 8 + 4, // Rectangle size
      speedX: Math.random() * 4 - 2, // -2 to 2
      speedY: Math.random() * 2 + 1, // 1 to 3 (downwards)
      rotation: Math.random() * 360,
      rotationSpeed: Math.random() * 20 - 10, // -10 to 10 degrees per frame
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      opacity: 1,
      life: 200, // Roughly 3-4 seconds at 60fps
    };
  };

  const launchConfetti = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const numPieces = 150; 
    confettiPiecesRef.current = [];
    for (let i = 0; i < numPieces; i++) {
      confettiPiecesRef.current.push(createConfettiPiece(canvas.width));
    }
    animationStartTimeRef.current = Date.now();
  }, []);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const elapsedTime = Date.now() - animationStartTimeRef.current;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Transparent background

    let hasActivePieces = false;

    confettiPiecesRef.current.forEach((piece, index) => {
      piece.x += piece.speedX;
      piece.y += piece.speedY;
      piece.rotation += piece.rotationSpeed;
      piece.life -= 1;
      
      // Fade out towards the end of the global animation duration or if life ends
      const timeRatio = Math.min(1, elapsedTime / (ANIMATION_DURATION * 0.8)); // Start fading earlier
      piece.opacity = 1 - timeRatio;


      if (piece.y < canvas.height && piece.life > 0 && piece.opacity > 0.05) {
        hasActivePieces = true;
        ctx.save();
        ctx.translate(piece.x, piece.y);
        ctx.rotate(piece.rotation * Math.PI / 180);
        ctx.fillStyle = piece.color;
        ctx.globalAlpha = piece.opacity;
        // Simple rectangle confetti
        ctx.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
        ctx.restore();
      } else {
        // Optionally re-launch from top if animation is still young
        if (elapsedTime < ANIMATION_DURATION * 0.7 && Math.random() < 0.02) {
             confettiPiecesRef.current[index] = createConfettiPiece(canvas.width);
        } else {
            // Remove piece if it's off-screen or dead
        }
      }
    });
    
    // Filter out dead/invisible pieces less frequently to avoid array churn
    if (Math.random() < 0.1) {
        confettiPiecesRef.current = confettiPiecesRef.current.filter(p => p.y < canvas.height && p.life > 0 && p.opacity > 0.05);
    }


    if (hasActivePieces && elapsedTime < ANIMATION_DURATION) {
      animationFrameIdRef.current = requestAnimationFrame(animate);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height); // Final clear
      animationFrameIdRef.current = null;
      confettiPiecesRef.current = []; // Clear pieces
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      launchConfetti();
      if (!animationFrameIdRef.current) {
        animationFrameIdRef.current = requestAnimationFrame(animate);
      }
    }
    
    const handleResize = () => {
        if(canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            // Optionally relaunch or adapt confetti on resize
        }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
      confettiPiecesRef.current = [];
      window.removeEventListener('resize', handleResize);
    };
  }, [launchConfetti, animate]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }} aria-hidden="true" />;
};

export default ConfettiCanvas;
