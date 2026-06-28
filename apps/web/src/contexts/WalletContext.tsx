'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface WalletContextType {
    mnemonic: string | null;
    isUnlocked: boolean;
    unlockWallet: (mnemonic: string) => void;
    lockWallet: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Variable a nivel de módulo que sobrevive si Next.js desmonta el provider por cambios de layout
let memoryMnemonic: string | null = null;

export function WalletProvider({ children }: { children: ReactNode }) {
    // Inicializar el estado con la variable de módulo
    const [mnemonic, setMnemonicState] = useState<string | null>(memoryMnemonic);

    const unlockWallet = (newMnemonic: string) => {
        memoryMnemonic = newMnemonic;
        setMnemonicState(newMnemonic);
    };

    const lockWallet = () => {
        memoryMnemonic = null;
        setMnemonicState(null);
    };

    return (
        <WalletContext.Provider
            value={{
                mnemonic,
                isUnlocked: !!mnemonic,
                unlockWallet,
                lockWallet,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}

export function useWallet() {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
}
