import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Camera, Check, Radio } from 'lucide-react';
import { DeviceProfile, HotspotState } from '../types';
import { AVATAR_PRESETS } from '../services/mockNetwork';

interface ProfileSettingsProps {
  myProfile: DeviceProfile;
  onUpdateProfile: (updated: Partial<DeviceProfile>) => void;
  hotspotState: HotspotState;
  onUpdateHotspot: (updated: Partial<HotspotState>) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  myProfile,
  onUpdateProfile,
  hotspotState,
  onUpdateHotspot,
}) => {
  const [nameInput, setNameInput] = useState(myProfile.name);
  const [isSaved, setIsSaved] = useState(false);
  const [hotspotSsid, setHotspotSsid] = useState(hotspotState.ssid);
  const [hotspotPass, setHotspotPass] = useState(hotspotState.password);

  const handleSaveProfile = () => {
    onUpdateProfile({
      name: nameInput.trim() || myProfile.name,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleCustomAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      onUpdateProfile({ avatar: url });
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] pb-28 pt-2 px-3 sm:px-6 max-w-2xl mx-auto space-y-5">
      
      {/* Profile Card & Avatar Customization */}
      <div className="p-5 sm:p-6 rounded-3xl neu-raised border border-white/5 space-y-5">
        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
          <User size={18} className="text-[#22c55e]" />
          <h2 className="text-sm font-bold text-white">Device Profile</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* Avatar with live photo edit */}
          <div className="relative group shrink-0">
            <img
              src={myProfile.avatar}
              alt={myProfile.name}
              className="w-20 h-20 rounded-3xl object-cover ring-2 ring-[#22c55e]/50 neu-raised"
            />
            <label
              htmlFor="avatar-upload"
              className="absolute -bottom-1 -right-1 p-1.5 rounded-xl bg-[#22c55e] text-black cursor-pointer shadow-lg hover:scale-105 transition-transform"
              title="Upload Custom Photo"
            >
              <Camera size={15} className="stroke-[2.5]" />
              <input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleCustomAvatarUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* Name input */}
          <div className="flex-1 w-full space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 block">
              Device Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-2xl neu-pressed text-sm text-white font-bold border border-white/5 focus:border-[#22c55e]/50 outline-none"
                placeholder="Device Name"
              />
              <button
                onClick={handleSaveProfile}
                className="px-4 py-2.5 rounded-2xl bg-[#22c55e] text-black font-bold text-xs shadow-[0_0_15px_rgba(34,197,94,0.3)] hover:bg-[#16a34a] transition-all flex items-center gap-1"
              >
                {isSaved ? <Check size={16} /> : 'Save'}
                <span>{isSaved ? 'Saved' : 'Update'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preset Avatar Selection */}
        <div>
          <label className="text-xs font-semibold text-slate-400 mb-2 block">Default Avatars</label>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {AVATAR_PRESETS.map((avUrl, idx) => (
              <button
                key={idx}
                onClick={() => onUpdateProfile({ avatar: avUrl })}
                className={`w-11 h-11 rounded-2xl overflow-hidden shrink-0 transition-all ${
                  myProfile.avatar === avUrl
                    ? 'ring-2 ring-[#22c55e] scale-105 shadow-[0_0_15px_rgba(34,197,94,0.5)]'
                    : 'neu-pressed opacity-70 hover:opacity-100'
                }`}
              >
                <img src={avUrl} alt={`Preset ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Hotspot Settings */}
      <div className="p-5 sm:p-6 rounded-3xl neu-raised border border-white/5 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-white/5">
          <Radio size={18} className="text-[#22c55e]" />
          <h2 className="text-sm font-bold text-white">Hotspot Settings</h2>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Network Name</label>
            <input
              type="text"
              value={hotspotSsid}
              onChange={(e) => {
                setHotspotSsid(e.target.value);
                onUpdateHotspot({ ssid: e.target.value });
              }}
              className="w-full px-4 py-2 rounded-xl neu-pressed text-xs text-white font-medium border border-white/5 outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1 block">Password</label>
            <input
              type="text"
              value={hotspotPass}
              onChange={(e) => {
                setHotspotPass(e.target.value);
                onUpdateHotspot({ password: e.target.value });
              }}
              className="w-full px-4 py-2 rounded-xl neu-pressed text-xs text-[#22c55e] font-mono font-medium border border-white/5 outline-none"
            />
          </div>
        </div>
      </div>

    </div>
  );
};
