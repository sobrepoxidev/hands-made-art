// components/layout/Navbar/index.tsx
// Componente principal SSR
import Link from 'next/link';
import Image from 'next/image';
import NavbarClient from './NavbarClient';
import SearchBar from '../search/SearchBar';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function Navbar({ locale }: { locale: string }) {
  // Usar la versión correcta y más reciente de la API de cookies
  // Pasar el método cookies directamente sin llamarlo
  
  // Get the user session
  const { data: { session } } = await createServerComponentClient({ cookies }).auth.getSession();


  return (
    <header className="relative z-40">
      {/* Top Bar */}
      <div className="container mx-auto flex items-center justify-between px-2 md:px-4 py-0">
        {/* Logo - SSR (Left) */}
      
          <div>
          <Link href="/" className="flex items-center focus-visible:outline-teal-600" aria-label="HandMadeArt Home">
            <div className="relative overflow-hidden flex items-center gap-3">
              
              <div className="lg:hidden">
              <Image
                src="/logo-handmade-art-black.webp"
                alt="Hand Made Art Logo"
                width={65}
                height={0}
                className="w-[40px] md:w-[65px] object-cover block dark:hidden"
                priority
              />
              <Image
                src="/logo-handmade-art.webp"
                alt="Hand Made Art Logo"
                width={65}
                height={0}
                className="w-[40px] md:w-[65px] object-cover hidden dark:block"
                priority
              />
              </div>
              <div className="hidden lg:block">
              <Image
                src="/logo-handmade-art-black.webp"
                alt="Hand Made Art Logo"
                width={65}
                height={0}
                className="w-[40px] md:w-[65px] object-cover block dark:hidden"
                priority
              />
              <Image
                src="/logo-handmade-art-black.webp"
                alt="Hand Made Art Logo"
                width={65}
                height={0}
                className="w-[40px] md:w-[65px] object-cover hidden dark:block"
                priority
              />
              </div>
        
              
              <h1 className="text-lg sm:text-3xl mr-1 tracking-wider text-gray-800">
                <span className="mr-1">HANDMADE</span>
                <span className="font-bold text-[#B55327]">ART</span>
              </h1>
            </div>
          </Link>
          </div>
       

        {/* Client-side interactivity (Center and Right) */}
        <div className="flex-grow flex items-center justify-end">
          <NavbarClient
            locale={locale}
            session={session}
          />
        </div>
      </div>
        
        {/* Mobile Search Bar - Visible by default on mobile */}
        <div className="lg:hidden bg-white px-2 py-0.5">
          <SearchBar 
            variant="mobile" 
            initialCategory={locale === 'es' ? 'Todo' : 'All'}
            locale={locale}
            className="w-full"
          />
        </div>
    </header>
  );
}