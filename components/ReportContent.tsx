import React, { useState } from 'react';
import api from '../services/api';
const ReportContent = ({ postId }: { postId: string }) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('harassment');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setMessage('');
    try { const res = await api.post('/moderation/reports', { postId, reason }); setMessage(res.data.duplicate ? 'Already reported.' : 'Report submitted for review.'); setOpen(false); }
    catch (e: any) { setMessage(e.response?.data?.error || 'Report failed. Try again.'); }
    finally { setBusy(false); }
  };
  return <div className="text-xs pointer-events-auto"><button className="p-2 bg-black/70 rounded text-gray-300" onClick={() => setOpen(!open)}>Report content</button>{open && <div className="bg-black p-3 border border-gray-700 space-y-2"><select aria-label="Report reason" className="bg-gray-900 p-2" value={reason} onChange={e => setReason(e.target.value)}>{['harassment', 'spam', 'illegal_content', 'privacy', 'other'].map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}</select><button disabled={busy} className="p-2 border border-gray-700" onClick={submit}>Submit report</button></div>}{message && <p role="status" className="bg-black p-2">{message}</p>}</div>;
};
export default ReportContent;
