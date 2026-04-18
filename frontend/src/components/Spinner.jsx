import React from 'react';
import { Loader2 } from 'lucide-react';
import { color } from '../theme/tokens';

// Static loading spinner used across tabs while data is being fetched.
// Behavior preserved from the previous inline definition in App.jsx (formerly Dashboard.jsx).
const Spinner = () => (
  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
    <Loader2
      size={24}
      style={{ color: color.accent.warm, animation: 'spin 1s linear infinite' }}
    />
  </div>
);

export default Spinner;
