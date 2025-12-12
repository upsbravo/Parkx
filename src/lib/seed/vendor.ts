
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// This is the hardcoded UID for the seeded vendor 'vickdispatch3@gmail.com'
// This ensures the seed script targets the correct account.
export const VENDOR_ID = 'wS4cuADv5fVJHc76R2bZFCe32uZ2';

const seed = async () => {
  console.log("Seeding Vendor...");
  const app = initializeApp(firebaseConfig, 'vendorSeed');
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "vickdispatch3@gmail.com";
  const password = "password";
  const vendorName = "Upender Sing";

  try {
    let userCredential;
    try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user.uid !== VENDOR_ID) {
            console.warn(`********************************************************************************`);
            console.warn(`* Vendor UID mismatch. Expected ${VENDOR_ID}, but got ${userCredential.user.uid}. *`);
            console.warn(`* The end-user seed and login will likely fail.                                *`);
            console.warn(`* To fix: update VENDOR_ID in src/lib/seed/vendor.ts to ${userCredential.user.uid} and re-run. *`);
            console.warn(`********************************************************************************`);
        } else {
             await updateProfile(userCredential.user, { displayName: vendorName });
        }
        console.log("Vendor created successfully in Auth with UID:", userCredential.user.uid);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
            console.log("Vendor already exists in Auth. Signing in to update Firestore...");
            // Sign in to get an authenticated session
            userCredential = await signInWithEmailAndPassword(auth, email, password);
        } else {
            throw error; // Re-throw other errors
        }
    }
    
    // Use the PRE-DETERMINED UID as the document ID for the vendor profile.
    const vendorRef = doc(db, "vendors", VENDOR_ID);
    await setDoc(vendorRef, {
      id: VENDOR_ID, 
      name: vendorName,
      email: email,
      status: 'Active',
      joinDate: new Date().toISOString(),
      trialEnds: null,
      spotsUsed: 0,
      spotLimit: 50,
      role: 'vendorAdmin',
      stripeCustomerId: 'cus_placeholder_12345',
      stripeAccountId: 'acct_1Saqr52XSETIyMBx',
      stripeSubscriptionId: null, // Set to null initially, to be populated by webhook
    }, { merge: true });
    console.log("Vendor profile created/updated in Firestore.");
  } catch (error) {
    console.error("Error seeding vendor:", error);
  }
};

seed().then(() => {
    // process.exit(0);
}).catch((err) => {
    console.error(err);
    // process.exit(1);
});
