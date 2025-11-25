
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

// This is the hardcoded UID for the seeded super admin 'super@parkx.com'
// It is provided by the user to ensure the seed script targets the correct account.
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
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log("Super Admin already exists in Auth. Skipping Auth creation.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
             if (userCredential.user.uid !== SUPER_ADMIN_ID) {
                console.warn(`********************************************************************************`);
                console.warn(`* Super Admin UID mismatch. Expected ${SUPER_ADMIN_ID}, but got ${userCredential.user.uid}. *`);
                console.warn(`* The login will likely fail. You may need to delete the user from Auth and try again. *`);
                console.warn(`********************************************************************************`);
            }
            console.log("Super Admin created successfully in Auth.");
        } else {
            throw error; // Re-throw other errors
        }
    }

    // Create the main profile document using the hardcoded UID
    const superAdminRef = doc(db, "super_admins", SUPER_ADMIN_ID);
    await setDoc(superAdminRef, {
      id: SUPER_ADMIN_ID,
      email: email,
      firstName: firstName,
      lastName: lastName,
    });
    console.log("Super Admin profile created/updated in Firestore.");

    // CRITICAL: Create the role document for security rules using the hardcoded UID
    const roleRef = doc(db, "roles_super_admin", SUPER_ADMIN_ID);
    await setDoc(roleRef, {
      id: SUPER_ADMIN_ID,
      active: true,
    });
    console.log("Super Admin role document created in Firestore. Login should now succeed.");


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
