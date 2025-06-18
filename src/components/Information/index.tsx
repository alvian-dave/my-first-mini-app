'use client';

export const Information = () => {
  return (
    <div className="rounded-2xl p-6 bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white shadow-xl space-y-4 text-sm leading-relaxed font-light">
      <h2 className="text-2xl font-bold tracking-wide">
        How to Claim Your WRC Tokens
      </h2>

      <p>
        Welcome to the World App reward system. To start receiving WRC token rewards,
        you must first click the <strong>Get Token</strong> button.
      </p>

      <p>
        After your first claim, the automatic reward system will be activated.
        From then on, rewards will accumulate every second without needing to take further action.
      </p>

      <p>
        You can return anytime to claim your accumulated rewards or to stake your tokens for more yield.
        Make sure your wallet is connected via World ID.
      </p>

      <p className="text-xs text-gray-300 pt-2">
        ⚠️ This mini-app is optimized for mobile use within the World App.
      </p>
    </div>
  );
};
