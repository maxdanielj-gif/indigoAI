import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const UserProfileScreen: React.FC = () => {
  const { userProfile, setUserProfile } = useApp();
  const [name, setName] = useState(userProfile.name);
  const [info, setInfo] = useState(userProfile.info);
  const [preferences, setPreferences] = useState(userProfile.preferences);
  const [appearance, setAppearance] = useState(userProfile.appearance);

  const handleSave = () => {
    setUserProfile({
      ...userProfile,
      name,
      info,
      preferences,
      appearance,
    });
    alert('User Profile saved!');
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-md max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-indigo-600">User Profile</h2>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">General Information & Background</label>
          <textarea
            value={info}
            onChange={(e) => setInfo(e.target.value)}
            rows={3}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Tell the AI about yourself..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Preferences</label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Communication style, likes, dislikes..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Appearance</label>
          <textarea
            value={appearance}
            onChange={(e) => setAppearance(e.target.value)}
            rows={2}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="How do you look? (Used for image generation context)"
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors font-medium shadow-sm"
        >
          Save Profile
        </button>
      </div>
    </div>
  );
};

export default UserProfileScreen;
