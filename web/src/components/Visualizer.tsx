import { useEffect, useRef } from 'react';

interface VisualizerProps {
    analyser: AnalyserNode | null;
    isActive: boolean;
}

export const Visualizer = ({ analyser, isActive }: VisualizerProps) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    useEffect(() => {
        if (!canvasRef.current || !analyser) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Set canvas size to match display size for sharpness
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);

            if (!isActive) {
                ctx.clearRect(0, 0, rect.width, rect.height);
                // Draw a flat line or subtle pulse when inactive
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                ctx.moveTo(0, rect.height / 2);
                ctx.lineTo(rect.width, rect.height / 2);
                ctx.stroke();
                return;
            }

            analyser.getByteTimeDomainData(dataArray);

            ctx.fillStyle = 'rgba(10, 10, 10, 0.2)'; // Fade out effect
            ctx.fillRect(0, 0, rect.width, rect.height);

            ctx.lineWidth = 2;

            // Dynamic gradient
            const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
            gradient.addColorStop(0, '#646cff');
            gradient.addColorStop(0.5, '#ff3b30');
            gradient.addColorStop(1, '#646cff');

            ctx.strokeStyle = gradient;
            ctx.beginPath();

            const sliceWidth = rect.width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * rect.height) / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(rect.width, rect.height / 2);
            ctx.stroke();
        };

        draw();

        return () => {
            cancelAnimationFrame(animationFrameRef.current);
        };
    }, [analyser, isActive]);

    return (
        <canvas
            ref={canvasRef}
            className="visualizer-canvas"
            style={{ width: '100%', height: '100%' }}
        />
    );
};
