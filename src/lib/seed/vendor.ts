import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// This is the hardcoded UID for the seeded vendor 'vendor@acme.com'
// This will be the result of the Firebase Auth creation, but we define it
// here so other seed scripts can use it reliably.
export const VENDOR_ID = 'YQadS5yQ5EXD2w5zmvqP';

const seed = async () => {
  console.log("Seeding Vendor...");
  const app = initializeApp(firebaseConfig, 'vendorSeed');
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "vendor@acme.com";
  const password = "password";
  const vendorName = "Acme Parking Inc.";

  try {
    let userCredential;
    try {
        // We will attempt to create the user with a specific UID.
        // This requires an admin SDK, but for client-side seeding, we'll
        // just create it and hope the UID is what we expect.
        // A better approach for production is a backend seeding process.
        // For this demo, we will create the user and update the VENDOR_ID constant if it's different.
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        if (userCredential.user.uid !== VENDOR_ID) {
            console.warn(`Vendor UID mismatch. Expected ${VENDOR_ID}, but got ${userCredential.user.uid}. The end-user seed may fail. Please update VENDOR_ID in seed files.`);
        }
        console.log("Vendor created successfully in Auth with UID:", userCredential.user.uid);
    } catch (error: any) {
        if (error.code === 'auth/email-already-in-use') {
             userCredential = await signInWithEmailAndPassword(auth, email, password);
             if (userCredential.user.uid !== VENDOR_ID) {
                console.error(`CRITICAL: Vendor user exists but UID does not match. Expected ${VENDOR_ID}, found ${userCredential.user.uid}. Seeding will likely fail.`);
             }
             console.log("Vendor already exists in Auth. Skipping creation.");
        } else {
            throw error;
        }
    }
    
    const user = userCredential.user;

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
    });
    console.log("Vendor profile created/updated in Firestore.");
  } catch (error) {
    console.error("Error seeding vendor:", error);
  }
};

seed().then(() => {
    // process.exit(0);
}).catch(() => {
    // process.exit(1);
});
