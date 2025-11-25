import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

const seed = async () => {
  console.log("Seeding Super Admin...");
  // Use a unique name for this app instance to avoid conflicts
  const app = initializeApp(firebaseConfig, 'superAdminSeed'); 
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "super@parkx.com";
  const password = "password";
  const firstName = "Super";
  const lastName = "Admin";

  try {
    let userCredential;
    try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Super Admin already exists. Skipping Auth creation.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Super Admin created successfully in Auth.");
        } else {
            throw error; // Re-throw other errors
        }
    }
    
    const user = userCredential.user;

    const superAdminRef = doc(db, "super_admins", user.uid);
    await setDoc(superAdminRef, {
      id: user.uid,
      email: user.email,
      firstName: firstName,
      lastName: lastName,
    });
    console.log("Super Admin profile created/updated in Firestore.");

  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

seed().then(() => {
    // process.exit(0);
}).catch(() => {
    // process.exit(1);
});
