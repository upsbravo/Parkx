
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: `${firstName} ${lastName}` });
        console.log('End user created successfully in Auth.');
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log('End user already exists in Auth. Signing in to get user object.');
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } else {
        // Rethrow other auth errors
        throw error;
      }
    }

    const user = userCredential.user;

    // Create the EndUser document in the top-level /users collection
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      id: user.uid,
      vendorId: VENDOR_ID,
      firstName: firstName,
      lastName: lastName,
      email: email,
      status: 'Active',
      assignedSpotIds: [],
      cancellationRequested: false,
      role: 'endUser',
      waiverSigned: false, // Default to not signed
      waiverSignedDate: null,
      profileComplete: false, // Start with an incomplete profile
    }, { merge: true });
    console.log('End User profile created/updated in Firestore /users collection.');

  } catch (error) {
    console.error('Error seeding End User:', error);
  }
};

seed().then(() => {
    // process.exit(0);
}).catch((err) => {
    console.error(err);
    // process.exit(1);
});
