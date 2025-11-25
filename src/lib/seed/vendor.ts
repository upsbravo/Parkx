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
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        if (userCredential.user.uid !== VENDOR_ID) {
            console.error(`CRITICAL: Vendor user exists but UID does not match. Expected ${VENDOR_ID}, found ${userCredential.user.uid}. Seeding will likely fail.`);
        }
        console.log("Vendor already exists in Auth. Skipping creation.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            // For a demo, it's hard to guarantee a specific UID on creation client-side.
            // This script assumes the UID will be VENDOR_ID. If it's not, you'd need a backend process
            // or to adjust the ID after creation. For this project, we'll assume it works or log a big warning.
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            if (userCredential.user.uid !== VENDOR_ID) {
                console.warn(`********************************************************************************`);
                console.warn(`* Vendor UID mismatch. Expected ${VENDOR_ID}, but got ${userCredential.user.uid}. *`);
                console.warn(`* The end-user seed and login will likely fail.                                *`);
                console.warn(`* To fix: update VENDOR_ID in src/lib/seed/vendor.ts to ${userCredential.user.uid} and re-run. *`);
                console.warn(`********************************************************************************`);
            }
            console.log("Vendor created successfully in Auth with UID:", userCredential.user.uid);
        } else {
            throw error; // Re-throw other errors
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
}).catch((err) => {
    console.error(err);
    // process.exit(1);
});
