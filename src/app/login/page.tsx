'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useAuth } from '@/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  UserCredential,
} from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';


const formSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleSuccessfulLogin = async (userCredential: UserCredential, message: string) => {
    const user = userCredential.user;
    toast({
      title: message,
      description: `Welcome!`,
    });

    // 1. Check for Super Admin role
    const superAdminDocRef = doc(firestore, "superAdmins", user.uid);
    const superAdminDocSnap = await getDoc(superAdminDocRef);
    if (superAdminDocSnap.exists()) {
        router.push('/super-admin/dashboard');
        return;
    }

    // 2. Check for Vendor Admin role
    const vendorDocRef = doc(firestore, "vendors", user.uid);
    const vendorDocSnap = await getDoc(vendorDocRef);
    if (vendorDocSnap.exists()) {
        router.push('/vendor-admin/dashboard');
        return;
    }

    // 3. Default to End-User
    router.push('/end-user/dashboard');
  };


  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleSuccessfulLogin(userCredential, 'Login Successful');

    } catch (error: any) {
      // If user not found, create a demo account
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        try {
          const newUserCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
          const user = newUserCredential.user;

          // Special handling for initial Super Admin setup for demo purposes
          if (values.email.startsWith('super')) {
            const superAdminRef = doc(firestore, 'superAdmins', user.uid);
            await setDoc(superAdminRef, { 
              id: user.uid,
              email: user.email,
              firstName: "Super",
              lastName: "Admin"
            }, { merge: true });
          }
          
          await handleSuccessfulLogin(newUserCredential, 'Account Created & Logged In');

        } catch (creationError: any) {
          console.error('Account creation error:', creationError);
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: creationError.message || 'Could not create a demo account.',
          });
        }
      } else {
        console.error('Login error:', error);
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: error.message || 'An unexpected error occurred.',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8">
        <Logo />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogin)}>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="m@example.com"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Form>
        <CardFooter className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground text-center">For demonstration purposes:</p>
            <p className="text-xs text-muted-foreground text-center">
              super@parkx.com / password<br />
              vendor@acme.com / password<br />
              user@example.com / password
            </p>
        </CardFooter>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Registration is by invitation only.
      </p>
    </div>
  );
}
