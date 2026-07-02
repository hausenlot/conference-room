import React from 'react';
import { useLinkCreator, type ExpiryOption } from '../handlers/useLinkCreator';
import { CountdownTimer } from '../components/CountdownTimer';
import { Spinner } from '../components/Spinner';
import { Copy, Check, Video, Users, Clock, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export const CreateLinkPage: React.FC = () => {
  const {
    creatorName,
    setCreatorName,
    maxParticipants,
    setMaxParticipants,
    expiry,
    setExpiry,
    status,
    error,
    createdLink,
    copied,
    createConferenceLink,
    handleCopy,
    handleJoin,
    resetCreator,
  } = useLinkCreator();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-lg mx-auto w-full">
      <div className="w-full bg-card border border-border rounded-2xl p-6 md:p-8 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-accent-bg rounded-xl text-accent">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-text-h m-0 text-left">Conferrence Room</h1>
          </div>
        </div>

        {status !== 'success' ? (
          <form onSubmit={createConferenceLink} className="space-y-5 text-left">
            <div className="space-y-2">
              <label htmlFor="creatorName" className="flex items-center gap-2 text-sm font-semibold text-text-h">
                <User className="w-4 h-4 text-accent" />
                Your Name <span className="text-xs font-normal text-text">(optional)</span>
              </label>
              <input
                id="creatorName"
                type="text"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="e.g. Alice"
                disabled={status === 'loading'}
                className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text-h placeholder-text/50 focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="maxParticipants" className="flex items-center gap-2 text-sm font-semibold text-text-h">
                  <Users className="w-4 h-4 text-accent" />
                  Max Participants
                </label>
                <input
                  id="maxParticipants"
                  type="number"
                  min="1"
                  max="100"
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  disabled={status === 'loading'}
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text-h focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="expiry" className="flex items-center gap-2 text-sm font-semibold text-text-h">
                  <Clock className="w-4 h-4 text-accent" />
                  Link Expiry
                </label>
                <select
                  id="expiry"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value as ExpiryOption)}
                  disabled={status === 'loading'}
                  className="w-full px-4 py-2.5 rounded-xl border border-border bg-bg text-text-h focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition"
                >
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="12h">12 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="3d">3 Days</option>
                  <option value="7d">7 Days</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 text-red-500 text-sm rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-accent hover:bg-accent/90 disabled:bg-accent/50 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-accent/25 active:scale-[0.98] transition flex items-center justify-center gap-2 mt-2"
            >
              {status === 'loading' ? (
                <>
                  <Spinner size="sm" color="#ffffff" />
                  <span>Creating Link...</span>
                </>
              ) : (
                'Create Conference Link'
              )}
            </button>
          </form>
        ) : (
          createdLink && (
            <div className="space-y-6 text-left animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 bg-accent-bg border border-accent-border/30 rounded-xl space-y-3">
                <p className="text-sm font-semibold text-accent uppercase tracking-wider">Conference Link Ready</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    readOnly
                    value={createdLink.url}
                    className="flex-1 bg-bg border border-border px-3 py-2 rounded-lg text-sm text-text-h focus:outline-none"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={handleCopy}
                    className="p-2.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition flex items-center justify-center"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <div className="pt-3 flex flex-col items-center justify-center">
                  <div className="p-3 bg-white rounded-xl shadow-md border border-white/20 transition-all duration-300 hover:scale-105">
                    <QRCodeSVG
                      value={createdLink.url}
                      size={128}
                      bgColor="#ffffff"
                      fgColor="#0b0c10"
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <span className="text-[10px] text-text/70 mt-2.5 font-semibold tracking-wider uppercase">Scan to join via mobile</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-bg border border-border p-3.5 rounded-xl">
                  <p className="text-text text-xs uppercase tracking-wider mb-1">Max capacity</p>
                  <p className="font-semibold text-text-h text-base flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-accent" />
                    {createdLink.config.maxParticipants || 20} participants
                  </p>
                </div>
                <div className="bg-bg border border-border p-3.5 rounded-xl">
                  <p className="text-text text-xs uppercase tracking-wider mb-1">Expires in</p>
                  <p className="text-text-h text-base">
                    <CountdownTimer expiresAt={createdLink.expiresAt} />
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleJoin}
                  className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 px-4 rounded-xl text-center shadow-lg transition"
                >
                  Join Conference
                </button>
                <button
                  onClick={resetCreator}
                  className="flex-1 border border-border hover:bg-border/30 text-text font-semibold py-2.5 px-4 rounded-xl text-center transition"
                >
                  Create New Link
                </button>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};
