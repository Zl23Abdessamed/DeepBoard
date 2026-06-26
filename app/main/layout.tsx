
import React from 'react';
import Sidebar from '../components/Sidebar';
import AppProvider from '../components/AppProvider';

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex gap-2 h-screen bg-black">
      <AppProvider>
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </AppProvider>
    </div>
  );
}