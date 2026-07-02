'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function NavigationProgress() {
    const pathname = usePathname();
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        // Cada vez que cambia el pathname, la navegación completó.
        // Si la barra no estaba visible (navegación por Link), mostrarla brevemente.
        if (intervalRef.current) clearInterval(intervalRef.current);
        setVisible(true);
        setProgress(100);
        timerRef.current = setTimeout(() => {
            setVisible(false);
            setProgress(0);
        }, 300);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [pathname]);

    // Exponer función global para iniciar la barra desde router.push()
    useEffect(() => {
        (window as any).__startProgress = () => {
            if (timerRef.current) clearTimeout(timerRef.current);
            if (intervalRef.current) clearInterval(intervalRef.current);
            setProgress(0);
            setVisible(true);

            // Avanza rápido al principio, luego se frena simulando carga
            let current = 0;
            intervalRef.current = setInterval(() => {
                current += current < 30 ? 10 : current < 60 ? 5 : current < 80 ? 2 : 0.5;
                if (current >= 90) {
                    clearInterval(intervalRef.current!);
                    current = 90;
                }
                setProgress(current);
            }, 100);
        };

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            delete (window as any).__startProgress;
        };
    }, []);

    if (!visible) return null;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-transparent pointer-events-none">
            <div
                className="h-full bg-blue-500 transition-all duration-200 ease-out shadow-[0_0_8px_rgba(59,130,246,0.8)]"
                style={{ width: `${progress}%` }}
            />
        </div>
    );
}
