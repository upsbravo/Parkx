'use client';

import React, { useState, useEffect, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { FirebaseApp } from 'firebase/app';
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { FirebaseStorage } from 'firebase/storage';
import { Skeleton } from '@/components/ui/skeleton'; // Using Skeleton for loading state

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

export function FirebaseClientProvider({ children }: { children: ReactNode }) {
  const [firebaseServices, setFirebaseServices] = useState<FirebaseServices | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This effect runs only once on the client after the component mounts.
    if (typeof window !== 'undefined') {
      const services = initializeFirebase();
      setFirebaseServices(services);
      setIsLoading(false);
    }
  }, []); // Empty dependency array ensures this runs only once.

  if (isLoading || !firebaseServices) {
    // While Firebase is initializing, we can show a global loading state
    // to prevent any child components from attempting to use Firebase prematurely.
    return (
        <div className="flex h-screen w-screen items-center justify-center">
            <div className="w-1/2 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
      storage={firebaseServices.storage}
    >
      {children}
    </FirebaseProvider>
  );
}
