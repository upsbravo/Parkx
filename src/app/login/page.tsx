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
import { useFirebase } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, values.email, values.password);

      // 1. Super Admin – check dedicated collection
      const superAdminDoc = await getDoc(doc(firestore, 'roles_super_admin', user.uid));
      if (superAdminDoc.exists()) {
        toast({ title: 'Login Successful', description: 'Welcome back, Super Admin!' });
        router.push('/super-admin/dashboard');
        return;
      }

      // 2. Vendor Admin – check top-level vendors collection
      const vendorDoc = await getDoc(doc(firestore, 'vendors', user.uid));
      if (vendorDoc.exists()) {
        toast({ title: 'Login Successful', description: 'Welcome back, Vendor Admin!' });
        router.push('/vendor-admin/dashboard');
        return;
      }

      // 3. End User – check top-level users collection
      const endUserDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (endUserDoc.exists()) {
        toast({ title: 'Login Successful', description: 'Welcome back!' });
        router.push('/end-user/dashboard');
        return;
      }

      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Your account exists but has no assigned role. Contact support.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description:
          error.code === 'auth/invalid-credential'
            ? 'Wrong email or password.'
            : 'Something went wrong. Try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-8"><Logo /></div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>Enter your credentials to access your dashboard.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleLogin)}>
            <CardContent className="grid gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="you@example.com" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" {...field} disabled={isLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Form>
        <CardFooter className="flex flex-col gap-4 text-xs text-muted-foreground text-center">
            <p>Demo accounts:</p>
            <p>
              super@parkx.com / password<br />
              vendor@acme.com / password<br />
              user@example.com / password
            </p>
        </CardFooter>
      </Card>
    </div>
  );
}
