import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ArrowRight, Loader2, X, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { OrganizationIndustry, OrganizationTeamSize } from '../../types/database';

interface Props {
  isOpen: boolean;
  onClose?: () => void;
  isMandatory?: boolean;
}

const INDUSTRIES: OrganizationIndustry[] = [
  'Technology & Software',
  'Design & Creative',
  'Architecture & Construction',
  'Consulting & Services',
  'Marketing & Media',
  'Healthcare',
  'Other',
];

const TEAM_SIZES: OrganizationTeamSize[] = [
  '1-5',
  '6-20',
  '21-50',
  '51-200',
  '200+',
];

export const OrganizationSetupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  isMandatory = false,
}) => {
  const navigate = useNavigate();
  const { createOrganization, user } = useAuth();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState<OrganizationIndustry>('Technology & Software');
  const [teamSize, setTeamSize] = useState<OrganizationTeamSize>('6-20');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter an organization name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await createOrganization(name, industry, teamSize);
      if (res.error) {
        setErrorMsg(res.error.message || 'Failed to create organization. Please verify database permissions.');
      } else {
        setName('');
        if (onClose) onClose();
        navigate('/');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred while creating organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="w-full max-w-lg bg-white border border-stone-200 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-black ring-2 ring-[#77C614] p-1 flex items-center justify-center shrink-0 shadow-xs">
              <img
                src="/logo.png"
                alt="De-Olive DBMS"
                className="h-full w-full object-contain rounded-full"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.svg';
                }}
              />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900">
                {isMandatory ? 'Setup Your Organization' : 'Create New Organization'}
              </h2>
              <p className="text-xs text-stone-500">
                {isMandatory
                  ? 'Your workspace requires an organization to manage projects and tasks.'
                  : 'Add a new team workspace to De-Olive DBMS.'}
              </p>
            </div>
          </div>
          {!isMandatory && onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Organization / Company Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Studio, Olive DBMS Labs"
              className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary text-xs transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Industry Domain
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value as OrganizationIndustry)}
              className="w-full px-3.5 py-2.5 border border-stone-200 rounded-lg bg-stone-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/25 focus:border-brand-primary text-xs transition-colors"
            >
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1.5">
              Team Size
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TEAM_SIZES.map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => setTeamSize(size)}
                  className={`py-2 px-1 text-center rounded-lg border text-xs font-medium transition-all ${
                    teamSize === size
                      ? 'border-brand-primary bg-brand-accent-light text-brand-primary-dark font-bold shadow-xs'
                      : 'border-stone-200 bg-white text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-stone-100">
            <span className="text-[11px] text-stone-400">
              You will be assigned as <span className="font-semibold text-stone-700">Owner</span>
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111113] hover:bg-[#222226] text-white text-xs font-semibold transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#77C614]" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <span>Create Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#77C614]" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
