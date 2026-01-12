/* eslint-disable react/no-unescaped-entities */
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardContent className="pt-12 pb-12 text-center">
          <div className="text-6xl font-bold text-gray-900 mb-4">404</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-8">
            Sorry, the page you're looking for doesn't exist.
          </p>
          <Link href="/">
            <Button className="w-full">Go Home</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
