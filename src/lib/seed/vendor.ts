import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

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
        if (error.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Vendor created successfully.");
        } else {
            throw error;
        }
    }
    
    const user = userCredential.user;

    const vendorRef = doc(db, "vendors", user.uid);
    await setDoc(vendorRef, {
      id: user.uid,
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
