
'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import { signInWithEmailAndPassword, type User } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const loginImage = PlaceHolderImages.find((img) => img.id === 'hero-image');

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const { auth, firestore } = useFirebase();
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  const handleSuccessfulLogin = async (user: User) => {
    // 1. Super Admin
    const superRef = doc(firestore, 'roles_super_admin', user.uid);
    if ((await getDoc(superRef)).exists()) {
      toast({ title: 'Welcome Super Admin!' });
      router.push('/super-admin/dashboard');
      return;
    }
  
    // 2. Vendor Admin
    const vendorRef = doc(firestore, 'vendors', user.uid);
    if ((await getDoc(vendorRef)).exists()) {
      toast({ title: 'Welcome Vendor Admin!' });
      router.push('/vendor-admin/dashboard');
      return;
    }
  
    // 3. End User
    const userRef = doc(firestore, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      toast({ title: 'Welcome!' });
      router.push('/end-user/dashboard');
      return;
    }
  
    // 4. Still no role → show error
    toast({
      variant: 'destructive',
      title: 'Access Denied',
      description: 'Your account exists but has no assigned role. Contact support.',
    });
  };

  const handleLogin = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { user } = await signInWithEmailAndPassword(auth, values.email, values.password);
      await handleSuccessfulLogin(user);
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
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="mb-4 flex justify-center"><Logo /></div>
            <h1 className="text-3xl font-bold">Login</h1>
            <p className="text-balance text-muted-foreground">
              Enter your email below to login to your account
            </p>
          </div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleLogin)}>
              <div className="grid gap-4">
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
                     <div className="flex items-center">
                        <FormLabel>Password</FormLabel>
                        <Link
                          href="#"
                          className="ml-auto inline-block text-sm underline"
                        >
                          Forgot your password?
                        </Link>
                      </div>
                    <FormControl>
                      <Input type="password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={isLoading}>
                   {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
            <Image
                src={loginImage.imageUrl}
                alt={loginImage.description}
                width="1920"
                height="1080"
                data-ai-hint={loginImage.imageHint}
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
            />
        )}
      </div>
    </div>
  );
}
