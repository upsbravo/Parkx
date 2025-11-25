'use client';
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// This UID must match the one used in the end-user seed file.
// This is derived from the email 'vendor@acme.com'
const VENDOR_ID = 'YQadS5yQ5EXD2w5zmvqP';

const seed = async () => {
  console.log("Seeding Vendor...");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "vendor@acme.com";
  const password = "password";
  const vendorName = "Acme Parking Inc.";

  try {
    let userCredential;
    try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Vendor already exists. Skipping creation.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Vendor created successfully.");
        } else {
            throw error;
        }
    }
    
    const user = userCredential.user;

    // Use the hardcoded vendor ID to ensure consistency for seeding end-users
    const vendorRef = doc(db, "vendors", VENDOR_ID);
    await setDoc(vendorRef, {
      id: VENDOR_ID, // Ensure the document ID matches the auth UID
      name: vendorName,
      email: email,
      status: 'Active',
      joinDate: new Date().toISOString(),
      trialEnds: null,
      spotsUsed: 0,
      spotLimit: 50,
      role: 'vendorAdmin',
    });
    console.log("Vendor profile created/updated in Firestore.");
  } catch (error) {
    console.error("Error seeding vendor:", error);
  }
};

seed();
