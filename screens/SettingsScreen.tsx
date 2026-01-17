
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Contact } from '../types';
import { firebaseService } from '../firebase';

interface SettingsScreenProps {
  user: UserProfile;
  onBack: () => void;
  refreshUser: () => void;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ user, onBack, refreshUser }) => {
  const [keyword, setKeyword] = useState(user.emergencyKeyword);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [newContact, setNewContact] = useState({ name: '', phone: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setContacts(firebaseService.getContacts(user.userId));
  }, [user.userId]);

  const saveKeyword = () => {
    firebaseService.updateProfile(user.userId, { emergencyKeyword: keyword.toUpperCase() });
    refreshUser();
    alert("Voice Protocol Cipher Updated.");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        firebaseService.updateProfile(user.userId, { profilePic: base64String });
        refreshUser();
      };
      reader.readAsDataURL(file);
    }
  };

  const addContact = () => {
    if (!newContact.name || !newContact.phone) return;
    const contact: Contact = {
      contactId: 'c_' + Date.now(),
      userId: user.userId,
      name: newContact.name,
      phone: newContact.phone,
      relationship: 'Trusted'
    };
    firebaseService.addContact(contact);
    setContacts([...contacts, contact]);
    setNewContact({ name: '', phone: '' });
  };

  const deleteContact = (id: string) => {
    firebaseService.deleteContact(id);
    setContacts(contacts.filter(c => c.contactId !== id));
  };

  const userInitials = user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="flex flex-col h-full w-full bg-[#0F1115]">
      <div className="p-6 pt-10 flex items-center gap-4 bg-[#1A1D24] border-b border-gray-800">
        <button onClick={onBack} className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white transition-all">
          <i className="fa-solid fa-arrow-left"></i>
        </button>
        <h2 className="text-sm font-black text-white uppercase tracking-[0.25em]">Config Terminal</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-10">
        {/* Profile Identity Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Biometric Identity</h3>
             <i className="fa-solid fa-fingerprint text-green-500 text-xs"></i>
          </div>
          <div className="bg-[#1A1D24] p-6 rounded-3xl border border-gray-800 shadow-xl flex flex-col items-center">
             <div 
               onClick={() => fileInputRef.current?.click()}
               className="relative w-24 h-24 rounded-[2rem] bg-gray-800 border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer hover:border-[#D32F2F] transition-all overflow-hidden group"
             >
                {user.profilePic ? (
                  <img src={user.profilePic} alt="Profile" className="w-full h-full object-cover group-hover:opacity-40 transition-opacity" />
                ) : (
                  <span className="text-gray-500 font-black text-xl group-hover:opacity-20 transition-opacity">{userInitials}</span>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#D32F2F]/20">
                   <i className="fa-solid fa-camera text-white"></i>
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageUpload}
                />
             </div>
             <p className="text-[9px] text-gray-600 mt-4 font-black uppercase tracking-widest">Tap to update operative visualization</p>
             
             <div className="w-full mt-6 space-y-3">
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                   <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Authenticated Operative</p>
                   <p className="text-white text-xs font-bold">{user.name}</p>
                </div>
                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                   <p className="text-[8px] text-gray-500 font-black uppercase mb-1">Verified Comms</p>
                   <p className="text-white text-xs font-mono">{user.phone}</p>
                </div>
             </div>
          </div>
        </section>

        {/* Keyword Setting */}
        <section>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Voice Protocol</h3>
             <i className="fa-solid fa-microphone text-red-500 text-xs animate-pulse"></i>
          </div>
          <div className="bg-[#1A1D24] p-5 rounded-3xl border border-gray-800 shadow-xl">
            <p className="text-[10px] text-gray-500 mb-4 leading-relaxed font-medium uppercase tracking-tighter">Enter a custom cipher. System will initialize SOS sequence upon matching audio detection.</p>
            <div className="flex gap-2">
              <input 
                value={keyword}
                onChange={(e) => setKeyword(e.target.value.toUpperCase())}
                className="flex-1 bg-black/40 border border-gray-700 rounded-2xl p-4 text-white font-mono tracking-[0.3em] text-lg focus:outline-none focus:border-[#D32F2F]"
                placeholder="CIPHER"
              />
              <button 
                onClick={saveKeyword}
                className="bg-[#D32F2F] text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-900/20 active:scale-95 transition-all"
              >
                Sync
              </button>
            </div>
          </div>
        </section>

        {/* Contacts Section */}
        <section>
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Response Network ({contacts.length}/5)</h3>
             <i className="fa-solid fa-users-viewfinder text-blue-500 text-xs"></i>
          </div>
          
          <div className="space-y-3 mb-6">
            {contacts.map(contact => (
              <div key={contact.contactId} className="bg-[#1A1D24] p-5 rounded-3xl border border-gray-800 flex justify-between items-center group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-2xl bg-gray-800 flex items-center justify-center border border-white/5">
                    <i className="fa-solid fa-user-shield text-[#D32F2F] text-sm"></i>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-tight">{contact.name}</h4>
                    <p className="text-[10px] text-gray-600 font-mono mt-1">{contact.phone}</p>
                  </div>
                </div>
                <button onClick={() => deleteContact(contact.contactId)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500/50 hover:text-red-500 transition-colors">
                  <i className="fa-solid fa-trash-can text-xs"></i>
                </button>
              </div>
            ))}
            
            {contacts.length === 0 && (
              <div className="bg-[#1A1D24] border-2 border-dashed border-gray-800 rounded-3xl p-8 flex flex-col items-center opacity-40">
                <i className="fa-solid fa-user-plus text-3xl mb-3 text-gray-600"></i>
                <p className="text-[10px] font-black uppercase text-gray-600">No Trust Ties Established</p>
              </div>
            )}
          </div>

          <div className="bg-[#1A1D24] p-6 rounded-[2.5rem] border border-gray-800 shadow-2xl">
             <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-4">Initialize New Tie</p>
             <div className="space-y-3">
                <input 
                  placeholder="Operative Name"
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                  className="w-full bg-black/40 border border-gray-700 rounded-2xl p-4 text-white text-xs font-bold placeholder:text-gray-700 focus:outline-none"
                />
                <input 
                  placeholder="Comms Number"
                  value={newContact.phone}
                  onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  className="w-full bg-black/40 border border-gray-700 rounded-2xl p-4 text-white text-xs font-mono placeholder:text-gray-700 focus:outline-none"
                />
                <button 
                  onClick={addContact}
                  className="w-full bg-gray-800 text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-lg active:scale-95 transition-all mt-2"
                >
                  Verify and Add
                </button>
             </div>
          </div>
        </section>

        <section className="bg-blue-500/10 border border-blue-500/20 p-5 rounded-3xl">
           <div className="flex gap-4">
              <i className="fa-solid fa-circle-info text-blue-500 mt-0.5"></i>
              <div>
                 <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Responder Tip</h4>
                 <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Your trusted contacts can access the <b>Responder Hub</b> to see your live coordinates and manually mark you as safe if you are unable to.</p>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsScreen;
