import React, { useState } from 'react';
import TipModal from './TipModal';
interface TipButtonProps { creatorId: string; creatorName: string; postId?: string; userToken: string; isAgeVerified: boolean }
// All entry points use the same verified testnet intent flow.
const TipButton = ({ creatorId, creatorName }: TipButtonProps) => {
  const [open, setOpen] = useState(false);
  return <><button onClick={() => setOpen(true)} className="border border-amber-500 text-amber-300 rounded p-3">Tip {creatorName} on Base Sepolia</button><TipModal isOpen={open} onClose={() => setOpen(false)} creatorId={creatorId}/></>;
};
export default TipButton;
