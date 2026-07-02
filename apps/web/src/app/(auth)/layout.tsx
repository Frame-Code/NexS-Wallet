export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="NexS Wallet" className="w-20 h-20 object-contain mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white">NexS Wallet</h1>
          <p className="text-gray-400 mt-1">Tu billetera multichain</p>
        </div>
        {children}
      </div>
    </div>
  );
}