import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Logo } from '@/components/logo';
import { ArrowRight, Building, MessageSquare, Users } from 'lucide-react';

const heroImage = PlaceHolderImages.find((img) => img.id === 'hero-image');
const vendorImage = PlaceHolderImages.find((img) => img.id === 'vendor-management');
const userImage = PlaceHolderImages.find((img) => img.id === 'user-management');
const commsImage = PlaceHolderImages.find((img) => img.id === 'communication-portal');

export default function Home() {
  const features = [
    {
      icon: <Building className="h-8 w-8 text-primary" />,
      title: 'Vendor Management',
      description: 'Invite, approve, and manage vendors. Set parking spot limits and monitor usage from a central dashboard.',
      image: vendorImage,
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'User Management',
      description: 'Vendor admins can easily invite and manage their end-users, assign spots, and handle profiles.',
      image: userImage,
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: 'Communication Portal',
      description: 'Direct messaging between Super Admins and Vendors, and between Vendors and End Users.',
      image: commsImage,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Logo />
          <Button asChild>
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative w-full py-20 md:py-32 lg:py-40">
          {heroImage && (
            <Image
              src={heroImage.imageUrl}
              alt={heroImage.description}
              fill
              className="object-cover"
              priority
              data-ai-hint={heroImage.imageHint}
            />
          )}
          <div className="absolute inset-0 bg-black/50" />
          <div className="container relative mx-auto px-4 text-center text-primary-foreground md:px-6">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Modernize Your Parking Management
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-200 md:text-xl">
              ParkX is the all-in-one, multi-tenant platform to streamline parking operations for businesses of any size.
            </p>
            <div className="mt-10">
              <Button size="lg" asChild>
                <Link href="/login">
                  Get Started <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="w-full bg-background py-20 md:py-32">
          <div className="container mx-auto space-y-12 px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">A Better Way to Manage Parking</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                ParkX offers a comprehensive suite of tools designed for a seamless, hierarchical management experience from the platform owner down to the end-user.
              </p>
            </div>
            <div className="mx-auto grid items-start gap-8 sm:max-w-4xl sm:grid-cols-1 md:gap-12 lg:max-w-5xl lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="overflow-hidden transition-all hover:shadow-lg">
                  {feature.image && (
                    <Image
                      src={feature.image.imageUrl}
                      alt={feature.image.description}
                      width={600}
                      height={400}
                      className="aspect-[3/2] w-full object-cover"
                      data-ai-hint={feature.image.imageHint}
                    />
                  )}
                  <CardHeader className="flex flex-row items-start gap-4">
                    {feature.icon}
                    <div className="grid gap-1">
                      <CardTitle>{feature.title}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row md:px-6">
          <Logo />
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} ParkX. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
