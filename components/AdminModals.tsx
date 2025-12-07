import React, { useState, useEffect } from 'react';
import { X, Save, UserPlus, Edit2, Eye, Trash2 } from 'lucide-react';
import { Button } from './Button';
import { Input, TextArea } from './Input';
import { Select } from './Select';
import { FormField } from './FormField';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any;
  onSave: (userData: any) => Promise<void>;
  mode: 'create' | 'edit';
}

export const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, user, onSave, mode }) => {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && user) {
        setFormData({
          email: user.email || '',
          name: user.name || '',
          password: '',
          role: user.role || 'user'
        });
      } else {
        setFormData({
          email: '',
          name: '',
          password: '',
          role: 'user'
        });
      }
      setErrors({});
    }
  }, [isOpen, user, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (!formData.name) {
      newErrors.name = 'Name is required';
    }
    
    if (mode === 'create' && !formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      const dataToSave = { ...formData };
      if (mode === 'edit' && !dataToSave.password) {
        delete dataToSave.password;
      }
      await onSave(dataToSave);
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save user' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {mode === 'create' ? <UserPlus size={24} /> : <Edit2 size={24} />}
            {mode === 'create' ? 'Create User' : 'Edit User'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <FormField label="Email" error={errors.email} required>
            <Input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
            />
          </FormField>
          
          <FormField label="Name" error={errors.name} required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={loading}
            />
          </FormField>
          
          <FormField 
            label="Password" 
            error={errors.password} 
            required={mode === 'create'}
            hint={mode === 'edit' ? 'Leave empty to keep current password' : undefined}
          >
            <Input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              disabled={loading}
            />
          </FormField>
          
          <FormField label="Role">
            <Select
              options={[
                { value: 'user', label: 'User' },
                { value: 'admin', label: 'Admin' }
              ]}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              disabled={loading}
            />
          </FormField>
          
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {errors.submit}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              <Save size={16} /> {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface AlgorithmModalProps {
  isOpen: boolean;
  onClose: () => void;
  algorithm?: any;
  onSave: (algorithmData: any) => Promise<void>;
  mode: 'create' | 'edit';
}

export const AlgorithmModal: React.FC<AlgorithmModalProps> = ({ isOpen, onClose, algorithm, onSave, mode }) => {
  const [formData, setFormData] = useState({
    name: '',
    inspiration: '',
    domain: '',
    description: '',
    principle: '',
    steps: [] as string[],
    applications: [] as string[],
    pseudoCode: '',
    tags: [] as string[],
    type: 'generated' as 'generated' | 'hybrid',
    visibility: 'public' as 'private' | 'public' | 'unlisted'
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentStep, setCurrentStep] = useState('');
  const [currentApplication, setCurrentApplication] = useState('');
  const [currentTag, setCurrentTag] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && algorithm) {
        setFormData({
          name: algorithm.name || '',
          inspiration: algorithm.inspiration || '',
          domain: algorithm.domain || '',
          description: algorithm.description || '',
          principle: algorithm.principle || '',
          steps: Array.isArray(algorithm.steps) ? algorithm.steps : 
                 typeof algorithm.steps === 'string' ? JSON.parse(algorithm.steps || '[]') : [],
          applications: Array.isArray(algorithm.applications) ? algorithm.applications :
                       typeof algorithm.applications === 'string' ? JSON.parse(algorithm.applications || '[]') : [],
          pseudoCode: algorithm.pseudoCode || algorithm.pseudo_code || '',
          tags: Array.isArray(algorithm.tags) ? algorithm.tags :
                typeof algorithm.tags === 'string' ? JSON.parse(algorithm.tags || '[]') : [],
          type: algorithm.type || 'generated',
          visibility: algorithm.visibility || 'public'
        });
      } else {
        setFormData({
          name: '',
          inspiration: '',
          domain: '',
          description: '',
          principle: '',
          steps: [],
          applications: [],
          pseudoCode: '',
          tags: [],
          type: 'generated',
          visibility: 'public'
        });
      }
      setErrors({});
      setCurrentStep('');
      setCurrentApplication('');
      setCurrentTag('');
    }
  }, [isOpen, algorithm, mode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.domain) newErrors.domain = 'Domain is required';
    if (!formData.description) newErrors.description = 'Description is required';
    if (formData.steps.length === 0) newErrors.steps = 'At least one step is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to save algorithm' });
    } finally {
      setLoading(false);
    }
  };

  const addStep = () => {
    if (currentStep.trim()) {
      setFormData({ ...formData, steps: [...formData.steps, currentStep.trim()] });
      setCurrentStep('');
    }
  };

  const removeStep = (index: number) => {
    setFormData({ ...formData, steps: formData.steps.filter((_, i) => i !== index) });
  };

  const addApplication = () => {
    if (currentApplication.trim()) {
      setFormData({ ...formData, applications: [...formData.applications, currentApplication.trim()] });
      setCurrentApplication('');
    }
  };

  const removeApplication = (index: number) => {
    setFormData({ ...formData, applications: formData.applications.filter((_, i) => i !== index) });
  };

  const addTag = () => {
    if (currentTag.trim()) {
      setFormData({ ...formData, tags: [...formData.tags, currentTag.trim()] });
      setCurrentTag('');
    }
  };

  const removeTag = (index: number) => {
    setFormData({ ...formData, tags: formData.tags.filter((_, i) => i !== index) });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            {mode === 'create' ? <UserPlus size={24} /> : <Edit2 size={24} />}
            {mode === 'create' ? 'Create Algorithm' : 'Edit Algorithm'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Name" error={errors.name} required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </FormField>
            
            <FormField label="Domain" error={errors.domain} required>
              <Input
                value={formData.domain}
                onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                disabled={loading}
              />
            </FormField>
          </div>
          
          <FormField label="Inspiration">
            <Input
              value={formData.inspiration}
              onChange={(e) => setFormData({ ...formData, inspiration: e.target.value })}
              disabled={loading}
            />
          </FormField>
          
          <FormField label="Description" error={errors.description} required>
            <TextArea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={loading}
              rows={3}
            />
          </FormField>
          
          <FormField label="Principle">
            <TextArea
              value={formData.principle}
              onChange={(e) => setFormData({ ...formData, principle: e.target.value })}
              disabled={loading}
              rows={2}
            />
          </FormField>
          
          <FormField label="Steps" error={errors.steps} required>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={currentStep}
                  onChange={(e) => setCurrentStep(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addStep())}
                  placeholder="Add a step..."
                  disabled={loading}
                />
                <Button type="button" onClick={addStep} variant="secondary" disabled={loading}>
                  Add
                </Button>
              </div>
              <div className="space-y-1">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-slate-800 rounded">
                    <span className="flex-1 text-sm text-slate-300">{index + 1}. {step}</span>
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FormField>
          
          <FormField label="Applications">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={currentApplication}
                  onChange={(e) => setCurrentApplication(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addApplication())}
                  placeholder="Add an application..."
                  disabled={loading}
                />
                <Button type="button" onClick={addApplication} variant="secondary" disabled={loading}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.applications.map((app, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-slate-800 rounded text-sm">
                    <span className="text-slate-300">{app}</span>
                    <button
                      type="button"
                      onClick={() => removeApplication(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FormField>
          
          <FormField label="Tags">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={currentTag}
                  onChange={(e) => setCurrentTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  disabled={loading}
                />
                <Button type="button" onClick={addTag} variant="secondary" disabled={loading}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <div key={index} className="flex items-center gap-1 px-2 py-1 bg-bio-500/20 rounded text-sm">
                    <span className="text-bio-400">#{tag}</span>
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </FormField>
          
          <FormField label="Pseudocode">
            <TextArea
              value={formData.pseudoCode}
              onChange={(e) => setFormData({ ...formData, pseudoCode: e.target.value })}
              disabled={loading}
              rows={6}
            />
          </FormField>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Type">
              <Select
                options={[
                  { value: 'generated', label: 'Generated' },
                  { value: 'hybrid', label: 'Hybrid' }
                ]}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                disabled={loading}
              />
            </FormField>
            
            <FormField label="Visibility">
              <Select
                options={[
                  { value: 'private', label: 'Private' },
                  { value: 'public', label: 'Public' },
                  { value: 'unlisted', label: 'Unlisted' }
                ]}
                value={formData.visibility}
                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                disabled={loading}
              />
            </FormField>
          </div>
          
          {errors.submit && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {errors.submit}
            </div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" isLoading={loading}>
              <Save size={16} /> {mode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

