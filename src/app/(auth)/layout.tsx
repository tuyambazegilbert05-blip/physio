export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <div className="min-h-screen bg-futuristic-grid text-[#081233] font-sans antialiased">
      {children}
    </div>
  )
}

