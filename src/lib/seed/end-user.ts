import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { VENDOR_ID } from './vendor';

const seed = async () => {
  console.log('Seeding End User...');
  const app = initializeApp(firebaseConfig, 'endUserSeed');
  const auth = getAuth(app);
  const db = getFirestore(app);

  const email = 'user@example.com';
  const password = 'password';
  const firstName = 'John';
  const lastName = 'Doe';

  try {
    let userCredential;
    try {
      // Check if user already exists in Auth by trying to sign in
      userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('End user already exists in Auth. Skipping creation.');
    } catch (error: any) {
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        // If user doesn't exist, create them
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log('End user created successfully in Auth.');
      } else {
        // Rethrow other auth errors
        throw error;
      }
    }

    const user = userCredential.user;

    // Create the EndUser document inside the specific vendor's 'endUsers' subcollection
    const userRef = doc(db, 'vendors', VENDOR_ID, 'endUsers', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      vendorId: VENDOR_ID,
      firstName: firstName,
      lastName: lastName,
      email: email,
      status: 'Active',
      assignedSpotId: null,
      cancellationRequested: false,
    });
    console.log('End User profile created/updated in Firestore under vendor.');

  } catch (error) {
    // Only log actual errors
  }
};

seed().then(() => {
    // process.exit(0);
}).catch(() => {
    // process.exit(1);
});
