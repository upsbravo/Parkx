import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

const seed = async () => {
  console.log("Seeding End User...");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "user@example.com";
  const password = "password";
  const firstName = "John";
  const lastName = "Doe";

  try {
    let userCredential;
    try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("End user already exists. Skipping creation.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("End user created successfully.");
        } else {
            throw error;
        }
    }
    
    const user = userCredential.user;

    // Note: In a real app, vendorId would be dynamic.
    // For seeding, we can hardcode a known vendor ID if one is seeded.
    // Let's assume we don't know the vendor ID for this simple seed.
    const userRef = doc(db, "users", user.uid);
    await setDoc(userRef, {
      id: user.uid,
      vendorId: "UNKNOWN", // This would need to be updated in a real scenario
      firstName: firstName,
      lastName: lastName,
      email: email,
      status: "Active",
      assignedSpotId: null,
    });
    console.log("End User profile created/updated in Firestore.");
  } catch (error) {
    console.error("Error seeding end user:", error);
  }
};

seed();
