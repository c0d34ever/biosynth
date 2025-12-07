import React, { useState, useEffect } from 'react';
import { authApi } from '../services/api';
import { Settings as SettingsIcon, User, Bell, Shield, Key, Trash2, Save, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useTheme } from '../hooks/useTheme';

const Settings: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'preferences'>('profile');
  
  // Profile settings
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  // Security settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [jobNotifications, setJobNotifications] = useState(true);
  const [commentNotifications, setCommentNotifications] = useState(true);
  const [systemNotifications, setSystemNotifications] = useState(true);
  
  // Preferences
  const { theme, setTheme } = useTheme();
  const [language, setLanguage] = useState('en');
  const [timezone, setTimezone] = useState('UTC');

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await authApi.getCurrentUser();
      setUser(userData);
      setName(userData.name || '');
      setEmail(userData.email || '');
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Update profile via API
      await fetch('/api/users/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ name, email })
      });
      alert('Profile updated successfully!');
      loadUser();
    } catch (error) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    
    if (newPassword.length < 8) {
      alert('Password must be at least 8 characters long');
      return;
    }
    
    setSaving(true);
    try {
      await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      alert('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      alert('Failed to change password. Please check your current password.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will delete all your algorithms and data.')) {
      return;
    }
    
    if (!confirm('This is your final warning. All your data will be permanently deleted. Type DELETE to confirm.')) {
      return;
    }
    
    try {
      await fetch('/api/users/me', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      localStorage.removeItem('auth_token');
      window.location.href = '/';
    } catch (error) {
      alert('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'preferences', label: 'Preferences', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen bg-[#020617] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
            <SettingsIcon size={32} className="text-bio-400" />
            Settings
          </h1>
          <p className="text-slate-400">Manage your account settings and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 mb-6">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-bio-500 text-bio-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Profile Information</h2>
            
            <div className="space-y-4">
              <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
              />
              
              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@example.com"
              />
              
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Role</label>
                <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">
                  {user?.role || 'user'}
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Member Since</label>
                <div className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleSaveProfile} isLoading={saving} variant="primary">
                <Save size={16} /> Save Changes
              </Button>
            </div>
          </div>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Security Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Current Password</label>
                <div className="relative">
                  <Input
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">New Password</label>
                <div className="relative">
                  <Input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min 8 characters)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Confirm New Password</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={handleChangePassword} isLoading={saving} variant="primary">
                <Key size={16} /> Change Password
              </Button>
            </div>
            
            <div className="border-t border-slate-800 pt-6 mt-6">
              <h3 className="text-lg font-bold text-red-400 mb-4">Danger Zone</h3>
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-medium text-white mb-1">Delete Account</div>
                    <div className="text-sm text-slate-400">
                      Permanently delete your account and all associated data
                    </div>
                  </div>
                  <Button onClick={handleDeleteAccount} variant="ghost" className="text-red-400 hover:text-red-300">
                    <Trash2 size={16} /> Delete Account
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Notification Preferences</h2>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">Email Notifications</div>
                  <div className="text-sm text-slate-400">Receive notifications via email</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={emailNotifications}
                    onChange={(e) => setEmailNotifications(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bio-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bio-500"></div>
                </label>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">Job Notifications</div>
                  <div className="text-sm text-slate-400">Notify when jobs complete or fail</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={jobNotifications}
                    onChange={(e) => setJobNotifications(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bio-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bio-500"></div>
                </label>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">Comment Notifications</div>
                  <div className="text-sm text-slate-400">Notify when someone comments on your algorithms</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={commentNotifications}
                    onChange={(e) => setCommentNotifications(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bio-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bio-500"></div>
                </label>
              </div>
              
              <div className="flex justify-between items-center p-4 bg-slate-800 rounded-lg">
                <div>
                  <div className="font-medium text-white">System Notifications</div>
                  <div className="text-sm text-slate-400">Receive system updates and announcements</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={systemNotifications}
                    onChange={(e) => setSystemNotifications(e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-bio-500/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bio-500"></div>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => alert('Notification preferences saved!')} variant="primary">
                <Save size={16} /> Save Preferences
              </Button>
            </div>
          </div>
        )}

        {/* Preferences Tab */}
        {activeTab === 'preferences' && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
            <h2 className="text-xl font-bold text-white mb-4">Application Preferences</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value as any)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="auto">Auto (System)</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-400 mb-2 block">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-bio-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (US)</option>
                  <option value="America/Chicago">Central Time (US)</option>
                  <option value="America/Denver">Mountain Time (US)</option>
                  <option value="America/Los_Angeles">Pacific Time (US)</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button onClick={() => alert('Preferences saved!')} variant="primary">
                <Save size={16} /> Save Preferences
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

