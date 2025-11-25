import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { firebaseConfig } from "@/firebase/config";

const seed = async () => {
  console.log("Seeding Super Admin...");
  const app = initializeApp(firebaseConfig);
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
        console.log("Super Admin already exists. Skipping creation.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
            console.log("Super Admin created successfully.");
        } else {
            throw error;
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

    const superAdminRoleRef = doc(db, "roles_super_admin", user.uid);
    await setDoc(superAdminRoleRef, {
        id: user.uid,
    });
    console.log("Super Admin role document created in Firestore.");


  } catch (error) {
    console.error("Error seeding Super Admin:", error);
  }
};

seed();
