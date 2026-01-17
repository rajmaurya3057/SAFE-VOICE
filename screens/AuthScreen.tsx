
import React, { useState } from 'react';
import { firebaseService } from '../firebase';
import { UserProfile } from '../types';

interface AuthScreenProps {
  onLogin: (user: UserProfile) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (isSignup && (!name || !phone)) {
      setError("Please provide name and mobile number.");
      return;
    }
    if (!email || !password) {
      setError("Email and Cipher are required.");
      return;
    }

    setLoading(true);
    try {
      if (isSignup) {
        const user = await firebaseService.signUp(name, email, phone);
        onLogin(user);
      } else {
        const user = await firebaseService.login(email);
        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed. Access Denied.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full p-8 bg-[#0F1115] overflow-y-auto">
      <div className="mt-12 mb-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[#D32F2F] rounded-3xl mb-6 shadow-2xl shadow-red-900/30 transform -rotate-3">
          <i className="fa-solid fa-shield-heart text-4xl text-white"></i>
        </div>
        <h2 className="text-4xl font-black text-white uppercase tracking-tighter leading-tight">
          {isSignup ? 'Initialize\nProtocol' : 'Secure\nAccess'}
        </h2>
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gray-800"></span>
          <p className="text-gray-600 text-[10px] font-black uppercase tracking-[0.3em]">Safe-Voice Identity</p>
          <span className="h-px w-8 bg-gray-800"></span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-500 text-[10px] font-black text-center uppercase tracking-widest animate-pulse">
            <i className="fa-solid fa-circle-exclamation mr-2"></i>
            {error}
          </div>
        )}

        {isSignup && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Full Name</label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#1A1D24] border border-gray-800 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]/20 transition-all placeholder:text-gray-700"
                placeholder="Full Legal Name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Mobile Uplink</label>
              <input 
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-[#1A1D24] border border-gray-800 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]/20 transition-all placeholder:text-gray-700"
                placeholder="+1 000 000 0000"
              />
            </div>
          </>
        )}

        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Email Access</label>
          <input 
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1A1D24] border border-gray-800 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]/20 transition-all placeholder:text-gray-700"
            placeholder="auth@secure.net"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-gray-500 uppercase font-black tracking-widest ml-1">Security Cipher</label>
          <input 
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1A1D24] border border-gray-800 rounded-2xl p-4 text-white font-bold focus:outline-none focus:border-[#D32F2F] focus:ring-1 focus:ring-[#D32F2F]/20 transition-all placeholder:text-gray-700"
            placeholder="••••••••"
            required
          />
        </div>

        <button 
          type="submit"
          disabled={loading}
          className={`w-full ${loading ? 'opacity-50' : 'bg-[#D32F2F] hover:bg-red-700'} text-white font-black py-5 rounded-[2rem] mt-6 shadow-2xl shadow-red-900/40 transition-all active:scale-95 uppercase tracking-[0.3em] text-sm`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-3">
              <i className="fa-solid fa-fingerprint animate-pulse"></i>
              <span>Verifying...</span>
            </div>
          ) : (isSignup ? 'Confirm Setup' : 'Authenticate')}
        </button>
      </form>

      <div className="mt-10 mb-8 text-center">
        <button 
          onClick={() => {
            setIsSignup(!isSignup);
            setError('');
          }}
          className="text-gray-500 text-[10px] font-black uppercase tracking-widest hover:text-white transition-colors"
        >
          {isSignup ? 'Already Registered? Login' : "Request New Account"}
        </button>
      </div>

      <div className="mt-auto pt-8 flex flex-col items-center gap-4">
        <div className="flex gap-4 opacity-20">
          <i className="fa-solid fa-lock text-xs"></i>
          <i className="fa-solid fa-key text-xs"></i>
          <i className="fa-solid fa-shield text-xs"></i>
        </div>
        <p className="text-[8px] text-gray-700 text-center font-black uppercase tracking-[0.4em] leading-loose">
          Secure Core V2.0 // End-to-End Persistence<br/>
          Zero-Knowledge Architecture Enabled
        </p>
      </div>
    </div>
  );
};

export default AuthScreen;
