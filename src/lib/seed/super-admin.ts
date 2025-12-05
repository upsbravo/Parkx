
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// This is the hardcoded UID for the seeded super admin 'super@parkx.com'
export const SUPER_ADMIN_ID = 'PH1p3JvXPSNh2CfiSxzOW2sjlDf1';

const seed = async () => {
  console.log("Seeding Super Admin...");
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
        // First, try to sign in.
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("Super Admin already exists. Signed in successfully.");
    } catch (signInError: any) {
        // If sign in fails because the user doesn't exist, create them.
        if (signInError.code === 'auth/user-not-found') {
            console.log("Super Admin not found, creating new user...");
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Super Admin created successfully in Auth.");
        } else {
            // For any other sign-in error (like wrong password, user disabled), re-throw it.
            console.error("Failed to sign in and could not create user. Please check Firebase Auth for issues like a disabled account or wrong password.", signInError);
            throw signInError;
        }
    }

    const user = userCredential.user;
    if (user.uid !== SUPER_ADMIN_ID) {
        console.warn(`********************************************************************************`);
        console.warn(`* Super Admin UID mismatch. Expected ${SUPER_ADMIN_ID}, but got ${user.uid}. *`);
        console.warn(`* The login will likely fail. You may need to delete the user from Auth and try again. *`);
        console.warn(`********************************************************************************`);
    }

    // Unconditionally create/update the necessary Firestore documents. This is the key fix.
    // This ensures that even if the user existed in Auth, their required role documents are created.
    console.log("Ensuring Firestore documents exist for Super Admin...");

    // Create the main profile document using the hardcoded UID
    const superAdminRef = doc(db, "superAdmins", SUPER_ADMIN_ID);
    await setDoc(superAdminRef, {
      id: SUPER_ADMIN_ID,
      email: email,
      firstName: firstName,
      lastName: lastName,
    }, { merge: true });
    console.log("Super Admin profile document created/updated in Firestore.");

    // CRITICAL: Create the role document for security rules using the hardcoded UID
    const roleRef = doc(db, "roles_super_admin", SUPER_ADMIN_ID);
    await setDoc(roleRef, {
      active: true,
    }, { merge: true });
    console.log("Super Admin role document created/updated in Firestore. Login should now succeed.");


  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

seed().then(() => {
    // process.exit(0);
}).catch((err) => {
    console.error(err);
    // process.exit(1);
});
