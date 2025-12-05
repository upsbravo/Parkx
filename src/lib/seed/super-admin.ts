
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";


const seed = async () => {
  console.log("Seeding Super Admin...");
  const app = initializeApp(firebaseConfig, 'superAdminSeed'); 
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = "upendersingh1965@gmail.com";
  const password = "Ups@1965";
  const firstName = "Upender";
  const lastName = "Singh";

  try {
    let userCredential;
    try {
        // Attempt to sign in first to see if the user exists.
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Super Admin already exists. Signed in successfully.");
    } catch (signInError: any) {
        // If sign in fails because the user doesn't exist, create them.
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
            console.log("Super Admin not found or credential invalid, creating new user...");
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}` });
            console.log("Super Admin created successfully in Auth.");
        } else {
            // For any other sign-in error (like user disabled), re-throw it.
            console.error("Failed to sign in and could not create user. Please check Firebase Auth for issues.", signInError);
            throw signInError;
        }
    }

    const user = userCredential.user;
    const dynamicSuperAdminId = user.uid;
    
    console.log(`Using UID: ${dynamicSuperAdminId} for Super Admin.`);

    // Unconditionally create/update the necessary Firestore documents with the dynamic UID.
    console.log("Ensuring Firestore documents exist for Super Admin...");

    const superAdminRef = doc(db, "superAdmins", dynamicSuperAdminId);
    await setDoc(superAdminRef, {
      id: dynamicSuperAdminId,
      email: email,
      firstName: firstName,
      lastName: lastName,
    }, { merge: true });
    console.log("Super Admin profile document created/updated in Firestore.");

    // CRITICAL: Create the role document for security rules.
    const roleRef = doc(db, "roles_super_admin", dynamicSuperAdminId);
    await setDoc(roleRef, {
      active: true,
    }, { merge: true });
    console.log("Super Admin role document created/updated in Firestore. Login should now succeed.");


  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

seed().then(() => {
    // In a script, you might want to exit the process, but in this context, we'll just log completion.
    console.log('Seed script finished.');
}).catch((err) => {
    console.error('Seed script failed:', err);
});
